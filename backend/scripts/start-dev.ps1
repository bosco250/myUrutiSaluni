# Development start script that kills port and starts server
param(
    [int]$Port = 4000
)

Write-Host "[START] Starting development server..." -ForegroundColor Cyan

# Kill any process using the port
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$killScript = Join-Path $scriptPath "kill-port.ps1"

if (Test-Path $killScript) {
    $portFreed = & $killScript -Port $Port -MaxWaitSeconds 3
    if (-not $portFreed) {
        Write-Host "[ERROR] Could not free port $Port. Exiting..." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "[WARN] kill-port.ps1 not found, skipping port cleanup" -ForegroundColor Yellow
}

# Only clean dist if it's corrupted (missing main.js)
$backendRoot = Split-Path -Parent $scriptPath
$distDir = Join-Path $backendRoot "dist"
$mainJs = Join-Path $distDir "main.js"

if ((Test-Path $distDir) -and (-not (Test-Path $mainJs))) {
    Write-Host "[INFO] dist/main.js missing - cleaning for fresh build..." -ForegroundColor DarkCyan
    $tsBuildInfo = Join-Path $distDir "tsconfig.tsbuildinfo"
    if (Test-Path $tsBuildInfo) {
        Remove-Item -Force $tsBuildInfo -ErrorAction SilentlyContinue
    }
    Remove-Item -Recurse -Force $distDir -ErrorAction SilentlyContinue
}

# Start the server
Write-Host "[START] Starting NestJS server on port $Port..." -ForegroundColor Green
nest start --watch
