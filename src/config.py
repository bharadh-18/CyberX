import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API metadata
    PROJECT_NAME: str = "Zero-Trust Backend API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"

    # Security secrets
    SECRET_KEY: str = "secure-development-key-change-me"
    ENCRYPTION_MASTER_KEY: str = "your-32-byte-base64-key-here"

    # Database & Cache
    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth configuration
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # Multi-Factor Authentication
    ENABLE_MFA: bool = True

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CALLBACK_URL: str = "http://localhost:8443/auth/google/callback"

    # Logging & Observability
    ENABLE_ELK: bool = False
    ELASTICSEARCH_URL: Optional[str] = None
    SPLUNK_HEC_URL: Optional[str] = None
    SPLUNK_HEC_TOKEN: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
