FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    libpq-dev \
    curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seed images for initial spots (make sure this folder exists in the backend repo)
# Example structure in repo:
# Backend/
#   seed_images/
COPY seed_images /app/seed_images

# Copy the rest of the backend code (including app/, alembic/, seed_cloud.py etc.)
COPY . .

EXPOSE 8000

# Add healthcheck for K8s/Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/docs || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
