#!/usr/bin/env python3

import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

UNITS = (
    ("nginx", "nginx.service"),
    ("docker", "docker.service"),
    ("ssh", "ssh.service"),
    ("cron", "cron.service"),
    ("systemd-resolved", "systemd-resolved.service"),
    ("fail2ban", "fail2ban.service"),
    ("scc-agent", "scc-agent.service"),
    ("olcrtc-manager", "olcrtc-manager.service"),
)

CACHE_TTL = 5
_cache_lock = threading.Lock()
_cache_time = 0.0
_cache_value = None


def _format_bytes(value):
    value = float(value or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return f"{int(value)} {unit}" if unit == "B" else f"{value:.1f} {unit}"
        value /= 1024
    return f"{value:.1f} TB"


def _uptime(timestamp, active):
    if not active or not timestamp:
        return "—"
    try:
        started = datetime.strptime(
            timestamp, "%a %Y-%m-%d %H:%M:%S %Z"
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
    except ValueError:
        return "unknown"


def _read_properties(unit):
    result = subprocess.run(
        [
            "systemctl", "show", "--no-pager",
            "--property=Id,Description,LoadState,ActiveState,SubState,"
            "MainPID,ActiveEnterTimestamp,UnitFileState,MemoryCurrent,ControlGroup",
            unit,
        ],
        capture_output=True,
        text=True,
        timeout=3,
        check=False,
    )
    if result.returncode != 0:
        return None

    props = {}
    for line in result.stdout.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            props[key] = value

    if not props or props.get("LoadState") == "not-found":
        return None
    return props


def _memory_bytes(props, pid):
    # Prefer systemd's measured memory for the entire unit cgroup.
    try:
        value = int(props.get("MemoryCurrent", "0"))
        if 0 < value < (1 << 63):
            return value
    except ValueError:
        pass

    # Fallback to the unit's cgroup memory.current, where available.
    group = props.get("ControlGroup", "")
    if group.startswith("/") and ".." not in Path(group).parts:
        try:
            value = int(
                (Path("/sys/fs/cgroup") / group.lstrip("/") / "memory.current")
                .read_text().strip()
            )
            if value > 0:
                return value
        except (OSError, ValueError):
            pass

    # Last fallback: RSS of the main process only.
    if pid > 0:
        try:
            for line in Path(f"/proc/{pid}/status").read_text().splitlines():
                if line.startswith("VmRSS:"):
                    return int(line.split()[1]) * 1024
        except (OSError, ValueError, IndexError):
            pass
    return 0


def _discover_units():
    """Keep key candidates first, then discover loaded systemd services."""
    preferred = list(UNITS)
    seen = {unit for _, unit in preferred}
    try:
        result = subprocess.run(
            ["systemctl", "list-units", "--type=service", "--all",
             "--no-legend", "--no-pager"],
            capture_output=True, text=True, timeout=5, check=False
        )
    except (OSError, subprocess.TimeoutExpired):
        return preferred

    discovered = []
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            fields = line.split(None, 4)
            if not fields:
                continue
            unit = fields[0]
            if not unit.endswith(".service") or unit in seen:
                continue
            seen.add(unit)
            discovered.append((unit[:-8], unit))
    return (preferred + discovered)[:80]


def _collect():
    services = []

    for name, unit in _discover_units():
        props = _read_properties(unit)
        if props is None:
            continue

        active_state = props.get("ActiveState", "inactive")
        sub_state = props.get("SubState", "unknown")
        active = active_state == "active"

        try:
            pid = int(props.get("MainPID", "0"))
        except ValueError:
            pid = 0

        memory = _memory_bytes(props, pid)
        file_state = props.get("UnitFileState", "unknown")

        services.append({
            "name": name,
            "unitName": props.get("Id", unit),
            "active": active,
            "status": (
                "active" if active
                else "failed" if active_state == "failed"
                else "inactive"
            ),
            "subStatus": sub_state,
            "uptime": _uptime(
                props.get("ActiveEnterTimestamp", ""), active
            ),
            "pid": pid,
            "memoryBytes": memory,
            "memoryFormatted": _format_bytes(memory),
            "description": props.get("Description", name),
            "enabledOnBoot": file_state in (
                "enabled", "enabled-runtime", "linked", "linked-runtime"
            ),
        })

    return services


def service_metrics():
    global _cache_time, _cache_value

    with _cache_lock:
        now = time.monotonic()
        if _cache_value is not None and now - _cache_time < CACHE_TTL:
            return _cache_value

        value = _collect()
        _cache_value = value
        _cache_time = time.monotonic()
        return value
