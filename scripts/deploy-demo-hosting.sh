#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$PWD}"
ROOT="$(cd "$ROOT" && pwd)"
PROJECT="${FIREBASE_PROJECT_ID:-belavista-3f887}"
cd "$ROOT"

npm run check:demo
npm run build:demo

printf '\nPublicando somente o Firebase Hosting da Demo Lite em %s...\n' "$PROJECT"
npx firebase deploy \
  --only hosting \
  --config firebase.demo.json \
  --project "$PROJECT"

printf '\nRotas publicadas:\n  /      página publicitária/leads\n  /admin administração lite autenticada\n'
