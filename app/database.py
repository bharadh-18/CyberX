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
    async with engine.begin() as conn:
        from app.models import models  # noqa: F401  — ensure models are imported
        await conn.run_sync(Base.metadata.create_all)
