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
