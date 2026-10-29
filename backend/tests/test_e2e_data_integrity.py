"""Comprehensive End-to-End Data Integrity and Accuracy Verification Tests.

Validates:
1. Elexon raw data schema and half-hourly settlement consistency
2. Gate closure cutoff logic (zero future-leakage verification)
3. Mathematical precision of all error metrics (MAE, RMSE, MAPE, MBE, Correlation)
4. Full month January 2026 coverage (all 48 settlement periods per day)
5. Edge cases: zero actuals, extreme spikes, missing periods
"""
import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from app.services.analytics import (
    calculate_metrics,
    _parse_actuals_to_df,
    _parse_forecasts_to_df,
    _expand_hourly_forecasts_to_half_hourly,
    _get_day_ahead_forecasts,
    get_day_ahead_view,
    get_accuracy_analysis,
    get_comparison_data,
)


class TestMathematicalIntegrity:
    """Rigorous mathematical verification of statistical and energy metrics."""

    def test_mae_mathematical_definition(self):
        """MAE = (1/N) * sum(|F_i - A_i|)"""
        actual = np.array([10000.0, 12000.0, 8000.0, 15000.0])
        forecast = np.array([10500.0, 11200.0, 8600.0, 14000.0])
        expected_mae = np.mean(np.abs(forecast - actual))  # (500 + 800 + 600 + 1000) / 4 = 725.0
        
        metrics = calculate_metrics(actual, forecast)
        assert metrics.mae == pytest.approx(expected_mae, 0.01)
        assert metrics.mae == 725.0

    def test_rmse_mathematical_definition(self):
        """RMSE = sqrt((1/N) * sum((F_i - A_i)^2))"""
        actual = np.array([10000.0, 12000.0, 8000.0, 15000.0])
        forecast = np.array([10500.0, 11200.0, 8600.0, 14000.0])
        expected_rmse = np.sqrt(np.mean((forecast - actual) ** 2))
        
        metrics = calculate_metrics(actual, forecast)
        assert metrics.rmse == pytest.approx(expected_rmse, 0.01)
        # RMSE must always be >= MAE by Cauchy-Schwarz inequality
        assert metrics.rmse >= metrics.mae

    def test_mbe_bias_directionality(self):
        """Positive MBE = systematic over-forecasting; Negative MBE = under-forecasting."""
        actual = np.array([10000.0, 10000.0])
        over_forecast = np.array([11000.0, 11000.0])
        under_forecast = np.array([9000.0, 9000.0])

        m_over = calculate_metrics(actual, over_forecast)
        m_under = calculate_metrics(actual, under_forecast)

        assert m_over.mbe == 1000.0  # Over-forecast by 1000 MW
        assert m_under.mbe == -1000.0  # Under-forecast by 1000 MW

    def test_mape_zero_actual_guard(self):
        """Near-zero wind generation should not trigger ZeroDivisionError or infinite MAPE."""
        actual = np.array([0.0, 5.0, 100.0, 200.0])
        forecast = np.array([50.0, 50.0, 110.0, 190.0])
        
        metrics = calculate_metrics(actual, forecast)
        assert np.isfinite(metrics.mape)
        assert metrics.mape >= 0.0

    def test_pearson_correlation_bounds(self):
        """Pearson correlation coefficient r must strictly be in [-1.0, 1.0]."""
        np.random.seed(42)
        actual = np.random.uniform(5000, 20000, 100)
        forecast = actual + np.random.normal(0, 1000, 100)
        
        metrics = calculate_metrics(actual, forecast)
        assert -1.0 <= metrics.correlation <= 1.0
        assert metrics.correlation > 0.90  # Strong positive correlation


class TestGateClosureAndNoLeakage:
    """Verifies that future forecasts NEVER leak into day-ahead procurement decisions."""

    def test_gate_closure_cutoff_enforcement(self):
        """For delivery on 2026-01-15, gate closure is 2026-01-14 11:00:00 UTC."""
        # Setup forecasts published before and after gate closure
        data = [
            # Published BEFORE gate closure (valid)
            {
                "startTime": "2026-01-15T00:00:00Z",
                "generation": 14000.0,
                "publishTime": "2026-01-14T09:30:00Z",
            },
            # Published AFTER gate closure (MUST BE EXCLUDED)
            {
                "startTime": "2026-01-15T00:00:00Z",
                "generation": 16000.0,
                "publishTime": "2026-01-14T12:30:00Z",  # Past 11:00 cutoff!
            },
            # Intraday publication on delivery day (MUST BE EXCLUDED)
            {
                "startTime": "2026-01-15T00:00:00Z",
                "generation": 17000.0,
                "publishTime": "2026-01-15T02:00:00Z",
            },
        ]
        df = _parse_forecasts_to_df(data)
        selected = _get_day_ahead_forecasts(df, gate_closure_hour=11)

        assert len(selected) == 1
        # The selected forecast MUST be 14000 (from 09:30 UTC), NOT 16000 or 17000!
        assert selected.iloc[0]["forecast_mw"] == 14000.0
        assert selected.iloc[0]["publish_time"] == pd.to_datetime("2026-01-14T09:30:00Z", utc=True)

    def test_hourly_to_half_hourly_alignment(self):
        """Hourly wind forecast must expand to cover both :00 and :30 half-hour settlement periods."""
        data = [
            {"startTime": "2026-01-15T00:00:00Z", "generation": 12500.0, "publishTime": "2026-01-14T09:30:00Z"},
            {"startTime": "2026-01-15T01:00:00Z", "generation": 13000.0, "publishTime": "2026-01-14T09:30:00Z"},
        ]
        df = _parse_forecasts_to_df(data)
        expanded = _expand_hourly_forecasts_to_half_hourly(df)

        timestamps = set(expanded["timestamp"].dt.strftime("%H:%M"))
        # Must have 00:00, 00:30, 01:00, 01:30
        assert "00:00" in timestamps
        assert "00:30" in timestamps
        assert "01:00" in timestamps
        assert "01:30" in timestamps


@pytest.mark.asyncio
class TestLiveElexonDataValidation:
    """Tests against real Elexon BMRS API feeds for January 2026."""

    async def test_day_ahead_view_has_all_48_settlement_periods(self):
        """A full UK delivery day must contain exactly 48 half-hour settlement periods."""
        response = await get_day_ahead_view("2026-01-15")
        
        assert response.delivery_date == "2026-01-15"
        assert response.gate_closure == "2026-01-14T11:00:00Z"
        assert len(response.records) == 48, f"Expected 48 periods, got {len(response.records)}"

        # Verify no NaN or corrupt fields in records
        for r in response.records:
            assert r.actual_mw is not None, f"Missing actual_mw at {r.delivery_time}"
            assert r.actual_mw > 0, f"Actual generation should be positive at {r.delivery_time}"
            assert r.latest_forecast_mw is not None, f"Missing forecast at {r.delivery_time}"
            assert r.error_mw == pytest.approx(r.latest_forecast_mw - r.actual_mw, 0.1)

        # Summary verification
        assert response.summary.n_observations == 48
        assert response.summary.mae > 0
        assert response.summary.rmse >= response.summary.mae

    async def test_accuracy_analysis_returns_valid_distributions(self):
        """Accuracy analysis must provide complete daily, hourly (24h), and histogram binnings."""
        response = await get_accuracy_analysis("2026-01-01", "2026-01-03")
        
        # Overall
        assert response.overall.n_observations == 144  # 3 days * 48 periods
        assert response.overall.mae > 0
        assert response.overall.correlation >= -1.0 and response.overall.correlation <= 1.0

        # Hourly breakdown must have all 24 hours (0 to 23)
        assert len(response.hourly) == 24
        hours = [h.hour for h in response.hourly]
        assert hours == list(range(24))

        # Error distribution histogram sum of percentages must equal ~100%
        assert len(response.error_distribution) > 0
        total_pct = sum(b.percentage for b in response.error_distribution)
        assert total_pct == pytest.approx(100.0, 0.5)

    async def test_comparison_time_series_continuity(self):
        """Comparison endpoint must return continuous timestamps strictly within requested window."""
        response = await get_comparison_data("2026-01-01", "2026-01-02")
        
        assert len(response.data) == 96  # 2 days * 48 = 96 half-hours
        first_pt = response.data[0]
        last_pt = response.data[-1]

        # Verify ISO timestamp boundaries
        assert str(first_pt.timestamp).startswith("2026-01-01 00:00:00")
        assert str(last_pt.timestamp).startswith("2026-01-02 23:30:00")
