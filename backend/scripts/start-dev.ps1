# Development start script that kills port and starts server
param(
    [int]$Port = 4000
)

Write-Host "🚀 Starting development server..." -ForegroundColor Cyan

# Kill any process using the port and wait until it's free
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$killScript = Join-Path $scriptPath "kill-port.ps1"

if (Test-Path $killScript) {
    $portFreed = & $killScript -Port $Port -MaxWaitSeconds 5
    if (-not $portFreed) {
        Write-Host "❌ Could not free port $Port. Exiting..." -ForegroundColor Red
        exit 1
    }
    # Extra wait to ensure port is fully released
    Start-Sleep -Milliseconds 500
} else {
    Write-Host "⚠️  kill-port.ps1 not found, skipping port cleanup" -ForegroundColor Yellow
}

# Start the server
Write-Host "🚀 Starting NestJS server on port $Port..." -ForegroundColor Green
nest start --watch

