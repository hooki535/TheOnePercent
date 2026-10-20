# Backtesting workspace

For the TradingView chart and all available MT5 forex pairs, see [BACKTESTING-TRADINGVIEW.md](BACKTESTING-TRADINGVIEW.md).

Open `pages/backtesting.html` on the static site, or `/backtesting` in the Flask edition. The shared navigation includes Backtesting.

## What works

- Account-scoped session dashboard with grid/list views, search, instrument filtering and sorting. Signed-in workspaces sync through Supabase; guests stay local.
- Written strategy playbooks; each session freezes the selected rules so subsequent playbook edits cannot change the recorded hypothesis.
- Archived EURUSD 1H, GBPUSD 1D and BTCUSD 1D sample datasets, plus OHLC CSV import. Archives are copied from the existing project cache, attributed there to Yahoo Finance/yfinance. They are historical examples, not authenticated broker execution feeds.
- TradingView Lightweight Charts candle replay, play/pause, stepping, speed selection, forward date advance, zoom, crosshair, SMA20 and saved horizontal levels. Future candles are excluded from chart data and indicator calculations.
- Simulated long/short market, limit and stop entries with a required stop and target; one pending order or position at a time. Manual closes, cancellation, configurable fees and adverse slippage.
- Marked equity curve, closed trade history, win rate, net profit factor, realized and unrealized P&L, close-to-close equity drawdown and net R.
- Notes, resumable action logs, trades CSV export, JSON workspace backup and validated restore. Storage failures show a warning rather than claiming that a save succeeded. A corrupt saved workspace is preserved until explicit restore.
- Responsive desktop and mobile layouts, keyboard controls and explicit data-source labels.

## Simulation conventions

The cursor represents the last revealed **closed** candle. A new order is first eligible on the next candle. A market order or queued manual close uses that next opening price. Slippage is adverse on market/stop fills and stop exits; a target limit fills at its level. Entry and exit fees are each `quantity * configured fee per unit per side`.

For stops, an opening gap uses the opening price rather than inventing a fill at the requested stop. If both protective stop and target are touched in one candle, the stop is processed first. If an intrabar limit/stop entry could have happened after the target touch, that entry-bar target is not awarded. Stops still apply conservatively. Existing bracket conditions at the next open take precedence over a queued manual close.

The cash model is:

`gross USD P&L = direction * (exit - entry) * quantity * cash multiplier`

Use the correct USD value for one whole price-unit move per quantity unit. Quantity means actual base-asset units or contracts, not an inferred broker lot size. Imported non-USD instruments require an explicitly supplied conversion/multiplier; no FX conversion is fetched. The engine does not model bid/ask spread, financing, margin, liquidation, exchange queues, order-book depth, corporate actions or changing conversion rates. Fee/slippage assumptions do not replace a full execution model. Drawdown is sampled at revealed closes, not intrabar lows. Positions still open at the end remain marked to the final close; no invented closing win is booked.

There is no rewind that can erase decisions. Restart creates a separate attempt. Results are reconstructed from the action log when loading a session or restoring a backup. This is a manual research tool, not an automatic strategy runner or live broker interface.

## Data and persistence

CSV accepts a header containing `Date`, `Datetime`, `Time` or `Timestamp`, plus `Open`, `High`, `Low`, `Close` (short `t,o,h,l,c` names also work). ISO dates and Unix seconds/milliseconds are supported. Timezone-free timestamps use UTC. Rows are sorted, then validated for strictly increasing timestamps, positive finite prices and valid OHLC relationships. Files must contain 60-10,000 candles and be at most 2.5 MB. The interval field is descriptive; importing does not resample candles.

State lives under `onepercent:backtesting:v1:<account-id-or-guest>` in browser localStorage. Signed-in workspaces also use the existing Supabase `public.user_data` table and its owner-only row-level-security policies (`supabase/migrations/0001_create_user_data.sql`). The dedicated sync adapter excludes backtesting from the generic storage mirror. Guest and local MT5 workspaces never upload. Sign in before creating sessions you want to resume on another device; guest sessions can be transferred explicitly using backup/restore.

The sync banner reports pending, online, offline or conflict states. New devices pull the online workspace; saves use conditional updates against the last known revision. Two devices editing the same workspace trigger a conflict rather than replacing newer work. Export a local backup before choosing **Load online workspace**. Failed requests preserve the local copy and can be retried. Close the page after **Saved online** appears if you need to resume immediately elsewhere; browsers do not guarantee network writes during shutdown. Sessions stay separate from the live trading journal.

Browser storage quotas vary; export backups before clearing storage. Workspaces are limited to 50 sessions and 100 strategies, and individual datasets to 10,000 candles. LocalStorage is not encrypted; Supabase RLS enforces server-side account isolation.

## Public website preview and shared history

The included EURUSD, GBPUSD and BTCUSD sample archives work in a phone or PC browser with no MT5 or provider key. They remain explicitly labeled historical samples. Visitors can create replay sessions immediately.

**Shared forex history** uses the hosted market API configured in `assets/market-config.js`. `GET /api/backtesting/catalog` reports `not_configured` until the server has `TWELVE_DATA_API_KEY` and `TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED=true`. The approval flag reflects verified public-display access for the owner's provider plan; it is not set automatically. Credentials never go into frontend files. Once configured, the selector loads the provider's actual forex catalogue, with search, pagination, intervals and an optional UTC history end. See `backend/BACKTESTING.md` for deployment details.

## Validation

```sh
node --test tests/backtest-engine.test.cjs
node --test tests/backtesting-assets.test.cjs
```

The engine tests cover causal entry timing, accounting, stops and gaps, ambiguous bars, short trades, cancellation, saved-action reconstruction, invalid data and immutable strategy snapshots. Browser QA exercises the full session lifecycle, downloads, mobile layout and account separation. The Flask route can be tested through a minimal Flask app that registers `blueprints.pages` without starting the application's external market poller.

The static and Flask JavaScript/CSS/data copies must match. The Flask template uses `url_for('static', ...)`, and the Flask shell retains its flat page routes. Official TradingView Lightweight Charts is vendored with its LICENSE/NOTICE and attribution; reference screenshots are not bundled.
