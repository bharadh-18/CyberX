from fastapi import APIRouter
from app.config import settings
from app.database import engine
import redis.asyncio as redis
import time

router = APIRouter(tags=["health"])
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
start_time = time.time()

@router.get("/health")
async def health_check():
    db_status = "connected"
    try:
        async with engine.connect() as conn:
            pass
    except Exception:
        db_status = "disconnected"
        
    redis_status = "connected"
    try:
        await redis_client.ping()
    except Exception:
        redis_status = "disconnected"
        
    uptime = time.time() - start_time
    
    return {
        "status": "healthy" if db_status == "connected" and redis_status == "connected" else "degraded",
        "database": db_status,
        "redis": redis_status,
        "uptime_seconds": round(uptime, 2)
    }
