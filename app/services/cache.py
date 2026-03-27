import time
import logging

logger = logging.getLogger("security_logger")

class MockRedis:
    """An in-memory mock for Redis to prevent 500 errors on local environments without Redis."""
    def __init__(self):
        self._data = {}
        self._expires = {}
        logger.warning("Initializing Mock In-Memory Redis instance. Do not use in production.")
        
    async def get(self, key):
        if key in self._expires and time.time() > self._expires[key]:
            self._data.pop(key, None)
            self._expires.pop(key, None)
            return None
        return self._data.get(key)
        
    async def setex(self, key, seconds, value):
        self._data[key] = str(value)
        self._expires[key] = time.time() + seconds
        
    async def delete(self, key):
        self._data.pop(key, None)
        self._expires.pop(key, None)
        
    def pipeline(self):
        return self
        
    def incr(self, key, amount=1):
        if key in self._expires and time.time() > self._expires[key]:
            self._data.pop(key, None)
            self._expires.pop(key, None)
        self._data[key] = str(int(self._data.get(key, 0)) + amount)
        return self
        
    def expire(self, key, seconds):
        self._expires[key] = time.time() + seconds
        return self
        
    async def execute(self):
        pass

# Global shared instance
redis_client = MockRedis()
