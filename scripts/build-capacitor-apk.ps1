$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$capacitorRoot = Join-Path $repoRoot 'mobile\capacitor'

$sdkCandidates = @()
if ($env:ANDROID_HOME) { $sdkCandidates += $env:ANDROID_HOME }
if ($env:ANDROID_SDK_ROOT) { $sdkCandidates += $env:ANDROID_SDK_ROOT }
$sdkCandidates += 'C:\Android\Sdk'
if ($env:LOCALAPPDATA) { $sdkCandidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk') }

$sdkHome = $sdkCandidates |
    Select-Object -Unique |
    Where-Object {
        (Test-Path -LiteralPath (Join-Path $_ 'platform-tools')) -and
        (Test-Path -LiteralPath (Join-Path $_ 'platforms'))
    } |
    Select-Object -First 1

if (-not $sdkHome) {
    throw 'Android SDK não encontrado. Instale o SDK ou defina ANDROID_HOME antes de gerar o APK.'
}

$env:ANDROID_HOME = $sdkHome
$env:ANDROID_SDK_ROOT = $sdkHome
Write-Output "Android SDK: $sdkHome"

function Get-JavaMajorVersion([string] $javaHome) {
    if ([string]::IsNullOrWhiteSpace($javaHome)) { return 0 }
    $javaExe = Join-Path $javaHome 'bin\java.exe'
    if (-not (Test-Path -LiteralPath $javaExe)) { return 0 }
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $versionOutput = (& $javaExe -version 2>&1 | Out-String)
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($versionOutput -match 'version "(?<major>\d+)') {
        return [int]$Matches.major
    }
    return 0
}

$javaCandidates = @()
if ($env:JAVA_HOME) { $javaCandidates += $env:JAVA_HOME }
$javaCandidates += Get-ChildItem 'C:\Program Files\Eclipse Adoptium\jdk-21*' -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
$javaCandidates += Get-ChildItem 'C:\Program Files\Java\jdk-21*' -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
$javaCandidates += Get-ChildItem (Join-Path $env:TEMP 'temurin21\jdk-*') -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName

$javaHome = $javaCandidates |
    Where-Object { (Get-JavaMajorVersion $_) -ge 21 -and (Get-JavaMajorVersion $_) -lt 26 } |
    Select-Object -First 1

if (-not $javaHome) {
    throw 'JDK 21-25 não encontrado. Instale um JDK 21 e defina JAVA_HOME antes de gerar o APK.'
}

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"

Push-Location $capacitorRoot
try {
    & npm run cap:sync
    if ($LASTEXITCODE -ne 0) { throw "Capacitor sync falhou ($LASTEXITCODE)." }

    Push-Location (Join-Path $capacitorRoot 'android')
    try {
        # Recria o APK do zero: builds incrementais podem deixar bytes de
        # assets removidos no arquivo final mesmo após o `cap sync`.
        & .\gradlew.bat clean assembleDebug --no-daemon
        if ($LASTEXITCODE -ne 0) { throw "Gradle falhou ($LASTEXITCODE)." }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

$apk = Join-Path $capacitorRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
Write-Output "APK gerado: $apk"
