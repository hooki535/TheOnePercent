# Private historical candles and daily refresh

The existing TheOnePercent Supabase project keeps user sessions/trades in its existing owner-isolated records. Historical candles use separate history tables. This rollout does not reset user accounts or user records.

## What is stored

The initial completed H1/D1 snapshot contains 8,968 monthly compressed chunks across 20 forex pairs plus XAUUSD, totaling 32,558,860 compressed bytes. The original snapshot was partial: 567 of 668 source archives had completed; failed downloads are being retried separately. US30 is the user-approved Dukascopy `USA30IDXUSD` CFD, with available history starting in September 2013. Coverage is always the observed first/last candle, not a promise of every pair back to 2000.

The small compressed H1/D1 collection fits the free database allowance. `history_chunk_payloads` stores gzip bytes as `bytea`; `history_chunks` stores their immutable hash, identity and actual UTC coverage. Atomic batch RPCs avoid thousands of small Storage writes. The earlier Storage pilot remains private and is not removed. M1 originals and ZIP provenance remain on the user's computer; this rollout does not upload the multi-gigabyte minute collection.

Files remain **unpublished** and sources retain `website_display_approved=false`. This is a private cloud archive, not yet a claim that all downloaded history is available to website visitors. Existing source-approval and publication policies remain in force. `history_read_payload` is a security-invoker reader: signed-in users can read only payloads whose metadata and source pass those policies. Browsers cannot call the batch-write, hash inventory or quota RPCs.

## Daily cloud job

`.github/workflows/history-refresh.yml` runs daily at **03:20 UTC / 06:20 Africa/Kampala**, can be started manually, and runs once when its workflow is first pushed. GitHub can delay scheduled starts. It runs without the user's computer being online.

The job checks recent HistData monthly source archives, converts fixed EST (UTC−05:00 without DST) to UTC, excludes conflicting/invalid minutes and aggregates observed H1/D1 candles. Three adjacent source months provide context for UTC boundaries; only months with that context are refreshed. Incomplete hours/days are omitted. No interpolation or generated candles are used. Daily checks cannot force a provider to publish daily data; freshness reports show the actual last available candle.

US30 separately checks Dukascopy's missing monthly H1 periods from September 2013 and refreshes recent periods. It stops on rate limiting instead of repeatedly hammering the provider. An interruption is recorded in `history_update_runs`; the next job resumes based on uploaded inventory. The scheduled workflow does not download the full M1 collection or automatically retry old HistData years outside its recent window.

The cloud worker obtains a short-lived GitHub OIDC token bound to this repository, `main`, this exact workflow and its audience. The Edge Function verifies its signature/issuer/expiry/claims, then uses its built-in server credentials. No service-role secret is committed, shipped to the browser or stored as a GitHub Actions secret. A separate initial-upload token expires after two days; its plaintext exists only in the local workspace's private helper directory outside the repository. The committed Edge source contains placeholders, which disable that local route on an ordinary redeployment.

## Integrity, budget and recovery

The gateway validates the gzip checksum, symbol/frame/month, UTC order, exact candle count/coverage, finite positive OHLC, and declared sizes before writing. All metadata and compressed bytes are inserted in one transaction. Existing hashes are not overwritten; published flags are never changed by ingestion. Local upload ledgers and the server hash inventory make retries idempotent.

The gateway rejects writes beyond a 300 MB compressed-payload allowance or when total database use reaches its 425 MB safety threshold. These are safeguards below the currently documented 500 MB free database allowance, not a promise of unlimited traffic or storage. The much larger M1 archive requires a separately measured hosting plan.

Local upload: `python tools/upload-market-history.py --package PACKAGE_DIR --token-file PRIVATE_TOKEN_FILE`. Daily refresh: `python tools/refresh-market-history.py --out REPORT_DIR` inside the authorized GitHub workflow. Reports retain source failures and actual last candles. A failed daily job must not be described as an up-to-date database.

## Validation

Nine Python tests cover fixed-EST conversion, duplicate/conflict handling, decimal aggregation, partial-hour exclusion, US30 scaling, packaging hashes, safe paths and workflow configuration. Initial real cloud tests verified exact upload/download hashes, rejected missing/forged authentication and corrupt bytes, and confirmed anonymous/signed-in users cannot call the batch writer. Database RLS keeps unpublished candles unavailable to ordinary website accounts.

References: [Supabase free-plan usage](https://supabase.com/docs/guides/platform/billing-on-supabase), [HistData time zone and data format](https://www.histdata.com/f-a-q/), [GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc).
