from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
	# Hardcoded database configuration
	DB_URL: str = "postgresql://pakalspot_user:jcoffeebrew@db:5432/pakalspot_db"
	# Database Configuration (hard-coded)
	DB_URL: str = "postgresql://pakalspot_user:jcoffeebrew@db:5432/pakalspot_db"
	
	# Secrets (from environment)
	SECRET_KEY: str
	JWT_EXPIRY: int = 60 * 24 * 30
	S3_BUCKET: str = "pakalspot-photos"
	S3_ENDPOINT: str = "s3.us-east-1.amazonaws.com"
	
	# JWT Configuration (hard-coded)
	JWT_EXPIRY: int = 60 * 24 * 30  # 30 days
	
	# S3 Configuration (hard-coded non-secrets)
	S3_BUCKET: str = "pakalspot-photos"
	S3_ENDPOINT: str = "https://s3.amazonaws.com"
	S3_REGION: str = "us-east-1"
	
	# S3 Secrets (from environment)
	S3_ACCESS_KEY: str
	S3_SECRET_KEY: str
	S3_REGION: str = "us-east-1"
	
	# API Configuration (hard-coded)
	API_PREFIX: str = "/api"
	
	# Development Settings (hard-coded)
	DEBUG: bool = True
	ENVIRONMENT: str = "development"

	model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()


