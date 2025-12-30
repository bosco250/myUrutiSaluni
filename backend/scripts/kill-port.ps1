# Script to kill process using a specific port and wait until it's free
param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$MaxWaitSeconds = 3
)

Write-Host "[CHECK] Checking for processes using port $Port..." -ForegroundColor Yellow

function Test-PortFree {
    param([int]$Port)
    $result = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
    return $null -eq $result
}

# Quick check - if port is already free, return immediately
if (Test-PortFree -Port $Port) {
    Write-Host "[OK] Port $Port is free!" -ForegroundColor Green
    return $true
}

# Try to kill processes on the port
$processes = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"

if ($processes) {
    $pids = $processes | ForEach-Object {
        $_.Line -match '\s+(\d+)$'
        if ($matches) { $matches[1] }
    } | Select-Object -Unique

    foreach ($processId in $pids) {
        if ($processId) {
            Write-Host "[KILL] Killing process with PID: $processId" -ForegroundColor Red
            taskkill /F /PID $processId 2>&1 | Out-Null
        }
    }
    
    # Wait for port to be released
    $waitTime = 0
    $checkInterval = 100  # Check every 100ms (faster)
    
    while (-not (Test-PortFree -Port $Port) -and $waitTime -lt ($MaxWaitSeconds * 1000)) {
        Start-Sleep -Milliseconds $checkInterval
        $waitTime += $checkInterval
    }
    
    if (Test-PortFree -Port $Port) {
        Write-Host "[OK] Port $Port is now free!" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[ERROR] Port $Port still in use after $MaxWaitSeconds seconds" -ForegroundColor Red
        return $false
    }
}

return $true
