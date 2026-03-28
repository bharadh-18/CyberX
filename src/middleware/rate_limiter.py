import time
from typing import Dict, Tuple, Callable
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import aioredis
from src.config import settings
from src.logging_config import logger

class RateLimiter:
    def __init__(self):
        self.redis = None
        self.local_cache: Dict[str, Tuple[int, float]] = {}
        
        # Rate limits (requests, window_seconds)
        self.GLOBAL_LIMIT = (10000, 60)
        self.IP_LIMIT = (100, 60)
        self.USER_LIMIT = (1000, 3600)
        self.AUTH_LIMIT = (5, 60) # /auth endpoints

    async def connect(self):
        try:
            self.redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            # Test connection
            await self.redis.ping()
        except Exception as e:
            logger.warning(f"Failed to connect to Redis for rate limiting: {e}. Falling back to in-memory.")
            self.redis = None

    async def close(self):
        if self.redis:
            await self.redis.close()

    async def _check_limit(self, key: str, limit: int, window: int) -> Tuple[bool, int, int]:
        """
        Returns (is_allowed, remaining, reset_time_epoch)
        """
        now = int(time.time())
        window_start = now - window
        
        if self.redis:
            # Redis sliding window using sorted sets
            pipeline = self.redis.pipeline()
            # Remove old entries
            pipeline.zremrangebyscore(key, 0, window_start)
            # Count current entries
            pipeline.zcard(key)
            # Add new entry
            pipeline.zadd(key, {f"{now}:{time.time()}": now}) # unique member
            pipeline.expire(key, window)
            results = await pipeline.execute()
            
            count = results[1]
            if count >= limit:
                return False, 0, now + window
            
            return True, limit - count - 1, now + window
        else:
            # Fallback to local memory (leaky bucket approximation for simplicity in fallback)
            # This is NOT a true sliding window and is just to prevent complete failure
            count, reset_at = self.local_cache.get(key, (0, now + window))
            if now > reset_at:
                count = 0
                reset_at = now + window
                
            if count >= limit:
                return False, 0, reset_at
                
            self.local_cache[key] = (count + 1, reset_at)
            return True, limit - count - 1, reset_at

    async def __call__(self, request: Request, call_next):
        # Determine client identifier
        client_ip = request.client.host if request.client else "127.0.0.1"
        path = request.url.path
        
        # Check global limit
        allowed, rem, reset = await self._check_limit("global", *self.GLOBAL_LIMIT)
        if not allowed:
            return self._rate_limit_response("Global limit exceeded", reset)

        # Check path specific limits
        if path.startswith("/auth"):
            allowed, rem, reset = await self._check_limit(f"auth:{client_ip}", *self.AUTH_LIMIT)
            if not allowed:
                return self._rate_limit_response("Too many authentication attempts", reset)
        
        # Check IP limit
        allowed, rem, reset = await self._check_limit(f"ip:{client_ip}", *self.IP_LIMIT)
        if not allowed:
            return self._rate_limit_response("Too many requests from this IP", reset)

        # Proceed with request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.IP_LIMIT[0])
        response.headers["X-RateLimit-Remaining"] = str(rem)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response

    def _rate_limit_response(self, detail: str, reset: int):
        logger.warning(
            f"Rate limit exceeded: {detail}", 
            extra={"category": "INTRUSION_DETECTION", "severity": "WARNING"}
        )
        return JSONResponse(
            status_code=429,
            content={"detail": detail},
            headers={"Retry-After": str(reset - int(time.time()))}
        )

rate_limiter = RateLimiter()
