param(
  [ValidateSet('desktop','android')]
  [string]$Target = 'desktop',
  [switch]$OpenAndroidStudio
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Example = Join-Path $Root 'examples\belavista.rb'
$RuntimeApp = Join-Path $Root 'web\public\ruby\application.rb'

Copy-Item -Force $Example $RuntimeApp
Write-Host "Example installed as runtime application: $RuntimeApp"

if ($Target -eq 'desktop') {
  & (Join-Path $PSScriptRoot 'build-desktop.ps1')
} else {
  & (Join-Path $PSScriptRoot 'build-android.ps1') -OpenAndroidStudio:$OpenAndroidStudio
}
