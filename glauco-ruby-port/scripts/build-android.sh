#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE/web"

npm install
npm run build
if [[ ! -d android ]]; then
  npx cap add android
fi
npx cap sync android

echo "Android project ready: $HERE/web/android"
echo "Open with: cd $HERE/web && npx cap open android"
echo "To enable native generative inference, attach android-plugin/RubyModelPlugin.kt.template to llama.cpp examples/llama.android."
