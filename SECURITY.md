# Security Policy

## Supported versions

Security fixes are applied to the latest supported release. The current documented installation target is Ubuntu Server 24.04 LTS on `amd64` and `arm64`.

Please include the SCC version, host OS version and deployment method when reporting a vulnerability. Do not include real credentials, API keys, private server logs or personal data.

## Reporting a vulnerability

**Please do not publish an exploitable vulnerability in a public issue.**

Use GitHub's private vulnerability reporting / Security Advisories for this repository when the feature is available. If private reporting is not enabled, contact the maintainer through the GitHub profile and ask for a private disclosure channel before sending technical details.

Include:
- affected SCC version and component;
- impact and realistic attack prerequisites;
- concise reproduction steps or a proof of concept;
- any suggested mitigation.

Please allow the maintainer reasonable time to investigate and prepare a fix before public disclosure.

## Security design notes

SCC is a read-only monitoring dashboard, not a remote administration panel. The web application does not mount the Docker socket. The host-agent runs with root privileges and exposes fixed read-only endpoints over a local Unix socket. The installer binds the dashboard to loopback.

There is no built-in user authentication. Remote access must be protected by an authenticated HTTPS reverse proxy or an SSH tunnel. Do not expose port `3000` directly to the internet.

Optional Gemini analysis sends the user's question, selected host telemetry and part of recent logs to Google. Review the installation guide before enabling it.
