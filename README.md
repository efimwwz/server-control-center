# Server Control Center

**A clear, private-by-default view of your Linux server.**

[English](#server-control-center) · [Русский](#русский) · [Installation guide](INSTALL.md)

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

## Supported operating systems

The public one-command installer officially supports **Ubuntu 24.04 LTS only (the Server edition is recommended)**, on `amd64` and `arm64`.

| Operating system | Current status |
|---|---|
| Ubuntu 24.04 LTS (Server edition recommended) | Supported |
| Ubuntu 22.04 / 26.04 and other Ubuntu releases | Not currently supported or tested |
| Debian 12 / 13 | Not currently supported; installer adaptation is required |
| Linux Mint, Pop!_OS and other Ubuntu/Debian derivatives | Not officially supported or tested |
| Fedora, Rocky Linux, AlmaLinux, RHEL, openSUSE, Alpine | Not supported by the current installer |

This restriction is intentional. The installer checks for Ubuntu 24.04, uses `apt`, Ubuntu/Docker repository configuration and Ubuntu-specific service/configuration paths. The host-agent also expects systemd and host tools such as Docker CLI, `iproute2`, `ping`, `journalctl` and Nginx tools where applicable.

The web application is containerized, but the host-agent must run on the host operating system to read real host metrics. Running the dashboard container alone on another distribution is not a complete SCC installation.

Other distributions may be supportable with dedicated installer work and real CI tests on each target. Do not bypass the version check or run the internal installer on an unsupported OS and assume it is safe.

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
- [Russian documentation](README.ru.md)

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

---

# Русский

**Понятная панель мониторинга Linux-сервера. По умолчанию доступ закрыт от прямого подключения из интернета.**

[English](#server-control-center) · [К началу русского раздела](#русский) · [Руководство по установке](INSTALL.ru.md)

Server Control Center (SCC) — самостоятельно устанавливаемая веб-панель для Ubuntu. Она собирает в одном месте показатели системы, Docker, Nginx, сети, служб, журналов и базовые сведения о безопасности.

## Для кого предназначен проект?

- **Для начинающих:** помогает понять основные показатели сервера без необходимости сразу изучать десятки команд терминала.
- **Для системных администраторов:** позволяет просматривать контейнеры, службы, состояние сети, журналы и базовые параметры безопасности.
- **Для инженеров:** предоставляет веб-приложение в Docker, отдельную службу host-agent под systemd, локальный Unix-сокет и проверку сборок через CI.

## Что показывает SCC

| Раздел | Информация |
|---|---|
| Система | Процессор, оперативная память, диск, средняя нагрузка, время работы и сетевой трафик |
| Docker | Контейнеры, образы, порты, потребление CPU/RAM и число перезапусков |
| Nginx | Состояние службы, активные соединения, счётчики запросов и виртуальные хосты |
| Службы | Состояние служб systemd, PID, память и время работы |
| Сеть | Интерфейсы, шлюз, DNS, внешний IPv4, задержка и потери пакетов |
| Журналы | Последние выбранные события Nginx, Docker и systemd |
| Безопасность | Базовые проверки firewall, SSH, Fail2ban и службы SCC |
| AI-помощник | Необязательный анализ через Google Gemini |

## Поддерживаемые операционные системы

Публичный установщик одной командой официально поддерживает **только Ubuntu Server 24.04 LTS**, архитектуры `amd64` и `arm64`.

| Операционная система | Текущий статус |
|---|---|
| Ubuntu Server 24.04 LTS | Поддерживается |
| Ubuntu 22.04 / 26.04 и другие версии Ubuntu | Пока не поддерживаются и не тестируются |
| Debian 12 / 13 | Пока не поддерживается; установщик нужно адаптировать |
| Linux Mint, Pop!_OS и другие производные Ubuntu/Debian | Официально не поддерживаются и не тестируются |
| Fedora, Rocky Linux, AlmaLinux, RHEL, openSUSE, Alpine | Текущим установщиком не поддерживаются |

Ограничение сделано намеренно: установщик проверяет именно Ubuntu 24.04, использует `apt`, настройки репозитория Ubuntu/Docker и характерные для Ubuntu пути конфигурации и служб. Host-agent также рассчитывает на systemd и системные утилиты, например Docker CLI, `iproute2`, `ping`, `journalctl` и инструменты Nginx, если он установлен.

Веб-приложение работает в контейнере, но host-agent должен работать непосредственно в основной операционной системе, чтобы получать настоящие показатели сервера. Один контейнер панели на другом дистрибутиве ещё не является полноценной установкой SCC.

Поддержку других дистрибутивов можно добавить отдельной работой над установщиками и настоящими CI-тестами для каждой системы. Не обходите проверку версии и не запускайте внутренний установщик на неподдерживаемой ОС, считая это безопасным.

## Чего SCC не делает

SCC — это панель наблюдения, а не полноценная система удалённого администрирования. Она не запускает, не останавливает и не удаляет контейнеры; не меняет правила firewall, настройки SSH или Nginx; не исправляет сервер автоматически. Это не антивирус и не сканер уязвимостей.

В SCC нет собственной страницы входа. Для удалённого доступа используйте SSH-туннель или обратный HTTPS-прокси с авторизацией. Не открывайте порт 3000 напрямую в интернет.

## Установка

Целевая платформа: **Ubuntu 24.04 LTS**, архитектура amd64 или arm64, система systemd.

Установщик может установить Docker Engine, если он отсутствует и не обнаружены конфликтующие компоненты другого контейнерного окружения. Образ приложения скачивается из GitHub Container Registry. Устанавливать Node.js и npm на целевой сервер не требуется.

Установка одной командой станет доступна после публичной публикации исходного репозитория, GitHub Release и соответствующего образа GHCR. До этого команда приведена только для ознакомления:

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
~~~

Перед установкой прочитайте подробное руководство:

- [Подробная инструкция на русском: localhost, SSH-туннель, Nginx, Caddy, HTTPS и авторизация](INSTALL.ru.md)
- [Руководство по установке на английском](INSTALL.md)

## Безопасность — кратко

- Веб-приложение работает в Docker от непривилегированного пользователя.
- Docker socket не монтируется внутрь веб-контейнера.
- Отдельный host-agent работает с правами root, чтобы читать системные показатели и данные Docker.
- Веб-панель публикуется только на 127.0.0.1:3000.
- При использовании Gemini вопрос пользователя, выбранные показатели и часть последних журналов отправляются Google.

До включения AI или публикации панели через домен прочитайте разделы о безопасности и передаче данных в руководстве по установке.

## Разработка

Требования: Node.js 22 и npm.

~~~bash
npm ci
npm run lint
npm run build
METRICS_PROVIDER=mock npm run dev
~~~

Режим mock использует искусственные демонстрационные данные. В production-установке используется host-agent.

## Информация о проекте

- Версия исходников: 1.1.1
- Лицензия: [MIT](LICENSE)
- История изменений: [CHANGELOG.md](CHANGELOG.md)
- Английская документация: [README.md](README.md)
- Руководство по установке на русском: [INSTALL.ru.md](INSTALL.ru.md)

Предложения, сообщения об ошибках и pull request приветствуются. Не добавляйте в репозиторий пароли, API-ключи, приватные IP-адреса или конфигурации серверов.
