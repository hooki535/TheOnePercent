# Backtesting workbench

The updated workspace follows the supplied session-dashboard and terminal
references while retaining TheOnePercent branding and the official TradingView
Lightweight Charts library. No reference screenshots, logos or proprietary
Advanced Charts package are included.

## Workflow

- Sessions: grid/list cards, actual equity curves, date/instrument/search
  filters, tutorial, continue/statistics actions and session export/delete menu.
- Session creation: optional name/description, balance, UTC start/end window,
  source choice, optional strategy, and up to five available pairs. Dataset
  coverage is explicit; additional pairs need at least 60 candles each in the
  common historical window and 30 context candles before replay begins.
- Strategies: descriptions, colors, up to 20 checklist items and optional
  detailed setup/entry/exit/risk rules. Sessions freeze their chosen playbook;
  later strategy edits do not rewrite earlier sessions. Checklist progress is
  saved with each session.
- Practice challenges: one-step, two-step phase presets and trailing drawdown
  practice with selectable balances. These are study presets, not a prop firm's
  current terms, a purchase, or a funded account. Targets require the minimum
  trading-day count and no remaining positions/orders. Daily/max loss rules
  use revealed candle-close account equity; intrabar account drawdown is not
  inferred. Failure remains recorded even if equity later recovers.
- Replay terminal: full chart workspace, compact sidebar, play/step/speed/date
  advance, optional order drawer, save, full screen and PNG export.
- Drawing tools: editable trend lines, rays, rectangles, Fibonacci retracements,
  long/short position drawings, horizontal levels, selection handles, undo,
  delete and clear. Position drawings can remain annotations or prefill a
  pending simulated order. They do not place orders without submission.
- Indicators: SMA20, EMA20/50/200, Bollinger Bands20 with two standard
  deviations, RSI14 and ATR14. RSI/ATR use one optional oscillator pane.
  Calculations receive only the revealed candle prefix.
- Risk sizing: initial balance/current equity, percent or cash budget,
  quick presets, configurable units per lot, manual units/lots, market/limit/
  stop orders, SL and TP. Estimates include configured fees and slippage
  allowances. Actual fills/gaps can exceed the initial cash budget. Crosses
  still need an explicitly supplied fixed USD conversion multiplier.
- Trades: Pending/Open/Closed tabs, time sorting, outcome/direction filters,
  cancellation/manual closing and saved reviews with notes and emotions.
  Closed trades prompt a review. The preview uses actual candles through the
  trade's exit, not future candles or copied screenshots.
- Analytics: account/session scopes; overview, wins/losses and year-calendar
  tabs; net P&L, expectancy, fees, profit factor, streaks, weekday/week counts,
  pair summaries and fixed UTC entry-hour study blocks. Days/weeks/months use
  closed-trade exit time in UTC. Missing cohorts show no result rather than
  fabricated profits, win rates or best/worst days.

## Multi-pair accounting

`assets/backtest-workspace.js` wraps the deterministic single-market engine.
One session has one initial balance and one monotonically advancing UTC clock.
Only markets whose next bar is due advance on a tick; a daily pair cannot use
an unrevealed daily close merely because an hourly pair advanced. Each pair
retains its own position/order and chart drawings. Aggregate balance equals
the starting balance plus each market's realized cash changes; it never adds
five copies of the starting capital. Marked equity includes every open pair.

Saving records immutable market candles and a global decision log, not trusted
computed balances. Restoration replays the log, recomputes trades/equity and
validates clock/market identity. A failed challenge or non-positive shared
equity cancels standing pending entries; existing open positions are still
marked and can be closed manually rather than receiving an invented exit.
Data/model limitations from `BACKTESTING.md` continue to apply.

## Compatibility and availability

Existing single-pair backups and account storage keys remain supported.
Account sync, offline copies and optimistic concurrency checks remain active.
The static and Flask editions share identical replay assets; Flask keeps its
own flat navigation routes.

The published preview includes EURUSD, GBPUSD and BTCUSD archives. All other
shared forex pairs require the prepared server-side provider connection in
`backend/BACKTESTING.md`; no new provider key or display entitlement has been
configured. CSV import and the optional local Exness MT5 connector remain
available. The complete proprietary Advanced Charts toolkit still requires
approved access; this release supplies the custom tools listed above.

Validation: `node --test tests/backtest-*.test.cjs tests/backtesting-assets.test.cjs`.
Browser QA covers risk orders/reviews, drawings/handles/PNG export, studies,
analytics/calendar, challenge failure, real three-archive portfolio restore,
cross-device sync conflicts and desktop/mobile layout.

## Reference controls added after account inspection

The replay header includes balance visibility, keyboard help and Backtest settings with Session info, Time, Costs and Chart tabs. Name and description remain editable; the original strategy stays frozen. Fees and adverse slippage can change only before the first submitted order, including any subsequently cancelled order. This preserves action-log replay results.

The replay clock can display UTC, Kampala, London, New York or Tokyo using timezone-aware formatting. Stored bars, table timestamps, exports and analytics remain UTC. A draggable and keyboard-accessible separator changes chart height. Table column visibility and table expansion work without modifying exported trade fields. These display preferences are local to the browser.

The signed-in reference exposed these controls, but its embedded chart remained on Almost ready during inspection and the browser later timed out. No reference trades, settings, licensed code or account data were copied. The complete native TradingView toolkit is not included.
