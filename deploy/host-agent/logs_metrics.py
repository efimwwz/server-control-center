import hashlib
import json
import re
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

CACHE_SECONDS = 8
MAX_CONTAINERS = 25
LOG_DIR = Path("/var/log/nginx")
LOCK = threading.Lock()
CACHE_TIME = 0.0
CACHE = None

ACCESS = re.compile(
    r'\[(?P<ts>[^\]]+)\]\s+"(?P<req>[^"]*)"\s+'
    r'(?P<status>\d{3})\s+(?P<size>\d+|-)'
)
ERR = re.compile(
    r'^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) '
    r'\[(\w+)\]\s+\d+#\d+:\s+(.*)$'
)
SECRET = re.compile(
    r'(?i)([?&](?:token|key|password|api_key|authorization)=)[^&\s"]+'
)


def _time(value):
    try:
        return datetime.strptime(
            value, "%d/%b/%Y:%H:%M:%S %z"
        ).astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        pass
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if result.tzinfo is None:
            result = result.replace(tzinfo=timezone.utc)
        return result.astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        pass
    try:
        return datetime.strptime(
            value, "%Y/%m/%d %H:%M:%S"
        ).replace(tzinfo=timezone.utc).isoformat()
    except (ValueError, TypeError):
        return None


def _entry(source, service, stamp, level, message, details=None):
    if not stamp:
        return None
    message = SECRET.sub(r"\1[REDACTED]", str(message))[:1200]
    key = f"{source}|{service}|{stamp}|{message}"
    return {
        "id": hashlib.sha1(key.encode()).hexdigest()[:16],
        "timestamp": stamp,
        "source": source,
        "level": level,
        "service": service,
        "message": message,
        "details": details or {},
    }


def _tail(path, size=65536):
    try:
        with path.open("rb") as stream:
            stream.seek(0, 2)
            length = stream.tell()
            offset = max(0, length - size)
            stream.seek(offset)
            if offset:
                stream.readline()
            return stream.read(size).decode(
                "utf-8", errors="replace"
            ).splitlines()
    except OSError:
        return []


def _nginx():
    items = []
    for line in _tail(LOG_DIR / "access.log"):
        match = ACCESS.search(line)
        if not match:
            continue
        status = int(match.group("status"))
        level = "error" if status >= 500 else (
            "warning" if status >= 400 else "info"
        )
        items.append(_entry(
            "nginx", "nginx/access.log", _time(match.group("ts")),
            level, line, {"status": status}
        ))

    for line in _tail(LOG_DIR / "error.log"):
        match = ERR.match(line)
        if not match:
            continue
        raw = match.group(2).lower()
        level = "error" if raw in (
            "error", "crit", "alert", "emerg"
        ) else "warning" if raw == "warn" else "info"
        items.append(_entry(
            "nginx", "nginx/error.log", _time(match.group(1)),
            level, line, {"nginxLevel": raw}
        ))
    return items


def _systemd():
    try:
        result = subprocess.run(
            ["journalctl", "--no-pager", "-n", "80", "-o", "json"],
            capture_output=True, text=True, timeout=2, check=False
        )
        if result.returncode:
            return []
    except (OSError, subprocess.TimeoutExpired):
        return []

    items = []
    for line in result.stdout.splitlines():
        try:
            record = json.loads(line)
            stamp = datetime.fromtimestamp(
                int(record["__REALTIME_TIMESTAMP"]) / 1_000_000,
                timezone.utc
            ).isoformat()
            priority = int(record.get("PRIORITY", 6))
        except (ValueError, TypeError, KeyError, OSError):
            continue
        level = "error" if priority <= 3 else (
            "warning" if priority == 4 else "info"
        )
        service = str(
            record.get("SYSLOG_IDENTIFIER")
            or record.get("_SYSTEMD_UNIT")
            or "systemd"
        )[:100]
        item = _entry(
            "systemd", service, stamp, level,
            record.get("MESSAGE", ""), {"priority": priority}
        )
        if item:
            items.append(item)
    return items


def _docker_one(container):
    try:
        result = subprocess.run(
            ["docker", "logs", "--timestamps", "--since", "15m",
             "--tail", "8", container],
            capture_output=True, text=True, timeout=1.5, check=False
        )
    except (OSError, subprocess.TimeoutExpired):
        return []

    if result.returncode:
        return []

    items = []
    for line in (result.stdout + "\n" + result.stderr).splitlines():
        parts = line.split(None, 1)
        if len(parts) != 2:
            continue
        stamp = _time(parts[0])
        if not stamp:
            continue
        message = parts[1]
        lower = message.lower()
        level = "error" if re.search(
            r'\b(error|exception|traceback|fatal|panic)\b', lower
        ) else "warning" if re.search(
            r'\b(warn|warning)\b', lower
        ) else "info"
        item = _entry("docker", container, stamp, level, message)
        if item:
            items.append(item)
    return items


def _discover_containers():
    """Return bounded names of currently running Docker containers."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=2, check=False
        )
    except (OSError, subprocess.TimeoutExpired):
        return []

    if result.returncode != 0:
        return []

    names = []
    for line in result.stdout.splitlines():
        name = line.strip()
        if name and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", name):
            names.append(name)
        if len(names) >= MAX_CONTAINERS:
            break
    return names


def _collect():
    items = _nginx() + _systemd()
    containers = _discover_containers()
    if containers:
        with ThreadPoolExecutor(max_workers=min(5, len(containers))) as pool:
            for result in pool.map(_docker_one, containers):
                items.extend(result)
    items.sort(key=lambda item: item["timestamp"], reverse=True)
    return items[:300]


def get_logs(source="all", level="all", query="", limit=100):
    global CACHE_TIME, CACHE

    try:
        limit = max(1, min(200, int(limit)))
    except (ValueError, TypeError):
        limit = 100

    with LOCK:
        if CACHE is None or time.monotonic() - CACHE_TIME >= CACHE_SECONDS:
            CACHE = _collect()
            CACHE_TIME = time.monotonic()
        items = list(CACHE)

    if source in ("nginx", "docker", "systemd"):
        items = [x for x in items if x["source"] == source]
    if level in ("info", "warning", "error"):
        items = [x for x in items if x["level"] == level]

    query = str(query or "").strip().lower()[:100]
    if query:
        items = [
            x for x in items
            if query in x["message"].lower()
            or query in x["service"].lower()
            or query in x["source"].lower()
        ]
    return items[:limit]
