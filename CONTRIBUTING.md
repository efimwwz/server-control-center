# Contributing to Server Control Center

Thanks for considering a contribution to SCC. Bug reports, documentation improvements, focused feature proposals and pull requests are welcome.

## Before opening an issue

- Check existing issues and pull requests for duplicates.
- Use the bug report or feature request template.
- For bugs, include exact reproduction steps, expected behaviour, actual behaviour and relevant redacted logs.
- State the SCC version, Ubuntu version and architecture (`amd64` or `arm64`).
- Never post passwords, tokens, API keys, public IPs that identify a private host, or unredacted server logs.

## Development environment

Requirements:
- Node.js 22;
- npm;
- Git.

```bash
git clone https://github.com/efimwwz/server-control-center.git
cd server-control-center
npm ci
npm run lint
npm run build
METRICS_PROVIDER=mock npm run dev
```

The `mock` provider uses synthetic data and does not require a running Linux host-agent. Do not use mock data to validate production monitoring behaviour.

## Pull request expectations

- Keep changes focused and explain the user-facing problem they solve.
- Update English and Russian documentation when behaviour, requirements or user-facing workflows change.
- Preserve the default loopback binding and the separation between the dashboard and privileged host-agent.
- Do not add remote administration commands or arbitrary command execution to the host-agent without a separate security design and review.
- Add or update automated tests for changed behaviour where practical.
- Run `npm ci`, `npm run lint` and `npm run build` before submitting.
- For changes to installers, Docker, systemd units or the host-agent, explain the impact on an existing Ubuntu host and how to recover.

## Supported platform policy

The public one-command installer currently supports Ubuntu Server 24.04 LTS on `amd64` and `arm64`. Changes that expand OS support must include installer adaptation and real CI or reproducible test coverage for every newly supported distribution. Do not simply remove the existing OS version check.

## Security-sensitive changes

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md). Do not create a public issue containing an exploit or sensitive operational data.
