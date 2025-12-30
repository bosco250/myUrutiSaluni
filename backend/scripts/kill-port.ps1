# Script to kill process using a specific port and wait until it's free
param(
    [Parameter(Mandatory=$true)]
    [int]$Port,
    [int]$MaxWaitSeconds = 5
)

Write-Host "🔍 Checking for processes using port $Port..." -ForegroundColor Yellow

function Test-PortFree {
    param([int]$Port)
    $result = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    return $null -eq $result
}

# Try to kill processes on the port
$attempts = 0
$maxAttempts = 3

while ($attempts -lt $maxAttempts) {
    $processes = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    
    if ($processes) {
        $pids = $processes | ForEach-Object {
            $_.Line -match '\s+(\d+)$'
            if ($matches) {
                $matches[1]
            }
        } | Select-Object -Unique

        foreach ($pid in $pids) {
            if ($pid) {
                Write-Host "🛑 Killing process with PID: $pid" -ForegroundColor Red
                taskkill /F /PID $pid 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Successfully killed process $pid" -ForegroundColor Green
                } else {
                    Write-Host "⚠️  Could not kill process $pid (may have already exited)" -ForegroundColor Yellow
                }
            }
        }
        
        # Wait for port to be released
        Write-Host "⏳ Waiting for port $Port to be released..." -ForegroundColor Yellow
        $waitTime = 0
        $checkInterval = 200  # Check every 200ms
        
        while (-not (Test-PortFree -Port $Port) -and $waitTime -lt ($MaxWaitSeconds * 1000)) {
            Start-Sleep -Milliseconds $checkInterval
            $waitTime += $checkInterval
        }
        
        if (Test-PortFree -Port $Port) {
            Write-Host "✅ Port $Port is now free!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  Port $Port still in use after $MaxWaitSeconds seconds, retrying..." -ForegroundColor Yellow
            $attempts++
        }
    } else {
        Write-Host "✅ Port $Port is free!" -ForegroundColor Green
        return $true
    }
}

Write-Host "❌ Failed to free port $Port after $maxAttempts attempts" -ForegroundColor Red
return $false

