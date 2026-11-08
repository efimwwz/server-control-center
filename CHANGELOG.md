# Changelog

## 1.1.3

- Make dashboard CPU, RAM and load-chart captions reflect the host's reported CPU and memory capacity.
- Detect the active default-route interface and measure aggregate network throughput only on that interface, avoiding duplicate Docker bridge/veth accounting.
- Show the detected default-route interface instead of the hardcoded `eth0 WAN` label.
- Replace misleading placeholder network location and DNS-provider claims with host-derived descriptions.
- Display an em dash for Nginx percentages when no requests have been recorded, and remove mock-looking fallback metrics from the live dashboard.
- Add host-agent unit tests for default-route selection and interface-specific traffic counters.

## 1.1.2

- Upgrade the web server from Express 4 to Express 5 and update the matching TypeScript definitions.
- Fix the Express 5-compatible SPA fallback route and add production smoke coverage for root and client-side routes.
- Make the installer wait until the host-agent Unix socket is ready before starting the dashboard container.
- Add clean Ubuntu 24.04 amd64 and arm64 CI coverage for published-release and PR-source install/uninstall flows.
- Improve the public project presentation, English and Russian README, installation guidance and contributor documentation.
- Add a genuine dashboard screenshot captured from the SCC frontend with synthetic mock telemetry; no private host metrics are included.

## 1.1.1

- Added a public one-command Ubuntu 24.04 installer.
- Switched VPS deployment to a prebuilt GHCR image; no Node.js build is required on the target server.
- Added GitHub Actions validation and release publishing workflows.
- Added MIT License and refreshed installation/security documentation.
- Removed the unsafe direct Docker socket example from Settings.
- Increased the general API request budget to support the 2-second dashboard refresh option.
- Added a separate AI request limit and bounded rate-limit client storage.
- Prevented overlapping dashboard refresh cycles.
- Removed wildcard CORS and added baseline HTTP security headers.
- Added opt-in trusted reverse-proxy handling.
- Added systemd-managed runtime directory for the host-agent.
- Improved uninstall cleanup for the host-agent socket directory.
- Removed the obsolete partial Linux provider; production defaults to the real host-agent and mock mode remains for development/demo.
- Replaced infrastructure-specific mock containers, hostnames, IP addresses and log examples with generic test data.
- Added an AI data-transfer notice and documented external network telemetry destinations.
- Split English and Russian documentation into separate files and expanded installation guides for localhost, SSH tunnels, Nginx, Caddy, HTTPS and reverse-proxy authentication.
