#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$PWD}"
ROOT="$(cd "$ROOT" && pwd)"
cd "$ROOT"

: "${BELAVISTA_WORKER_URL:=https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev}"
: "${BELAVISTA_PUBLIC_BASE_URL:=https://belavista-3f887.web.app}"
: "${FIREBASE_DATABASE_URL:=https://belavista-3f887-default-rtdb.firebaseio.com}"
export BELAVISTA_WORKER_URL BELAVISTA_PUBLIC_BASE_URL FIREBASE_DATABASE_URL

if [[ -z "${BELAVISTA_API_TOKEN:-}" && -z "${BELAVISTA_ADMIN_ID_TOKEN:-}" && ( -z "${BELAVISTA_TEST_EMAIL:-}" || -z "${BELAVISTA_TEST_PASSWORD:-}" ) ]]; then
  cat >&2 <<'EOF'
[ERRO] A história live precisa autenticar rotas administrativas.
Use UMA destas opções:

  export BELAVISTA_API_TOKEN='...'

ou

  export BELAVISTA_ADMIN_ID_TOKEN='...'

ou

  export BELAVISTA_TEST_EMAIL='admin@...'
  export BELAVISTA_TEST_PASSWORD='...'

Nenhuma credencial é gravada pelo script.
EOF
  exit 2
fi

printf '\nLIVE E2E — sem mocks, sem motor local\n'
printf 'Worker   : %s\n' "$BELAVISTA_WORKER_URL"
printf 'Hosting  : %s\n' "$BELAVISTA_PUBLIC_BASE_URL"
printf 'Firebase : %s\n\n' "$FIREBASE_DATABASE_URL"

node worker/test/live/obra-completa.live.mjs
