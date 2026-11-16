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

## Position-tool audit and fixes

Long/Short SVGs now show opposite target/stop bands and direction arrows. The selected direction is explicit during placement: either drag direction preserves the first price as entry, reflects stop to the proper side and places target at 2x price distance. Zero-risk/non-finite placements are rejected without replacing the plan. Position previews render while dragging and completed boxes retain the drawn bar span instead of occupying a fixed right-hand region. Inputs expose start/end bars for width adjustment.

Dragging entry translates all prices together. Stop/target drags stay at least one instrument tick on the correct side of entry. Each price drag is undoable. Settings reject invalid direction/anchor ranges; Cancel leaves the plan intact. Gross price R/R in Inputs and net R/R after costs on the chart are labelled separately. Missing sizing calculations show unavailable readouts instead of crashing the renderer. Excluded/hidden positions no longer expand autoscaling. Existing single-active-plan architecture and journal sizing logic remain in place.

Validation: 69 Node checks pass. New tests cover Long/Short with both drag directions, first-anchor preservation, invalid placement, entry translation, stop/target constraints, bar bounds and null-sizing rendering. Browser QA on real guest candles verified upward Long, downward Short, anchored green/red boxes, entry translation and Undo, settings validation/Cancel, the Inputs/Style/Visibility tabs and both menu icons. No broker order was placed; account/journal calculations and market data source were not changed.

## Direct movement and resize interactions

The coloured position body now selects and moves the plan in both time and price instead of panning the chart. Selected positions show explicit handles: left/right entry-edge squares resize the time span; stop/target boundaries adjust only their respective price. Body motion derives every update from the original pointer-down snapshot, preserving stop/target distances and box width. Position drags use smooth price coordinates rather than repeated OHLC snapping, have a small drag threshold, freeze the price transform during the gesture, and create one undo step. The price scale resumes normal automatic fitting after release. Locked bodies can be selected/opened but cannot move; hidden/excluded plans are not interactive. Existing legacy positions receive bar bounds on their first direct manipulation.

Validation: 73 Node checks pass, including body translation, independent horizontal resizing, body/boundary/handle hit tests and frozen scale behaviour. Browser QA measured input values before/after full-box movement and verified preserved width/risk distances, price-preserving width resize, independent stop adjustment and no movement while locked. Screenshot: selected short-position handles. Data source and single-active-position architecture are unchanged.

## Free chart navigation

Chart background drags now pan time and price together in the pointer direction. Fractional bar offsets give smooth horizontal movement while candle iteration stays on integer indices. Manual price ranges remain steady through panning, horizontal zoom and position dragging until Fit/reset restores automatic scaling. Wheel zoom preserves the time coordinate under the pointer; horizontal/Shift wheel pans time. Price-axis dragging/wheeling scales around its anchor, and time-axis dragging changes candle spacing. Middle-button drag also permits background navigation while a drawing tool is active. Empty right-side space is bounded at at least 500 interval slots. Future axis labels project interval timestamps only, not market candles or a trading-session calendar. The Data Window hides over empty future slots.

Existing position/drawing bar and price anchors remain unchanged during chart navigation. Reset/Fit, symbol/interval changes and scale mode changes clear incompatible manual ranges. Input is ignored while candle data is unavailable. The existing data source, single active position planner and storage keys remain unchanged.

Validation: 80 Node checks pass. New tests verify reversible fractional coordinates with integer candle indices, pan direction, future limits, pointer-anchored time zoom, normal/inverted price pans, transformed-space zoom and safe manual-range restoration with a read-only chart key. Browser QA on guest database candles verified 2D panning, wheel zoom, price/time axis drags, Fit/reset, and unchanged entry/stop/target/start/end values after navigation. Physical trackpads, touch devices and all indicator-pane combinations were not tested.
