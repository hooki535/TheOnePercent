/* Optional TradingView-hosted Advanced Chart embed.
   This view is isolated from TheOnePercent's chart engine and data paths. */
(function () {
  "use strict";

  const body = document.body;
  const customButton = document.getElementById("customChartViewButton");
  const tradingViewButton = document.getElementById("tradingViewChartButton");
  const customReturn = document.getElementById("customChartReturn");
  const retryButton = document.getElementById("tvChartRetry");
  const toolbar = document.getElementById("chartToolbar");
  const view = document.getElementById("tvChartView");
  const mount = document.getElementById("tvChartMount");
  const status = document.getElementById("tvChartStatus");
  if (!body || !customButton || !tradingViewButton || !customReturn || !view || !mount || !status) return;

  const DEFAULT_SYMBOL = "FX_IDC:EURUSD";
  const SCRIPT_URL = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  let failureTimer = 0;
  let currentContainer = null;

  function currentTheme() {
    return window.Theme && typeof window.Theme.current === "function"
      ? window.Theme.current()
      : document.documentElement.getAttribute("data-theme") || "dark";
  }

  function setStatus(message, failed) {
    status.textContent = message;
    retryButton.hidden = !failed;
  }

  function widgetConfig() {
    const dark = currentTheme() === "dark";
    return {
      autosize: true,
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "60",
      locale: "en",
      save_image: false,
      style: "1",
      symbol: DEFAULT_SYMBOL,
      theme: dark ? "dark" : "light",
      timezone: "Etc/UTC",
      backgroundColor: dark ? "#131722" : "#ffffff",
      gridColor: dark ? "rgba(255,255,255,0.06)" : "rgba(19,23,34,0.06)",
      watchlist: [],
      withdateranges: true,
      compareSymbols: [],
      studies: [],
      support_host: "https://www.tradingview.com",
    };
  }

  function clearWidget() {
    if (failureTimer) window.clearTimeout(failureTimer);
    failureTimer = 0;
    currentContainer = null;
    while (mount.firstChild) mount.removeChild(mount.firstChild);
  }

  function createWidget() {
    clearWidget();
    setStatus("Loading the official TradingView embed. FX_IDC:EURUSD availability in Advanced Chart is unverified; use the widget symbol selector if unavailable.", false);

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = "100%";
    container.style.width = "100%";
    const slot = document.createElement("div");
    slot.className = "tradingview-widget-container__widget";
    slot.style.height = "calc(100% - 32px)";
    slot.style.width = "100%";
    const attribution = document.createElement("div");
    attribution.className = "tradingview-widget-copyright";
    const link = document.createElement("a");
    link.href = "https://www.tradingview.com/symbols/EURUSD/?exchange=FX_IDC";
    link.target = "_blank";
    link.rel = "noopener nofollow";
    link.textContent = "EURUSD chart";
    const trademark = document.createElement("span");
    trademark.className = "trademark";
    trademark.textContent = " by TradingView";
    attribution.appendChild(link);
    attribution.appendChild(trademark);
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = SCRIPT_URL;
    script.async = true;
    script.textContent = JSON.stringify(widgetConfig());
    currentContainer = container;

    script.onerror = function () {
      if (currentContainer !== container || !body.classList.contains("tv-chart-active")) return;
      if (failureTimer) window.clearTimeout(failureTimer);
      failureTimer = 0;
      setStatus("TradingView could not load the embed. Check your connection, retry, or return to TheOnePercent Chart.", true);
    };
    script.onload = function () {
      if (currentContainer !== container || !body.classList.contains("tv-chart-active")) return;
      setStatus("TradingView embed script loaded. If its chart stays blank or reports an unavailable symbol, choose another symbol in the widget or return to TheOnePercent Chart.", false);
    };

    container.appendChild(slot);
    container.appendChild(attribution);
    container.appendChild(script);
    mount.appendChild(container);

    failureTimer = window.setTimeout(function () {
      if (currentContainer !== container || !body.classList.contains("tv-chart-active")) return;
      if (!slot.querySelector("iframe")) {
        setStatus("The TradingView chart did not initialize. The symbol or embed may be unavailable; retry or return to TheOnePercent Chart.", true);
      }
      failureTimer = 0;
    }, 15000);
  }

  function setMode(tradingView) {
    body.classList.toggle("tv-chart-active", tradingView);
    view.hidden = !tradingView;
    customButton.setAttribute("aria-pressed", String(!tradingView));
    tradingViewButton.setAttribute("aria-pressed", String(tradingView));
    if (tradingView) createWidget();
    else {
      clearWidget();
      setStatus("Select TradingView Chart to load the widget.", false);
    }
    window.requestAnimationFrame(function () {
      if (tradingView && toolbar && typeof toolbar.getBoundingClientRect === "function")
        view.style.top = Math.max(0, toolbar.getBoundingClientRect().bottom) + "px";
      window.dispatchEvent(new Event("resize"));
    });
  }

  window.addEventListener("resize", function () {
    if (body.classList.contains("tv-chart-active") && toolbar && typeof toolbar.getBoundingClientRect === "function")
      view.style.top = Math.max(0, toolbar.getBoundingClientRect().bottom) + "px";
  });

  customButton.addEventListener("click", function () { setMode(false); });
  tradingViewButton.addEventListener("click", function () { setMode(true); });
  customReturn.addEventListener("click", function () { setMode(false); customButton.focus(); });
  retryButton.addEventListener("click", createWidget);

  if (new URLSearchParams(window.location.search).get("view") === "tradingview") setMode(true);
})();
