# Server Control Center

Server Control Center (SCC) is a self-hosted web dashboard for monitoring an Ubuntu VPS. It collects system, Docker, Nginx, network, service, log and basic host-security telemetry through a separate local host agent.

## Features

- **Dashboard:** CPU, RAM, disk, load average, uptime and network throughput.
- **Docker:** running and stopped containers, resource usage, ports and restart counts.
- **Nginx:** service state, local `stub_status`, request counters and configured virtual hosts.
- **Services:** systemd service state, uptime, PID and memory.
- **Network:** interfaces, gateway, DNS, public IPv4, latency and packet loss.
- **Logs:** recent Nginx, Docker and systemd events, with basic redaction of common query-string secrets.
- **Security:** read-only baseline checks for IPv4/IPv6 INPUT policy, Fail2ban, SSH settings and host-agent service hardening.
- **AI assistant:** optional Google Gemini integration. When configured, the question and selected server telemetry/log context are sent to Google Gemini for analysis.

The Security view is a baseline inspection tool, not a vulnerability scanner or an automatic hardening system. SCC does not change firewall, SSH or Fail2ban configuration.

## Installation

Supported target: **Ubuntu 24.04 LTS**, systemd, `amd64` or `arm64`.

The installer:
1. Checks operating system, architecture, ports and existing SCC paths.
2. Installs Docker Engine from Docker's official Ubuntu apt repository if Docker is absent.
3. Downloads the latest GitHub Release archive and its SHA256 file.
4. Verifies the archive checksum before extracting it.
5. Installs the host agent as a systemd service.
6. Pulls the prebuilt SCC image from GitHub Container Registry.
7. Starts only the SCC Compose service and verifies application health.

After this repository and its container image are public, install with:

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
\`\`\`

To pin a version instead of installing the latest:

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo env SCC_VERSION=1.1.1 bash
\`\`\`

The installer refuses to overwrite existing SCC paths or a container with the SCC container name. If Docker is already installed but inactive, it stops and asks the administrator to start it manually; it does not restart an existing Docker daemon.

## Access

The panel listens on **127.0.0.1:3000 only**. It is not exposed directly to the public network.

Use an SSH tunnel from your workstation:

\`\`\`bash
ssh -N -L 3000:127.0.0.1:3000 USER@SERVER_IP
\`\`\`

Then open http://127.0.0.1:3000.

For permanent browser access, configure your own HTTPS reverse proxy and authentication. Do not expose port 3000 directly to the internet. Set `TRUST_PROXY=1` only when a trusted reverse proxy is the sole route to the app and the application remains bound to loopback.

If Nginx is already active during installation, SCC adds a separate localhost-only status endpoint on `127.0.0.1:8099`. Existing Nginx virtual hosts are not rewritten.

## Optional AI integration

Set `GEMINI_API_KEY` in `/opt/server-control-center/.env`, then recreate only the SCC container:

\`\`\`bash
cd /opt/server-control-center
docker compose up -d --no-deps --force-recreate server-control-center
\`\`\`

When this option is enabled, the AI assistant sends the user's question and selected telemetry/log context to Google Gemini. Review your data-handling requirements before configuring an API key.

## Architecture and security

- The web application runs in Docker and has no Docker socket mounted into it.
- The host agent runs as root because it reads host `/proc`, systemd, logs, Nginx and Docker telemetry.
- The agent exposes fixed GET-only endpoints over `/run/scc-agent/agent.sock`; POST requests are rejected. It does not expose an arbitrary shell or command API.
- The Docker CLI used by the host agent is highly privileged. A compromise of the host agent should be treated as a host-level security incident.
- The agent does not configure or modify firewall, SSH, Fail2ban or other services.
- The default web binding is localhost. The administrator is responsible for reverse-proxy authentication, TLS, network firewall policy and provider-level firewall settings.

## Useful commands

\`\`\`bash
# Application status
docker compose -f /opt/server-control-center/docker-compose.yml ps

# Application logs
docker compose -f /opt/server-control-center/docker-compose.yml logs --tail 100

# Host-agent status
systemctl status scc-agent.service

# Health endpoint
curl -fsS http://127.0.0.1:3000/api/health

# Security overview
curl -fsS http://127.0.0.1:3000/api/security
\`\`\`

## Uninstall

Run:

\`\`\`bash
sudo bash /opt/server-control-center/deploy/uninstall.sh
\`\`\`

The script asks for explicit confirmation and backs up the SCC application, agent, service unit and SCC Nginx status file. It stops/removes only the SCC container and host agent; it does not restart Docker or stop unrelated containers. Docker images are left on disk.

## Development

Requirements: Node.js 22 and npm.

\`\`\`bash
npm ci
cp .env.example .env
npm run lint
npm run build
npm run dev
\`\`\`

The default provider for local development is the mock provider. A production installation uses `METRICS_PROVIDER=agent`.

## Releases

Git tags use the format `vMAJOR.MINOR.PATCH`. The release workflow runs lint/build and Python/shell syntax checks, publishes a multi-architecture image to GHCR, creates a source archive from the tag and attaches the archive plus SHA256 file to the GitHub Release.

See [CHANGELOG.md](CHANGELOG.md) for release notes.
