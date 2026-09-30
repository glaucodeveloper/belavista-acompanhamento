param(
  [string]$Root = "F:\belavista-acompanhamento"
)

$ErrorActionPreference = "Stop"
$PidFile = Join-Path $Root ".runtime\system-model\pids.json"

if (-not (Test-Path $PidFile)) {
  Write-Host "[INFO] sem arquivo de PID."
  exit 0
}

$pids = Get-Content $PidFile -Raw | ConvertFrom-Json

foreach ($name in @("decision","llama")) {
  $pidValue = $pids.$name
  if ($pidValue) {
    $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host "[STOP] $name pid=$pidValue"
      Stop-Process -Id $proc.Id -Force
    }
  }
}

Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
Write-Host "[OK] system model parado."
