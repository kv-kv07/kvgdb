"""Wind generation API routes."""
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime

from app.models.schemas import (
    ComparisonResponse,
    AccuracyResponse,
    DayAheadResponse,
)
from app.services import analytics

router = APIRouter(prefix="/api/wind", tags=["Wind Generation"])


@router.get("/comparison", response_model=ComparisonResponse)
async def get_comparison(
    date_from: str = Query(
        default="2026-01-01",
        description="Start date (YYYY-MM-DD)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    date_to: str = Query(
        default="2026-01-31",
        description="End date (YYYY-MM-DD)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
):
    """
    Get forecast vs actual wind generation comparison.
    
    Returns time-series data with matched forecast and actual values,
    using the latest day-ahead forecast available for each delivery period.
    """
    try:
        # Validate date range
        start = datetime.strptime(date_from, "%Y-%m-%d")
        end = datetime.strptime(date_to, "%Y-%m-%d")
        if start > end:
            raise HTTPException(400, "date_from must be before date_to")
        if (end - start).days > 62:
            raise HTTPException(400, "Date range cannot exceed 62 days")
        
        return await analytics.get_comparison_data(date_from, date_to)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching comparison data: {str(e)}")


@router.get("/accuracy", response_model=AccuracyResponse)
async def get_accuracy(
    date_from: str = Query(
        default="2026-01-01",
        description="Start date (YYYY-MM-DD)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    date_to: str = Query(
        default="2026-01-31",
        description="End date (YYYY-MM-DD)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
):
    """
    Get comprehensive forecast accuracy analysis.
    
    Returns overall metrics (MAE, RMSE, MAPE, MBE), daily and hourly
    breakdowns, and error distribution histogram data.
    """
    try:
        start = datetime.strptime(date_from, "%Y-%m-%d")
        end = datetime.strptime(date_to, "%Y-%m-%d")
        if start > end:
            raise HTTPException(400, "date_from must be before date_to")
        
        return await analytics.get_accuracy_analysis(date_from, date_to)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error computing accuracy: {str(e)}")


@router.get("/day-ahead/{delivery_date}", response_model=DayAheadResponse)
async def get_day_ahead(
    delivery_date: str,
):
    """
    Get day-ahead decision view for a specific delivery date.
    
    Shows the latest forecast that was available at gate closure (D-1)
    alongside actual generation, with per-period error analysis.
    """
    try:
        datetime.strptime(delivery_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "delivery_date must be in YYYY-MM-DD format")
    
    try:
        return await analytics.get_day_ahead_view(delivery_date)
    except Exception as e:
        raise HTTPException(500, f"Error fetching day-ahead data: {str(e)}")
