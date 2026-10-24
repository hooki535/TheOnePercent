# Use the downloaded history on the website

Sign in to an account assigned archive access, open **Backtesting → New session**, and use **Downloaded market history**. It is selected automatically when the signed-in account has available archives. EURUSD hourly is the initial selection.

Choose a pair and base timeframe, then choose a start date inside its displayed coverage. The browser loads up to 5,000 actual candles around that date, including earlier context. Dates and coverage are UTC; gaps may exist. Leave dates blank for a recent window. Choose up to five pairs with the same base timeframe; their replay uses their shared date range. Cross-currency pairs require the existing fixed USD conversion setting.

The cloud collection currently contains hourly and daily candles. Hourly sessions can display higher timeframes such as 4H, 1D and 1W from their revealed candles. A shorter timeframe needs a shorter source dataset; hourly bars are never split into invented minute bars. The original multi-gigabyte minute archives remain local.

## Connection and access

`backtest-cloud-history.js` calls three security-invoker RPCs through the existing signed-in Supabase client:

- `history_catalog()` returns compact per-pair/timeframe coverage instead of downloading every monthly metadata row when opening the form.
- `history_months(provider, symbol, timeframe)` returns the accessible current monthly versions for the selected archive. It prefers the most complete uploaded coverage and deterministically selects one immutable version per month.
- `history_read_payload(object_key)` reads compressed database bytes. The browser checks the declared size and SHA-256 before decompressing and validating OHLC order and coverage. A failed or unauthorized request never substitutes a sample dataset.

The administrator assigns personal archive access through `history_account_access`. Its owner-only RLS policy exposes each user's own assignments. Related read-only policies allow assigned accounts to read the corresponding source metadata, monthly metadata and compressed payloads. Anonymous and unassigned accounts cannot read the private collection. Browsers cannot assign access, upload history or alter stored candles. Existing sessions and trades continue using their existing account storage.

This connection does not mark sources approved for public redistribution or change the publication flags. Personal account access is separate from the existing approved/publication route. Newly ingested chunks automatically become available to assigned accounts on their next catalog load, including data from the daily refresh job. No manual CSV import, client secret or per-visitor API key is needed.

Migration: `supabase/migrations/0004_history_website_connection.sql`. Database allow/deny checks: `supabase/tests/history_account_access.sql`. Reader tests: `tests/backtest-cloud-history.test.cjs`.
