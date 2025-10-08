#!/bin/bash

# Deploy PakalSpot to Kubernetes using Helm
# This script demonstrates the deployment process for development environment

set -e

# Configuration
NAMESPACE="pakalspot"
CHART_PATH="./pakalspot-chart"
VALUES_FILE="values-development.yaml"

echo "🚀 Deploying PakalSpot to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo "❌ helm is not installed or not in PATH"
    exit 1
fi

# Check if the secrets exist
echo "🔍 Checking for required secrets..."
if ! kubectl get secret pakalspot-secrets -n $NAMESPACE &> /dev/null; then
    echo "❌ Secret 'pakalspot-secrets' not found in namespace '$NAMESPACE'"
    echo "   Please ensure the CI/CD pipeline has created the secrets:"
    echo "   kubectl create secret generic pakalspot-secrets \\"
    echo "     --from-literal=MAPS_API_KEY=\$MAPS_API_KEY \\"
    echo "     --from-literal=S3_ACCESS_KEY=\$S3_ACCESS_KEY \\"
    echo "     --from-literal=S3_SECRET_KEY=\$S3_SECRET_KEY \\"
    echo "     --from-literal=SECRET_KEY=\$SECRET_KEY \\"
    echo "     --from-literal=DB_URL=\$DB_URL \\"
    echo "     --namespace=$NAMESPACE"
    exit 1
fi

echo "✅ Required secrets found"

# Deploy using Helm
echo "📦 Deploying with Helm..."
helm upgrade --install pakalspot $CHART_PATH \
    -f $CHART_PATH/$VALUES_FILE \
    --namespace $NAMESPACE \
    --create-namespace \
    --wait \
    --timeout=10m

echo "✅ Deployment completed successfully!"

# Show deployment status
echo "📊 Deployment status:"
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

echo ""
echo "🎉 PakalSpot is now running in Kubernetes!"
echo "   Access the application at: http://pakalspot.local"
echo "   (Make sure to add this to your /etc/hosts file)"
