#!/bin/bash

# Local deployment script for testing Kubernetes deployment
# Usage: ./scripts/deploy-local.sh [registry] [tag]

set -e

REGISTRY=${1:-yaakovsm}
TAG=${2:-nginx}

echo "Building and deploying PakalSpot to local Kubernetes..."
echo "Registry: $REGISTRY"
echo "Tag: $TAG"

# Build frontend image
echo "Building frontend image..."
cd Frontend
docker build -t $REGISTRY/pakalspot-frontend:$TAG .
docker push $REGISTRY/pakalspot-frontend:$TAG
cd ..

# Build backend image
echo "Building backend image..."
cd Backend
docker build -t $REGISTRY/pakalspot-backend:latest .
docker push $REGISTRY/pakalspot-backend:latest
cd ..

# Deploy with Helm
echo "Deploying with Helm..."
helm upgrade --install pakalspot ../pakalspot-chart \
  -n pakalspot --create-namespace \
  -f ../pakalspot-chart/values.yaml \
  --set frontend.image.repository=$REGISTRY/pakalspot-frontend \
  --set frontend.image.tag=$TAG \
  --set backend.image.repository=$REGISTRY/pakalspot-backend \
  --set backend.image.tag=latest \
  --set frontend.envRuntime.GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" \
  --set backend.secrets.S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
  --set backend.secrets.S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
  --set backend.secrets.S3_ENDPOINT="https://s3.amazonaws.com"

echo "Deployment complete!"
echo "Check status with: kubectl -n pakalspot get pods,svc,ep"
echo "Port forward with: kubectl -n pakalspot port-forward svc/pakalspot-pakalspot-chart-frontend 8080:80"
