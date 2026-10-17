# TheOnePercent market-data backend

This is an independent FastAPI service for the root GitHub Pages frontend. The repository's Render Blueprint deploys it separately; GitHub Pages serves only the static frontend. The frontend's public service URL is configured in `assets/market-config.js`.

`GET /api/providers` reports provider state. `GET /api/instruments` dynamically discovers the full active Binance spot catalog and supports `q`, `market`, `exchange`, `limit` (max 100) and `offset` filters. Binance charts require an exact active provider symbol; the response includes actual base/quote assets and exchange/venue provenance. For example, `BTCUSDT` is reported with quote `USDT` and never relabeled `BTCUSD`. Only current Binance spot history is chartable. Catalog discovery does not imply a price-data entitlement for Twelve Data or Databento.

## Local development

```sh
cd backend
python -m pip install -r requirements.txt
uvicorn app:app --reload
```

Test `http://localhost:8000/health` and `http://localhost:8000/api/candles/BTCUSDT/1H?limit=100`.

## Deploy

The repository's `render.yaml` configures the existing Render service. The root frontend points to that service through `assets/market-config.js`; keep `CORS_ORIGINS` aligned with the frontend origin.

The initial provider is Binance **spot**, not Binance futures. The complete catalog comes from Binance's `exchangeInfo` endpoint and is refreshed in process. No API keys are required for public candles or public Spot kline streams. The data service validates and proxies the official Binance Spot WebSocket kline stream at `/api/stream/{exact-symbol}/{chart-interval}`; it shares one upstream subscription per active symbol/interval, reconnects with backoff, and the frontend reloads recent REST candles after reconnect before applying buffered stream updates. Binance's supported interval set is explicit in `backend/app.py`; chart intervals outside it do not receive an exchange stream. Per-chart labels distinguish historical, connecting, connected, reconnecting, and stale stream states. This is OHLCV candle data, not executable bid/ask quotes, order flow, Binance futures, or order execution. Provider outages and rate limits still apply. Forex, equities, ETFs, indices, commodities, futures and broker-specific feeds remain unavailable as real charts until a verified provider and access rights are integrated.

`/api/candles/{symbol}/{interval}` returns Unix-second timestamps and validated OHLCV bars. `/api/quotes` returns an empty object until a real quote service exists. Never describe these as live tick quotes.

Production hardening still needed: request quotas, cross-process cache, persistent scheduled catalog synchronization, observability, provider entitlement checks, and durable market-data gap recovery. Stream connectivity is verified per chart at runtime; the provider status endpoint reports adapter capability, not a guarantee that an upstream connection is currently live.

## Production rollout checklist

1. Confirm the existing Render service is deployed from the expected commit. A backend commit does not prove the deployed service has updated.
2. Confirm `GET /health` returns `status: ok` and `GET /api/candles/BTCUSDT/1H?limit=100` returns actual provider OHLCV data.
3. Verify the Charts page shows **Spot historical · Binance spot** for supported crypto pairs after loading; unsupported instruments remain unavailable unless the user explicitly enables Demo mode.
4. Add monitoring, caching, rate limiting, provider policy review, persistent storage, and approved forex/metals/futures providers before marketing the service as a production real-time multi-market terminal.

### Contract tests

```sh
cd backend
python -m pip install -r requirements-dev.txt
python -m unittest -v test_app
```

The tests mock the external provider, so they verify API response structure and validation without claiming a real upstream connection. Spot-crypto historical candles are **not** exchange futures data or tick-by-tick live quotes. Never commit credentials to `market-config.js`.

## Persistent storage (schema only; not yet provisioned)

`backend/schema.sql` defines an earlier PostgreSQL starting point for provider-attributed OHLCV candles, user identities, saved chart workspaces, and Academy progress. `backend/migrations/001_market_catalog.sql` adds a versioned market catalog/provenance foundation but remains draft-only. Neither file creates a database automatically. The inspected Render workspace currently has no Postgres instance, and the FastAPI app uses process memory. Do not apply either file until database provisioning, migration review, backups, authorization and retention rights are approved. Never expose saved user tables via unauthenticated endpoints.

Example, once a database is available:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/schema.sql
```

### Render deployment synchronization

If GitHub commits appear in `main` but Render still reports the original deployment, verify Render's GitHub repository authorization and auto-deploy webhook in the Render dashboard. Do not assume code is running just because it was committed. The public backend is only current when its deployment commit matches the expected GitHub commit.
