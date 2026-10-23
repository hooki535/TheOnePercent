# Day Break Lines and Weekday Labels

Two independent overlays in Indicators: Day Break Lines marks each new date with a vertical dotted line; Weekday Labels places Monday–Sunday names along the bottom of the price pane. New sessions enable both. Existing sessions keep their saved choices and can enable either overlay in Indicators.

The overlays follow Settings → Time → chart timezone (UTC by default), including daylight saving. They use only revealed display candles. Missing weekend/holiday candles do not create imaginary trading days. A partial first day gets a label without a fabricated boundary. Labels shorten to three letters in narrow day spans and disappear when too crowded. They are suppressed on daily/weekly/monthly charts and return when switching to intraday views.

Calendar overlays remain visible independently of Hide drawings, since they are indicators. They do not create drawing objects, affect trade fills, or add price/oscillator series. Their switches survive session and portfolio restoration. Chart pan, zoom, resize, timeframe changes, replay and PNG export use the current calendar layout.
