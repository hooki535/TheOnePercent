# Local Exness MT5 chart feed

The optional bridge exposes only the instrument catalog and historical OHLC
bars returned by the MetaTrader 5 terminal already open on this Windows PC. It
accepts the terminal only when its reported company/server identifies Exness.
It does not call account, position, order, or execution APIs; it does not ask
for or store an account number or password. MT5's own terminal handles its
saved login. Bars are tagged as historical and their volume is labeled tick
volume, not exchange-traded volume.

The bridge binds to `localhost:8765`. The local Charts page omits Supabase,
cloud sync, and external fonts, and a restrictive Content-Security-Policy blocks
all non-local connections. The page uses a browser profile's local storage;
use a fresh profile for synthetic review records. The server serves only the
Charts and Backtesting pages, local app assets, and read-only bridge endpoints. It is not part
of Render and is not exposed as a public feed.

## Start on Windows

1. Open MT5 and log in to the Exness account whose market symbols you want.
2. From the repository root in PowerShell, install the existing backend
   dependencies and MetaTrader's package:

   ```powershell
   python -m pip install -r backend/requirements.txt MetaTrader5
   ```

3. Start the local service:

   ```powershell
   python -m uvicorn backend.local_mt5_bridge:app --host localhost --port 8765
   ```

4. Open <http://localhost:8765/pages/charts.html> or the replay workspace at
   <http://localhost:8765/pages/backtesting.html#sessions>.

Stop the service with Ctrl+C. No credentials or provider keys are configured
in TheOnePercent. A catalog or candle request will remain unavailable if the
terminal is closed, logged into a non-Exness server, or lacks the requested
symbol/history. There is no synthetic fallback in this local mode.
