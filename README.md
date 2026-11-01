# Server Control Center

**A clear view of your Linux server. One dashboard, real host data, no hidden cloud dependency.**

[Русский](#русский) · [English](#english)

Current source version: <code>1.1.1</code> · License: [MIT](LICENSE) · Platform: Ubuntu 24.04 LTS

---

# Русский

## Что это такое — простыми словами

Представьте, что ваш сервер — это компьютер, который работает в дата-центре, а вы подключаетесь к нему удалённо. Обычно, чтобы понять, всё ли в порядке, приходится открывать терминал и вводить много команд.

**Server Control Center (SCC) собирает основные сведения о сервере в одной веб-панели.** Вы открываете страницу и видите загрузку процессора, память, диск, Docker-контейнеры, сеть, службы, журналы и базовые проверки безопасности.

SCC — это **панель наблюдения, а не пульт управления**. Она показывает состояние и помогает разобраться в проблемах, но сама не перезапускает контейнеры, не меняет настройки сети, firewall или SSH и не удаляет файлы.

### Если вы впервые работаете с сервером

- **VPS** — арендованный компьютер, который постоянно работает в дата-центре.
- **Docker-контейнер** — отдельная среда, в которой запущено приложение.
- **Nginx** — программа, которая принимает веб-запросы и направляет их нужным приложениям.
- **Системная служба** — фоновая программа, например SSH или Docker.
- **Лог (журнал)** — записи о том, что происходило в системе.
- **Host-agent** — небольшая служба SCC на самом сервере. Она собирает показатели и передаёт их панели через локальный защищённый сокет.

Вам не нужно знать все эти термины, чтобы начать пользоваться панелью. Они объяснены здесь для удобства.

## Что показывает SCC

| Раздел | Что вы увидите |
|---|---|
| Обзор сервера | Процессор (CPU), оперативную память (RAM), диск, среднюю нагрузку, время работы и сетевой трафик |
| Docker | Запущенные и остановленные контейнеры, образы, порты, потребление CPU/RAM и число перезапусков |
| Nginx | Состояние Nginx, активные подключения, счётчики запросов и найденные виртуальные хосты |
| Службы | Состояние системных служб, PID, память и время работы |
| Сеть | Интерфейсы, адреса, шлюз, DNS, внешний IPv4, задержку и потери пакетов |
| Логи | Последние доступные записи Nginx, Docker и systemd |
| Безопасность | Базовые сведения о firewall, SSH, Fail2ban и настройках службы SCC |
| AI-помощник | Ответы на вопросы о собранных показателях и выбранных фрагментах журналов — при включённой интеграции Gemini |

Некоторые показатели зависят от установленного программного обеспечения. Например, подробная статистика Nginx имеет смысл, когда Nginx установлен и работает.

## Чего SCC не делает

Это важно понимать до установки:

- SCC не управляет Docker-контейнерами: не запускает, не останавливает и не удаляет их.
- SCC не меняет firewall, правила сети, SSH, Fail2ban и конфигурации Nginx.
- SCC не является антивирусом, сканером уязвимостей или автоматической системой защиты.
- SCC не заменяет резервное копирование и полноценную систему мониторинга.
- В панели нет встроенной учётной записи и формы входа. Поэтому её нельзя напрямую публиковать в интернете.

Если вам нужна именно система удалённого управления сервером, SCC пока не следует рассматривать как замену SSH или полноценной панели администрирования.

## Установка

**Требования**

- Ubuntu 24.04 LTS.
- Архитектура процессора <code>amd64</code> или <code>arm64</code>.
- <code>systemd</code> и пакетный менеджер <code>apt</code>.
- Права администратора (root или <code>sudo</code>).
- Свободный локальный TCP-порт <code>3000</code>.
- Доступ к GitHub и GitHub Container Registry (GHCR). Если Docker ещё не установлен, также потребуется доступ к официальному репозиторию Docker.

Node.js и npm на сервере устанавливать не нужно. Готовый образ приложения скачивается из GHCR. Для установки не нужны n8n, личный сервер разработчика или какая-либо частная инфраструктура автора проекта.

### Быстрая установка одной командой

Когда репозиторий станет публичным, будет опубликован GitHub Release, а пакет GHCR будет открыт для скачивания, установка будет выглядеть так:

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
~~~

Установка конкретной версии:

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo env SCC_VERSION=1.1.1 bash
~~~

**Важно на текущем этапе:** исходники готовятся к публикации, но команда выше не заработает, пока репозиторий и образ нужного релиза не станут доступны публично. Не запускайте её на рабочем сервере до объявления готового релиза.

### Установка с предварительной проверкой скрипта

Перед запуском от root можно скачать установщик, прочитать его и только потом выполнить:

~~~bash
curl -fsSLo /tmp/scc-install.sh https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh
less /tmp/scc-install.sh
sudo bash /tmp/scc-install.sh
~~~

### Что установщик делает автоматически

1. Проверяет версию Ubuntu, архитектуру, свободный порт и отсутствие конфликтующих путей/контейнера SCC.
2. Проверяет Docker. Если Docker Engine отсутствует и не найден другой установленный runtime, устанавливает Docker из официального репозитория Docker.
3. Если Docker уже установлен, но остановлен, прекращает установку и просит администратора запустить его вручную. Установщик не должен перезапускать существующий Docker daemon.
4. Скачивает архив релиза и файл SHA256 с GitHub, проверяет контрольную сумму.
5. Устанавливает host-agent как системную службу <code>scc-agent.service</code>.
6. Загружает готовый Docker-образ SCC из GHCR и запускает только контейнер SCC.
7. Проверяет HTTP health endpoint и состояние Docker healthcheck.

Установщик отказывается перезаписывать уже существующие каталоги SCC и контейнер с именем <code>server-control-center</code>. При обнаружении конфликтующего системного runtime он останавливается, а не пытается удалить или заменить его.

Если во время установки активен Nginx, SCC добавляет отдельный локальный endpoint <code>127.0.0.1:8099</code> для <code>stub_status</code>. Существующие виртуальные хосты Nginx не переписываются.

## Первый запуск и доступ к панели

По умолчанию панель слушает только <code>127.0.0.1:3000</code> — то есть доступна с самого сервера, но не открыта напрямую для всего интернета.

Самый простой способ открыть её с личного компьютера — SSH-туннель:

~~~bash
ssh -N -L 3000:127.0.0.1:3000 USER@SERVER_IP
~~~

Замените <code>USER</code> и <code>SERVER_IP</code> на имя пользователя и адрес своего сервера. Пока SSH-туннель работает, откройте в браузере:

<http://127.0.0.1:3000>

Команда подходит для Linux, macOS и Windows, если доступен SSH-клиент.

### Нужен постоянный доступ через домен?

Настройте собственный HTTPS reverse proxy и обязательно включите перед панелью аутентификацию (например, Basic Auth или identity-aware proxy). Не публикуйте порт <code>3000</code> напрямую.

Параметр <code>TRUST_PROXY=1</code> включайте только тогда, когда перед приложением стоит доверенный reverse proxy и к приложению нельзя обратиться в обход него. По умолчанию установлено <code>TRUST_PROXY=0</code>.

## Безопасность и приватность

SCC состоит из двух частей:

1. **Веб-панель** работает в Docker от непривилегированного пользователя. Docker socket внутрь веб-контейнера не монтируется.
2. **Host-agent** работает на сервере как системная служба с правами root. Это необходимо, чтобы читать системные показатели, состояние служб, журналы и данные Docker.

Панель обращается к агенту через Unix-сокет <code>/run/scc-agent/agent.sock</code>. Агент предоставляет фиксированный набор GET-endpoint'ов и не предоставляет API для выполнения произвольных shell-команд. Но сам агент использует Docker CLI и обладает высокими привилегиями. Если злоумышленник получит контроль над агентом, это следует считать инцидентом уровня всего сервера.

Порт веб-панели по умолчанию привязан к localhost. При этом встроенной авторизации в SCC нет: безопасность удалённого доступа обеспечивает администратор через SSH-туннель или защищённый reverse proxy.

### Какие данные собираются и куда они отправляются

- Агент читает системные метрики, сведения о Docker-контейнерах, службы, выбранные журналы и данные Nginx.
- Для определения внешнего IPv4 он обращается к <code>api.ipify.org</code>. Результат кэшируется на пять минут.
- Для проверки задержки и потерь пакетов агент отправляет ICMP-запросы на <code>1.1.1.1</code>.
- Без API-ключа Gemini AI-помощник использует локальный диагностический fallback.
- Если задан <code>GEMINI_API_KEY</code> и пользователь отправляет вопрос AI-помощнику, вопрос, выбранные метрики и часть последних логов передаются Google Gemini для анализа.

**В логах могут встречаться IP-адреса, имена хостов, URL, пути запросов, имена служб/контейнеров и идентификаторы.** Маскирование скрывает только некоторые распространённые секреты в query-параметрах. Оно не гарантирует удаление всех паролей, токенов и персональных данных. Перед включением Gemini проверьте, какие журналы попадают на анализ, и не отправляйте секретную информацию.

### Включение AI-помощника

1. Получите API-ключ Google Gemini самостоятельно.
2. Откройте файл <code>/opt/server-control-center/.env</code>.
3. Укажите ключ в параметре <code>GEMINI_API_KEY</code>.
4. Пересоздайте только контейнер SCC:

~~~bash
cd /opt/server-control-center
docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml up -d --no-deps --force-recreate server-control-center
~~~

Не публикуйте свой API-ключ, не добавляйте его в Git и не вставляйте в скриншоты или общедоступные логи.

## Если что-то пошло не так

| Ситуация | Что проверить |
|---|---|
| Установка сообщает, что порт 3000 занят | Проверьте, какая программа слушает этот порт: <code>sudo ss -lntp</code> |
| Docker установлен, но остановлен | Проверьте <code>sudo systemctl status docker</code>. Запустите Docker самостоятельно, затем повторите установку |
| Установщик сообщает, что SCC уже существует | Не удаляйте каталоги вслепую. Сначала проверьте <code>/opt/server-control-center</code>, <code>/opt/scc-agent</code> и контейнер SCC |
| Панель открывается, но показатели не загружаются | Проверьте <code>sudo systemctl status scc-agent</code> и <code>docker logs server-control-center</code> |
| Не отображается статистика Nginx | Убедитесь, что Nginx установлен и работает, а локальный endpoint <code>127.0.0.1:8099/nginx_status</code> отвечает |
| AI отвечает локальной диагностикой, а не Gemini | Проверьте <code>GEMINI_API_KEY</code> в файле <code>.env</code>, пересоздайте только контейнер SCC и посмотрите его логи |

Полезные команды:

~~~bash
# Состояние контейнера SCC
docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml ps

# Последние 100 строк логов приложения
docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml logs --tail 100

# Состояние host-agent
sudo systemctl status scc-agent.service

# Проверка API приложения
curl -fsS http://127.0.0.1:3000/api/health

# Проверка базовой сводки безопасности
curl -fsS http://127.0.0.1:3000/api/security
~~~

## Удаление SCC

Выполните:

~~~bash
sudo bash /opt/server-control-center/deploy/uninstall.sh
~~~

Скрипт попросит ввести точную фразу <code>REMOVE SERVER CONTROL CENTER</code>. Перед удалением он создаёт защищённый архив в <code>/var/backups/server-control-center</code>.

Удаляются контейнер и файлы SCC, host-agent и его systemd unit. Неизменённый файл Nginx, созданный SCC, тоже удаляется. Если вы самостоятельно меняли этот файл, скрипт сохранит его. Docker Engine и Docker-образы остаются на сервере; посторонние контейнеры не останавливаются.

## Для разработчиков и инженеров

Требования для локальной разработки: Node.js 22 и npm.

Установка зависимостей и проверка:

~~~bash
npm ci
npm run lint
npm run build
~~~

Локальный запуск с демонстрационными данными:

~~~bash
METRICS_PROVIDER=mock npm run dev
~~~

В PowerShell:

~~~powershell
$env:METRICS_PROVIDER = "mock"
npm run dev
~~~

В режиме <code>mock</code> используются синтетические примеры, а не показатели реального сервера. Production-установка работает с <code>METRICS_PROVIDER=agent</code>.

GitHub Actions проверяет зависимости через <code>npm audit</code>, TypeScript, сборку frontend и Docker-образа, запуск production-контейнера, основные API-маршруты, доступ к Unix-сокету агента, синтаксис shell/Python и конфигурацию Compose.

## Лицензия и участие в проекте

Проект распространяется по лицензии [MIT](LICENSE). Вы можете изучать, изменять и распространять код на условиях этой лицензии. Сторонние зависимости продолжают распространяться по собственным лицензиям.

Идеи, сообщения об ошибках и pull request'ы приветствуются. Перед отправкой не добавляйте в репозиторий пароли, API-ключи, приватные адреса и конфигурации своих серверов.

---

# English

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
