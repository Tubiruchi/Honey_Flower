param([string]$SdkPath = $env:ANDROID_HOME, [string]$JdkPath = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $SdkPath) { $SdkPath = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android/Sdk' }
if (-not $JdkPath) { $JdkPath = 'C:/Program Files/Android/Android Studio/jbr' }
if (-not (Test-Path -LiteralPath (Join-Path $SdkPath 'platform-tools/adb.exe'))) { throw 'No se encontró el SDK Android. Indica -SdkPath.' }
if (-not (Test-Path -LiteralPath (Join-Path $JdkPath 'bin/java.exe'))) { throw 'No se encontró Java 21. Indica -JdkPath.' }
$env:JAVA_HOME = $JdkPath
$env:ANDROID_HOME = $SdkPath
Push-Location -LiteralPath $projectRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación web.' }
    if (-not (Test-Path -LiteralPath './apps/mobile/android/gradlew.bat')) {
        & npm.cmd run android:add
        if ($LASTEXITCODE -ne 0) { throw 'Falló la creación de Android.' }
    }
    & npm.cmd run android:sync --workspace '@honeyflower/mobile'
    if ($LASTEXITCODE -ne 0) { throw 'Falló la copia de recursos Android.' }
    Set-Content -LiteralPath './apps/mobile/android/local.properties' -Value ('sdk.dir=' + $SdkPath.Replace('\', '/')) -Encoding ascii
    Push-Location -LiteralPath './apps/mobile/android'
    try { & ./gradlew.bat assembleDebug --no-daemon --console=plain; if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de la APK.' } }
    finally { Pop-Location }
    $destination = Join-Path $projectRoot 'artifacts/android'
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    $apk = Join-Path $destination 'HoneyFlower-0.2.0-prueba.apk'
    Copy-Item -LiteralPath './apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk' -Destination $apk -Force
    $signer = Get-ChildItem -LiteralPath (Join-Path $SdkPath 'build-tools') -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $signer) { throw 'No se encontró apksigner en Android Build Tools.' }
    & $signer verify --verbose $apk
    if ($LASTEXITCODE -ne 0) { throw 'La firma de la APK no es válida.' }
    $hashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
    $apkStream = [System.IO.File]::OpenRead($apk)
    try { $checksum = ([BitConverter]::ToString($hashAlgorithm.ComputeHash($apkStream))).Replace('-', '').ToLowerInvariant() }
    finally { $apkStream.Dispose(); $hashAlgorithm.Dispose() }
    Set-Content -LiteralPath ($apk + '.sha256') -Value ($checksum + '  ' + [IO.Path]::GetFileName($apk)) -Encoding ascii
    Write-Output "APK lista: $apk"
    Write-Output "SHA-256: $checksum"
} finally { Pop-Location }
