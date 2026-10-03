"""In-memory forming candles fed from the latest Dukascopy tick window."""
from __future__ import annotations

import threading
from datetime import datetime, timezone

TIMEFRAMES = {
    "1s": 1, "5s": 5, "15s": 15, "30s": 30, "45s": 45,
    "1m": 60, "2m": 120, "3m": 180, "5m": 300, "10m": 600,
    "15m": 900, "30m": 1800, "45m": 2700,
    "1H": 3600, "2H": 7200, "3H": 10800, "4H": 14400,
    "6H": 21600, "8H": 28800, "12H": 43200,
    "1D": 86400, "3D": 259200, "1W": 604800, "2W": 1209600,
}


def _bucket(ts: float, seconds: int) -> int:
    return int(ts // seconds) * seconds


class LiveCandleBook:
    def __init__(self):
        self._data = {}
        self._lock = threading.RLock()

    def update_frame(self, symbol, df):
        if df is None or df.empty or "bidPrice" not in df.columns:
            return
        points = []
        for ts, row in df.iterrows():
            try:
                if hasattr(ts, "to_pydatetime"):
                    ts = ts.to_pydatetime()
                if isinstance(ts, datetime):
                    ts = ts.astimezone(timezone.utc).timestamp()
                else:
                    ts = float(ts)
                price = float(row["bidPrice"])
            except (TypeError, ValueError, KeyError):
                continue
            points.append((ts, price))
        if not points:
            return
        with self._lock:
            for timeframe, seconds in TIMEFRAMES.items():
                # Recent tick window contains enough information to rebuild the
                # current candle accurately without persisting every tick.
                bucket = _bucket(points[-1][0], seconds)
                same = [p for t, p in points if _bucket(t, seconds) == bucket]
                if not same:
                    continue
                self._data[(symbol.upper(), timeframe)] = {
                    "t": bucket,
                    "o": same[0],
                    "h": max(same),
                    "l": min(same),
                    "c": same[-1],
                    "v": len(same),
                }

    def latest(self, symbol, timeframe):
        with self._lock:
            item = self._data.get((symbol.upper(), timeframe))
            return dict(item) if item else None
