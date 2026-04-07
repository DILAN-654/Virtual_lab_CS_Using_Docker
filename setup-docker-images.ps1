Write-Host Building Python runner image with common data packages
docker build -t vlw-runner-python:latest -f docker/runners/python/Dockerfile .

Write-Host Pulling fallback Python image
docker pull python:3.11-slim

Write-Host Pulling JavaScript runner image
docker pull node:20-alpine

Write-Host Pulling Java runner image
docker pull eclipse-temurin:21-jdk

Write-Host Pulling C and C++ runner image
docker pull gcc:13

Write-Host Pulling postgres image
docker pull postgres:13

Write-Host Done preparing runner images
