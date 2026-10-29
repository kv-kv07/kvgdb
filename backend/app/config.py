"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    APP_NAME: str = "GridBricks API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Elexon BMRS API
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ]
    
    # Cache TTL in seconds (30 minutes default)
    CACHE_TTL: int = 1800
    
    # Data scope
    DATA_MONTH: int = 1  # January
    DATA_YEAR: int = 2026
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
