"""Market-provider catalog normalization.

Catalog discovery is separate from instrument identity and candle history.
Provider credentials and licensing gates are read only on the server.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:
    from .binance_limits import binance_cooldown
except ImportError:  # Supports `uvicorn app:app` from the backend directory.
    from binance_limits import binance_cooldown

BINANCE_API = "https://data-api.binance.vision/api/v3"
BINANCE_BASES = (BINANCE_API, "https://api-gcp.binance.com/api/v3", "https://api.binance.com/api/v3")
TWELVE_DATA_API = "https://api.twelvedata.com"
NAMESPACE = uuid.UUID("9df4fe74-e8cf-5f42-9ee8-94d650c9e85b")
CATALOG_TTL = 300


def stable_instrument_id(venue: str, raw_symbol: str) -> str:
    """Stable venue-specific listing ID; provider mappings remain separate."""
    identity = f"{venue.strip().upper()}|{raw_symbol.strip().upper()}"
    return str(uuid.uuid5(NAMESPACE, identity))


def _get_json(url: str, timeout: float = 12):
    request = Request(url, headers={"User-Agent": "TheOnePercent-market-data/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return json.load(response)


def _get_binance_json(path: str):
    remaining = binance_cooldown.remaining()
    if remaining > 0:
        raise RuntimeError(f"Binance catalog rate limited; retry after {remaining} seconds")
    last = None
    for base in BINANCE_BASES:
        remaining = binance_cooldown.remaining()
        if remaining > 0:
            raise RuntimeError(f"Binance catalog rate limited; retry after {remaining} seconds")
        try:
            return _get_json(base + path)
        except HTTPError as exc:
            last = exc
            if exc.code in (418, 429):
                binance_cooldown.record(exc)
                raise
            if exc.code in (403, 451):
                continue
            if exc.code < 500:
                raise
        except (URLError, TimeoutError, ValueError) as exc:
            last = exc
    if last:
        raise last
    raise RuntimeError("No Binance public data endpoints configured")


class BinanceSpotCatalog:
    def __init__(self):
        self._rows = None
        self._updated = 0.0
        self._updated_at = None

    def list(self, refresh: bool = False):
        if self._rows is None or refresh or time.monotonic() - self._updated >= CATALOG_TTL:
            payload = _get_binance_json("/exchangeInfo")
            if not isinstance(payload, dict) or not isinstance(payload.get("symbols"), list):
                raise ValueError("Binance returned an invalid spot exchange catalog")
            rows = []
            for item in payload["symbols"]:
                if (item.get("status") != "TRADING" or not item.get("isSpotTradingAllowed")
                        or not item.get("symbol") or not item.get("baseAsset") or not item.get("quoteAsset")):
                    continue
                filters = {f.get("filterType"): f for f in item.get("filters", []) if isinstance(f, dict)}
                price_filter = filters.get("PRICE_FILTER", {})
                lot_filter = filters.get("LOT_SIZE", {})
                raw = item["symbol"].upper()
                rows.append({
                    "instrument_id": stable_instrument_id("BINANCE_SPOT", raw),
                    "symbol": raw,
                    "name": f"{item['baseAsset']} / {item['quoteAsset']}",
                    "market": "crypto_spot",
                    "base_asset": item["baseAsset"],
                    "quote_asset": item["quoteAsset"],
                    "exchange": "Binance",
                    "venue": "BINANCE_SPOT",
                    "provider": "binance",
                    "provider_symbol": raw,
                    "availability": "historical_only",
                    "access_reason": "Public exact-symbol spot candles and kline updates; no executable quote or order access is provided.",
                    "streaming": True,
                    "price_tick": price_filter.get("tickSize"),
                    "quantity_step": lot_filter.get("stepSize"),
                    "min_quantity": lot_filter.get("minQty"),
                    "raw_provider_id": item.get("symbol"),
                })
            self._rows = rows
            self._updated = time.monotonic()
            self._updated_at = datetime.now(timezone.utc).isoformat()
        return self._rows, self._updated


class TwelveDataCatalog:
    """Reference-data adapter. Public display is locked until owner approval.

    `TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED=true` must be set only after the
    account plan and applicable exchange/display rights have been verified.
    """
    ENDPOINTS = {
        "stocks": ("/stocks", "stock"),
        "forex": ("/forex_pairs", "forex"),
        "crypto": ("/cryptocurrencies", "crypto_spot"),
        "etfs": ("/etf", "etf"),
        "commodities": ("/commodities", "commodity"),
    }

    def __init__(self):
        self._rows = None
        self._updated = 0.0

    @property
    def enabled(self):
        return bool(os.getenv("TWELVE_DATA_API_KEY")) and os.getenv(
            "TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED", "false"
        ).lower() == "true"

    def list(self):
        if not self.enabled:
            return [], "requires_access"
        if self._rows is not None and time.monotonic() - self._updated < 10_800:
            return self._rows, "available"
        output = []
        key = os.environ["TWELVE_DATA_API_KEY"]
        for group, (path, market) in self.ENDPOINTS.items():
            url = f"{TWELVE_DATA_API}{path}?{urlencode({'apikey': key})}"
            payload = _get_json(url)
            data = payload.get("data") if isinstance(payload, dict) else None
            if not isinstance(data, list):
                raise ValueError(f"Twelve Data {group} catalog did not return a data list")
            for item in data:
                symbol = str(item.get("symbol") or "").strip()
                if not symbol:
                    continue
                exchange = str(item.get("exchange") or item.get("mic_code") or "Twelve Data")
                venue = str(item.get("mic_code") or exchange).upper().replace(" ", "_")
                output.append({
                    "instrument_id": stable_instrument_id(f"TWELVE_DATA:{venue}", symbol),
                    "symbol": symbol,
                    "name": str(item.get("name") or symbol),
                    "market": market,
                    "instrument_type": str(item.get("type") or item.get("category") or {
                        "forex": "physical_fx_pair",
                        "crypto": "spot_crypto_pair",
                        "etfs": "etf",
                    }.get(group, market)),
                    "base_asset": item.get("currency_base"),
                    "quote_asset": item.get("currency_quote") or item.get("currency"),
                    "exchange": exchange,
                    "venue": venue,
                    "provider": "twelve_data",
                    "provider_symbol": symbol,
                    "availability": "requires_access",
                    "access_reason": "Catalog discovery does not grant price-data entitlement; verify plan and venue rights per instrument.",
                    "streaming": False,
                    "raw_provider_id": item.get("symbol"),
                    "provider_category": group,
                })
        self._rows = output
        self._updated = time.monotonic()
        return self._rows, "available"


def filter_page(rows, query="", market="", exchange="", limit=50, offset=0):
    q = query.strip().casefold()
    market = market.strip().casefold()
    exchange = exchange.strip().casefold()
    filtered = [row for row in rows if
        (not q or q in " ".join(str(row.get(k) or "") for k in
             ("symbol", "name", "market", "exchange", "venue", "provider_symbol", "base_asset", "quote_asset")).casefold())
        and (not market or row.get("market", "").casefold() == market)
        and (not exchange or exchange in row.get("exchange", "").casefold())]
    filtered.sort(key=lambda row: (row["symbol"].casefold(), row["venue"].casefold()))
    total = len(filtered)
    page = filtered[offset:offset + limit]
    return {"data": page, "total": total, "limit": limit, "offset": offset,
            "has_more": offset + len(page) < total}


def provider_status():
    twelve_ready = TwelveDataCatalog().enabled
    return [
        {"provider": "binance", "market": "crypto_spot", "status": "historical_and_streaming",
         "streaming": True, "access_reason": "Public exact-symbol spot OHLC candles and kline stream adapter; active connection and freshness are reported per chart; no bid/ask or order execution."},
        {"provider": "twelve_data", "market": "stocks_forex_crypto_etfs_commodities", "status": "requires_access",
         "catalog_configured": twelve_ready, "streaming": False,
         "access_reason": "No candle adapter is activated. Catalog discovery requires a server-side API key; chart access also requires verified plan and exchange/display rights."},
        {"provider": "databento", "market": "listed_futures_and_supported_datasets", "status": "requires_access",
         "streaming": False, "access_reason": "No API key or dataset/exchange entitlement is configured; no feed is activated."},
        {"provider": "broker", "market": "broker_specific", "status": "unavailable",
         "streaming": False, "access_reason": "No authorized broker market-data integration is configured."},
    ]


binance_catalog = BinanceSpotCatalog()
twelve_data_catalog = TwelveDataCatalog()
