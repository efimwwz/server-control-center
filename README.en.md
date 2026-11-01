# Server Control Center — English

[Русская версия](README.ru.md) · [Main page](README.md)

## What is Server Control Center?

Imagine that your server is a computer running in a data centre. You connect to it remotely. To understand whether everything is healthy, you would normally open a terminal and run a number of commands.

**Server Control Center (SCC) collects the main facts about your server in one web dashboard.** You can see CPU load, memory, disk usage, Docker containers, network information, services, logs and basic security checks in one place.

SCC is a **monitoring dashboard, not a remote-control panel**. It helps you observe the server and investigate issues. It does not restart containers, change network, firewall or SSH settings, or delete files.

### New to servers? Start here

- A **VPS** is a rented computer that runs in a data centre.
- A **Docker container** is an isolated environment in which an application runs.
- **Nginx** is software that receives web requests and forwards them to the right applications.
- A **system service** is a background program, such as SSH or Docker.
- A **log** is a record of events that happened on the system.
- The **host agent** is a small SCC service running on the server. It collects information and sends it to the dashboard through a local protected socket.

You do not need to know every term to use SCC. These definitions are here to make the dashboard easier to understand.

## What does SCC show?

| Section | What you can see |
|---|---|
| Server overview | CPU, RAM, disk, load average, uptime and network throughput |
| Docker | Running and stopped containers, images, ports, CPU/RAM usage and restart counts |
| Nginx | Nginx status, active connections, request counters and detected virtual hosts |
| Services | System service state, PID, memory and uptime |
| Network | Interfaces, addresses, gateway, DNS, public IPv4, latency and packet loss |
| Logs | Recent available Nginx, Docker and systemd log entries |
| Security | Basic information about firewall, SSH, Fail2ban and SCC service settings |
| AI assistant | Answers about collected metrics and selected log excerpts when Gemini integration is enabled |

Some information depends on the software installed on the server. For example, detailed Nginx statistics are useful when Nginx is installed and running.

## What SCC does not do

Please understand these limits before installing:

- SCC does not manage Docker containers: it does not start, stop or remove them.
- SCC does not change firewall rules, network settings, SSH, Fail2ban or Nginx configuration.
- SCC is not an antivirus, vulnerability scanner or automatic security-hardening tool.
- SCC does not replace backups or a full monitoring platform.
- SCC has no built-in user account or login screen. Do not expose it directly to the internet.

If you need a remote server-management tool, SCC should not yet be treated as a replacement for SSH or a full server administration panel.

## Installation

**Requirements**

- Ubuntu 24.04 LTS.
- <code>amd64</code> or <code>arm64</code> CPU architecture.
- <code>systemd</code> and the <code>apt</code> package manager.
- Administrator privileges (root or <code>sudo</code>).
- Local TCP port <code>3000</code> available.
- Access to GitHub and GitHub Container Registry (GHCR). If Docker is not installed, access to the official Docker package repository is also required.

You do not need to install Node.js or npm on the target server. The prebuilt application image is pulled from GHCR. SCC does not require n8n, the developer's server or any private infrastructure belonging to the project author.

### Quick one-command installation

Once the repository is public, a GitHub Release has been published and the GHCR package is available publicly, run:

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
~~~

To install a specific version:

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo env SCC_VERSION=1.1.1 bash
~~~

**Important at this stage:** the source is being prepared for publication, but the command above will not work until the repository and the required release image are publicly available. Do not run it on a production server until a release is announced as ready.

### Review the installer before running it

You can download the script, read it and then execute it with administrator privileges:

~~~bash
curl -fsSLo /tmp/scc-install.sh https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh
less /tmp/scc-install.sh
sudo bash /tmp/scc-install.sh
~~~

### What the installer does

1. Checks the Ubuntu version, CPU architecture, available port and existing SCC paths/container name.
2. Checks Docker. If Docker Engine is absent and no other installed container runtime is detected, it installs Docker from Docker's official repository.
3. If Docker is already installed but stopped, installation stops and asks the administrator to start it manually. The installer is not intended to restart an existing Docker daemon.
4. Downloads the GitHub Release archive and SHA256 file, then verifies the checksum.
5. Installs the host agent as the <code>scc-agent.service</code> system service.
6. Pulls the prebuilt SCC Docker image from GHCR and starts only the SCC container.
7. Checks the HTTP health endpoint and Docker healthcheck.

The installer refuses to overwrite existing SCC directories or a container named <code>server-control-center</code>. If it detects a conflicting system runtime, it stops instead of trying to remove or replace it.

If Nginx is already active during installation, SCC adds a separate local-only <code>127.0.0.1:8099</code> endpoint for <code>stub_status</code>. Existing Nginx virtual hosts are not rewritten.

## First launch and opening the dashboard

By default, the web dashboard listens only on <code>127.0.0.1:3000</code>. This means it can be reached from the server itself, but it is not directly exposed to the public internet.

The easiest way to open it from your own computer is an SSH tunnel:

~~~bash
ssh -N -L 3000:127.0.0.1:3000 USER@SERVER_IP
~~~

Replace <code>USER</code> and <code>SERVER_IP</code> with your server username and address. While the SSH tunnel is running, open:

<http://127.0.0.1:3000>

This command works on Linux, macOS and Windows when an SSH client is available.

### Need permanent access through a domain?

Configure your own HTTPS reverse proxy and put authentication in front of the dashboard (for example, Basic Auth or an identity-aware proxy). Do not expose port <code>3000</code> directly.

Set <code>TRUST_PROXY=1</code> only when a trusted reverse proxy is in front of the app and direct access that bypasses the proxy is blocked. The default is <code>TRUST_PROXY=0</code>.

## Security and privacy

SCC has two parts:

1. The **web dashboard** runs in Docker as an unprivileged user. The Docker socket is not mounted into the web container.
2. The **host agent** runs on the server as a system service with root privileges. It needs this access to read system metrics, service status, logs and Docker information.

The dashboard communicates with the agent through the Unix socket <code>/run/scc-agent/agent.sock</code>. The agent exposes a fixed set of GET endpoints and does not provide an API for arbitrary shell commands. However, the agent itself uses the Docker CLI and has high privileges. If an attacker compromises the agent, treat it as a server-level security incident.

The web panel is bound to localhost by default. SCC has no built-in authentication, so the administrator must protect remote access with an SSH tunnel or an authenticated reverse proxy.

### What data is collected and where it goes

- The agent reads system metrics, Docker container information, services, selected logs and Nginx data.
- To find the public IPv4 address, it contacts <code>api.ipify.org</code>. The result is cached for five minutes.
- To measure latency and packet loss, the agent sends ICMP requests to <code>1.1.1.1</code>.
- Without a Gemini API key, the AI assistant uses a local diagnostic fallback.
- If <code>GEMINI_API_KEY</code> is configured and a user submits a question to the AI assistant, the question, selected metrics and part of the recent logs are sent to Google Gemini for analysis.

**Logs may contain IP addresses, hostnames, URLs, request paths, service/container names and identifiers.** Redaction masks only selected common secrets in query parameters. It does not guarantee that all passwords, tokens or personal data are removed. Review the logs before enabling Gemini analysis, and never send secret information.

### Enable the AI assistant

1. Obtain a Google Gemini API key yourself.
2. Open <code>/opt/server-control-center/.env</code>.
3. Set the <code>GEMINI_API_KEY</code> value.
4. Recreate only the SCC container:

~~~bash
cd /opt/server-control-center
docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml up -d --no-deps --force-recreate server-control-center
~~~

Do not publish your API key, commit it to Git or include it in screenshots or public logs.

## Troubleshooting

| Situation | What to check |
|---|---|
| Installer says port 3000 is busy | Check which process is listening: <code>sudo ss -lntp</code> |
| Docker is installed but stopped | Check <code>sudo systemctl status docker</code>. Start Docker yourself, then run the installer again |
| Installer says SCC already exists | Do not delete directories blindly. Check <code>/opt/server-control-center</code>, <code>/opt/scc-agent</code> and the SCC container first |
| Dashboard opens but metrics do not load | Check <code>sudo systemctl status scc-agent</code> and <code>docker logs server-control-center</code> |
| Nginx statistics are missing | Confirm Nginx is installed and running and that <code>127.0.0.1:8099/nginx_status</code> responds |
| AI uses local diagnostics instead of Gemini | Check <code>GEMINI_API_KEY</code> in <code>.env</code>, recreate only the SCC container and inspect its logs |

Useful commands:

~~~bash
# SCC container status
docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml ps

# Last 100 application log lines
docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml logs --tail 100

# Host-agent status
sudo systemctl status scc-agent.service

# Application API health
curl -fsS http://127.0.0.1:3000/api/health

# Basic security overview
curl -fsS http://127.0.0.1:3000/api/security
~~~

## Uninstall SCC

Run:

~~~bash
sudo bash /opt/server-control-center/deploy/uninstall.sh
~~~

The script asks you to enter the exact phrase <code>REMOVE SERVER CONTROL CENTER</code>. Before removal, it creates a protected archive under <code>/var/backups/server-control-center</code>.

It removes the SCC container and files, the host agent and its systemd unit. The unchanged Nginx status file created by SCC is also removed. If you modified that file yourself, the script keeps it. Docker Engine and Docker images remain on the server; unrelated containers are not stopped.

## For developers and engineers

Local development requirements: Node.js 22 and npm.

Install dependencies and run checks:

~~~bash
npm ci
npm run lint
npm run build
~~~

Start locally with demonstration data:

~~~bash
METRICS_PROVIDER=mock npm run dev
~~~

In PowerShell:

~~~powershell
$env:METRICS_PROVIDER = "mock"
npm run dev
~~~

The <code>mock</code> provider uses synthetic sample data, not measurements from a real server. A production installation uses <code>METRICS_PROVIDER=agent</code>.

GitHub Actions checks dependencies with <code>npm audit</code>, TypeScript, frontend and Docker image builds, production container startup, core API routes, host-agent Unix socket access, shell/Python syntax and Compose configuration.

## License and contributing

The project is distributed under the [MIT License](LICENSE). You may study, modify and redistribute the code under that license. Third-party dependencies remain under their respective licenses.

Suggestions, bug reports and pull requests are welcome. Do not add passwords, API keys, private addresses or server configuration files to the repository.
