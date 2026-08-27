#!/usr/bin/env bash
set -euo pipefail

repo_dir="${1:-$PWD}"
branch_name="${2:-feat/cloudflare-nvidia-operations-v10}"

if [[ ! -d "${repo_dir}/.git" ]]; then
  echo "repositório git não encontrado em ${repo_dir}"
  exit 1
fi

git -C "${repo_dir}" checkout -b "${branch_name}" 2>/dev/null || git -C "${repo_dir}" checkout "${branch_name}"
"$(dirname "$0")/apply-overlay.sh" "${repo_dir}"
git -C "${repo_dir}" add worker docs/CLOUDFLARE-NVIDIA-ARCHITECTURE.md api-client.js
git -C "${repo_dir}" commit -m "feat: add cloudflare worker and nvidia v10 layer"
git -C "${repo_dir}" push -u origin "${branch_name}"
