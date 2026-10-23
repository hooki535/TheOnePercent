# Drawing toolbar replacement

The replay drawing rail now uses compact SVG icons, split buttons (last tool on
the main button, group menu on the arrow), TradingView-style dark flyouts,
keyboard shortcut hints and blue active states. Group choices are remembered on
the device. Favorite stars add tools to a horizontal strip over the chart.

The groups contain the 20 implemented tools: trend lines and channels,
Fibonacci retracement, geometric shapes, text, positions and range measurements.
This replaces the toolbar presentation and interaction; the underlying drawing
and simulation engines remain TheOnePercent's implementation. It does not embed
TradingView's proprietary drawing library or claim unsupported tools.

Removal actions share one menu. Magnet, repeat drawing, locking, visibility,
undo/redo, selected-drawing settings and saved drawings remain functional. Flyout
menus support arrow-key navigation, Escape, outside-click dismissal and viewport
clamping. Existing user drawings and favorites are retained.

Browser regression checks covered all 20 tools, Fibonacci settings, repeat mode,
lock/hide, undo/redo, favorite persistence, eight timeframes, desktop and phone
layout, with no JavaScript errors. Both static and Flask copies use matching
toolbar JavaScript and CSS.
