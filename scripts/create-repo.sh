#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-belavista-acompanhamento}"
VISIBILITY="${2:-private}" # private | public | internal

if ! command -v gh >/dev/null 2>&1; then
  echo "Erro: GitHub CLI (gh) não encontrado. Instale em https://cli.github.com/" >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "Erro: git não encontrado." >&2
  exit 1
fi

# Autenticação recomendada: SSH para Git; gh pode usar login existente.
if ! gh auth status >/dev/null 2>&1; then
  echo "Autentique o GitHub CLI. Escolha GitHub.com e protocolo SSH:"
  gh auth login --hostname github.com --git-protocol ssh --web
fi

gh config set git_protocol ssh --host github.com

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "chore: initial Belavista AI monitoring prototype"
fi

OWNER="$(gh api user --jq .login)"
if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repositório $OWNER/$REPO_NAME já existe."
  git remote remove origin 2>/dev/null || true
  git remote add origin "git@github.com:$OWNER/$REPO_NAME.git"
else
  gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push
fi

git branch -M main
if ! git ls-remote --exit-code origin >/dev/null 2>&1; then
  echo "Aviso: remoto configurado, mas não foi possível consultar via SSH." >&2
fi

echo "Pronto: git@github.com:$OWNER/$REPO_NAME.git"
