"""Forecast accuracy analytics using pandas and numpy."""
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
from typing import Optional
import asyncio

from app.services.elexon import elexon_client
from app.models.schemas import (
    AccuracyMetrics,
    AccuracyResponse,
    DailyAccuracy,
    HourlyAccuracy,
    ErrorDistributionBin,
    GenerationDataPoint,
    ComparisonResponse,
    DayAheadRecord,
    DayAheadResponse,
)

logger = logging.getLogger(__name__)


def _parse_actuals_to_df(records: list[dict]) -> pd.DataFrame:
    """Parse raw FUELHH records into a clean DataFrame."""
    if not records:
        return pd.DataFrame(columns=["timestamp", "actual_mw"])
    
    df = pd.DataFrame(records)
    if "startTime" not in df.columns or "generation" not in df.columns:
        return pd.DataFrame(columns=["timestamp", "actual_mw"])
    
    df["timestamp"] = pd.to_datetime(df["startTime"], utc=True)
    df = df.rename(columns={"generation": "actual_mw"})
    df = df[["timestamp", "actual_mw"]].dropna(subset=["timestamp"])
    df = df.drop_duplicates(subset=["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def _parse_forecasts_to_df(records: list[dict]) -> pd.DataFrame:
    """Parse raw WINDFOR records into a clean DataFrame."""
    if not records:
        return pd.DataFrame(columns=["timestamp", "forecast_mw", "publish_time"])
    
    df = pd.DataFrame(records)
    if "startTime" not in df.columns or "generation" not in df.columns or "publishTime" not in df.columns:
        return pd.DataFrame(columns=["timestamp", "forecast_mw", "publish_time"])
    
    df["timestamp"] = pd.to_datetime(df["startTime"], utc=True)
    df["publish_time"] = pd.to_datetime(df["publishTime"], utc=True)
    df = df.rename(columns={"generation": "forecast_mw"})
    df = df[["timestamp", "forecast_mw", "publish_time"]].dropna(subset=["timestamp", "publish_time"])
    df = df.sort_values(["timestamp", "publish_time"]).reset_index(drop=True)
    return df


def _expand_hourly_forecasts_to_half_hourly(forecasts_df: pd.DataFrame) -> pd.DataFrame:
    """
    Expand hourly wind forecasts to 30-minute settlement periods.
    In the UK power market, national wind forecasts from ESO are typically provided
    hourly. Settlement occurs in 30-minute periods. An hourly forecast for hour H
    applies to both settlement periods of that hour (H:00 and H:30).
    """
    if forecasts_df.empty:
        return forecasts_df
    
    df = forecasts_df.copy()
    
    # Identify records at :00 minutes
    zeros = df[df["timestamp"].dt.minute == 0].copy()
    if zeros.empty:
        return df
    
    # Create corresponding :30 minutes records
    thirty = zeros.copy()
    thirty["timestamp"] = thirty["timestamp"] + pd.Timedelta(minutes=30)
    
    # Combine and drop duplicates (giving precedence to any explicitly published :30 records)
    combined = pd.concat([df, thirty], ignore_index=True)
    combined = combined.drop_duplicates(subset=["timestamp", "publish_time"], keep="first")
    combined = combined.sort_values(["timestamp", "publish_time"]).reset_index(drop=True)
    return combined


def _get_day_ahead_forecasts(
    forecasts_df: pd.DataFrame,
    gate_closure_hour: int = 11,
) -> pd.DataFrame:
    """
    For each target delivery period, extract the latest forecast that was published
    before Day-Ahead gate closure (11:00 UTC on D-1).
    
    Example:
    For delivery on 2026-01-15, gate closure is 2026-01-14 11:00 UTC.
    Only forecasts published on or before 2026-01-14 11:00:00 UTC are valid.
    Among those, the latest publishTime is selected for each target settlement period.
    """
    if forecasts_df.empty:
        return pd.DataFrame(columns=["timestamp", "forecast_mw", "publish_time"])
    
    df = forecasts_df.copy()
    
    # Gate closure cutoff for any delivery date D is (D - 1 day) at gate_closure_hour:00:00 UTC
    delivery_date = df["timestamp"].dt.floor("D")
    df["gate_closure"] = delivery_date - pd.Timedelta(days=1) + pd.Timedelta(hours=gate_closure_hour)
    
    # Filter only forecasts published before or at gate closure
    eligible = df[df["publish_time"] <= df["gate_closure"]].copy()
    
    if eligible.empty:
        # Fallback if no forecast was published before gate closure: take the latest available prior to delivery
        eligible = df[df["publish_time"] <= df["timestamp"]].copy()
        if eligible.empty:
            return pd.DataFrame(columns=["timestamp", "forecast_mw", "publish_time"])
    
    # For each delivery timestamp, select the forecast with the latest publish_time
    idx = eligible.groupby("timestamp")["publish_time"].idxmax()
    result = eligible.loc[idx, ["timestamp", "forecast_mw", "publish_time"]].reset_index(drop=True)
    return result


def calculate_metrics(actual: np.ndarray, forecast: np.ndarray) -> AccuracyMetrics:
    """
    Calculate comprehensive forecast accuracy metrics.
    
    Metrics:
    - MAE: Mean Absolute Error (MW)
    - RMSE: Root Mean Square Error (MW)
    - MAPE: Mean Absolute Percentage Error (%)
    - MBE: Mean Bias Error (MW) - positive = over-forecast, negative = under-forecast
    - Max Error: Peak absolute error (MW)
    - Correlation: Pearson correlation coefficient [-1, 1]
    """
    if len(actual) == 0 or len(forecast) == 0:
        return AccuracyMetrics(
            mae=0.0, rmse=0.0, mape=0.0, mbe=0.0, max_error=0.0,
            correlation=0.0, n_observations=0,
        )
    
    errors = forecast - actual
    abs_errors = np.abs(errors)
    
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    mbe = float(np.mean(errors))
    max_error = float(np.max(abs_errors))
    
    # MAPE: calculated over non-zero actuals to prevent division by zero
    nonzero_mask = actual > 10.0  # Filter out trivial <10MW noise
    if nonzero_mask.any():
        mape = float(np.mean(abs_errors[nonzero_mask] / actual[nonzero_mask]) * 100.0)
    else:
        mape = 0.0
    
    # Correlation
    if len(actual) > 1 and np.std(actual) > 0 and np.std(forecast) > 0:
        correlation = float(np.corrcoef(actual, forecast)[0, 1])
        if np.isnan(correlation):
            correlation = 0.0
    else:
        correlation = 1.0 if np.all(actual == forecast) else 0.0
    
    return AccuracyMetrics(
        mae=round(mae, 2),
        rmse=round(rmse, 2),
        mape=round(mape, 2),
        mbe=round(mbe, 2),
        max_error=round(max_error, 2),
        correlation=round(correlation, 4),
        n_observations=int(len(actual)),
    )


async def get_comparison_data(
    date_from: str,
    date_to: str,
) -> ComparisonResponse:
    """
    Fetch and align actuals and day-ahead forecasts for the given date range.
    """
    # Publication window: from 2 days prior to date_from, through date_to
    dt_from = datetime.strptime(date_from, "%Y-%m-%d")
    dt_to = datetime.strptime(date_to, "%Y-%m-%d")
    pub_from = (dt_from - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00Z")
    pub_to = dt_to.strftime("%Y-%m-%dT23:59:59Z")
    
    actuals_task = elexon_client.get_wind_actuals(date_from, date_to)
    forecasts_task = elexon_client.get_wind_forecasts(pub_from, pub_to)
    
    actuals_raw, forecasts_raw = await asyncio.gather(actuals_task, forecasts_task)
    
    actuals_df = _parse_actuals_to_df(actuals_raw)
    forecasts_df = _parse_forecasts_to_df(forecasts_raw)
    
    # Filter forecasts targeting the requested date range
    if not forecasts_df.empty:
        t_start = pd.to_datetime(f"{date_from}T00:00:00Z", utc=True)
        t_end = pd.to_datetime(f"{date_to}T23:59:59Z", utc=True)
        forecasts_df = forecasts_df[
            (forecasts_df["timestamp"] >= t_start) & 
            (forecasts_df["timestamp"] <= t_end)
        ]
        forecasts_df = _expand_hourly_forecasts_to_half_hourly(forecasts_df)
        latest_forecasts = _get_day_ahead_forecasts(forecasts_df)
    else:
        latest_forecasts = pd.DataFrame(columns=["timestamp", "forecast_mw", "publish_time"])
    
    # Available forecast vintages list for filter selector
    if not forecasts_df.empty:
        vintages = sorted(forecasts_df["publish_time"].dt.strftime("%Y-%m-%d %H:%M UTC").unique())
        vintage_strs = [str(v) for v in vintages[:50]]
    else:
        vintage_strs = []
    
    # Merge on timestamp
    if not actuals_df.empty and not latest_forecasts.empty:
        merged = pd.merge(actuals_df, latest_forecasts, on="timestamp", how="outer")
        merged = merged.sort_values("timestamp")
        merged["error_mw"] = merged["forecast_mw"] - merged["actual_mw"]
    elif not actuals_df.empty:
        merged = actuals_df.copy()
        merged["forecast_mw"] = None
        merged["error_mw"] = None
    elif not latest_forecasts.empty:
        merged = latest_forecasts.copy()
        merged["actual_mw"] = None
        merged["error_mw"] = None
    else:
        merged = pd.DataFrame(columns=["timestamp", "actual_mw", "forecast_mw", "error_mw"])
    
    # Filter within date range strictly
    t_start = pd.to_datetime(f"{date_from}T00:00:00Z", utc=True)
    t_end = pd.to_datetime(f"{date_to}T23:59:59Z", utc=True)
    merged = merged[(merged["timestamp"] >= t_start) & (merged["timestamp"] <= t_end)]
    
    data_points = []
    for _, row in merged.iterrows():
        data_points.append(GenerationDataPoint(
            timestamp=row["timestamp"],
            actual_mw=None if pd.isna(row.get("actual_mw")) else round(float(row["actual_mw"]), 1),
            forecast_mw=None if pd.isna(row.get("forecast_mw")) else round(float(row["forecast_mw"]), 1),
            error_mw=None if pd.isna(row.get("error_mw")) else round(float(row["error_mw"]), 1),
        ))
    
    return ComparisonResponse(
        date_from=date_from,
        date_to=date_to,
        data=data_points,
        forecast_vintages=vintage_strs,
    )


async def get_accuracy_analysis(
    date_from: str,
    date_to: str,
) -> AccuracyResponse:
    """
    Compute comprehensive accuracy analysis for the date range.
    Returns overall metrics, daily breakdown, hourly pattern, and error distribution.
    """
    dt_from = datetime.strptime(date_from, "%Y-%m-%d")
    dt_to = datetime.strptime(date_to, "%Y-%m-%d")
    pub_from = (dt_from - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00Z")
    pub_to = dt_to.strftime("%Y-%m-%dT23:59:59Z")
    
    actuals_raw, forecasts_raw = await asyncio.gather(
        elexon_client.get_wind_actuals(date_from, date_to),
        elexon_client.get_wind_forecasts(pub_from, pub_to),
    )
    
    actuals_df = _parse_actuals_to_df(actuals_raw)
    forecasts_df = _parse_forecasts_to_df(forecasts_raw)
    
    if not forecasts_df.empty:
        t_start = pd.to_datetime(f"{date_from}T00:00:00Z", utc=True)
        t_end = pd.to_datetime(f"{date_to}T23:59:59Z", utc=True)
        forecasts_df = forecasts_df[
            (forecasts_df["timestamp"] >= t_start) & 
            (forecasts_df["timestamp"] <= t_end)
        ]
        forecasts_df = _expand_hourly_forecasts_to_half_hourly(forecasts_df)
        latest_forecasts = _get_day_ahead_forecasts(forecasts_df)
    else:
        latest_forecasts = pd.DataFrame(columns=["timestamp", "forecast_mw", "publish_time"])
    
    # Inner merge for matched accuracy calculations
    merged = pd.merge(actuals_df, latest_forecasts, on="timestamp", how="inner")
    
    if merged.empty:
        return AccuracyResponse(
            overall=AccuracyMetrics(
                mae=0, rmse=0, mape=0, mbe=0, max_error=0, 
                correlation=0, n_observations=0
            ),
            daily=[], hourly=[], error_distribution=[],
        )
    
    actual = merged["actual_mw"].values
    forecast = merged["forecast_mw"].values
    
    overall = calculate_metrics(actual, forecast)
    
    # Daily breakdown
    merged["date"] = merged["timestamp"].dt.strftime("%Y-%m-%d")
    daily_groups = merged.groupby("date")
    daily_list = []
    for date_str, group in daily_groups:
        if len(group) > 0:
            day_metrics = calculate_metrics(
                group["actual_mw"].values, 
                group["forecast_mw"].values
            )
            daily_list.append(DailyAccuracy(
                date=date_str,
                mae=day_metrics.mae,
                rmse=day_metrics.rmse,
                mape=day_metrics.mape,
                mbe=day_metrics.mbe,
                mean_actual=round(float(group["actual_mw"].mean()), 1),
                mean_forecast=round(float(group["forecast_mw"].mean()), 1),
                n_observations=len(group),
            ))
    
    # Hourly breakdown (by hour of day 0-23 to detect time-of-day bias)
    merged["hour"] = merged["timestamp"].dt.hour
    hourly_groups = merged.groupby("hour")
    hourly_list = []
    for hour in range(24):
        if hour in hourly_groups.groups:
            group = hourly_groups.get_group(hour)
            h_metrics = calculate_metrics(
                group["actual_mw"].values, 
                group["forecast_mw"].values
            )
            hourly_list.append(HourlyAccuracy(
                hour=int(hour),
                mae=h_metrics.mae,
                mbe=h_metrics.mbe,
                rmse=h_metrics.rmse,
                n_observations=len(group),
            ))
        else:
            hourly_list.append(HourlyAccuracy(
                hour=int(hour), mae=0.0, mbe=0.0, rmse=0.0, n_observations=0
            ))
    
    # Error distribution histogram (30 bins)
    errors = forecast - actual
    n_bins = 25
    hist_counts, bin_edges = np.histogram(errors, bins=n_bins)
    total = len(errors)
    error_dist = []
    for i in range(len(hist_counts)):
        error_dist.append(ErrorDistributionBin(
            bin_start=round(float(bin_edges[i]), 1),
            bin_end=round(float(bin_edges[i + 1]), 1),
            count=int(hist_counts[i]),
            percentage=round(float(hist_counts[i] / total * 100), 2) if total > 0 else 0.0,
        ))
    
    return AccuracyResponse(
        overall=overall,
        daily=daily_list,
        hourly=hourly_list,
        error_distribution=error_dist,
    )


async def get_day_ahead_view(
    delivery_date: str,
) -> DayAheadResponse:
    """
    Get day-ahead decision view for a specific delivery date.
    
    Shows what the latest available forecast was when the procurement team had to make
    their purchasing decision (Gate Closure at 11:00 UTC on D-1).
    """
    delivery_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
    d_minus_1 = delivery_dt - timedelta(days=1)
    gate_closure_str = d_minus_1.strftime("%Y-%m-%dT11:00:00Z")
    
    # Fetch actuals for delivery day
    actuals_task = elexon_client.get_wind_actuals(delivery_date, delivery_date)
    
    # Fetch forecasts published up to gate closure (from 2 days before)
    pub_from = (d_minus_1 - timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
    forecasts_task = elexon_client.get_wind_forecasts(pub_from, gate_closure_str)
    
    actuals_raw, forecasts_raw = await asyncio.gather(actuals_task, forecasts_task)
    
    actuals_df = _parse_actuals_to_df(actuals_raw)
    forecasts_df = _parse_forecasts_to_df(forecasts_raw)
    
    # Filter to forecasts targeting delivery date
    if not forecasts_df.empty:
        t_start = pd.to_datetime(f"{delivery_date}T00:00:00Z", utc=True)
        t_end = pd.to_datetime(f"{delivery_date}T23:59:59Z", utc=True)
        forecasts_df = forecasts_df[
            (forecasts_df["timestamp"] >= t_start) & 
            (forecasts_df["timestamp"] <= t_end)
        ]
        forecasts_df = _expand_hourly_forecasts_to_half_hourly(forecasts_df)
        
        # Pick latest published prior to gate closure
        idx = forecasts_df.groupby("timestamp")["publish_time"].idxmax()
        latest = forecasts_df.loc[idx].reset_index(drop=True)
        latest_pub = latest["publish_time"].max()
        forecast_vintage = latest_pub.strftime("%Y-%m-%d %H:%M UTC") if pd.notna(latest_pub) else "N/A"
    else:
        latest = pd.DataFrame(columns=["timestamp", "forecast_mw", "publish_time"])
        forecast_vintage = "N/A"
    
    # Merge with actuals
    if not actuals_df.empty and not latest.empty:
        merged = pd.merge(actuals_df, latest, on="timestamp", how="outer")
    elif not actuals_df.empty:
        merged = actuals_df.copy()
        merged["forecast_mw"] = None
        merged["publish_time"] = None
    else:
        merged = latest.copy()
        merged["actual_mw"] = None
    
    merged = merged.sort_values("timestamp")
    
    records = []
    for _, row in merged.iterrows():
        actual = None if pd.isna(row.get("actual_mw")) else round(float(row["actual_mw"]), 1)
        forecast = None if pd.isna(row.get("forecast_mw")) else round(float(row["forecast_mw"]), 1)
        error = None
        error_pct = None
        if actual is not None and forecast is not None:
            error = round(forecast - actual, 1)
            if actual > 10:
                error_pct = round(abs(error) / actual * 100, 1)
        
        pub_time = None
        if "publish_time" in row and pd.notna(row.get("publish_time")):
            pub_time = row["publish_time"]
        
        records.append(DayAheadRecord(
            delivery_time=row["timestamp"],
            latest_forecast_mw=forecast,
            forecast_publish_time=pub_time,
            actual_mw=actual,
            error_mw=error,
            error_pct=error_pct,
        ))
    
    matched = [(r.actual_mw, r.latest_forecast_mw) for r in records 
               if r.actual_mw is not None and r.latest_forecast_mw is not None]
    
    if matched:
        actuals_arr = np.array([m[0] for m in matched])
        forecasts_arr = np.array([m[1] for m in matched])
        summary = calculate_metrics(actuals_arr, forecasts_arr)
    else:
        summary = AccuracyMetrics(
            mae=0, rmse=0, mape=0, mbe=0, max_error=0, 
            correlation=0, n_observations=0
        )
    
    return DayAheadResponse(
        delivery_date=delivery_date,
        gate_closure=gate_closure_str,
        forecast_vintage=forecast_vintage,
        records=records,
        summary=summary,
    )
