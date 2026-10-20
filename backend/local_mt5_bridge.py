"""Local, read-only MT5 chart bridge for TheOnePercent.

Run this only on the Windows computer where the user's MT5 terminal is open.
It binds to localhost, returns instrument metadata and OHLC candles only, and
never exposes account balances, positions, orders, or trading operations.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path
from uuid import UUID, uuid5

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

try:  # Installed separately on Windows; never required by the Render service.
    import MetaTrader5 as mt5  # type: ignore
except ImportError:  # pragma: no cover - platform integration is tested with fakes.
    mt5 = None

ROOT = Path(__file__).resolve().parents[1]
APP_ORIGIN = "http://localhost:8765"
INSTRUMENT_NAMESPACE = UUID("b3f105a8-e6c4-51e2-bcb0-73c7bbbd7a44")

app = FastAPI(title="TheOnePercent Local MT5 Read-Only Bridge", version="0.1.0")


def _terminal():
    if mt5 is None:
        raise HTTPException(status_code=503, detail="MetaTrader5 Python package is not installed")
    if not mt5.initialize():
        error = mt5.last_error() if hasattr(mt5, "last_error") else "unknown terminal error"
        raise HTTPException(status_code=503, detail=f"Could not connect to the open MT5 terminal: {error}")
    info = mt5.terminal_info()
    if not info:
        raise HTTPException(status_code=503, detail="MT5 terminal is not available")
    company = str(getattr(info, "company", "") or "")
    server = str(getattr(info, "server", "") or "")
    if "exness" not in (company + " " + server).casefold():
        raise HTTPException(status_code=409, detail="The open MT5 terminal is not connected to an Exness server")
    return info, company or "Exness", server or "Exness MT5"


def _symbol_rows():
    _terminal()
    rows = mt5.symbols_get()
    if rows is None:
        error = mt5.last_error() if hasattr(mt5, "last_error") else "unknown symbol catalog error"
        raise HTTPException(status_code=503, detail=f"Could not read MT5 instruments: {error}")
    return rows


def _market(path: str) -> str:
    p = (path or "").casefold()
    if "forex" in p or "currency" in p:
        return "forex"
    if "crypto" in p:
        return "crypto_cfd"
    if "metal" in p or "commod" in p or "energy" in p:
        return "commodity_cfd"
    if "index" in p or "indices" in p:
        return "index_cfd"
    if "stock" in p or "equity" in p:
        return "stock_cfd"
    return "other_cfd"


def _instrument(row, company: str, server: str):
    symbol = str(getattr(row, "name", "") or "")
    path = str(getattr(row, "path", "") or "")
    point = getattr(row, "trade_tick_size", None) or getattr(row, "point", None)
    tick = float(point) if point is not None else None
    if tick is not None and (not math.isfinite(tick) or tick <= 0):
        tick = None
    return {
        "instrument_id": str(uuid5(INSTRUMENT_NAMESPACE, f"{server}|{symbol}")),
        "symbol": symbol,
        "provider_symbol": symbol,
        "name": str(getattr(row, "description", "") or symbol),
        "description": str(getattr(row, "description", "") or symbol),
        "market": _market(path),
        "market_path": path,
        "instrument_type": "broker_cfd",
        "base_asset": getattr(row, "currency_base", None) or None,
        "quote_asset": getattr(row, "currency_profit", None) or None,
        "exchange": company,
        "venue": server,
        "provider": "exness_mt5",
        "availability": "historical_only",
        "access_reason": "Read-only historical candles from the locally connected Exness MT5 terminal.",
        "streaming": False,
        "digits": int(getattr(row, "digits", 0) or 0),
        "price_tick": tick,
        "quantity_step": getattr(row, "volume_step", None),
        "raw_provider_id": symbol,
        "volume_type": "tick_volume",
    }


INTERVALS = {
    "1m": "TIMEFRAME_M1", "2m": "TIMEFRAME_M2", "3m": "TIMEFRAME_M3",
    "4m": "TIMEFRAME_M4", "5m": "TIMEFRAME_M5", "6m": "TIMEFRAME_M6",
    "10m": "TIMEFRAME_M10", "12m": "TIMEFRAME_M12", "15m": "TIMEFRAME_M15",
    "20m": "TIMEFRAME_M20", "30m": "TIMEFRAME_M30", "1H": "TIMEFRAME_H1",
    "2H": "TIMEFRAME_H2", "3H": "TIMEFRAME_H3", "4H": "TIMEFRAME_H4",
    "6H": "TIMEFRAME_H6", "8H": "TIMEFRAME_H8", "12H": "TIMEFRAME_H12",
    "1D": "TIMEFRAME_D1", "1W": "TIMEFRAME_W1", "1M": "TIMEFRAME_MN1",
}


def _bars(symbol: str, interval: str, limit: int, *, closed_only: bool = False):
    _terminal()
    matches = mt5.symbols_get(symbol=symbol)
    if not matches or not any(str(getattr(row, "name", "")) == symbol for row in matches):
        raise HTTPException(status_code=404, detail="Exact symbol is not available in the connected Exness MT5 terminal")
    timeframe_name = INTERVALS.get(interval)
    timeframe = getattr(mt5, timeframe_name, None) if timeframe_name else None
    if timeframe is None:
        raise HTTPException(status_code=422, detail="Interval is not supported by the connected MT5 terminal")
    rows = mt5.copy_rates_from_pos(symbol, timeframe, 1 if closed_only else 0, limit)
    if rows is None or len(rows) == 0:
        error = mt5.last_error() if hasattr(mt5, "last_error") else "no candle history"
        raise HTTPException(status_code=404, detail=f"No MT5 candle history is available for {symbol}: {error}")
    candles = []
    previous = -1
    try:
        for row in rows:
            t = int(row["time"])
            o, h, low, c = (float(row[key]) for key in ("open", "high", "low", "close"))
            volume = int(row["tick_volume"])
            if (t <= previous or not all(math.isfinite(x) for x in (o, h, low, c))
                    or not (0 < low <= min(o, c) <= max(o, c) <= h) or volume < 0):
                raise ValueError("MT5 returned invalid OHLC values")
            candles.append({"t": t, "o": o, "h": h, "l": low, "c": c, "v": volume})
            previous = t
    except (ValueError, TypeError, KeyError, IndexError, OverflowError) as exc:
        raise HTTPException(status_code=502, detail="MT5 returned invalid candle data") from exc
    info, company, server = _terminal()
    return {
        "provider": "exness_mt5", "symbol": symbol, "provider_symbol": symbol,
        "source": f"Exness MT5 · {server}", "exchange": company, "venue": server,
        "market": "broker_cfd", "interval": interval, "candles": candles,
        "volume_type": "tick_volume", "generated_at": None,
    }


@app.get("/health")
def health():
    _, company, server = _terminal()
    return {"status": "ok", "provider": "exness_mt5", "exchange": company, "venue": server,
            "mode": "local_read_only"}


@app.get("/api/providers")
def providers():
    try:
        _, company, server = _terminal()
    except HTTPException as exc:
        return {"data": [{"provider": "exness_mt5", "market": "broker_cfd", "status": "unavailable",
                          "streaming": False, "access_reason": str(exc.detail)}]}
    return {"data": [{"provider": "exness_mt5", "market": "broker_cfd", "status": "historical_only",
                      "exchange": company, "venue": server, "streaming": False,
                      "access_reason": "Read-only local MT5 candles; account credentials, balances and trading are not exposed."}]}


@app.get("/api/instruments")
def instruments(q: str = Query("", max_length=120), market: str = Query("", max_length=40),
                exchange: str = Query("", max_length=80), limit: int = Query(50, ge=1, le=100),
                offset: int = Query(0, ge=0, le=1_000_000)):
    _, company, server = _terminal()
    query = q.strip().casefold()
    market_filter = market.strip().casefold()
    exchange_filter = exchange.strip().casefold()
    rows = []
    for raw in _symbol_rows():
        record = _instrument(raw, company, server)
        haystack = " ".join(str(record.get(k) or "") for k in
                            ("symbol", "name", "market", "market_path", "exchange", "venue",
                             "provider_symbol", "base_asset", "quote_asset")).casefold()
        if query and query not in haystack:
            continue
        if market_filter and market_filter != record["market"]:
            continue
        if exchange_filter and exchange_filter not in company.casefold():
            continue
        rows.append(record)
    rows.sort(key=lambda row: (row["symbol"].casefold(), row["venue"].casefold()))
    total = len(rows)
    page = rows[offset:offset + limit]
    return {"data": page, "total": total, "limit": limit, "offset": offset,
            "has_more": offset + len(page) < total, "sources": ["exness_mt5"],
            "provider_status": [{"provider": "exness_mt5", "status": "historical_only"}],
            "catalog_updated_at": None, "stale": False}


@app.get("/api/candles")
def candles(response: Response, symbol: str = Query(..., min_length=1, max_length=64),
            interval: str = Query(..., min_length=1, max_length=8),
            limit: int = Query(500, ge=1, le=1000)):
    response.headers["Cache-Control"] = "no-store"
    return _bars(symbol, interval, limit)


@app.get("/api/backtesting/candles")
def backtesting_candles(response: Response, symbol: str = Query(..., min_length=1, max_length=64),
                        interval: str = Query(..., min_length=1, max_length=8),
                        limit: int = Query(2000, ge=60, le=10000)):
    response.headers["Cache-Control"] = "no-store"
    result = _bars(symbol, interval, limit, closed_only=True)
    if len(result["candles"]) < 60:
        raise HTTPException(status_code=404, detail="At least 60 closed candles are required. Load more history in MT5 and retry.")
    result["closed_only"] = True
    return result


@app.middleware("http")
async def local_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; "
        "frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/pages/backtesting.html", include_in_schema=False)
def local_backtesting_page():
    return _local_page("backtesting.html")


@app.get("/pages/charts.html", include_in_schema=False)
def local_charts_page():
    return _local_page("charts.html")


def _local_page(page_name: str):
    """Serve a cloud-isolated copy of Charts, without production auth or CDNs."""
    page = (ROOT / "pages" / page_name).read_text(encoding="utf-8")
    page = re.sub(r"<script\b[^>]*\bsrc=[\"']https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js[^\"']*[\"'][^>]*>\s*</script>", "", page, flags=re.I)
    page = re.sub(r"<script\b[^>]*\bsrc=[\"'][^\"']*/assets/cloud\.js[\"'][^>]*>\s*</script>", "", page, flags=re.I)
    page = re.sub(r"<link\b(?=[^>]*https://fonts\.(?:googleapis|gstatic)\.com)[^>]*>", "", page, flags=re.I)
    reporter = """<script>
addEventListener('securitypolicyviolation', event => {
  const report = {blockedURI: event.blockedURI, directive: event.effectiveDirective, source: event.sourceFile};
  console.warn('INTENTIONAL LOCAL NETWORK BLOCK', report);
  navigator.sendBeacon('/__blocked', JSON.stringify(report));
});
</script>"""
    page = page.replace("</head>", reporter + "</head>", 1)
    return Response(page, media_type="text/html; charset=utf-8")


@app.post("/__blocked", include_in_schema=False)
async def blocked_request(request: Request):
    raw = await request.body()
    if len(raw) <= 4096:
        try:
            event = json.loads(raw.decode("utf-8", "replace"))
            print("CSP BLOCK (intentional local isolation):", json.dumps(event, ensure_ascii=True))
        except (ValueError, TypeError):
            print("CSP BLOCK (intentional local isolation): malformed report")
    return Response(status_code=204)


app.mount("/assets", StaticFiles(directory=str(ROOT / "assets")), name="assets")
