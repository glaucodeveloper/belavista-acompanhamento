#!/usr/bin/env bash
set -euo pipefail

target_dir="${1:-}"

if [[ -z "${target_dir}" ]]; then
  echo "uso: ./apply-overlay.sh /caminho/do/belavista-ai-monitor"
  exit 1
fi

mkdir -p "${target_dir}/worker" "${target_dir}/docs"
cp -R worker/. "${target_dir}/worker/"
cp -f docs/CLOUDFLARE-NVIDIA-ARCHITECTURE.md "${target_dir}/docs/"
cp -f api-client.js "${target_dir}/api-client.js"
echo "Overlay Cloudflare + NVIDIA aplicado em ${target_dir}"
