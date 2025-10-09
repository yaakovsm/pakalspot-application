from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
	# Database Configuration (from environment with docker-compose fallback)
	DB_URL: str = os.getenv("DB_URL", "postgresql://pakalspot_user:jcoffeebrew@db:5432/pakalspot_db")
	
	# Secrets (from environment)
	SECRET_KEY: str
	JWT_EXPIRY: int = 60 * 24 * 30  # 30 days
	
	# S3 Configuration
	S3_BUCKET: str = "pakalspot-photos"
	S3_ENDPOINT: str = "https://s3.amazonaws.com"
	S3_REGION: str = "us-east-1"
	S3_ACCESS_KEY: str
	S3_SECRET_KEY: str
	
	# API Configuration (hard-coded)
	API_PREFIX: str = "/api"
	
	# Development Settings (hard-coded)
	DEBUG: bool = True
	ENVIRONMENT: str = "development"

	model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()


