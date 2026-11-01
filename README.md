# Server Control Center

**A clear, private-by-default view of your Linux server.**

[Read in Russian](README.ru.md) · [Installation and remote-access guide](INSTALL.md)

Server Control Center (SCC) is a self-hosted monitoring dashboard for Ubuntu servers. It brings system resources, Docker, Nginx, network information, services, logs and basic security checks together in one web interface.

## Who is it for?

- **Beginners:** understand the main health indicators of a server without starting with dozens of terminal commands.
- **Administrators:** inspect containers, services, network state, logs and basic security configuration.
- **Engineers:** use a Docker-based web application, a separate systemd host-agent, a local Unix socket and a CI-tested release process.

## What SCC shows

| Area | Information |
|---|---|
| System | CPU, RAM, disk, load average, uptime and network throughput |
| Docker | Containers, images, ports, CPU/RAM use and restart counts |
| Nginx | Service status, active connections, request counters and virtual hosts |
| Services | systemd service status, PID, memory and uptime |
| Network | Interfaces, gateway, DNS, public IPv4, latency and packet loss |
| Logs | Recent selected Nginx, Docker and systemd events |
| Security | Basic firewall, SSH, Fail2ban and SCC service checks |
| AI assistant | Optional analysis using Google Gemini |

## What SCC does not do

SCC is a monitoring dashboard, not a remote administration panel. It does not start, stop or remove containers; change firewall, SSH or Nginx settings; or automatically repair the server. It is not an antivirus or vulnerability scanner.

SCC has no built-in login screen. Protect remote access with an SSH tunnel or an authenticated HTTPS reverse proxy. Do not expose port <code>3000</code> directly to the internet.

## Installation

Target platform: **Ubuntu 24.04 LTS**, <code>amd64</code> or <code>arm64</code>, with systemd.

The installer can install Docker Engine if it is not present and no conflicting container runtime is detected. It downloads a prebuilt image from GitHub Container Registry; Node.js and npm are not required on the target server.

The one-command installer will become usable after the source repository, a GitHub Release and the corresponding GHCR image have been published publicly. Until then, the command is shown for reference only:

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
~~~

Read the complete guide before installing:

- [Installation, localhost, SSH tunnel, Nginx, Caddy, HTTPS and authentication](INSTALL.md)
- [Русская документация](README.ru.md)

## Security in brief

- The dashboard container runs as an unprivileged user.
- The Docker socket is not mounted into the dashboard container.
- A separate host-agent runs with root privileges to read host metrics and Docker information.
- The dashboard is published on <code>127.0.0.1:3000</code> only.
- Optional Gemini analysis sends the user's question, selected telemetry and part of recent logs to Google.

Review the security and data-handling section in the installation guide before enabling AI or exposing the dashboard through a domain.

## Development

Requirements: Node.js 22 and npm.

~~~bash
npm ci
npm run lint
npm run build
METRICS_PROVIDER=mock npm run dev
~~~

The <code>mock</code> provider uses synthetic demonstration data. A production installation uses the host-agent provider.

## Project information

- Source version: <code>1.1.1</code>
- License: [MIT](LICENSE)
- Release notes: [CHANGELOG.md](CHANGELOG.md)
- Russian documentation: [README.ru.md](README.ru.md)
- Installation guide: [INSTALL.md](INSTALL.md)

Contributions and bug reports are welcome. Never commit passwords, API keys, private IP addresses or server configuration files.
