# Market Overview review

Branch: `design/market-overview-first`. This change adds a review page at
`pages/market-overview.html`; the published homepage is not replaced.

## Open locally

From the repository folder, run `python -m http.server 8000` (Windows:
`py -m http.server 8000`) and visit
`http://localhost:8000/pages/market-overview.html`.

## Scope

White and green layout, desktop sidebar, responsive market cards, OHLC chart,
right watchlist, market categories, available-watchlist gainers, Academy links
and existing page navigation. The overview chart supports timeframe selection,
EMA 20, wheel zoom, drag pan, reset, and focus mode. Full drawing tools open the
existing custom Charts workspace with the selected symbol and interval.

Quotes, candles, changes and gainers read the existing Feed module and market
configuration. Historical data is labelled with its source; it is not presented
as an executable live quote. Unsupported instruments remain unavailable.
Demo data requires an explicit selection or a previously saved demo setting.
Crude oil is included as an unavailable card because the current instrument
catalog does not support it. No provider or database is changed. Private
backtesting archive access remains in the existing backtesting workflow.

Theme controls reuse the existing theme key; initial light appearance does not
write a preference. Existing Journal, Dashboard, Charts, settings and saved data
are retained. Community publishing, a standalone Portfolio, Paper Trading and
news integration are not delivered in this first section. Navigation to those
trading tools currently leads to the existing Dashboard/Charts workspace.
No paid subscription, notification count, or account tier is fabricated.

## Verification

- Existing website tests: `node --test tests/*.test.js tests/*.test.cjs`.
- Browser checks: real-data unavailable state, explicit demo mode, watchlist
  selection, 1H timeframe, EMA 20 and Forex category.
- Real Binance historical crypto candles loaded during browser verification.
- Live news and authenticated workflows have not been verified in this change.
