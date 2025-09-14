#!/bin/bash

# PakalSpot Docker Compose Runner
# This script runs Docker Compose (environment variables are in .env file)

echo "🚀 Starting PakalSpot with Docker Compose..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with PostgreSQL credentials."
    exit 1
fi

# Build and start services
echo "📦 Building and starting services..."
docker compose up --build

echo "✅ PakalSpot is now running!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "🗄️  Database: localhost:5432"
