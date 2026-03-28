"""
Async SQLAlchemy database engine connected to Neon Serverless PostgreSQL.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
    settings.NEON_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "command_timeout": 30,
        "server_settings": {
            "application_name": "CyberX Backend",
            "search_path": "public"
        }
    }
)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    """FastAPI dependency that yields an async DB session."""
    async with async_session_factory() as session:
        yield session

async def init_db():
    """Create all tables on startup."""
    try:
        async with engine.begin() as conn:
            from app.models import models  # noqa: F401  — ensure models are imported
            await conn.run_sync(Base.metadata.create_all)
            print("Successfully initialized Neon database schemas.")
    except Exception as e:
        print(f"CRITICAL: Failed to initialize Neon PostgreSQL: {e}")
        # We don't raise here so the app can still serve health check for debugging
