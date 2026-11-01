#!/usr/bin/env python3

import json
import os
import platform
import shutil
import socket
import socketserver
import subprocess
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from nginx_metrics import nginx_metrics
from services_metrics import service_metrics
from network_metrics import network_metrics
from security_metrics import security_metrics
from logs_metrics import get_logs


SOCKET_PATH = "/run/scc-agent/agent.sock"


# ---------- helpers ----------

def run_cmd(args, timeout=5):
    """Run one fixed read-only command and return stdout."""
    result = subprocess.run(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"{args[0]} failed: {result.stderr.strip()[:300]}"
        )

    return result.stdout.strip()


def read_meminfo():
    result = {}

    with open("/proc/meminfo", "r", encoding="utf-8") as f:
        for line in f:
            key, value = line.split(":", 1)
            parts = value.strip().split()

            if not parts:
                continue

            result[key] = int(parts[0]) * 1024

    return result


def read_cpu_times():
    with open("/proc/stat", "r", encoding="utf-8") as f:
        first = f.readline().split()

    values = [int(x) for x in first[1:]]
    return values


def cpu_usage():
    a = read_cpu_times()
    time.sleep(1.0)
    b = read_cpu_times()

    idle_a = a[3] + (a[4] if len(a) > 4 else 0)
    idle_b = b[3] + (b[4] if len(b) > 4 else 0)

    total_a = sum(a)
    total_b = sum(b)

    total_delta = total_b - total_a
    idle_delta = idle_b - idle_a

    if total_delta <= 0:
        return {
            "usage": 0.0,
            "user": 0.0,
            "system": 0.0,
            "idle": 100.0,
        }

    usage = (total_delta - idle_delta) / total_delta * 100
    user = (b[0] - a[0]) / total_delta * 100
    system = (
        (b[2] - a[2]) / total_delta * 100
        if len(b) > 2
        else 0.0
    )

    return {
        "usage": round(max(0, min(100, usage)), 1),
        "user": round(max(0, user), 1),
        "system": round(max(0, system), 1),
        "idle": round(max(0, 100 - usage), 1),
    }


def network_bytes():
    total_rx = 0
    total_tx = 0

    with open("/proc/net/dev", "r", encoding="utf-8") as f:
        for line in f:
            if ":" not in line:
                continue

            iface, data = line.split(":", 1)
            iface = iface.strip()

            if iface == "lo":
                continue

            fields = data.split()
            if len(fields) < 9:
                continue

            total_rx += int(fields[0])
            total_tx += int(fields[8])

    return total_rx, total_tx


def network_speed():
    rx_a, tx_a = network_bytes()
    started = time.monotonic()

    time.sleep(0.15)

    rx_b, tx_b = network_bytes()
    elapsed = max(0.05, time.monotonic() - started)

    return (
        max(0, int((rx_b - rx_a) / elapsed)),
        max(0, int((tx_b - tx_a) / elapsed)),
    )


def format_bytes(value):
    value = float(value)

    units = ["B", "KB", "MB", "GB", "TB"]
    unit = 0

    while value >= 1024 and unit < len(units) - 1:
        value /= 1024
        unit += 1

    if unit == 0:
        return f"{int(value)} {units[unit]}"

    return f"{value:.1f} {units[unit]}"


def docker_bytes(value):
    value = value.strip()

    if not value:
        return 0

    units = {
        "B": 1,
        "KB": 1024,
        "MB": 1024 ** 2,
        "GB": 1024 ** 3,
        "TB": 1024 ** 4,
        "KiB": 1024,
        "MiB": 1024 ** 2,
        "GiB": 1024 ** 3,
        "TiB": 1024 ** 4,
    }

    for unit in sorted(units, key=len, reverse=True):
        if value.endswith(unit):
            number = value[:-len(unit)].strip()
            return int(float(number) * units[unit])

    return int(float(value))


def parse_started_at(value):
    if not value or value.startswith("0001-"):
        return ""

    try:
        dt = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
        return dt
    except ValueError:
        return None


def uptime_from_started(value):
    dt = parse_started_at(value)

    if not dt:
        return ""

    now = datetime.now(timezone.utc)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    seconds = max(0, int((now - dt).total_seconds()))

    days, remainder = divmod(seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes = remainder // 60

    if days:
        return f"{days}d {hours}h"
    if hours:
        return f"{hours}h {minutes}m"

    return f"{minutes}m"


# ---------- system ----------

def system_metrics():
    mem = read_meminfo()
    cpu = cpu_usage()

    uptime_seconds = int(float(
        Path("/proc/uptime").read_text().split()[0]
    ))

    load1, load5, load15 = os.getloadavg()

    disk = shutil.disk_usage("/")

    rx_speed, tx_speed = network_speed()

    hostname = socket.gethostname()

    os_name = "Linux"

    try:
        os_release = Path("/etc/os-release").read_text(
            encoding="utf-8"
        )

        for line in os_release.splitlines():
            if line.startswith("PRETTY_NAME="):
                os_name = line.split("=", 1)[1].strip('"')
                break
    except Exception:
        pass

    cpu_model = "Unknown"

    try:
        cpuinfo = Path("/proc/cpuinfo").read_text(
            encoding="utf-8",
            errors="ignore"
        )

        for line in cpuinfo.splitlines():
            if line.lower().startswith("model name"):
                cpu_model = line.split(":", 1)[1].strip()
                break
    except Exception:
        pass

    return {
        "info": {
            "hostname": hostname,
            "os": os_name,
            "kernel": f"Linux {platform.release()} {platform.machine()}",
            "uptimeSeconds": uptime_seconds,
            "uptimeFormatted": format_uptime(uptime_seconds),
            "currentTime": datetime.now(timezone.utc).isoformat(),
            "status": "online",
            "cpuCores": os.cpu_count() or 1,
            "cpuModel": cpu_model,
        },
        "cpu": {
            "usagePercent": cpu["usage"],
            "userPercent": cpu["user"],
            "systemPercent": cpu["system"],
            "idlePercent": cpu["idle"],
        },
        "ram": {
            "totalBytes": mem.get("MemTotal", 0),
            "usedBytes": (
                mem.get("MemTotal", 0)
                - mem.get("MemAvailable", 0)
            ),
            "freeBytes": mem.get("MemAvailable", 0),
            "cachedBytes": mem.get("Cached", 0),
            "usagePercent": round(
                (
                    (
                        mem.get("MemTotal", 0)
                        - mem.get("MemAvailable", 0)
                    )
                    / max(1, mem.get("MemTotal", 1))
                ) * 100,
                1,
            ),
        },
        "disk": {
            "totalBytes": disk.total,
            "usedBytes": disk.used,
            "freeBytes": disk.free,
            "usagePercent": round(
                disk.used / max(1, disk.total) * 100,
                1,
            ),
            "mountPoint": "/",
            "filesystem": "root filesystem",
        },
        "loadAvg": {
            "load1m": round(load1, 2),
            "load5m": round(load5, 2),
            "load15m": round(load15, 2),
        },
        "network": {
            "rxBytesSec": rx_speed,
            "txBytesSec": tx_speed,
            "rxFormatted": f"{format_bytes(rx_speed)}/s",
            "txFormatted": f"{format_bytes(tx_speed)}/s",
        },
        "history": [],
    }


def format_uptime(seconds):
    days, remainder = divmod(seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes = remainder // 60

    return f"{days}d {hours}h {minutes}m"


# ---------- docker ----------

def docker_overview():
    engine_version = run_cmd(
        ["docker", "info", "--format", "{{.ServerVersion}}"],
        timeout=10,
    )

    raw = run_cmd(
        [
            "docker",
            "ps",
            "-a",
            "--no-trunc",
            "--format",
            "{{json .}}",
        ],
        timeout=10,
    )

    containers = []

    stats_raw = run_cmd(
        [
            "docker",
            "stats",
            "--no-stream",
            "--format",
            "{{json .}}",
        ],
        timeout=20,
    )

    stats_map = {}

    for line in stats_raw.splitlines():
        try:
            item = json.loads(line)
            stats_map[item.get("ID", "")] = item
            stats_map[item.get("Name", "")] = item
        except Exception:
            continue

    for line in raw.splitlines():
        if not line.strip():
            continue

        item = json.loads(line)

        cid = item.get("ID", "")
        name = item.get("Names", "")
        state = item.get("State", "").lower()
        status_detail = item.get("Status", "")
        image = item.get("Image", "")
        ports_raw = item.get("Ports", "")
        command = item.get("Command", "")

        status = "ERROR"

        if state == "running":
            status = "UP"
        elif state in ("created", "exited"):
            status = "STOPPED"
        elif state == "restarting":
            status = "RESTARTING"

        restart_count = 0
        created = ""
        started_at = ""

        try:
            inspect_raw = run_cmd(
                ["docker", "inspect", cid],
                timeout=10,
            )

            inspect = json.loads(inspect_raw)[0]

            created = inspect.get("Created", "")
            restart_count = inspect.get(
                "RestartCount",
                0,
            )

            started_at = inspect.get(
                "State",
                {}
            ).get("StartedAt", "")
        except Exception:
            pass

        stats = stats_map.get(cid) or stats_map.get(name) or {}

        cpu_percent = parse_percent(
            stats.get("CPUPerc", "0%")
        )

        mem_usage = 0
        mem_limit = 0

        mem_usage_raw = stats.get("MemUsage", "")

        if "/" in mem_usage_raw:
            usage_part, limit_part = mem_usage_raw.split(
                "/", 1
            )

            mem_usage = docker_bytes(usage_part)
            mem_limit = docker_bytes(limit_part)

        containers.append({
            "id": cid[:12],
            "name": name,
            "image": image,
            "status": status,
            "statusDetail": status_detail,
            "uptime": uptime_from_started(started_at),
            "cpuPercent": round(cpu_percent, 2),
            "memoryUsageBytes": mem_usage,
            "memoryLimitBytes": mem_limit,
            "memoryFormatted": (
                f"{format_bytes(mem_usage)} / "
                f"{format_bytes(mem_limit)}"
            ),
            "ports": (
                [p.strip() for p in ports_raw.split(",")]
                if ports_raw
                else []
            ),
            "created": created,
            "restartCount": restart_count,
            "command": command,
        })

    return {
        "total": len(containers),
        "running": sum(
            1 for c in containers if c["status"] == "UP"
        ),
        "stopped": sum(
            1 for c in containers if c["status"] == "STOPPED"
        ),
        "restarting": sum(
            1 for c in containers if c["status"] == "RESTARTING"
        ),
        "error": sum(
            1 for c in containers if c["status"] == "ERROR"
        ),
        "containers": containers,
        "engineVersion": f"Docker Engine {engine_version}",
    }


def parse_percent(value):
    try:
        return float(value.rstrip("%"))
    except Exception:
        return 0.0


# ---------- HTTP ----------

class Handler(BaseHTTPRequestHandler):

    server_version = "SCC-Agent/1.1.1"

    def log_message(self, *_args):
        return

    def send_json(self, payload, status=200):
        body = json.dumps(
            payload,
            ensure_ascii=False,
        ).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8",
        )
        self.send_header(
            "Content-Length",
            str(len(body)),
        )
        self.send_header(
            "Cache-Control",
            "no-store",
        )
        self.end_headers()

        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path

        try:
            if path == "/health":
                return self.send_json({
                    "status": "ok",
                    "agent": "scc-agent",
                    "version": "1.1.1",
                    "readOnly": True,
                })

            if path == "/system":
                return self.send_json(system_metrics())

            if path == "/docker":
                return self.send_json(docker_overview())

            if path == "/nginx":
                return self.send_json(nginx_metrics())

            if path == "/services":
                return self.send_json(service_metrics())

            if path == "/security":
                return self.send_json(security_metrics())

            if path == "/network":
                return self.send_json(network_metrics())

            if path == "/logs":
                params = parse_qs(urlparse(self.path).query)
                return self.send_json(get_logs(
                    source=params.get("source", ["all"])[0],
                    level=params.get("level", ["all"])[0],
                    query=params.get("query", [""])[0],
                    limit=params.get("limit", ["100"])[0],
                ))


            return self.send_json(
                {"error": "not found"},
                404,
            )

        except Exception as exc:
            return self.send_json(
                {
                    "error": "agent error",
                    "message": str(exc)[:300],
                },
                500,
            )

    def do_POST(self):
        return self.send_json(
            {"error": "POST not allowed"},
            405,
        )


class UnixHTTPServer(
    socketserver.ThreadingMixIn,
    socketserver.UnixStreamServer,
):
    daemon_threads = True


def main():
    socket_dir = os.path.dirname(SOCKET_PATH)

    os.makedirs(
        socket_dir,
        mode=0o750,
        exist_ok=True,
    )

    try:
        os.unlink(SOCKET_PATH)
    except FileNotFoundError:
        pass

    server = UnixHTTPServer(
        SOCKET_PATH,
        Handler,
    )

    os.chmod(SOCKET_PATH, 0o660)

    print(
        f"SCC Agent listening on {SOCKET_PATH}",
        flush=True,
    )

    server.serve_forever()


if __name__ == "__main__":
    main()
