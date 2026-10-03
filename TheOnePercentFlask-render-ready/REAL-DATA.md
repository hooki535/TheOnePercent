# Real market-data architecture

The charts now use a real-data path:

```text
Dukascopy -> Flask poller -> live candle book -> SSE -> browser
Dukascopy -> candle API -> Feed.history() -> Lightweight Charts
```

## Supported symbols

The free Dukascopy mapping currently covers the symbols in `dukascopy_feed.py`:
EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD, EURJPY, GBPJPY,
EURGBP, XAUUSD, XAGUSD, BTCUSD and ETHUSD.

The rest of the application's instrument list is not silently filled with fake
prices. If a symbol is not in that mapping, the candle API returns 404.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000/charts`.

## Useful endpoints

```text
GET /api/quotes
GET /api/quote/EURUSD
GET /api/candles/EURUSD/5m?limit=620
GET /api/stream/EURUSD/5m
GET /api/symbols
GET /api/health
```

Historical candle requests are cached briefly in memory. The live browser stream
uses Server-Sent Events (SSE), and the frontend updates the forming Lightweight
Charts candle incrementally instead of generating a replacement price locally.

## Important data-source note

Dukascopy's public historical feed is not a broker execution connection. This
project is a read-only market-data/charting layer. Do not use it as an order
execution or latency-sensitive trading feed.
