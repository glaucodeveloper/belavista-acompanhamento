param([string]$ProgramRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
$hostExe=Join-Path $PSScriptRoot 'native/ruby-webview-host/ruby-webview-host.exe'
$frontend=Join-Path $PSScriptRoot 'web/dist'
if(!(Test-Path -LiteralPath (Join-Path $frontend 'index.html'))){throw 'Compile o frontend com build-port.ps1 antes de iniciar.'}
try { $health=Invoke-RestMethod 'http://127.0.0.1:8080/api/health' -TimeoutSec 3 } catch {
 if(!(Test-Path -LiteralPath (Join-Path $ProgramRoot 'server.mjs'))){throw 'Programa original ausente. Informe -ProgramRoot com a pasta belavista-acompanhamento.'}
 Start-Process -FilePath (Get-Command node).Source -ArgumentList 'server.mjs' -WorkingDirectory $ProgramRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'backend.log') -RedirectStandardError (Join-Path $PSScriptRoot 'backend-error.log')
 for($i=0;$i -lt 40;$i++){try{$health=Invoke-RestMethod 'http://127.0.0.1:8080/api/health' -TimeoutSec 2;break}catch{Start-Sleep -Milliseconds 500}}
 if(!$health){throw 'O servidor do programa não iniciou; consulte backend-error.log.'}
}
$env:GLAUCO_APP_ID='alianca-park-ruby'
$env:GLAUCO_WEBVIEW_PORT='48770'
$env:GLAUCO_NVIDIA_ENV=Join-Path $ProgramRoot '.env'
& $hostExe $frontend
