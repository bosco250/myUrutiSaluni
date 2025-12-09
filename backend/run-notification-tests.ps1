# PowerShell script to test notification system
# Run with: .\run-notification-tests.ps1

Write-Host "🧪 Testing Notification System..." -ForegroundColor Cyan
Write-Host ""

# Check if backend server is running
Write-Host "1. Checking if backend server is running..." -ForegroundColor Yellow
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend server is running" -ForegroundColor Green
        $serverRunning = $true
    }
} catch {
    Write-Host "   ❌ Backend server is not running or not accessible" -ForegroundColor Red
    Write-Host "   Please start the server with: npm run start:dev" -ForegroundColor Yellow
}

if (-not $serverRunning) {
    Write-Host ""
    Write-Host "⚠️  Cannot proceed with API tests. Please start the backend server first." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Testing API endpoints..." -ForegroundColor Yellow
Write-Host "   Note: These tests require authentication. Please provide a valid JWT token." -ForegroundColor Gray
Write-Host ""

# Prompt for token
$token = Read-Host "Enter your JWT token (or press Enter to skip authenticated tests)"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "   ⚠️  Skipping authenticated endpoint tests" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✅ Basic server check passed" -ForegroundColor Green
    Write-Host ""
    Write-Host "To test authenticated endpoints:" -ForegroundColor Cyan
    Write-Host "1. Login to the application" -ForegroundColor White
    Write-Host "2. Get your JWT token from browser localStorage or DevTools" -ForegroundColor White
    Write-Host "3. Run this script again with the token" -ForegroundColor White
    exit 0
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Get unread count
Write-Host "   Testing GET /api/notifications/unread-count..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/notifications/unread-count" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   ✅ Unread count: $($response.count)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get notifications
Write-Host "   Testing GET /api/notifications..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/notifications?limit=5" -Method GET -Headers $headers -ErrorAction Stop
    $count = if ($response.data) { $response.data.Count } else { $response.Count }
    Write-Host "   ✅ Retrieved $count notifications" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get preferences
Write-Host "   Testing GET /api/notifications/preferences..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/notifications/preferences" -Method GET -Headers $headers -ErrorAction Stop
    $count = if ($response -is [Array]) { $response.Count } else { 0 }
    Write-Host "   ✅ Retrieved $count preferences" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ API tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test in browser: Login and check notification bell" -ForegroundColor White
Write-Host "2. Create test events (appointment, sale, etc.)" -ForegroundColor White
Write-Host "3. Verify notifications appear in bell and /notifications page" -ForegroundColor White

