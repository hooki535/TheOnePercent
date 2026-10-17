# Market data readiness (research snapshot: 2026-10-17)

This repository has one provider-backed market-data path: Binance spot OHLCV.
No broker API, Twelve Data subscription, or Databento entitlement is configured.
Catalog presence is not the same as candle access, and candle history is not an
executable quote.

## Current backend boundary

- `GET /api/providers` reports each adapter's current readiness and reason.
- `GET /api/instruments?q=&market=&exchange=&limit=&offset=` dynamically
  discovers all Binance spot pairs marked `TRADING` and spot-enabled from
  Binance `exchangeInfo`. The endpoint filters and paginates this full response;
  it does not maintain a handwritten sample list.
- The current Binance entries are `historical_only`, identify `Binance` and
  `BINANCE_SPOT`, preserve the raw symbol and actual base/quote assets, and state
  that there is no executable quote or order access.
- Twelve Data reference-data adapter is gated behind a server-side API key and
  an owner-set external-display-rights flag. It exposes discovery categories
  for stocks, forex, crypto, ETFs and commodities, but results remain
  `requires_access`: a catalog listing does not establish symbol-level market
  entitlement or authorize chart display.
- Twelve Data's current indices product page says index data is coming soon, so
  cash indices are not included in this adapter and remain unavailable there.
- Databento and broker feeds are not activated. No credentials, subscriptions,
  broker agreements, order execution, or user-account connectivity were added.

The catalog cache is process memory with bounded refresh windows. Durable,
scheduled synchronization is not active because Render currently has no
PostgreSQL instance and no background worker. The new migration is draft-only.

## Provider review

### Twelve Data

The verified reference endpoints include `/stocks`, `/forex_pairs`,
`/cryptocurrencies`, `/etf`, `/commodities`, and symbol search. These catalogs
are updated on a provider schedule; reference metadata can list exchanges whose data is not
included in the account. Time series supports 1m, 5m, 15m, 30m, 45m, 1h, 2h, 4h,
8h, 1d, 1w and 1mo, up to 5,000 rows per request. Daily history is extensive;
intraday depth varies by instrument and is commonly years rather than an
unlimited guarantee. Earliest timestamps must be checked per symbol.

Real-time quote streaming is via WebSocket. Full WebSocket access starts at
Individual Pro or Business Venture. Business Venture is the lowest listed
business tier with external display; the vendor's current page lists $499/month
(or $414/month equivalent on annual billing). It covers 70+ markets with
market-specific latency and data rights. Exchange approval may be additional;
commercial data outside the US needs approval, and redistribution requires a
separate agreement. Individual plans are personal/internal and do not authorize
customer-facing commercial display. Therefore the account needs the appropriate
business tier and exchange licenses before provider data can appear publicly.

### Binance

The currently integrated product is spot only, using Binance's official public
market-data REST host and no API key. The catalog uses live `exchangeInfo`, not
a sample list. Provider-selected chart symbols retain their exact catalog symbol
and actual quote asset; `BTCUSDT` is never relabeled `BTCUSD`. The live catalog
also returned an independently listed `BTCUSD` Binance spot symbol with quote
`USD`, which is a distinct instrument mapping, not an alias. Market-data access is separate
from authenticated account/order APIs. The provider adapters do not create
bid/ask quotes. Commercial/public display and durable historical storage terms
must be reviewed against Binance's current product terms before enabling broad
redistribution or long-term candle retention.

### Databento

Potential futures coverage is dataset-specific: CME, CBOT, NYMEX and COMEX
products include actual expiring futures and their contract definitions. The
catalog and definition schema expose raw exchange symbols, expiry, tick size,
and instrument class. Continuous futures are a distinct derived series and
need an explicit roll/adjustment policy. Databento documents 16+ years of
historical coverage for supported futures data. Usage-based historical data is
priced by volume; the published page lists Standard at $199/month for live data
and a Plus offering with annual contract and external-distribution rights; the
venue licensing questionnaire may add fees. Current offers also include $125
in new-user historical credits, not a general free production plan. No API key
or exchange entitlements have been added.

## Database status and policy

Render workspace inspection found **no PostgreSQL instance**. `backend/schema.sql`
is therefore not operationally deployed, and its user/workspace records remain
unaffected. `backend/migrations/001_market_catalog.sql` is an additive, reviewed
draft; it has not been executed. It separates instrument identity from provider
symbols, stores venue-scoped OHLCV identity, specifications, sessions, access
state and ingestion progress/errors/gaps. It carries provider provenance and
UTC `TIMESTAMPTZ` candle opens with exact numeric columns.

Before storing data, confirm each provider's storage/retention rights. Before
showing equities/ETFs, record split/dividend adjustment policy and never mix
adjusted with unadjusted histories. Before showing futures, store actual
contract/expiry specifications separately; define continuous-series roll and
adjustment rules before offering continuous charts.

## Next actions before wider real-market coverage

1. Choose whether to purchase Twelve Data Business Venture (listed $499/month)
   or use another provider. Confirm the accepted exchange entitlements,
   geography and external-display terms with Twelve Data.
2. Add the API key only as a Render secret after approval. Do not paste it into
   chat, frontend JavaScript or GitHub.
3. Decide if candle storage is needed. Provision PostgreSQL only after explicit
   approval; review and execute the draft migration with backup/rollback plans.
4. For futures, choose Databento datasets and inspect the live license estimate
   and exchange forms before approving any subscription or venue fee.
5. Provide the name of any broker whose symbols/prices should be supported and
   an authorized API agreement; market data remains separate from order routing.
