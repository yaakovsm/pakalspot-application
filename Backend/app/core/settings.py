from pydantic_settings import BaseSettings


class Settings(BaseSettings):
	# Hardcoded database configuration
	DB_URL: str = "postgresql://pakalspot_user:jcoffeebrew@db:5432/pakalspot_db"
	SECRET_KEY: str
	JWT_EXPIRY: int = 60 * 24 * 30
	S3_BUCKET: str = "pakalspot-photos"
	S3_ENDPOINT: str = "s3.us-east-1.amazonaws.com"
	S3_ACCESS_KEY: str
	S3_SECRET_KEY: str
	S3_REGION: str = "us-east-1"
	API_PREFIX: str = "/api"

	model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()


