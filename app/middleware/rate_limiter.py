import time
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
from app.config import settings
from app.services.cache import redis_client

class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        
        key = f"rl:ip:{ip}"
        try:
            current = await redis_client.get(key)
            if current and int(current) >= settings.RATE_LIMIT_PER_IP:
                return JSONResponse(status_code=429, content={"detail": "Too Many Requests"}, headers={"Retry-After": "60"})
            
            pipe = redis_client.pipeline()
            pipe.incr(key, 1)
            pipe.expire(key, 60)
            await pipe.execute()
        except redis.ConnectionError:
            # Fallback if Redis is down
            pass
            
        return await call_next(request)
