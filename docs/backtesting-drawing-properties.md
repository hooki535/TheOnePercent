# Drawing properties

The supplied `tool-schemas.js` registers 79 drawing definitions and 25 indicator definitions. It is metadata, not a standalone chart library: its imported `drawing-settings-dialog.js` was absent, and it contains no indicator calculations or drawing renderer. `assets/backtest-settings-schemas.js` adapts those definitions into a browser/Node catalog. No TradingView library or proprietary icons are included.

The replay uses its own properties dialog with **Style**, **Coordinates**, and **Visibility** tabs, a compact two-column Fibonacci grid, and **Template / Cancel / OK** controls. Open it through the selected drawing's **Settings** button or double-click the drawing. Mobile viewports retain the two-column level grid and a scrolling dialog body.

## Implemented behavior

- Fib retracement: individually enabled ratios and colors, add/remove levels, line width/style, trend line, background opacity, reverse, extension, price/ratio labels and label alignment. The initial grid has 25 rows; up to 48 are supported.
- Other drawings: supported line, fill, text/font, brush/highlighter, glyph and long/short position-zone properties. Controls are filtered to settings the renderer actually implements.
- Coordinates edit actual price/bar anchors. Anchored notes use viewport percentages. Position tools expose take profit; parallel channels expose their existing price offset.
- Visibility can include all chart timeframes or an explicit selection. An empty selection hides the drawing on every timeframe.
- Templates store style and timeframe visibility in this browser. They do not change a drawing's coordinates. Reset/load only edit the form until OK is pressed.
- OK validates a complete candidate before one undoable mutation. Cancel leaves the drawing unchanged. Settings and visibility survive session snapshots and restoration; quick toolbar edits stay synchronized.

## Audit and limits

The supplied trend-based Fib extension default repeats ratio 1.272. Level validation normalizes duplicate ratios. Several supplied point labels do not match this application's actual anchors, so the dialog uses actual geometry rather than inventing extra points. Unknown settings are ignored, and numeric values, colors, frame identifiers and coordinates are validated.

The catalog's 25 indicator definitions are not registered as new working studies: metadata alone cannot supply their calculations. This release keeps the existing calculated studies. Advanced properties for other Fib, Gann, pitchfork and pattern tools still require dedicated renderer work; they receive only implemented common properties, coordinate editing and timeframe visibility.

## Validation

`tests/backtest-settings.test.cjs` covers catalog registration, tool mappings, validation, rich settings restoration, real geometry changes and static/Flask parity. The full backtesting suite has 102 passing tests. Browser QA creates an archived-data session and checks per-level SVG colors/width/dashes, coordinates, timeframe visibility, Cancel, templates, save/reload, position-zone rendering, desktop and mobile layouts.
