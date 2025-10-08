# PakalSpot Deployment Quick Reference

## 🚀 Quick Deploy to Kubernetes

```bash
# One-command deployment
./deploy-k8s.sh
```

## 🔧 Manual Deployment Commands

### Prerequisites Check
```bash
# Check if secrets exist
kubectl get secret pakalspot-secrets -n pakalspot

# If missing, create secrets manually:
kubectl create secret generic pakalspot-secrets \
  --from-literal=MAPS_API_KEY="$MAPS_API_KEY" \
  --from-literal=S3_ACCESS_KEY="$S3_ACCESS_KEY" \
  --from-literal=S3_SECRET_KEY="$S3_SECRET_KEY" \
  --from-literal=SECRET_KEY="$SECRET_KEY" \
  --from-literal=DB_URL="$DB_URL" \
  --namespace=pakalspot
```

### Helm Deployment
```bash
# Deploy with development values
helm upgrade --install pakalspot ./pakalspot-chart \
  -f pakalspot-chart/values-development.yaml \
  --namespace pakalspot \
  --create-namespace \
  --wait \
  --timeout=10m
```

## 🐳 Local Development

```bash
# Set environment variables
export SECRET_KEY="your-secret-key"
export S3_ACCESS_KEY="your-s3-access-key"
export S3_SECRET_KEY="your-s3-secret-key"
export MAPS_API_KEY="your-maps-api-key"
export VITE_GOOGLE_MAPS_API_KEY="your-maps-api-key"

# Start local development
docker-compose up -d
```

## 📊 Status Checks

```bash
# Check pods
kubectl get pods -n pakalspot

# Check services
kubectl get services -n pakalspot

# Check logs
kubectl logs -n pakalspot deployment/pakalspot-backend
kubectl logs -n pakalspot deployment/pakalspot-frontend
```

## 🔍 Troubleshooting

```bash
# Describe pods for events
kubectl describe pod -n pakalspot -l app.kubernetes.io/component=backend

# Check secret contents
kubectl get secret pakalspot-secrets -n pakalspot -o yaml

# Port forward for testing
kubectl port-forward -n pakalspot service/pakalspot-backend 8000:80
kubectl port-forward -n pakalspot service/pakalspot-frontend 3000:80
```

## 🏷️ Image Tags

- **Backend**: `<dockerhub-username>/pakalspot-backend:dev-latest`
- **Frontend**: `<dockerhub-username>/pakalspot-frontend:dev-latest`

## 🔐 Required GitHub Secrets

```
DOCKER_USERNAME
DOCKER_PASSWORD
SECRET_KEY
S3_ACCESS_KEY
S3_SECRET_KEY
MAPS_API_KEY
DB_URL
KUBECONFIG
```

## 📝 Next Steps

1. Replace `<dockerhub-username>` in all files
2. Add secrets to GitHub repository settings
3. Push to `dev` branch to trigger CI
4. Deploy to Kubernetes using the commands above
