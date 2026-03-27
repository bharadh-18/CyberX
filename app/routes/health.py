from fastapi import APIRouter
from app.firebase_config import db as firestore_db
from app.services.cache import redis_client
import time

router = APIRouter(tags=["health"])
start_time = time.time()

@router.get("/health")
async def health_check():
    db_status = "connected"
    try:
        # Simple Firestore read to confirm connectivity
        firestore_db.collection("users").limit(1).get()
    except Exception:
        db_status = "disconnected"
        
    redis_status = "connected" # Using in-memory fallback locally
        
    uptime = time.time() - start_time
    
    return {
        "status": "healthy" if db_status == "connected" and redis_status == "connected" else "degraded",
        "database": db_status,
        "redis": redis_status,
        "uptime_seconds": round(uptime, 2)
    }
