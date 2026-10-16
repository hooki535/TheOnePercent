"""TheOnePercent market-data API, initial public spot-crypto provider.
No credentials, trading, orders, or invented prices. Deploy separately from GitHub Pages.
"""
import json
import os
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TheOnePercent Market Data API", version="0.1.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "https://hooki535.github.io").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])

# Spot prices only. Futures and forex must be added with their own approved sources.
SYMBOLS = {"BTCUSD": "BTCUSDT", "BTCUSDT": "BTCUSDT",
           "ETHUSD": "ETHUSDT", "ETHUSDT": "ETHUSDT",
           "SOLUSD": "SOLUSDT", "SOLUSDT": "SOLUSDT"}
INTERVALS = {"1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m",
             "30m": "30m", "1H": "1h", "2H": "2h", "4H": "4h",
             "6H": "6h", "8H": "8h", "12H": "12h", "1D": "1d",
             "3D": "3d", "1W": "1w", "1M": "1M"}
BASE_URL = "https://api.binance.com/api/v3"
cache = {}
CACHE_SECONDS = 30


def provider_get(path):
    req = Request(BASE_URL + path, headers={"User-Agent": "TheOnePercent/0.1"})
    try:
        with urlopen(req, timeout=9) as response:
            return json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Market-data provider unavailable") from exc


@app.get("/")
def index():
    return {
        "service": "TheOnePercent Market Data API",
        "status": "running",
        "documentation": "/docs",
        "health": "/health",
        "market_data": "/api/candles/BTCUSD/1H?limit=5",
        "note": "Spot-crypto historical candles only; other instruments may use demo data.",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "market-data", "provider": "binance-spot"}


@app.get("/api/candles/{symbol}/{interval}")
def candles(symbol: str, interval: str, limit: int = Query(500, ge=1, le=1000)):
    pair = SYMBOLS.get(symbol.upper())
    iv = INTERVALS.get(interval)
    if not pair or not iv:
        raise HTTPException(status_code=422, detail="Unsupported symbol or interval")
    key = (pair, iv, limit)
    cached = cache.get(key)
    if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
        return cached[1]
    from urllib.parse import urlencode
    rows = provider_get("/klines?" + urlencode({"symbol": pair, "interval": iv, "limit": limit}))
    bars = []
    for row in rows:
        o, h, l, c = map(float, row[1:5])
        if not (0 < l <= min(o, c) <= max(o, c) <= h):
            raise HTTPException(status_code=502, detail="Invalid provider OHLC")
        bars.append({"t": int(row[0] // 1000), "o": o, "h": h, "l": l, "c": c, "v": float(row[5])})
    result = {"symbol": symbol.upper(), "provider_symbol": pair, "source": "Binance spot",
              "market": "spot", "interval": interval, "candles": bars,
              "retrieved_at": datetime.now(timezone.utc).isoformat()}
    cache[key] = (time.monotonic(), result)
    return result


@app.get("/api/quotes")
def quotes():
    # Empty rather than fabricated live quotes. Candle endpoint remains available.
    return {}
