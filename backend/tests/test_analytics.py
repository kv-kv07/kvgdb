"""Unit tests for the analytics service."""
import numpy as np
import pytest
from app.services.analytics import calculate_metrics


class TestCalculateMetrics:
    """Tests for forecast accuracy metric calculations."""
    
    def test_perfect_forecast(self):
        """Perfect forecast should have zero errors."""
        actual = np.array([100, 200, 300, 400, 500])
        forecast = np.array([100, 200, 300, 400, 500])
        metrics = calculate_metrics(actual, forecast)
        
        assert metrics.mae == 0.0
        assert metrics.rmse == 0.0
        assert metrics.mbe == 0.0
        assert metrics.mape == 0.0
        assert metrics.correlation == 1.0
        assert metrics.n_observations == 5
    
    def test_constant_positive_bias(self):
        """Constant over-forecast should show positive MBE."""
        actual = np.array([100, 200, 300])
        forecast = np.array([110, 210, 310])
        metrics = calculate_metrics(actual, forecast)
        
        assert metrics.mae == 10.0
        assert metrics.mbe == 10.0  # Positive = over-forecast
        assert metrics.rmse == 10.0
        assert metrics.n_observations == 3
    
    def test_constant_negative_bias(self):
        """Constant under-forecast should show negative MBE."""
        actual = np.array([100, 200, 300])
        forecast = np.array([90, 190, 290])
        metrics = calculate_metrics(actual, forecast)
        
        assert metrics.mbe == -10.0  # Negative = under-forecast
    
    def test_symmetric_errors_zero_bias(self):
        """Symmetric errors should cancel out in MBE."""
        actual = np.array([100, 200])
        forecast = np.array([110, 190])
        metrics = calculate_metrics(actual, forecast)
        
        assert metrics.mae == 10.0
        assert metrics.mbe == 0.0
    
    def test_rmse_penalizes_large_errors(self):
        """RMSE should be >= MAE, with equality only for constant errors."""
        actual = np.array([100, 200, 300])
        forecast = np.array([100, 200, 330])  # One large error
        metrics = calculate_metrics(actual, forecast)
        
        assert metrics.rmse >= metrics.mae
    
    def test_mape_with_zero_actuals(self):
        """MAPE should handle zero actual values gracefully."""
        actual = np.array([0, 100, 200])
        forecast = np.array([10, 110, 210])
        metrics = calculate_metrics(actual, forecast)
        
        # MAPE should only use non-zero actuals
        assert metrics.mape > 0
        assert metrics.n_observations == 3
    
    def test_single_observation(self):
        """Should handle single observation."""
        actual = np.array([100.0])
        forecast = np.array([120.0])
        metrics = calculate_metrics(actual, forecast)
        
        assert metrics.mae == 20.0
        assert metrics.mbe == 20.0
        assert metrics.n_observations == 1
    
    def test_max_error(self):
        """Max error should be the largest absolute error."""
        actual = np.array([100, 200, 300])
        forecast = np.array([105, 250, 295])
        metrics = calculate_metrics(actual, forecast)
        
        assert metrics.max_error == 50.0  # |250 - 200| = 50
