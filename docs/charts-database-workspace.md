# Charts workspace and guest candles

Charts now opens directly on real stored candles without TheOnePercent sign-in. The approved compact command bar uses a small logo, symbol and comparison controls, timeframe favourites, icon commands, undo/redo, layouts, an Unnamed workspace with Save beneath it, chart settings, fullscreen, snapshot and an account action. New chart workspaces start on AUDNZD 5m without automatic studies. Existing saved workspaces and watchlists are retained.

The reader uses the existing Supabase client and security-invoker `history_catalog`, `history_months` and `history_read_payload` RPCs for guests and signed-in visitors. It does not manufacture an account session or use privileged credentials. The source stays in the existing TheOnePercent database. No candle payload is bundled into the website.

## Published market scope

The site owner explicitly requested guest candle display on 16 November 2026. Migration `20261116081931_guest_chart_read_access.sql` records that owner publication instruction for the existing HistData and Dukascopy source rows and publishes a bounded recent snapshot: up to two M1 months, four H1 months and twelve D1 months per available instrument, choosing one immutable version per month. This records owner authorization, not a provider licence. There are 66 accessible symbol/base-timeframe datasets in the verified snapshot.

Anonymous SELECT policies apply only to approved source metadata, published monthly metadata and the corresponding compressed candle payloads. Anonymous execution is limited to the existing read-only RPCs. RLS remains enabled, anonymous candle INSERT/UPDATE/DELETE privileges are absent, and the private Storage bucket is unchanged. Personal user_data, archive-account assignments, update logs and user write policies are unchanged. Remaining older/unpublished chunks stay private. New upload versions need publication before guests see them; this migration does not alter the existing ingestion job or auto-publish future uploads.

## Reader and presentation

The reader verifies compressed size, SHA-256, schema/source/symbol/timeframe identity, UTC timestamps, candle count, strict ordering, OHLC bounds and coverage. Higher timeframes aggregate real smaller bars on UTC boundaries; weeks begin Monday and months follow calendar boundaries. Larger bars are never split to fabricate smaller ones. A bounded recent window contains up to 620 plotted bars from at most twelve monthly chunks; gaps remain gaps and the most recent aggregation bucket may be incomplete.

The main chart and instrument details omit the technical Database history label. The Data panel retains the actual source, last stored candle timestamp, historical status and absence of volume. Stored candles do not receive current-bar countdowns or simulated price ticks. These are historical bid OHLC candles, not live prices or executable bid/ask quotes. Volume-dependent studies/profiles remain unavailable when volume is absent. Explicit optional demo mode stays labelled synthetic and resets to stored-data mode on the next page load.

Market search lists instruments covered by the stored catalog, without unconnected broker placeholders. An unavailable or failed read leaves a retry state, not a login wall or synthetic fallback. Workspace Save asks guests to sign in without preventing chart exploration. Existing account storage and workspace keys are preserved.

## Validation

- 57 Node checks pass, including guest RPC reading, archive integrity, no fake lower timeframes, UTC aggregation, independent candle-part rendering and suppression of a current-bar countdown on historical closes.
- `python tools/verify-guest-charts.py` passes against the real database using only the website's public key: 66 datasets; AUDNZD minute payload verified (7,177 candles, last candle 2026-11-06 21:58 UTC); private-record and unpublished-metadata checks pass.
- Browser QA while signed out verified actual AUDNZD and GBPJPY candles, 5m/hourly switching, market search, chart type changes, Indicators, settings, source details in Data, and the Save sign-in prompt. No demo candles or mocked account were used for these checks.
- Security advisors were run. This change adds no SECURITY DEFINER functions. Existing unrelated auth/trigger advisor warnings were left unchanged.
- Physical mobile-device testing and signed-in workspace saving were not repeated in this change.

The Charts work remains on its review branch and PR #8, stacked on homepage PR #7. No merge to main or GitHub Pages production deployment is included. The existing Sites preview remains owner-private; its ChatGPT access control is separate from TheOnePercent account sign-in.

## Section 02 — drawing toolbar

The drawing rail now uses original thin outline SVGs with distinct anchors and consistent sizing. Group chevrons are visible; the 310px flyout uses readable rows, persistent favourite stars and the existing searchable sections and keyboard navigation. Search text and menu scroll position survive starring tools. The custom drawing engine, tool IDs and existing saved drawing/favourite settings are retained.

On the compact research page, starred tools appear once in the floating toolbar instead of also lengthening the rail. An empty favourites list stays empty. The star button shows/hides the strip (new additive `chartsFavoritesHidden` setting); drag to reorder or use Alt+Left/Right on a floating favourite. Other chart consumers retain the existing rail favourites. Existing stored candles remain available to guests.

Validation: 57 Node checks pass, syntax and diff checks pass, and real anonymous history smoke verification passes. Browser QA verified the real candle chart while signed out, opening trend tools, search filtering, starring/unstarring, immediate floating strip updates, and keyboard navigation. Physical mobile device behaviour and signed-in saves were not tested in this section. Icons are original artwork styled to match the reference, not imported TradingView assets.

## Section 03 — tool-specific drawing properties

The existing drawing engine now opens a compact properties sheet with Style, Text, Coordinates and Visibility tabs according to the registered tool. Positions use Inputs, Style and Visibility, retaining the existing position planner and sizing calculation. Double-click a position line to open it; a Position drawing settings shortcut is also available when a position is active.

Changes are drafted without mutating chart objects. OK validates and commits one drawing undo step; Cancel, Escape, close and backdrop dismissal discard the draft. Coordinates edit actual anchor prices/bar indices or map a UTC timestamp to loaded history. Timeframe filters affect drawing, picking and autoscaling. Per-tool templates/defaults are additive `chartsDrawingTemplates` and `chartsDrawingDefaults` settings; defaults are copied into new objects. Templates contain style, optional level rows and visibility, never anchors or identity. Save-template/default/apply-type actions are queued until OK. Cloning/removal remain in the existing floating controls and object tree.

Fibonacci and Gann tools use individual enabled/value/colour rows, up to 30. Existing `levels` arrays and old drawings remain readable; explicit empty/disabled level sets stay empty. Radial/Gann values are validated to avoid invalid geometry. Level controls feed the actual custom renderers. Relevant text/font, line and fill controls use existing renderers; position entry/stop/target, colours, label visibility and fill use the original planner. This covers the current registered tools; it is not an implementation of the entire TradingView tool catalogue or every proprietary option.

Validation: 64 Node checks pass plus syntax and whitespace checks. Browser QA on actual unsigned stored candles verified Fibonacci rendering, numeric OK changes, Cancel isolation, UTC coordinate controls, visibility excluding minutes, template save/reopen, trend-line text/bold, and long-position Inputs/target editing. Physical mobile devices, every individual shape, and signed-in cloud workspace saves were not exhaustively browser-tested. Existing data source and account gates are unchanged.
