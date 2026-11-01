#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY="efimwwz/server-control-center"
API_URL="https://api.github.com/repos/${REPOSITORY}"
RELEASE_URL="https://github.com/${REPOSITORY}/releases/download"
WORK_DIR=""
KEEP_WORK_DIR=0

cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" && "$KEEP_WORK_DIR" -eq 0 ]]; then
    rm -rf -- "$WORK_DIR"
  fi
}
trap cleanup EXIT

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ $EUID -eq 0 ]] || fail "Run as root: curl -fsSL https://raw.githubusercontent.com/${REPOSITORY}/main/install.sh | sudo bash"

[[ -r /etc/os-release ]] || fail "Cannot identify operating system."
. /etc/os-release
[[ "${ID:-}" == "ubuntu" && "${VERSION_ID:-}" == "24.04" ]] ||   fail "This release supports Ubuntu 24.04 LTS. Detected: ${PRETTY_NAME:-unknown}"

[[ -d /run/systemd/system ]] || fail "systemd is required."
command -v apt-get >/dev/null || fail "apt-get is required."
command -v dpkg >/dev/null || fail "dpkg is required."

for path in   /opt/server-control-center   /opt/scc-agent   /etc/systemd/system/scc-agent.service   /run/scc-agent; do
  [[ ! -e "$path" && ! -L "$path" ]] || fail "Existing SCC resource found: $path. Refusing to overwrite."
done

if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -Fxq server-control-center; then
  fail "A container named server-control-center already exists. Refusing to overwrite."
fi

if ss -Hltn '( sport = :3000 )' 2>/dev/null | grep -q .; then
  fail "TCP port 3000 is already occupied."
fi

ARCH="$(dpkg --print-architecture)"
case "$ARCH" in
  amd64|arm64) ;;
  *) fail "Unsupported architecture: $ARCH (supported: amd64, arm64)." ;;
esac

if command -v curl >/dev/null 2>&1; then
  :
else
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates
fi

echo "========== DOCKER CHECK =========="
if command -v docker >/dev/null 2>&1; then
  docker compose version >/dev/null 2>&1 || {
    echo "Docker CLI exists but the Compose plugin is missing."
    echo "Install docker-compose-plugin using Docker's official apt repository, then run this installer again."
    exit 1
  }
  systemctl is-active --quiet docker || {
    echo "Docker is installed but inactive. The installer will not start or restart an existing Docker daemon."
    echo "Start Docker yourself, then run this installer again."
    exit 1
  }
  echo "Existing active Docker Engine and Compose plugin detected. They will not be restarted."
else
  echo "Docker is not installed. Installing Docker Engine from its official Ubuntu apt repository."

  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg     -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: ${ARCH}
Signed-By: /etc/apt/keyrings/docker.asc
EOF

  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
fi

docker compose version >/dev/null
systemctl is-active --quiet docker || fail "Docker service is not active."

echo
echo "========== SELECT RELEASE =========="
if [[ -n "${SCC_VERSION:-}" ]]; then
  TAG="$SCC_VERSION"
  [[ "$TAG" == v* ]] || TAG="v$TAG"
else
  RELEASE_JSON="$(curl -fsSL --retry 3 \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "$API_URL/releases/latest")" || fail "Cannot query the latest GitHub Release."
  TAG="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tag_name",""))' <<<"$RELEASE_JSON")"
fi

[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "Invalid or missing release tag: $TAG"

VERSION="${TAG#v}"
ARCHIVE="server-control-center-${TAG}.tar.gz"
CHECKSUM="server-control-center-${TAG}.sha256"

WORK_DIR="$(mktemp -d /var/tmp/scc-install.XXXXXX)"
chmod 0700 "$WORK_DIR"

echo "Release: $TAG"
echo "Downloading release archive and checksum..."

curl -fL --retry 3 "$RELEASE_URL/$TAG/$ARCHIVE" -o "$WORK_DIR/$ARCHIVE"
curl -fL --retry 3 "$RELEASE_URL/$TAG/$CHECKSUM" -o "$WORK_DIR/$CHECKSUM"

echo
echo "========== VERIFY RELEASE =========="
(
  cd "$WORK_DIR"
  sha256sum -c "$CHECKSUM"
)

echo
echo "========== EXTRACT RELEASE =========="
mkdir -m 0750 "$WORK_DIR/source"
tar -xzf "$WORK_DIR/$ARCHIVE" -C "$WORK_DIR/source" --strip-components=1

[[ -s "$WORK_DIR/source/deploy/install.sh" ]] || fail "Release archive does not contain deploy/install.sh."
[[ -s "$WORK_DIR/source/docker-compose.yml" ]] || fail "Release archive does not contain docker-compose.yml."
[[ -s "$WORK_DIR/source/deploy/host-agent/security_metrics.py" ]] || fail "Release archive is incomplete."

echo
echo "========== INSTALL SERVER CONTROL CENTER =========="
SCC_VERSION="$VERSION" bash "$WORK_DIR/source/deploy/install.sh"

echo
echo "========== VERIFY INSTALLATION =========="
curl -fsS --max-time 10 http://127.0.0.1:3000/api/health |
  python3 -c '
import json,sys
data=json.load(sys.stdin)
print(json.dumps(data, indent=2))
assert data.get("status") == "ok"
assert data.get("version") == sys.argv[1]
' "$VERSION" || fail "Application health verification failed."

systemctl is-active --quiet scc-agent.service || fail "Host-agent service is not active."
docker inspect -f '{{.State.Health.Status}}' server-control-center | grep -Fxq healthy ||   fail "Docker container is not healthy."

echo
echo "Server Control Center $VERSION installed successfully."
echo "Local URL: http://127.0.0.1:3000"
echo "Remote access: use an SSH tunnel or configure your own authenticated HTTPS reverse proxy."
echo "The panel is not published directly on a public interface."
