# Pakalspot Helm Chart

This Helm chart deploys the Pakalspot application stack on Kubernetes, including:
- Frontend (Vite/React)
- Backend (FastAPI/Python)
- Database (PostgreSQL with PostGIS)

## Features

- **StatefulSet for Database**: PostgreSQL is deployed as a StatefulSet for better data persistence
- **Environment-specific configurations**: Separate values files for development, staging, and production
- **Resource limits and requests**: Proper resource management for all components
- **Health checks**: Liveness and readiness probes for all services
- **Security contexts**: Non-root containers with proper security settings
- **Ingress configuration**: Traefik-based ingress with path-based routing
- **Secrets management**: Secure handling of sensitive data

## Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.x
- kubectl configured to access your cluster
- Traefik ingress controller (for ingress functionality)

## Quick Start

1. **Clone and navigate to the chart directory**:
   ```bash
   cd ../pakalspot-chart
   ```

2. **Make the deployment script executable**:
   ```bash
   chmod +x deploy.sh
   ```

3. **Deploy to development environment**:
   ```bash
   ./deploy.sh development install
   ```

4. **Check the deployment status**:
   ```bash
   ./deploy.sh development status
   ```

## Environment Configurations

### Development
- Single replica for all services
- Latest image tags with Always pull policy
- Debug mode enabled
- Local domain: `pakalspot.local`
- Minimal resource requirements

### Staging
- 2 backend replicas, 1 frontend replica
- Staging image tags
- Debug mode enabled
- Domain: `staging.pakalspot.com`
- Medium resource requirements

### Production
- 3 backend replicas, 2 frontend replicas
- Versioned image tags
- Debug mode disabled
- Domain: `pakalspot.com`
- High resource requirements
- Autoscaling enabled
- TLS/SSL support

## Deployment Commands

### Using the deployment script:
```bash
# Install to development
./deploy.sh development install

# Upgrade to staging
./deploy.sh staging upgrade

# Check status
./deploy.sh production status

# Uninstall
./deploy.sh development uninstall

# Dry run (test without deploying)
./deploy.sh production dry-run
```

### Using Helm directly:
```bash
# Install
helm install pakalspot . --namespace pakalspot --values values-development.yaml

# Upgrade
helm upgrade pakalspot . --namespace pakalspot --values values-production.yaml

# Uninstall
helm uninstall pakalspot --namespace pakalspot
```

## Configuration

### Key Configuration Areas

1. **Image Configuration**:
   ```yaml
   frontend:
     image:
       repository: yaakovsm/pakalspot-frontend
       tag: latest
       pullPolicy: Always
   ```

2. **Resource Limits**:
   ```yaml
   backend:
     resources:
       limits:
         cpu: 500m
         memory: 512Mi
       requests:
         cpu: 250m
         memory: 256Mi
   ```

3. **Environment Variables**:
   ```yaml
   backend:
     env:
       DEBUG: "true"
       ENVIRONMENT: "development"
   ```

4. **Database Configuration**:
   ```yaml
   database:
     persistence:
       size: 10Gi
       storageClass: ""
   ```

### Secrets Management

Secrets are defined in the values files but should be managed securely in production:

```yaml
secrets:
  backend:
    SECRET_KEY: "your-secret-key"
    DB_PASSWORD: "your-db-password"
    S3_ACCESS_KEY: "your-s3-key"
    S3_SECRET_KEY: "your-s3-secret"
  database:
    POSTGRES_USER: "pakalspot_user"
    POSTGRES_PASSWORD: "your-db-password"
```

**Important**: In production, use external secret management systems like:
- Kubernetes External Secrets Operator
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

## Monitoring and Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n pakalspot
```

### View Logs
```bash
# Backend logs
kubectl logs -n pakalspot -l app.kubernetes.io/component=backend

# Frontend logs
kubectl logs -n pakalspot -l app.kubernetes.io/component=frontend

# Database logs
kubectl logs -n pakalspot -l app.kubernetes.io/component=database
```

### Check Services
```bash
kubectl get services -n pakalspot
```

### Check Ingress
```bash
kubectl get ingress -n pakalspot
```

### Debug Database Connection
```bash
kubectl exec -it -n pakalspot deployment/pakalspot-backend -- python -c "from app.core.database import engine; print('Database connection successful')"
```

## Best Practices Implemented

1. **StatefulSet for Database**: Ensures stable network identity and persistent storage
2. **Resource Management**: Proper CPU and memory limits/requests
3. **Health Checks**: Liveness and readiness probes for all services
4. **Security**: Non-root containers, read-only root filesystem in production
5. **Environment Separation**: Different configurations for each environment
6. **Secrets Management**: Secure handling of sensitive data
7. **Ingress Configuration**: Proper path-based routing
8. **Labels and Selectors**: Consistent labeling for better resource management

## Customization

### Adding New Environment Variables
1. Add to the appropriate service in `values.yaml`
2. Update environment-specific values files if needed
3. Redeploy the chart

### Scaling Services
1. Update `replicaCount` in values files
2. For production, consider enabling autoscaling
3. Redeploy the chart

### Adding New Services
1. Create new deployment and service templates
2. Add configuration to `values.yaml`
3. Update ingress if needed
4. Test with dry-run before deploying

## Support

For issues and questions:
1. Check the logs using the troubleshooting commands above
2. Verify your Kubernetes cluster is healthy
3. Ensure all prerequisites are met
4. Review the Helm chart templates for configuration issues
