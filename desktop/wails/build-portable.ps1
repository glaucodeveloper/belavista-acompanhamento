param(
    [string]$OutputDirectory,
    [string]$GoExecutable
)

$ErrorActionPreference = 'Stop'
$wailsRoot = (Resolve-Path $PSScriptRoot).Path
$projectRoot = (Resolve-Path (Join-Path $wailsRoot '..\..')).Path
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $wailsRoot 'build\portable'
}
$portableRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
$resourceRoot = Join-Path $portableRoot 'resources'
$appRoot = Join-Path $resourceRoot 'app'

if (-not $GoExecutable) {
    $vendoredGo = Join-Path $projectRoot 'vendor\tools\go\go\bin\go.exe'
    if (Test-Path -LiteralPath $vendoredGo) {
        $GoExecutable = $vendoredGo
    } else {
        $GoExecutable = (Get-Command go.exe -ErrorAction Stop).Source
    }
}
$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$npmExecutable = (Get-Command npm.cmd -ErrorAction Stop).Source

$webviewApplications = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\EdgeWebView\Application'
if (-not (Test-Path -LiteralPath $webviewApplications)) {
    throw 'A x64 WebView2 runtime is required to assemble the portable Wails package.'
}
$webviewRuntime = Get-ChildItem -LiteralPath $webviewApplications -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending |
    Select-Object -First 1
if (-not $webviewRuntime) {
    throw 'Could not locate the installed x64 WebView2 runtime to bundle.'
}

New-Item -ItemType Directory -Force -Path $appRoot, (Join-Path $resourceRoot 'node'), (Join-Path $resourceRoot 'webview2') | Out-Null

$excludedNames = @(
    '.git', '.belavista-probe', '.cache', '.firebase', '.logs', '.runtime',
    'belavista-ui', 'capture', 'data', 'dist', 'dist-pages', 'mobile',
    'node_modules', 'output', 'test-results', 'tests', 'tmp', 'vendor',
    'video', 'work', 'cash-attachments', 'outsourcing', 'receipts', 'sales',
    'service-request-files', 'workbench-attachments'
)
$excludedPaths = @($excludedNames | ForEach-Object { Join-Path $projectRoot $_ })
$excludedPaths += $wailsRoot
$copyArgs = @(
    $projectRoot, $appRoot, '/E', '/R:2', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
    '/XD'
) + $excludedPaths + @('/XF', '.env', '*.sqlite', '*.sqlite-wal', '*.sqlite-shm')
& robocopy @copyArgs
if ($LASTEXITCODE -gt 7) {
    throw "Copying original application files failed (robocopy exit $LASTEXITCODE)."
}

& $npmExecutable ci --omit=dev --prefix $appRoot
if ($LASTEXITCODE -ne 0) {
    throw "Installing production-only Node dependencies failed (npm exit $LASTEXITCODE)."
}

$nodeTarget = Join-Path $resourceRoot 'node'
& robocopy (Split-Path $nodeExecutable -Parent) $nodeTarget /E /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -gt 7) {
    throw "Bundling Node.js failed (robocopy exit $LASTEXITCODE)."
}

$pythonVersion = '3.14.8'
$pythonArchive = Join-Path ([System.IO.Path]::GetTempPath()) "python-$pythonVersion-embed-amd64.zip"
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonArchive
$pythonRoot = Join-Path $appRoot 'runtime\python'
New-Item -ItemType Directory -Force -Path $pythonRoot | Out-Null
Expand-Archive -LiteralPath $pythonArchive -DestinationPath $pythonRoot -Force
Remove-Item -LiteralPath $pythonArchive -Force

$webviewTarget = Join-Path $resourceRoot 'webview2'
& robocopy $webviewRuntime.FullName $webviewTarget /E /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -gt 7) {
    throw "Bundling fixed WebView2 failed (robocopy exit $LASTEXITCODE)."
}
foreach ($runtimeLibrary in @('msvcp140.dll', 'msvcp140_codecvt_ids.dll', 'vcruntime140.dll', 'vcruntime140_1.dll')) {
    $runtimeLibraryPath = Join-Path $webviewTarget $runtimeLibrary
    if (Test-Path -LiteralPath $runtimeLibraryPath) {
        Copy-Item -LiteralPath $runtimeLibraryPath -Destination (Join-Path $nodeTarget $runtimeLibrary) -Force
    }
}

$appExecutable = Join-Path $portableRoot 'AliancaPark.exe'
& $GoExecutable build -tags desktop,production -ldflags '-w -s -H windowsgui' -o $appExecutable .
if ($LASTEXITCODE -ne 0) {
    throw "Building the Wails application failed (go exit $LASTEXITCODE)."
}

Write-Output "Portable application assembled at $portableRoot"
