# PakalSpot Docker Compose Setup

This document explains how to run the PakalSpot application using Docker Compose for local development and CI/CD testing.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git repository cloned

### Running the Application

1. **Navigate to the project directory:**
   ```bash
   cd /home/yaakovsm/bootcamp/pakalspot/pakalspot-application/pakalspot-app
   ```

2. **Set up environment variables (first time only):**
   ```bash
   ./setup-env.sh
   ```

3. **Start all services:**
   ```bash
   # Option 1: Using the provided script
   ./run-docker.sh
   
   # Option 2: Using docker compose directly
   docker compose up --build
   
   # Option 3: Run in background (detached mode)
   docker compose up -d --build
   ```

## 🌐 Service Access

Once running, the following services will be available:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React application (Nginx) |
| **Backend API** | http://localhost:8000 | FastAPI backend |
| **API Documentation** | http://localhost:8000/docs | Swagger UI |
| **Database** | localhost:5432 | PostgreSQL with PostGIS |

## 🔧 Service Details

### Database (PostgreSQL + PostGIS)
- **Container**: `pakal-spot-db`
- **Image**: `postgis/postgis:15-3.3`
- **Port**: 5432
- **Database**: `pakalspot_db`
- **User**: `pakalspot_user`
- **Password**: `jcoffeebrew`
- **Health Check**: ✅ Automatic health monitoring

### Backend (FastAPI)
- **Container**: `pakalspot-app-backend-1`
- **Port**: 8000
- **Framework**: FastAPI with Uvicorn
- **Health Check**: ✅ Built-in health endpoint
- **Features**: 
  - Automatic database migrations
  - JWT authentication
  - File upload to S3
  - Google Maps integration

### Frontend (React + Nginx)
- **Container**: `pakalspot-app-frontend-1`
- **Port**: 3000 (mapped to internal port 80)
- **Framework**: React with Vite
- **Build Tool**: Bun
- **Web Server**: Nginx
- **Health Check**: ✅ Built-in health monitoring

## 🛠️ Development Commands

### Basic Operations
```bash
# Start services
docker compose up

# Start in background
docker compose up -d

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v

# View logs
docker compose logs

# View logs for specific service
docker compose logs backend
docker compose logs frontend
docker compose logs db
```

### Building and Rebuilding
```bash
# Build without cache
docker compose build --no-cache

# Rebuild and start
docker compose up --build

# Force recreate containers
docker compose up --force-recreate
```

### Database Operations
```bash
# Connect to database
docker exec -it pakal-spot-db psql -U pakalspot_user -d pakalspot_db

# Run database migrations
docker exec pakalspot-app-backend-1 alembic upgrade head

# Check database health
docker exec pakal-spot-db pg_isready -U pakalspot_user -d pakalspot_db
```

### Debugging
```bash
# Check service status
docker compose ps

# View service health
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Access container shell
docker exec -it pakalspot-app-backend-1 bash
docker exec -it pakalspot-app-frontend-1 sh

# View container logs
docker logs pakalspot-app-backend-1
docker logs pakalspot-app-frontend-1
docker logs pakal-spot-db
```

## 🔍 Health Checks

All services include health checks:

- **Database**: PostgreSQL connection test
- **Backend**: HTTP endpoint check (`/docs`)
- **Frontend**: Nginx response check

Check health status:
```bash
docker compose ps
```

## 🗂️ Environment Configuration

### Environment Variables
The application uses the following environment variables (configured in `.env`):

```bash
# Required
SECRET_KEY=your-secret-key-here

# Optional (for production features)
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Database Configuration
- Database credentials are hardcoded in `docker-compose.yml` for development
- Production should use environment variables for security

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 8000, and 5432 are available
2. **Permission issues**: Run `chmod +x setup-env.sh run-docker.sh`
3. **Build failures**: Try `docker compose build --no-cache`
4. **Database connection**: Wait for database health check to pass
5. **Blank page**: If the frontend shows a blank page, check that:
   - API proxy is working: `curl http://localhost:3000/api/spots/`
   - Environment config is loaded: `curl http://localhost:3000/env-config.js`
   - All services are healthy: `docker compose ps`

### Reset Everything
```bash
# Stop and remove everything
docker compose down -v --remove-orphans

# Remove all images
docker rmi $(docker images -q)

# Start fresh
docker compose up --build
```

### Check Resource Usage
```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

## 🔄 CI/CD Integration

This Docker Compose setup is perfect for CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Test Docker Compose
  run: |
    cd pakalspot-application/pakalspot-app
    docker compose up -d --build
    docker compose ps
    # Run tests here
    docker compose down
```

## 📝 Notes

- The setup includes proper health checks and dependency management
- Services start in the correct order (database → backend → frontend)
- All services are connected via a custom Docker network
- Database data persists in a Docker volume
- Frontend is built with production optimizations
- Backend includes all necessary Python dependencies

## 🎯 Next Steps

1. **For Development**: Use `docker compose up` and access services at the URLs above
2. **For CI/CD**: Integrate the Docker Compose commands into your pipeline
3. **For Production**: Update environment variables and use proper secrets management

---

**Happy coding! 🚀**
