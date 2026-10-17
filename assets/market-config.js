/* TheOnePercent market API configuration.
 * Set the production HTTPS backend URL after deployment.
 * Do not put API keys or secrets in this public file.
 * Empty means synthetic demo candles with explicit labeling.
 */
/* A deliberately local-only mode is enabled by the separate MT5 bridge when
 * Charts is served from localhost:8765. GitHub Pages and every other host keep
 * using the public OHLC backend above. */
const localMt5Host = typeof location !== "undefined" &&
  location.hostname === "localhost" && location.port === "8765";
window.THEONEPERCENT_LOCAL_MT5 = localMt5Host;
window.THEONEPERCENT_MARKET_API = localMt5Host
  ? location.origin
  : "https://theonepercent-market-api.onrender.com";
