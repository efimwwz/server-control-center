#!/usr/bin/env bash
set -Eeuo pipefail

SRC="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${SCC_VERSION:-1.1.3}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "Invalid SCC_VERSION: $VERSION"
  exit 1
}
APP=/opt/server-control-center
AGENT=/opt/scc-agent
UNIT=/etc/systemd/system/scc-agent.service
SOCKET_DIR=/run/scc-agent
NGINX_CONF=/etc/nginx/conf.d/scc-nginx-status.conf
NGINX_CONF_CREATED=0
NGINX_ACTIVE=0
APP_CREATED=0
AGENT_CREATED=0
UNIT_CREATED=0
SOCKET_DIR_CREATED=0
AGENT_STARTED=0
COMPOSE_TOUCHED=0
COMPLETE=0

rollback() {
  local rc=$?
  trap - EXIT
  if [[ $rc -ne 0 && $COMPLETE -eq 0 ]]; then
    set +e
    if [[ $NGINX_CONF_CREATED -eq 1 ]]; then
      rm -f "$NGINX_CONF"
      if command -v nginx >/dev/null 2>&1 && nginx -t >/dev/null 2>&1; then
        systemctl reload nginx
      fi
    fi
    if [[ $COMPOSE_TOUCHED -eq 1 && -f "$APP/docker-compose.yml" ]]; then
      docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" down
    fi
    if [[ $AGENT_STARTED -eq 1 ]]; then
      systemctl disable --now scc-agent.service
    fi
    if [[ $UNIT_CREATED -eq 1 ]]; then
      rm -f "$UNIT"
      systemctl daemon-reload
    fi
    if [[ $SOCKET_DIR_CREATED -eq 1 ]]; then rm -rf "$SOCKET_DIR"; fi
    if [[ $AGENT_CREATED -eq 1 ]]; then rm -rf "$AGENT"; fi
    if [[ $APP_CREATED -eq 1 ]]; then rm -rf "$APP"; fi
    echo "New resources from this installation attempt were rolled back."
  fi
  return "$rc"
}

[[ $EUID -eq 0 ]] || { echo "Run as root."; exit 1; }
. /etc/os-release
[[ "${ID:-}" == ubuntu ]] || { echo "Supported target: Ubuntu."; exit 1; }

for cmd in docker python3 systemctl tar install ss ping; do
  command -v "$cmd" >/dev/null || { echo "Missing command: $cmd"; exit 1; }
done
docker compose version >/dev/null
systemctl is-active --quiet docker || { echo "Docker must be active."; exit 1; }
[[ ! -e "$NGINX_CONF" && ! -L "$NGINX_CONF" ]] || {
  echo "Nginx status config already exists; refusing."
  exit 1
}
if systemctl is-active --quiet nginx 2>/dev/null; then
  NGINX_ACTIVE=1
  command -v nginx >/dev/null 2>&1 || {
    echo "Nginx is active but nginx command is missing."
    exit 1
  }
  [[ ! -e "$NGINX_CONF" ]] || {
    echo "Nginx status config already exists; refusing."
    exit 1
  }
  nginx -t || {
    echo "Existing Nginx configuration is invalid; refusing."
    exit 1
  }
fi

for path in "$APP" "$AGENT" "$UNIT" "$SOCKET_DIR"; do
  [[ ! -e "$path" ]] || { echo "Refusing to overwrite existing path: $path"; exit 1; }
done
UNIT_DIR=/etc/systemd/system/scc-agent.service.d
if [[ -d "$UNIT_DIR" ]] &&
   find "$UNIT_DIR" -mindepth 1 -maxdepth 1 \( -type f -o -type l \) -print -quit | grep -q .; then
  echo "Systemd drop-ins already exist in $UNIT_DIR; refusing to install."
  exit 1
fi
if [[ $NGINX_ACTIVE -eq 1 ]] &&
   ss -Hltn '( sport = :8099 )' | grep -q .; then
  echo "TCP port 8099 is already occupied; SCC needs it for local Nginx statistics."
  exit 1
fi
systemctl list-unit-files --no-legend scc-agent.service 2>/dev/null |
  grep -q . && { echo "scc-agent.service already exists; refusing."; exit 1; } || true
docker ps -a --format '{{.Names}}' | grep -Fxq server-control-center &&
  { echo "Container name already exists; refusing."; exit 1; } || true
ss -Hltn '( sport = :3000 )' | grep -q . &&
  { echo "Port 3000 is already listening; refusing."; exit 1; } || true

for f in Dockerfile docker-compose.yml .env.example \
  deploy/host-agent/agent.py deploy/host-agent/scc-agent.service \
  deploy/host-agent/nginx_metrics.py deploy/host-agent/services_metrics.py \
  deploy/host-agent/network_metrics.py deploy/host-agent/logs_metrics.py \
  deploy/host-agent/security_metrics.py \
  deploy/nginx/scc-nginx-status.conf; do
  [[ -f "$SRC/$f" ]] || { echo "Release file missing: $f"; exit 1; }
done

if find "$SRC" -maxdepth 1 -type f -name '.env*' \
  ! -name '.env.example' ! -name '.env.example.bak-*' -print -quit |
  grep -q .; then
  echo "Local env file found in release source. Remove it before packaging."
  exit 1
fi

docker compose --project-directory "$SRC" -f "$SRC/docker-compose.yml" config --quiet

trap rollback EXIT
install -d -m 0750 "$APP"
APP_CREATED=1
install -d -m 0750 "$AGENT"
AGENT_CREATED=1
tar -C "$SRC" --exclude='./.git' --exclude='./node_modules' \
  --exclude='./dist' --exclude='./coverage' --exclude='./.env*' \
  --exclude='*.bak-*' --exclude='*.pre-*' --exclude='__pycache__' \
  -cf - . | tar -C "$APP" -xf -
install -m 0644 "$SRC/.env.example" "$APP/.env.example"
cat > "$APP/.env" <<EOF
SCC_VERSION=$VERSION
METRICS_PROVIDER=agent
TRUST_PROXY=0
GEMINI_API_KEY=
EOF
chmod 0600 "$APP/.env"

if [[ $NGINX_ACTIVE -eq 1 ]]; then
  [[ ! -e "$NGINX_CONF" ]] || {
    echo "Nginx status config appeared during installation; refusing to overwrite."
    exit 1
  }
  install -o root -g root -m 0644 "$SRC/deploy/nginx/scc-nginx-status.conf" "$NGINX_CONF"
  NGINX_CONF_CREATED=1
  nginx -t
  systemctl reload nginx
  python3 -c 'from urllib.request import urlopen; r=urlopen("http://127.0.0.1:8099/nginx_status", timeout=2); raise SystemExit(0 if r.status == 200 else 1)'
fi

for f in agent.py nginx_metrics.py services_metrics.py network_metrics.py logs_metrics.py security_metrics.py; do
  install -o root -g root -m 0644 "$SRC/deploy/host-agent/$f" "$AGENT/$f"
done
install -o root -g root -m 0644 "$SRC/deploy/host-agent/scc-agent.service" "$UNIT"
UNIT_CREATED=1

python3 -m py_compile "$AGENT"/*.py
systemctl daemon-reload
SOCKET_DIR_CREATED=1
AGENT_STARTED=1
systemctl enable --now scc-agent.service
systemctl is-active --quiet scc-agent.service

# Type=simple reports active as soon as Python starts. Wait until the agent
# has completed imports and actually bound its Unix HTTP socket before
# pulling / starting the dashboard container.
agent_socket_ready=0
for _ in $(seq 1 40); do
  if [[ -S "$SOCKET_DIR/agent.sock" ]]; then
    agent_socket_ready=1
    break
  fi
  sleep 0.25
done

if [[ "$agent_socket_ready" -ne 1 ]]; then
  systemctl status scc-agent.service --no-pager || true
  journalctl -u scc-agent.service -n 80 --no-pager || true
  echo "Host-agent did not create $SOCKET_DIR/agent.sock."
  exit 1
fi

docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" config --quiet
docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" pull
COMPOSE_TOUCHED=1
docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" up -d --no-build --pull never

ready=0
for _ in $(seq 1 30); do
  if python3 -c 'from urllib.request import urlopen; r=urlopen("http://127.0.0.1:3000/api/health",timeout=2); exit(0 if r.status==200 else 1)' 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [[ $ready -ne 1 ]]; then
  docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" logs --tail=60
  echo "Health check failed."
  exit 1
fi

healthy=0
for _ in $(seq 1 60); do
  if [[ "$(docker inspect -f '{{.State.Health.Status}}' server-control-center 2>/dev/null || true)" == "healthy" ]]; then
    healthy=1
    break
  fi
  sleep 1
done

if [[ $healthy -ne 1 ]]; then
  docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" logs --tail=60
  echo "Docker healthcheck did not become healthy."
  exit 1
fi

COMPLETE=1
trap - EXIT
echo "Installation complete (version $VERSION). Local panel: http://127.0.0.1:3000"
echo "Configure your own HTTPS reverse proxy and authentication before exposing the panel."
