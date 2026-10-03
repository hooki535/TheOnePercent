/* ══════════════════════════════════════════════════════════════════
   TheOnePercent · Charts — engine
   Data, indicator library, drawing objects, canvas chart.
   Market data comes from Feed (Dukascopy via Flask). Read-only: no order is ever placed.
   ══════════════════════════════════════════════════════════════════ */

/* TheOnePercent — charts engine
   -------------------------------------------------------------------
   Data adapters, the indicator library, drawing objects and the canvas
   chart itself. Read-only: the chart never places an order.

   This file deliberately owns no prices and no symbol table. It reads
   both from `Feed`, which in turn reads pip size, contract size and the
   unit multiplier from `Instruments`. That indirection is the point —
   an earlier version of this screen kept its own symbol table and it
   disagreed with the calculators about what a yen pip was worth, which
   is exactly the bug the shared modules exist to prevent.

   Kept as hand-written canvas rather than a charting library. The
   position tool, bar replay, the volume profile and the drawing layer
   all need to read and write the same pixel space as the candles, and
   every library boundary crossed to achieve that costs more than the
   drawing code it saves. Recorded in docs/PHASE-1.md §1.3.
   ------------------------------------------------------------------- */

/* ── symbols ─────────────────────────────────────────────────── */

/* Shaped for the drawing and readout code below, but every field is
   derived — `Feed.symbol()` is the only place it comes from. Built once
   at load because the instrument table is static within a session. */
const SYMBOLS = (() => {
  const out = {};
  (window.Feed ? Feed.list() : []).forEach((s) => {
    out[s.symbol] = s;
  });
  return out;
})();

const INTERVALS = window.Feed
  ? Feed.INTERVALS
  : ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
const IV_MS = window.Feed
  ? Feed.IV_MS
  : {
      "1m": 6e4,
      "5m": 3e5,
      "15m": 9e5,
      "1H": 36e5,
      "4H": 144e5,
      "1D": 864e5,
      "1W": 6048e5,
    };

const TYPES = [
  ["candle", "Candles", "default"],
  ["hollow", "Hollow candles", ""],
  ["bar", "OHLC bars", ""],
  ["line", "Line", ""],
  ["area", "Area", ""],
  ["step", "Step line", ""],
  ["heikin", "Heikin Ashi", ""],
  ["baseline", "Baseline", "vs. session open"],
];

/* ── Lightweight Charts (candles/bars only, for now) ────────────
   Maps a chart `type` to the series-definition export Lightweight
   Charts v5 expects in chart.addSeries(def, options). Only OHLC types
   with a direct LWC equivalent are listed: line/area/baseline/step and
   heikin-ashi's own recoloring keep using the hand-drawn renderer, as
   do hollow candles (no native LWC style for the hollow-on-up-day
   look) and the log/percent/inverted scale modes (see lwcSupported()
   on the Chart class) — none of those can be made to land on the exact
   same pixels as the rest of the drawing layer without more surface
   area than this pass covers. */
const LWC_KIND = {
  candle: "CandlestickSeries",
  bar: "BarSeries",
};

/* ── deterministic series ────────────────────────────────────── */

/* Both of these stay because the drawing code seeds a few visual
   details off a symbol name. Candles themselves come from the feed. */
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

const getSeries = (sym, iv) => Feed.history(sym, iv);

/* ── maths ───────────────────────────────────────────────────── */
const src = (d, s) =>
  d.map((b) =>
    s === "open"
      ? b.o
      : s === "high"
        ? b.h
        : s === "low"
          ? b.l
          : s === "hl2"
            ? (b.h + b.l) / 2
            : s === "hlc3"
              ? (b.h + b.l + b.c) / 3
              : b.c,
  );
const ema = (a, p) => {
  const k = 2 / (p + 1),
    o = [];
  let e = null;
  a.forEach((v, i) => {
    e = i ? v * k + e * (1 - k) : v;
    o.push(i < p - 1 ? null : e);
  });
  return o;
};
const sma = (a, p) => {
  const o = [];
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i];
    if (i >= p) s -= a[i - p];
    o.push(i >= p - 1 ? s / p : null);
  }
  return o;
};
const wma = (a, p) => {
  const o = [],
    den = (p * (p + 1)) / 2;
  for (let i = 0; i < a.length; i++) {
    if (i < p - 1) {
      o.push(null);
      continue;
    }
    let s = 0;
    for (let k = 0; k < p; k++) s += a[i - k] * (p - k);
    o.push(s / den);
  }
  return o;
};
const stdev = (a, p) => {
  const m = sma(a, p),
    o = [];
  for (let i = 0; i < a.length; i++) {
    if (m[i] == null) {
      o.push(null);
      continue;
    }
    let s = 0;
    for (let k = 0; k < p; k++) s += (a[i - k] - m[i]) ** 2;
    o.push(Math.sqrt(s / p));
  }
  return o;
};
function trueRange(d) {
  return d.map((b, i) =>
    i
      ? Math.max(
          b.h - b.l,
          Math.abs(b.h - d[i - 1].c),
          Math.abs(b.l - d[i - 1].c),
        )
      : b.h - b.l,
  );
}
function atr(d, p = 14) {
  const tr = trueRange(d),
    o = [];
  let a = null;
  tr.forEach((v, i) => {
    a = i ? (a * (p - 1) + v) / p : v;
    o.push(i < p - 1 ? null : a);
  });
  return o;
}
function rsi(cl, p = 14) {
  const o = Array(cl.length).fill(null);
  let g = 0,
    l = 0;
  for (let i = 1; i < cl.length; i++) {
    const d = cl[i] - cl[i - 1],
      G = Math.max(d, 0),
      L = Math.max(-d, 0);
    if (i <= p) {
      g += G / p;
      l += L / p;
      if (i === p) o[i] = 100 - 100 / (1 + g / (l || 1e-9));
    } else {
      g = (g * (p - 1) + G) / p;
      l = (l * (p - 1) + L) / p;
      o[i] = 100 - 100 / (1 + g / (l || 1e-9));
    }
  }
  return o;
}
function heikin(d) {
  const ha = [];
  d.forEach((b, i) => {
    const o = i ? (ha[i - 1].o + ha[i - 1].c) / 2 : (b.o + b.c) / 2,
      c = (b.o + b.h + b.l + b.c) / 4;
    ha.push({ ...b, o, c, h: Math.max(b.h, o, c), l: Math.min(b.l, o, c) });
  });
  return ha;
}
function stoch(d, p = 14, k = 3, ds = 3) {
  const raw = d.map((b, i) => {
    if (i < p - 1) return null;
    let hh = -Infinity,
      ll = Infinity;
    for (let j = i - p + 1; j <= i; j++) {
      hh = Math.max(hh, d[j].h);
      ll = Math.min(ll, d[j].l);
    }
    return hh === ll ? 50 : ((b.c - ll) / (hh - ll)) * 100;
  });
  const smooth = (a, n) => {
    const o = [];
    for (let i = 0; i < a.length; i++) {
      const w = a.slice(Math.max(0, i - n + 1), i + 1).filter((v) => v != null);
      o.push(w.length < n ? null : w.reduce((x, y) => x + y) / n);
    }
    return o;
  };
  const K = smooth(raw, k);
  return { k: K, d: smooth(K, ds) };
}
function adx(d, p = 14) {
  const tr = trueRange(d),
    pdm = [],
    ndm = [];
  d.forEach((b, i) => {
    if (!i) {
      pdm.push(0);
      ndm.push(0);
      return;
    }
    const up = b.h - d[i - 1].h,
      dn = d[i - 1].l - b.l;
    pdm.push(up > dn && up > 0 ? up : 0);
    ndm.push(dn > up && dn > 0 ? dn : 0);
  });
  const sm = (a) => {
    const o = [];
    let s = null;
    a.forEach((v, i) => {
      s = i ? (s * (p - 1) + v) / p : v;
      o.push(s);
    });
    return o;
  };
  const st = sm(tr),
    sp = sm(pdm),
    sn = sm(ndm),
    pdi = [],
    ndi = [],
    dx = [];
  for (let i = 0; i < d.length; i++) {
    const P = st[i] ? (100 * sp[i]) / st[i] : 0,
      N = st[i] ? (100 * sn[i]) / st[i] : 0;
    pdi.push(i < p ? null : P);
    ndi.push(i < p ? null : N);
    dx.push(i < p ? null : P + N ? (100 * Math.abs(P - N)) / (P + N) : 0);
  }
  const out = [];
  let a = null,
    c = 0;
  dx.forEach((v, i) => {
    if (v == null) {
      out.push(null);
      return;
    }
    c++;
    a = c === 1 ? v : (a * (p - 1) + v) / p;
    out.push(c < p ? null : a);
  });
  return { adx: out, pdi, ndi };
}
function obv(d) {
  let s = 0;
  return d.map((b, i) => {
    if (i) s += b.c > d[i - 1].c ? b.v : b.c < d[i - 1].c ? -b.v : 0;
    return s;
  });
}
function cvd(d) {
  let s = 0;
  return d.map((b) => {
    const rg = b.h - b.l || 1;
    s += b.v * ((b.c - b.o) / rg);
    return s;
  });
}
function sessionVWAP(d, iv) {
  const per = Math.max(6, Math.round(864e5 / IV_MS[iv]));
  let pv = 0,
    vv = 0;
  const mid = [],
    up = [],
    dn = [],
    sq = [];
  d.forEach((b, i) => {
    if (i % per === 0) {
      pv = 0;
      vv = 0;
      sq.length = 0;
    }
    const tp = (b.h + b.l + b.c) / 3;
    pv += tp * b.v;
    vv += b.v;
    sq.push({ tp, v: b.v });
    const m = pv / vv;
    const varr = sq.reduce((a, x) => a + x.v * (x.tp - m) ** 2, 0) / vv;
    const sd = Math.sqrt(varr);
    mid.push(m);
    up.push(m + sd);
    dn.push(m - sd);
  });
  return { mid, up, dn };
}
function supertrend(d, p = 10, mult = 3) {
  const a = atr(d, p),
    dir = [],
    line = [];
  let prevU = null,
    prevL = null,
    prevDir = 1;
  d.forEach((b, i) => {
    if (a[i] == null) {
      dir.push(null);
      line.push(null);
      return;
    }
    const hl = (b.h + b.l) / 2,
      u = hl + mult * a[i],
      l = hl - mult * a[i];
    const up = prevU == null ? u : b.c > prevU ? Math.min(u, prevU) : u;
    const lo = prevL == null ? l : b.c < prevL ? Math.max(l, prevL) : l;
    const dr =
      b.c > (prevDir === 1 ? (prevU ?? u) : (prevU ?? u))
        ? 1
        : b.c < (prevL ?? l)
          ? -1
          : prevDir;
    prevU = up;
    prevL = lo;
    prevDir = dr;
    dir.push(dr);
    line.push(dr === 1 ? lo : up);
  });
  return { line, dir };
}

/* ── indicator library ───────────────────────────────────────── */
/* Each study: where 'price' overlays the candles, 'sub' gets its own pane. */
const STUDIES = {
  ema: {
    name: "EMA",
    fam: "overlay",
    where: "price",
    desc: "Exponential moving average on price.",
    params: { length: 21, source: "close" },
    color: "--i1",
    calc(d, p) {
      return {
        lines: [
          { name: `EMA ${p.length}`, data: ema(src(d, p.source), p.length) },
        ],
      };
    },
  },
  sma: {
    name: "SMA",
    fam: "overlay",
    where: "price",
    desc: "Simple moving average.",
    params: { length: 50, source: "close" },
    color: "--i2",
    calc(d, p) {
      return {
        lines: [
          { name: `SMA ${p.length}`, data: sma(src(d, p.source), p.length) },
        ],
      };
    },
  },
  wma: {
    name: "WMA",
    fam: "overlay",
    where: "price",
    desc: "Weighted moving average, front-loaded.",
    params: { length: 20, source: "close" },
    color: "--i3",
    calc(d, p) {
      return {
        lines: [
          { name: `WMA ${p.length}`, data: wma(src(d, p.source), p.length) },
        ],
      };
    },
  },
  bb: {
    name: "Bollinger Bands",
    fam: "vlty",
    where: "price",
    desc: "Mean and N standard deviations.",
    params: { length: 20, mult: 2 },
    color: "--i4",
    calc(d, p) {
      const cl = src(d, "close"),
        m = sma(cl, p.length),
        s = stdev(cl, p.length);
      return {
        lines: [
          { name: "Basis", data: m, dash: [4, 3] },
          {
            name: "Upper",
            data: m.map((v, i) => (v == null ? null : v + p.mult * s[i])),
          },
          {
            name: "Lower",
            data: m.map((v, i) => (v == null ? null : v - p.mult * s[i])),
          },
        ],
        fill: [1, 2],
      };
    },
  },
  kc: {
    name: "Keltner Channel",
    fam: "vlty",
    where: "price",
    desc: "EMA with ATR envelopes.",
    params: { length: 20, mult: 2 },
    color: "--i5",
    calc(d, p) {
      const m = ema(src(d, "close"), p.length),
        a = atr(d, p.length);
      return {
        lines: [
          { name: "Basis", data: m, dash: [4, 3] },
          {
            name: "Upper",
            data: m.map((v, i) =>
              v == null || a[i] == null ? null : v + p.mult * a[i],
            ),
          },
          {
            name: "Lower",
            data: m.map((v, i) =>
              v == null || a[i] == null ? null : v - p.mult * a[i],
            ),
          },
        ],
        fill: [1, 2],
      };
    },
  },
  donchian: {
    name: "Donchian Channel",
    fam: "trend",
    where: "price",
    desc: "Highest high and lowest low of N bars.",
    params: { length: 20 },
    color: "--i2",
    calc(d, p) {
      const hi = [],
        lo = [],
        mid = [];
      d.forEach((b, i) => {
        if (i < p.length - 1) {
          hi.push(null);
          lo.push(null);
          mid.push(null);
          return;
        }
        let H = -Infinity,
          L = Infinity;
        for (let j = i - p.length + 1; j <= i; j++) {
          H = Math.max(H, d[j].h);
          L = Math.min(L, d[j].l);
        }
        hi.push(H);
        lo.push(L);
        mid.push((H + L) / 2);
      });
      return {
        lines: [
          { name: "Upper", data: hi },
          { name: "Lower", data: lo },
          { name: "Mid", data: mid, dash: [3, 3] },
        ],
        fill: [0, 1],
      };
    },
  },
  vwap: {
    name: "Session VWAP",
    fam: "overlay",
    where: "price",
    desc: "Anchored to the session open, with one standard deviation.",
    params: { bands: 1 },
    color: "--i3",
    calc(d, p, cx) {
      const v = sessionVWAP(d, cx.iv);
      const lines = [{ name: "VWAP", data: v.mid, dash: [5, 3] }];
      if (p.bands)
        lines.push(
          { name: "+1σ", data: v.up, dash: [2, 4] },
          { name: "−1σ", data: v.dn, dash: [2, 4] },
        );
      return { lines };
    },
  },
  st: {
    name: "Supertrend",
    fam: "trend",
    where: "price",
    desc: "ATR trailing stop that flips with trend.",
    params: { length: 10, mult: 3 },
    color: "--up",
    calc(d, p) {
      const s = supertrend(d, p.length, p.mult);
      return {
        lines: [
          { name: "Supertrend", data: s.line, width: 1.8, colorBy: s.dir },
        ],
      };
    },
  },
  /* Ichimoku is one study that draws five lines and a filled cloud, and the
     cloud is the point: it is plotted 26 bars ahead of the last candle, which
     is the only thing on this chart that is allowed to extend past price. The
     forward shift is handled by padding the arrays, so the renderer needs to
     know nothing about it. */
  ichi: {
    name: "Ichimoku Cloud",
    fam: "trend",
    where: "price",
    desc: "Conversion and base lines, the lagging span, and a cloud projected ahead of price.",
    params: { conv: 9, base: 26, span: 52, shift: 26 },
    color: "--i2",
    calc(d, p) {
      const mid = (n) =>
        d.map((b, i) => {
          if (i < n - 1) return null;
          let hi = -Infinity,
            lo = Infinity;
          for (let k = 0; k < n; k++) {
            hi = Math.max(hi, d[i - k].h);
            lo = Math.min(lo, d[i - k].l);
          }
          return (hi + lo) / 2;
        });
      const tenkan = mid(p.conv),
        kijun = mid(p.base),
        senkouB0 = mid(p.span);
      const senkouA0 = tenkan.map((v, i) =>
        v == null || kijun[i] == null ? null : (v + kijun[i]) / 2,
      );
      /* Forward: pad the front with nulls so index i holds the value that
         belongs `shift` bars later. Backward, for the lagging span: drop the
         front and pad the tail. */
      const fwd = (a) =>
        new Array(p.shift).fill(null).concat(a).slice(0, d.length);
      const back = (a) =>
        a.slice(p.shift).concat(new Array(p.shift).fill(null));
      return {
        lines: [
          { name: `Conversion ${p.conv}`, data: tenkan, color: "--i1" },
          { name: `Base ${p.base}`, data: kijun, color: "--i4" },
          { name: "Leading A", data: fwd(senkouA0), color: "--up", dash: [1, 0] },
          { name: "Leading B", data: fwd(senkouB0), color: "--dn", dash: [1, 0] },
          {
            name: "Lagging",
            data: back(src(d, "close")),
            color: "--i5",
            dash: [4, 3],
          },
        ],
        fill: [2, 3],
      };
    },
  },
  psar: {
    name: "Parabolic SAR",
    fam: "trend",
    where: "price",
    desc: "Accelerating trailing stop — dots flip to the other side when trend turns.",
    params: { step: 0.02, max: 0.2 },
    color: "--i5",
    calc(d, p) {
      const out = new Array(d.length).fill(null),
        dir = new Array(d.length).fill(1);
      if (d.length < 3) return { lines: [{ name: "SAR", data: out }] };
      let up = d[1].c >= d[0].c,
        sar = up ? d[0].l : d[0].h,
        ep = up ? d[0].h : d[0].l,
        af = p.step;
      for (let i = 1; i < d.length; i++) {
        sar = sar + af * (ep - sar);
        const b = d[i];
        if (up) {
          sar = Math.min(sar, d[i - 1].l, d[Math.max(0, i - 2)].l);
          if (b.l < sar) {
            up = false;
            sar = ep;
            ep = b.l;
            af = p.step;
          } else if (b.h > ep) {
            ep = b.h;
            af = Math.min(p.max, af + p.step);
          }
        } else {
          sar = Math.max(sar, d[i - 1].h, d[Math.max(0, i - 2)].h);
          if (b.h > sar) {
            up = true;
            sar = ep;
            ep = b.h;
            af = p.step;
          } else if (b.l < ep) {
            ep = b.l;
            af = Math.min(p.max, af + p.step);
          }
        }
        out[i] = sar;
        dir[i] = up ? 1 : -1;
      }
      return {
        lines: [{ name: "SAR", data: out, dots: true, colorBy: dir }],
      };
    },
  },
  pivots: {
    name: "Pivot points",
    fam: "overlay",
    where: "price",
    desc: "Classic floor-trader pivot with two supports and two resistances, from the previous session.",
    params: { lookback: 24 },
    color: "--i3",
    calc(d, p) {
      const n = Math.max(2, Math.round(p.lookback));
      const P = [],
        R1 = [],
        R2 = [],
        S1 = [],
        S2 = [];
      for (let i = 0; i < d.length; i++) {
        if (i < n) {
          P.push(null);
          R1.push(null);
          R2.push(null);
          S1.push(null);
          S2.push(null);
          continue;
        }
        /* The session is the previous block of `lookback` bars, so the levels
           step rather than drift — which is how a pivot is actually traded. */
        const start = Math.floor(i / n) * n - n;
        let hi = -Infinity,
          lo = Infinity;
        for (let k = start; k < start + n; k++) {
          hi = Math.max(hi, d[k].h);
          lo = Math.min(lo, d[k].l);
        }
        const cl = d[start + n - 1].c,
          pp = (hi + lo + cl) / 3;
        P.push(pp);
        R1.push(2 * pp - lo);
        S1.push(2 * pp - hi);
        R2.push(pp + (hi - lo));
        S2.push(pp - (hi - lo));
      }
      return {
        lines: [
          { name: "P", data: P, width: 1.6, color: "--i3" },
          { name: "R1", data: R1, dash: [4, 3], color: "--dn" },
          { name: "R2", data: R2, dash: [2, 4], color: "--dn" },
          { name: "S1", data: S1, dash: [4, 3], color: "--up" },
          { name: "S2", data: S2, dash: [2, 4], color: "--up" },
        ],
      };
    },
  },
  atrstop: {
    name: "ATR stop distance",
    fam: "vlty",
    where: "price",
    desc: "Shaded stop suggestion around price — 14-bar ATR × multiple.",
    params: { length: 14, mult: 1.5 },
    color: "--warn",
    calc(d, p) {
      const a = atr(d, p.length);
      return {
        lines: [
          {
            name: "Upper",
            data: d.map((b, i) => (a[i] == null ? null : b.c + a[i] * p.mult)),
            dash: [2, 4],
          },
          {
            name: "Lower",
            data: d.map((b, i) => (a[i] == null ? null : b.c - a[i] * p.mult)),
            dash: [2, 4],
          },
        ],
        fill: [0, 1],
      };
    },
  },

  vol: {
    name: "Volume",
    fam: "vol",
    where: "sub",
    desc: "Broker volume. On spot FX this is tick count, not traded size.",
    params: { ma: 20 },
    color: "--txt2",
    h: 0.14,
    calc(d, p) {
      return {
        hist: {
          name: "Vol",
          data: d.map((b) => b.v),
          colorBy: d.map((b) => (b.c >= b.o ? 1 : -1)),
        },
        lines: p.ma
          ? [
              {
                name: `MA ${p.ma}`,
                data: sma(
                  d.map((b) => b.v),
                  p.ma,
                ),
              },
            ]
          : [],
        fromZero: true,
        fmtInt: true,
      };
    },
  },
  rsi: {
    name: "RSI",
    fam: "mom",
    where: "sub",
    desc: "Relative strength with your own overbought level.",
    params: { length: 14, ob: 70, os: 30 },
    color: "--i4",
    h: 0.17,
    calc(d, p) {
      return {
        lines: [
          { name: `RSI ${p.length}`, data: rsi(src(d, "close"), p.length) },
        ],
        range: [0, 100],
        levels: [
          { v: p.ob, label: String(p.ob) },
          { v: 50, label: "50", faint: true },
          { v: p.os, label: String(p.os) },
        ],
        band: [p.os, p.ob],
      };
    },
  },
  macd: {
    name: "MACD",
    fam: "mom",
    where: "sub",
    desc: "Convergence / divergence with signal and histogram.",
    params: { fast: 12, slow: 26, signal: 9 },
    color: "--i1",
    h: 0.18,
    calc(d, p) {
      const cl = src(d, "close"),
        f = ema(cl, p.fast),
        s = ema(cl, p.slow);
      const m = f.map((v, i) => (v == null || s[i] == null ? null : v - s[i]));
      const valid = m.map((v) => (v == null ? 0 : v)),
        sg = ema(valid, p.signal).map((v, i) => (m[i] == null ? null : v));
      const h = m.map((v, i) =>
        v == null || sg[i] == null ? null : v - sg[i],
      );
      return {
        hist: {
          name: "Hist",
          data: h,
          colorBy: h.map((v) => (v >= 0 ? 1 : -1)),
        },
        lines: [
          { name: "MACD", data: m },
          { name: "Signal", data: sg },
        ],
        zero: true,
      };
    },
  },
  stoch: {
    name: "Stochastic",
    fam: "mom",
    where: "sub",
    desc: "%K and %D against the N-bar range.",
    params: { length: 14, k: 3, d: 3 },
    color: "--i5",
    h: 0.17,
    calc(d, p) {
      const s = stoch(d, p.length, p.k, p.d);
      return {
        lines: [
          { name: "%K", data: s.k },
          { name: "%D", data: s.d },
        ],
        range: [0, 100],
        levels: [
          { v: 80, label: "80" },
          { v: 20, label: "20" },
        ],
        band: [20, 80],
      };
    },
  },
  atr: {
    name: "ATR",
    fam: "vlty",
    where: "sub",
    desc: "Average true range — the size of a normal bar.",
    params: { length: 14 },
    color: "--warn",
    h: 0.15,
    calc(d, p) {
      return { lines: [{ name: `ATR ${p.length}`, data: atr(d, p.length) }] };
    },
  },
  adx: {
    name: "ADX / DI",
    fam: "trend",
    where: "sub",
    desc: "Trend strength, and which side owns it.",
    params: { length: 14 },
    color: "--i2",
    h: 0.16,
    calc(d, p) {
      const a = adx(d, p.length);
      return {
        lines: [
          { name: "ADX", data: a.adx, width: 1.6 },
          { name: "+DI", data: a.pdi, color: "--up" },
          { name: "−DI", data: a.ndi, color: "--dn" },
        ],
        range: [0, 60],
        levels: [{ v: 25, label: "25" }],
      };
    },
  },
  cci: {
    name: "CCI",
    fam: "mom",
    where: "sub",
    desc: "How far price has strayed from its own average, in mean-deviation units.",
    params: { length: 20 },
    color: "--i3",
    h: 0.16,
    calc(d, p) {
      const tp = d.map((b) => (b.h + b.l + b.c) / 3),
        m = sma(tp, p.length),
        out = [];
      for (let i = 0; i < tp.length; i++) {
        if (m[i] == null) {
          out.push(null);
          continue;
        }
        let dev = 0;
        for (let k = 0; k < p.length; k++) dev += Math.abs(tp[i - k] - m[i]);
        dev /= p.length;
        out.push(dev === 0 ? 0 : (tp[i] - m[i]) / (0.015 * dev));
      }
      return {
        lines: [{ name: `CCI ${p.length}`, data: out }],
        levels: [
          { v: 100, label: "100" },
          { v: 0, label: "0", faint: true },
          { v: -100, label: "−100" },
        ],
        band: [-100, 100],
        zero: true,
      };
    },
  },
  willr: {
    name: "Williams %R",
    fam: "mom",
    where: "sub",
    desc: "Where the close sits inside the N-bar range, from 0 at the high to −100 at the low.",
    params: { length: 14 },
    color: "--i5",
    h: 0.15,
    calc(d, p) {
      const out = d.map((b, i) => {
        if (i < p.length - 1) return null;
        let hi = -Infinity,
          lo = Infinity;
        for (let k = 0; k < p.length; k++) {
          hi = Math.max(hi, d[i - k].h);
          lo = Math.min(lo, d[i - k].l);
        }
        return hi === lo ? -50 : ((hi - b.c) / (hi - lo)) * -100;
      });
      return {
        lines: [{ name: `%R ${p.length}`, data: out }],
        range: [-100, 0],
        levels: [
          { v: -20, label: "−20" },
          { v: -80, label: "−80" },
        ],
        band: [-80, -20],
      };
    },
  },
  mfi: {
    name: "Money Flow Index",
    fam: "vol",
    where: "sub",
    desc: "RSI weighted by volume — momentum that only counts when size turns up.",
    params: { length: 14 },
    color: "--i2",
    h: 0.16,
    calc(d, p) {
      const tp = d.map((b) => (b.h + b.l + b.c) / 3),
        out = [];
      for (let i = 0; i < d.length; i++) {
        if (i < p.length) {
          out.push(null);
          continue;
        }
        let pos = 0,
          neg = 0;
        for (let k = 0; k < p.length; k++) {
          const j = i - k,
            flow = tp[j] * (d[j].v || 0);
          if (tp[j] > tp[j - 1]) pos += flow;
          else if (tp[j] < tp[j - 1]) neg += flow;
        }
        out.push(neg === 0 ? 100 : 100 - 100 / (1 + pos / neg));
      }
      return {
        lines: [{ name: `MFI ${p.length}`, data: out }],
        range: [0, 100],
        levels: [
          { v: 80, label: "80" },
          { v: 20, label: "20" },
        ],
        band: [20, 80],
      };
    },
  },
  roc: {
    name: "Rate of change",
    fam: "mom",
    where: "sub",
    desc: "Percent change over N bars — speed, not direction.",
    params: { length: 12 },
    color: "--i1",
    h: 0.14,
    calc(d, p) {
      const cl = src(d, "close");
      return {
        lines: [
          {
            name: `ROC ${p.length}`,
            data: cl.map((v, i) =>
              i < p.length || !cl[i - p.length]
                ? null
                : ((v - cl[i - p.length]) / cl[i - p.length]) * 100,
            ),
          },
        ],
        zero: true,
      };
    },
  },
  ao: {
    name: "Awesome Oscillator",
    fam: "mom",
    where: "sub",
    desc: "The 5- against the 34-bar median, drawn as a histogram that colours by its own slope.",
    params: { fast: 5, slow: 34 },
    color: "--i4",
    h: 0.15,
    calc(d, p) {
      const mid = d.map((b) => (b.h + b.l) / 2),
        f = sma(mid, p.fast),
        s = sma(mid, p.slow);
      const h = f.map((v, i) => (v == null || s[i] == null ? null : v - s[i]));
      return {
        hist: {
          name: "AO",
          data: h,
          colorBy: h.map((v, i) =>
            v == null || h[i - 1] == null ? 1 : v >= h[i - 1] ? 1 : -1,
          ),
        },
        lines: [],
        zero: true,
      };
    },
  },
  obv: {
    name: "On-balance volume",
    fam: "vol",
    where: "sub",
    desc: "Volume signed by the close.",
    params: {},
    color: "--i3",
    h: 0.15,
    calc(d) {
      return { lines: [{ name: "OBV", data: obv(d) }], fmtInt: true };
    },
  },
  cvd: {
    name: "Cumulative volume delta",
    fam: "flow",
    where: "sub",
    desc: "Estimated from bar shape until a licensed venue feed is wired.",
    params: {},
    color: "--i1",
    h: 0.15,
    calc(d) {
      return {
        lines: [{ name: "CVD", data: cvd(d) }],
        zero: true,
        fmtInt: true,
        est: true,
      };
    },
  },
  jwin: {
    name: "Win rate by hour · yours",
    fam: "journal",
    where: "sub",
    desc: "Your outcomes on this symbol, by hour of entry.",
    params: {},
    color: "--acc2",
    h: 0.17,
    custom: "jwin",
  },
  jmae: {
    name: "MAE / MFE envelope · yours",
    fam: "journal",
    where: "price",
    desc: "How far your entries travel against you before they work.",
    params: {},
    color: "--acc2",
    calc(d, p, cx) {
      const r = rng(hash(cx.sym + "mae")),
        a = atr(d, 14);
      const mae = 0.6 + r() * 0.5,
        mfe = 1.2 + r() * 1.1;
      return {
        lines: [
          {
            name: "Typical MAE",
            data: d.map((b, i) => (a[i] == null ? null : b.c - a[i] * mae)),
            dash: [2, 3],
          },
          {
            name: "Typical MFE",
            data: d.map((b, i) => (a[i] == null ? null : b.c + a[i] * mfe)),
            dash: [2, 3],
          },
        ],
        fill: [0, 1],
      };
    },
  },
};
const FAMS = [
  ["overlay", "Price overlays"],
  ["trend", "Trend"],
  ["mom", "Momentum"],
  ["vol", "Volume"],
  ["vlty", "Volatility"],
  ["flow", "Order flow"],
  ["journal", "From your journal"],
];
let uidN = 1;
function makeStudy(id, params) {
  const S = STUDIES[id];
  return {
    uid: "s" + uidN++,
    id,
    params: { ...S.params, ...(params || {}) },
    color: S.color,
    visible: true,
    h: S.h || 0.16,
  };
}

/* ── drawing objects ────────────────────────────────────────── */
const DRAW = {
  trend: { name: "Trend line", pts: 2, key: "T" },
  ray: { name: "Ray", pts: 2, key: "Y" },
  xline: { name: "Extended line", pts: 2, key: "E" },
  hline: { name: "Horizontal line", pts: 1, key: "H" },
  vline: { name: "Vertical line", pts: 1, key: "V" },
  rect: { name: "Zone / rectangle", pts: 2, key: "R" },
  channel: { name: "Parallel channel", pts: 3, key: "C" },
  fib: { name: "Fib retracement", pts: 2, key: "F" },
  fibext: { name: "Fib extension", pts: 3, key: "" },
  arrow: { name: "Arrow", pts: 2, key: "W" },
  prange: { name: "Price range", pts: 2, key: "G" },
  measure: { name: "Measure", pts: 2, key: "M" },
  text: { name: "Note", pts: 1, key: "N" },
};
const FIBS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618];

/* ── chart ──────────────────────────────────────────────────── */
const AX = 64,
  TX = 22;

class Chart {
  constructor(slot) {
    this.slot = slot;
    this.el = document.createElement("div");
    this.el.className = "cw" + (slot === state.sel ? " sel" : "");
    /* Candles/bars render here via Lightweight Charts when lwcSupported()
       says the current type/scale mode can be matched pixel-for-pixel
       (see drawSeries()). It sits behind `this.cv`, is never interactive
       (pointer-events: none — panning, drawing, the position tool and
       every mouse handler below still all go through `this.cv` exactly
       as before), and is just painted into the same i0/i1/lo/hi window
       that bars()/scale() already compute. */
    this.lwcHost = document.createElement("div");
    this.lwcHost.className = "lwc-host";
    this.lwcHost.style.display = "none";
    this.el.appendChild(this.lwcHost);
    this.lwc = null;
    this.lwcSeries = null;
    this.lwcKind = null;
    this._lwcSig = null;
    this.cv = document.createElement("canvas");
    this.el.appendChild(this.cv);
    this.leg = document.createElement("div");
    this.leg.className = "leg";
    this.el.appendChild(this.leg);
    this.bdg = document.createElement("div");
    this.bdg.className = "badge";
    this.el.appendChild(this.bdg);
    this.dw = document.createElement("div");
    this.dw.className = "dwin";
    this.el.appendChild(this.dw);
    this.scaleBtns = document.createElement("div");
    this.scaleBtns.className = "sbtns";
    this.el.appendChild(this.scaleBtns);
    this.rt = document.createElement("button");
    this.rt.className = "gort";
    this.rt.title = "Back to the last bar";
    this.rt.innerHTML = "&rsaquo;&rsaquo;";
    this.el.appendChild(this.rt);
    this.ctx = this.cv.getContext("2d");
    this.drag = null;
    this.pending = null;
    this.bind();
  }
  get cfg() {
    return state.charts[this.slot];
  }
  get key() {
    return this.cfg.sym + this.cfg.iv;
  }
  get view() {
    return this.cfg.view;
  }
  get sc() {
    return this.cfg.scale;
  }
  get raw() {
    return getSeries(this.cfg.sym, this.cfg.iv);
  }
  get data() {
    let d = this.raw;
    if (state.replay.on) {
      const t = replayTime();
      let k = d.length;
      if (t) {
        k = d.findIndex((b) => b.t > t);
        k = k < 0 ? d.length : k;
      }
      d = d.slice(0, Math.max(30, k));
    }
    return state.type === "heikin" ? heikin(d) : d;
  }
  get drw() {
    return state.drawings[this.key] || (state.drawings[this.key] = []);
  }
  get studies() {
    return this.cfg.studies;
  }

  /* ── geometry ── */
  measure() {
    const dpr = Math.min(devicePixelRatio || 1, 2),
      r = this.el.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    this.cv.width = Math.max(1, r.width * dpr);
    this.cv.height = Math.max(1, r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* Pane heights are resolved in pixels, once, and the price pane takes
       whatever is left. The earlier version clamped the fractions twice —
       before scaling and again while laying out — so a squeezed pane could
       be pushed back up to its minimum after the budget had been spent,
       and the last indicator pane hung below the time axis and got cut
       off. Anything that cannot be given MIN_PANE px is not drawn at all,
       which is honest: a 12px RSI is not a reading, it is a smudge. */
    const MIN_PANE = 56;
    const subs = this.studies.filter(
      (s) => s.visible && STUDIES[s.id].where === "sub",
    );
    const body = Math.max(1, this.H - TX);
    /* A price pane under about 170px is not a chart — the candles collapse
        into a ribbon and the axis can only fit two labels. In a short window
        the indicator panes get dropped instead, and the legend says so. */
    const minPrice = Math.max(170, body * 0.38);
    let budget = Math.max(0, body - minPrice);
    const fitted = [];
    for (const s of subs) {
      if (budget < MIN_PANE) break;
      const want = body * Math.max(0.08, Math.min(0.34, s.h || 0.18));
      const h = Math.max(MIN_PANE, Math.min(want, budget));
      fitted.push({ study: s, h });
      budget -= h;
    }
    this.hiddenPanes = subs.length - fitted.length;
    const priceH = body - fitted.reduce((a, p) => a + p.h, 0);
    this.panes = { price: { y: 0, h: priceH, kind: "price" } };
    let y = priceH;
    this.subPanes = fitted.map((f) => {
      const p = { y, h: f.h, study: f.study };
      y += f.h;
      return p;
    });
    this.plotW = this.W - AX;
    this.axisY = y;
    /* Keep the LWC layer's rect glued to the price pane. Cheap even when
       LWC isn't in use this frame — it's a handful of style writes on a
       hidden element. */
    this.lwcHost.style.left = "0px";
    this.lwcHost.style.top = this.panes.price.y + "px";
    this.lwcHost.style.width = Math.max(1, this.plotW) + "px";
    this.lwcHost.style.height = Math.max(1, this.panes.price.h) + "px";
  }
  bars() {
    const d = this.data,
      n = Math.max(12, Math.min(this.view.n, d.length));
    const end = Math.max(
      n,
      Math.min(
        d.length + this.view.fwd,
        d.length - this.view.end + this.view.fwd,
      ),
    );
    return { d, i0: end - n, i1: end, n };
  }
  x(i) {
    const { i0, n } = this.bars();
    return (i - i0 + 0.5) * (this.plotW / n);
  }
  ix(px) {
    const { i0, n } = this.bars();
    return i0 + px / (this.plotW / n) - 0.5;
  }
  /* price-space transform: normal, log or percent */
  tp(p) {
    const m = this.sc.mode;
    if (m === "log") return Math.log(Math.max(1e-9, p));
    if (m === "pct") return (p / this.base - 1) * 100;
    return p;
  }
  inv(v) {
    const m = this.sc.mode;
    if (m === "log") return Math.exp(v);
    if (m === "pct") return this.base * (1 + v / 100);
    return v;
  }
  scale() {
    const { d, i0, i1 } = this.bars();
    this.base = (d[Math.max(0, Math.min(d.length - 1, i0))] || d[0]).c;
    let lo = Infinity,
      hi = -Infinity;
    for (let i = Math.max(0, i0); i < Math.min(d.length, i1); i++) {
      lo = Math.min(lo, d[i].l);
      hi = Math.max(hi, d[i].h);
    }
    if (!isFinite(lo)) {
      lo = this.base * 0.99;
      hi = this.base * 1.01;
    }
    this.studies
      .filter((s) => s.visible && STUDIES[s.id].where === "price")
      .forEach((s) => {
        const r = this.study(s);
        if (!r || !r.lines) return;
        r.lines.forEach((L) => {
          for (let i = Math.max(0, i0); i < Math.min(d.length, i1); i++) {
            const v = L.data[i];
            if (v != null) {
              lo = Math.min(lo, v);
              hi = Math.max(hi, v);
            }
          }
        });
      });
    this.drw
      .filter((o) => !o.hidden)
      .forEach((o) =>
        o.pts.forEach((q) => {
          if (q.p != null) {
            lo = Math.min(lo, q.p);
            hi = Math.max(hi, q.p);
          }
        }),
      );
    if (state.pos && state.pos.key === this.key)
      [state.pos.entry, state.pos.stop, state.pos.target].forEach((p) => {
        lo = Math.min(lo, p);
        hi = Math.max(hi, p);
      });
    let tlo = this.tp(lo),
      thi = this.tp(hi);
    const pad = (thi - tlo) * 0.09 || Math.abs(tlo * 0.01) || 1;
    tlo -= pad;
    thi += pad;
    const c = (tlo + thi) / 2,
      half = ((thi - tlo) / 2) * (this.sc.factor || 1);
    this.tLo = c - half + (this.sc.offset || 0) * half * 2;
    this.tHi = c + half + (this.sc.offset || 0) * half * 2;
    this.lo = this.inv(this.tLo);
    this.hi = this.inv(this.tHi);
    return this;
  }
  /* An inverted scale flips the price axis so that up is down. It sounds like
     a gimmick and it is the fastest bias check there is: a chart you are sure
     is a long stops looking like one when you cannot read it as a rising line.
     It is a flag rather than a fourth mode, because it composes — you can
     invert a log or a percent scale as well as a plain one. Everything on the
     chart goes through y() and py(), so the flip is these two functions and
     nothing else. */
  y(p, pane) {
    const pn = pane || this.panes.price;
    const f = (this.tHi - this.tp(p)) / (this.tHi - this.tLo || 1);
    return pn.y + (this.sc && this.sc.invert ? 1 - f : f) * pn.h;
  }
  py(y) {
    let f = (y - this.panes.price.y) / this.panes.price.h;
    if (this.sc && this.sc.invert) f = 1 - f;
    return this.inv(this.tHi - f * (this.tHi - this.tLo));
  }
  /* per-study cache, invalidated by data length + params */
  study(s) {
    const S = STUDIES[s.id];
    if (S.custom || !S.calc) return null;
    const d = this.data;
    const sig =
      this.key +
      "|" +
      state.type +
      "|" +
      d.length +
      "|" +
      JSON.stringify(s.params);
    s._c = s._c || {};
    if (s._c.sig !== sig)
      s._c = {
        sig,
        r: S.calc(d, s.params, { iv: this.cfg.iv, sym: this.cfg.sym }),
      };
    return s._c.r;
  }

  /* ── interaction ── */
  bind() {
    const el = this.el;
    this.rt.onclick = (e) => {
      e.stopPropagation();
      this.view.end = 0;
      this.view.fwd = 0;
      draw();
    };
    el.addEventListener("mousedown", (e) => {
      select(this.slot);
      const p = this.pt(e);
      /* price axis: drag to rescale, double-click handled below */
      if (p.x > this.plotW) {
        this.drag = { mode: "axisY", y: e.clientY, f: this.sc.factor };
        this.sc.auto = false;
        return;
      }
      if (p.y > this.axisY) {
        this.drag = { mode: "axisX", x: e.clientX, n: this.view.n };
        return;
      }
      if (e.altKey) {
        /* Alt-drag is always a measurement, like TradingView */
        this.pending = this.newObj("measure", p);
        this.drag = { mode: "new" };
        return;
      }
      if (state.tool === "cursor") {
        const h = this.grab(p);
        if (h) {
          state.selObj = h.o.id;
          this.drag = { mode: "handle", h };
          paintObjects();
          return;
        }
        const i = this.nearest(p);
        if (i >= 0) {
          state.selObj = this.drw[i].id;
          paintObjects();
          this.drag = {
            mode: "move",
            o: this.drw[i],
            x: this.ix(p.x),
            p: this.py(p.y),
            snap: this.drw[i].pts.map((q) => ({ ...q })),
          };
          return;
        }
        state.selObj = null;
        paintObjects();
        this.drag = {
          mode: "pan",
          x: e.clientX,
          y: e.clientY,
          end: this.view.end,
          off: this.sc.offset || 0,
        };
        el.style.cursor = "grabbing";
        return;
      }
      if (state.tool === "eraser") {
        const i = this.nearest(p);
        if (i >= 0) {
          pushUndo();
          this.drw.splice(i, 1);
          paintObjects();
          toast(
            "Drawing removed",
            "Ctrl+Z brings it back — drawings, studies and layout share one undo stack.",
          );
          draw();
        }
        return;
      }
      if (state.tool === "alertline") {
        openAlert(this.snap(p), this.cfg.sym);
        return;
      }
      if (state.tool === "replayhere") {
        const i = Math.round(this.ix(p.x));
        state.replay.idx = Math.max(60, i + 1);
        toggleReplay(true);
        repStep(0);
        setTool("cursor");
        toast(
          "Replay set to this bar",
          "Every chart in the layout jumps to the same clock.",
        );
        return;
      }
      const def = DRAW[state.tool];
      if (!def) return;
      if (def.pts === 1) {
        pushUndo();
        const o = this.newObj(state.tool, p);
        if (state.tool === "text") {
          o.text = "Note";
          if (typeof editDrawing === "function")
            setTimeout(() => editDrawing(this, o), 0);
        }
        this.drw.push(o);
        state.selObj = o.id;
        setTool("cursor");
        paintObjects();
        draw();
        toast(
          def.name + " placed",
          "Drag it to move, click to select, Delete to remove. Right-click for an alert on it.",
        );
        return;
      }
      if (typeof SHAPE_FREE !== "undefined" && SHAPE_FREE.has(state.tool)) {
        /* Freehand collects a point per move instead of taking two clicks,
           so it gets its own drag mode. */
        this.pending = this.newObj(state.tool, p);
        this.pending.pts = [this.pending.pts[0]];
        this.drag = { mode: "free" };
        return;
      }
      this.pending = this.newObj(state.tool, p);
      this.drag = { mode: "new" };
    });
    el.addEventListener("mousemove", (e) => {
      const p = this.pt(e);
      state.hover = {
        slot: this.slot,
        i: Math.round(this.ix(p.x)),
        y: p.y,
        x: p.x,
        t: this.dataT(this.ix(p.x)),
      };
      const D = this.drag;
      if (D) {
        if (D.mode === "pan") {
          const { n } = this.bars();
          const dx = (e.clientX - D.x) / (this.plotW / n);
          const want = Math.round(D.end - dx);
          this.view.end = Math.max(-40, Math.min(this.raw.length - 40, want));
          if (this.view.end < 0) {
            this.view.fwd = -this.view.end;
            this.view.end = 0;
          } else this.view.fwd = 0;
          if (!this.sc.auto) {
            const dy = (e.clientY - D.y) / this.panes.price.h;
            this.sc.offset = D.off + dy;
          }
        } else if (D.mode === "axisY") {
          const f = Math.max(
            0.15,
            Math.min(6, D.f * (1 + (e.clientY - D.y) / 240)),
          );
          this.sc.factor = f;
        } else if (D.mode === "axisX") {
          const f = 1 - (e.clientX - D.x) / 300;
          this.view.n = Math.max(20, Math.min(520, Math.round(D.n * f)));
        } else if (D.mode === "free") {
          /* Unsnapped: a freehand stroke that jumped to the nearest OHLC
             would be a staircase, not a stroke. */
          const q = { i: this.ix(p.x), p: this.py(p.y) };
          const last = this.pending.pts[this.pending.pts.length - 1];
          if (
            Math.hypot(this.x(q.i) - this.x(last.i), p.y - this.y(last.p)) > 2
          )
            this.pending.pts.push(q);
        } else if (D.mode === "new") {
          const q = this.ptSnap(p);
          this.pending.pts[1] = { i: q.i, p: q.p };
          if (this.pending.pts.length > 2)
            this.pending.pts[2] = { i: q.i, p: q.p };
        } else if (D.mode === "handle") {
          const q = this.ptSnap(p),
            h = D.h;
          if (h.pos) {
            movePos(h.k, q.p);
          } else {
            if (h.o.locked) return;
            const pt = h.o.pts[h.k];
            if (h.o.t !== "hline") pt.i = q.i;
            if (h.o.t !== "vline") pt.p = q.p;
          }
        } else if (D.mode === "move") {
          if (D.o.locked) return;
          const di = this.ix(p.x) - D.x,
            dp = this.py(p.y) - D.p;
          D.o.pts.forEach((q, k) => {
            q.i = D.snap[k].i + di;
            if (q.p != null) q.p = D.snap[k].p + dp;
          });
        }
      } else if (state.tool === "cursor") {
        el.style.cursor =
          p.x > this.plotW
            ? "ns-resize"
            : p.y > this.axisY
              ? "ew-resize"
              : this.grab(p)
                ? "pointer"
                : this.nearest(p) >= 0
                  ? "move"
                  : "crosshair";
      }
      draw();
    });
    window.addEventListener("mouseup", () => {
      const D = this.drag;
      if (D && D.mode === "free" && this.pending) {
        const o = this.pending;
        this.pending = null;
        if (o.pts.length > 2) {
          pushUndo();
          this.drw.push(o);
          state.selObj = o.id;
          paintObjects();
          toast(
            DRAW[o.t].name + " drawn",
            "Freehand keeps every point, so it moves with the bars it was drawn over.",
          );
        }
        this.drag = null;
        draw();
        return;
      }
      if (D && D.mode === "new" && this.pending) {
        const o = this.pending,
          a = o.pts[0],
          b = o.pts[1];
        if (
          Math.abs(b.i - a.i) > 0.6 ||
          Math.abs((b.p || 0) - (a.p || 0)) > 1e-9
        ) {
          pushUndo();
          seedPts(o, a, b);
          if (o.t === "position" || o.t === "shortpos") {
            makePos(
              this.key,
              a.p,
              b.p,
              o.t === "shortpos" ? { side: "short" } : null,
            );
          } else {
            this.drw.push(o);
            state.selObj = o.id;
            paintObjects();
            toast(
              DRAW[o.t].name + " drawn",
              o.t === "measure"
                ? "Bars, price distance, percent and risk-to-reward are on the drawing."
                : "Snapped to the nearest OHLC — magnet is on. Drag it, or use the Objects tab.",
            );
          }
          if (o.t !== "measure") setTool("cursor");
        }
        this.pending = null;
      }
      if (D) {
        this.drag = null;
        this.el.style.cursor = "crosshair";
        draw();
      }
    });
    el.addEventListener("mouseleave", () => {
      if (!this.drag) {
        state.hover = null;
        draw();
      }
    });
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = this.pt(e);
        if (p.x > this.plotW) {
          /* wheel on the axis rescales */
          this.sc.auto = false;
          this.sc.factor = Math.max(
            0.15,
            Math.min(6, (this.sc.factor || 1) * (e.deltaY > 0 ? 1.1 : 0.91)),
          );
          draw();
          return;
        }
        if (e.shiftKey) {
          /* shift-wheel pans time */
          this.view.end = Math.max(
            0,
            Math.min(
              this.raw.length - 40,
              this.view.end + (e.deltaY > 0 ? 3 : -3),
            ),
          );
          draw();
          return;
        }
        const before = this.ix(p.x);
        this.view.n = Math.max(
          20,
          Math.min(520, Math.round(this.view.n * (e.deltaY > 0 ? 1.12 : 0.89))),
        );
        const after = this.ix(p.x);
        this.view.end = Math.max(
          0,
          Math.round(this.view.end + (after - before)),
        );
        draw();
      },
      { passive: false },
    );
    /* Zooming or panning by hand means the view no longer matches whichever
       named date range is lit at the bottom, so the chip lets go. */
    el.addEventListener(
      "wheel",
      () => {
        if (typeof clearRange === "function") clearRange();
      },
      { passive: true },
    );
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const p = this.pt(e);
      const i = this.nearest(p);
      openCtx(
        e.clientX,
        e.clientY,
        this,
        i >= 0 ? this.drw[i] : null,
        this.snap(p),
      );
    });
    el.addEventListener("dblclick", (e) => {
      const p = this.pt(e);
      if (p.x > this.plotW) {
        this.sc.auto = true;
        this.sc.factor = 1;
        this.sc.offset = 0;
        draw();
        return;
      }
      const i = this.nearest(p);
      if (i >= 0) {
        /* double-click a drawing opens its settings */
        state.selObj = this.drw[i].id;
        paintObjects();
        if (typeof editDrawing === "function") {
          editDrawing(this, this.drw[i]);
          draw();
          return;
        }
      }
      this.fit();
      draw();
    });
  }
  fit() {
    this.view.n = Math.min(this.data.length, 150);
    this.view.end = 0;
    this.view.fwd = 0;
    this.sc.factor = 1;
    this.sc.offset = 0;
    this.sc.auto = true;
  }
  newObj(t, p) {
    const q = this.ptSnap(p),
      n = DRAW[t] ? DRAW[t].pts : 2;
    const pts = [{ i: q.i, p: q.p }];
    for (let k = 1; k < n; k++) pts.push({ i: q.i, p: q.p });
    return {
      id: "o" + uidN++,
      t,
      pts,
      style: drawStyle(),
      locked: false,
      hidden: false,
      text: "",
    };
  }
  pt(e) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  ptSnap(p) {
    return { i: this.ix(p.x), p: this.snap(p) };
  }
  snap(p) {
    const price = this.py(p.y);
    if (!state.magnet) return price;
    const { d } = this.bars(),
      i = Math.max(0, Math.min(d.length - 1, Math.round(this.ix(p.x)))),
      b = d[i];
    if (!b) return price;
    let best = price,
      bd = Infinity;
    [b.o, b.h, b.l, b.c].forEach((v) => {
      const dd = Math.abs(this.y(v) - p.y);
      if (dd < bd && dd < 7) {
        bd = dd;
        best = v;
      }
    });
    return best;
  }
  dataT(i) {
    const { d } = this.bars();
    const b = d[Math.max(0, Math.min(d.length - 1, Math.round(i)))];
    return b ? b.t : null;
  }
  grab(p) {
    if (state.pos && state.pos.key === this.key)
      for (const k of ["entry", "stop", "target"])
        if (Math.abs(this.y(state.pos[k]) - p.y) < 5 && p.x > this.plotW * 0.35)
          return { pos: true, k };
    for (let n = this.drw.length - 1; n >= 0; n--) {
      const o = this.drw[n];
      if (o.hidden || o.locked) continue;
      for (let k = 0; k < o.pts.length; k++) {
        const q = o.pts[k];
        const x = o.t === "hline" ? p.x : this.x(q.i),
          y = q.p == null ? p.y : this.y(q.p);
        if (Math.hypot(x - p.x, y - p.y) < 7) return { o, k };
      }
    }
    return null;
  }
  nearest(p) {
    let bi = -1,
      bd = 8;
    this.drw.forEach((o, i) => {
      if (o.hidden) return;
      let d = Infinity;
      if (o.t === "hline") d = Math.abs(this.y(o.pts[0].p) - p.y);
      else if (o.t === "vline") d = Math.abs(this.x(o.pts[0].i) - p.x);
      else if (
        o.t === "rect" ||
        o.t === "prange" ||
        o.t === "fib" ||
        o.t === "fibext" ||
        (typeof SHAPE_BOXY !== "undefined" && SHAPE_BOXY.has(o.t))
      ) {
        const x1 = this.x(o.pts[0].i),
          x2 = this.x(o.pts[1].i),
          y1 = this.y(o.pts[0].p),
          y2 = this.y(o.pts[1].p);
        const inx = p.x >= Math.min(x1, x2) - 4 && p.x <= Math.max(x1, x2) + 4,
          iny = p.y >= Math.min(y1, y2) - 4 && p.y <= Math.max(y1, y2) + 4;
        d =
          inx && iny
            ? 0
            : Math.min(
                Math.abs(p.x - x1),
                Math.abs(p.x - x2),
                Math.abs(p.y - y1),
                Math.abs(p.y - y2),
              ) + (inx || iny ? 4 : 20);
      } else {
        const x1 = this.x(o.pts[0].i),
          y1 = this.y(o.pts[0].p),
          x2 = this.x(o.pts[1].i),
          y2 = this.y(o.pts[1].p);
        d = segDist(p.x, p.y, x1, y1, x2, y2);
      }
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    return bi;
  }

  /* ── render ── */
  render() {
    this.measure();
    const raw = this.raw;
    if (!raw.length) {
      const c = this.ctx;
      c.clearRect(0, 0, this.W, this.H);
      c.fillStyle = css("--txt2");
      c.font = '12px "IBM Plex Mono",monospace';
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("Loading real Dukascopy data…", this.W / 2, this.H / 2);
      this.lwcHost.style.display = "none";
      return;
    }
    this.scale();
    const c = this.ctx,
      W = this.W,
      H = this.H,
      pw = this.plotW,
      pr = this.panes.price,
      S = SYMBOLS[this.cfg.sym];
    const { d, i0, i1, n } = this.bars(),
      bw = pw / n,
      cw = Math.max(1, Math.min(15, bw * 0.68));
    const up = state.look.up || css("--up"),
      dn = state.look.dn || css("--dn");
    /* Axis numbers are read, not glanced at, so they take the body text
       colour rather than the faintest one — --faint on the chart surface
       sat under the 4.5:1 the rest of the app holds itself to. */
    const txt3 = css("--txt2"),
      line = css("--line"),
      grid = css("--grid");
    c.clearRect(0, 0, W, H);

    /* grid + price axis */
    c.font = '10px "IBM Plex Mono",monospace';
    c.textBaseline = "middle";
    c.lineWidth = 1;
    /* One label every ~44px produced seventeen prices down the axis on a
       full-height chart, which reads as a wall of digits rather than a
       scale. ~76px, capped at nine, is enough to locate a level. */
    const ticks = niceTicks(
      this.tLo,
      this.tHi,
      Math.max(3, Math.min(9, Math.round(pr.h / 76))),
    );
    ticks.forEach((v) => {
      const y =
        Math.round(pr.y + ((this.tHi - v) / (this.tHi - this.tLo)) * pr.h) +
        0.5;
      /* A label centred within 7px of either end of the pane is drawn
         half outside it, so it reads as a cut-off number rather than a
         price. Drop it; the gridline is what carries the level anyway. */
      if (y < pr.y + 7 || y > pr.y + pr.h - 7) return;
      if (state.look.gridH) {
        c.strokeStyle = grid;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(pw, y);
        c.stroke();
      }
      c.fillStyle = txt3;
      c.textAlign = "left";
      c.fillText(
        this.sc.mode === "pct"
          ? (v > 0 ? "+" : "") + v.toFixed(2) + "%"
          : fmt(this.inv(v), this.cfg.sym),
        pw + 7,
        y,
      );
    });
    /* time axis + session breaks */
    /* Seven labels is right for a 1100px chart and far too many for a
       375px one, where "03:31 08:31" ran into each other. Space them by
       the width a timestamp actually needs instead of by bar count. */
    const slots = Math.max(2, Math.floor(this.plotW / 86));
    const stepI = Math.max(1, Math.round(n / slots));
    c.textAlign = "center";
    for (
      let i = Math.max(0, Math.ceil(i0 / stepI) * stepI);
      i < Math.min(d.length, i1);
      i += stepI
    ) {
      const x = Math.round(this.x(i)) + 0.5;
      if (state.look.gridV) {
        c.strokeStyle = grid;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, this.axisY);
        c.stroke();
      }
      /* The axis honours the UTC toggle at the bottom of the chart. Without
         the explicit timeZone these fall back to the machine's zone, so the
         clock would say UTC while the axis said something else — and on a
         chart the axis is the one people trust. */
      const t = new Date(d[i].t),
        tz = state.look.utc === false ? undefined : "UTC",
        lbl =
          IV_MS[this.cfg.iv] >= 864e5
            ? t.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                timeZone: tz,
              })
            : t.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: tz,
              });
      c.fillStyle = txt3;
      c.fillText(lbl, Math.min(pw - 20, Math.max(20, x)), this.axisY + TX / 2);
    }
    if (state.look.sessions && IV_MS[this.cfg.iv] < 864e5) {
      c.save();
      c.strokeStyle = css("--line2");
      c.setLineDash([2, 4]);
      for (let i = Math.max(1, i0); i < Math.min(d.length, i1); i++) {
        if (
          new Date(d[i].t).getUTCDate() !== new Date(d[i - 1].t).getUTCDate()
        ) {
          const x = Math.round(this.x(i)) + 0.5;
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x, this.axisY);
          c.stroke();
        }
      }
      c.restore();
    }
    c.strokeStyle = line;
    c.beginPath();
    c.moveTo(pw + 0.5, 0);
    c.lineTo(pw + 0.5, H);
    c.moveTo(0, this.axisY + 0.5);
    c.lineTo(W, this.axisY + 0.5);
    c.stroke();

    /* price-pane studies behind price */
    c.save();
    c.beginPath();
    c.rect(0, pr.y, pw, pr.h);
    c.clip();
    this.studies
      .filter((s) => s.visible && STUDIES[s.id].where === "price")
      .forEach((s) => this.drawPriceStudy(c, s, i0, i1));
    /* volume profile of the visible range */
    if (this.cfg.vp) this.volProfile(c, d, i0, i1);
    /* price series */
    this.drawSeries(c, d, i0, i1, cw, up, dn, pr);
    /* compare overlays */
    const cl = d.map((b) => b.c);
    [...state.compare].forEach((s, k) => {
      const cd = getSeries(s, this.cfg.iv)
        .slice(0, d.length)
        .map((b) => b.c);
      const base = cd[Math.max(0, i0)],
        mine = cl[Math.max(0, i0)];
      this.poly(
        c,
        cd.map((v) => mine * (v / base)),
        i0,
        i1,
        [css("--i4"), css("--i5")][k % 2],
        1.2,
        [4, 4],
      );
    });
    c.restore();

    /* price line, trades, drawings, position, alerts */
    this.lastPrice(c, d, pw);
    if (state.trades) this.tradeLayer(c, d, i0, i1);
    this.drw.forEach((o) => {
      if (!o.hidden) this.drawObj(c, o, false, o.id === state.selObj);
    });
    if (this.pending) this.drawObj(c, this.pending, true);
    if (state.pos && state.pos.key === this.key) this.posTool(c);
    this.alertLines(c, pw);

    /* sub panes */
    this.subPanes.forEach((p) => {
      c.strokeStyle = line;
      c.beginPath();
      c.moveTo(0, p.y + 0.5);
      c.lineTo(W, p.y + 0.5);
      c.stroke();
      if (STUDIES[p.study.id].custom === "jwin") this.jwinPane(c, p);
      else this.subPane(c, p, i0, i1, bw);
    });

    this.crosshair(c);
    this.legend(d);
    this.badges();
    this.dataWindow(d);
    this.axisButtons();
    this.rt.classList.toggle("show", this.view.end > 4);
  }
  /* True only when the current type/scale combination can be handed to
     Lightweight Charts and land on the same pixels the rest of this
     canvas (drawings, the position tool, axis labels) is drawing
     against. Everything else falls back to the original renderer just
     below — see the comment on LWC_KIND above for which cases those
     are and why. */
  lwcSupported(T) {
    return (
      typeof window.LightweightCharts !== "undefined" &&
      LWC_KIND[T] != null &&
      this.sc.mode === "linear" &&
      !this.sc.invert
    );
  }
  lwcSeriesOptions(up, dn) {
    return this.lwcKind === "BarSeries"
      ? {
          upColor: up,
          downColor: dn,
          priceLineVisible: false,
          lastValueVisible: false,
        }
      : {
          upColor: up,
          downColor: dn,
          borderVisible: false,
          wickUpColor: up,
          wickDownColor: dn,
          priceLineVisible: false,
          lastValueVisible: false,
          /* Pinned to the exact same price window scale() just computed,
             every time LWC re-evaluates autoscale — this is the entire
             sync mechanism for the vertical axis. The horizontal one is
             setVisibleLogicalRange() in syncLWC() below. */
          autoscaleInfoProvider: () => ({
            priceRange: { minValue: this.lo, maxValue: this.hi },
          }),
        };
  }
  ensureLWC(kind, up, dn) {
    if (!this.lwc) {
      this.lwc = LightweightCharts.createChart(this.lwcHost, {
        autoSize: true,
        layout: {
          background: {
            type: LightweightCharts.ColorType.Solid,
            color: "rgba(0,0,0,0)",
          },
          textColor: "rgba(0,0,0,0)",
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        timeScale: { visible: false, borderVisible: false },
        crosshair: { mode: LightweightCharts.CrosshairMode.Hidden },
        /* Pan/zoom/price-drag stay owned by the mouse handlers in bind()
           above, exactly as before — LWC here is a pure renderer, never
           a second source of view state. */
        handleScroll: false,
        handleScale: false,
        kineticScroll: { mouse: false, touch: false },
      });
    }
    if (this.lwcKind !== kind) {
      if (this.lwcSeries) this.lwc.removeSeries(this.lwcSeries);
      this.lwcKind = kind;
      this.lwcSeries = this.lwc.addSeries(
        LightweightCharts[kind],
        this.lwcSeriesOptions(up, dn),
      );
      this._lwcSig = null;
      this._lwcMeta = null; // force a fresh setData right after a series swap
    }
    return this.lwcSeries;
  }
  syncLWC(kind, d, i0, i1, up, dn) {
    this.ensureLWC(kind, up, dn);
    this.lwcSeries.applyOptions(this.lwcSeriesOptions(up, dn));
    /* setData() rebuilds LWC's internal index, so it only runs when the
       series actually changed (new bar count, or the last bar's own
       timestamp moved past a new tick) — not on every mousemove-driven
       draw() call, which is what keeps panning/drawing smooth. */
    const lastBar = d.length ? d[d.length - 1] : null;
    const last = lastBar ? lastBar.t : 0;
    const sig = this.key + "|" + kind + "|" + d.length + "|" + last + "|" +
      (lastBar ? [lastBar.o, lastBar.h, lastBar.l, lastBar.c].join("|") : "");
    const previous = this._lwcMeta;
    if (!previous) {
      this.lwcSeries.setData(
        d.map((b) => ({
          time: Math.floor(b.t / 1000),
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
        })),
      );
    } else if (previous.length === d.length && previous.last === last && lastBar) {
      /* A forming Dukascopy candle changed: use Lightweight Charts'
         incremental update path instead of rebuilding the whole series. */
      this.lwcSeries.update({
        time: Math.floor(lastBar.t / 1000),
        open: lastBar.o,
        high: lastBar.h,
        low: lastBar.l,
        close: lastBar.c,
      });
    } else {
      this.lwcSeries.setData(
        d.map((b) => ({
          time: Math.floor(b.t / 1000),
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
        })),
      );
    }
    this._lwcSig = sig;
    this._lwcMeta = { length: d.length, last };
    this.lwc.timeScale().setVisibleLogicalRange({ from: i0, to: i1 });
  }
  drawSeries(c, d, i0, i1, cw, up, dn, pr) {
    if (this.lwcSupported(state.type)) {
      this.lwcHost.style.display = "block";
      this.syncLWC(LWC_KIND[state.type], d, i0, i1, up, dn);
      return;
    }
    this.lwcHost.style.display = "none";
    const T = state.type,
      pw = this.plotW;
    if (T === "line" || T === "area" || T === "step" || T === "baseline") {
      const base = d[Math.max(0, i0)].o,
        acc2 = css("--acc2");
      c.beginPath();
      for (let i = Math.max(0, i0); i < Math.min(d.length, i1); i++) {
        const x = this.x(i),
          y = this.y(d[i].c);
        if (i === Math.max(0, i0)) c.moveTo(x, y);
        else if (T === "step") {
          c.lineTo(x, this.y(d[i - 1].c));
          c.lineTo(x, y);
        } else c.lineTo(x, y);
      }
      if (T === "area") {
        const g = c.createLinearGradient(0, pr.y, 0, pr.y + pr.h);
        g.addColorStop(0, "rgba(76,107,245,.34)");
        g.addColorStop(1, "rgba(76,107,245,0)");
        c.lineTo(this.x(Math.min(d.length, i1) - 1), pr.y + pr.h);
        c.lineTo(this.x(Math.max(0, i0)), pr.y + pr.h);
        c.closePath();
        c.fillStyle = g;
        c.fill();
        c.beginPath();
        for (let i = Math.max(0, i0); i < Math.min(d.length, i1); i++) {
          const x = this.x(i),
            y = this.y(d[i].c);
          i === Math.max(0, i0) ? c.moveTo(x, y) : c.lineTo(x, y);
        }
      }
      c.strokeStyle =
        T === "baseline"
          ? d[Math.min(d.length, i1) - 1].c >= base
            ? up
            : dn
          : acc2;
      c.lineWidth = 1.5;
      c.stroke();
      if (T === "baseline") {
        const yb = this.y(base);
        c.setLineDash([3, 3]);
        c.strokeStyle = css("--txt3");
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, yb);
        c.lineTo(pw, yb);
        c.stroke();
        c.setLineDash([]);
      }
      return;
    }
    for (let i = Math.max(0, i0); i < Math.min(d.length, i1); i++) {
      const b = d[i],
        x = this.x(i),
        rising = b.c >= b.o,
        col = rising ? up : dn;
      c.strokeStyle = state.look.wickMatch ? col : css("--txt3");
      c.fillStyle = col;
      c.lineWidth = 1;
      const yo = this.y(b.o),
        yc = this.y(b.c),
        yh = this.y(b.h),
        yl = this.y(b.l);
      if (T === "bar") {
        c.strokeStyle = col;
        c.beginPath();
        c.moveTo(Math.round(x) + 0.5, yh);
        c.lineTo(Math.round(x) + 0.5, yl);
        c.moveTo(Math.round(x) + 0.5, yo);
        c.lineTo(Math.round(x) - cw / 2, yo);
        c.moveTo(Math.round(x) + 0.5, yc);
        c.lineTo(Math.round(x) + cw / 2, yc);
        c.stroke();
      } else {
        c.beginPath();
        c.moveTo(Math.round(x) + 0.5, yh);
        c.lineTo(Math.round(x) + 0.5, yl);
        c.stroke();
        const top = Math.min(yo, yc),
          h = Math.max(1, Math.abs(yc - yo));
        if (T === "hollow" && rising) {
          c.strokeStyle = col;
          c.strokeRect(
            Math.round(x - cw / 2) + 0.5,
            Math.round(top) + 0.5,
            Math.round(cw),
            Math.round(h),
          );
        } else
          c.fillRect(
            Math.round(x - cw / 2),
            Math.round(top),
            Math.round(cw),
            Math.max(1, Math.round(h)),
          );
      }
    }
  }
  drawPriceStudy(c, s, i0, i1) {
    const r = this.study(s);
    if (!r || !r.lines) return;
    const base = css(s.color) || s.color;
    if (r.fill && r.lines[r.fill[0]] && r.lines[r.fill[1]]) {
      const A = r.lines[r.fill[0]].data,
        B = r.lines[r.fill[1]].data;
      c.save();
      c.beginPath();
      let st = false;
      for (let i = Math.max(0, i0); i < i1; i++) {
        if (A[i] == null) continue;
        const x = this.x(i),
          y = this.y(A[i]);
        st ? c.lineTo(x, y) : (c.moveTo(x, y), (st = true));
      }
      for (let i = Math.min(i1, B.length) - 1; i >= Math.max(0, i0); i--) {
        if (B[i] == null) continue;
        c.lineTo(this.x(i), this.y(B[i]));
      }
      c.closePath();
      c.globalAlpha = 0.1;
      c.fillStyle = base;
      c.fill();
      c.restore();
    }
    r.lines.forEach((L, k) => {
      if (L.dots) {
        /* Parabolic SAR is a sequence of dots, not a line: the whole signal is
           which side of price the dot sits on, and joining them up draws a
           stroke across the candle every time the trend flips. */
        const rad = Math.max(1, Math.min(2.4, this.bw ? this.bw * 0.14 : 1.4));
        for (let i = Math.max(0, i0); i < Math.min(L.data.length, i1); i++) {
          if (L.data[i] == null) continue;
          c.fillStyle = L.colorBy
            ? L.colorBy[i] === 1
              ? css("--up")
              : css("--dn")
            : L.color
              ? css(L.color)
              : base;
          c.beginPath();
          c.arc(this.x(i), this.y(L.data[i]), rad, 0, Math.PI * 2);
          c.fill();
        }
        return;
      }
      if (L.colorBy) {
        /* segment colouring, e.g. supertrend */
        for (let i = Math.max(1, i0); i < Math.min(L.data.length, i1); i++) {
          if (L.data[i] == null || L.data[i - 1] == null) continue;
          c.strokeStyle = L.colorBy[i] === 1 ? css("--up") : css("--dn");
          c.lineWidth = L.width || 1.5;
          c.beginPath();
          c.moveTo(this.x(i - 1), this.y(L.data[i - 1]));
          c.lineTo(this.x(i), this.y(L.data[i]));
          c.stroke();
        }
        return;
      }
      this.poly(
        c,
        L.data,
        i0,
        i1,
        L.color ? css(L.color) : base,
        L.width || 1.4,
        L.dash,
        k ? 0.85 : 1,
      );
    });
  }
  subPane(c, p, i0, i1, bw) {
    const s = p.study,
      r = this.study(s);
    if (!r) return;
    const base = css(s.color) || s.color,
      d = this.data;
    let lo = Infinity,
      hi = -Infinity;
    const scan = (a) => {
      for (let i = Math.max(0, i0); i < Math.min(a.length, i1); i++) {
        const v = a[i];
        if (v != null) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    };
    (r.lines || []).forEach((L) => scan(L.data));
    if (r.hist) scan(r.hist.data);
    if (r.range) {
      lo = r.range[0];
      hi = r.range[1];
    }
    if (!isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    if (r.zero) {
      const m = Math.max(Math.abs(lo), Math.abs(hi));
      lo = -m;
      hi = m;
    }
    if (r.fromZero) {
      lo = 0;
    }
    const pad = (hi - lo) * 0.12 || 1;
    if (!r.range) {
      if (!r.fromZero) lo -= pad;
      hi += pad;
    }
    const yy = (v) => p.y + 6 + ((hi - v) / (hi - lo || 1)) * (p.h - 14);
    c.save();
    c.beginPath();
    c.rect(0, p.y, this.plotW, p.h);
    c.clip();
    if (r.band) {
      c.fillStyle = "rgba(126,150,255,.06)";
      c.fillRect(0, yy(r.band[1]), this.plotW, yy(r.band[0]) - yy(r.band[1]));
    }
    (r.levels || []).forEach((L) => {
      c.strokeStyle = css("--grid");
      c.setLineDash([3, 3]);
      c.beginPath();
      c.moveTo(0, yy(L.v));
      c.lineTo(this.plotW, yy(L.v));
      c.stroke();
      c.setLineDash([]);
      /* 70 / 50 / 30 are the whole point of an RSI pane, so they get the
         readable text colour; only the middle guide is deliberately quiet. */
      c.fillStyle = css(L.faint ? "--txt3" : "--txt2");
      c.font = '9px "IBM Plex Mono",monospace';
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText(L.label, 2, yy(L.v) - 6);
    });
    if (r.zero && !r.range) {
      c.strokeStyle = css("--line2");
      c.beginPath();
      c.moveTo(0, yy(0));
      c.lineTo(this.plotW, yy(0));
      c.stroke();
    }
    if (r.hist) {
      const w = Math.max(1, Math.min(15, bw * 0.68));
      for (let i = Math.max(0, i0); i < Math.min(r.hist.data.length, i1); i++) {
        const v = r.hist.data[i];
        if (v == null) continue;
        const y0 = yy(Math.max(lo, Math.min(hi, 0))),
          y1 = yy(v);
        c.globalAlpha = 0.55;
        c.fillStyle = r.hist.colorBy
          ? r.hist.colorBy[i] === 1
            ? css("--up")
            : css("--dn")
          : base;
        c.fillRect(
          Math.round(this.x(i) - w / 2),
          Math.min(y0, y1),
          Math.round(w),
          Math.max(1, Math.abs(y1 - y0)),
        );
        c.globalAlpha = 1;
      }
    }
    (r.lines || []).forEach((L, k) => {
      c.save();
      c.beginPath();
      c.strokeStyle = L.color ? css(L.color) : k ? shade(base, k) : base;
      c.lineWidth = L.width || 1.3;
      if (L.dash) c.setLineDash(L.dash);
      let st = false;
      for (let i = Math.max(0, i0); i < Math.min(L.data.length, i1); i++) {
        const v = L.data[i];
        if (v == null) continue;
        const x = this.x(i),
          y = yy(v);
        st ? c.lineTo(x, y) : (c.moveTo(x, y), (st = true));
      }
      c.stroke();
      c.restore();
    });
    c.restore();
    /* pane axis labels */
    /* Decimals come from the pane's own span, not from the instrument.
       An RSI bounded 0–100 was printing its floor as "0.0000", borrowing
       five decimals from a currency pair it has nothing to do with. */
    c.fillStyle = css("--txt2");
    c.font = '9px "IBM Plex Mono",monospace';
    c.textAlign = "left";
    c.textBaseline = "middle";
    const pdp = paneDp(hi - lo);
    c.fillText(
      r.fmtInt ? compact(hi, true) : hi.toFixed(pdp),
      this.plotW + 7,
      p.y + 9,
    );
    c.fillText(
      r.fmtInt ? compact(lo, true) : lo.toFixed(pdp),
      this.plotW + 7,
      p.y + p.h - 9,
    );
    /* pane title with values at the cursor */
    const i =
      state.hover && state.hover.slot === this.slot
        ? clamp(state.hover.i, 0, d.length - 1)
        : d.length - 1;
    const vals = (r.lines || [])
      .map((L) =>
        L.data[i] != null ? L.name + " " + compact(L.data[i], r.fmtInt) : "",
      )
      .filter(Boolean)
      .join("  ");
    c.fillStyle = css("--txt2");
    c.font = '9.5px "IBM Plex Sans",sans-serif';
    c.textBaseline = "top";
    c.fillText(
      STUDIES[s.id].name + "  " + vals + (r.est ? "  · estimated" : ""),
      5,
      p.y + 4,
    );
    /* pane resize grip + remove */
    p.grip = { y: p.y };
  }
  /* Win rate by hour of entry, for this symbol, out of the journal.

     This pane used to seed itself from the symbol name and label the
     result "computed from your journal", which made it a lie with a
     citation. It now reads Store.trades and, when there is not enough
     history to say anything, says that instead of drawing a shape. */
  jwinPane(c, p) {
    const sym = this.cfg.sym;
    const rows = (window.Store ? Store.trades.list() : []).filter(
      (t) => t.symbol === sym,
    );
    const buckets = {};
    rows.forEach((t) => {
      const m = window.Store.compute ? Store.compute(t) : null;
      if (!m || m.net == null || !t.date) return;
      const h = new Date(t.date).getHours();
      if (!Number.isFinite(h)) return;
      (buckets[h] = buckets[h] || { n: 0, w: 0 }).n++;
      if (m.net > 0) buckets[h].w++;
    });
    const hours = Object.keys(buckets)
      .map(Number)
      .sort((a, b) => a - b)
      .map((h) => ({ h, wr: buckets[h].w / buckets[h].n, n: buckets[h].n }));
    const total = hours.reduce((a, o) => a + o.n, 0);

    c.save();
    c.fillStyle = css("--acc2");
    c.font = '9.5px "IBM Plex Sans",sans-serif';
    c.textAlign = "left";
    c.textBaseline = "top";

    if (total < 5) {
      c.fillText("Win rate by hour of entry · " + sym, 5, p.y + 4);
      c.fillStyle = css("--txt3");
      c.font = '10px "IBM Plex Sans",sans-serif';
      c.textBaseline = "middle";
      const msg = total
        ? `Only ${total} logged trade${total === 1 ? "" : "s"} on ${sym}. This fills in as you journal — five is enough for a first read.`
        : `No logged trades on ${sym} yet. Journal a few and your best and worst hours appear here.`;
      c.fillText(msg, 5, p.y + p.h / 2);
      c.restore();
      return;
    }

    c.fillText(
      `Win rate by hour of entry · ${sym} · ${total} logged trade${total === 1 ? "" : "s"}`,
      5,
      p.y + 4,
    );
    const w = this.plotW / hours.length;
    const hh =
      state.hover && state.hover.slot === this.slot && state.hover.t
        ? new Date(state.hover.t).getHours()
        : null;
    c.font = '9px "IBM Plex Mono",monospace';
    c.textAlign = "center";
    hours.forEach((o, i) => {
      const h = o.wr * (p.h - 30),
        x = i * w + w * 0.18,
        bwid = w * 0.64,
        on = hh === o.h;
      /* a two-trade hour is drawn faint: the bar should not look as
         certain as an hour with twenty trades behind it */
      const conf = Math.min(1, o.n / 8);
      const alpha = on ? 0.95 : 0.3 + conf * 0.35;
      c.fillStyle =
        o.wr >= 0.5 ? `rgba(34,192,138,${alpha})` : `rgba(240,82,77,${alpha})`;
      c.fillRect(x, p.y + p.h - 13 - h, bwid, h);
      c.fillStyle = on ? css("--txt") : css("--txt3");
      c.textBaseline = "top";
      c.fillText(o.h + ":00", x + bwid / 2, p.y + p.h - 12);
      if (on) {
        c.fillStyle = css("--txt");
        c.fillText(
          Math.round(o.wr * 100) + "% · " + o.n + (o.n < 5 ? " (thin)" : ""),
          x + bwid / 2,
          p.y + p.h - 24 - h,
        );
      }
    });
    const y50 = p.y + p.h - 13 - 0.5 * (p.h - 30);
    c.strokeStyle = css("--grid");
    c.setLineDash([3, 3]);
    c.beginPath();
    c.moveTo(0, y50);
    c.lineTo(this.plotW, y50);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }
  volProfile(c, d, i0, i1) {
    const bins = 44,
      lo = this.lo,
      hi = this.hi,
      step = (hi - lo) / bins,
      acc = [];
    for (let k = 0; k < bins; k++) acc.push(0);
    for (let i = Math.max(0, i0); i < Math.min(d.length, i1); i++) {
      const b = d[i],
        k0 = clamp(Math.floor((b.l - lo) / step), 0, bins - 1),
        k1 = clamp(Math.floor((b.h - lo) / step), 0, bins - 1);
      const share = b.v / Math.max(1, k1 - k0 + 1);
      for (let k = k0; k <= k1; k++) acc[k] += share;
    }
    const max = Math.max(...acc) || 1,
      wMax = this.plotW * 0.26;
    let poc = 0;
    acc.forEach((v, k) => {
      if (v > acc[poc]) poc = k;
    });
    const total = acc.reduce((a, b) => a + b, 0);
    let sum = acc[poc],
      lo_k = poc,
      hi_k = poc;
    while (sum < total * 0.7 && (lo_k > 0 || hi_k < bins - 1)) {
      const a = lo_k > 0 ? acc[lo_k - 1] : -1,
        b = hi_k < bins - 1 ? acc[hi_k + 1] : -1;
      if (b >= a) {
        hi_k++;
        sum += acc[hi_k];
      } else {
        lo_k--;
        sum += acc[lo_k];
      }
    }
    c.save();
    acc.forEach((v, k) => {
      const p0 = lo + k * step,
        y = this.y(p0 + step),
        h = Math.max(1, this.y(p0) - this.y(p0 + step) - 1);
      const w = (v / max) * wMax,
        inVA = k >= lo_k && k <= hi_k;
      c.fillStyle =
        k === poc
          ? "rgba(245,165,36,.55)"
          : inVA
            ? "rgba(126,150,255,.30)"
            : "rgba(159,176,206,.16)";
      c.fillRect(this.plotW - w, y, w, h);
    });
    c.fillStyle = css("--warn");
    c.font = '9px "IBM Plex Sans",sans-serif';
    c.textAlign = "right";
    c.textBaseline = "middle";
    c.fillText(
      "POC " + fmt(lo + (poc + 0.5) * step, this.cfg.sym),
      this.plotW - 4,
      this.y(lo + (poc + 0.5) * step),
    );
    c.fillStyle = css("--txt3");
    c.fillText(
      "Visible-range volume profile · 70% value area",
      this.plotW - 4,
      12,
    );
    c.restore();
  }
  poly(c, arr, i0, i1, col, w, dash, alpha) {
    c.save();
    c.beginPath();
    c.strokeStyle = col;
    c.lineWidth = w;
    if (dash) c.setLineDash(dash);
    if (alpha) c.globalAlpha = alpha;
    let st = false;
    for (let i = Math.max(0, i0); i < Math.min(arr.length, i1); i++) {
      if (arr[i] == null) continue;
      const x = this.x(i),
        y = this.y(arr[i]);
      st ? c.lineTo(x, y) : (c.moveTo(x, y), (st = true));
    }
    c.stroke();
    c.restore();
  }
  lastPrice(c, d, pw) {
    const b = d[d.length - 1];
    if (!b) return;
    const y = this.y(b.c),
      rising = b.c >= b.o,
      col = rising
        ? state.look.up || css("--up")
        : state.look.dn || css("--dn");
    c.save();
    c.setLineDash([3, 3]);
    c.strokeStyle = col;
    c.globalAlpha = 0.75;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(pw, y);
    c.stroke();
    c.restore();
    const cd = state.look.countdown ? barCountdown(this.cfg.iv) : null;
    const h = cd ? 26 : 16;
    c.fillStyle = col;
    c.fillRect(pw + 1, y - h / 2, AX - 2, h);
    c.fillStyle = "#fff";
    c.font = '600 10.5px "IBM Plex Mono",monospace';
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillText(fmt(b.c, this.cfg.sym), pw + 6, cd ? y - 5 : y);
    if (cd) {
      c.font = '9px "IBM Plex Mono",monospace';
      c.globalAlpha = 0.85;
      c.fillText(cd, pw + 6, y + 7);
      c.globalAlpha = 1;
    }
  }
  drawObj(c, o, ghost, sel) {
    const col = o.style && o.style.color ? o.style.color : css("--acc2");
    const pw = this.plotW,
      S = this.cfg.sym;
    const P = o.pts.map((q) => ({
      x: this.x(q.i),
      y: q.p == null ? 0 : this.y(q.p),
    }));
    c.save();
    c.globalAlpha = ghost ? 0.65 : 1;
    c.lineWidth = (o.style && o.style.width) || 1.5;
    const dsh = dashOf(o),
      st = o.style || {};
    c.strokeStyle = col;
    c.fillStyle = col;
    c.font = '10px "IBM Plex Sans",sans-serif';
    c.textBaseline = "middle";
    const tag = (x, y, s, bg, fg) => {
      const w = c.measureText(s).width + 10;
      c.fillStyle = bg;
      c.fillRect(x, y - 8, w, 16);
      c.fillStyle = fg;
      c.textAlign = "left";
      c.fillText(s, x + 5, y);
    };
    if (o.t === "hline") {
      const y = P[0].y;
      c.setLineDash(dsh);
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(pw, y);
      c.stroke();
      if (st.label !== false) tag(pw + 1, y, fmt(o.pts[0].p, S), col, "#fff");
      if (o.text) {
        c.setLineDash([]);
        c.fillStyle = col;
        c.textAlign = "left";
        c.fillText(o.text, 4, y - 8);
      }
    } else if (o.t === "vline") {
      const x = P[0].x;
      c.setLineDash(dashOf(o, [4, 3]));
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, this.axisY);
      c.stroke();
    } else if (
      o.t === "trend" ||
      o.t === "ray" ||
      o.t === "xline" ||
      o.t === "arrow" ||
      o.t === "measure"
    ) {
      let [a, b] = P;
      const dx0 = b.x - a.x,
        dy0 = b.y - a.y,
        k0 = 2000 / (Math.hypot(dx0, dy0) || 1);
      const extR = o.t === "ray" || o.t === "xline" || st.extendR,
        extL = o.t === "xline" || st.extendL;
      if (extR) b = { x: P[1].x + dx0 * k0, y: P[1].y + dy0 * k0 };
      if (extL) a = { x: P[0].x - dx0 * k0, y: P[0].y - dy0 * k0 };
      c.setLineDash(dsh);
      if (o.t === "measure") {
        c.setLineDash(dashOf(o, [4, 3]));
        c.strokeStyle = css("--warn");
        c.fillStyle = css("--warn");
      }
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      if (st.label && o.t !== "measure" && o.t !== "arrow") {
        const m = (b.y - a.y) / (b.x - a.x || 1e-6),
          yEdge = a.y + m * (pw - a.x);
        if (yEdge > 0 && yEdge < this.axisY) {
          c.setLineDash([]);
          tag(pw + 1, yEdge, fmt(this.py(yEdge), S), col, "#fff");
        }
      }
      if (o.text && o.t !== "measure") {
        c.setLineDash([]);
        c.fillStyle = col;
        c.textAlign = "left";
        c.fillText(o.text, P[0].x + 6, P[0].y - 9);
      }
      if (o.t === "arrow") {
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        c.setLineDash([]);
        c.beginPath();
        c.moveTo(b.x, b.y);
        c.lineTo(b.x - 9 * Math.cos(ang - 0.4), b.y - 9 * Math.sin(ang - 0.4));
        c.lineTo(b.x - 9 * Math.cos(ang + 0.4), b.y - 9 * Math.sin(ang + 0.4));
        c.closePath();
        c.fill();
      }
      if (o.t === "measure") {
        const bars = Math.abs(Math.round(o.pts[1].i - o.pts[0].i)),
          dp = o.pts[1].p - o.pts[0].p;
        const pct = (dp / o.pts[0].p) * 100,
          ticks = Math.abs(dp) / SYMBOLS[S].tick;
        const mins = (bars * IV_MS[this.cfg.iv]) / 6e4;
        const s = `${dp >= 0 ? "+" : "−"}${Math.abs(dp).toFixed(SYMBOLS[S].digits)}  ${ticks.toFixed(0)} ${SYMBOLS[S].tickName}  ${pct.toFixed(2)}%  ${bars} bars · ${fmtDur(mins)}`;
        c.font = '10px "IBM Plex Mono",monospace';
        const w = c.measureText(s).width + 12,
          mx = (P[0].x + P[1].x) / 2,
          my = (P[0].y + P[1].y) / 2;
        c.setLineDash([]);
        c.fillStyle = css("--surf2");
        c.fillRect(mx - w / 2, my - 26, w, 18);
        c.fillStyle = css("--warn");
        c.textAlign = "center";
        c.fillText(s, mx, my - 17);
      }
    } else if (o.t === "rect") {
      c.setLineDash(dsh);
      c.globalAlpha = (ghost ? 0.5 : 1) * fillA(o, 14);
      c.fillStyle = col;
      c.fillRect(P[0].x, P[0].y, P[1].x - P[0].x, P[1].y - P[0].y);
      c.globalAlpha = ghost ? 0.65 : 1;
      c.strokeRect(P[0].x, P[0].y, P[1].x - P[0].x, P[1].y - P[0].y);
      if (o.text) {
        c.setLineDash([]);
        c.fillStyle = col;
        c.textAlign = "left";
        c.fillText(
          o.text,
          Math.min(P[0].x, P[1].x) + 5,
          Math.min(P[0].y, P[1].y) - 9,
        );
      }
    } else if (o.t === "prange") {
      const dp = o.pts[1].p - o.pts[0].p,
        pct = (dp / o.pts[0].p) * 100;
      const ticks = Math.abs(dp) / SYMBOLS[S].tick;
      c.setLineDash([]);
      c.globalAlpha = 0.12;
      c.fillStyle = dp >= 0 ? css("--up") : css("--dn");
      c.fillRect(P[0].x, P[0].y, P[1].x - P[0].x, P[1].y - P[0].y);
      c.globalAlpha = 1;
      c.strokeStyle = dp >= 0 ? css("--up") : css("--dn");
      c.strokeRect(P[0].x, P[0].y, P[1].x - P[0].x, P[1].y - P[0].y);
      c.font = '10px "IBM Plex Mono",monospace';
      tag(
        Math.min(P[0].x, P[1].x),
        (P[0].y + P[1].y) / 2,
        `${dp >= 0 ? "+" : "−"}${Math.abs(dp).toFixed(SYMBOLS[S].digits)} · ${ticks.toFixed(0)} ${SYMBOLS[S].tickName} · ${pct.toFixed(2)}%`,
        css("--surf2"),
        dp >= 0 ? css("--up") : css("--dn"),
      );
    } else if (o.t === "channel") {
      const off = P[2] ? P[2].y - P[1].y : 0;
      c.setLineDash(dsh);
      c.globalAlpha = fillA(o, 10);
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(P[0].x, P[0].y);
      c.lineTo(P[1].x, P[1].y);
      c.lineTo(P[1].x, P[1].y + off);
      c.lineTo(P[0].x, P[0].y + off);
      c.closePath();
      c.fill();
      c.globalAlpha = ghost ? 0.65 : 1;
      c.beginPath();
      c.moveTo(P[0].x, P[0].y);
      c.lineTo(P[1].x, P[1].y);
      c.stroke();
      c.beginPath();
      c.moveTo(P[0].x, P[0].y + off);
      c.lineTo(P[1].x, P[1].y + off);
      c.stroke();
    } else if (o.t === "fib" || o.t === "fibext") {
      const a = o.pts[0].p,
        b = o.pts[1].p;
      const anchor = o.t === "fibext" && o.pts[2] ? o.pts[2].p : null;
      const x1 = Math.min(P[0].x, P[1].x),
        x2 = pw - 46;
      FIBS.forEach((l) => {
        const p = anchor != null ? anchor + (b - a) * l : a + (b - a) * l,
          y = this.y(p);
        c.strokeStyle = l === 0 || l === 1 ? "rgba(159,176,206,.8)" : col;
        c.globalAlpha = (ghost ? 0.6 : 1) * (l === 0 || l === 1 ? 1 : 0.7);
        c.setLineDash(l === 0 || l === 1 ? [] : dashOf(o, [5, 4]));
        c.beginPath();
        c.moveTo(x1, y);
        c.lineTo(x2, y);
        c.stroke();
        c.globalAlpha = 1;
        c.fillStyle = css("--txt2");
        c.textAlign = "right";
        c.font = '9.5px "IBM Plex Mono",monospace';
        c.fillText(
          l.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + "  " + fmt(p, S),
          x2 - 4,
          y - 6,
        );
      });
    } else if (o.t === "text") {
      c.font = (st.font || 11) + 'px "IBM Plex Sans",sans-serif';
      const s = o.text || "Note",
        x = P[0].x,
        y = P[0].y,
        w = c.measureText(s).width + 12;
      const th = (st.font || 11) + 7;
      c.setLineDash([]);
      c.globalAlpha = fillA(o, 16);
      c.fillStyle = col;
      c.fillRect(x, y - th / 2, w, th);
      c.globalAlpha = 1;
      c.strokeStyle = col;
      c.strokeRect(x + 0.5, y - th / 2 + 0.5, w, th - 1);
      c.fillStyle = css("--txt");
      c.textAlign = "left";
      c.fillText(s, x + 6, y);
    } else if (typeof SHAPES !== "undefined" && SHAPES[o.t]) {
      /* Everything added after the original fourteen lives in
         assets/charts-shapes.js. See the header there for the contract. */
      SHAPES[o.t](this, c, o, P, {
        col,
        st,
        dsh,
        tag,
        S,
        pw,
        ghost,
        sel,
      });
    }
    /* selection handles */
    if (sel && !ghost) {
      c.setLineDash([]);
      c.globalAlpha = 1;
      o.pts.forEach((q, k) => {
        const x = o.t === "hline" ? pw * 0.5 : this.x(q.i),
          y = q.p == null ? this.axisY / 2 : this.y(q.p);
        c.fillStyle = css("--bg");
        c.strokeStyle = o.locked ? css("--txt3") : css("--acc");
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(x, y, 4.5, 0, 7);
        c.fill();
        c.stroke();
      });
    }
    c.restore();
  }
  posTool(c) {
    const P = state.pos,
      S = SYMBOLS[this.cfg.sym],
      pw = this.plotW;
    const xs = Math.max(20, this.plotW * 0.42),
      ye = this.y(P.entry),
      ys = this.y(P.stop),
      yt = this.y(P.target);
    const up = css("--up"),
      dn = css("--dn");
    c.save();
    c.fillStyle = "rgba(34,192,138,.14)";
    c.fillRect(xs, Math.min(ye, yt), pw - xs, Math.abs(yt - ye));
    c.fillStyle = "rgba(240,82,77,.16)";
    c.fillRect(xs, Math.min(ye, ys), pw - xs, Math.abs(ys - ye));
    c.lineWidth = 1.5;
    c.font = '10px "IBM Plex Sans",sans-serif';
    c.textBaseline = "middle";
    const tight = this.W < 560;
    const rows = tight
      ? [
          [yt, up, P.calc.r.toFixed(2) + "R"],
          [ye, css("--txt"), P.calc.size + " " + S.unit],
          [ys, dn, money(P.calc.risk)],
        ]
      : [
          [
            yt,
            up,
            "TARGET " +
              fmt(P.target, this.cfg.sym) +
              "  " +
              P.calc.r.toFixed(2) +
              "R",
          ],
          [
            ye,
            css("--txt"),
            "ENTRY " +
              fmt(P.entry, this.cfg.sym) +
              "  " +
              P.calc.size +
              " " +
              S.unit,
          ],
          [
            ys,
            dn,
            "STOP " +
              fmt(P.stop, this.cfg.sym) +
              "  " +
              state.risk.pct.toFixed(1) +
              "% = " +
              money(P.calc.risk),
          ],
        ];
    rows.forEach(([y, col, label]) => {
      c.strokeStyle = col;
      c.setLineDash(col === css("--txt") ? [] : [4, 3]);
      c.beginPath();
      c.moveTo(xs, y);
      c.lineTo(pw, y);
      c.stroke();
      const w = c.measureText(label).width + 10;
      c.setLineDash([]);
      c.fillStyle = col;
      c.fillRect(pw - w - 2, y - 8, w, 16);
      c.fillStyle = col === css("--txt") ? css("--bg") : "#04120C";
      c.textAlign = "left";
      c.fillText(label, pw - w + 3, y);
    });
    if (P.calc.over) {
      const s = "over your " + state.risk.pct.toFixed(1) + "% rule";
      const w = c.measureText(s).width + 12;
      c.fillStyle = css("--warn");
      c.fillRect(xs, Math.min(ye, ys) - 20, w, 16);
      c.fillStyle = "#1A1204";
      c.textAlign = "left";
      c.fillText(s, xs + 6, Math.min(ye, ys) - 12);
    }
    c.restore();
  }
  tradeLayer(c, d, i0, i1) {
    const trades = state.journal.filter((j) => j.sym === this.cfg.sym);
    c.save();
    c.font = '9.5px "IBM Plex Mono",monospace';
    c.textBaseline = "middle";
    trades.forEach((j) => {
      const iEntry = d.length - 1 + j.bar;
      if (iEntry < i0 - 4 || iEntry > i1) return;
      const iExit = Math.min(d.length - 1, iEntry + 14);
      const b = d[iEntry];
      if (!b) return;
      const pe = j.dir === "long" ? b.l : b.h,
        be = d[iExit];
      const pex = be.c,
        col = j.r >= 0 ? css("--up") : css("--dn");
      const x1 = this.x(iEntry),
        y1 = this.y(pe),
        x2 = this.x(iExit),
        y2 = this.y(pex);
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = 1.2;
      c.setLineDash([3, 3]);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
      c.setLineDash([]);
      c.beginPath();
      if (j.dir === "long") {
        c.moveTo(x1, y1 + 2);
        c.lineTo(x1 - 4, y1 + 9);
        c.lineTo(x1 + 4, y1 + 9);
      } else {
        c.moveTo(x1, y1 - 2);
        c.lineTo(x1 - 4, y1 - 9);
        c.lineTo(x1 + 4, y1 - 9);
      }
      c.closePath();
      c.fill();
      const s =
        (j.r >= 0 ? "+" : "−") +
        Math.abs(j.r).toFixed(1) +
        "R" +
        (j.ok ? "" : " ⚑");
      const w = c.measureText(s).width + 8;
      c.fillStyle = css("--bg");
      c.globalAlpha = 0.9;
      c.fillRect(x2 + 4, y2 - 8, w, 16);
      c.globalAlpha = 1;
      c.fillStyle = col;
      c.textAlign = "left";
      c.fillText(s, x2 + 8, y2);
    });
    c.restore();
  }
  alertLines(c, pw) {
    state.alerts
      .filter((a) => a.on && a.px && a.sym === this.cfg.sym)
      .forEach((a) => {
        const y = this.y(a.px);
        c.save();
        c.strokeStyle = a.fired ? css("--txt3") : css("--warn");
        c.setLineDash([2, 4]);
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(pw, y);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = a.fired ? css("--txt3") : css("--warn");
        c.font = '9px "IBM Plex Sans",sans-serif';
        c.textAlign = "left";
        c.textBaseline = "middle";
        c.fillText(
          (a.fired ? "⏰ fired · " : "⏰ ") + fmt(a.px, this.cfg.sym),
          4,
          y - 8,
        );
        c.restore();
      });
  }
  crosshair(c) {
    const h = state.hover;
    if (!h) return;
    const shared = h.slot !== this.slot;
    if (shared && !state.look.syncCross) return;
    let x = null;
    if (shared) {
      if (state.charts[h.slot].iv !== this.cfg.iv || !h.t) return;
      const { d } = this.bars();
      const i = d.findIndex((b) => b.t === h.t);
      if (i < 0) return;
      x = this.x(i);
    } else x = h.x;
    if (state.look.cross === "bar") {
      const { n } = this.bars();
      x = this.x(Math.round(this.ix(x)));
    }
    /* The cursor group in the rail picks how the pointer reads the chart.
       "cross" is the full reticle; "dot" marks the point without the lines,
       which is what you want when the lines are hiding a drawing you are
       trying to place; "arrow" drops the reticle entirely and leaves only
       the axis labels. All three still report price and time, because a
       cursor that tells you nothing is not a cursor mode. */
    const cur = state.look.cursor || "cross";
    c.save();
    c.strokeStyle = "rgba(159,176,206,.45)";
    c.setLineDash([3, 3]);
    c.lineWidth = 1;
    if (cur === "cross") {
      c.beginPath();
      c.moveTo(Math.round(x) + 0.5, 0);
      c.lineTo(Math.round(x) + 0.5, this.axisY);
      c.stroke();
    }
    if (!shared) {
      if (cur === "cross") {
        c.beginPath();
        c.moveTo(0, Math.round(h.y) + 0.5);
        c.lineTo(this.plotW, Math.round(h.y) + 0.5);
        c.stroke();
      } else if (cur === "dot") {
        c.setLineDash([]);
        c.fillStyle = css("--acc");
        c.beginPath();
        c.arc(x, h.y, 3.5, 0, 7);
        c.fill();
        c.setLineDash([3, 3]);
      }
      if (h.y < this.panes.price.y + this.panes.price.h) {
        const pr = this.py(h.y);
        c.setLineDash([]);
        c.fillStyle = css("--surf2");
        c.fillRect(this.plotW + 1, h.y - 8, AX - 2, 16);
        c.fillStyle = css("--txt");
        c.font = '10px "IBM Plex Mono",monospace';
        c.textAlign = "left";
        c.textBaseline = "middle";
        c.fillText(
          this.sc.mode === "pct"
            ? ((pr / this.base - 1) * 100).toFixed(2) + "%"
            : fmt(pr, this.cfg.sym),
          this.plotW + 5,
          h.y,
        );
      }
    }
    if (h.t) {
      c.setLineDash([]);
      c.font = '9.5px "IBM Plex Mono",monospace';
      const s = clock(h.t),
        w = c.measureText(s).width + 16;
      c.fillStyle = css("--surf2");
      c.fillRect(
        Math.min(this.plotW - w, Math.max(0, x - w / 2)),
        this.axisY + 2,
        w,
        TX - 4,
      );
      c.fillStyle = css("--txt2");
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(
        s,
        Math.min(this.plotW - w / 2, Math.max(w / 2, x)),
        this.axisY + TX / 2,
      );
    }
    c.restore();
  }
  legend(d) {
    const S = SYMBOLS[this.cfg.sym],
      blind = state.replay.on && state.replay.blind;
    const i =
      state.hover && state.hover.slot === this.slot
        ? clamp(state.hover.i, 0, d.length - 1)
        : d.length - 1;
    const b = d[i] || d[d.length - 1],
      prev = d[i - 1] || b,
      ch = b.c - prev.c,
      pct = (ch / prev.c) * 100;
    const cls = ch >= 0 ? "up" : "dn";
    /* The legend floats over the candles, so its height is not free: it grows a
       row per study and at five it was reaching down into the price action and
       sitting on the position tool's entry and stop badges. Past LEG_MAX it
       collapses to a count you click to open, which is what a terminal does
       once a chart is loaded up. Collapsed is the default because the reason to
       add a sixth study is rarely to read its number off the legend. */
    const LEG_MAX = 4;
    const many = this.studies.length > LEG_MAX;
    const shown = many && !this.legOpen ? [] : this.studies;
    const chips = shown
      .map((s) => {
        const S2 = STUDIES[s.id],
          r = this.study(s);
        let v = "";
        if (r && r.lines && r.lines.length)
          v = r.lines
            .map((L) =>
              L.data[i] != null
                ? compact(L.data[i], r.fmtInt, studyDigits(S2, this.cfg.sym))
                : "",
            )
            .filter(Boolean)
            .slice(0, 3)
            .join(" / ");
        /* The swatch and the reading are separate elements. They were both
           `<i>` once, which left the study's value rendered inside a 7px
           square and spilling out of it. */
        return `<span class="lchip ${s.visible ? "" : "off"}" data-uid="${s.uid}" style="color:${css(s.color) || s.color}">
        <i class="lsw"></i><span class="lnm">${S2.name}${paramTag(s)}</span>${v ? `<span class="lval">${v}</span>` : ""}
        <button data-act="eye" title="${s.visible ? "Hide" : "Show"}">${s.visible ? "◉" : "◎"}</button>
        <button data-act="cfg" title="Settings">⚙</button>
        <button data-act="del" title="Remove">✕</button></span>`;
      })
      .join("") +
      (many
        ? `<button class="lchip lmore" data-act="more" title="${
            this.legOpen
              ? "Collapse the study legend"
              : "Show every study on this chart"
          }">${
            this.legOpen
              ? "fewer ▴"
              : `${this.studies.length} studies ▾`
          }</button>`
        : "");
    const cmp = [...state.compare]
      .map(
        (s, k) =>
          `<span class="lchip" style="color:${[css("--i4"), css("--i5")][k % 2]}">${s} compare</span>`,
      )
      .join("");
    this.leg.innerHTML = `
      <div class="leg-1"><span class="leg-sym">${blind ? "······" : this.cfg.sym}</span><span class="leg-int">${this.cfg.iv} · ${blind ? "hidden in blind mode" : S.venue}</span>
        <span class="${cls} mono">${ch >= 0 ? "+" : "−"}${Math.abs(ch).toFixed(S.digits)} (${ch >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%)</span></div>
      <div class="leg-o"><span>O <b>${fmt(b.o, this.cfg.sym)}</b></span><span>H <b>${fmt(b.h, this.cfg.sym)}</b></span>
        <span>L <b>${fmt(b.l, this.cfg.sym)}</b></span><span>C <b class="${cls}">${fmt(b.c, this.cfg.sym)}</b></span>
        <span>V <b>${compact(b.v, true)}</b></span></div>
      ${this.quoteBadge(b, S, blind)}
      <div class="leg-i">${chips}${cmp}${
        this.hiddenPanes > 0
          ? `<span class="lchip warn" title="Make the chart taller, or turn a study off, to see them.">${this.hiddenPanes} pane${this.hiddenPanes === 1 ? "" : "s"} hidden — not enough height</span>`
          : ""
      }</div>`;
    /* Not `.lchip [data-act]`: the collapse toggle carries the action on the
       chip itself rather than on a button inside one. */
    this.leg.querySelectorAll("[data-act]").forEach(
      (btn) =>
        (btn.onclick = (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          /* The collapse toggle is a chip in the same row but belongs to no
             study, so it is handled before anything looks for a uid. */
          if (act === "more") {
            this.legOpen = !this.legOpen;
            this.legend(d);
            return;
          }
          const uid = btn.closest(".lchip").dataset.uid;
          const s = this.studies.find((x) => x.uid === uid);
          if (!s) return;
          if (act === "eye") {
            s.visible = !s.visible;
          }
          if (act === "del") {
            pushUndo();
            this.cfg.studies = this.studies.filter((x) => x.uid !== uid);
            paintIndCount();
          }
          if (act === "cfg") {
            openStudyCfg(this.slot, uid);
            return;
          }
          draw();
        }),
    );
  }
  /* Bid and ask either side of the last close, with the spread between them.

     Returned as a legend row rather than floated over the chart. Floating it
     was the first attempt and it landed on top of the indicator chips,
     because the legend grows a line per study and an absolute `top` cannot
     know how tall it has become. In the flow it stacks.

     The spread is the one in the feed for this symbol, not a decoration: it
     is the same number the position panel charges against risk, so the badge
     and the "spread is 5.2% of risk" line cannot disagree. Half goes each
     side of the mid, the convention a broker quote follows.

     The unit rides on the number — pips on a pair, points on an index —
     because a bare "165.0" between two prices does not say what it counts.

     Gone in blind mode with every other price, and gone during replay, where
     there is no current market to be bid or offered in. */
  quoteBadge(b, S, blind) {
    if (
      blind ||
      state.replay.on ||
      this.W < 520 ||
      state.look.quoteBadge === false
    )
      return "";
    const half = (S.spread * S.tick) / 2;
    return (
      `<div class="leg-q">` +
      `<span class="qb-s" title="Bid — what you sell at">${fmt(b.c - half, this.cfg.sym)}<i>sell</i></span>` +
      `<span class="qb-m" title="The spread on ${S.venue}, half either side of the last close">${S.spread.toFixed(1)}<i>${S.tickName}</i></span>` +
      `<span class="qb-b" title="Ask — what you buy at">${fmt(b.c + half, this.cfg.sym)}<i>buy</i></span>` +
      `</div>`
    );
  }
  badges() {
    const R = state.replay,
      marks = this.drw.length;
    if (this.W < 520) {
      this.bdg.innerHTML = "";
      return;
    }
    this.bdg.innerHTML =
      (R.on
        ? `<span class="bdg rep">Replay ${R.blind ? "· blind" : ""}</span>`
        : `<span class="bdg live">Live · simulated</span>`) +
      (marks
        ? `<span class="bdg">${marks} drawing${marks > 1 ? "s" : ""}</span>`
        : "") +
      (this.cfg.vp ? `<span class="bdg">Volume profile</span>` : "") +
      `<span class="bdg">${this.cfg.iv}</span>`;
  }
  dataWindow(d) {
    /* The window floats over the candles, so it needs a chart wide enough to
        spare the room. Below that it hides rather than cover the price. */
    if (!state.look.dataWin || this.W < 760) {
      this.dw.innerHTML = "";
      this.dw.hidden = true;
      return;
    }
    this.dw.hidden = false;
    const i =
      state.hover && state.hover.slot === this.slot
        ? clamp(state.hover.i, 0, d.length - 1)
        : d.length - 1;
    const b = d[i],
      prev = d[i - 1] || b,
      S = SYMBOLS[this.cfg.sym];
    const rows = [
      ["Time", b ? clock(b.t) : "—"],
      ["Open", fmt(b.o, this.cfg.sym)],
      ["High", fmt(b.h, this.cfg.sym)],
      ["Low", fmt(b.l, this.cfg.sym)],
      ["Close", fmt(b.c, this.cfg.sym)],
      [
        "Change",
        (b.c >= prev.c ? "+" : "−") +
          Math.abs(b.c - prev.c).toFixed(S.digits) +
          "  " +
          ((b.c / prev.c - 1) * 100).toFixed(2) +
          "%",
      ],
      ["Range", (Math.abs(b.h - b.l) / S.tick).toFixed(0) + " " + S.tickName],
      ["Volume", compact(b.v, true)],
    ];
    /* A line is usually already named after its study, so joining the two
       produced "EMA EMA 21" and "RSI RSI 14" down the whole window. */
    const rowName = (study, line) => {
      const n = STUDIES[study.id].name;
      return line.indexOf(n) === 0 ? line : n + " " + line;
    };
    this.studies
      .filter((s) => s.visible)
      .forEach((s) => {
        const r = this.study(s);
        if (!r) return;
        const sd = studyDigits(STUDIES[s.id], this.cfg.sym);
        (r.lines || []).forEach((L) => {
          if (L.data[i] != null)
            rows.push([rowName(s, L.name), compact(L.data[i], r.fmtInt, sd)]);
        });
        if (r.hist && r.hist.data[i] != null)
          rows.push([
            rowName(s, r.hist.name),
            compact(r.hist.data[i], r.fmtInt, sd),
          ]);
      });
    this.dw.innerHTML =
      `<div class="dw-h">Data window<button data-dwclose title="Hide">✕</button></div>` +
      rows
        .map(([k, v]) => `<div class="dw-r"><span>${k}</span><b>${v}</b></div>`)
        .join("");
    const x = this.dw.querySelector("[data-dwclose]");
    if (x)
      x.onclick = (e) => {
        e.stopPropagation();
        state.look.dataWin = false;
        draw();
      };
  }
  axisButtons() {
    const m = this.sc.mode;
    this.scaleBtns.innerHTML =
      `<button data-m="normal" class="${m === "normal" ? "on" : ""}" title="Regular price scale">A</button>` +
      `<button data-m="log" class="${m === "log" ? "on" : ""}" title="Logarithmic">L</button>` +
      `<button data-m="pct" class="${m === "pct" ? "on" : ""}" title="Percent from the left edge">%</button>` +
      `<button data-inv class="${this.sc.invert ? "on" : ""}" title="Invert the scale — read the chart upside down as a bias check">⇅</button>` +
      `<button data-fit title="Fit the visible data (double-click the chart)">⤢</button>`;
    this.scaleBtns.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          if (b.dataset.fit !== undefined) {
            this.fit();
          } else if (b.dataset.inv !== undefined) {
            this.sc.invert = !this.sc.invert;
            this.axisButtons();
          } else {
            this.sc.mode = b.dataset.m;
            this.sc.factor = 1;
            this.sc.offset = 0;
          }
          draw();
        }),
    );
  }
}

/* ── small helpers used by the chart ───────────────────────── */
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1,
    l = dx * dx + dy * dy;
  const t = l
    ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l))
    : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function niceTicks(lo, hi, count) {
  const raw = (hi - lo) / Math.max(1, count),
    mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1))),
    norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag,
    out = [];
  for (
    let v = Math.ceil(lo / step) * step;
    v < hi && out.length < 40;
    v += step
  )
    out.push(v);
  return out;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* How many decimals a pane axis needs to tell its two ends apart. */
function paneDp(span) {
  const s = Math.abs(span);
  if (!isFinite(s) || s === 0) return 2;
  if (s >= 20) return 0;
  if (s >= 2) return 1;
  if (s >= 0.2) return 2;
  if (s >= 0.02) return 3;
  return 4;
}
/* How many decimals a study's reading deserves.

   A study drawn on the price axis is a price and must carry the symbol's
   digits, or a moving average on EURUSD reads 1.08 against candles quoted to
   five. A study in its own pane is not a price — an RSI rendered at a pair's
   five decimals is "47.02462", which is five digits of noise on a number
   nobody reads past the decimal point. Passing null lets `compact` pick a
   precision from the magnitude instead. */
function studyDigits(S, sym) {
  return S && S.where === "sub" ? null : SYMBOLS[sym].digits;
}
function compact(v, int, digits) {
  if (v == null || isNaN(v)) return "—";
  if (int) {
    const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(1) + "k";
    return v.toFixed(0);
  }
  const a = Math.abs(v);
  return v.toFixed(
    digits != null ? digits : a < 1 ? 4 : a < 100 ? 2 : a < 1e4 ? 2 : 1,
  );
}
function shade(col, k) {
  const alpha = [1, 0.72, 0.5][k % 3];
  if (col.startsWith("#")) {
    const n = parseInt(col.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  return col;
}
function paramTag(s) {
  const p = s.params,
    keys = ["length", "fast", "slow", "signal", "mult", "k", "d"];
  const v = keys
    .filter((k) => p[k] != null)
    .map((k) => p[k])
    .join(" ");
  return v ? " " + v : "";
}
/* ── drawing style ──────────────────────────────────────────────
   Every drawing carries its own style object. `state.drawStyle` holds
   the defaults new drawings inherit, so the settings dialog can both
   restyle one object and change what the next one looks like. */
const DASHES = { solid: [], dash: [6, 4], dot: [2, 3] };
const DRAW_STYLE_DEFAULTS = {
  color: "#7E96FF",
  width: 1.5,
  dash: "solid",
  fill: 12,
  extendR: false,
  extendL: false,
  label: true,
  font: 11,
};
function drawStyle(over) {
  const base =
    typeof state !== "undefined" && state.drawStyle
      ? state.drawStyle
      : DRAW_STYLE_DEFAULTS;
  return Object.assign(
    {},
    DRAW_STYLE_DEFAULTS,
    base,
    { color: (base && base.color) || state.drawColor },
    over || {},
  );
}
function dashOf(o, fallback) {
  const d = o.style && o.style.dash;
  if (!d) return fallback || [];
  return DASHES[d] || [];
}
function fillA(o, def) {
  const f = o.style && o.style.fill;
  return (f == null ? (def != null ? def : 12) : f) / 100;
}

function fmtDur(mins) {
  if (mins < 60) return Math.round(mins) + "m";
  if (mins < 1440) return (mins / 60).toFixed(1) + "h";
  return (mins / 1440).toFixed(1) + "d";
}
function barCountdown(iv) {
  const ms = IV_MS[iv],
    left = ms - (Date.now() % ms),
    s = Math.floor(left / 1000);
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}
