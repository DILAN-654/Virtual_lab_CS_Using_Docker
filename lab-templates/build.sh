#!/usr/bin/env bash
set -euo pipefail

BASE_TAG="virtual-lab"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building lab template images..."

docker build -t ${BASE_TAG}/python-dev:latest ${ROOT_DIR}/python-dev
docker build -t ${BASE_TAG}/node-dev:latest ${ROOT_DIR}/node-dev
docker build -t ${BASE_TAG}/network-minimal:latest ${ROOT_DIR}/network-minimal

echo "Build complete. Images:"
docker images --filter=reference="${BASE_TAG}/*"
