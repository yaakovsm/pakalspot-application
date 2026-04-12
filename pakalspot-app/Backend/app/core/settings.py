from typing import Optional
import os
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DB_HOST: Optional[str] = Field(default=None)
    DB_PORT: int = Field(default=5432)
    DB_NAME: Optional[str] = Field(default=None)
    DB_USER: Optional[str] = Field(default=None)
    DB_PASSWORD: Optional[str] = Field(default=None)

    DB_URL: Optional[str] = Field(default=None)

    SECRET_KEY: Optional[str] = Field(default=None)
    JWT_EXPIRY: int = Field(default=60 * 24 * 30)

    S3_BUCKET: str = Field(default="pakalspot-photos")
    S3_ENDPOINT: str = Field(default="https://s3.amazonaws.com")
    S3_REGION: str = Field(default="us-east-1")
    S3_ACCESS_KEY: Optional[str] = Field(default=None)
    S3_SECRET_KEY: Optional[str] = Field(default=None)

    API_PREFIX: str = Field(default="/api")
    BASE_URL: str = Field(default="http://pakalspot.local")

    INIT_SEED_BUCKET: str = Field(default="pakalspot-init-photos")
    INIT_SEED_JSON_KEY: str = Field(default="init_spots.json")
    INIT_PHOTOS_BASE_URL: Optional[str] = Field(default=None)
    ADMIN_SEED_API_KEY: Optional[str] = Field(default=None)
    SEED_ENABLED: bool = Field(default=True)

    # Single admin identity (must match seed user email for cloud/local seed)
    ADMIN_EMAIL: str = Field(default="yaakovsm@gmail.com")
    ADMIN_PASSWORD: str = Field(default="admin123")
    ADMIN_DISPLAY_NAME: str = Field(default="PakalSpot Admin")

    DEBUG: bool = Field(default=True)
    ENVIRONMENT: str = Field(default="development")
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)

    def model_post_init(self, __context) -> None:
        env = (self.ENVIRONMENT or "").lower()
        is_local = env in {"development", "dev", "local"}

        if not self.DB_URL:
            if all([self.DB_HOST, self.DB_NAME, self.DB_USER, self.DB_PASSWORD]):
                pwd = quote_plus(self.DB_PASSWORD)
                self.DB_URL = f"postgresql://{self.DB_USER}:{pwd}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            else:
                self.DB_URL = "postgresql://pakalspot_user:jcoffeebrew@db:5432/pakalspot_db"

        if not self.SECRET_KEY:
            # App Runner / Terraform inject JWT_SECRET; Python settings field is SECRET_KEY
            jwt_secret = os.environ.get("JWT_SECRET")
            if jwt_secret:
                self.SECRET_KEY = jwt_secret
            elif is_local:
                self.SECRET_KEY = "local-dev-secret-change-me"
            else:
                raise ValueError("SECRET_KEY is required in non-local environments")

        has_access = bool(self.S3_ACCESS_KEY)
        has_secret = bool(self.S3_SECRET_KEY)
        if has_access != has_secret:
            raise ValueError("S3_ACCESS_KEY and S3_SECRET_KEY must be provided together")


settings = Settings()
