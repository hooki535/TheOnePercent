# TheOnePercent market-data backend

This is an independent FastAPI service for the root GitHub Pages frontend. The repository's Render Blueprint deploys it separately; GitHub Pages serves only the static frontend. The frontend's public service URL is configured in `assets/market-config.js`.

## Local development

```sh
cd backend
python -m pip install -r requirements.txt
uvicorn app:app --reload
```

Test `http://localhost:8000/health` and `http://localhost:8000/api/candles/BTCUSDT/1H?limit=100`.

## Deploy

The repository's `render.yaml` configures the existing Render service. The root frontend points to that service through `assets/market-config.js`; keep `CORS_ORIGINS` aligned with the frontend origin.

The initial provider is Binance **spot**, not Binance futures. It supports BTC, ETH and SOL against USDT through Binance's public market-data endpoint (`data-api.binance.vision`). No API keys are required for public candles. The API host is data-only; it does not provide account access, orders, or tick streaming. Provider outages and rate limits still apply. Forex, metals, indices, and futures deliberately remain demo until verified display sources are integrated.

`/api/candles/{symbol}/{interval}` returns Unix-second timestamps and validated OHLCV bars. `/api/quotes` returns an empty object until a real quote service exists. Never describe these as live tick quotes.

Production hardening needed: request quotas, provider failover, persistent historical storage, observability, rate limiting, and a proper symbol catalog.

## Production rollout checklist

1. Confirm the existing Render service is deployed from the expected commit. A backend commit does not prove the deployed service has updated.
2. Confirm `GET /health` returns `status: ok` and `GET /api/candles/BTCUSD/1H?limit=100` returns actual provider OHLCV data.
3. Verify the Charts page shows **Spot historical · Binance spot** for supported crypto pairs after loading; unsupported instruments must remain clearly marked **Demo candles**.
4. Add monitoring, caching, rate limiting, provider policy review, persistent storage, and approved forex/metals/futures providers before marketing the service as a production real-time multi-market terminal.

### Contract tests

```sh
cd backend
python -m pip install -r requirements-dev.txt
python -m unittest -v test_app
```

The tests mock the external provider, so they verify API response structure and validation without claiming a real upstream connection. Spot-crypto historical candles are **not** exchange futures data or tick-by-tick live quotes. Never commit credentials to `market-config.js`.

## Persistent storage (schema only; not yet provisioned)

`backend/schema.sql` defines a PostgreSQL starting point for provider-attributed OHLCV candles, user identities, saved chart workspaces, and Academy progress. It does **not** create a database automatically and the current FastAPI application still uses an in-memory cache. Apply it only after provisioning a database, selecting an authentication provider, and designing authorization policies. Never expose `saved_chart_workspaces` or `academy_progress` via public unauthenticated endpoints.

Example, once a database is available:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/schema.sql
```

### Render deployment synchronization

If GitHub commits appear in `main` but Render still reports the original deployment, verify Render's GitHub repository authorization and auto-deploy webhook in the Render dashboard. Do not assume code is running just because it was committed. The public backend is only current when its deployment commit matches the expected GitHub commit.
