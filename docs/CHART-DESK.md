# Charts workspace

The public GitHub Pages Charts screen (`pages/charts.html`) uses a compact terminal layout inspired by the supplied TradingView and GoCharting screenshots. It retains the project's existing canvas renderer, drawing library, studies, feed adapters, replay and journal/risk controls.

- Watchlist shortcuts switch the selected chart's actual symbol. They do not request or manufacture quotes. Blind replay hides the shortcut symbols.
- Replay, chart layouts and PNG export have direct toolbar controls. Layouts delegate to the existing one, two, three, four and six chart implementations.
- The desktop activity rail opens watchlist, drawing layers, crosshair data, alerts, position planning and journal panes. Phones use an overlay panel with a close button and the existing pane tabs.
- Workspace settings, light/dark theme, fullscreen, notes and explicit Demo mode are available from the Workspace menu, including on small screens.
- An unavailable chart offers symbol search, explicitly enabled synthetic demonstration candles, and a link to archived-history backtesting. Demo mode remains off on a fresh browser. The bottom status bar preserves the feed's source label.
- The last chosen inspector pane is stored locally under `top.chartDeskPanel.v1`. Existing layout, appearance, drawing and feed preferences keep their original storage paths.

`charts-desk.css` and `charts-desk.js` own this navigation layer. Existing button nodes are moved rather than cloned, preserving their handlers. `switchTab` now queries all optional dock buttons safely when the dock is absent.

This change targets the public static website. The separate legacy Flask Charts template is unchanged. No TradingView Advanced Charts license, GoCharting SDK, provider subscription, account credentials or market-data entitlement is added by this visual upgrade. Shared forex history still needs the server-side provider connection described in `BACKTESTING-TRADINGVIEW.md`.

Validation: run `node --test tests/*.test.js tests/*.test.cjs` with shell-appropriate glob expansion. The panel-switch regression exercises all six panes with no optional dock. Browser verification covers explicit data mode, market shortcuts, six panels, chart layouts, trend drawing, blind replay, themes, workspace dialog, PNG download, persistence and mobile viewports.
