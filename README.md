# Server Control Center

**A clear view of your Linux server. One dashboard, real host data.**

[English documentation](README.en.md) · [Документация на русском](README.ru.md)

Source version: **1.1.1** · License: [MIT](LICENSE) · Target platform: Ubuntu 24.04 LTS

---

## What is SCC? / Что такое SCC?

**English:** Server Control Center (SCC) is a self-hosted dashboard that helps you understand what is happening on your Linux server. It brings CPU, memory, disk, Docker, Nginx, network, services, logs and basic security information together in one place.

SCC is a **monitoring tool, not a remote-control panel**. It reads and displays information. It does not manage containers, change firewall or SSH settings, or automatically repair your server.

**Русский:** Server Control Center (SCC) — это собственная веб-панель для наблюдения за Linux-сервером. Она собирает в одном месте показатели процессора, памяти, диска, Docker, Nginx, сети, служб, журналов и базовые сведения о безопасности.

SCC — это **инструмент мониторинга, а не пульт управления сервером**. Он показывает информацию, но не управляет контейнерами, не меняет firewall или SSH и не исправляет сервер автоматически.

## Who is it for? / Для кого этот проект?

- **Beginners / Новичкам:** see the main server indicators without learning dozens of terminal commands first.
- **Administrators / Администраторам:** inspect containers, services, logs, networking and basic security posture in one dashboard.
- **Engineers / Инженерам:** use a Docker-based web app, a separate systemd host-agent, a Unix socket, API endpoints and GitHub Actions CI.

## At a glance / Кратко

| English | Русский |
|---|---|
| Self-hosted; your dashboard runs on your server | Самостоятельная установка; панель работает на вашем сервере |
| Ubuntu 24.04 LTS, amd64 or arm64 | Ubuntu 24.04 LTS, amd64 или arm64 |
| Web panel bound to localhost by default | Веб-панель по умолчанию доступна только через localhost |
| Host agent reads host metrics; web container has no Docker socket | Агент читает показатели хоста; веб-контейнер не получает Docker socket |
| Optional Gemini AI; telemetry/log context is sent to Google when used | Необязательный Gemini AI; при использовании данные и фрагменты логов отправляются Google |
| MIT License | Лицензия MIT |

## Installation status / Статус установки

**The source repository is being prepared for public release.** The one-command installer requires a published GitHub Release and a public GHCR image. Until both are available, the installation command below is a preview and will not complete successfully.

**Исходный код готовится к публичному выпуску.** Для работы установщика нужны опубликованный GitHub Release и доступный для скачивания образ GHCR. Пока они не опубликованы, команда ниже является примером и не завершит установку.

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
~~~

Before using SCC on a real server, read the installation and security sections in the language guide:

- [English guide: installation, access, privacy, troubleshooting and development](README.en.md)
- [Русское руководство: установка, доступ, приватность, устранение неполадок и разработка](README.ru.md)

## Security note / Важно о безопасности

SCC has no built-in login screen. Do not expose port 3000 directly to the internet. Use an SSH tunnel or an authenticated HTTPS reverse proxy. The host-agent runs with root privileges and uses the Docker CLI; protect the server and review the security documentation before installation.

В SCC нет встроенной страницы входа. Не открывайте порт 3000 напрямую в интернет. Используйте SSH-туннель или HTTPS reverse proxy с аутентификацией. Host-agent работает с правами root и использует Docker CLI; защитите сервер и прочитайте раздел безопасности до установки.

## Links / Ссылки

- [Русский README](README.ru.md)
- [English README](README.en.md)
- [Installation guide / Руководство по установке](INSTALL.md)
- [Changelog / История изменений](CHANGELOG.md)
- [MIT License](LICENSE)
