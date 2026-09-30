param(
  [switch]$OpenAndroidStudio,
  [switch]$NoInstall
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Web = Join-Path $Root 'web'

function Require-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name not found. $Hint"
  }
}

Require-Command node 'Install Node.js LTS.'
Require-Command npm 'Install Node.js LTS.'
Require-Command npx 'Install Node.js LTS.'

Push-Location $Web
try {
  if (-not $NoInstall) { npm install }
  npm run build

  if (-not (Test-Path (Join-Path $Web 'android'))) {
    npx cap add android
    if ($LASTEXITCODE -ne 0) { throw 'npx cap add android failed' }
  }

  npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'npx cap sync android failed' }

  Write-Host "Android project ready: $(Join-Path $Web 'android')"
  if ($OpenAndroidStudio) {
    npx cap open android
  }
} finally {
  Pop-Location
}
