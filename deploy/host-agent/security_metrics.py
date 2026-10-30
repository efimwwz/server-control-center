#!/usr/bin/env python3
"""Read-only host security posture collector for Server Control Center."""

import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone


def _run(args, timeout=4):
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env={**os.environ, "LC_ALL": "C"},
        )
        return result.returncode, result.stdout, result.stderr
    except (OSError, subprocess.SubprocessError):
        return None


def _systemd_active(unit):
    result = _run(["systemctl", "is-active", unit], timeout=3)
    return bool(result and result[0] == 0)


def _yes_no(value):
    if value is None:
        return None
    value = str(value).lower()
    if value in ("yes", "true", "1"):
        return True
    if value in ("no", "false", "0"):
        return False
    return None


def _contains_verdict(value, verdict):
    if isinstance(value, dict):
        if verdict in value:
            return True
        return any(_contains_verdict(v, verdict) for v in value.values())
    if isinstance(value, list):
        return any(_contains_verdict(v, verdict) for v in value)
    return False


def _nft_snapshot():
    result = _run(["nft", "-j", "list", "ruleset"], timeout=5)
    if not result or result[0] != 0:
        return None

    try:
        entries = json.loads(result[1]).get("nftables", [])
    except (ValueError, TypeError):
        return None

    chains = {"ipv4": [], "ipv6": []}
    rules = {}

    for entry in entries:
        chain = entry.get("chain")
        if isinstance(chain, dict):
            if chain.get("hook") == "input" and chain.get("type") == "filter":
                family = chain.get("family")
                targets = (
                    ["ipv4"] if family == "ip"
                    else ["ipv6"] if family == "ip6"
                    else ["ipv4", "ipv6"] if family == "inet"
                    else []
                )
                key = (
                    family,
                    chain.get("table"),
                    chain.get("name"),
                )
                for target in targets:
                    chains[target].append({
                        "key": key,
                        "policy": str(chain.get("policy", "")).lower(),
                    })

        rule = entry.get("rule")
        if isinstance(rule, dict):
            key = (
                rule.get("family"),
                rule.get("table"),
                rule.get("chain"),
            )
            rules.setdefault(key, []).append(rule.get("expr", []))

    return chains, rules


def _classify_nft(chains, rules):
    if not chains:
        return {
            "status": "unknown",
            "defaultPolicy": "UNKNOWN",
            "baseChains": 0,
            "inputRules": 0,
            "dropRejectRules": 0,
            "details": "No inspectable nftables INPUT base chain was found.",
        }

    policies = [c["policy"] for c in chains]
    expressions = [
        expr
        for chain in chains
        for expr in rules.get(chain["key"], [])
    ]

    drop_rules = sum(
        1 for expr in expressions
        if _contains_verdict(expr, "drop")
        or _contains_verdict(expr, "reject")
    )

    policy = "DROP" if "drop" in policies else (
        "ACCEPT" if "accept" in policies else "UNKNOWN"
    )

    if "drop" in policies:
        status = "pass"
        details = "An INPUT base chain has a default DROP policy."
    elif drop_rules:
        status = "warning"
        details = "Conditional DROP/REJECT rules exist, but the base policy is not DROP."
    elif expressions:
        status = "warning"
        details = "INPUT rules exist, but effective filtering requires review."
    elif "accept" in policies:
        status = "critical"
        details = "INPUT accepts traffic by default and has no direct filtering rules."
    else:
        status = "unknown"
        details = "Could not determine the effective INPUT policy."

    return {
        "status": status,
        "defaultPolicy": policy,
        "baseChains": len(chains),
        "inputRules": len(expressions),
        "dropRejectRules": drop_rules,
        "details": details,
    }


def _iptables_family(command):
    result = _run([command, "-S", "INPUT"], timeout=3)
    if not result or result[0] != 0:
        return {
            "status": "unknown",
            "defaultPolicy": "UNKNOWN",
            "baseChains": 0,
            "inputRules": 0,
            "dropRejectRules": 0,
            "details": f"{command} INPUT could not be inspected.",
        }

    lines = result[1].splitlines()
    policy = None
    rules = []

    for line in lines:
        fields = line.split()
        if len(fields) >= 3 and fields[0] == "-P" and fields[1] == "INPUT":
            policy = fields[2].upper()
        elif fields and fields[0] == "-A" and fields[1] == "INPUT":
            rules.append(fields)

    deny_rules = sum(
        1 for fields in rules
        if "-j" in fields and
        fields[fields.index("-j") + 1].upper() in ("DROP", "REJECT")
    ) if rules else 0

    if policy == "DROP":
        status = "pass"
        details = f"{command}: INPUT default policy is DROP."
    elif deny_rules:
        status = "warning"
        details = f"{command}: explicit DROP/REJECT rules exist; full policy needs review."
    elif policy == "ACCEPT" and rules:
        status = "warning"
        details = f"{command}: INPUT accepts by default; custom rules need review."
    elif policy == "ACCEPT":
        status = "critical"
        details = f"{command}: INPUT accepts all traffic by default."
    else:
        status = "unknown"
        details = f"{command}: INPUT policy could not be determined."

    return {
        "status": status,
        "defaultPolicy": policy or "UNKNOWN",
        "baseChains": 1 if policy else 0,
        "inputRules": len(rules),
        "dropRejectRules": deny_rules,
        "details": details,
    }


def _firewall():
    snapshot = _nft_snapshot()
    families = {}

    for key, fallback in (
        ("ipv4", "iptables"),
        ("ipv6", "ip6tables"),
    ):
        if snapshot and snapshot[0].get(key):
            families[key] = _classify_nft(
                snapshot[0][key],
                snapshot[1],
            )
        else:
            families[key] = _iptables_family(fallback)

    managers = []

    if shutil.which("ufw"):
        result = _run(["ufw", "status", "verbose"])
        if result and result[0] == 0:
            first = next(
                (line.strip() for line in result[1].splitlines()
                 if line.strip().startswith("Status:")),
                "UFW status unavailable",
            )
            managers.append(first)
    else:
        managers.append("UFW CLI not installed")

    if _systemd_active("firewalld.service"):
        managers.append("firewalld service active")
    else:
        managers.append("firewalld service inactive")

    managers.append(
        "nftables ruleset available"
        if snapshot else "nftables JSON inspection unavailable"
    )

    backend = (
        "nftables"
        if snapshot and any(snapshot[0].values())
        else "iptables compatibility interface"
    )

    return {
        "backend": backend,
        "managers": managers,
        "ipv4": families["ipv4"],
        "ipv6": families["ipv6"],
    }


def _fail2ban():
    active = _systemd_active("fail2ban.service")
    client = shutil.which("fail2ban-client")

    result_data = {
        "status": "unknown",
        "serviceActive": active,
        "jailCount": 0,
        "currentlyBanned": 0,
        "jails": [],
        "details": "Fail2ban state could not be inspected.",
    }

    if not active:
        result_data["status"] = "warning" if client else "unknown"
        result_data["details"] = (
            "Fail2ban service is not active."
            if client else "Fail2ban service/client is unavailable."
        )
        return result_data

    if not client:
        result_data["details"] = "Service is active, but fail2ban-client is missing."
        return result_data

    result = _run(["fail2ban-client", "status"], timeout=5)
    if not result or result[0] != 0:
        result_data["details"] = "Fail2ban is active but its status query failed."
        return result_data

    match = re.search(r"Jail list:\s*(.*)", result[1])
    names = [
        name.strip()
        for name in (match.group(1).split(",") if match else [])
        if name.strip()
    ]

    result_data["jailCount"] = len(names)

    for name in names[:50]:
        jail_result = _run(
            ["fail2ban-client", "status", name],
            timeout=4,
        )
        if not jail_result or jail_result[0] != 0:
            continue

        output = jail_result[1]

        def count(pattern):
            found = re.search(pattern, output, re.I)
            return int(found.group(1)) if found else 0

        banned = count(r"Currently banned:\s*(\d+)")
        failed = count(r"Currently failed:\s*(\d+)")
        total_banned = count(r"Total banned:\s*(\d+)")

        result_data["currentlyBanned"] += banned
        result_data["jails"].append({
            "name": name,
            "currentlyBanned": banned,
            "currentlyFailed": failed,
            "totalBanned": total_banned,
        })

    if names:
        result_data["status"] = "pass"
        result_data["details"] = f"Fail2ban active with {len(names)} jail(s)."
    else:
        result_data["status"] = "warning"
        result_data["details"] = "Fail2ban is active but no jails were reported."

    return result_data


def _ssh():
    executable = shutil.which("sshd") or (
        "/usr/sbin/sshd" if os.path.exists("/usr/sbin/sshd") else None
    )

    empty = {
        "available": False,
        "permitRootLogin": None,
        "passwordAuthentication": None,
        "pubkeyAuthentication": None,
        "permitEmptyPasswords": None,
        "maxAuthTries": None,
        "x11Forwarding": None,
        "details": "sshd effective configuration is unavailable.",
    }

    if not executable:
        return empty

    result = _run([executable, "-T"], timeout=5)
    if not result or result[0] != 0:
        return empty

    values = {}
    for line in result[1].splitlines():
        fields = line.split(None, 1)
        if len(fields) == 2:
            values[fields[0].lower()] = fields[1].strip().lower()

    try:
        max_tries = int(values.get("maxauthtries", ""))
    except ValueError:
        max_tries = None

    return {
        "available": True,
        "permitRootLogin": values.get("permitrootlogin"),
        "passwordAuthentication": _yes_no(values.get("passwordauthentication")),
        "pubkeyAuthentication": _yes_no(values.get("pubkeyauthentication")),
        "permitEmptyPasswords": _yes_no(values.get("permitemptypasswords")),
        "maxAuthTries": max_tries,
        "x11Forwarding": _yes_no(values.get("x11forwarding")),
        "details": "Values from sshd -T; Match-specific connection contexts are not evaluated.",
    }


def _agent_hardening():
    result = _run([
        "systemctl", "show", "scc-agent.service",
        "--property=User,NoNewPrivileges,PrivateTmp,ProtectHome",
    ], timeout=3)

    values = {}
    if result and result[0] == 0:
        for line in result[1].splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                values[key] = value.strip()

    def bool_value(key):
        return _yes_no(values.get(key))

    return {
        "apiReadOnly": True,
        "serviceUser": values.get("User") or "system default",
        "noNewPrivileges": bool_value("NoNewPrivileges"),
        "privateTmp": bool_value("PrivateTmp"),
        "protectHome": bool_value("ProtectHome"),
        "details": "The agent exposes fixed GET endpoints; POST requests are rejected.",
    }


def security_metrics():
    firewall = _firewall()
    fail2ban = _fail2ban()
    ssh = _ssh()
    agent = _agent_hardening()

    checks = []

    def add(check_id, label, status, value, details):
        checks.append({
            "id": check_id,
            "label": label,
            "status": status,
            "value": str(value),
            "details": str(details),
        })

    for family, label in (
        ("ipv4", "Host firewall IPv4 INPUT"),
        ("ipv6", "Host firewall IPv6 INPUT"),
    ):
        item = firewall[family]
        add(
            f"firewall_{family}",
            label,
            item["status"],
            item["defaultPolicy"],
            item["details"],
        )

    add(
        "fail2ban",
        "Fail2ban protection",
        fail2ban["status"],
        f'{fail2ban["jailCount"]} jail(s)',
        fail2ban["details"],
    )

    if not ssh["available"]:
        add("ssh_config", "SSH effective configuration", "unknown",
            "Unavailable", ssh["details"])
    else:
        root_mode = ssh["permitRootLogin"]
        root_password_blocked = root_mode in (
            "no", "prohibit-password", "without-password"
        )
        add(
            "ssh_root",
            "SSH root password login",
            "pass" if root_password_blocked else "warning",
            root_mode or "Unknown",
            "Root password login is disabled."
            if root_password_blocked
            else "Root login policy permits or may permit password access.",
        )

        password_auth = ssh["passwordAuthentication"]
        add(
            "ssh_password",
            "SSH password authentication",
            "warning" if password_auth is True else
            "pass" if password_auth is False else "unknown",
            "Enabled" if password_auth is True else
            "Disabled" if password_auth is False else "Unknown",
            "Password authentication is enabled."
            if password_auth is True else
            "Password authentication is disabled."
            if password_auth is False else
            "Could not determine password authentication.",
        )

        pubkey = ssh["pubkeyAuthentication"]
        add(
            "ssh_pubkey",
            "SSH public-key authentication",
            "pass" if pubkey is True else
            "warning" if pubkey is False else "unknown",
            "Enabled" if pubkey is True else
            "Disabled" if pubkey is False else "Unknown",
            "Public-key authentication is enabled."
            if pubkey is True else
            "Public-key authentication is disabled."
            if pubkey is False else
            "Could not determine public-key authentication.",
        )

        empty_passwords = ssh["permitEmptyPasswords"]
        add(
            "ssh_empty_passwords",
            "SSH empty passwords",
            "critical" if empty_passwords is True else
            "pass" if empty_passwords is False else "unknown",
            "Allowed" if empty_passwords is True else
            "Blocked" if empty_passwords is False else "Unknown",
            "Empty passwords are permitted."
            if empty_passwords is True else
            "Empty passwords are not permitted."
            if empty_passwords is False else
            "Could not determine empty-password policy.",
        )

    add(
        "agent_api",
        "SCC agent API",
        "info",
        "GET-only",
        agent["details"],
    )
    add(
        "agent_privilege",
        "SCC agent service account",
        "info",
        agent["serviceUser"],
        "The agent runs under this system account. Root execution is not equivalent to a sandbox.",
    )

    required = [
        item for item in checks
        if item["status"] != "info"
    ]

    if any(item["status"] == "critical" for item in required):
        overall = "critical"
    elif any(item["status"] == "warning" for item in required):
        overall = "warning"
    elif any(item["status"] == "unknown" for item in required):
        overall = "unknown"
    else:
        overall = "protected"

    if overall == "critical":
        summary = "Critical host security exposure detected. Review the highlighted checks."
    elif overall == "warning":
        summary = "Some security controls need attention."
    elif overall == "unknown":
        summary = "Security posture is incomplete because some checks are unavailable."
    else:
        summary = "All collected baseline security checks passed."

    return {
        "status": overall,
        "summary": summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "firewall": firewall,
        "fail2ban": fail2ban,
        "ssh": ssh,
        "agent": agent,
        "checks": checks,
    }
