#!/usr/bin/env bash
set -Eeuo pipefail

# Get the repository root (two levels up from scripts folder)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

# Start Veyqra with reload from the repository root
cd "${REPO_ROOT}"
exec npm run dev
