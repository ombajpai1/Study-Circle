import logging
import time
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger(__name__)

class InMemoryRedis:
    def __init__(self):
        self._data = {}
        self._expires = {}
        logger.info("GracefulRedis: Initialized in-memory fallback storage.")

    async def get(self, key):
        if key in self._expires:
            if time.time() > self._expires[key]:
                self._data.pop(key, None)
                self._expires.pop(key, None)
                return None
        return self._data.get(key)

    async def set(self, key, value, ex=None):
        self._data[key] = value
        if ex:
            self._expires[key] = time.time() + ex
        else:
            self._expires.pop(key, None)
        return True

    async def delete(self, key):
        self._data.pop(key, None)
        self._expires.pop(key, None)
        return 1

    async def ttl(self, key):
        if key not in self._data:
            return -2
        if key not in self._expires:
            return -1
        remaining = int(self._expires[key] - time.time())
        return remaining if remaining > 0 else -2

class GracefulRedis:
    def __init__(self, real_client):
        self.real = real_client
        self.fallback = None

    def _get_client(self):
        if self.fallback:
            return self.fallback
        return self.real

    async def get(self, key):
        client = self._get_client()
        try:
            return await client.get(key)
        except Exception:
            if not self.fallback:
                logger.warning("GracefulRedis: Connection refused on port 6379. Instantiating in-memory fallback...")
                self.fallback = InMemoryRedis()
            return await self.fallback.get(key)

    async def set(self, key, value, ex=None):
        client = self._get_client()
        try:
            return await client.set(key, value, ex=ex)
        except Exception:
            if not self.fallback:
                logger.warning("GracefulRedis: Connection refused on port 6379. Instantiating in-memory fallback...")
                self.fallback = InMemoryRedis()
            return await self.fallback.set(key, value, ex=ex)

    async def delete(self, key):
        client = self._get_client()
        try:
            return await client.delete(key)
        except Exception:
            if not self.fallback:
                logger.warning("GracefulRedis: Connection refused on port 6379. Instantiating in-memory fallback...")
                self.fallback = InMemoryRedis()
            return await self.fallback.delete(key)

    async def ttl(self, key):
        client = self._get_client()
        try:
            return await client.ttl(key)
        except Exception:
            if not self.fallback:
                logger.warning("GracefulRedis: Connection refused on port 6379. Instantiating in-memory fallback...")
                self.fallback = InMemoryRedis()
            return await self.fallback.ttl(key)

# Initialize pool
pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL, 
    decode_responses=True  
)

# Wrap real client
real_redis = redis.Redis(connection_pool=pool)
redis_client = GracefulRedis(real_redis)