# Environment Setup Guide

This guide explains how to set up the environment variables for both the frontend and backend applications.

## Backend Environment Variables

Create a `.env` file in the `PakalSpot/Backend/` directory with the following variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URL` | PostgreSQL database connection string | `postgresql://username:password@localhost:5432/pakalspot_db` |
| `SECRET_KEY` | Secret key for JWT token signing | `your-super-secret-key-here-change-in-production` |
| `S3_BUCKET` | S3 bucket name for photo storage | `pakalspot-photos` |
| `S3_ENDPOINT` | S3 endpoint URL | `https://s3.amazonaws.com` |
| `S3_ACCESS_KEY` | S3 access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_KEY` | S3 secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `JWT_EXPIRY` | JWT token expiry time in minutes | `43200` (30 days) | `1440` (1 day) |
| `API_PREFIX` | API route prefix | `/api` | `/api/v1` |

### Database Setup

1. Install PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE pakalspot_db;
   CREATE USER pakalspot_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE pakalspot_db TO pakalspot_user;
   ```
3. Update the `DB_URL` in your `.env` file

### S3 Setup

1. Create an S3 bucket for photo storage
2. Create IAM user with S3 permissions
3. Generate access keys
4. Update S3 variables in your `.env` file

## Frontend Environment Variables

Create a `.env` file in the `PakalSpot/Frontend/` directory with the following variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/api` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key for maps | Not set | `AIzaSyCwCjeTEmRel_nG1MGsC5sacEFGuipEs8k` |
| `VITE_APP_NAME` | Application name | `PakalSpot` | `PakalSpot` |
| `VITE_APP_VERSION` | Application version | `1.0.0` | `1.0.0` |

### Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Maps JavaScript API
4. Create credentials (API Key)
5. Restrict the API key to your domain for security
6. Add it to your `.env` file

## Development Setup

### Backend Setup

1. Copy the example environment file:
   ```bash
   cd PakalSpot/Backend
   cp .env.example .env
   ```

2. Edit `.env` with your actual values

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```bash
   alembic upgrade head
   ```

5. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Copy the example environment file:
   ```bash
   cd PakalSpot/Frontend
   cp .env.example .env
   ```

2. Edit `.env` with your actual values

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Production Considerations

### Security

- **Never commit `.env` files to version control**
- Use strong, unique secret keys in production
- Restrict S3 bucket permissions to only what's needed
- Use environment-specific database credentials
- Consider using a secrets management service

### Performance

- Use connection pooling for database connections
- Configure S3 CDN for faster photo loading
- Use production-grade WSGI server (e.g., Gunicorn)
- Enable gzip compression
- Use HTTPS in production

### Monitoring

- Set up logging for both applications
- Monitor database performance
- Track API usage and errors
- Set up health checks

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure database exists

2. **S3 Upload Errors**
   - Verify S3 credentials
   - Check bucket permissions
   - Ensure bucket exists

3. **CORS Errors**
   - Update `allow_origins` in backend CORS settings
   - Ensure frontend URL is allowed

4. **Map Not Loading**
   - Check Google Maps API key
   - Verify API key has Maps JavaScript API enabled
   - Check browser console for errors
   - Ensure API key restrictions allow your domain

### Getting Help

- Check the application logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure all services (PostgreSQL, S3) are accessible
- Test API endpoints using tools like Postman or curl
