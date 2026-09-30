#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/home/icarogdo/dev/glauco-asked-ruby}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT/core/framework/ruby" "$ROOT/web" "$ROOT/native"
cp "$HERE/core/framework/glauco_asked_ruby.rb" "$ROOT/core/framework/glauco_asked_ruby.rb"
cp -r "$HERE/core/framework/ruby/." "$ROOT/core/framework/ruby/"
rm -rf "$ROOT/web/ruby-wasm-runtime"
cp -r "$HERE/web" "$ROOT/web/ruby-wasm-runtime"
rm -rf "$ROOT/native/ruby-webview-host"
cp -r "$HERE/native/ruby-webview-host" "$ROOT/native/ruby-webview-host"
mkdir -p "$ROOT/examples"
cp "$HERE/examples/belavista.rb" "$ROOT/examples/belavista.rb"

echo "Installed into $ROOT"
echo "Next: cd $ROOT/web/ruby-wasm-runtime && npm install && npm run build"
