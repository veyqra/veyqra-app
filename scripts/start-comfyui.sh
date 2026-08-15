#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
INSTALL_CONFIG="${VEYQRA_INSTALL_CONFIG:-${REPO_ROOT}/config/local-install.env}"

if [[ ! -f "${INSTALL_CONFIG}" ]]; then
  echo "Veyqra install configuration not found: ${INSTALL_CONFIG}" >&2
  echo "Run scripts/install-linux.sh first." >&2
  exit 1
fi

# This file is generated locally by install-linux.sh and contains shell-escaped
# paths and values only.
# shellcheck disable=SC1090
source "${INSTALL_CONFIG}"

: "${VEYQRA_COMFYUI_DIR:?Missing VEYQRA_COMFYUI_DIR}"
: "${VEYQRA_COMFYUI_PYTHON:?Missing VEYQRA_COMFYUI_PYTHON}"

COMFYUI_HOST="${VEYQRA_COMFYUI_HOST:-127.0.0.1}"
COMFYUI_PORT="${VEYQRA_COMFYUI_PORT:-8188}"

if [[ "${VEYQRA_GPU_BACKEND:-}" == "amd" ]] && \
   [[ -n "${VEYQRA_HSA_OVERRIDE_GFX_VERSION:-}" ]]; then
  export HSA_OVERRIDE_GFX_VERSION="${VEYQRA_HSA_OVERRIDE_GFX_VERSION}"
fi

exec "${VEYQRA_COMFYUI_PYTHON}" \
  "${VEYQRA_COMFYUI_DIR}/main.py" \
  --listen "${COMFYUI_HOST}" \
  --port "${COMFYUI_PORT}" \
  "$@"
