"""TheOnePercent market-data API, initial public spot-crypto provider.
No credentials, trading, orders, or invented prices. Deploy separately from GitHub Pages.
"""
import json
import logging
import math
import os
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

try:  # Supports both `uvicorn app:app` and `uvicorn backend.app:app`.
    from .catalog import binance_catalog, filter_page, provider_status, twelve_data_catalog
except ImportError:  # pragma: no cover - exercised by the Render start command
    from catalog import binance_catalog, filter_page, provider_status, twelve_data_catalog

app = FastAPI(title="TheOnePercent Market Data API", version="0.1.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "https://hooki535.github.io").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])

# Spot prices only. Futures and forex must be added with their own approved sources.
SYMBOLS = {"BTCUSDT": "BTCUSDT", "ETHUSDT": "ETHUSDT", "SOLUSDT": "SOLUSDT"}
INTERVALS = {"1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m",
             "30m": "30m", "1H": "1h", "2H": "2h", "4H": "4h",
             "6H": "6h", "8H": "8h", "12H": "12h", "1D": "1d",
             "3D": "3d", "1W": "1w", "1M": "1M"}
# Binance's data-only public endpoint is intended for public market data and
# remains available in regions where the general API host is restricted.
BASE_URL = "https://data-api.binance.vision/api/v3"
BINANCE_PUBLIC_BASES = (
    BASE_URL,
    "https://api-gcp.binance.com/api/v3",
    "https://api.binance.com/api/v3",
)
cache = {}
CACHE_SECONDS = 30
logger = logging.getLogger("theonepercent.market_data")


def provider_get(path):
    last_error = None
    for base in BINANCE_PUBLIC_BASES:
        req = Request(base + path, headers={"User-Agent": "TheOnePercent/0.1"})
        try:
            with urlopen(req, timeout=9) as response:
                return json.load(response)
        except HTTPError as exc:
            last_error = exc
            if exc.code == 429:
                logger.warning("Binance public market-data host %s returned HTTP 429", req.full_url.split("/api/")[0])
                raise HTTPException(status_code=503, detail="Binance public market-data rate limit reached") from exc
            if exc.code in (403, 451):
                logger.warning("Binance public market-data host %s denied access with HTTP %s; trying another official host", req.full_url.split("/api/")[0], exc.code)
                continue
            if exc.code < 500:
                logger.error("Binance public market-data host %s rejected the request with HTTP %s", req.full_url.split("/api/")[0], exc.code)
                raise HTTPException(status_code=503, detail="Binance rejected the market-data request") from exc
            logger.warning("Binance public market-data host failed with HTTP %s", exc.code)
        except (URLError, TimeoutError, ValueError) as exc:
            last_error = exc
            logger.warning("Binance public market-data host unavailable (%s)", type(exc).__name__)
    raise HTTPException(status_code=503, detail="Binance public market-data endpoints unavailable") from last_error


@app.get("/")
def index():
    return {
        "service": "TheOnePercent Market Data API",
        "status": "running",
        "documentation": "/docs",
        "health": "/health",
        "market_data": "/api/candles/BTCUSDT/1H?limit=5",
        "note": "Exact Binance spot historical candles only; other instruments require an explicitly selected Demo mode.",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "market-data", "provider": "binance-spot"}


@app.get("/api/providers")
def providers():
    """Provider availability is explicit and does not imply market entitlement."""
    return {"data": provider_status(), "generated_at": datetime.now(timezone.utc).isoformat()}


@app.get("/api/instruments")
def instruments(
    q: str = Query("", max_length=120),
    market: str = Query("", max_length=40),
    exchange: str = Query("", max_length=80),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0, le=1_000_000),
):
    """Search the full currently discoverable provider catalog, with pagination."""
    try:
        rows, fetched = binance_catalog.list()
        stale = False
    except Exception as exc:
        rows, fetched = binance_catalog._rows, binance_catalog._updated
        if rows is None:
            raise HTTPException(status_code=503, detail="Binance spot catalog unavailable") from exc
        stale = True
    twelve_status = "requires_access"
    if twelve_data_catalog.enabled:
        try:
            twelve_rows, twelve_status = twelve_data_catalog.list()
            rows = rows + twelve_rows
        except Exception:
            twelve_status = "unavailable"
    result = filter_page(rows, q, market, exchange, limit, offset)
    result.update({
        "sources": ["binance"] + (["twelve_data"] if twelve_status == "available" else []),
        "provider_status": provider_status(),
        "catalog_updated_at": binance_catalog._updated_at,
        "stale": stale,
    })
    return result


@app.get("/api/candles/{symbol}/{interval}")
def candles(symbol: str, interval: str, response: Response, limit: int = Query(500, ge=1, le=1000)):
    # A short public cache lifetime reduces unnecessary provider traffic.
    response.headers["Cache-Control"] = "public, max-age=15"
    requested = symbol.upper()
    # Binance spot instruments must use the provider's exact symbol.
    pair = SYMBOLS.get(requested)
    if pair is None:
        # Binance spot symbols are alphanumeric pairs; futures notation such
        # as ES1! belongs to a separate provider integration.
        if not requested.isalnum():
            raise HTTPException(status_code=422, detail="Unsupported symbol or interval")
        try:
            catalog, _ = binance_catalog.list()
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Binance spot catalog unavailable") from exc
        if any(item["symbol"] == requested for item in catalog):
            pair = requested
    iv = INTERVALS.get(interval)
    if not pair or not iv:
        raise HTTPException(status_code=422, detail="Unsupported symbol or interval")
    # Preserve the requested alias in cached responses.
    key = (symbol.upper(), pair, iv, limit)
    cached = cache.get(key)
    if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
        response.headers["X-Market-Cache"] = "HIT"
        return cached[1]
    from urllib.parse import urlencode
    rows = provider_get("/klines?" + urlencode({"symbol": pair, "interval": iv, "limit": limit}))
    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=502, detail="Unexpected provider response")
    bars = []
    previous_t = -1
    try:
        for row in rows:
            t = int(row[0]) // 1000
            o, h, l, c, v = (float(row[i]) for i in (1, 2, 3, 4, 5))
            if (t <= previous_t or not all(map(math.isfinite, (o, h, l, c, v)))
                    or not (0 < l <= min(o, c) <= max(o, c) <= h) or v < 0):
                raise ValueError("Invalid candle")
            bars.append({"t": t, "o": o, "h": h, "l": l, "c": c, "v": v})
            previous_t = t
    except (ValueError, TypeError, IndexError, OverflowError) as exc:
        raise HTTPException(status_code=502, detail="Invalid provider OHLC") from exc
    result = {"symbol": symbol.upper(), "provider_symbol": pair, "source": "Binance spot",
              "market": "spot", "interval": interval, "candles": bars,
              "retrieved_at": datetime.now(timezone.utc).isoformat()}
    cache[key] = (time.monotonic(), result)
    response.headers["X-Market-Cache"] = "MISS"
    return result


@app.get("/api/quotes")
def quotes():
    # Empty rather than fabricated live quotes. Candle endpoint remains available.
    return {}
