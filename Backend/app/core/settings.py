from pydantic_settings import BaseSettings


class Settings(BaseSettings):
	DB_URL: str
	SECRET_KEY: str
	JWT_EXPIRY: int = 60 * 24 * 30
	S3_BUCKET: str
	S3_ENDPOINT: str
	S3_ACCESS_KEY: str
	S3_SECRET_KEY: str
	API_PREFIX: str = "/api"

	model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()


