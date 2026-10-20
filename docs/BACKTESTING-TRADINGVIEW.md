# TradingView replay and MT5 history

The replay terminal uses official TradingView Lightweight Charts v5.2.1,
vendored with Apache 2.0 LICENSE and NOTICE in assets/vendor. Only candles
up to the replay cursor enter the candlestick and SMA20 series. Pan, zoom,
crosshair, research levels and simulated entry/stop/target lines are available.
Advanced Charts is a separate library requiring approved access; its full
built-in drawing and indicator suite is not part of this integration.
Neither library supplies historical market data.

The public website works on phones and computers using included sample
archives and CSV import, without MT5. Account sessions can sync across devices.
Shared forex history is prepared through the hosted API; see
[BACKTESTING.md](BACKTESTING.md) and `backend/BACKTESTING.md` for activation.
The MT5 connection below is an optional local alternative.

## Every available broker forex pair

Start the existing local bridge following backend/LOCAL_MT5.md, then open
http://localhost:8765/pages/backtesting.html#sessions. In New session choose
**MT5 broker · all available forex pairs**. The searchable, paginated catalogue
comes from the connected Exness MT5 terminal and preserves broker suffixes.
Choose the interval and request 60–10,000 closed candles. The dedicated
/api/backtesting/candles endpoint starts at MT5 position 1, excluding the
forming candle. The existing normal chart endpoint retains its current bar.

The broker and MT5 settings determine historical depth. Missing or insufficient
history gives an error. Data is frozen into each replay session; replay does
not refetch or revise candles. Broker history stays in this local browser
workspace. The static/Flask app links to the local workspace instead of
requesting a private terminal across origins. No broker orders are sent.

The existing bridge remains Exness-only. A working terminal and optional
MetaTrader5 Python package are required; the UI alone does not connect a broker.
Other brokers require an adapter. CSV import still accepts any pair with
valid OHLC data.

## Cash conversion

Quantities are base units/contracts, not MT5 lots. USD-quoted forex defaults
to multiplier 1 USD per 1.0 price move per base unit. Crosses require an
explicit fixed USD conversion multiplier. Historical variable FX conversions,
broker spreads, swaps and margin are not modeled.
