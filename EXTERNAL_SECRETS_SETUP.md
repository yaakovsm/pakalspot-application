# External Secrets Operator Setup for Pakalspot

This document describes the External Secrets Operator (ESO) implementation for the Pakalspot application, following best practices and DRY principles.

## Overview

The External Secrets Operator automatically synchronizes secrets from external systems (GitHub in this case) into Kubernetes secrets. This eliminates the need to manually manage secrets and ensures they are always up-to-date.

## Architecture

```
GitHub Secrets → External Secrets Operator → Kubernetes Secrets → Pods
```

## Components

### 1. GitHub SecretStore (`github-secretstore.yaml`)
- Defines the connection to GitHub repository secrets
- Uses a GitHub Personal Access Token for authentication
- Configurable refresh interval

### 2. External Secret (`pakalspot-externalsecret.yaml`)
- Maps GitHub secrets to Kubernetes secrets
- Uses DRY principles with templating
- Automatically creates and updates Kubernetes secrets

### 3. GitHub Token Secret (`github-token-secret.yaml`)
- Template for the GitHub authentication token
- Must be created manually with actual token

## GitHub Secrets Mapped

The following GitHub repository secrets are automatically synchronized:

| GitHub Secret | Kubernetes Secret Key | Usage |
|---------------|----------------------|-------|
| `DOCKER_USERNAME` | `DOCKER_USERNAME` | Docker registry authentication |
| `DOCKER_PASSWORD` | `DOCKER_PASSWORD` | Docker registry authentication |
| `JWT_SECRET_KEY` | `JWT_SECRET_KEY` | Backend JWT token signing |
| `S3_ACCESS_KEY` | `S3_ACCESS_KEY` | AWS S3 access credentials |
| `S3_SECRET_KEY` | `S3_SECRET_KEY` | AWS S3 access credentials |
| `VITE_GOOGLE_MAPS_API_KEY` | `GOOGLE_MAPS_API_KEY` | Frontend Google Maps integration |

## Setup Instructions

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with the following permissions:
   - `repo` (Full control of private repositories)
   - `read:org` (if repository is in an organization)

### 2. Create GitHub Token Secret

```bash
kubectl create secret generic github-secret-token \
  --from-literal=token=<YOUR_GITHUB_TOKEN> \
  --namespace=pakalspot-dev
```

### 3. Install External Secrets Operator

```bash
# Add the External Secrets Operator Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install the External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

### 4. Deploy the Application

```bash
# Deploy the Pakalspot application with External Secrets
helm install pakalspot ./pakalspot-chart \
  --namespace pakalspot-dev \
  --create-namespace \
  --values environments/dev/values.yaml
```

## Verification

### Check External Secrets Status

```bash
# Check if External Secrets are working
kubectl get externalsecrets -n pakalspot-dev
kubectl describe externalsecret pakalspot-secrets -n pakalspot-dev

# Check if Kubernetes secrets are created
kubectl get secrets -n pakalspot-dev
kubectl describe secret pakalspot-secrets -n pakalspot-dev
```

### Check Pod Environment Variables

```bash
# Check if secrets are injected into pods
kubectl exec -n pakalspot-dev deployment/pakalspot-backend -- env | grep -E "(JWT_SECRET_KEY|S3_ACCESS_KEY|S3_SECRET_KEY)"
kubectl exec -n pakalspot-dev deployment/pakalspot-frontend -- env | grep GOOGLE_MAPS_API_KEY
```

## Best Practices Implemented

### 1. DRY (Don't Repeat Yourself)
- External secret configuration is templated using Helm values
- Secret mappings are defined once in values.yaml
- Consistent naming using Helm helpers

### 2. Security
- Secrets are never stored in Git
- GitHub token has minimal required permissions
- Kubernetes secrets are created with proper labels and metadata

### 3. Maintainability
- Configuration is centralized in values.yaml
- Easy to add/remove secrets by updating values
- Clear separation of concerns

### 4. Monitoring
- External Secrets Operator provides status information
- Kubernetes events show secret synchronization status
- Logs available for troubleshooting

## Troubleshooting

### Common Issues

1. **GitHub Token Issues**
   ```bash
   # Check if token secret exists
   kubectl get secret github-secret-token -n pakalspot-dev
   
   # Verify token has correct permissions
   kubectl describe secret github-secret-token -n pakalspot-dev
   ```

2. **External Secret Not Syncing**
   ```bash
   # Check External Secret status
   kubectl describe externalsecret pakalspot-secrets -n pakalspot-dev
   
   # Check External Secrets Operator logs
   kubectl logs -n external-secrets-system deployment/external-secrets
   ```

3. **Secrets Not Available in Pods**
   ```bash
   # Verify secret exists
   kubectl get secret pakalspot-secrets -n pakalspot-dev
   
   # Check pod environment variables
   kubectl exec -n pakalspot-dev deployment/pakalspot-backend -- printenv
   ```

## Configuration

The External Secrets configuration can be customized in `environments/dev/values.yaml`:

```yaml
externalSecrets:
  enabled: true
  refreshInterval: "1h"
  github:
    repository: "yaakovsm/pakalspot-application"
  secrets:
    DOCKER_USERNAME:
      remoteKey: "DOCKER_USERNAME"
    # ... other secrets
```

## Benefits

1. **Automated Secret Management**: No manual secret creation/updates
2. **Centralized Configuration**: All secrets managed in one place
3. **Version Control**: Secret configuration is versioned
4. **Security**: Secrets never stored in Git
5. **Scalability**: Easy to add new secrets or environments
6. **Compliance**: Audit trail of secret access and changes
