# Historical forex connection

The included archives have fixed date ranges. They do not contain continuous minute history from 2022 or earlier.

For provider history, choose **New session → Data source & import → Shared forex history**. Choose the pair and source timeframe, then enter the session's **Start date (UTC)**. That date is sent to the server; leaving it blank requests recent history. **Check earliest available date** queries coverage for the selected pair and timeframe. A coverage date does not guarantee access on the configured provider plan or absence of gaps.

Each session requests at most 5,000 source candles. When a start date is supplied, the server separately requests earlier context and forward history. This avoids assuming that calendar time contains continuous forex candles over weekends. The replay begins immediately before the selected date and continues through the returned window. Continuous multi-year minute replay and automatic loading beyond that window are not implemented.

Provider access still requires the existing server settings `TWELVE_DATA_API_KEY` and `TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED=true`, with suitable provider access for website display. Credentials must remain on the backend. A public GitHub Pages frontend alone cannot supply this data. No Goat Funded data is imported.

The coverage endpoint is `/api/backtesting/coverage?symbol=EUR/USD&interval=1H`. The candles endpoint accepts optional UTC `start` and `end` values in `YYYY-MM-DDTHH:MM` format. Coverage is cached for 24 hours; historical windows for 15 minutes. Requests remain subject to the shared provider-credit budget.

Provider references: [forex coverage](https://twelvedata.com/exchanges/physical_currency), [historical requests](https://support.twelvedata.com/en/articles/5656039-how-to-get-historical-prices).
