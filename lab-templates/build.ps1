Param()
$ErrorActionPreference = 'Stop'
$baseTag = 'virtual-lab'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Building lab template images..."

docker build -t "$baseTag/python-dev:latest" "$root\python-dev"
docker build -t "$baseTag/node-dev:latest" "$root\node-dev"
docker build -t "$baseTag/network-minimal:latest" "$root\network-minimal"

Write-Host "Build complete. Images:"
docker images --filter "reference=$baseTag/*"
