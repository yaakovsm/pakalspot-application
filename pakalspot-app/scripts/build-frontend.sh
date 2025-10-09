#!/usr/bin/env bash
set -euo pipefail

# Build and push the frontend Nginx image
# Usage: ./scripts/build-frontend.sh [registry] [tag]

REGISTRY=${1:-"yaakovsm"}
TAG=${2:-"nginx"}

echo "Building frontend image: ${REGISTRY}/pakalspot-frontend:${TAG}"

cd Frontend
docker build -t "${REGISTRY}/pakalspot-frontend:${TAG}" .
docker push "${REGISTRY}/pakalspot-frontend:${TAG}"

echo "✅ Frontend image built and pushed successfully!"
echo "Image: ${REGISTRY}/pakalspot-frontend:${TAG}"
echo ""
echo "To deploy with Helm:"
echo "helm upgrade --install pakalspot ./pakalspot-chart -n pakalspot --create-namespace -f pakalspot-chart/values-development.yaml"
