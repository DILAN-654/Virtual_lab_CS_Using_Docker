# PowerShell script to start backend and run tests
Write-Host "Starting Backend Server..." -ForegroundColor Cyan

# Start backend in background
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node server.js
}

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Check if backend is running
$maxAttempts = 10
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts -and -not $backendReady) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        $backendReady = $true
        Write-Host "✅ Backend is running!" -ForegroundColor Green
    } catch {
        $attempt++
        Write-Host "   Attempt $attempt/$maxAttempts - Backend not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if ($backendReady) {
    Write-Host "`nRunning tests..." -ForegroundColor Cyan
    node test-simple.js
    
    Write-Host "`nStopping backend..." -ForegroundColor Yellow
    Stop-Job $backendJob
    Remove-Job $backendJob
} else {
    Write-Host "`n❌ Backend failed to start. Check for errors above." -ForegroundColor Red
    Stop-Job $backendJob
    Remove-Job $backendJob
    exit 1
}

