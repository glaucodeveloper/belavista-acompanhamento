param(
  [Parameter(Mandatory=$true)]
  [string]$Url,

  [string]$RepoRoot = "$env:USERPROFILE\dev\glauco-asked-ruby",

  [string]$DownloadPath = "$env:TEMP\glauco-ruby-wasm-capacitor-reboot.zip"
)

$ErrorActionPreference = 'Stop'
$Here = $PSScriptRoot

Write-Host "Downloading: $Url"
Invoke-WebRequest -Uri $Url -OutFile $DownloadPath -UseBasicParsing

$Unpack = Join-Path $Here 'unzip-and-install.ps1'
& $Unpack -ZipPath $DownloadPath -RepoRoot $RepoRoot
