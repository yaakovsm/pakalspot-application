# PakalSpot DevOps Setup Guide

This guide covers the complete DevOps setup for PakalSpot, including CI/CD pipeline, Kubernetes deployment, and secrets management.

## Overview

The project has been refactored to support:
- ✅ CI-driven Docker image builds on `dev` branch pushes
- ✅ Kubernetes deployment via Helm charts
- ✅ Secrets management through GitHub Actions and Kubernetes
- ✅ Local development compatibility with docker-compose
- ✅ ArgoCD-ready configuration

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub        │    │   Docker Hub     │    │   Kubernetes    │
│   Actions       │───▶│   Registry       │───▶│   Cluster       │
│   (CI)          │    │                  │    │   (Helm)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Build Images  │    │   Push Images    │    │   Deploy App    │
│   - Backend     │    │   - dev-sha      │    │   - Backend     │
│   - Frontend    │    │   - dev-latest   │    │   - Frontend    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```bash
# Docker Hub credentials
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password

# Application secrets
SECRET_KEY=your-super-secret-key
S3_ACCESS_KEY=your-s3-access-key
S3_SECRET_KEY=your-s3-secret-key
MAPS_API_KEY=your-google-maps-api-key
DB_URL=postgresql://user:pass@host:port/db

# Kubernetes configuration (for CI)
KUBECONFIG=base64-encoded-kubeconfig
```

## CI/CD Pipeline

### Build Workflow (`.github/workflows/docker-build.yml`)

The CI pipeline automatically:
1. **Builds** both backend and frontend Docker images
2. **Tags** images with:
   - `dev-${{ github.sha }}` (immutable, commit-specific)
3. **Pushes** to Docker Hub
4. **Creates** Kubernetes secrets in the cluster

### Image Tags

- **Backend**: `<dockerhub-username>/pakalspot-backend:dev-{SHORT_SHA}`
- **Frontend**: `<dockerhub-username>/pakalspot-frontend:dev-{SHORT_SHA}`

**Note**: Each commit gets a unique, immutable tag based on the Git SHA.

## Kubernetes Deployment

### Prerequisites

1. **kubectl** configured to access your cluster
2. **Helm** installed
3. **Secrets** created by CI pipeline

### Deploy to Kubernetes

```bash
# Quick deployment using the existing script
cd pakalspot-chart
./deploy.sh development install

# Manual deployment
helm upgrade --install pakalspot ./pakalspot-chart \
  -f pakalspot-chart/values-development.yaml \
  --namespace pakalspot \
  --create-namespace
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n pakalspot

# Check services
kubectl get services -n pakalspot

# Check secrets
kubectl get secrets -n pakalspot
```

## Local Development

### Using Docker Compose

```bash
# Set environment variables
export SECRET_KEY="your-secret-key"
export S3_ACCESS_KEY="your-s3-access-key"
export S3_SECRET_KEY="your-s3-secret-key"
export MAPS_API_KEY="your-maps-api-key"
export VITE_GOOGLE_MAPS_API_KEY="your-maps-api-key"

# Start services
docker-compose up -d
```

### Environment Variables

Both local and Kubernetes deployments use the same environment variables:

- `SECRET_KEY`: Application secret key
- `S3_ACCESS_KEY`: AWS S3 access key
- `S3_SECRET_KEY`: AWS S3 secret key
- `MAPS_API_KEY`: Google Maps API key
- `DB_URL`: Database connection string

## Helm Chart Configuration

### Key Files

- `values-development.yaml`: Development environment configuration
- `values.yaml`: Base configuration with dev-latest image tags
- `templates/`: Kubernetes resource templates

### Image Configuration

```yaml
# Backend
backend:
  image:
    repository: <dockerhub-username>/pakalspot-backend
    tag: dev-latest
    pullPolicy: Always

# Frontend  
frontend:
  image:
    repository: <dockerhub-username>/pakalspot-frontend
    tag: dev-latest
    pullPolicy: Always
```

### Secrets Management

Secrets are managed by the CI pipeline and referenced in deployments:

```yaml
envFrom:
  - secretRef:
      name: pakalspot-secrets
```

## Docker Images

### Backend Dockerfile

- **Base**: `python:3.11-slim`
- **Health Check**: `curl -f http://localhost:8000/api/health`
- **Port**: 8000

### Frontend Dockerfile

- **Build**: `oven/bun:1` (multi-stage)
- **Runtime**: `nginx:1.27-alpine`
- **Health Check**: `wget -qO- http://localhost:80`
- **Port**: 80

## ArgoCD Compatibility

The setup is ready for ArgoCD adoption:

1. **GitOps Ready**: All configurations are in Git
2. **Immutable Images**: Uses commit-specific tags
3. **Secrets Management**: External secret management
4. **Helm Charts**: Standard Helm deployment

### ArgoCD Application Example

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: pakalspot
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/pakalspot
    targetRevision: HEAD
    path: pakalspot-chart
    helm:
      valueFiles:
        - values-development.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: pakalspot
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Troubleshooting

### Common Issues

1. **Secrets not found**: Ensure CI pipeline has run and created `pakalspot-secrets`
2. **Image pull errors**: Check Docker Hub credentials and image tags
3. **Health check failures**: Verify application endpoints are responding

### Debug Commands

```bash
# Check pod logs
kubectl logs -n pakalspot deployment/pakalspot-backend
kubectl logs -n pakalspot deployment/pakalspot-frontend

# Describe pods for events
kubectl describe pod -n pakalspot -l app.kubernetes.io/component=backend

# Check secret contents
kubectl get secret pakalspot-secrets -n pakalspot -o yaml
```

## Next Steps

1. **Replace placeholders**: Update `<dockerhub-username>` in all files
2. **Configure secrets**: Add your actual secret values to GitHub
3. **Test deployment**: Run the deployment script
4. **Set up ArgoCD**: When ready, configure ArgoCD for GitOps

## File Changes Summary

### New Files
- `DEVOPS-SETUP.md`: This documentation
- `DEPLOYMENT-QUICK-REFERENCE.md`: Quick command reference

### Modified Files
- `.github/workflows/docker-build.yml`: Updated to use dev-latest tags and create K8s secrets
- `Backend/Dockerfile`: Added health check and curl
- `Frontend/Dockerfile`: Enhanced health check
- `docker-compose.yml`: Added MAPS_API_KEY
- `pakalspot-chart/values-development.yaml`: Updated image tags
- `pakalspot-chart/values.yaml`: Updated image repos and removed hardcoded secrets
- `pakalspot-chart/templates/backend-deployment.yaml`: Updated secret references
- `pakalspot-chart/templates/backend-secrets.yaml`: Removed hardcoded secrets
- `pakalspot-chart/templates/frontend-deployment.yaml`: Added secret references and fixed ports
- `pakalspot-chart/templates/frontend-secrets.yaml`: Created placeholder

This setup provides a robust, production-ready DevOps pipeline that's compatible with both local development and Kubernetes deployment, with a clear path to ArgoCD adoption.
