# Cloud history and account records

Current rollout: see [daily-history-updates.md](daily-history-updates.md) for the
compressed database payloads, protected uploader and daily GitHub workflow. The
setup notes below describe the earlier private Storage pilot; they are not the
current scheduling or upload status. Source approval and publication remain off.

## Verified setup, 23 October 2026

Migration 0003 was applied to the existing TheOnePercent Supabase project. The
private bucket and three history tables exist with RLS enabled. Account isolation,
cross-user update denial, anonymous record isolation and browser publication
denial passed rollback-only checks. The Python packager's three tests passed.
The current partial H1/D1 package is 6,810,870 bytes; this is not an estimate for
the completed M1 collection. No candle objects have been uploaded, source display
permission is disabled and no monthly job is scheduled. Existing account data
was preserved. A read-only cloud selector and verified chunk reader are now
implemented in both local application copies, but have not been deployed to
GitHub Pages. Four reader tests and the 86-test backtesting suite passed; browser
QA using mock Supabase responses verified selected-date replay, account save,
empty-history feedback and mobile layout. No real objects were uploaded by QA.

The site already uses Supabase Auth and `public.user_data`. Migrations 0001/0002
define owner-only records and profiles. BacktestSync saves the workspace snapshot
(sessions, trades inside each session, strategies, drawings and reviews) under
the signed-in user, with local fallback and optimistic revision checks. Keep this
working path during rollout; do not reset existing user records or change Auth providers.

## Storage layout

Use PostgreSQL for user records and the small candle catalog. Store large candle
arrays as compressed files, partitioned by provider/symbol/timeframe/month. Keep
the original ZIP/BI5 files offline as a provenance backup. Do not duplicate the
whole market archive in every user's saved session. The current frontend still
saves its selected 5,000-bar window; switching to pinned history references and
loading further windows is separate integration work, not enabled by this schema.

`supabase/migrations/0003_market_history_storage.sql` prepares a private
`market-history` bucket, immutable chunk versions, per-source display permissions,
and an admin-only update log. Browsers cannot upload or publish history. Logged-in
users can only read chunks explicitly published for an approved source. No user
record schema is replaced. All table grants and RLS must be verified in a staging
Supabase project before production rollout; this repository file alone does not
provision anything.

`tools/package-market-history.py --root LOCAL_ARCHIVE_ROOT --out LOCAL_PACKAGE_ROOT`
creates monthly H1/D1 files from the downloader's completed combined snapshot.
It preserves decimal price strings, UTC timestamps and source identity. The
manifest records hashes, exact coverage, byte sizes and whether its source
download is complete. Packaging never uploads, approves, schedules or publishes.
Re-running with unchanged candles produces the same object paths. Keep packages
and credentials outside the Git repository.

## Budget and rollout

Supabase currently includes 500 MB database and 1 GB file storage on Free; its free
maximum upload size is 50 MB. Measure the package manifest and existing project
usage before any upload. Start with H1/D1 if the complete M1 collection exceeds
the remaining storage allowance. Keep all M1 originals locally; do not claim
minute history is online until it is actually uploaded and connected. User and
network usage also consume quotas, so fitting storage does not establish that
unlimited website traffic is free.

The existing project is connected and the additive migration applied. Next,
upload a small private EURUSD sample using owner-controlled server credentials.
Verify the source's website-display permission before enabling public use; a
free personal download is not evidence of redistribution permission. Confirm the
sample matches the original OHLC before publishing its metadata. Wire the chart
to request the selected date range, cache fetched chunks, and pin the source
version in sessions. Verify two test users cannot read each other's sessions.
Admin/service-role credentials belong in backend/CI secrets, never frontend JS.

## Recommended monthly update

Run on the third day of each month, after the provider has published the previous
month. Fetch the previous completed source month and recheck the recent boundary
for corrections. Convert source timestamps correctly (HistData uses fixed EST),
validate OHLC/order/duplicates/checksums and record the actual last candle. Upload
new immutable objects, validate them, then replace the active metadata version in
one database transaction. Keep the prior version for sessions referencing it.
Never rewrite old session inputs silently or report an unavailable month as
current. On provider rate limits stop and respect backoff; on network failures
retry only incomplete work. Log success, gaps, errors and storage usage.

Monthly updates support historical backtesting, with up to about one month's
delay plus the source's publication lag. A chart intended to include recent days
needs an additional daily job. No recurring cloud job is enabled yet: it needs
the connected project, tested importer, source permissions and storage budget.

References: https://supabase.com/docs/guides/platform/billing-on-supabase
and https://supabase.com/docs/guides/storage/uploads/file-limits
