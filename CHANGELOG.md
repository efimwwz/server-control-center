# Changelog

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
