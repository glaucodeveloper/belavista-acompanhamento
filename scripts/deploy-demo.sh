#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$PWD}"; ROOT="$(cd "$ROOT" && pwd)"; cd "$ROOT"

npm run check:demo
npm run build:demo

printf '\n[1/3] Publicando Worker real...\n'
npx wrangler deploy --config worker/wrangler.jsonc

printf '\n[2/3] Rodando bateria LIVE contra Worker/NVIDIA/GitHub/Firebase publicados...\n'
npm run test:live:story

printf '\n[3/3] Publicando Firebase Hosting somente depois da bateria live passar...\n'
npx firebase deploy --only hosting --config firebase.demo.json

printf '\nDemo publicada após E2E live aprovado.\n  /        página publicitária/leads\n  /admin   administração lite autenticada\n'
