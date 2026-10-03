"""Real Dukascopy candle data service.

Historical candles are fetched from Dukascopy's public historical feed and
normalised into the small {t,o,h,l,c,v} shape used by the existing chart
engine. Intervals that Dukascopy does not expose directly are built from a
sensible lower timeframe (or ticks for sub-minute charts).
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timedelta, timezone

import pandas as pd
import dukascopy_python

from dukascopy_feed import SYMBOL_MAP

log = logging.getLogger("candle_engine")

# Keep requests bounded. The chart normally asks for 620 bars.
MAX_BARS = 1200
CACHE_TTL_SECONDS = 45

_INTERVAL_CANDIDATES = {
    "1m": ("INTERVAL_MIN_1", "INTERVAL_MINUTE_1", "INTERVAL_M1"),
    "1H": ("INTERVAL_HOUR_1", "INTERVAL_H1"),
    "1D": ("INTERVAL_DAY_1", "INTERVAL_D1"),
}


def _interval_constant(key: str):
    for name in _INTERVAL_CANDIDATES[key]:
        value = getattr(dukascopy_python, name, None)
        if value is not None:
            return value
    available = [x for x in dir(dukascopy_python) if x.startswith("INTERVAL_")]
    raise RuntimeError(f"dukascopy-python has no {key} interval; available: {available}")


def _as_utc_index(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    if not isinstance(df.index, pd.DatetimeIndex):
        if "timestamp" in df.columns:
            df = df.set_index("timestamp")
        else:
            raise ValueError("Dukascopy response has no timestamp index")
    df = df.copy()
    df.index = pd.to_datetime(df.index, utc=True)
    return df.sort_index()


def _tick_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = _as_utc_index(df)
    if df.empty:
        return df
    if "bidPrice" not in df.columns:
        raise ValueError("Dukascopy tick response has no bidPrice column")
    price = pd.to_numeric(df["bidPrice"], errors="coerce").dropna()
    return price.to_frame("price")


def _ohlc_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = _as_utc_index(df)
    if df.empty:
        return df
    needed = {"open", "high", "low", "close"}
    if not needed.issubset(df.columns):
        raise ValueError(f"Dukascopy candle response missing {sorted(needed - set(df.columns))}")
    out = df[["open", "high", "low", "close"]].apply(pd.to_numeric, errors="coerce").dropna()
    if "volume" in df.columns:
        out["volume"] = pd.to_numeric(df.loc[out.index, "volume"], errors="coerce").fillna(0)
    else:
        out["volume"] = 0
    return out


def _resample_ohlc(df: pd.DataFrame, rule: str) -> pd.DataFrame:
    if df.empty:
        return df
    result = df.resample(rule, label="left", closed="left").agg(
        open=("open", "first"),
        high=("high", "max"),
        low=("low", "min"),
        close=("close", "last"),
        volume=("volume", "sum"),
    )
    return result.dropna(subset=["open", "high", "low", "close"])


def _tick_to_ohlc(df: pd.DataFrame, rule: str) -> pd.DataFrame:
    if df.empty:
        return df
    result = df.resample(rule, label="left", closed="left").agg(
        open=("price", "first"),
        high=("price", "max"),
        low=("price", "min"),
        close=("price", "last"),
        volume=("price", "count"),
    )
    return result.dropna(subset=["open", "high", "low", "close"])


def _target_spec(timeframe: str):
    """Return (base, rule, approximate bar duration seconds)."""
    tf = timeframe.strip()
    seconds = {
        "1s": 1, "5s": 5, "15s": 15, "30s": 30, "45s": 45,
    }
    minutes = {"1m": 1, "2m": 2, "3m": 3, "5m": 5, "10m": 10,
               "15m": 15, "30m": 30, "45m": 45}
    hours = {"1H": 1, "2H": 2, "3H": 3, "4H": 4, "6H": 6, "8H": 8, "12H": 12}
    if tf in seconds:
        n = seconds[tf]
        return "tick", f"{n}s", n
    if tf in minutes:
        n = minutes[tf]
        return "1m", f"{n}min", n * 60
    if tf in hours:
        n = hours[tf]
        return "1H", f"{n}h", n * 3600
    if tf in {"1D", "3D"}:
        n = 1 if tf == "1D" else 3
        return "1D", f"{n}D", n * 86400
    if tf in {"1W", "2W"}:
        n = 1 if tf == "1W" else 2
        return "1D", f"{n}W", n * 7 * 86400
    if tf in {"1M", "3M", "6M", "12M"}:
        n = int(tf[:-1])
        # Calendar-month rules avoid pretending every month is exactly 30 days.
        return "1D", f"{n}MS", n * 30 * 86400
    raise ValueError(f"unsupported timeframe: {timeframe}")


class CandleService:
    def __init__(self, max_bars=620):
        self.max_bars = max(1, min(int(max_bars), MAX_BARS))
        self._cache = {}
        self._lock = threading.RLock()
        self._inflight = {}

    def _fetch(self, symbol: str, timeframe: str, limit: int):
        base, rule, duration = _target_spec(timeframe)
        end = datetime.now(timezone.utc)
        # Add a small overlap so the newest candle is present. Calendar-month
        # charts use calendar arithmetic rather than pretending every month is
        # 30 days. Dukascopy history is also bounded to the era for which this
        # application can reasonably expect data.
        if rule.endswith("MS"):
            months = int(rule[:-2]) * (limit + 3)
            start = (pd.Timestamp(end) - pd.DateOffset(months=months)).to_pydatetime()
        elif rule.endswith("W"):
            weeks = int(rule[:-1]) * (limit + 3)
            start = end - timedelta(weeks=weeks)
        else:
            start = end - timedelta(seconds=duration * (limit + 3))
        earliest = datetime(2003, 1, 1, tzinfo=timezone.utc)
        if start < earliest:
            start = earliest

        if base == "tick":
            df = dukascopy_python.fetch(
                instrument=SYMBOL_MAP[symbol],
                interval=dukascopy_python.INTERVAL_TICK,
                offer_side=dukascopy_python.OFFER_SIDE_BID,
                start=start,
                end=end,
                max_retries=1,
            )
            candles = _tick_to_ohlc(_tick_frame(df), rule)
        else:
            df = dukascopy_python.fetch(
                instrument=SYMBOL_MAP[symbol],
                interval=_interval_constant(base),
                offer_side=dukascopy_python.OFFER_SIDE_BID,
                start=start,
                end=end,
                max_retries=1,
            )
            candles = _resample_ohlc(_ohlc_frame(df), rule)

        if candles.empty:
            return []
        candles = candles.tail(limit)
        out = []
        for ts, row in candles.iterrows():
            out.append({
                "t": int(ts.timestamp()),
                "o": float(row["open"]),
                "h": float(row["high"]),
                "l": float(row["low"]),
                "c": float(row["close"]),
                "v": float(row.get("volume", 0) or 0),
            })
        return out

    def history(self, symbol: str, timeframe: str, limit=None, force=False):
        symbol = symbol.upper()
        if symbol not in SYMBOL_MAP:
            raise KeyError(symbol)
        limit = max(1, min(int(limit or self.max_bars), MAX_BARS))
        key = (symbol, timeframe)
        now = time.monotonic()
        with self._lock:
            cached = self._cache.get(key)
            if not force and cached and cached["expires"] > now and len(cached["data"]) >= min(limit, 100):
                return cached["data"][-limit:]
            event = self._inflight.get(key)
            if event is None:
                event = threading.Event()
                self._inflight[key] = event
                owner = True
            else:
                owner = False
        if not owner:
            event.wait(timeout=90)
            with self._lock:
                cached = self._cache.get(key)
                return cached["data"][-limit:] if cached else []
        try:
            data = self._fetch(symbol, timeframe, limit)
            with self._lock:
                self._cache[key] = {"expires": time.monotonic() + CACHE_TTL_SECONDS, "data": data}
            return data
        finally:
            with self._lock:
                self._inflight.pop(key, None)
                event.set()

    def invalidate(self, symbol=None):
        with self._lock:
            if symbol is None:
                self._cache.clear()
            else:
                symbol = symbol.upper()
                for key in list(self._cache):
                    if key[0] == symbol:
                        self._cache.pop(key, None)
