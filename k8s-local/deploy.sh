#!/bin/bash

# PakalSpot Kubernetes Deployment Script
# This script deploys the PakalSpot application to a local Kubernetes cluster

echo "Deploying PakalSpot to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "Cannot connect to Kubernetes cluster. Please ensure your cluster is running."
    exit 1
fi

echo "Kubernetes cluster is accessible"

# Create namespace first
echo "Creating namespace..."
kubectl apply -f namespace.yaml

# Apply storage configuration
echo "Setting up storage..."
kubectl apply -f storageclass.yaml
kubectl apply -f postgres-pv.yaml
kubectl apply -f postgres-pvc.yaml

# Apply database configuration
echo "Setting up database..."
kubectl apply -f configmap-db.yaml
kubectl apply -f secret-db.yaml
kubectl apply -f db-deployment.yaml
kubectl apply -f db-service.yaml

# Wait for database to be ready
echo "Waiting for database to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n pakalspot --timeout=120s

# Apply backend configuration
echo "Setting up backend..."
kubectl apply -f configmap-backend.yaml
kubectl apply -f secret-backend.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

# Wait for backend to be ready (init container will seed the database)
echo "Waiting for backend to be ready (seeding database)..."
kubectl wait --for=condition=ready pod -l app=backend -n pakalspot --timeout=120s

# Apply frontend configuration
echo "Setting up frontend..."
kubectl apply -f configmap-frontend.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# Apply ingress
echo "Setting up ingress..."
kubectl apply -f ingress.yaml

echo "PakalSpot deployment completed!"
echo ""
echo "Deployment Status:"
kubectl get pods -n pakalspot
echo ""
echo "Access your application:"
echo "   - Add '127.0.0.1 pakalspot.local' to your /etc/hosts file"
echo "   - Visit: http://pakalspot.local"
echo ""
echo "To check logs:"
echo "   kubectl logs -f deployment/backend -n pakalspot"
echo "   kubectl logs -f deployment/frontend -n pakalspot"
echo ""
echo "To delete deployment:"
echo "   kubectl delete namespace pakalspot"
