"""Shared, closed-bar forex history. Provider credentials stay server-side."""
import math
import os
import re
import time
from collections import OrderedDict, deque
from datetime import datetime, timezone
from threading import RLock
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Query, Response

try:
    from .catalog import _get_json
except ImportError:
    from catalog import _get_json

router = APIRouter(prefix="/api/backtesting", tags=["Backtesting"])
INTERVALS = {"1m": ("1min", 60), "5m": ("5min", 300), "15m": ("15min", 900),
             "30m": ("30min", 1800), "1H": ("1h", 3600), "4H": ("4h", 14400),
             "1D": ("1day", 86400), "1W": ("1week", 604800)}
_cache = OrderedDict()
_lock = RLock()
_cooldown_until = 0.0
_requests = deque()


def enabled():
    return bool(os.getenv("TWELVE_DATA_API_KEY")) and os.getenv(
        "TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED", "false").lower() == "true"


def provider_json(path, params):
    global _cooldown_until
    remaining = math.ceil(_cooldown_until - time.monotonic())
    if remaining > 0:
        raise HTTPException(503, "Historical-data provider is cooling down. Try again later.",
                            headers={"Retry-After": str(remaining)})
    with _lock:
        now = time.monotonic()
        while _requests and now - _requests[0] >= 60:
            _requests.popleft()
        # Bound public cache misses before they consume the owner's provider credits.
        if len(_requests) >= 6:
            raise HTTPException(503, "Shared-history request budget reached. Retry shortly.",
                                headers={"Retry-After": str(max(1, math.ceil(60 - (now - _requests[0]))))})
        _requests.append(now)
    try:
        payload = _get_json("https://api.twelvedata.com/" + path + "?" + urlencode(
            {**params, "apikey": os.environ["TWELVE_DATA_API_KEY"]}))
    except HTTPError as exc:
        if exc.code == 429:
            _cooldown_until = time.monotonic() + 60
            raise HTTPException(503, "Historical-data request limit reached.", headers={"Retry-After": "60"}) from None
        # Never propagate provider URLs: they contain the API credential.
        raise HTTPException(503, "Historical-data provider rejected the request.") from None
    except (URLError, TimeoutError, ValueError, OSError):
        raise HTTPException(503, "Historical-data provider is temporarily unavailable.") from None
    if not isinstance(payload, dict):
        raise HTTPException(502, "Invalid historical-data response.")
    if payload.get("status") == "error":
        if str(payload.get("code")) == "429":
            _cooldown_until = time.monotonic() + 60
            raise HTTPException(503, "Historical-data request limit reached.", headers={"Retry-After": "60"})
        raise HTTPException(503, "This history is unavailable with the configured provider access.")
    return payload


def cached(key, ttl, fetch):
    # A single bounded cache coalesces concurrent requests and limits credit usage.
    with _lock:
        now = time.monotonic()
        found = _cache.get(key)
        if found and now - found[0] < ttl:
            _cache.move_to_end(key)
            return found[1]
        value = fetch()
        _cache[key] = (time.monotonic(), value)
        _cache.move_to_end(key)
        while len(_cache) > 64:
            _cache.popitem(last=False)
        return value


def forex_catalog():
    def fetch():
        payload = provider_json("forex_pairs", {})
        if not isinstance(payload.get("data"), list):
            raise HTTPException(502, "Invalid forex catalogue response.")
        rows = {}
        for item in payload["data"]:
            symbol = str(item.get("symbol", ""))
            if not re.fullmatch(r"[A-Z]{3}/[A-Z]{3}", symbol):
                continue
            rows[symbol] = {"symbol": symbol, "name": str(item.get("currency_group") or "Forex"),
                            "quote_asset": symbol[-3:], "provider": "twelve_data"}
        return sorted(rows.values(), key=lambda x: x["symbol"])
    return cached(("catalog",), 10800, fetch)


@router.get("/catalog")
def catalog(q: str = Query("", max_length=80), limit: int = Query(100, ge=1, le=100),
            offset: int = Query(0, ge=0, le=100000)):
    if not enabled():
        return {"data": [], "total": 0, "has_more": False, "status": "not_configured",
                "message": "Shared forex history is not connected yet. Use an included sample archive or import CSV.",
                "intervals": list(INTERVALS)}
    rows = [row for row in forex_catalog() if q.casefold() in row["symbol"].casefold()]
    return {"data": rows[offset:offset+limit], "total": len(rows),
            "has_more": offset+limit < len(rows), "status": "configured",
            "message": "Available history depends on provider coverage.", "intervals": list(INTERVALS)}


@router.get("/coverage")
def coverage(symbol: str = Query(..., min_length=7, max_length=7),
             interval: str = Query("1H", max_length=8)):
    if not enabled():
        raise HTTPException(503, "Shared forex history is not configured. Included archives have their own date ranges.")
    if not re.fullmatch(r"[A-Z]{3}/[A-Z]{3}", symbol) or interval not in INTERVALS:
        raise HTTPException(422, "Choose a supported forex pair and interval.")
    if not any(row["symbol"] == symbol for row in forex_catalog()):
        raise HTTPException(404, "This pair is not listed by the configured provider.")

    def fetch():
        payload = provider_json("earliest_timestamp", {"symbol": symbol,
                                "interval": INTERVALS[interval][0], "timezone": "UTC"})
        try:
            earliest = datetime.fromisoformat(payload["datetime"]).replace(tzinfo=timezone.utc)
            if not 0 <= earliest.timestamp() <= time.time():
                raise ValueError("invalid coverage date")
        except (KeyError, TypeError, ValueError, OverflowError):
            raise HTTPException(502, "Provider returned an invalid history coverage date.") from None
        return {"symbol": symbol, "interval": interval, "earliest": earliest.isoformat(),
                "provider": "twelve_data", "message": "Availability depends on provider access; gaps may exist."}

    return cached(("coverage", symbol, interval), 86400, fetch)


@router.get("/candles")
def candles(response: Response, symbol: str = Query(..., min_length=7, max_length=7),
            interval: str = Query("1H", max_length=8), limit: int = Query(1000, ge=60, le=5000),
            end: str = Query("", max_length=20), start: str = Query("", max_length=20)):
    if not enabled():
        raise HTTPException(503, "Shared forex history is not configured. Included sample archives remain available.")
    if not re.fullmatch(r"[A-Z]{3}/[A-Z]{3}", symbol) or interval not in INTERVALS:
        raise HTTPException(422, "Choose a supported forex pair and interval.")
    if not any(row["symbol"] == symbol for row in forex_catalog()):
        raise HTTPException(404, "This pair is not listed by the configured provider.")
    now = int(time.time())
    if end:
        try:
            cutoff = int(datetime.strptime(end, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc).timestamp())
        except ValueError:
            raise HTTPException(422, "History end must be YYYY-MM-DDTHH:MM in UTC.") from None
        if cutoff > now or cutoff < 0:
            raise HTTPException(422, "History end must be a past UTC date.")
    else:
        cutoff = now // 60 * 60
    beginning = None
    if start:
        try:
            beginning = int(datetime.strptime(start, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc).timestamp())
        except ValueError:
            raise HTTPException(422, "History start must be YYYY-MM-DDTHH:MM in UTC.") from None
        if beginning < 0 or beginning >= cutoff:
            raise HTTPException(422, "History start must precede the history end.")
    provider_interval, seconds = INTERVALS[interval]

    def fetch():
        params = {"symbol": symbol, "interval": provider_interval,
            "outputsize": limit, "timezone": "UTC", "order": "ASC",
            "end_date": datetime.fromtimestamp(cutoff, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")}
        if beginning is not None:
            params["start_date"] = datetime.fromtimestamp(beginning, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            params["outputsize"] = limit - min(100, limit // 2)
        payload = provider_json("time_series", params)
        if payload.get("meta", {}).get("symbol") != symbol or not isinstance(payload.get("values"), list):
            raise HTTPException(502, "Provider returned an unexpected pair or history format.")
        bars = []
        pages = [(payload, False)]
        if beginning is not None:
            context = provider_json("time_series", {"symbol": symbol, "interval": provider_interval,
                "outputsize": min(100, limit // 2), "timezone": "UTC", "order": "DESC",
                "end_date": datetime.fromtimestamp(beginning, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")})
            if context.get("meta", {}).get("symbol") != symbol or not isinstance(context.get("values"), list):
                raise HTTPException(502, "Provider returned an unexpected context pair or format.")
            pages.insert(0, (context, True))
        try:
            for page, is_context in pages:
              for raw in page["values"]:
                timestamp = datetime.fromisoformat(raw["datetime"]).replace(tzinfo=timezone.utc)
                t = int(timestamp.timestamp())
                o, h, low, c = (float(raw[k]) for k in ("open", "high", "low", "close"))
                if not all(math.isfinite(x) for x in (o, h, low, c)) or not (0 < low <= min(o, c) <= max(o, c) <= h):
                    raise ValueError("invalid OHLC")
                # Conservative interval boundary: never return a forming/future bar.
                if t < 0:
                    raise ValueError("invalid timestamp")
                in_window = beginning is None or (t < beginning if is_context else t >= beginning)
                if t + seconds <= min(now, cutoff) and in_window:
                    bars.append({"t": t, "o": o, "h": h, "l": low, "c": c})
            bars.sort(key=lambda b: b["t"])
            if any(a["t"] >= b["t"] for a, b in zip(bars, bars[1:])):
                raise ValueError("duplicate timestamp")
        except (KeyError, ValueError, TypeError, OverflowError):
            raise HTTPException(502, "Provider returned invalid OHLC history.") from None
        if len(bars) < 60 or len(bars) > 5000:
            raise HTTPException(404, "At least 60 closed candles are needed. Choose another interval or history end.")
        return {"symbol": symbol, "interval": interval, "source": "Twelve Data · shared forex history",
                "provider": "twelve_data", "closed_only": True, "candles": bars,
                "retrieved_at": datetime.now(timezone.utc).isoformat()}

    result = cached((symbol, interval, limit, cutoff, beginning), 900, fetch)
    response.headers["Cache-Control"] = "public, max-age=60"
    return result
