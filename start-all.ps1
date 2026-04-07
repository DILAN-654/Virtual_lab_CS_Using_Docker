<#
PowerShell helper to check Docker and bring up the compose stack.
Usage: .\start-all.ps1
#>
Write-Host "Running Docker diagnostic script (if present)..." -ForegroundColor Cyan
if (Test-Path .\docker-check.ps1) {
    try { .\docker-check.ps1 } catch { Write-Warning "docker-check.ps1 failed or returned warnings." }
} else {
    Write-Host "No docker-check.ps1 found; skipping diagnostic." -ForegroundColor Yellow
}

Write-Host "Building and starting services with docker-compose..." -ForegroundColor Cyan
docker-compose up -d --build

Start-Sleep -Seconds 4

Write-Host "Services status:" -ForegroundColor Green
docker-compose ps

Write-Host "Checking backend health endpoint..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri http://localhost:5000/api/health -Method Get -ErrorAction Stop
    Write-Host "Health: $($health.message) at $($health.timestamp)" -ForegroundColor Green
} catch {
    Write-Warning "Health endpoint not reachable. Check container logs: docker-compose logs backend"
}

Write-Host "Done." -ForegroundColor Cyan
