param([switch]$Android)
$ErrorActionPreference='Stop'
Push-Location (Join-Path $PSScriptRoot 'web')
try {
 & npm.cmd ci
 if($LASTEXITCODE -ne 0){throw 'npm ci falhou'}
 & npm.cmd run build
 if($LASTEXITCODE -ne 0){throw 'Vite falhou'}
 if($Android){
  if(!(Test-Path 'android')){& npx.cmd cap add android;if($LASTEXITCODE -ne 0){throw 'Capacitor add falhou'}}
  & npx.cmd cap sync android
  if($LASTEXITCODE -ne 0){throw 'Capacitor sync falhou'}
  Push-Location android
  try {& .\gradlew.bat assembleDebug;if($LASTEXITCODE -ne 0){throw 'Gradle falhou'}} finally {Pop-Location}
 }
} finally {Pop-Location}
