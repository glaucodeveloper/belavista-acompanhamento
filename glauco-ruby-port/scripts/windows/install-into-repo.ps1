param(
  [string]$RepoRoot = "$env:USERPROFILE\dev\glauco-asked-ruby"
)

$ErrorActionPreference = 'Stop'
$PackageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)

Write-Host "[Glauco Ruby] Package: $PackageRoot"
Write-Host "[Glauco Ruby] Repo:    $RepoRoot"

$dirs = @(
  (Join-Path $RepoRoot 'core\framework\ruby'),
  (Join-Path $RepoRoot 'web'),
  (Join-Path $RepoRoot 'native'),
  (Join-Path $RepoRoot 'examples')
)
New-Item -ItemType Directory -Force -Path $dirs | Out-Null

Copy-Item -Force (Join-Path $PackageRoot 'core\framework\glauco_asked_ruby.rb') (Join-Path $RepoRoot 'core\framework\glauco_asked_ruby.rb')
Copy-Item -Recurse -Force (Join-Path $PackageRoot 'core\framework\ruby\*') (Join-Path $RepoRoot 'core\framework\ruby')

$WebTarget = Join-Path $RepoRoot 'web\ruby-wasm-runtime'
if (Test-Path $WebTarget) { Remove-Item -Recurse -Force $WebTarget }
Copy-Item -Recurse -Force (Join-Path $PackageRoot 'web') $WebTarget

$NativeTarget = Join-Path $RepoRoot 'native\ruby-webview-host'
if (Test-Path $NativeTarget) { Remove-Item -Recurse -Force $NativeTarget }
Copy-Item -Recurse -Force (Join-Path $PackageRoot 'native\ruby-webview-host') $NativeTarget

Copy-Item -Force (Join-Path $PackageRoot 'examples\belavista.rb') (Join-Path $RepoRoot 'examples\belavista.rb')
Copy-Item -Force (Join-Path $PackageRoot 'examples\windows_example.rb') (Join-Path $RepoRoot 'examples\windows_example.rb')

Write-Host ""
Write-Host "Installed into $RepoRoot"
Write-Host "Next:"
Write-Host "  cd `"$RepoRoot\web\ruby-wasm-runtime`""
Write-Host "  npm install"
Write-Host "  npm run build"
