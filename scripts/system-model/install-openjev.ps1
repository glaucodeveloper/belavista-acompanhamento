param(
  [string]$Root = "F:\belavista-acompanhamento",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$OpenJevRepo = "https://github.com/axsh/openjev.git"
$OpenJevCommit = "65ae076b501b464f0180e43f574ab451bc918e20"

$LlamaBuild = "b11056"
$LlamaZip = "llama-b11056-bin-win-cuda-12.4-x64.zip"
$CudaZip = "cudart-llama-bin-win-cuda-12.4-x64.zip"
$LlamaReleaseBase = "https://github.com/ggml-org/llama.cpp/releases/download/$LlamaBuild"

$ModelName = "MiniCPM5-2B-Q4_K_M.gguf"
$ModelUrl = "https://huggingface.co/openbmb/MiniCPM5-2B-GGUF/resolve/2079a22f3beaa4e306449978533478fe0522f4b3/$ModelName"

$GoVersion = "1.27.1"
$GoZip = "go$GoVersion.windows-amd64.zip"
$GoUrl = "https://go.dev/dl/$GoZip"

$VendorRoot = Join-Path $Root "vendor"
$OpenJevRoot = Join-Path $VendorRoot "openjev"
$CacheRoot = Join-Path $Root ".cache\system-model"
$ToolsRoot = Join-Path $Root "vendor\tools"
$GoRoot = Join-Path $ToolsRoot "go"
$GoExeLocal = Join-Path $GoRoot "go\bin\go.exe"

function Section([string]$Text) {
  Write-Host ""
  Write-Host ("=" * 84)
  Write-Host $Text
  Write-Host ("=" * 84)
}

function Assert-Command([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Comando não encontrado: $Name" }
  return $cmd.Source
}

function Download-File {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$OutFile
  )

  if ((Test-Path -LiteralPath $OutFile) -and (Get-Item -LiteralPath $OutFile).Length -gt 0) {
    Write-Host "[CACHE] $OutFile"
    return
  }

  $dir = Split-Path -Parent $OutFile
  New-Item -ItemType Directory -Force -Path $dir | Out-Null

  $partial = "$OutFile.partial"
  Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue

  Write-Host "[DOWNLOAD] $Url"
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    & $curl.Source -L --fail --retry 4 --retry-delay 3 -o $partial $Url
    if ($LASTEXITCODE -ne 0) { throw "curl falhou para $Url" }
  } else {
    Invoke-WebRequest -Uri $Url -OutFile $partial -UseBasicParsing
  }

  if (-not (Test-Path -LiteralPath $partial) -or (Get-Item -LiteralPath $partial).Length -le 0) {
    throw "Download vazio: $Url"
  }

  Move-Item -LiteralPath $partial -Destination $OutFile -Force
}

function Expand-ZipFresh {
  param([string]$Zip,[string]$Destination)
  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Expand-Archive -LiteralPath $Zip -DestinationPath $Destination -Force
}

if (-not (Test-Path -LiteralPath $Root)) {
  throw "Projeto não encontrado: $Root"
}
if (-not (Test-Path -LiteralPath (Join-Path $Root "package.json"))) {
  throw "package.json não encontrado em $Root"
}

New-Item -ItemType Directory -Force -Path $VendorRoot,$CacheRoot,$ToolsRoot | Out-Null

Section "1/6 OpenJEV vendorizado dentro do projeto"
$git = Assert-Command "git"

if (-not (Test-Path -LiteralPath (Join-Path $OpenJevRoot ".git"))) {
  if (Test-Path -LiteralPath $OpenJevRoot) {
    if (-not $Force) {
      throw "$OpenJevRoot já existe e não é clone git. Use -Force para substituir."
    }
    Remove-Item -LiteralPath $OpenJevRoot -Recurse -Force
  }
  & $git clone --filter=blob:none $OpenJevRepo $OpenJevRoot
  if ($LASTEXITCODE -ne 0) { throw "git clone OpenJEV falhou." }
}

Push-Location $OpenJevRoot
try {
  $dirty = (& $git status --porcelain)
  if ($dirty -and -not $Force) {
    throw "vendor/openjev possui alterações locais. Use -Force somente se quiser descartá-las."
  }
  if ($dirty -and $Force) {
    & $git reset --hard
    & $git clean -fd
  }

  & $git fetch origin $OpenJevCommit --depth 1
  if ($LASTEXITCODE -ne 0) { throw "git fetch do commit OpenJEV falhou." }

  & $git checkout --detach $OpenJevCommit
  if ($LASTEXITCODE -ne 0) { throw "git checkout do commit OpenJEV falhou." }

  $head = (& $git rev-parse HEAD).Trim()
  if ($head -ne $OpenJevCommit) {
    throw "OpenJEV checkout incorreto: $head"
  }
  Write-Host "[OK] OpenJEV pin: $head"
}
finally {
  Pop-Location
}

Section "2/6 llama.cpp CUDA runtime local"
$llamaDest = Join-Path $OpenJevRoot "third_party\llama.cpp\$LlamaBuild"
$llamaExe = Join-Path $llamaDest "llama-server.exe"

if (-not (Test-Path -LiteralPath $llamaExe)) {
  $llamaZipPath = Join-Path $CacheRoot $LlamaZip
  $cudaZipPath = Join-Path $CacheRoot $CudaZip

  Download-File -Url "$LlamaReleaseBase/$LlamaZip" -OutFile $llamaZipPath
  Download-File -Url "$LlamaReleaseBase/$CudaZip" -OutFile $cudaZipPath

  $tmp = Join-Path $CacheRoot "llama-extract"
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null

  Expand-Archive -LiteralPath $llamaZipPath -DestinationPath $tmp -Force
  Expand-Archive -LiteralPath $cudaZipPath -DestinationPath $tmp -Force

  New-Item -ItemType Directory -Force -Path $llamaDest | Out-Null
  Get-ChildItem $tmp -Recurse -File | ForEach-Object {
    if ($_.Extension -in ".exe",".dll") {
      Copy-Item $_.FullName (Join-Path $llamaDest $_.Name) -Force
    }
  }

  if (-not (Test-Path -LiteralPath $llamaExe)) {
    throw "llama-server.exe não encontrado após extração."
  }
  Remove-Item $tmp -Recurse -Force
}
Write-Host "[OK] $llamaExe"

Section "3/6 MiniCPM5-2B GGUF local"
$modelDest = Join-Path $OpenJevRoot "models\$ModelName"
if (-not (Test-Path -LiteralPath $modelDest) -or (Get-Item $modelDest).Length -le 0) {
  $modelDir = Split-Path -Parent $modelDest
  New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
  $partial = "$modelDest.partial"
  Remove-Item $partial -Force -ErrorAction SilentlyContinue

  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if (-not $curl) { throw "curl.exe é necessário para baixar o modelo grande." }

  Write-Host "[DOWNLOAD MODEL] $ModelName"
  & $curl.Source -L --fail --retry 4 --retry-delay 5 -o $partial $ModelUrl
  if ($LASTEXITCODE -ne 0) { throw "Download do MiniCPM falhou." }
  if (-not (Test-Path $partial) -or (Get-Item $partial).Length -le 0) {
    throw "Modelo baixado está vazio."
  }
  Move-Item $partial $modelDest -Force
}
Write-Host ("[OK] modelo: {0:N2} GB" -f ((Get-Item $modelDest).Length / 1GB))

Section "4/6 Go local somente se necessário"
$goCmd = Get-Command go -ErrorAction SilentlyContinue
if ($goCmd) {
  $goExe = $goCmd.Source
  Write-Host "[OK] usando Go do PATH: $goExe"
} else {
  if (-not (Test-Path -LiteralPath $GoExeLocal)) {
    $goZipPath = Join-Path $CacheRoot $GoZip
    Download-File -Url $GoUrl -OutFile $goZipPath
    if (Test-Path $GoRoot) { Remove-Item $GoRoot -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $GoRoot | Out-Null
    Expand-Archive -LiteralPath $goZipPath -DestinationPath $GoRoot -Force
  }
  if (-not (Test-Path -LiteralPath $GoExeLocal)) {
    throw "Go portátil não encontrado em $GoExeLocal"
  }
  $goExe = $GoExeLocal
  Write-Host "[OK] usando Go portátil: $goExe"
}
& $goExe version

Section "5/6 Build da Decision API"
$decisionModule = Join-Path $OpenJevRoot "features\decision-test"
$binDir = Join-Path $OpenJevRoot "bin"
$decisionExe = Join-Path $binDir "decision-test.exe"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

Push-Location $decisionModule
try {
  & $goExe test ./...
  if ($LASTEXITCODE -ne 0) { throw "go test OpenJEV falhou." }

  & $goExe build -o $decisionExe ./cmd/decision-test
  if ($LASTEXITCODE -ne 0) { throw "go build OpenJEV falhou." }
}
finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $decisionExe)) {
  throw "decision-test.exe não foi gerado."
}
Write-Host "[OK] $decisionExe"

Section "6/6 Validação do bundle"
$settings = Join-Path $OpenJevRoot "settings\decision-test.yaml"
if (-not (Test-Path $settings)) { throw "settings/decision-test.yaml ausente." }

$required = @($llamaExe,$modelDest,$decisionExe,$settings)
foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Artefato ausente: $path" }
  Write-Host "[OK] $path"
}

Write-Host ""
Write-Host "Bundle pronto dentro do próprio projeto:"
Write-Host "  $OpenJevRoot"
Write-Host ""
Write-Host "Próximo:"
Write-Host "  npm run system-model:start"
Write-Host "  npm run system-model:health"
Write-Host "  `$env:BELAVISTA_OPENJEV_LIVE='1'"
Write-Host "  npm run test:operational:reality"
