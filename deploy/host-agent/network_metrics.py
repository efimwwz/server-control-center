#!/usr/bin/env python3

import ipaddress
import json
import os
import re
import socket
import subprocess
import threading
import time
from pathlib import Path
from urllib.request import Request, urlopen

CACHE_TTL = 4
PING_TARGET = "1.1.1.1"

HIDDEN_DOCKER_NETWORKS = {
    value.strip()
    for value in os.environ.get("SCC_HIDDEN_DOCKER_NETWORKS", "").split(",")
    if value.strip()
}

_cache_lock = threading.Lock()
_cache_time = 0.0
_cache_value = None

_public_ip = "Unavailable"
_public_ip_time = 0.0


def _run_json(args, timeout=2):
    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"{args[0]} failed: {result.stderr.strip()[:200]}"
        )
    return json.loads(result.stdout or "[]")


def _read_counters():
    result = {}
    with open("/proc/net/dev", encoding="utf-8") as stream:
        for line in stream:
            if ":" not in line:
                continue

            name, raw = line.split(":", 1)
            values = raw.split()
            if len(values) < 11:
                continue

            result[name.strip()] = {
                "rxBytes": int(values[0]),
                "rxPackets": int(values[1]),
                "rxErrors": int(values[2]),
                "txBytes": int(values[8]),
                "txPackets": int(values[9]),
                "txErrors": int(values[10]),
            }
    return result


def _format_speed(value):
    value = float(max(0, value))
    for unit in ("B/s", "KB/s", "MB/s", "GB/s"):
        if value < 1024 or unit == "GB/s":
            return (
                f"{int(value)} {unit}"
                if unit == "B/s"
                else f"{value:.1f} {unit}"
            )
        value /= 1024
    return f"{value:.1f} GB/s"


def _get_public_ip():
    global _public_ip, _public_ip_time

    now = time.monotonic()
    if now - _public_ip_time < 300:
        return _public_ip

    try:
        request = Request(
            "https://api.ipify.org",
            headers={"User-Agent": "SCC-Network-Monitor/1.0"},
        )
        with urlopen(request, timeout=1.2) as response:
            candidate = response.read(64).decode().strip()

        ip = ipaddress.ip_address(candidate)
        if ip.version != 4:
            raise ValueError("Expected IPv4")
        _public_ip = str(ip)
    except Exception:
        # Do not misrepresent the host's private address as a public IP.
        if _public_ip == "Unavailable":
            _public_ip = "Unavailable"

    _public_ip_time = now
    return _public_ip


def _ping():
    try:
        result = subprocess.run(
            [
                "ping", "-n", "-c", "2",
                "-i", "0.2", "-W", "1", PING_TARGET,
            ],
            capture_output=True,
            text=True,
            timeout=2.2,
            check=False,
            env={**os.environ, "LC_ALL": "C"},
        )
        output = result.stdout + "\n" + result.stderr

        loss_match = re.search(
            r"(\d+(?:\.\d+)?)%\s*packet loss", output
        )
        latency_match = re.search(
            r"=\s*[\d.]+/([\d.]+)/[\d.]+/[\d.]+\s*ms",
            output,
        )

        loss = float(loss_match.group(1)) if loss_match else 100.0
        latency = float(latency_match.group(1)) if latency_match else 0.0
        return round(latency, 2), round(loss, 1)

    except Exception:
        return 0.0, 100.0


def _dns_servers():
    servers = []
    try:
        for line in Path("/etc/resolv.conf").read_text().splitlines():
            fields = line.split()
            if len(fields) >= 2 and fields[0] == "nameserver":
                server = fields[1].split("%", 1)[0]
                if server not in servers:
                    servers.append(server)
    except OSError:
        pass
    return servers


def _docker_bridge_map():
    """Map Linux bridge interfaces to Docker networks and containers."""
    try:
        listed = subprocess.run(
            ["docker", "network", "ls", "-q"],
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        if listed.returncode != 0:
            return {}

        network_ids = [
            line.strip()
            for line in listed.stdout.splitlines()
            if line.strip()
        ]
        if not network_ids:
            return {}

        networks = _run_json(
            ["docker", "network", "inspect", *network_ids],
            timeout=3,
        )
    except (OSError, subprocess.SubprocessError, ValueError, RuntimeError):
        return {}

    bridges = {}

    for network in networks:
        if network.get("Driver") != "bridge":
            continue

        network_id = network.get("Id", "")
        network_name = network.get("Name", "")
        options = network.get("Options") or {}

        bridge_name = options.get("com.docker.network.bridge.name")
        if not bridge_name:
            if network_name == "bridge":
                bridge_name = "docker0"
            elif network_id:
                bridge_name = f"br-{network_id[:12]}"
            else:
                continue

        attached = network.get("Containers") or {}
        container_names = sorted({
            item.get("Name", "").strip()
            for item in attached.values()
            if isinstance(item, dict) and item.get("Name", "").strip()
        })

        bridges[bridge_name] = {
            "networkName": network_name,
            "containers": container_names,
        }

    return bridges


def _docker_veth_map(host_links):
    """Map host veth interfaces to names of their running containers."""
    host_veths = {
        int(item["ifindex"]): item["ifname"]
        for item in host_links
        if item.get("ifname", "").startswith("veth")
        and item.get("ifindex") is not None
    }
    if not host_veths:
        return {}

    try:
        listed = subprocess.run(
            ["docker", "ps", "-q"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
        if listed.returncode != 0:
            return {}

        container_ids = [
            line.strip()
            for line in listed.stdout.splitlines()
            if line.strip()
        ]
        if not container_ids:
            return {}

        containers = _run_json(
            ["docker", "inspect", *container_ids],
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError, ValueError, RuntimeError):
        return {}

    mapping = {}

    for container in containers:
        container_name = container.get("Name", "").lstrip("/")
        pid = int(container.get("State", {}).get("Pid") or 0)
        if not container_name or pid <= 0:
            continue

        try:
            result = subprocess.run(
                [
                    "nsenter", "-t", str(pid), "-n",
                    "ip", "-j", "-d", "link", "show",
                ],
                capture_output=True,
                text=True,
                timeout=3,
                check=False,
            )
            if result.returncode != 0:
                continue
            container_links = json.loads(result.stdout or "[]")
        except (OSError, subprocess.SubprocessError, ValueError):
            continue

        for link in container_links:
            peer_index = link.get("link_index")
            if peer_index is None:
                continue
            try:
                host_name = host_veths.get(int(peer_index))
            except (TypeError, ValueError):
                continue

            if host_name:
                mapping[host_name] = container_name

    return mapping


def _collect():
    links = _run_json(["ip", "-j", "-d", "link", "show"])
    veth_containers = _docker_veth_map(links)
    addresses = _run_json(["ip", "-j", "-4", "addr", "show"])
    routes = _run_json(["ip", "-j", "route", "show", "table", "main"])

    docker_bridges = _docker_bridge_map()

    link_map = {item["ifname"]: item for item in links}
    address_map = {item["ifname"]: item for item in addresses}

    default_route = next(
        (
            route for route in routes
            if route.get("dst") == "default"
        ),
        {},
    )

    default_gateway = default_route.get("gateway", "Unavailable")
    default_iface = default_route.get("dev", "")

    counters_before = _read_counters()
    time.sleep(0.2)
    counters_after = _read_counters()

    interfaces = []

    for name, link in link_map.items():
        docker_info = docker_bridges.get(name, {})
        docker_network_name = docker_info.get("networkName")
        if docker_network_name in HIDDEN_DOCKER_NETWORKS:
            continue
        container_names = docker_info.get("containers", [])
        display_name = veth_containers.get(name) or (", ".join(container_names) if container_names else (docker_network_name or name))
        addr_entry = address_map.get(name, {})
        ipv4 = "—"
        netmask = "—"

        for addr in addr_entry.get("addr_info", []):
            if addr.get("family") != "inet":
                continue
            if addr.get("scope") == "host" and name != "lo":
                continue

            ipv4 = addr.get("local", "—")
            prefix = addr.get("prefixlen")
            if prefix is not None:
                netmask = str(
                    ipaddress.IPv4Network(f"0.0.0.0/{prefix}").netmask
                )
            break

        flags = set(link.get("flags", []))
        operstate = link.get("operstate", "UNKNOWN")
        state = (
            "UP"
            if "UP" in flags and operstate != "DOWN"
            else "DOWN"
        )

        if name == "lo":
            iface_type = "loopback"
            speed = "Virtual loopback"
        elif (
            (Path("/sys/class/net") / name / "bridge").exists()
            or name == "docker0"
            or name.startswith("br-")
        ):
            iface_type = "bridge"
            speed = "Software bridge"
        elif name.startswith(("wg", "tun", "tap", "veth", "olh")):
            iface_type = "virtual"
            speed = "Virtual interface"
        else:
            iface_type = "ethernet"
            try:
                raw_speed = int(
                    (Path("/sys/class/net") / name / "speed")
                    .read_text().strip()
                )
                speed = (
                    f"{raw_speed} Mbit/s"
                    if raw_speed > 0
                    else "Not reported"
                )
            except (OSError, ValueError):
                speed = "Not reported"

        stats = counters_after.get(name, {})
        interface_data = {
            "name": name,
            "displayName": display_name,
            "dockerNetworkName": docker_network_name or "",
            "containerNames": container_names,
            "type": iface_type,
            "state": state,
            "ipv4": ipv4,
            "netmask": netmask,
            "mac": link.get("address", "—"),
            "mtu": int(link.get("mtu", 0)),
            "rxBytes": stats.get("rxBytes", 0),
            "txBytes": stats.get("txBytes", 0),
            "rxPackets": stats.get("rxPackets", 0),
            "txPackets": stats.get("txPackets", 0),
            "rxErrors": stats.get("rxErrors", 0),
            "txErrors": stats.get("txErrors", 0),
            "speed": speed,
        }
        interfaces.append(interface_data)

    # Aggregate traffic only on the route's default interface:
    # bridges and veth devices are displayed separately, not double-counted.
    before = counters_before.get(default_iface, {})
    after = counters_after.get(default_iface, {})
    elapsed = 0.2

    rx_speed = max(
        0, int((after.get("rxBytes", 0) - before.get("rxBytes", 0)) / elapsed)
    )
    tx_speed = max(
        0, int((after.get("txBytes", 0) - before.get("txBytes", 0)) / elapsed)
    )

    latency, loss = _ping()

    return {
        "publicIp": _get_public_ip(),
        "hostname": socket.gethostname(),
        "defaultGateway": default_gateway,
        "dnsServers": _dns_servers(),
        "interfaces": interfaces,
        "rxSpeedBytesSec": rx_speed,
        "txSpeedBytesSec": tx_speed,
        "rxSpeedFormatted": _format_speed(rx_speed),
        "txSpeedFormatted": _format_speed(tx_speed),
        "packetLossPercent": loss,
        "latencyMs": latency,
        "pingTarget": PING_TARGET,
    }


def network_metrics():
    global _cache_time, _cache_value

    with _cache_lock:
        now = time.monotonic()
        if _cache_value is not None and now - _cache_time < CACHE_TTL:
            return _cache_value

        result = _collect()
        _cache_value = result
        _cache_time = time.monotonic()
        return result
