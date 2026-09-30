param(
  [string]$Root = "F:\belavista-acompanhamento"
)

$ErrorActionPreference = "Continue"

Write-Host "Belavista web :8080"
try {
  $r = Invoke-WebRequest "http://127.0.0.1:8080" -UseBasicParsing -TimeoutSec 3
  Write-Host "  HTTP $($r.StatusCode)"
} catch {
  Write-Host "  OFFLINE/indisponível"
}

Write-Host "llama-server :18080"
try {
  Invoke-RestMethod "http://127.0.0.1:18080/health" -TimeoutSec 4 | ConvertTo-Json -Depth 8
} catch {
  Write-Host "  OFFLINE"
}

Write-Host "OpenJEV :8090"
try {
  Invoke-RestMethod "http://127.0.0.1:8090/health" -TimeoutSec 4 | ConvertTo-Json -Depth 8
} catch {
  Write-Host "  OFFLINE"
}
