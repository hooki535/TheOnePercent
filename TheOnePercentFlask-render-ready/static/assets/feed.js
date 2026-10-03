/* TheOnePercent — feed
   -------------------------------------------------------------------
   Every price on the site comes from here. Nothing else generates a
   quote, a candle or a sparkline, which is the whole reason the module
   exists: the roadmap asked for one feed with a visible demo badge, and
   the alternative — each screen seeding its own numbers — is how the
   charts screen ends up quoting 157.18 while the calculator quotes
   157.42 for the same pair on the same afternoon.

   The chart feed is real-data-first. Historical candles come from Flask's
   Dukascopy candle API; the forming candle arrives over SSE. There is no
   synthetic price fallback in this module. Unsupported symbols are reported
   as unavailable instead of being given fabricated market movement.
   ------------------------------------------------------------------- */

window.Feed = (() => {
  "use strict";

  const I = window.Instruments;

  const DEMO = false;
  const DEMO_NOTE =
    "Real market data from Dukascopy. Historical candles and forming candles are supplied by the Flask backend; no orders are placed.";

  const LIVE_API = "";
  const LIVE_MAX_AGE_MS = 30000;
  let liveQuotes = {};
  const cache = Object.create(null);
  const loading = new Map();
  const subs = new Set();
  let running = true;

  async function pollLive() {
    try {
      const res = await fetch(LIVE_API + "/api/quotes", { cache: "no-store" });
      if (!res.ok) return;
      liveQuotes = await res.json();
      notify();
    } catch (e) {
      /* Keep the last verified quote. We never invent a replacement price. */
    }
  }

  function isLive(sym) {
    const q = liveQuotes[String(sym || "").toUpperCase()];
    return !!(q && !q.error && Number.isFinite(q.price) && Date.now() - Date.parse(q.time) < LIVE_MAX_AGE_MS);
  }

  function toBars(rows) {
    return (rows || []).map((b) => ({
      t: Number(b.t) * 1000,
      o: Number(b.o),
      h: Number(b.h),
      l: Number(b.l),
      c: Number(b.c),
      v: Number(b.v || 0),
    })).filter((b) => Number.isFinite(b.t) && Number.isFinite(b.o) && Number.isFinite(b.h) && Number.isFinite(b.l) && Number.isFinite(b.c));
  }

  async function loadHistory(sym, iv, force) {
    const key = String(sym).toUpperCase() + "|" + iv;
    if (loading.has(key) && !force) return loading.get(key);
    const promise = (async () => {
      try {
        const res = await fetch(LIVE_API + "/api/candles/" + encodeURIComponent(String(sym).toUpperCase()) + "/" + encodeURIComponent(iv) + "?limit=" + BARS, { cache: "no-store" });
        if (!res.ok) throw new Error("candle API returned " + res.status);
        const body = await res.json();
        cache[key] = toBars(body.candles);
        ensureLiveStream(sym, iv);
        notify();
        return cache[key];
      } catch (e) {
        console.warn("Dukascopy history unavailable", sym, iv, e);
        cache[key] = cache[key] || [];
        notify();
        return cache[key];
      } finally {
        ensureLiveStream(sym, iv);
        loading.delete(key);
      }
    })();
    loading.set(key, promise);
    return promise;
  }

  function history(sym, iv) {
    const key = String(sym).toUpperCase() + "|" + iv;
    if (!cache[key]) {
      cache[key] = [];
      loadHistory(sym, iv);
    }
    return cache[key];
  }

  /* The chart keeps the original interval ladder. The backend maps each
     interval to Dukascopy-native OHLC data or a real lower-timeframe/tick
     aggregation; the browser never manufactures a candle. */
  const IV_GROUPS = [
    { label: "Seconds", ivs: ["1s", "5s", "15s", "30s", "45s"] },
    {
      label: "Minutes",
      ivs: ["1m", "2m", "3m", "5m", "10m", "15m", "30m", "45m"],
    },
    { label: "Hours", ivs: ["1H", "2H", "3H", "4H", "6H", "8H", "12H"] },
    { label: "Days", ivs: ["1D", "3D"] },
    { label: "Weeks", ivs: ["1W", "2W"] },
    { label: "Months", ivs: ["1M", "3M", "6M", "12M"] },
  ];
  const SEC = 1e3,
    MIN = 6e4,
    HOUR = 36e5,
    DAY = 864e5;
  const IV_MS = {
    "1s": SEC,
    "5s": 5 * SEC,
    "15s": 15 * SEC,
    "30s": 30 * SEC,
    "45s": 45 * SEC,
    "1m": MIN,
    "2m": 2 * MIN,
    "3m": 3 * MIN,
    "5m": 5 * MIN,
    "10m": 10 * MIN,
    "15m": 15 * MIN,
    "30m": 30 * MIN,
    "45m": 45 * MIN,
    "1H": HOUR,
    "2H": 2 * HOUR,
    "3H": 3 * HOUR,
    "4H": 4 * HOUR,
    "6H": 6 * HOUR,
    "8H": 8 * HOUR,
    "12H": 12 * HOUR,
    "1D": DAY,
    "3D": 3 * DAY,
    "1W": 7 * DAY,
    "2W": 14 * DAY,
    "1M": 30 * DAY,
    "3M": 91 * DAY,
    "6M": 182 * DAY,
    "12M": 365 * DAY,
  };
  const INTERVALS = IV_GROUPS.reduce((a, g) => a.concat(g.ivs), []);
  /* The seven the chips across the top default to. */
  const IV_DEFAULT_FAVS = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
  const IV_BASE = 15 * MIN;
  const BARS = 620;

  /* ---------------------------------------------------------- chart metadata

     Volatility and dealing cost per bar. These are chart concerns, so they
     live here rather than in `instruments.js` — but they are keyed by the
     same symbols, and a symbol missing from this table falls back to a
     per-market default instead of breaking. `spread` is in pips, quoted
     the way a trader reads a spread. */

  const META = {
    EURUSD: {
      vol: 0.00055,
      spread: 1.2,
      session: "London",
      venue: "FX · broker",
    },
    GBPUSD: {
      vol: 0.0006,
      spread: 1.4,
      session: "London",
      venue: "FX · broker",
    },
    USDJPY: {
      vol: 0.0006,
      spread: 1.1,
      session: "Tokyo",
      venue: "FX · broker",
    },
    USDCHF: {
      vol: 0.0005,
      spread: 1.6,
      session: "London",
      venue: "FX · broker",
    },
    USDCAD: {
      vol: 0.00055,
      spread: 1.7,
      session: "New York",
      venue: "FX · broker",
    },
    AUDUSD: {
      vol: 0.0006,
      spread: 1.3,
      session: "Sydney",
      venue: "FX · broker",
    },
    NZDUSD: {
      vol: 0.00065,
      spread: 1.9,
      session: "Sydney",
      venue: "FX · broker",
    },
    EURJPY: {
      vol: 0.0008,
      spread: 1.8,
      session: "London",
      venue: "FX · broker",
    },
    GBPJPY: {
      vol: 0.0011,
      spread: 2.6,
      session: "London",
      venue: "FX · broker",
    },
    EURGBP: {
      vol: 0.00045,
      spread: 1.5,
      session: "London",
      venue: "FX · broker",
    },

    /* The shilling pairs are quoted at a bank counter, not a broker. A
       nine-point spread on USDUGX is not a typo — it is the reason the
       position tool warns when the spread eats the risk. */
    USDUGX: {
      vol: 0.0009,
      spread: 9,
      session: "Kampala",
      venue: "FX · local bank",
    },
    USDKES: {
      vol: 0.0008,
      spread: 12,
      session: "Nairobi",
      venue: "FX · local bank",
    },
    USDZAR: {
      vol: 0.0014,
      spread: 22,
      session: "London",
      venue: "FX · broker",
    },

    XAUUSD: {
      vol: 0.0009,
      spread: 3.2,
      session: "London / NY",
      venue: "Metals · broker",
    },
    XAGUSD: {
      vol: 0.0018,
      spread: 2.2,
      session: "London / NY",
      venue: "Metals · broker",
    },

    BTCUSD: {
      vol: 0.0022,
      spread: 14,
      session: "24h",
      venue: "Crypto · exchange",
    },
    ETHUSD: {
      vol: 0.0026,
      spread: 11,
      session: "24h",
      venue: "Crypto · exchange",
    },
    SOLUSD: {
      vol: 0.0034,
      spread: 6,
      session: "24h",
      venue: "Crypto · exchange",
    },

    US500: {
      vol: 0.0008,
      spread: 4,
      session: "New York",
      venue: "Index · CFD",
    },
    US30: {
      vol: 0.0009,
      spread: 2.4,
      session: "New York",
      venue: "Index · CFD",
    },
    DE40: { vol: 0.001, spread: 2, session: "Frankfurt", venue: "Index · CFD" },
    NAS100: {
      vol: 0.0013,
      spread: 1.4,
      session: "New York",
      venue: "Index · CFD",
    },
    DXY: { vol: 0.0004, spread: 3, session: "New York", venue: "Index · ICE" },

    NQ1: {
      vol: 0.0013,
      spread: 1,
      session: "New York",
      venue: "Futures · CME",
    },
    ES1: {
      vol: 0.0008,
      spread: 1,
      session: "New York",
      venue: "Futures · CME",
    },
    CL1: {
      vol: 0.0017,
      spread: 2,
      session: "New York",
      venue: "Futures · NYMEX",
    },
    GC1: {
      vol: 0.0009,
      spread: 2,
      session: "New York",
      venue: "Futures · COMEX",
    },
  };

  const MARKET_DEFAULTS = {
    Forex: { vol: 0.0006, spread: 2, session: "London", venue: "FX · broker" },
    Commodities: {
      vol: 0.0012,
      spread: 3,
      session: "London / NY",
      venue: "Commodities · broker",
    },
    Crypto: {
      vol: 0.0026,
      spread: 12,
      session: "24h",
      venue: "Crypto · exchange",
    },
    Indices: {
      vol: 0.001,
      spread: 3,
      session: "New York",
      venue: "Index · CFD",
    },
    Futures: {
      vol: 0.0011,
      spread: 1,
      session: "New York",
      venue: "Futures · exchange",
    },
  };

  /* A futures symbol carries a `!`, which is not a valid object key in the
     table above without quoting, so strip it on lookup. */
  const metaKey = (symbol) => String(symbol || "").replace(/!/g, "");

  /* ---------------------------------------------------------- symbol view

     What a chart needs to draw and label a symbol. Everything that touches
     money is read straight off the instrument so there is no second copy to
     drift: `pip`, `contract` and `unitValue` are never redefined here.

     `unit` and `step` are how size is spoken about per market — lots on FX
     and metals, coins on crypto, contracts on an index — and `tickName` is
     what the measuring tool writes after a number. */

  function symbol(sym) {
    const inst = I.find(sym);
    if (!inst) return null;
    const d = MARKET_DEFAULTS[inst.market] || MARKET_DEFAULTS.Forex;
    const m = Object.assign({}, d, META[metaKey(sym)] || {});

    const crypto = inst.market === "Crypto";
    const lots = inst.contract > 1;
    const unit = crypto ? inst.base : lots ? "lots" : "contracts";
    const step = crypto ? 0.001 : lots ? 0.01 : 0.1;
    const tickName =
      inst.market === "Forex" || inst.market === "Commodities" ? "pips" : "pts";

    return {
      symbol: inst.symbol,
      name: inst.name,
      market: inst.market,
      cls: inst.market,
      base: inst.base,
      quote: inst.quote,
      px: inst.price,
      digits: inst.dp,
      tick: inst.pip,
      tickName,
      contract: inst.contract,
      unitValue: inst.unitValue,
      unit,
      step,
      vol: m.vol,
      spread: m.spread,
      costTicks: m.spread,
      session: m.session,
      venue: m.venue,
      instrument: inst,
    };
  }

  function list() {
    return I.INSTRUMENTS.map((i) => symbol(i.symbol)).filter(Boolean);
  }

  /* ---------------------------------------------------------- real-data helpers */

  function last(sym) {
    const d = history(sym, "15m");
    return d.length ? d[d.length - 1].c : (isLive(sym) ? liveQuotes[String(sym).toUpperCase()].price : null);
  }

  function quote(sym) {
    const S = symbol(sym);
    if (!S) return null;
    const d = history(sym, "15m");
    const qlive = liveQuotes[String(sym).toUpperCase()];
    const price = isLive(sym) ? qlive.price : (d.length ? d[d.length - 1].c : null);
    if (price == null) return null;
    let open = d.length ? d[d.length - 1].o : price;
    const day = d.length ? new Date(d[d.length - 1].t).getUTCDate() : new Date().getUTCDate();
    for (let i = d.length - 1; i >= 0; i--) {
      if (new Date(d[i].t).getUTCDate() !== day) break;
      open = d[i].o;
    }
    const chg = price - open;
    return {
      symbol: S.symbol, name: S.name, market: S.market, price, digits: S.digits,
      open, chg, chgPct: open ? (chg / open) * 100 : 0, spread: S.spread,
      session: S.session, live: isLive(sym), bid: qlive && qlive.bid, ask: qlive && qlive.ask,
    };
  }

  function spark(sym, n) {
    const d = history(sym, "15m");
    return d.slice(-(n || 48)).map((b) => b.c);
  }

  function applyLiveCandle(sym, iv, candle) {
    const key = String(sym).toUpperCase() + "|" + iv;
    const b = {
      t: Number(candle.t) * 1000, o: Number(candle.o), h: Number(candle.h),
      l: Number(candle.l), c: Number(candle.c), v: Number(candle.v || 0),
    };
    if (![b.t,b.o,b.h,b.l,b.c].every(Number.isFinite)) return;
    const d = cache[key] || (cache[key] = []);
    const lastBar = d[d.length - 1];
    if (!lastBar || b.t > lastBar.t) d.push(b);
    else if (b.t === lastBar.t) d[d.length - 1] = b;
    else return;
    if (d.length > BARS) d.splice(0, d.length - BARS);
    notify();
  }

  function subscribeLive(sym, iv) {
    if (!("EventSource" in window)) return null;
    const source = new EventSource(LIVE_API + "/api/stream/" + encodeURIComponent(String(sym).toUpperCase()) + "/" + encodeURIComponent(iv));
    source.addEventListener("candle", (event) => {
      try { applyLiveCandle(sym, iv, JSON.parse(event.data)); } catch (e) {}
    });
    source.onerror = () => { /* EventSource automatically reconnects. */ };
    return source;
  }

  const liveStreams = new Map();
  const STREAM_INTERVALS = new Set([
    "1s", "5s", "15s", "30s", "45s", "1m", "2m", "3m", "5m",
    "10m", "15m", "30m", "45m", "1H", "2H", "3H", "4H", "6H",
    "8H", "12H", "1D", "3D", "1W", "2W",
  ]);
  function ensureLiveStream(sym, iv) {
    if (!STREAM_INTERVALS.has(iv)) return;
    const key = String(sym).toUpperCase() + "|" + iv;
    if (!liveStreams.has(key)) {
      const stream = subscribeLive(sym, iv);
      if (stream) liveStreams.set(key, stream);
    }
  }

  function notify() {
    subs.forEach((fn) => {
      try { fn(); } catch (e) {}
    });
  }

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  /* ---------------------------------------------------------- badge */

  function badge(opts) {
    const o = opts || {};
    const live = o.symbol ? isLive(o.symbol) : Object.keys(liveQuotes).length > 0;
    return (
      '<span class="feed-badge' + (live ? ' live' : '') + (o.compact ? ' compact' : '') +
      '" title="' + (live ? DEMO_NOTE : 'Waiting for Dukascopy data. No synthetic fallback is used.') + '">' +
      '<i aria-hidden="true"></i>' + (live ? 'Live · Dukascopy' : 'Dukascopy · connecting') +
      '</span>'
    );
  }

  pollLive();
  setInterval(pollLive, 5000);

  return {
    DEMO, DEMO_NOTE, LIVE_API, isLive, INTERVALS, IV_MS, IV_GROUPS, IV_DEFAULT_FAVS, BARS,
    symbol, list, history, loadHistory, last, quote, spark, subscribe, ensureLiveStream, badge,
    pause() { running = false; },
    resume() { running = true; },
    isRunning: () => running,
  };

})();
