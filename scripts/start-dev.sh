#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
API_UVICORN="${PROJECT_ROOT}/apps/api/.venv/bin/uvicorn"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm was not found. Install Node.js 22 or newer first." >&2
  exit 1
fi

if [[ ! -x "${API_UVICORN}" ]]; then
  echo "Error: the API environment is missing (${API_UVICORN})." >&2
  echo "Create it and install apps/api/requirements.txt first." >&2
  exit 1
fi

api_pid=""
web_pid=""

cleanup() {
  trap - INT TERM EXIT

  for pid in "${api_pid}" "${web_pid}"; do
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
    fi
  done

  wait 2>/dev/null || true
}

trap cleanup INT TERM EXIT

cd "${PROJECT_ROOT}"

echo "Starting API at http://localhost:8000 ..."
npm run api &
api_pid=$!

echo "Starting frontend at http://localhost:3000 ..."
npm run web &
web_pid=$!

echo "Frontend and API are running. Press Ctrl+C to stop both."

wait -n "${api_pid}" "${web_pid}"
exit_code=$?

if [[ ${exit_code} -ne 0 && ${exit_code} -ne 130 && ${exit_code} -ne 143 ]]; then
  echo "A development process exited with status ${exit_code}; stopping both." >&2
fi

exit "${exit_code}"
