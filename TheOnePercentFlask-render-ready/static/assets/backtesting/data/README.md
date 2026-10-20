# Archived replay samples

These are contiguous excerpts (up to 2,000 candles) from the repository's existing `tools/chart-shots/data` CSVs. The original cache documentation attributes the data to Yahoo Finance via yfinance. These files have not been independently authenticated against an exchange or broker feed.

- EURUSD_1H: hourly EUR/USD archive.
- BTCUSD_1D: daily BTC/USD archive; not BTC/USDT or a perpetual contract.
- GBPUSD_1D: daily GBP/USD archive.

No prices are generated. These are historical research samples, not executable quotes. Source revisions, sessions, missing bars and vendor conventions can affect results. Import appropriately licensed OHLC data to test another market or period. Importing a symbol does not supply its contract economics: configure the USD cash multiplier and costs explicitly.
