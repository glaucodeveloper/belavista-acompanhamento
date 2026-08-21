#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-${PORT:-8080}}"
export PORT
exec node server.mjs
