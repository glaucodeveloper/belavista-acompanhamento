param(
  [Parameter(Mandatory=$true)]
  [string]$ZipPath,

  [string]$RepoRoot = "$env:USERPROFILE\dev\glauco-asked-ruby",

  [string]$ExtractRoot = "$env:TEMP\glauco-ruby-reboot"
)

$ErrorActionPreference = 'Stop'
$ZipPath = (Resolve-Path $ZipPath).Path

if (Test-Path $ExtractRoot) { Remove-Item -Recurse -Force $ExtractRoot }
New-Item -ItemType Directory -Force -Path $ExtractRoot | Out-Null

Write-Host "Extracting $ZipPath -> $ExtractRoot"
Expand-Archive -Path $ZipPath -DestinationPath $ExtractRoot -Force

$Package = Get-ChildItem -Path $ExtractRoot -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName 'scripts\windows\install-into-repo.ps1') } |
  Select-Object -First 1

if (-not $Package) {
  throw 'Could not find the reboot package after extraction.'
}

$Installer = Join-Path $Package.FullName 'scripts\windows\install-into-repo.ps1'
& $Installer -RepoRoot $RepoRoot

Write-Host ""
Write-Host 'To run the packaged example directly from the extracted package:'
Write-Host "  & `"$(Join-Path $Package.FullName 'scripts\windows\run-example.ps1')`" -Target desktop"
