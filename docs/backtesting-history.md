# Historical forex connection

The included archives have fixed date ranges. They do not contain continuous minute history from 2022 or earlier.

## Free local history

Choose **New session → Choose other history → Import OHLC CSV**. Files up to 250 MB / 4 million rows are read in 64 KB chunks on the device, without uploading the file. Set the instrument and desired UTC start date. The importer detects the source timeframe and selects up to 5,000 candles including earlier context. Each saved session includes that window and remains usable after reload. To study another year, import the same file with another start date. This does not enable continuous loading beyond the saved window.

Standard CSV uses comma-separated UTF-8 with a header containing Date/Datetime/Time, Open, High, Low, Close. ISO dates or Unix seconds/milliseconds are accepted. Files may run oldest-first or newest-first; duplicate and overlapping timestamp blocks or invalid OHLC are rejected, including rows outside the selected window.

Alternatively, select **HistData Generic ASCII M1** for an extracted, headerless semicolon-separated CSV. Its six fields are YYYYMMDD HHMMSS;Open;High;Low;Close;Volume. Dates convert from fixed EST (UTC−05:00), including summer, following the [provider specification](https://www.histdata.com/f-a-q/data-files-detailed-specification/). Tick files and ZIP archives are not accepted by this format. [HistData offers free manual downloads](https://www.histdata.com/download-free-forex-data/); check the provider's terms for your use. This importer does not distribute those files to other users or publish them to GitHub.

These files need no API key, provider subscription, or Render service. A local CSV is not an automatically refreshed public feed. Only the selected session window enters the existing account/workspace sync, when enabled; the original file stays local.

## Shared provider history

For provider history, choose **New session → Data source & import → Shared forex history**. Choose the pair and source timeframe, then enter the session's **Start date (UTC)**. That date is sent to the server; leaving it blank requests recent history. **Check earliest available date** queries coverage for the selected pair and timeframe. A coverage date does not guarantee access on the configured provider plan or absence of gaps.

Each session requests at most 5,000 source candles. When a start date is supplied, the server separately requests earlier context and forward history. This avoids assuming that calendar time contains continuous forex candles over weekends. The replay begins immediately before the selected date and continues through the returned window. Continuous multi-year minute replay and automatic loading beyond that window are not implemented.

Provider access still requires the existing server settings `TWELVE_DATA_API_KEY` and `TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED=true`, with suitable provider access for website display. Credentials must remain on the backend. A public GitHub Pages frontend alone cannot supply this data. No Goat Funded data is imported.

The coverage endpoint is `/api/backtesting/coverage?symbol=EUR/USD&interval=1H`. The candles endpoint accepts optional UTC `start` and `end` values in `YYYY-MM-DDTHH:MM` format. Coverage is cached for 24 hours; historical windows for 15 minutes. Requests remain subject to the shared provider-credit budget.

Provider references: [forex coverage](https://twelvedata.com/exchanges/physical_currency), [historical requests](https://support.twelvedata.com/en/articles/5656039-how-to-get-historical-prices).
