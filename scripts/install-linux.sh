#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_DATA_ROOT="${XDG_DATA_HOME:-${HOME}/.local/share}/veyqra"
INSTALL_ROOT="${DEFAULT_DATA_ROOT}"
INSTALL_ROOT_EXPLICIT=false
COMFYUI_DIR_OVERRIDE=""
COMFYUI_REPO="https://github.com/Comfy-Org/ComfyUI.git"
COMFYUI_HOST="127.0.0.1"
COMFYUI_PORT="8188"
GPU_BACKEND="auto"
PYTHON_BIN=""
TORCH_INDEX_URL=""
TORCH_INDEX_OVERRIDDEN=false
HSA_OVERRIDE=""
WITH_MANAGER=false
WITH_TRANSLATIONS=false
MODEL_SELECTION="prompt"
MODEL_SELECTION_EXPLICIT=false
UPDATE_REPOS=false
START_COMFYUI=true
ASSUME_YES=false
DRY_RUN=false

usage() {
  cat <<'EOF'
Install the local ComfyUI runtime required by Veyqra.

Usage:
  scripts/install-linux.sh [options]

Options:
  --install-dir PATH       Veyqra data/install directory.
                           Default: $XDG_DATA_HOME/veyqra or ~/.local/share/veyqra
  --comfyui-dir PATH       Use an existing ComfyUI directory or install there.
  --gpu BACKEND            auto, amd, nvidia, or cpu (default: auto).
  --python PATH            Python interpreter used to create virtual environments.
  --torch-index-url URL    Override the PyTorch wheel index selected for the GPU.
  --hsa-override VERSION   Set HSA_OVERRIDE_GFX_VERSION for AMD startup.
  --host ADDRESS           ComfyUI listen address (default: 127.0.0.1).
  --port PORT              ComfyUI port (default: 8188).
  --with-manager           Also install the optional ComfyUI Manager.
  --with-translations      Download Veyqra's local prompt translation models.
  --models LIST            Download models: flux-schnell, flux-dev, flux-fill,
                           sdxl-base, all, or none (default: prompt).
  --update                 Fast-forward existing ComfyUI and custom-node repos.
  --no-start               Install and configure without starting ComfyUI.
  --yes                    Accept prompts. Does not download image models.
  --dry-run                Print planned commands without changing files.
  -h, --help               Show this help.

This installer does not install system GPU drivers. Model downloads are always
optional and may require accepting a Hugging Face agreement first.
EOF
}

log() {
  printf '\n\033[1;35m[Veyqra]\033[0m %s\n' "$*"
}

info() {
  printf '\033[0;36m[INFO]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[0;33m[WARN]\033[0m %s\n' "$*" >&2
}

fail() {
  printf '\033[0;31m[FAIL]\033[0m %s\n' "$*" >&2
  exit 1
}

run() {
  printf '  +'
  printf ' %q' "$@"
  printf '\n'

  if [[ "${DRY_RUN}" == true ]]; then
    return 0
  fi

  "$@"
}

confirm() {
  local prompt="$1"
  local answer=""

  if [[ "${ASSUME_YES}" == true ]]; then
    return 0
  fi

  read -r -p "${prompt} [y/N] " answer
  [[ "${answer}" =~ ^[Yy]$ ]]
}

is_comfyui_directory() {
  local directory="$1"
  [[ -f "${directory}/main.py" ]] && [[ -d "${directory}/comfy" ]]
}

normalize_path() {
  "${PYTHON_BIN}" -c \
    'import os, sys; print(os.path.abspath(os.path.expanduser(sys.argv[1])))' \
    "$1"
}

read_saved_comfyui_directory() {
  local config_file="${REPO_ROOT}/config/local-install.env"

  [[ -f "${config_file}" ]] || return 0

  "${PYTHON_BIN}" - "${config_file}" <<'PY'
import shlex
import sys

with open(sys.argv[1], encoding="utf-8") as config:
    for line in config:
        if not line.startswith("VEYQRA_COMFYUI_DIR="):
            continue
        value = line.split("=", 1)[1].strip()
        parsed = shlex.split(value)
        if parsed:
            print(parsed[0])
        break
PY
}

discover_comfyui_directories() {
  local saved_directory
  local candidate
  local -a candidates=(
    "${HOME}/ComfyUI"
    "${HOME}/comfyui"
    "${HOME}/AI/ComfyUI"
    "${HOME}/Applications/ComfyUI"
    "$(dirname -- "${REPO_ROOT}")/ComfyUI"
  )
  local -A seen=()

  saved_directory="$(read_saved_comfyui_directory)"
  if [[ -n "${saved_directory}" ]]; then
    candidates=("${saved_directory}" "${candidates[@]}")
  fi

  for candidate in "${candidates[@]}"; do
    [[ -n "${candidate}" ]] || continue
    if is_comfyui_directory "${candidate}" && [[ -z "${seen[${candidate}]:-}" ]]; then
      printf '%s\n' "${candidate}"
      seen["${candidate}"]=1
    fi
  done
}

choose_install_root() {
  local answer

  if [[ "${INSTALL_ROOT_EXPLICIT}" == true ]]; then
    INSTALL_ROOT="$(normalize_path "${INSTALL_ROOT%/}")"
    return
  fi

  if [[ "${ASSUME_YES}" == true ]] || [[ ! -t 0 ]]; then
    INSTALL_ROOT="$(normalize_path "${INSTALL_ROOT%/}")"
    return
  fi

  printf '\n'
  read -r -p "Veyqra data/install directory [${INSTALL_ROOT}]: " answer
  INSTALL_ROOT="$(normalize_path "${answer:-${INSTALL_ROOT}}")"
}

choose_comfyui_directory() {
  local managed_directory
  local saved_directory
  local answer
  local custom_directory
  local index
  local -a detected=()

  managed_directory="$(normalize_path "${INSTALL_ROOT}/ComfyUI")"

  if [[ -n "${COMFYUI_DIR_OVERRIDE}" ]]; then
    COMFYUI_DIR="$(normalize_path "${COMFYUI_DIR_OVERRIDE%/}")"
    return
  fi

  if [[ "${INSTALL_ROOT_EXPLICIT}" == true ]]; then
    COMFYUI_DIR="${INSTALL_ROOT}/ComfyUI"
    return
  fi

  mapfile -t detected < <(discover_comfyui_directories)
  saved_directory="$(read_saved_comfyui_directory)"

  # Reuse a previously selected installation during unattended runs. Otherwise,
  # unattended setup always stays inside the Veyqra-managed data directory.
  if [[ "${ASSUME_YES}" == true ]] || [[ ! -t 0 ]]; then
    if [[ -n "${saved_directory}" ]] && is_comfyui_directory "${saved_directory}"; then
      COMFYUI_DIR="$(normalize_path "${saved_directory%/}")"
    else
      COMFYUI_DIR="${managed_directory}"
    fi
    return
  fi

  if (( ${#detected[@]} == 0 )); then
    read -r -p "ComfyUI directory [${managed_directory}]: " custom_directory
    COMFYUI_DIR="$(normalize_path "${custom_directory:-${managed_directory}}")"
    return
  fi

  printf '\nExisting ComfyUI installations detected:\n\n'
  for index in "${!detected[@]}"; do
    printf '  [%d] Use %s\n' "$((index + 1))" "${detected[index]}"
  done
  printf '  [%d] Install/use a separate Veyqra-managed copy at %s\n' \
    "$(( ${#detected[@]} + 1 ))" "${managed_directory}"
  printf '  [%d] Enter another path\n\n' "$(( ${#detected[@]} + 2 ))"

  while true; do
    read -r -p "Choose ComfyUI installation [1]: " answer
    answer="${answer:-1}"

    if [[ "${answer}" =~ ^[0-9]+$ ]] && \
       (( answer >= 1 && answer <= ${#detected[@]} )); then
      COMFYUI_DIR="$(normalize_path "${detected[answer - 1]%/}")"
      break
    fi

    if [[ "${answer}" == "$(( ${#detected[@]} + 1 ))" ]]; then
      read -r -p "ComfyUI directory [${managed_directory}]: " custom_directory
      COMFYUI_DIR="$(normalize_path "${custom_directory:-${managed_directory}}")"
      break
    fi

    if [[ "${answer}" == "$(( ${#detected[@]} + 2 ))" ]]; then
      read -r -p "ComfyUI directory: " custom_directory
      [[ -n "${custom_directory}" ]] || {
        warn "The path cannot be empty."
        continue
      }
      COMFYUI_DIR="$(normalize_path "${custom_directory%/}")"
      break
    fi

    warn "Enter one of the displayed numbers."
  done

  if [[ -e "${COMFYUI_DIR}" ]] && ! is_comfyui_directory "${COMFYUI_DIR}"; then
    fail "${COMFYUI_DIR} exists but is not a recognizable ComfyUI installation."
  fi

}

normalize_model_selection() {
  local selection="${1// /}"
  local item
  local -a requested=()
  local -a normalized=()
  local -A seen=()

  if [[ "${selection}" == "all" ]]; then
    printf '%s\n' "flux-schnell,flux-dev,flux-fill,sdxl-base"
    return
  fi

  if [[ -z "${selection}" ]] || [[ "${selection}" == "none" ]]; then
    printf '%s\n' "none"
    return
  fi

  IFS=',' read -r -a requested <<<"${selection}"
  for item in "${requested[@]}"; do
    case "${item}" in
      1|flux-schnell) item="flux-schnell" ;;
      2|flux-dev) item="flux-dev" ;;
      3|flux-fill) item="flux-fill" ;;
      4|sdxl|sdxl-base) item="sdxl-base" ;;
      *) fail "Unknown model '${item}'. Use flux-schnell, flux-dev, flux-fill, sdxl-base, all, or none." ;;
    esac
    if [[ -z "${seen[${item}]:-}" ]]; then
      normalized+=("${item}")
      seen["${item}"]=1
    fi
  done

  local joined
  joined="$(IFS=','; printf '%s' "${normalized[*]}")"
  printf '%s\n' "${joined:-none}"
}

choose_models() {
  local answer

  if [[ "${MODEL_SELECTION_EXPLICIT}" == true ]]; then
    MODEL_SELECTION="$(normalize_model_selection "${MODEL_SELECTION}")"
    return
  fi

  if [[ "${ASSUME_YES}" == true ]] || [[ ! -t 0 ]]; then
    MODEL_SELECTION="none"
    return
  fi

  if ! confirm "Download optional official image model weights?"; then
    MODEL_SELECTION="none"
    return
  fi

  cat <<'EOF'

Choose one or more models (comma-separated):

  [1] FLUX.1 Schnell   ~23.8 GB  Apache-2.0
  [2] FLUX.1 Dev       ~23.8 GB  FLUX dev non-commercial license
  [3] FLUX.1 Fill Dev  ~23.8 GB  FLUX dev non-commercial license
  [4] SDXL Base 1.0     ~6.94 GB  CreativeML Open RAIL++-M

FLUX selections also install shared CLIP-L, T5XXL FP16 and VAE files
(approximately 10.4 GB). SDXL is a self-contained checkpoint.
EOF
  read -r -p "Model selection [1]: " answer
  MODEL_SELECTION="$(normalize_model_selection "${answer:-1}")"
}

ensure_hugging_face_token() {
  local token

  [[ "${MODEL_SELECTION}" != "none" ]] || return 0
  if [[ ",${MODEL_SELECTION}," != *",flux-schnell,"* ]] && \
     [[ ",${MODEL_SELECTION}," != *",flux-dev,"* ]] && \
     [[ ",${MODEL_SELECTION}," != *",flux-fill,"* ]]; then
    return
  fi
  [[ "${DRY_RUN}" == false ]] || {
    info "A Hugging Face token and accepted model agreements will be required."
    return
  }
  if [[ -n "${HF_TOKEN:-}" ]] || [[ -n "${HUGGING_FACE_HUB_TOKEN:-}" ]]; then
    return
  fi
  if [[ ! -t 0 ]]; then
    fail "HF_TOKEN is required to download the selected FLUX models."
  fi

  warn "First accept access for every selected model on Hugging Face:"
  if [[ ",${MODEL_SELECTION}," == *",flux-schnell,"* ]]; then
    warn "  https://huggingface.co/black-forest-labs/FLUX.1-schnell"
  fi
  if [[ ",${MODEL_SELECTION}," == *",flux-dev,"* ]]; then
    warn "  https://huggingface.co/black-forest-labs/FLUX.1-dev"
  fi
  if [[ ",${MODEL_SELECTION}," == *",flux-fill,"* ]]; then
    warn "  https://huggingface.co/black-forest-labs/FLUX.1-Fill-dev"
  fi
  read -r -s -p "Hugging Face token (not stored): " token
  printf '\n'
  [[ -n "${token}" ]] || fail "A Hugging Face token is required."
  export HF_TOKEN="${token}"
}

download_selected_models() {
  local -a selected=()

  [[ "${MODEL_SELECTION}" != "none" ]] || return 0
  IFS=',' read -r -a selected <<<"${MODEL_SELECTION}"
  log "Downloading optional image models"
  run "${PYTHON_BIN}" "${SCRIPT_DIR}/download-comfyui-models.py" \
    --comfyui-dir "${COMFYUI_DIR}" \
    --manifest "${REPO_ROOT}/config/comfyui-models.json" \
    --models "${selected[@]}"
}

require_command() {
  local command_name="$1"
  local guidance="$2"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    fail "${command_name} was not found. ${guidance}"
  fi
}

select_python() {
  if [[ -n "${PYTHON_BIN}" ]]; then
    [[ -x "${PYTHON_BIN}" ]] || fail "Python is not executable: ${PYTHON_BIN}"
    return
  fi

  if command -v python3.12 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3.12)"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
  else
    fail "Python 3 was not found. Install Python 3.12 and python3-venv."
  fi
}

check_python_version() {
  if ! "${PYTHON_BIN}" -c \
    'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
    fail "Python 3.11 or newer is required. Python 3.12 is recommended."
  fi
}

check_node_version() {
  local major
  major="$(node -p 'Number(process.versions.node.split(".")[0])')"

  if (( major < 22 )); then
    fail "Node.js 22 or newer is required (detected: $(node --version))."
  fi
}

detect_gpu_backend() {
  if [[ "${GPU_BACKEND}" != "auto" ]]; then
    return
  fi

  if command -v nvidia-smi >/dev/null 2>&1; then
    GPU_BACKEND="nvidia"
    return
  fi

  if command -v rocminfo >/dev/null 2>&1; then
    GPU_BACKEND="amd"
    return
  fi

  if command -v lspci >/dev/null 2>&1; then
    if lspci | grep -Eiq 'NVIDIA.*(VGA|3D|Display)|(VGA|3D|Display).*NVIDIA'; then
      GPU_BACKEND="nvidia"
      return
    fi

    if lspci | grep -Eiq '(AMD|ATI).*(VGA|3D|Display)|(VGA|3D|Display).*(AMD|ATI)'; then
      GPU_BACKEND="amd"
      return
    fi
  fi

  GPU_BACKEND="cpu"
}

detect_hsa_override() {
  if [[ "${GPU_BACKEND}" != "amd" ]] || [[ -n "${HSA_OVERRIDE}" ]]; then
    return
  fi

  if command -v rocminfo >/dev/null 2>&1; then
    if rocminfo 2>/dev/null | grep -Eq 'gfx103[12]'; then
      HSA_OVERRIDE="10.3.0"
      warn "Detected an RDNA2 gfx1031/gfx1032 device; startup will use HSA_OVERRIDE_GFX_VERSION=10.3.0."
    fi
  fi
}

set_default_torch_index() {
  if [[ -n "${TORCH_INDEX_URL}" ]]; then
    return
  fi

  case "${GPU_BACKEND}" in
    amd)
      TORCH_INDEX_URL="https://download.pytorch.org/whl/rocm6.4"
      ;;
    nvidia)
      TORCH_INDEX_URL="https://download.pytorch.org/whl/cu130"
      ;;
    cpu)
      TORCH_INDEX_URL="https://download.pytorch.org/whl/cpu"
      ;;
    *)
      fail "Unsupported GPU backend: ${GPU_BACKEND}"
      ;;
  esac
}

clone_or_update_repo() {
  local name="$1"
  local repo="$2"
  local destination="$3"
  local ref="${4:-}"

  if [[ -d "${destination}/.git" ]]; then
    info "${name} already exists at ${destination}."

    if [[ "${UPDATE_REPOS}" == true ]]; then
      run git -C "${destination}" pull --ff-only
    fi
    return
  fi

  if [[ "${name}" == "ComfyUI" ]] && is_comfyui_directory "${destination}"; then
    info "Using the existing ComfyUI installation at ${destination}."
    if [[ "${UPDATE_REPOS}" == true ]]; then
      warn "Cannot update ${destination} because it has no Git metadata."
    fi
    return
  fi

  if [[ -e "${destination}" ]]; then
    fail "${destination} exists but is not a Git repository."
  fi

  if [[ -n "${ref}" ]]; then
    run git clone --depth 1 --branch "${ref}" "${repo}" "${destination}"
  else
    run git clone --depth 1 "${repo}" "${destination}"
  fi
}

install_custom_nodes() {
  local nodes_dir="$1"
  local comfy_python="$2"
  local node_config="${REPO_ROOT}/config/comfyui-nodes.json"

  log "Installing Veyqra custom nodes"

  while IFS=$'\t' read -r name repo ref; do
    [[ -n "${name}" ]] || continue

    local destination="${nodes_dir}/${name}"
    clone_or_update_repo "${name}" "${repo}" "${destination}" "${ref}"

    if [[ "${DRY_RUN}" == true ]] || [[ -f "${destination}/requirements.txt" ]]; then
      run "${comfy_python}" -m pip install -r "${destination}/requirements.txt"
    fi
  done < <(
    "${PYTHON_BIN}" -c '
import json, sys
path, include_manager = sys.argv[1], sys.argv[2] == "true"
with open(path, encoding="utf-8") as file:
    config = json.load(file)
for node in config.get("nodes", []):
    enabled = node.get("install_by_default", False)
    if node.get("name") == "ComfyUI-Manager" and include_manager:
        enabled = True
    if enabled:
        print(node["name"], node["repo"], node.get("ref") or "", sep="\t")
' "${node_config}" "${WITH_MANAGER}"
  )
}

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local temporary

  if [[ "${DRY_RUN}" == true ]]; then
    printf '  + set %s=%q in %s\n' "${key}" "${value}" "${file}"
    return
  fi

  mkdir -p "$(dirname -- "${file}")"
  touch "${file}"
  temporary="$(mktemp)"
  grep -v -E "^${key}=" "${file}" >"${temporary}" || true
  printf '%s=%s\n' "${key}" "${value}" >>"${temporary}"
  mv "${temporary}" "${file}"
}

write_install_config() {
  local file="$1"
  local comfy_dir="$2"
  local comfy_python="$3"

  if [[ "${DRY_RUN}" == true ]]; then
    printf '  + write local install configuration to %s\n' "${file}"
    return
  fi

  mkdir -p "$(dirname -- "${file}")"
  {
    printf '# Generated by scripts/install-linux.sh. Do not commit this file.\n'
    printf 'VEYQRA_COMFYUI_DIR=%q\n' "${comfy_dir}"
    printf 'VEYQRA_COMFYUI_PYTHON=%q\n' "${comfy_python}"
    printf 'VEYQRA_COMFYUI_HOST=%q\n' "${COMFYUI_HOST}"
    printf 'VEYQRA_COMFYUI_PORT=%q\n' "${COMFYUI_PORT}"
    printf 'VEYQRA_GPU_BACKEND=%q\n' "${GPU_BACKEND}"
    printf 'VEYQRA_HSA_OVERRIDE_GFX_VERSION=%q\n' "${HSA_OVERRIDE}"
  } >"${file}"
}

install_veyqra_dependencies() {
  local api_python="${REPO_ROOT}/apps/api/.venv/bin/python"

  log "Installing Veyqra dependencies"
  run npm ci --prefix "${REPO_ROOT}"

  if [[ ! -x "${api_python}" ]]; then
    run "${PYTHON_BIN}" -m venv "${REPO_ROOT}/apps/api/.venv"
  fi

  run "${api_python}" -m pip install --upgrade pip wheel setuptools
  run "${api_python}" -m pip install -r "${REPO_ROOT}/apps/api/requirements.txt"

  if [[ "${WITH_TRANSLATIONS}" == true ]]; then
    run "${api_python}" "${REPO_ROOT}/apps/api/scripts/install_translation_models.py"
  fi
}

print_model_checklist() {
  local models_dir="$1"

  cat <<EOF

Model downloads were intentionally skipped. Add or link the required files:

  FLUX diffusion models: ${models_dir}/diffusion_models or ${models_dir}/unet
  LoRAs:                 ${models_dir}/loras
  CLIP-L and T5XXL:      ${models_dir}/clip
  VAE (ae.safetensors):  ${models_dir}/vae

Required by the current workflows:
  [ ] A compatible FLUX Text to Image model
  [ ] A compatible FLUX Fill/Inpaint model
  [ ] clip_l.safetensors
  [ ] t5xxl_fp16.safetensors
  [ ] ae.safetensors
  [ ] An SDXL checkpoint such as sd_xl_base_1.0.safetensors
EOF
}

while (( $# > 0 )); do
  case "$1" in
    --install-dir)
      [[ $# -ge 2 ]] || fail "--install-dir requires a path."
      INSTALL_ROOT="$2"
      INSTALL_ROOT_EXPLICIT=true
      shift 2
      ;;
    --comfyui-dir)
      [[ $# -ge 2 ]] || fail "--comfyui-dir requires a path."
      COMFYUI_DIR_OVERRIDE="$2"
      shift 2
      ;;
    --gpu)
      [[ $# -ge 2 ]] || fail "--gpu requires auto, amd, nvidia, or cpu."
      GPU_BACKEND="$2"
      shift 2
      ;;
    --python)
      [[ $# -ge 2 ]] || fail "--python requires an executable path."
      PYTHON_BIN="$2"
      shift 2
      ;;
    --torch-index-url)
      [[ $# -ge 2 ]] || fail "--torch-index-url requires a URL."
      TORCH_INDEX_URL="$2"
      TORCH_INDEX_OVERRIDDEN=true
      shift 2
      ;;
    --hsa-override)
      [[ $# -ge 2 ]] || fail "--hsa-override requires a version."
      HSA_OVERRIDE="$2"
      shift 2
      ;;
    --host)
      [[ $# -ge 2 ]] || fail "--host requires an address."
      COMFYUI_HOST="$2"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 ]] || fail "--port requires a value."
      COMFYUI_PORT="$2"
      shift 2
      ;;
    --with-manager)
      WITH_MANAGER=true
      shift
      ;;
    --with-translations)
      WITH_TRANSLATIONS=true
      shift
      ;;
    --models)
      [[ $# -ge 2 ]] || fail "--models requires a comma-separated list or none."
      MODEL_SELECTION="$2"
      MODEL_SELECTION_EXPLICIT=true
      shift 2
      ;;
    --update)
      UPDATE_REPOS=true
      shift
      ;;
    --no-start)
      START_COMFYUI=false
      shift
      ;;
    --yes)
      ASSUME_YES=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

case "${GPU_BACKEND}" in
  auto|amd|nvidia|cpu) ;;
  *) fail "--gpu must be auto, amd, nvidia, or cpu." ;;
esac

[[ "${COMFYUI_PORT}" =~ ^[0-9]+$ ]] || fail "--port must be numeric."
(( COMFYUI_PORT >= 1 && COMFYUI_PORT <= 65535 )) || fail "Invalid port: ${COMFYUI_PORT}"

require_command git "Install Git with your distribution package manager."
require_command node "Install Node.js 22 or newer."
require_command npm "Install npm together with Node.js."
select_python
check_python_version
check_node_version
choose_install_root
choose_comfyui_directory
choose_models
detect_gpu_backend
detect_hsa_override
set_default_torch_index

COMFYUI_VENV="${COMFYUI_DIR}/.venv"
COMFYUI_PYTHON="${COMFYUI_VENV}/bin/python"
INSTALL_CONFIG="${REPO_ROOT}/config/local-install.env"
COMFYUI_URL="http://${COMFYUI_HOST}:${COMFYUI_PORT}"

log "Installation plan"
info "Repository:     ${REPO_ROOT}"
info "Install root:   ${INSTALL_ROOT}"
info "ComfyUI:        ${COMFYUI_DIR}"
info "Python:         ${PYTHON_BIN}"
info "GPU backend:    ${GPU_BACKEND}"
info "PyTorch index:  ${TORCH_INDEX_URL}"
info "ComfyUI URL:    ${COMFYUI_URL}"
info "Models:         ${MODEL_SELECTION}"

if [[ "${GPU_BACKEND}" == "amd" ]] && ! command -v rocminfo >/dev/null 2>&1; then
  warn "rocminfo was not found. This installer installs PyTorch but not the host ROCm driver."
fi

if ! confirm "Continue with this installation plan?"; then
  info "Installation cancelled."
  exit 0
fi

ensure_hugging_face_token

log "Installing ComfyUI"
run mkdir -p "${INSTALL_ROOT}"
clone_or_update_repo "ComfyUI" "${COMFYUI_REPO}" "${COMFYUI_DIR}"

if [[ ! -x "${COMFYUI_PYTHON}" ]]; then
  run "${PYTHON_BIN}" -m venv "${COMFYUI_VENV}"
fi

run "${COMFYUI_PYTHON}" -m pip install --upgrade pip wheel setuptools
if [[ "${GPU_BACKEND}" == "nvidia" ]] && \
   [[ "${TORCH_INDEX_OVERRIDDEN}" == false ]]; then
  run "${COMFYUI_PYTHON}" -m pip install \
    torch torchvision torchaudio \
    --extra-index-url "${TORCH_INDEX_URL}"
else
  run "${COMFYUI_PYTHON}" -m pip install \
    torch torchvision torchaudio \
    --index-url "${TORCH_INDEX_URL}"
fi
run "${COMFYUI_PYTHON}" -m pip install -r "${COMFYUI_DIR}/requirements.txt"

run mkdir -p \
  "${COMFYUI_DIR}/models/checkpoints" \
  "${COMFYUI_DIR}/models/diffusion_models" \
  "${COMFYUI_DIR}/models/unet" \
  "${COMFYUI_DIR}/models/loras" \
  "${COMFYUI_DIR}/models/clip" \
  "${COMFYUI_DIR}/models/vae" \
  "${COMFYUI_DIR}/models/LLM" \
  "${COMFYUI_DIR}/custom_nodes"

install_custom_nodes "${COMFYUI_DIR}/custom_nodes" "${COMFYUI_PYTHON}"
download_selected_models
install_veyqra_dependencies

log "Writing local configuration"
write_install_config "${INSTALL_CONFIG}" "${COMFYUI_DIR}" "${COMFYUI_PYTHON}"
upsert_env "${REPO_ROOT}/apps/api/.env" \
  "VEYQRA_COMFYUI_URL" "${COMFYUI_URL}"
upsert_env "${REPO_ROOT}/apps/api/.env" \
  "VEYQRA_PUBLIC_API_URL" ""
upsert_env "${REPO_ROOT}/apps/api/.env" \
  "VEYQRA_CORS_ORIGINS" "http://localhost:3000,http://127.0.0.1:3000"

if [[ "${START_COMFYUI}" == true ]]; then
  log "Starting and verifying ComfyUI"

  if [[ "${DRY_RUN}" == true ]]; then
    info "Would start scripts/start-comfyui.sh and verify ${COMFYUI_URL}."
  else
    if "${PYTHON_BIN}" "${SCRIPT_DIR}/verify-comfyui.py" \
      --url "${COMFYUI_URL}" >/dev/null 2>&1; then
      info "An existing compatible ComfyUI instance is already running."
      "${PYTHON_BIN}" "${SCRIPT_DIR}/verify-comfyui.py" \
        --url "${COMFYUI_URL}"
    else
      mkdir -p "${REPO_ROOT}/logs"
      "${SCRIPT_DIR}/start-comfyui.sh" \
        >"${REPO_ROOT}/logs/comfyui.log" 2>&1 &
      comfyui_pid=$!
      info "ComfyUI started with PID ${comfyui_pid}."

      if ! "${PYTHON_BIN}" "${SCRIPT_DIR}/verify-comfyui.py" \
        --url "${COMFYUI_URL}" \
        --wait 180; then
        warn "ComfyUI verification failed. Recent log output:"
        tail -n 40 "${REPO_ROOT}/logs/comfyui.log" || true
        exit 1
      fi
    fi
  fi
fi

if [[ "${MODEL_SELECTION}" == "none" ]]; then
  print_model_checklist "${COMFYUI_DIR}/models"
elif [[ "${DRY_RUN}" == true ]]; then
  info "Selected model bundle would be installed in ${COMFYUI_DIR}/models."
else
  info "Selected model bundle installed in ${COMFYUI_DIR}/models."
fi

cat <<EOF

Veyqra local runtime setup is complete.

Start ComfyUI:
  scripts/start-comfyui.sh

Start the Veyqra API in another terminal:
  npm run api

Start the Veyqra web app in another terminal:
  npm run web

Verify an already running ComfyUI instance:
  scripts/verify-comfyui.py --url ${COMFYUI_URL}
EOF
