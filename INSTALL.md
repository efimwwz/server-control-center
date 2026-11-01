# Installation guide

Server Control Center is a self-hosted monitoring dashboard for Ubuntu 24.04 LTS.

## One-command installation

After this repository and its GHCR image are made public:

```bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
```

To pin a version, set `SCC_VERSION` before running the script:

```bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo env SCC_VERSION=1.1.1 bash
```

The installer downloads the latest release archive and SHA256 checksum from GitHub, verifies the archive, installs Docker Engine if it is missing, installs the host agent, pulls the prebuilt image and checks the health endpoint.

Before using the one-command installer, publish at least one release and make the `ghcr.io/efimwwz/server-control-center` package Public in GitHub Package settings. The first GHCR package publication is private by default; repository visibility does not automatically make it public.

## Requirements

- Ubuntu 24.04 LTS with systemd.
- amd64 or arm64.
- Root privileges (the command above uses sudo).
- Outbound HTTPS access to GitHub, GitHub Container Registry and Docker's apt repository if Docker is not installed.
- TCP port 3000 free on localhost.
- SCC installation paths and container name not already in use.

If Docker is already installed but stopped, the installer stops rather than starting or restarting an existing daemon. Start it manually and run the installer again.

## Access

The app binds to `127.0.0.1:3000`. Use an SSH tunnel:

```bash
ssh -N -L 3000:127.0.0.1:3000 USER@SERVER_IP
```

Do not publish port 3000 directly. For permanent access, configure HTTPS and authentication in a reverse proxy.

## Operations

```bash
docker compose -f /opt/server-control-center/docker-compose.yml ps
docker compose -f /opt/server-control-center/docker-compose.yml logs --tail 100
systemctl status scc-agent.service
curl -fsS http://127.0.0.1:3000/api/health
```

## Optional Gemini integration

Edit `/opt/server-control-center/.env` and set `GEMINI_API_KEY`. Selected telemetry and logs, together with the prompt, are sent to Google Gemini when AI analysis is used. Logs may contain IP addresses, hostnames, URLs, request paths, service names or identifiers; only selected query-string secrets are masked. Review the data before enabling AI. The network collector uses api.ipify.org to resolve public IPv4 and pings 1.1.1.1 for latency/loss.

## Uninstall

```bash
sudo bash /opt/server-control-center/deploy/uninstall.sh
```

The uninstaller requires the exact confirmation phrase and creates a protected backup. It removes only SCC's container, agent, app directory and unchanged SCC Nginx status config. It leaves Docker Engine and images intact.
