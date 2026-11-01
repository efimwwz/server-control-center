#!/usr/bin/env bash
set -Eeuo pipefail

APP=/opt/server-control-center
AGENT=/opt/scc-agent
UNIT=/etc/systemd/system/scc-agent.service
UNIT_DIR=/etc/systemd/system/scc-agent.service.d
NGINX_CONF=/etc/nginx/conf.d/scc-nginx-status.conf

[[ $EUID -eq 0 ]] || {
  echo "Run as root: sudo bash deploy/uninstall.sh"
  exit 1
}

if [[ ! -e "$APP" && ! -e "$AGENT" && ! -e "$UNIT" ]]; then
  echo "Server Control Center installation was not found."
  exit 1
fi

if [[ -f "$UNIT" ]] &&
   ! grep -Fxq 'ExecStart=/usr/bin/python3 /opt/scc-agent/agent.py' "$UNIT"; then
  echo "STOP: scc-agent.service is not the expected unit. Nothing removed."
  exit 1
fi

if [[ -d "$UNIT_DIR" ]] &&
   find "$UNIT_DIR" -maxdepth 1 -type f -print -quit | grep -q .; then
  echo "STOP: systemd drop-ins exist in $UNIT_DIR."
  echo "Review them manually before uninstalling. Nothing removed."
  exit 1
fi

if [[ -f "$APP/docker-compose.yml" ]]; then
  mapfile -t SERVICES < <(docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" config --services)
  if [[ ${#SERVICES[@]} -ne 1 || "${SERVICES[0]}" != "server-control-center" ]]; then
    echo "STOP: unexpected Compose services. Nothing removed."
    printf 'Found: %s\n' "${SERVICES[@]}"
    exit 1
  fi
fi

echo "This will remove only Server Control Center and its host-agent."
echo "A protected backup will be saved under /var/backups."
read -r -p 'Type REMOVE SERVER CONTROL CENTER to continue: ' ANSWER
[[ "$ANSWER" == "REMOVE SERVER CONTROL CENTER" ]] || {
  echo "Cancelled."
  exit 1
}

STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/var/backups/server-control-center
BACKUP="$BACKUP_DIR/uninstall-$STAMP.tar.gz"
install -d -m 0700 "$BACKUP_DIR"

ITEMS=()
for item in \
  opt/server-control-center \
  opt/scc-agent \
  etc/systemd/system/scc-agent.service \
  etc/nginx/conf.d/scc-nginx-status.conf; do
  [[ -e "/$item" ]] && ITEMS+=("$item")
done

if [[ ${#ITEMS[@]} -gt 0 ]]; then
  tar -C / -czf "$BACKUP" "${ITEMS[@]}"
  chmod 0600 "$BACKUP"
  echo "Backup saved: $BACKUP"
fi

if [[ -f "$APP/docker-compose.yml" ]]; then
  docker compose --project-directory "$APP" -f "$APP/docker-compose.yml" down --timeout 30
fi

if [[ -f "$UNIT" ]]; then
  systemctl disable --now scc-agent.service || true
  rm -f "$UNIT"
  systemctl daemon-reload
  systemctl reset-failed scc-agent.service || true
fi

if [[ -f "$NGINX_CONF" ]]; then
  if [[ -f "$APP/deploy/nginx/scc-nginx-status.conf" ]] &&
     cmp -s "$NGINX_CONF" "$APP/deploy/nginx/scc-nginx-status.conf"; then
    rm -f "$NGINX_CONF"
    if systemctl is-active --quiet nginx 2>/dev/null; then
      if nginx -t; then
        systemctl reload nginx
      else
        echo "WARNING: Nginx config test failed; Nginx was not reloaded."
      fi
    fi
  else
    echo "Keeping modified Nginx config: $NGINX_CONF"
  fi
fi

rm -rf -- "$AGENT" "$APP"

# Remove only the known SCC socket. Preserve an unexpected non-empty runtime
# directory rather than deleting files that another process may have placed there.
if [[ -S /run/scc-agent/agent.sock ]]; then
  rm -f /run/scc-agent/agent.sock
fi
if [[ -d /run/scc-agent ]]; then
  if find /run/scc-agent -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
    echo "Keeping non-empty runtime directory /run/scc-agent."
  else
    rmdir /run/scc-agent
  fi
fi

echo "Uninstall complete. Docker images were left intact."
echo "Backup: $BACKUP"
