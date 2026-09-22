#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$PWD}"
ROOT="$(cd "$ROOT" && pwd)"
PROJECT="${FIREBASE_PROJECT_ID:-belavista-3f887}"
cd "$ROOT"

npm run build:demo

cat <<MSG

Demo pronta para execução local usando o mesmo roteamento do Firebase Hosting.

  Página pública : http://127.0.0.1:5000/
  Admin Lite     : http://127.0.0.1:5000/admin
  Firebase       : $PROJECT
  Worker remoto  : https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev

O frontend local continuará chamando o Worker público configurado no build.
Ctrl+C encerra o Hosting Emulator.

MSG

exec npx firebase emulators:start \
  --only hosting \
  --config firebase.demo.json \
  --project "$PROJECT"
