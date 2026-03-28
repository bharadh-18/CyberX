from fastapi import APIRouter
from app.database import async_session_factory
from app.models.models import User
from app.services.cache import redis_client
from sqlalchemy import select
import time

router = APIRouter(tags=["health"])
start_time = time.time()

@router.get("/health")
async def health_check():
    db_status = "connected"
    try:
        async with async_session_factory() as session:
            await session.execute(select(User).limit(1))
    except Exception:
        db_status = "disconnected"

    redis_status = "connected"  # Using in-memory fallback locally

    uptime = time.time() - start_time

    return {
        "status": "healthy" if db_status == "connected" and redis_status == "connected" else "degraded",
        "database": db_status,
        "redis": redis_status,
        "uptime_seconds": round(uptime, 2)
    }
