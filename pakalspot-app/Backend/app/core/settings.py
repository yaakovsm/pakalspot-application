from pydantic_settings import BaseSettings
import os
from urllib.parse import quote_plus

class Settings(BaseSettings):
    # --- DB parts ---
    DB_HOST: str | None = os.getenv("DB_HOST")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str | None = os.getenv("DB_NAME")
    DB_USER: str | None = os.getenv("DB_USER")
    DB_PASSWORD: str | None = os.getenv("DB_PASSWORD")

    # Keep backward compatibility:
    # 1) If DB_URL exists -> use it
    # 2) else if DB parts exist -> build DB_URL
    # 3) else fallback to local docker-compose default
    DB_URL: str = os.getenv(
        "DB_URL",
        ""
    )

    # Secrets (from environment)
    SECRET_KEY: str
    JWT_EXPIRY: int = 60 * 24 * 30  # 30 days

    # S3 Configuration
    S3_BUCKET: str = "pakalspot-photos"
    S3_ENDPOINT: str = "https://s3.amazonaws.com"
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str

    API_PREFIX: str = "/api"
    BASE_URL: str = os.getenv("BASE_URL", "http://pakalspot.local")

    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    model_config = {"env_file": ".env", "extra": "ignore"}

    def model_post_init(self, __context) -> None:
        # Build DB_URL if not provided explicitly
        if not self.DB_URL:
            if all([self.DB_HOST, self.DB_NAME, self.DB_USER, self.DB_PASSWORD]):
                pwd = quote_plus(self.DB_PASSWORD)
                self.DB_URL = f"postgresql://{self.DB_USER}:{pwd}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            else:
                # Local docker-compose fallback
                self.DB_URL = "postgresql://pakalspot_user:jcoffeebrew@db:5432/pakalspot_db"

settings = Settings()
