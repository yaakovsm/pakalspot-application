# PakalSpot

A FastAPI + SQLAlchemy + Alembic + PostgreSQL project for discovering coffee spots in Israel.

## Project Structure

- `Backend/` - FastAPI backend with PostgreSQL database
- `Frontend/` - React frontend application
- `k8s-local/` - Kubernetes deployment configurations

## Database Seeding

To populate the database with initial data (admin user, sample spots, and photos), run the seed script:

```bash
docker compose exec backend python app/db/seed.py
```

This script will:
- Create an admin user with email `yaakovsm@gmail.com` and password `admin123`
- Add sample Hebrew spots (בריכת משושים and תצפית מעל הים)
- Create photos for each spot using images from the `Backend/media/` directory

The script is idempotent - it can be run multiple times without creating duplicates.

### Admin User Credentials
- **Email**: `yaakovsm@gmail.com`
- **Password**: `admin123`
- **Display Name**: `JCoffeeBrew`

The admin user can login to the frontend and edit/delete spots they created.

## Development Setup

1. Start the services with Docker Compose:
   ```bash
   docker compose up -d
   ```

2. Run database migrations:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

3. Seed the database:
   ```bash
   docker compose exec backend python app/db/seed.py
   ```

## API Documentation

Once the backend is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (local or cloud)
- Helm 3.x installed
- Docker registry access (DockerHub, GHCR, etc.)
- kubectl configured for your cluster

### Environment Variables

Set the following environment variables for deployment:

```bash
export GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
export S3_ACCESS_KEY_ID="your_s3_access_key"
export S3_SECRET_ACCESS_KEY="your_s3_secret_key"
export S3_ENDPOINT="https://s3.amazonaws.com"  # or your S3-compatible endpoint
```

### Quick Deployment

Use the deployment script for local testing:

```bash
# Deploy with default settings
./scripts/deploy-local.sh

# Or specify custom registry and tag
./scripts/deploy-local.sh your-registry.com your-tag
```

### Manual Deployment

1. **Build and push images:**
   ```bash
   # Frontend (Nginx-based)
   cd Frontend
   docker build -t your-registry/pakalspot-frontend:nginx .
   docker push your-registry/pakalspot-frontend:nginx
   
   # Backend
   cd Backend
   docker build -t your-registry/pakalspot-backend:latest .
   docker push your-registry/pakalspot-backend:latest
   ```

2. **Deploy with Helm:**
   ```bash
   helm upgrade --install pakalspot ./pakalspot-chart \
     -n pakalspot --create-namespace \
     -f pakalspot-chart/values.yaml \
     --set frontend.image.repository=your-registry/pakalspot-frontend \
     --set frontend.image.tag=nginx \
     --set backend.image.repository=your-registry/pakalspot-backend \
     --set backend.image.tag=latest \
     --set frontend.envRuntime.GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" \
     --set backend.secrets.S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
     --set backend.secrets.S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
     --set backend.secrets.S3_ENDPOINT="$S3_ENDPOINT"
   ```

### Verification

Use the automated verification script:
```bash
# Run comprehensive smoke tests
./scripts/verify.sh pakalspot

# Or specify custom namespace and release name
./scripts/verify.sh my-namespace my-release
```

Manual verification:
```bash
# Check deployment status
kubectl -n pakalspot get pods,svc,ep

# Check that no pods are using 'latest' tags
kubectl get pods -n pakalspot -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'

# Verify frontend is serving static files (no build logs)
kubectl logs -n pakalspot deploy/pakalspot-pakalspot-chart-frontend --tail=10

# Test backend health endpoint
kubectl exec -n pakalspot deploy/pakalspot-pakalspot-chart-backend -- curl -f http://localhost:8000/api/health
```

Access the application:
```bash
# Port forward to local machine
kubectl -n pakalspot port-forward svc/pakalspot-pakalspot-chart-frontend 8080:80

# Open browser to http://localhost:8080
```

### Local Development with Docker Compose

For local development, the frontend runs on port 3000 to avoid conflicts:

```bash
# Start all services
docker compose up

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Database: localhost:5432
```

### Key Features

- **Production-Ready Frontend**: nginx-unprivileged on port 8080, no runtime builds
- **Runtime Environment**: Google Maps API key injected at runtime via ConfigMap
- **Secure Backend**: S3 credentials managed via Kubernetes Secrets
- **Versioned Images**: No 'latest' tags, Helm guardrails prevent deployment of unversioned images
- **Unified Database**: Single DB_URL across all backend containers with proper secrets
- **Security Hardened**: Non-root containers, privilege escalation disabled, resource limits
- **Docker Compose Compatible**: Maintains compatibility with existing docker-compose setup
- **Environment-driven**: API URLs use environment variables with safe fallbacks
- **Clean Ingress**: Proper routing (/api → backend, / → frontend)
- **Comprehensive Monitoring**: Health checks, readiness probes, and verification scripts

### Render Manifests
```bash
helm template pakalspot ./pakalspot-chart -f pakalspot-chart/values.yaml | head
```

### Deploy/Upgrade
```bash
# Deploy to development
helm upgrade --install pakalspot ./pakalspot-chart \
  -n pakalspot --create-namespace \
  -f pakalspot-chart/values-development.yaml

# Check pods/services
kubectl get pods,svc -n pakalspot

# Port-forward (if no Ingress)
kubectl -n pakalspot port-forward svc/pakalspot-pakalspot-chart-frontend 8080:80
# Browser: http://localhost:8080

# Inspect that the container is Nginx and not building:
kubectl -n pakalspot logs deploy/pakalspot-pakalspot-chart-frontend --tail=100
```

### Inspect Environment Variables
```bash
# Check frontend environment
kubectl exec deploy/pakalspot-frontend -- printenv | grep VITE_

# Check backend environment
kubectl exec deploy/pakalspot-backend -- printenv | grep -E 'DB_URL|SECRET_KEY|S3_'
```

### Test Database Readiness
```bash
# Test DB connection from backend pod
kubectl exec deploy/pakalspot-backend -- bash -lc \
 'apt-get update && apt-get install -y postgresql-client >/dev/null && \
  pg_isready -h pakalspot-postgres -p 5432 -U pakalspot_user'
```

Replace `pakalspot` with your actual release name if different.
