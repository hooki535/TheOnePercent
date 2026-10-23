# Backtesting drawing suite

Original implementations guided by the supplied screenshots. No Advanced Charts library or proprietary assets are bundled.

## Available tools

82 named drawing tools in seven groups: lines, Fibonacci/Gann, shapes, annotations, patterns, forecasting/measurement, and icons. The icon picker includes eight emoji categories, sticker badges and monochrome symbols. Thin outline SVG icons, split buttons, favorite stars, shortcuts, repeat mode, magnet, visibility, lock, ruler, zoom and object tree controls share the chart rail.

Click the indicated number of anchors for fixed-point tools. Drag Brush/Highlighter. Click vertices and double-click to finish Path/Polyline/Ghost Feed. Escape cancels unfinished drawings. Saved anchors use source-bar coordinates and are reprojected when changing timeframe. Anchored notes store viewport fractions. Selection handles edit individual points; dragging a drawing moves it. Undo/redo, color, width, line style, lock/hide/delete and persistence also apply to new tools.

## Data and calculation limits

Anchored VWAP and Fixed Range Volume Profile require genuine, nonnegative volume on the revealed bars. CSV volume/tick_volume is optional and retained; aggregation sums volume only if every constituent provides it. HistData's unused sixth field is intentionally not treated as real volume. The profile distributes OHLC-bar volume across its price range: it is labeled OHLC-derived, not tick-level volume at price.

Manual patterns annotate user-selected points; they do not automatically detect patterns. Bars Pattern copies revealed bars only. Ghost Feed is a drawing, explicitly labeled as such, and never enters market candles or trade fills. Gann/Fibonacci/pitchfork implementations provide their base geometry, not TradingView's complete settings/template engine.

The indicator picker has 19 entries. Sixteen are available on ordinary OHLC history; Accumulation/Distribution additionally needs volume. Advance/Decline is disabled without breadth data. Accumulative Swing Index is disabled without a configured exchange limit-move value. Oscillators use independent panes. All computations use revealed candles only. The 52-week high/low uses the available portion of its rolling 364-day window.

## References and validation

Tool behavior references: [Inside Pitchfork](https://www.tradingview.com/support/solutions/43000518146-inside-pitchfork-drawing-tool/), [Gann Square Fixed](https://www.tradingview.com/support/solutions/43000791675-gann-square-fixed-drawing-tool/), [ALMA](https://www.tradingview.com/support/solutions/43000594683-arnaud-legoux-moving-average/), [ADX](https://www.tradingview.com/support/solutions/43000589099-average-directional-index-adx/).

Unit tests cover registry geometry, sanitization, optional volume, aggregation and study values. Browser checks place every ordinary-data drawing, edit/save/reload multi-point and freehand drawings, check volume requirements, indicator search, icon categories and viewport fit. The static and Flask applications share identical implementations.
