# 🚀 Server Control Center

Современная веб-панель для мониторинга сервера **Ubuntu 24.04 LTS VPS**, Docker-контейнеров, веб-сервера Nginx, системных служб и сетевого состояния со встроенным **AI-ассистентом на базе Google Gemini 3.8 Flash**.

---

## 📋 Особенности и возможности

* **📊 Главный Dashboard:**
  * Верхняя панель: Hostname, версия Ubuntu 24.04, версия ядра Linux, Uptime, живые часы и статус сервера (*Online / Warning / Critical*).
  * 6 основных карточек метрик: CPU usage (с температурой и ядрами), RAM usage, Disk usage (NVMe ext4), Load Average (1m, 5m, 15m), входящий трафик Network RX и исходящий трафик Network TX.
  * 4 интерактивных графика за последний час: CPU, RAM, Network RX/TX, Load Average.
* **🐳 Docker:**
  * Отдельная страница со списком всех контейнеров: `3x-ui`, `n8n`, `homeassistant`, `glances`.
  * Отображение имени, образа, статуса (*UP, STOPPED, RESTARTING, ERROR*), аптайма, потребления CPU и RAM, открытых портов.
  * Поиск, фильтрация по статусам, модальное окно инспекции контейнера.
* **🌐 Nginx:**
  * Статус службы, версия веб-сервера, активные соединения (*reading, writing, waiting*).
  * Общее число запросов, переданный трафик, счетчики кодов ответа **2xx**, **3xx**, **4xx**, **5xx**.
  * График интенсивности запросов за последний час и средняя задержка (latency ms).
  * Список настроенных виртуальных хостов и reverse-proxy (`n8n.myvps.cloud`, `vpn.myvps.cloud`, `home.myvps.cloud`, `glances.myvps.cloud`).
* **⚙️ Системные службы (Services):**
  * Мониторинг ключевых демонов: `nginx`, `docker`, `ssh`, `cron`, `fail2ban`, `systemd-resolved`.
  * Статус (*active / inactive / failed*), Uptime, PID процесса, потребление RAM.
* **🌍 Сеть (Network):**
  * Публичный IP-адрес (с быстрым копированием), шлюз по умолчанию (Gateway), DNS-серверы.
  * Сетевые интерфейсы (`eth0`, `docker0`, `lo`) со счетчиками пакетов, ошибок, MTU и MAC-адресами.
  * Измерение задержки (RTT / Ping) и процента потерь пакетов (Packet Loss).
* **📜 Логи (Logs):**
  * Просмотр последних событий из источников `nginx`, `docker` и `systemd` (journalctl).
  * Фильтрация по источнику, уровню важности (*info, warning, error*), полнотекстовый поиск.
  * Возможность паузы/возобновления живой ленты логов и копирования строки.
* **🤖 AI Assistant (Gemini 3.8 Flash):**
  * Интеллектуальный помощник системного администратора.
  * Быстрые вопросы:
    * *"Почему выросла загрузка CPU?"*
    * *"Какие контейнеры сейчас работают?"*
    * *"Есть ли проблемы с Nginx?"*
    * *"Какие ошибки произошли за последний час?"*
  * Полный контекст телеметрии автоматически передается серверной модели Gemini без утечки API-ключа в браузер.
* **🛡️ Безопасность:**
  * Фронтенд изолирован и **не имеет прямого доступа к shell** или eval.
  * Встроенный Rate Limiting (ограничение частоты запросов к API).
  * Санитизация и валидация входящих данных.
  * CORS-политики и разделение слоев на адаптеры данных.
* **⚙️ Настройки (Settings):**
  * Изменение отображаемого имени сервера.
  * Настройка интервала опроса API (2s, 5s, 10s, 30s).
  * Переключение тем оформления (*Dark Slate, Midnight OLED, Cyber Matrix*).

---

## 🏗️ Архитектура (Mock / Real Linux Provider)

Приложение спроектировано по принципу чистой архитектуры с интерфейсами:

```typescript
SystemMetricsProvider
DockerMetricsProvider
NginxMetricsProvider
ServicesMetricsProvider
NetworkMetricsProvider
LogsProvider
```

По умолчанию активен **`MockMetricsProvider`**, генерирующий реалистичную телеметрию Ubuntu 24.04 без прямого подключения к реальному VPS во время разработки.

### Переключение на реальный Ubuntu VPS (`LinuxSystemMetricsProvider`):

Без единого изменения во фронтенде:
1. В файле `.env` или `docker-compose.yml` установите:
   ```env
   METRICS_PROVIDER=linux
   ```
2. При запуске в Docker смонтируйте пути хоста:
   ```yaml
   volumes:
     - /proc:/proc:ro
     - /sys:/sys:ro
     - /etc/os-release:/etc/os-release:ro
     - /var/run/docker.sock:/var/run/docker.sock:ro
   ```

---

## 🔌 API Endpoints

Все эндпоинты возвращают структурированный JSON:

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/health` | Проверка жизнеспособности сервиса, версия и активный режим |
| `GET` | `/api/system` | CPU, RAM, Disk, Load Average, Hostname, Uptime, история |
| `GET` | `/api/docker` | Обзор и список контейнеров (3x-ui, n8n, homeassistant, glances) |
| `GET` | `/api/nginx` | Соединения, счетчики 2xx/4xx/5xx, трафик, vhosts |
| `GET` | `/api/network` | Внешний IP, шлюз, DNS, интерфейсы eth0/docker0/lo, ping |
| `GET` | `/api/services` | Статусы systemd служб (nginx, docker, ssh, cron, fail2ban) |
| `GET` | `/api/logs` | Журнал логов с фильтрами `?source=&level=&query=&limit=` |
| `POST` | `/api/ai/analyze` | Анализ состояния сервера моделью Gemini 3.8 Flash |

---

## 💻 Локальный запуск в режиме разработки (VS Code)

### Требования:
* Node.js 20+ или 22+
* npm

### Шаги:
1. Клонируйте проект и перейдите в директорию:
   ```bash
   git clone <repo-url>
   cd server-control-center
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Скопируйте файл конфигурации:
   ```bash
   cp .env.example .env
   ```
   *(При необходимости укажите `GEMINI_API_KEY` в `.env`)*
4. Запустите full-stack сервер разработки:
   ```bash
   npm run dev
   ```
5. Откройте в браузере: **`http://localhost:3000`**

---

## 🐳 Запуск через Docker & Docker Compose

Приложение полностью подготовлено для запуска одной командой:

```bash
docker compose up -d
```

Проверить статус работы контейнера:
```bash
docker compose ps
docker compose logs -f
```

Остановить контейнер:
```bash
docker compose down
```

---

## 📁 Структура проекта

```
.
├── server/
│   ├── types.ts                    # Общие TypeScript интерфейсы метрик и сервисов
│   ├── geminiService.ts            # Серверный модуль Gemini 3.8 Flash с fallback-диагностикой
│   ├── apiRoutes.ts                # REST API роутер, валидация и rate limiter
│   └── providers/
│       ├── metricsProvider.ts      # Абстрактные интерфейсы провайдеров
│       ├── mockMetricsProvider.ts  # Реалистичный эмулятор Ubuntu 24.04 VPS
│       └── linuxMetricsProvider.ts # Адаптер чтения /proc, systemctl и docker.sock
├── src/
│   ├── components/
│   │   ├── Header.tsx              # Верхняя панель хоста, uptime, статус и часы
│   │   ├── Sidebar.tsx             # Навигационное левое меню
│   │   ├── StatusBadge.tsx         # Цветовые бейджи UP/STOPPED/ERROR/ONLINE
│   │   └── Charts/
│   │       ├── AreaChart.tsx       # Интерактивные SVG графики с hover crosshair
│   │       └── MiniSparkline.tsx   # Компактные микро-графики для карточек
│   ├── views/
│   │   ├── DashboardView.tsx       # Сводка, 6 карточек и 4 часовых графика
│   │   ├── DockerView.tsx          # Таблица контейнеров и инспектор
│   │   ├── NginxView.tsx           # Статистика Nginx, статусы 2xx/4xx/5xx
│   │   ├── ServicesView.tsx        # Мониторинг служб systemd
│   │   ├── NetworkView.tsx         # Сетевые интерфейсы, IP, gateway, пинг
│   │   ├── LogsView.tsx            # Терминальный просмотрщик логов с поиском
│   │   ├── AiAssistantView.tsx     # Диалоговый AI-ассистент
│   │   └── SettingsView.tsx        # Настройки, интервалы и руководство перехода
│   ├── services/
│   │   └── api.ts                  # Клиентский типизированный API сервис
│   ├── types/
│   │   └── index.ts                # Фронтенд-типы данных
│   ├── App.tsx                     # Корневой компонент и автообновление
│   └── main.tsx                    # Точка входа React
├── server.ts                       # Входная точка Express + Vite middleware
├── Dockerfile                      # Многоэтапная сборка Docker
├── docker-compose.yml              # Готовый compose файл
├── .dockerignore                   # Исключения сборки контейнера
├── .env.example                    # Пример переменных окружения
└── README.md                       # Документация проекта
```

---

## 🔒 Заметки по безопасности

* Сервер никогда не раскрывает `GEMINI_API_KEY` в клиентский бандл.
* Прямой доступ к shell и возможность запуска произвольных bash-команд из браузера полностью отсутствуют.
* Все запросы к `/api/*` защищены механизмом ограничения частоты (Rate Limiter).
