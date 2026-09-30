#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE/web"
npm install
npm run build
cd "$HERE"
cargo build --release --manifest-path native/ruby-webview-host/Cargo.toml
exec native/ruby-webview-host/target/release/ruby-webview-host "$HERE/web/dist/index.html"
