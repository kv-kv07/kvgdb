"""Pytest configuration and fixtures."""
import pytest


@pytest.fixture
def sample_actuals():
    """Sample FUELHH response data."""
    return [
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-15",
            "settlementPeriod": 1,
            "startTime": "2026-01-15T00:00:00Z",
            "fuelType": "WIND",
            "generation": 8500.0,
        },
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-15",
            "settlementPeriod": 2,
            "startTime": "2026-01-15T00:30:00Z",
            "fuelType": "WIND",
            "generation": 8700.0,
        },
    ]


@pytest.fixture
def sample_forecasts():
    """Sample WINDFOR response data."""
    return [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-14T08:30:00Z",
            "startTime": "2026-01-15T00:00:00Z",
            "generation": 8600.0,
        },
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-14T08:30:00Z",
            "startTime": "2026-01-15T00:30:00Z",
            "generation": 8800.0,
        },
    ]
