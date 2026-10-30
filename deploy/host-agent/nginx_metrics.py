#!/usr/bin/env python3

import gzip
import io
import re
import subprocess
import time
import threading
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen


LOG_DIR = Path("/var/log/nginx")
CONFIG_DIRS = (
    Path("/etc/nginx/sites-enabled"),
    Path("/etc/nginx/conf.d"),
)

LOG_RE = re.compile(
    r'\[(?P<timestamp>[^\]]+)\]\s+"[^"]*"\s+'
    r'(?P<status>\d{3})\s+(?P<bytes>\d+|-)'
)
HOST_RE = re.compile(r'\bhost="([^"]*)"')
TIME_RE = re.compile(r'\brequest_time=([0-9]+(?:\.[0-9]+)?)')


def _run(args, timeout=4):
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def _is_active():
    try:
        return _run(
            ["systemctl", "is-active", "--quiet", "nginx"]
        ).returncode == 0
    except Exception:
        return False


def _version():
    try:
        result = _run(["nginx", "-v"])
        output = result.stdout + result.stderr
        match = re.search(r'nginx version:\s*(nginx/\S+)', output)
        return match.group(1) if match else "nginx/unknown"
    except Exception:
        return "nginx/unknown"


def _uptime():
    try:
        result = _run([
            "systemctl", "show", "nginx",
            "--property=ActiveEnterTimestamp", "--value",
        ])
        match = re.search(
            r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})',
            result.stdout,
        )
        if not match:
            return "unknown"

        started = datetime.strptime(
            match.group(1), "%Y-%m-%d %H:%M:%S"
        ).replace(tzinfo=timezone.utc)

        seconds = max(
            0, int((datetime.now(timezone.utc) - started).total_seconds())
        )
        days, rem = divmod(seconds, 86400)
        hours, rem = divmod(rem, 3600)
        minutes = rem // 60

        if days:
            return f"{days}d {hours}h {minutes}m"
        if hours:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    except Exception:
        return "unknown"


def _stub_status():
    with urlopen(
        "http://127.0.0.1:8099/nginx_status", timeout=2
    ) as response:
        text = response.read(8192).decode("utf-8", errors="replace")

    active = re.search(r"Active connections:\s*(\d+)", text)
    counts = re.search(
        r"server accepts handled requests\s+(\d+)\s+(\d+)\s+(\d+)",
        text,
    )
    states = re.search(
        r"Reading:\s*(\d+)\s+Writing:\s*(\d+)\s+Waiting:\s*(\d+)",
        text,
    )

    if not active or not counts or not states:
        raise RuntimeError("Unexpected response from Nginx stub_status")

    return {
        "activeConnections": int(active.group(1)),
        "reading": int(states.group(1)),
        "writing": int(states.group(2)),
        "waiting": int(states.group(3)),
    }


def _parse_timestamp(value):
    try:
        return datetime.strptime(
            value, "%d/%b/%Y:%H:%M:%S %z"
        ).astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None


def _read_logs(now):
    codes = Counter()
    host_counts = Counter()
    host_errors_recent = Counter()
    recent_events = []

    total_requests = 0
    total_bytes = 0
    errors_recent = 0

    for path in (LOG_DIR / "access.log", LOG_DIR / "access.log.1"):
        if not path.is_file():
            continue

        try:
            with path.open("rb") as raw:
                raw.seek(0, 2)
                size = raw.tell()
                offset = max(0, size - 512 * 1024)
                raw.seek(offset)
                if offset:
                    raw.readline()
                content = raw.read(512 * 1024).decode(
                    "utf-8", errors="replace"
                )

            stream = io.StringIO(content)
            with stream:
                for line in stream:
                    match = LOG_RE.search(line)
                    if not match:
                        continue

                    status = int(match.group("status"))
                    size = match.group("bytes")
                    total_requests += 1
                    total_bytes += int(size) if size.isdigit() else 0

                    if 200 <= status < 300:
                        codes["code2xx"] += 1
                    elif 300 <= status < 400:
                        codes["code3xx"] += 1
                    elif 400 <= status < 500:
                        codes["code4xx"] += 1
                    elif 500 <= status < 600:
                        codes["code5xx"] += 1

                    host_match = HOST_RE.search(line)
                    host = host_match.group(1).lower() if host_match else ""
                    if host and host != "-":
                        host_counts[host] += 1

                    time_match = TIME_RE.search(line)
                    latency = (
                        float(time_match.group(1))
                        if time_match else None
                    )

                    stamp = _parse_timestamp(match.group("timestamp"))
                    if stamp is None or stamp > now:
                        continue

                    if stamp >= now - timedelta(minutes=15) and status >= 500:
                        errors_recent += 1
                        if host:
                            host_errors_recent[host] += 1

                    if stamp >= now - timedelta(hours=1):
                        recent_events.append((stamp, latency, status))

        except (OSError, EOFError):
            # A log may rotate while it is being read.
            continue

    return {
        "totalRequests": total_requests,
        "totalTrafficBytes": total_bytes,
        "statusCodeCounts": {
            "code2xx": codes["code2xx"],
            "code3xx": codes["code3xx"],
            "code4xx": codes["code4xx"],
            "code5xx": codes["code5xx"],
        },
        "hostCounts": host_counts,
        "hostErrorsRecent": host_errors_recent,
        "errorsRecent": errors_recent,
        "events": recent_events,
    }


def _server_blocks(text):
    # Extract complete top-level server {} blocks, including nested locations.
    position = 0
    pattern = re.compile(r"(?m)^[ \t]*server[ \t]*\{")

    while True:
        match = pattern.search(text, position)
        if not match:
            return

        opening = text.find("{", match.start(), match.end())
        depth = 1
        quote = None
        escaped = False
        comment = False
        closing = None

        for index in range(opening + 1, len(text)):
            char = text[index]

            if comment:
                if char == "\n":
                    comment = False
                continue

            if quote:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = None
                continue

            if char == "#":
                comment = True
            elif char in ("'", '"'):
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    closing = index
                    break

        if closing is None:
            return

        yield text[opening + 1:closing]
        position = closing + 1


def _configured_hosts(log_data, service_active):
    hosts = {}

    for directory in CONFIG_DIRS:
        if not directory.is_dir():
            continue

        for path in directory.glob("*"):
            if not path.is_file():
                continue

            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            for block in _server_blocks(text):
                names_match = re.search(
                    r"(?m)^[ \t]*server_name[ \t]+([^;]+);", block
                )
                if not names_match:
                    continue

                listens = re.findall(
                    r"(?m)^[ \t]*listen[ \t]+([^;]+);", block
                )
                ports = []
                has_ssl = False

                for spec in listens:
                    port_match = re.search(
                        r"(?:^|:)(\d{1,5})(?=\s|$)", spec.strip()
                    )
                    if port_match:
                        ports.append(int(port_match.group(1)))
                    if re.search(r"\bssl\b", spec):
                        has_ssl = True

                upstream_match = re.search(
                    r"(?m)^[ \t]*(?:proxy_pass|fastcgi_pass|"
                    r"uwsgi_pass|grpc_pass)[ \t]+([^;\s]+)",
                    block,
                )
                upstream = (
                    upstream_match.group(1)
                    if upstream_match
                    else "static / direct"
                )

                for name in names_match.group(1).split():
                    name = name.strip().lower()
                    if (
                        "." not in name
                        or name.startswith(("~", "*"))
                        or "$" in name
                        or name in ("localhost", "127.0.0.1")
                    ):
                        continue

                    item = hosts.setdefault(name, {
                        "ssl": False,
                        "ports": [],
                        "upstream": "static / direct",
                    })
                    item["ssl"] = item["ssl"] or has_ssl
                    item["ports"].extend(ports)

                    if upstream != "static / direct":
                        item["upstream"] = upstream

    result = []
    for name, config in hosts.items():
        port = 443 if config["ssl"] else (
            min(config["ports"]) if config["ports"] else 0
        )
        result.append({
            "serverName": name,
            "listenPort": port,
            "upstream": config["upstream"],
            "requests": int(log_data["hostCounts"].get(name, 0)),
            "status": (
                "warning"
                if not service_active
                or log_data["hostErrorsRecent"].get(name, 0) > 0
                else "healthy"
            ),
        })

    result.sort(key=lambda item: item["requests"], reverse=True)
    return result[:12]


def _nginx_metrics_uncached():
    now = datetime.now(timezone.utc)
    service_active = _is_active()

    connection_stats_available = False
    connection_stats_error = None

    connection_stats = {
        "activeConnections": 0,
        "reading": 0,
        "writing": 0,
        "waiting": 0,
    }

    if service_active:
        try:
            connection_stats = _stub_status()
            connection_stats_available = True
        except Exception as exc:
            connection_stats_error = str(exc)[:200]

    logs = _read_logs(now)
    start = now - timedelta(hours=1)
    buckets = [{"count": 0, "latencies": []} for _ in range(24)]

    last_minute = 0
    for stamp, latency, status in logs["events"]:
        if stamp >= now - timedelta(seconds=60):
            last_minute += 1

        index = int((stamp - start).total_seconds() // 150)
        if 0 <= index < len(buckets):
            buckets[index]["count"] += 1
            if latency is not None and status != 101:
                buckets[index]["latencies"].append(latency * 1000)

    history = []
    for index, bucket in enumerate(buckets):
        label_time = start + timedelta(seconds=(index + 1) * 150)
        latencies = bucket["latencies"]
        history.append({
            "time": label_time.astimezone().strftime("%H:%M"),
            "requests": round(bucket["count"] * 60 / 150, 2),
            # Zero means the retained log bucket contains no timing samples.
            "latencyMs": (
                round(sum(latencies) / len(latencies), 1)
                if latencies else 0
            ),
        })

    return {
        "status": (
            "stopped" if not service_active
            else "warning" if logs["errorsRecent"] > 0
            else "active"
        ),
        "version": _version(),
        "uptimeFormatted": _uptime(),
        "connectionStatsAvailable": connection_stats_available,
        "connectionStatsError": connection_stats_error,
        "activeConnections": connection_stats["activeConnections"],
        "reading": connection_stats["reading"],
        "writing": connection_stats["writing"],
        "waiting": connection_stats["waiting"],
        "totalRequests": logs["totalRequests"],
        "totalTrafficBytes": logs["totalTrafficBytes"],
        "requestsPerSec": round(last_minute / 60, 2),
        "statusCodeCounts": logs["statusCodeCounts"],
        "requestHistory": history,
        "topVirtualHosts": _configured_hosts(logs, service_active),
    }


_NGINX_CACHE_LOCK = threading.Lock()
_NGINX_CACHE_TIME = 0.0
_NGINX_CACHE_VALUE = None


def nginx_metrics():
    global _NGINX_CACHE_TIME, _NGINX_CACHE_VALUE
    with _NGINX_CACHE_LOCK:
        now = time.monotonic()
        if _NGINX_CACHE_VALUE is not None and now - _NGINX_CACHE_TIME < 5:
            return _NGINX_CACHE_VALUE
        result = _nginx_metrics_uncached()
        _NGINX_CACHE_VALUE = result
        _NGINX_CACHE_TIME = time.monotonic()
        return result
