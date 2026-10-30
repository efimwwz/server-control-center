# Server Control Center v1.1.0 — установка

Server Control Center — локальная панель мониторинга Ubuntu-сервера.
В релиз входят frontend, backend API и host-agent для чтения метрик
хоста через Unix-сокет.

## Возможности релиза

- Системные метрики, Docker, Nginx, systemd-службы и сеть.
- Просмотр логов и AI Assistant при настроенном Gemini API key.
- Security overview: политика INPUT firewall IPv4/IPv6, Fail2ban,
  параметры SSH и свойства systemd host-agent.
- Отображение Docker-сетей и связанных контейнеров.
- Автоматическое обновление метрик.

Security overview — базовая read-only оценка, а не полноценный
сканер уязвимостей. Проверки могут вернуть unknown, если соответствующая
система или команда отсутствует.

## Требования

- Ubuntu Linux (рекомендуется Ubuntu 24.04 LTS).
- Docker Engine и работающий Docker Compose plugin (`docker compose`).
- Python 3, systemd, `ss`, `tar`, `install`.
- Root или sudo.
- Доступ к Docker registry и npm registry во время сборки.
- Свободный локальный порт 3000.
- Пути `/opt/server-control-center`, `/opt/scc-agent`,
  `/etc/systemd/system/scc-agent.service` и `/run/scc-agent`
  не должны быть заняты существующей установкой.

Установщик не устанавливает Docker и намеренно отказывается
перезаписывать существующие установки.

## Установка

Проверьте SHA256 архива:

    sha256sum -c server-control-center-v1.1.0.tar.gz.sha256

Распакуйте архив:

    mkdir -p ~/server-control-center-release
    tar -xzf server-control-center-v1.1.0.tar.gz \
      -C ~/server-control-center-release

    cd ~/server-control-center-release/server-control-center-v1.1.0

Запустите установщик:

    sudo bash deploy/install.sh

Установщик проверяет предварительные условия, устанавливает host-agent
как systemd-службу, при активном Nginx может добавить отдельную
конфигурацию локальной статистики, собирает Docker-образ и проверяет API.

При неудаче он пытается откатить ресурсы, созданные этой установкой.
Существующие конфигурации Nginx не перезаписываются.

## Доступ к панели

Панель привязана только к `127.0.0.1:3000`; порт 3000 не публикуется
на внешние интерфейсы.

Для доступа с рабочего компьютера используйте SSH-туннель:

    ssh -N -L 3000:127.0.0.1:3000 USER@SERVER_IP

Откройте в браузере:

    http://127.0.0.1:3000

Для постоянного доступа через домен настройте собственный reverse proxy,
HTTPS и авторизацию. Не публикуйте порт 3000 напрямую в интернет.

## Проверка

    systemctl status scc-agent.service
    docker compose -f /opt/server-control-center/docker-compose.yml ps
    docker logs --tail 100 server-control-center

Проверка API:

    curl -fsS http://127.0.0.1:3000/api/health
    curl -fsS http://127.0.0.1:3000/api/security

## Host-agent и безопасность

- Host-agent работает от root, потому что читает системные метрики,
  сведения systemd, Docker, Nginx и доступные логи.
- Agent предоставляет фиксированные GET endpoints через Unix-сокет.
  POST-запросы отклоняются; произвольного shell API нет.
- Доступ к Docker daemon даёт агенту широкие возможности на хосте.
  Устанавливайте его только из доверенного источника.
- Host-agent не изменяет firewall, SSH, Fail2ban и системные службы.
- Firewall-оценка не заменяет проверку внешнего маршрутизатора,
  cloud firewall и фактической доступности портов.
- Сети Docker не скрываются по умолчанию. Локальные исключения можно
  задавать через `SCC_HIDDEN_DOCKER_NETWORKS` в systemd drop-in.
  Такие локальные исключения не входят в универсальный релиз.

## Удаление

Запустите от root:

    sudo bash /opt/server-control-center/deploy/uninstall.sh

Сценарий запросит подтверждение и создаст резервную копию.
Он останавливает только Server Control Center и его host-agent.
Посторонние контейнеры и Docker daemon не перезапускаются.
Docker-образы оставляются на месте.

Если у `scc-agent.service` есть systemd drop-ins, удаление остановится
и попросит проверить их вручную.

## Ограничения

- Релиз предназначен для новой установки.
- Установщик откажется работать поверх существующих путей SCC.
- Обновление существующей установки выполняется отдельной процедурой.
- Настройка внешнего reverse proxy и firewall остаётся ответственностью
  администратора сервера.
