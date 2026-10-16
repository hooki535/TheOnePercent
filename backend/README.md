# TheOnePercent market-data backend

This is an independent FastAPI service intended for deployment on Render or another Python host. It is **not yet deployed**. GitHub Pages serves only the static frontend.

## Local development

```sh
cd backend
python -m pip install -r requirements.txt
uvicorn app:app --reload
```

Test `http://localhost:8000/health` and `http://localhost:8000/api/candles/BTCUSDT/1H?limit=100`.

## Deploy

Create a Render Blueprint from the repository's `render.yaml`. Once the service is deployed, set `window.THEONEPERCENT_MARKET_API = "https://YOUR-SERVICE.onrender.com"` **before** `assets/feed.js` loads on the frontend, or use an equivalent injected config. Update `CORS_ORIGINS` to your actual frontend origin.

The initial provider is Binance **spot**, not Binance futures. It supports BTC, ETH and SOL against USDT. No API keys are required for the public candles endpoint. Hosting-region restrictions, provider outages, rate limits, and licensing/terms must be checked before production use. Forex, metals and futures deliberately remain demo until verified sources are integrated.

`/api/candles/{symbol}/{interval}` returns Unix-second timestamps and validated OHLCV bars. `/api/quotes` returns an empty object until a real quote service exists. Never describe these as live tick quotes.

Production hardening needed: request quotas, provider failover, persistent historical storage, observability, rate limiting, and a proper symbol catalog.

## Production rollout checklist

1. Deploy the repository's `render.yaml` Blueprint to a Python web host. The hosting account must be connected and authorized by the repository owner; committing the Blueprint does not create a live service.
2. Confirm `GET /health` returns `status: ok` and `GET /api/candles/BTCUSD/1H?limit=100` returns actual provider OHLCV data.
3. Set `window.THEONEPERCENT_MARKET_API` in `assets/market-config.js` to the deployed **HTTPS origin** (no trailing slash). This is a public URL, **not** a secret. Commit the updated config to deploy it on GitHub Pages.
4. Verify the Charts page shows **Historical data** for supported crypto pairs after loading; unsupported instruments must remain clearly marked **Demo candles**.
5. Add monitoring, caching, rate limiting, provider policy review, persistent storage, and approved forex/metals/futures providers before marketing the service as a production real-time multi-market terminal.

### Contract tests

```sh
cd backend
python -m pip install -r requirements-dev.txt
python -m unittest -v test_app
```

The tests mock the external provider, so they verify API response structure and validation without claiming a real upstream connection. Spot-crypto historical candles are **not** exchange futures data or tick-by-tick live quotes. Never commit credentials to `market-config.js`.
