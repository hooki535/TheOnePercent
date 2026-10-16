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
