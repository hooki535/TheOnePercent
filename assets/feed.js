/* TheOnePercent — feed
   -------------------------------------------------------------------
   Every price on the site comes from here. Nothing else generates a
   quote, a candle or a sparkline, which is the whole reason the module
   exists: the roadmap asked for one feed with a visible demo badge, and
   the alternative — each screen seeding its own numbers — is how the
   charts screen ends up quoting 157.18 while the calculator quotes
   157.42 for the same pair on the same afternoon.

   The data is synthetic. It is deterministic, not random: the same
   symbol and interval always produce the same candles, so a level you
   drew on Tuesday is still there on Thursday and a screenshot in the
   journal still matches the chart it came from. Seeding off the symbol
   name rather than the clock is what buys that.

   The series is also anchored: the last close is pulled to the price in
   `instruments.js`, so the candles agree with the number the sizing
   maths uses. Instruments owns price, pip, contract and unitValue.
   This module owns only the things a chart needs and money does not —
   how violently a symbol moves, what it costs to cross the spread, and
   which session it belongs to.

   When a real feed arrives, `history`, `quote` and `subscribe` are the
   three functions that change. Everything above them keeps working.
   ------------------------------------------------------------------- */

window.Feed = (() => {
  "use strict";

  const I = window.Instruments;

  /* Every screen that shows a price renders the badge — see `Feed.badge()`.
     The Flask build can replace a cached demo series with verified candles. */
  const DEMO = true;
  const LIVE_API = "";
  const LIVE_MAX_AGE_MS = 30000;
  const liveQuotes = {};
  const realKeys = new Set();
  const DEMO_NOTE =
    "Real Dukascopy market data when the Flask API is available. No orders are placed; otherwise the chart uses clearly labeled demo data.";

  /* The full ladder, grouped the way the interval menu groups it. A chart
     can ask for any of these; `build()` is generic in milliseconds. Ticks
     are deliberately absent — a tick is not a time interval and this
     generator has no order flow to aggregate, so offering "1 tick" would
     be offering something the data cannot honestly supply. */
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

  /* ---------------------------------------------------------- generator */

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const cache = {};
  const loading = new Set();

  function notify() {
    subs.forEach((fn) => {
      try { fn(); } catch (e) { /* one view must not stop the feed */ }
    });
  }

  function toBars(rows) {
    return (rows || []).map((b) => ({
      t: Number(b.t) * 1000,
      o: Number(b.o), h: Number(b.h), l: Number(b.l), c: Number(b.c),
      v: Number(b.v || 0),
    })).filter((b) => [b.t, b.o, b.h, b.l, b.c].every(Number.isFinite));
  }

  function loadHistory(sym, iv) {
    const key = String(sym).toUpperCase() + "|" + iv;
    if (loading.has(key) || !window.fetch) return;
    loading.add(key);
    fetch(LIVE_API + "/api/candles/" + encodeURIComponent(String(sym).toUpperCase()) + "/" + encodeURIComponent(iv) + "?limit=" + BARS, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("candle API returned " + res.status);
        return res.json();
      })
      .then((body) => {
        const bars = toBars(body.candles);
        if (!bars.length) throw new Error("candle API returned no candles");
        cache[key] = bars;
        realKeys.add(key);
        notify();
      })
      .catch(() => {
        /* The deterministic series remains visible and is labeled below. */
      })
      .finally(() => loading.delete(key));
  }

  /* Bars are built backwards from a fixed anchor and then scaled so the
     final close lands on the instrument price. The scale is skipped if it
     would distort the series by more than a third, because a chart that
     has been squeezed that hard is no longer showing its own structure. */
  function build(sym, iv) {
    const S = symbol(sym);
    if (!S || !IV_MS[iv]) return [];

    const r = rng(hash(sym + iv));
    const ms = IV_MS[iv];

    /* Per-bar volatility has to scale with the bar, or a one-second candle
       swings as far as a weekly one — which is what this generator used to
       do, since `S.vol` was applied identically at every interval. Price
       moves as the square root of time, so that is the scaling.

       It is clamped, and the clamp is a compromise worth naming. Unclamped,
       sqrt(1 month / 15 min) is about 46x, and a 620-bar walk at that
       volatility wanders so far that the final-close correction below
       refuses to apply (the 0.35 guard) and the chart stops agreeing with
       the price the sizing maths uses. Consistency between screens matters
       more than a perfectly scaled monthly candle.

       The 10x ceiling is measured rather than guessed: it keeps the tilt the
       anchoring step has to apply small enough to stay invisible, while
       higher ceilings start bending the series.

       The floor is per symbol, not a constant. A flat 0.08 left thirteen
       series — USDCHF, AUDUSD, DXY and the other quiet ones — with an
       average one-second range below half a tick, so every candle collapsed
       to a line. The floor therefore asks for roughly two ticks of range
       whatever the symbol's own volatility is, which is what keeps a
       one-second candle drawable on a pair that barely moves. */
    const tickFloor = (2 * S.tick) / (S.px * S.vol);
    const volK = Math.min(10, Math.max(tickFloor, Math.sqrt(ms / IV_BASE)));
    const vol = S.vol * volK;

    const out = [];
    let px = S.px * (1 - vol * 6);
    let t = Date.now() - BARS * ms;
    let drift = (r() - 0.42) * vol * 0.32;
    let trend = 0;

    for (let i = 0; i < BARS; i++) {
      if (i % 37 === 0) drift = (r() - 0.45) * vol * 0.5;
      trend = trend * 0.86 + (r() - 0.5) * vol * 0.9;
      const o = px;
      const mv = (drift + trend) * px;
      const sd = vol * px * (0.55 + r() * 0.9);
      const c = o + mv + (r() - 0.5) * sd;
      const h = Math.max(o, c) + r() * sd * 0.72;
      const l = Math.min(o, c) - r() * sd * 0.72;
      const body = Math.abs(c - o) / (sd || 1);
      out.push({
        t: t + i * ms,
        o,
        h,
        l,
        c,
        v: Math.round((0.45 + body * 0.9 + r() * 0.7) * 1000),
      });
      px = c;
    }

    /* Land the last close exactly on the instrument price.

       This used to be a flat multiply guarded by `if (Math.abs(adj - 1) <
       0.35)`, which meant that whenever the walk had wandered further than
       a third the correction was skipped silently and the chart quoted a
       price the rest of the site disagreed with. Measuring it across the
       ladder found gold's daily chart 50% below the sizing price and
       Bitcoin's monthly 620% above it — a guard that fails quietly is worse
       than no guard, because nothing on screen says the number is wrong.

       Instead the whole path is tilted: bar i is scaled by exp(k·i) where k
       is the per-bar log gap between where the walk ended and where it must
       end. The tilt is spread across every bar rather than concentrated, so
       relative bar ranges survive, prices stay positive, and the last close
       is exact for every symbol and interval with no guard and nothing to
       skip. The cost is a small added drift, which on a synthetic series is
       indistinguishable from the drift already in it. */
    const k = Math.log(S.px / out[BARS - 1].c) / (BARS - 1);
    if (isFinite(k) && k !== 0) {
      out.forEach((b, i) => {
        const f = Math.exp(k * i);
        b.o *= f;
        b.h *= f;
        b.l *= f;
        b.c *= f;
      });
    }
    /* Floating point leaves the last close a hair off after the tilt, and
       "a hair" is still a disagreement when two screens print the number. */
    const last = out[BARS - 1];
    const fix = S.px / last.c;
    last.o *= fix;
    last.h *= fix;
    last.l *= fix;
    last.c = S.px;
    return out;
  }

  function history(sym, iv) {
    const key = String(sym).toUpperCase() + "|" + iv;
    if (!cache[key]) cache[key] = build(sym, iv);
    loadHistory(sym, iv);
    return cache[key];
  }

  function last(sym) {
    const d = history(sym, "15m");
    return d.length ? d[d.length - 1].c : null;
  }

  /* Change against the session open — the first bar of the current day on
     the 15m series — which is the number a watchlist means by "% today". */
  function quote(sym) {
    const S = symbol(sym);
    if (!S) return null;
    const d = history(sym, "15m");
    if (!d.length) return null;
    const price = d[d.length - 1].c;
    const day = new Date(d[d.length - 1].t).getUTCDate();
    let open = d[0].c;
    for (let i = d.length - 1; i >= 0; i--) {
      if (new Date(d[i].t).getUTCDate() !== day) break;
      open = d[i].o;
    }
    const chg = price - open;
    return {
      symbol: S.symbol,
      name: S.name,
      market: S.market,
      price,
      digits: S.digits,
      open,
      chg,
      chgPct: open ? (chg / open) * 100 : 0,
      spread: S.spread,
      session: S.session,
    };
  }

  /* Closes for a sparkline. Reads the 15m series so the line and the
     percentage in a watchlist row describe the same window. */
  function spark(sym, n) {
    const d = history(sym, "15m");
    return d.slice(-(n || 48)).map((b) => b.c);
  }

  /* ---------------------------------------------------------- live ticks

     Only the forming bar moves. History is immutable, which is what makes a
     drawing stay where it was put. Subscribers are called after each tick;
     the returned function unsubscribes, and the timer stops itself when the
     last subscriber leaves so a backgrounded tab is not burning a frame a
     second forever. */

  const subs = new Set();
  let timer = null;
  let running = true;

  function tick() {
    if (!running) return;
    Object.keys(cache).forEach((key) => {
      if (realKeys.has(key)) return;
      const d = cache[key];
      if (!d || !d.length) return;
      const sym = key.replace(/(1m|5m|15m|1H|4H|1D|1W)$/, "");
      const S = symbol(sym);
      if (!S) return;
      const b = d[d.length - 1];
      const step = (Math.random() - 0.5) * S.vol * b.c * 0.55;
      b.c = Math.max(S.tick, b.c + step);
      b.h = Math.max(b.h, b.c);
      b.l = Math.min(b.l, b.c);
      b.v += Math.round(Math.random() * 40);
    });
    notify();
  }

  function subscribe(fn) {
    subs.add(fn);
    if (!timer) timer = setInterval(tick, 1000);
    return () => {
      subs.delete(fn);
      if (!subs.size && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }

  /* ---------------------------------------------------------- badge

     One markup string so the badge reads identically everywhere it appears
     and the note is always attached to it rather than buried in a tooltip
     nobody opens. */
  function badge(opts) {
    const o = opts || {};
    const live = o.symbol ? isLive(o.symbol) : Object.keys(liveQuotes).length > 0;
    return '<span class="feed-badge' + (live ? ' live' : '') + (o.compact ? ' compact' : '') +
      '" title="' + (live ? DEMO_NOTE : 'Demo fallback data. Connect the Flask app for real Dukascopy candles.') + '">' +
      '<i aria-hidden="true"></i>' + (live ? 'Live · Dukascopy' : 'Demo fallback') + '</span>';
  }

  function isLive(sym) {
    const q = liveQuotes[String(sym || "").toUpperCase()];
    return !!(q && !q.error && Number.isFinite(q.price) &&
      Date.now() - Date.parse(q.time) < LIVE_MAX_AGE_MS);
  }

  function pollLive() {
    if (!window.fetch) return;
    fetch(LIVE_API + "/api/quotes", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : {})
      .then((quotes) => {
        Object.keys(quotes || {}).forEach((key) => { liveQuotes[key] = quotes[key]; });
        notify();
      })
      .catch(() => {});
  }
  pollLive();
  setInterval(pollLive, 5000);

  return {
    DEMO,
    LIVE_API,
    isLive,
    DEMO_NOTE,
    INTERVALS,
    IV_MS,
    IV_GROUPS,
    IV_DEFAULT_FAVS,
    BARS,
    symbol,
    list,
    history,
    loadHistory,
    last,
    quote,
    spark,
    subscribe,
    badge,
    pause() {
      running = false;
    },
    resume() {
      running = true;
    },
    isLive: () => running,
  };
})();
