"""Elexon BMRS API client with async HTTP and robust caching."""
import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional
from collections import OrderedDict
import time
import asyncio

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


class TTLCache:
    """Thread-safe TTL cache for API responses."""
    
    def __init__(self, maxsize: int = 200, ttl: int = 1800):
        self._cache: OrderedDict[str, tuple[float, any]] = OrderedDict()
        self._maxsize = maxsize
        self._ttl = ttl
        self._lock: Optional[asyncio.Lock] = None
        self._lock_loop = None

    def _get_lock(self) -> asyncio.Lock:
        current_loop = asyncio.get_running_loop()
        if self._lock is None or self._lock_loop != current_loop:
            self._lock = asyncio.Lock()
            self._lock_loop = current_loop
        return self._lock
    
    async def get(self, key: str) -> Optional[any]:
        async with self._get_lock():
            if key in self._cache:
                timestamp, value = self._cache[key]
                if time.time() - timestamp < self._ttl:
                    self._cache.move_to_end(key)
                    return value
                else:
                    del self._cache[key]
        return None
    
    async def set(self, key: str, value: any):
        async with self._get_lock():
            if key in self._cache:
                del self._cache[key]
            elif len(self._cache) >= self._maxsize:
                self._cache.popitem(last=False)
            self._cache[key] = (time.time(), value)
    
    async def clear(self):
        async with self._get_lock():
            self._cache.clear()


_cache = TTLCache(maxsize=200, ttl=settings.CACHE_TTL)


class ElexonClient:
    """Async client for Elexon BMRS Insights API."""
    
    def __init__(self):
        self.base_url = settings.ELEXON_BASE_URL
        self._client: Optional[httpx.AsyncClient] = None
        self._loop = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client, handling event loop changes cleanly."""
        current_loop = asyncio.get_running_loop()
        if self._client is None or self._client.is_closed or self._loop != current_loop:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(45.0, connect=15.0),
                headers={"Accept": "application/json"},
            )
            self._loop = current_loop
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    async def get_wind_actuals(
        self,
        date_from: str,
        date_to: str,
    ) -> list[dict]:
        """
        Fetch actual wind generation data from FUELHH dataset.
        
        Args:
            date_from: Start date in YYYY-MM-DD format
            date_to: End date in YYYY-MM-DD format
            
        Returns:
            List of half-hourly wind generation records filtered to WIND
        """
        cache_key = f"actuals:{date_from}:{date_to}"
        cached = await _cache.get(cache_key)
        if cached is not None:
            logger.info(f"Cache hit for wind actuals {date_from} to {date_to}")
            return cached
        
        logger.info(f"Fetching wind actuals from {date_from} to {date_to}")
        client = await self._get_client()
        
        all_records = []
        current_date = datetime.strptime(date_from, "%Y-%m-%d")
        end_date = datetime.strptime(date_to, "%Y-%m-%d")
        
        # Chunk in 7-day windows for fast stream retrieval
        while current_date <= end_date:
            chunk_end = min(current_date + timedelta(days=6), end_date)
            
            params = {
                "settlementDateFrom": current_date.strftime("%Y-%m-%d"),
                "settlementDateTo": chunk_end.strftime("%Y-%m-%d"),
                "fuelType": "WIND",
            }
            
            try:
                response = await client.get("/datasets/FUELHH/stream", params=params)
                response.raise_for_status()
                records = response.json()
                if isinstance(records, list):
                    all_records.extend(records)
                logger.info(
                    f"Fetched {len(records)} FUELHH records for "
                    f"{current_date.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}"
                )
            except Exception as e:
                logger.error(f"Error fetching FUELHH chunk: {e}")
                raise
            
            current_date = chunk_end + timedelta(days=1)
        
        await _cache.set(cache_key, all_records)
        return all_records
    
    async def get_wind_forecasts(
        self,
        publish_time_from: str,
        publish_time_to: str,
    ) -> list[dict]:
        """
        Fetch wind generation forecasts from WINDFOR dataset stream.
        
        The Elexon WINDFOR stream endpoint filters on publishDateTimeFrom and publishDateTimeTo.
        
        Args:
            publish_time_from: ISO 8601 timestamp string (e.g. 2026-01-01T00:00:00Z)
            publish_time_to: ISO 8601 timestamp string (e.g. 2026-01-07T23:59:59Z)
            
        Returns:
            List of forecast records with publishTime, startTime, and generation
        """
        cache_key = f"forecasts:{publish_time_from}:{publish_time_to}"
        cached = await _cache.get(cache_key)
        if cached is not None:
            logger.info("Cache hit for wind forecasts")
            return cached
        
        logger.info(f"Fetching wind forecasts published between {publish_time_from} and {publish_time_to}")
        client = await self._get_client()
        
        all_records = []
        current = datetime.fromisoformat(publish_time_from.replace("Z", "+00:00"))
        end = datetime.fromisoformat(publish_time_to.replace("Z", "+00:00"))
        
        # Chunk in 4-day windows to prevent large payload timeouts
        while current <= end:
            chunk_end = min(current + timedelta(days=4), end)
            
            params = {
                "publishDateTimeFrom": current.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "publishDateTimeTo": chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
            
            try:
                response = await client.get("/datasets/WINDFOR/stream", params=params)
                response.raise_for_status()
                records = response.json()
                if isinstance(records, list):
                    all_records.extend(records)
                logger.info(f"Fetched {len(records)} WINDFOR records for chunk {current.date()} - {chunk_end.date()}")
            except Exception as e:
                logger.error(f"Error fetching WINDFOR chunk: {e}")
                raise
            
            current = chunk_end + timedelta(seconds=1)
        
        await _cache.set(cache_key, all_records)
        return all_records
    
    async def health_check(self) -> bool:
        """Check if Elexon API is reachable."""
        try:
            client = await self._get_client()
            response = await client.get("/datasets/FUELHH", params={"format": "json"})
            return response.status_code == 200
        except Exception:
            return False


# Singleton instance
elexon_client = ElexonClient()
