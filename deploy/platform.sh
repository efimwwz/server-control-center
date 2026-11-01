#!/usr/bin/env bash
# Supported host operating systems for Server Control Center.
# This file is sourced by deploy/install.sh and CI compatibility tests.

scc_validate_platform() {
  local os_release="${1:-/etc/os-release}"

  if [[ ! -r "$os_release" ]]; then
    echo "Cannot read operating-system information: $os_release" >&2
    return 1
  fi

  # shellcheck disable=SC1090
  . "$os_release"

  case "${ID:-}:${VERSION_ID:-}" in
    ubuntu:22.04|ubuntu:24.04)
      SCC_DOCKER_REPO_DISTRO="ubuntu"
      SCC_DOCKER_REPO_CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
      ;;
    debian:12|debian:13)
      SCC_DOCKER_REPO_DISTRO="debian"
      SCC_DOCKER_REPO_CODENAME="${VERSION_CODENAME:-}"
      ;;
    *)
      echo "Unsupported operating system: ${PRETTY_NAME:-${ID:-unknown} ${VERSION_ID:-}}" >&2
      echo "Supported: Ubuntu 22.04/24.04 and Debian 12/13." >&2
      return 1
      ;;
  esac

  if [[ -z "$SCC_DOCKER_REPO_CODENAME" ]]; then
    echo "Could not determine the Docker repository codename for this system." >&2
    return 1
  fi

  export SCC_DOCKER_REPO_DISTRO SCC_DOCKER_REPO_CODENAME
}
