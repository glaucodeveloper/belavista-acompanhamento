param(
  [string]$Root = "F:\belavista-acompanhamento",
  [int]$Parallel = 1
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$OpenJevRoot = Join-Path $Root "vendor\openjev"
$LlamaExe = Join-Path $OpenJevRoot "third_party\llama.cpp\b11056\llama-server.exe"
$Model = Join-Path $OpenJevRoot "models\MiniCPM5-2B-Q4_K_M.gguf"
$DecisionExe = Join-Path $OpenJevRoot "bin\decision-test.exe"
$RuntimeDir = Join-Path $Root ".runtime\system-model"
$LogDir = Join-Path $Root ".logs\system-model"
$PidFile = Join-Path $RuntimeDir "pids.json"

foreach ($p in @($LlamaExe,$Model,$DecisionExe)) {
  if (-not (Test-Path -LiteralPath $p)) {
    throw "Bundle incompleto: $p. Rode npm run system-model:install"
  }
}

New-Item -ItemType Directory -Force -Path $RuntimeDir,$LogDir | Out-Null

function Port-Open([int]$Port) {
  try {
    $client = [Net.Sockets.TcpClient]::new()
    $iar = $client.BeginConnect("127.0.0.1",$Port,$null,$null)
    $ok = $iar.AsyncWaitHandle.WaitOne(400)
    if ($ok -and $client.Connected) { $client.EndConnect($iar); $client.Dispose(); return $true }
    $client.Dispose()
  } catch {}
  return $false
}

function Wait-Health([string]$Url,[int]$Seconds=120) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    try {
      $r = Invoke-RestMethod $Url -TimeoutSec 3
      return $r
    } catch {
      Start-Sleep -Milliseconds 500
    }
  } while ((Get-Date) -lt $deadline)
  throw "Timeout aguardando $Url"
}

$pids = @{}

if (-not (Port-Open 18080)) {
  Write-Host "[START] llama-server :18080"
  $llamaOut = Join-Path $LogDir "llama.out.log"
  $llamaErr = Join-Path $LogDir "llama.err.log"

  $args = @(
    "-m",$Model,
    "-c","2048",
    "-b","512",
    "-ngl","99",
    "-np",[string]$Parallel,
    "--jinja",
    "--host","127.0.0.1",
    "--port","18080"
  )

  $p = Start-Process `
    -FilePath $LlamaExe `
    -ArgumentList $args `
    -WorkingDirectory $OpenJevRoot `
    -RedirectStandardOutput $llamaOut `
    -RedirectStandardError $llamaErr `
    -PassThru `
    -WindowStyle Hidden

  $pids.llama = $p.Id
} else {
  Write-Host "[SKIP] porta 18080 já está ocupada."
}

$llamaHealth = Wait-Health "http://127.0.0.1:18080/health" 180
Write-Host "[OK] llama :18080"

if (-not (Port-Open 8090)) {
  Write-Host "[START] OpenJEV Decision API :8090"
  $decisionOut = Join-Path $LogDir "decision.out.log"
  $decisionErr = Join-Path $LogDir "decision.err.log"

  $p = Start-Process `
    -FilePath $DecisionExe `
    -WorkingDirectory $OpenJevRoot `
    -RedirectStandardOutput $decisionOut `
    -RedirectStandardError $decisionErr `
    -PassThru `
    -WindowStyle Hidden

  $pids.decision = $p.Id
} else {
  Write-Host "[SKIP] porta 8090 já está ocupada."
}

$decisionHealth = Wait-Health "http://127.0.0.1:8090/health" 180

$pids.startedAt = (Get-Date).ToString("o")
$pids | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $PidFile -Encoding UTF8

Write-Host ""
Write-Host "[OK] system model local"
Write-Host ("  llama   :18080 ready")
Write-Host ("  OpenJEV :8090  ready={0} model={1}" -f $decisionHealth.ready,$decisionHealth.model)
Write-Host ("  Belavista :8080 permanece independente")
Write-Host ""
Write-Host "Teste:"
Write-Host "  `$env:BELAVISTA_OPENJEV_LIVE='1'"
Write-Host "  npm run test:operational:reality"
