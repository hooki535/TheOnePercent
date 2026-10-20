# Shared website backtesting feed

The website preview works immediately using its included, labeled archives.
MT5 is optional and is not required by visitors on phones or computers.

To enable shared forex history on the existing market API service:

1. Obtain a Twelve Data account and the appropriate public website display access.
2. Add `TWELVE_DATA_API_KEY` as a server-side secret in the Render service settings.
3. Set `TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED=true` after verifying that access.
4. Deploy the updated backend from this repository. The start command stays
   `uvicorn app:app --host 0.0.0.0 --port $PORT` with root directory `backend`.
5. Verify `/api/backtesting/catalog` returns `status: configured`, then test
   `/api/backtesting/candles?symbol=EUR%2FUSD&interval=1H&limit=100`.

The website loads the configured catalogue automatically. CORS must allow the
actual website origin; the existing GitHub Pages origin is already configured.
Both API settings must stay on the server, never in public JavaScript or Git.
Provider package access and coverage determine which pairs and dates are usable.

The feed validates exact pair identity and OHLC values, rejects duplicates,
uses UTC, and excludes any candle whose interval has not fully elapsed at the
requested cutoff. It requests 60–5,000 candles. The process cache is bounded to
64 entries, coalesces duplicate requests, and caches history for 15 minutes.
Public cache misses share a conservative six upstream requests/minute budget;
upstream rate limits also cause a cooldown with Retry-After. These are per-process
controls; additional workers/instances need a shared cache/budget before scaling.
Process restarts clear the cache. User replay sessions store a frozen copy of
their candles separately in Supabase, not in this cache.

The adapter returns honest unavailable/not-configured responses instead of
substituting sample candles for a requested provider pair. Its provider errors
never expose API-key-bearing request URLs. No credentials are present in this
commit and no provider account is provisioned by deploying it.

Reference: https://twelvedata.com/docs and
https://support.twelvedata.com/en/articles/5214728-getting-historical-data

Run contract tests with `python -m unittest discover -v -p 'test_*.py'` from
`backend` after installing `requirements-dev.txt`.
