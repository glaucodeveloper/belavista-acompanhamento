#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$PWD}"; ROOT="$(cd "$ROOT" && pwd)"; cd "$ROOT"
: "${GITHUB_PAT:?Exporte GITHUB_PAT com o PAT do repositório antes de executar.}"
printf '%s' "$GITHUB_PAT" | npx wrangler secret put GITHUB_PAT --config worker/wrangler.jsonc
if [[ -n "${NVIDIA_API_KEY:-}" ]]; then printf '%s' "$NVIDIA_API_KEY" | npx wrangler secret put NVIDIA_API_KEY --config worker/wrangler.jsonc; fi
if [[ -n "${BELAVISTA_API_TOKEN:-}" ]]; then printf '%s' "$BELAVISTA_API_TOKEN" | npx wrangler secret put BELAVISTA_API_TOKEN --config worker/wrangler.jsonc; fi
if [[ -n "${FIREBASE_DATABASE_AUTH:-}" ]]; then printf '%s' "$FIREBASE_DATABASE_AUTH" | npx wrangler secret put FIREBASE_DATABASE_AUTH --config worker/wrangler.jsonc; fi
echo "Secrets configurados. GITHUB_PAT nunca foi gravado em arquivo."
