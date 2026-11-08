# Public launch announcement drafts

Use these drafts only after the launch checklist's real-host validation and genuine UI screenshots are complete. Keep the exact supported OS and security limitations visible; do not imply SCC has built-in authentication or remote administration.

## Show HN draft (English)

**Title**

Show HN: Server Control Center – a self-hosted Ubuntu server monitoring dashboard

**Body**

Hi HN,

I built Server Control Center (SCC), a self-hosted dashboard for monitoring an Ubuntu server from one web interface.

It brings together CPU, memory, disk usage, Docker containers, Nginx statistics, network interfaces and connectivity, systemd services, selected logs and basic read-only security checks.

A few design choices:
- The web dashboard runs in an unprivileged container and does not mount the Docker socket.
- A separate host-agent reads host telemetry and exposes fixed read-only endpoints over a local Unix socket.
- The installer binds the dashboard to 127.0.0.1:3000 by default.
- There is no built-in login system: remote access requires an SSH tunnel or an authenticated HTTPS reverse proxy.
- Optional Gemini analysis sends the prompt, selected telemetry and part of recent logs to Google; the feature is optional.

The public one-command installer currently supports Ubuntu Server 24.04 LTS on amd64 and arm64. Other distributions are not currently supported by the installer.

You can preview the UI locally with synthetic mock data using Node.js 22, or install the release on a supported Ubuntu server after reviewing the security and installation guide.

Repository: https://github.com/efimwwz/server-control-center

I'm especially interested in feedback about the installation experience, host-agent boundaries and which metrics are most useful in a small self-hosted setup.

## Reddit / self-hosting draft (English)

**Title**

I built a self-hosted Ubuntu server dashboard for Docker, Nginx, network and system metrics

**Body**

I've been building Server Control Center (SCC), a small self-hosted dashboard that collects common Linux server information in one place: system resources, Docker, Nginx, network, systemd services, selected logs and basic read-only security checks.

The project is designed around a separate host-agent and an unprivileged dashboard container. The dashboard does not mount the Docker socket and binds to localhost by default.

A few limitations worth calling out up front:
- The one-command installer currently supports Ubuntu Server 24.04 LTS (amd64 / arm64) only.
- SCC monitors; it does not start/stop containers or change host configuration.
- There is no built-in authentication. Use an SSH tunnel or an authenticated HTTPS reverse proxy for remote access.
- Gemini analysis is optional and sends selected telemetry/log context to Google when enabled.

I'd appreciate feedback from people who run their own VPS or home servers, especially on install reliability and what should be improved before expanding OS support.

Repo: https://github.com/efimwwz/server-control-center

## Russian community announcement

**Заголовок**

Server Control Center — self-hosted панель мониторинга Ubuntu-сервера

**Текст**

Представляю Server Control Center (SCC) — проект с открытым исходным кодом для мониторинга Linux-сервера через веб-интерфейс.

В одной панели собраны показатели CPU, RAM, дисков, Docker, Nginx, сети, служб systemd, выбранные журналы и базовые проверки безопасности в режиме чтения.

Особенности архитектуры:
- Веб-контейнер работает без root и не получает Docker socket.
- Отдельный host-agent собирает показатели хоста через локальный Unix-сокет.
- Установщик привязывает панель к 127.0.0.1:3000.
- Для удалённого доступа необходим SSH-туннель или HTTPS reverse proxy с авторизацией.
- Встроенной авторизации и функций удалённого управления сервером нет.

Публичный установщик сейчас поддерживает Ubuntu Server 24.04 LTS для amd64 и arm64. Остальные дистрибутивы пока не поддерживаются.

Буду благодарен за тестирование установки, замечания и предложения по развитию.

GitHub: https://github.com/efimwwz/server-control-center

## Before posting

- Replace or supplement the text with genuine screenshots from the current release.
- Confirm the exact latest release tag and GHCR multi-platform availability.
- Run fresh-host installation tests on both supported architectures.
- Check each community's self-promotion rules and use the appropriate project feedback / Show HN format.
- Do not ask for stars as the primary call to action; ask for installation feedback and specific technical criticism.
