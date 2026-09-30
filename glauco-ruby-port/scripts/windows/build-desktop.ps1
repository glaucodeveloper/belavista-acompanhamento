param(
  [switch]$NoInstall
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Web = Join-Path $Root 'web'
$Manifest = Join-Path $Root 'native\ruby-webview-host\Cargo.toml'

function Require-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name not found. $Hint"
  }
}

Require-Command node 'Install Node.js LTS.'
Require-Command npm 'Install Node.js LTS.'
Require-Command cargo 'Install Rust with rustup and the MSVC toolchain.'

Push-Location $Web
try {
  if (-not $NoInstall) { npm install }
  npm run build
} finally {
  Pop-Location
}

cargo build --release --manifest-path $Manifest
if ($LASTEXITCODE -ne 0) { throw 'cargo build failed' }

$Exe = Join-Path $Root 'native\ruby-webview-host\target\release\ruby-webview-host.exe'
$Index = Join-Path $Root 'web\dist\index.html'

if (-not (Test-Path $Exe)) { throw "Host not found: $Exe" }
if (-not (Test-Path $Index)) { throw "Frontend not found: $Index" }

Write-Host "Starting desktop host..."
& $Exe $Index
