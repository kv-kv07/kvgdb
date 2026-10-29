"""GridBricks API - UK Wind Power Forecast Accuracy Dashboard."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import wind
from app.services.elexon import elexon_client
from app.models.schemas import HealthResponse

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    yield
    # Cleanup
    logger.info("Shutting down, closing HTTP clients...")
    await elexon_client.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API for UK Wind Power Forecast Accuracy Dashboard. "
        "Provides forecast vs actual comparison and accuracy metrics "
        "using Elexon BMRS data for day-ahead market decisions."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(wind.router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "endpoints": {
            "comparison": "/api/wind/comparison",
            "accuracy": "/api/wind/accuracy",
            "day_ahead": "/api/wind/day-ahead/{delivery_date}",
        },
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    elexon_ok = await elexon_client.health_check()
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        elexon_api_status="connected" if elexon_ok else "unreachable",
    )
