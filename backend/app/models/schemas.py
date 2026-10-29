"""Pydantic schemas for API request/response models."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# --- Elexon Raw Data Models ---

class WindActual(BaseModel):
    """Single half-hourly wind generation actual reading."""
    settlement_date: str = Field(..., alias="settlementDate")
    settlement_period: int = Field(..., alias="settlementPeriod")
    start_time: datetime = Field(..., alias="startTime")
    generation: float
    fuel_type: str = Field(default="WIND", alias="fuelType")

    class Config:
        populate_by_name = True


class WindForecast(BaseModel):
    """Single wind generation forecast reading."""
    publish_time: datetime = Field(..., alias="publishTime")
    start_time: datetime = Field(..., alias="startTime")
    generation: float

    class Config:
        populate_by_name = True


# --- API Response Models ---

class GenerationDataPoint(BaseModel):
    """A single time-series data point for generation."""
    timestamp: datetime
    actual_mw: Optional[float] = None
    forecast_mw: Optional[float] = None
    error_mw: Optional[float] = None  # forecast - actual


class ForecastVintage(BaseModel):
    """Metadata about a specific forecast publication."""
    publish_time: datetime
    label: str  # e.g., "08:30 D-1"
    data_points: list[GenerationDataPoint]


class ComparisonResponse(BaseModel):
    """Response for forecast vs actual comparison."""
    date_from: str
    date_to: str
    data: list[GenerationDataPoint]
    forecast_vintages: list[str]  # publish times available


class AccuracyMetrics(BaseModel):
    """Quantitative forecast accuracy metrics."""
    mae: float = Field(..., description="Mean Absolute Error (MW)")
    rmse: float = Field(..., description="Root Mean Square Error (MW)")
    mape: float = Field(..., description="Mean Absolute Percentage Error (%)")
    mbe: float = Field(..., description="Mean Bias Error (MW) - positive means over-forecast")
    max_error: float = Field(..., description="Maximum absolute error (MW)")
    correlation: float = Field(..., description="Pearson correlation coefficient")
    n_observations: int = Field(..., description="Number of matched observations")


class ErrorDistributionBin(BaseModel):
    """A single bin in the error distribution histogram."""
    bin_start: float
    bin_end: float
    count: int
    percentage: float


class HourlyAccuracy(BaseModel):
    """Accuracy metrics broken down by hour of day."""
    hour: int
    mae: float
    mbe: float
    rmse: float
    n_observations: int


class DailyAccuracy(BaseModel):
    """Accuracy metrics for a single day."""
    date: str
    mae: float
    rmse: float
    mape: float
    mbe: float
    mean_actual: float
    mean_forecast: float
    n_observations: int


class AccuracyResponse(BaseModel):
    """Full accuracy analysis response."""
    overall: AccuracyMetrics
    daily: list[DailyAccuracy]
    hourly: list[HourlyAccuracy]
    error_distribution: list[ErrorDistributionBin]


class DayAheadRecord(BaseModel):
    """Day-ahead decision support for a single delivery period."""
    delivery_time: datetime
    latest_forecast_mw: Optional[float] = None
    forecast_publish_time: Optional[datetime] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None
    error_pct: Optional[float] = None


class DayAheadResponse(BaseModel):
    """Day-ahead decision view response."""
    delivery_date: str
    gate_closure: str  # When decision was made
    forecast_vintage: str  # Which forecast was used
    records: list[DayAheadRecord]
    summary: AccuracyMetrics


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    elexon_api_status: str
