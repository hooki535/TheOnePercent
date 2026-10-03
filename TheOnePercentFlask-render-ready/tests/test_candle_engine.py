import sys
from pathlib import Path
from unittest.mock import patch

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from candle_engine import CandleService


def test_minute_candles_are_normalised_to_chart_shape():
    idx = pd.to_datetime([
        "2026-01-01T00:00:01Z",
        "2026-01-01T00:00:31Z",
        "2026-01-01T00:01:01Z",
    ])
    df = pd.DataFrame({
        "open": [1.10, 1.11, 1.12],
        "high": [1.12, 1.13, 1.14],
        "low": [1.09, 1.10, 1.11],
        "close": [1.11, 1.12, 1.13],
        "volume": [10, 20, 30],
    }, index=idx)

    with patch("candle_engine.dukascopy_python.fetch", return_value=df):
        candles = CandleService().history("EURUSD", "1m", limit=10)

    assert candles
    assert set(candles[-1]) == {"t", "o", "h", "l", "c", "v"}
    assert candles[-1]["c"] == 1.13


def test_tick_data_builds_subminute_ohlc():
    idx = pd.to_datetime([
        "2026-01-01T00:00:01Z",
        "2026-01-01T00:00:04Z",
        "2026-01-01T00:00:07Z",
    ])
    df = pd.DataFrame({"bidPrice": [100.0, 101.0, 99.5]}, index=idx)

    with patch("candle_engine.dukascopy_python.fetch", return_value=df):
        candles = CandleService().history("XAUUSD", "5s", limit=10)

    assert candles[0]["o"] == 100.0
    assert candles[0]["h"] == 101.0
    assert candles[0]["l"] == 100.0
    assert candles[0]["c"] == 101.0
    assert candles[-1]["o"] == 99.5
    assert candles[-1]["c"] == 99.5
