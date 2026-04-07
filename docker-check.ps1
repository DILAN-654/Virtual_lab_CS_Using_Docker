Write-Host ================= Docker Check ================
Write-Host Checking Docker installation...
Get-Command docker 2>$null
if ($?) { Write-Host Docker installed } else { Write-Host Docker NOT installed }

Write-Host Checking Docker daemon...
docker ps
Write-Host (if ($LASTEXITCODE -eq 0) { 'Daemon running' } else { 'Daemon NOT running' })

Write-Host "Note: Docker TCP port 2375 is NOT required (and enabling it is insecure)."
Write-Host "This project expects Docker to be accessible via the default engine socket/pipe."

Write-Host Checking Node.js...
Get-Command node 2>$null
if ($?) { Write-Host Node installed } else { Write-Host Node NOT installed }

Write-Host Listing Docker images...
docker images

Write-Host Checking backend env file...
Test-Path D:\MCA_MAIN_PROJECT\Project\backend\.env

Write-Host ================= COMPLETE =================
