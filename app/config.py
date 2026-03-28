from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    SECRET_KEY: str = "change_me_in_production_secret_key"
    NEON_DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_cs6wZ4ACBRSE@ep-dry-dew-a18weayj-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"
    REDIS_URL: str = "redis://localhost:6379/0"
    MASTER_ENCRYPTION_KEY: str = "0000000000000000000000000000000000000000000000000000000000000000" # 64 hex chars = 32 bytes
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://cyberx-b72d0.web.app",
        "https://cyberx-b72d0.firebaseapp.com",
    ]
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RATE_LIMIT_PER_IP: int = 100
    RATE_LIMIT_PER_USER: int = 1000
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
