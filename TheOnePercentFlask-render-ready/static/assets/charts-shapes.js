/* charts-shapes.js — the second half of the drawing toolbox.
   ---------------------------------------------------------------------------
   charts-engine.js owns the original fourteen shapes inside `drawObj`'s
   if/else chain. Rather than grow that chain to sixty branches, everything
   added after it lives here in a dispatch table: `drawObj` falls through to
   `SHAPES[o.t]` when it doesn't recognise a type.

   A renderer is `(ch, c, o, P, H) => void`:
     ch  the Chart instance — `ch.x(i)`, `ch.y(price)`, `ch.plotW`, `ch.axisY`
     c   the 2D context, already saved/restored and styled by the caller
     o   the object: `{id, t, pts:[{i,p}], style, text, locked, hidden}`
     P   `o.pts` already projected to `{x, y}` screen pixels
     H   `{col, st, dsh, tag, S, pw, ghost, sel}` from the caller

   Everything here is loaded as a classic script AFTER charts-engine.js, so
   `DRAW`, `css`, `fmt` and friends resolve from the shared global lexical
   scope at call time. `Object.assign(DRAW, …)` is why the tools exist at all:
   the engine reads point counts and key bindings out of that one table.

   The rule this file keeps: no tool is listed that does not draw. A menu of
   eighty names where fifty do nothing is worse than a menu of thirty that
   all work — the same honesty rule the rest of the page follows about
   demo data and estimated numbers. */

/* ── the tools ─────────────────────────────────────────────────── */

Object.assign(DRAW, {
  /* lines */
  infoline: { name: "Info line", pts: 2, key: "" },
  trendangle: { name: "Trend angle", pts: 2, key: "" },
  hray: { name: "Horizontal ray", pts: 2, key: "" },
  crossline: { name: "Cross line", pts: 1, key: "" },

  /* channels */
  regression: { name: "Regression trend", pts: 2, key: "" },
  flatchannel: { name: "Flat top / bottom", pts: 3, key: "" },

  /* pitchfork */
  pitchfork: { name: "Pitchfork", pts: 3, key: "" },

  /* fibonacci */
  fibchannel: { name: "Fib channel", pts: 3, key: "" },
  fibtime: { name: "Fib time zone", pts: 2, key: "" },
  fibfan: { name: "Fib speed resistance fan", pts: 2, key: "" },
  fibcircle: { name: "Fib circles", pts: 2, key: "" },

  /* gann */
  gannbox: { name: "Gann box", pts: 2, key: "" },
  gannfan: { name: "Gann fan", pts: 2, key: "" },

  /* shapes */
  ellipse: { name: "Ellipse", pts: 2, key: "" },
  triangle: { name: "Triangle", pts: 3, key: "" },
  brush: { name: "Brush", pts: 0, key: "B", free: true },
  highlighter: { name: "Highlighter", pts: 0, key: "", free: true },

  /* annotations */
  callout: { name: "Callout", pts: 2, key: "" },
  pricelabel: { name: "Price label", pts: 1, key: "" },
  flag: { name: "Flag mark", pts: 1, key: "" },

  /* measure */
  drange: { name: "Date range", pts: 2, key: "" },
  dprange: { name: "Date and price range", pts: 2, key: "" },

  /* trading — these two were in the rail but never in DRAW, so the
     mousedown handler bailed out on `if (!def) return` and dragging the
     position tool silently did nothing. It only ever worked from the
     right-click menu. `railAudit()` exists so that class of hole is caught
     at load instead of by a user. */
  position: { name: "Long position", pts: 2, key: "P" },
  shortpos: { name: "Short position", pts: 2, key: "" },

  /* patterns */
  abcd: { name: "ABCD pattern", pts: 4, key: "" },
  xabcd: { name: "XABCD pattern", pts: 5, key: "" },
  elliott: { name: "Elliott impulse wave", pts: 6, key: "" },
  headshoulders: { name: "Head and shoulders", pts: 5, key: "" },
});

/* Shapes whose hit area is their bounding box rather than a line. The
   engine's `nearest()` consults this instead of its old hard-coded list. */
const SHAPE_BOXY = new Set([
  "ellipse",
  "gannbox",
  "fibcircle",
  "dprange",
  "drange",
  "fibchannel",
  "callout",
  "regression",
  "fibtime",
]);

/* Freehand tools collect points as the pointer moves instead of taking a
   fixed number of clicks. */
const SHAPE_FREE = new Set(["brush", "highlighter"]);

/* ── helpers ───────────────────────────────────────────────────── */

const GANN_RATIOS = [
  [1, 8],
  [1, 4],
  [1, 3],
  [1, 2],
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [8, 1],
];
const FIB_TIME = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55];
const FIB_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786, 1];

function shapeLabel(c, x, y, text, bg, fg, align) {
  c.save();
  c.font = '9.5px "IBM Plex Mono",monospace';
  c.textBaseline = "middle";
  const w = c.measureText(text).width + 9;
  const x0 = align === "right" ? x - w : x;
  c.fillStyle = bg;
  c.fillRect(x0, y - 8, w, 16);
  c.fillStyle = fg;
  c.textAlign = "left";
  c.fillText(text, x0 + 4.5, y);
  c.restore();
}

/* Price difference described three ways, the way the measure tool does it,
   because a number of ticks means nothing without the percent beside it. */
function deltaText(o, sym, a, b) {
  const S = SYMBOLS[sym];
  const dp = b - a;
  const ticks = Math.abs(dp) / S.tick;
  const pct = a ? (dp / a) * 100 : 0;
  return `${dp >= 0 ? "+" : "−"}${Math.abs(dp).toFixed(S.digits)}  ${ticks.toFixed(0)} ${S.tickName}  ${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%`;
}

function barsText(o) {
  const n = Math.abs(Math.round(o.pts[1].i - o.pts[0].i));
  return n + (n === 1 ? " bar" : " bars");
}

function lineThrough(c, x1, y1, x2, y2, w, h) {
  /* Extend a segment to the full plot width — used by the fans, which are
     defined by an origin and one point but drawn to the edge. */
  const dx = x2 - x1,
    dy = y2 - y1;
  if (!dx && !dy) return;
  const t = dx === 0 ? Infinity : (w - x1) / dx;
  const ex = dx === 0 ? x1 : w;
  const ey = dx === 0 ? (dy > 0 ? h : 0) : y1 + dy * t;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(ex, ey);
  c.stroke();
}

/* ── renderers ─────────────────────────────────────────────────── */

const SHAPES = {
  /* ---- lines ---- */

  /* A trend line that shows what it measures. TradingView's info line
     prints price delta, bar count and angle along the segment. */
  infoline(ch, c, o, P, H) {
    c.setLineDash(H.dsh);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(P[1].x, P[1].y);
    c.stroke();
    [P[0], P[1]].forEach((p) => {
      c.beginPath();
      c.arc(p.x, p.y, 2.5, 0, 7);
      c.fill();
    });
    const mid = { x: (P[0].x + P[1].x) / 2, y: (P[0].y + P[1].y) / 2 };
    const txt = deltaText(o, H.S, o.pts[0].p, o.pts[1].p) + "  " + barsText(o);
    shapeLabel(c, mid.x + 8, mid.y - 12, txt, css("--surf2"), css("--txt"));
  },

  /* The angle is in screen space on purpose: it is what the trader sees,
     and price-vs-time has no intrinsic angle without a fixed aspect. */
  trendangle(ch, c, o, P, H) {
    c.setLineDash(H.dsh);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(P[1].x, P[1].y);
    c.stroke();
    c.save();
    c.setLineDash([3, 3]);
    c.globalAlpha = 0.5;
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(P[0].x + 70, P[0].y);
    c.stroke();
    c.restore();
    const deg = (Math.atan2(P[0].y - P[1].y, P[1].x - P[0].x) * 180) / Math.PI;
    const r = 34;
    c.save();
    c.globalAlpha = 0.8;
    c.beginPath();
    c.arc(
      P[0].x,
      P[0].y,
      r,
      deg > 0 ? -(deg * Math.PI) / 180 : 0,
      deg > 0 ? 0 : -(deg * Math.PI) / 180,
    );
    c.stroke();
    c.restore();
    shapeLabel(
      c,
      P[0].x + r + 4,
      P[0].y - 10,
      deg.toFixed(1) + "°",
      css("--surf2"),
      css("--txt"),
    );
  },

  /* Flat from the first point, rightward only. */
  hray(ch, c, o, P, H) {
    const y = P[0].y;
    c.setLineDash(H.dsh);
    c.beginPath();
    c.moveTo(P[0].x, y);
    c.lineTo(H.pw, y);
    c.stroke();
    if (H.st.label !== false)
      shapeLabel(
        c,
        H.pw + 1,
        y,
        fmt(o.pts[0].p, H.S),
        H.col,
        css("--on-brand") || "#fff",
      );
    if (o.text) {
      c.fillStyle = H.col;
      c.textAlign = "left";
      c.fillText(o.text, P[0].x + 4, y - 9);
    }
  },

  crossline(ch, c, o, P, H) {
    c.setLineDash(dashOf(o, [4, 3]));
    c.beginPath();
    c.moveTo(0, P[0].y);
    c.lineTo(H.pw, P[0].y);
    c.moveTo(P[0].x, 0);
    c.lineTo(P[0].x, ch.axisY);
    c.stroke();
    shapeLabel(
      c,
      H.pw + 1,
      P[0].y,
      fmt(o.pts[0].p, H.S),
      H.col,
      css("--on-brand") || "#fff",
    );
  },

  /* ---- channels ---- */

  /* Least-squares fit through the closes between the two anchors, with a
     band at ±2 standard deviations of the residuals. Real regression, not a
     line drawn between two clicks — which is the whole point of the tool. */
  regression(ch, c, o, P, H) {
    const d = ch.data;
    let a = Math.round(Math.min(o.pts[0].i, o.pts[1].i)),
      b = Math.round(Math.max(o.pts[0].i, o.pts[1].i));
    a = Math.max(0, a);
    b = Math.min(d.length - 1, b);
    const n = b - a + 1;
    if (n < 3) return;
    let sx = 0,
      sy = 0,
      sxy = 0,
      sxx = 0;
    for (let k = a; k <= b; k++) {
      const x = k - a,
        y = d[k].c;
      sx += x;
      sy += y;
      sxy += x * y;
      sxx += x * x;
    }
    const den = n * sxx - sx * sx;
    if (!den) return;
    const slope = (n * sxy - sx * sy) / den,
      icept = (sy - slope * sx) / n;
    let ss = 0;
    for (let k = a; k <= b; k++) {
      const r = d[k].c - (icept + slope * (k - a));
      ss += r * r;
    }
    const sd = Math.sqrt(ss / n);
    const p0 = icept,
      p1 = icept + slope * (n - 1);
    const x0 = ch.x(a),
      x1 = ch.x(b);
    const band = (mult, alpha) => {
      const yA = ch.y(p0 + sd * mult),
        yB = ch.y(p1 + sd * mult);
      c.save();
      c.globalAlpha = alpha;
      c.setLineDash(mult === 0 ? [] : [5, 4]);
      c.lineWidth = mult === 0 ? 1.8 : 1;
      c.beginPath();
      c.moveTo(x0, yA);
      c.lineTo(x1, yB);
      c.stroke();
      c.restore();
      return [yA, yB];
    };
    const up = band(2, 0.85),
      dn = band(-2, 0.85);
    c.save();
    c.globalAlpha = fillA(o, 8);
    c.fillStyle = H.col;
    c.beginPath();
    c.moveTo(x0, up[0]);
    c.lineTo(x1, up[1]);
    c.lineTo(x1, dn[1]);
    c.lineTo(x0, dn[0]);
    c.closePath();
    c.fill();
    c.restore();
    band(0, 1);
    const per = (slope / (d[a].c || 1)) * 100;
    shapeLabel(
      c,
      x1 + 5,
      ch.y(p1),
      `${n} bars  slope ${per >= 0 ? "+" : "−"}${Math.abs(per).toFixed(3)}%/bar  ±2σ ${fmt(sd * 2, H.S)}`,
      css("--surf2"),
      css("--txt"),
    );
  },

  /* Two horizontal bounds and a body between them. */
  flatchannel(ch, c, o, P, H) {
    const yTop = Math.min(P[0].y, P[2] ? P[2].y : P[1].y),
      yBot = Math.max(P[0].y, P[2] ? P[2].y : P[1].y);
    const x0 = Math.min(P[0].x, P[1].x),
      x1 = Math.max(P[0].x, P[1].x);
    c.save();
    c.globalAlpha = fillA(o, 10);
    c.fillStyle = H.col;
    c.fillRect(x0, yTop, x1 - x0, yBot - yTop);
    c.restore();
    c.setLineDash(H.dsh);
    c.beginPath();
    c.moveTo(x0, yTop);
    c.lineTo(x1, yTop);
    c.moveTo(x0, yBot);
    c.lineTo(x1, yBot);
    c.stroke();
    const a = Math.max(o.pts[0].p, o.pts[2] ? o.pts[2].p : o.pts[1].p);
    const b = Math.min(o.pts[0].p, o.pts[2] ? o.pts[2].p : o.pts[1].p);
    shapeLabel(
      c,
      x1 + 4,
      yTop,
      fmt(a, H.S),
      H.col,
      css("--on-brand") || "#fff",
    );
    shapeLabel(
      c,
      x1 + 4,
      yBot,
      fmt(b, H.S),
      H.col,
      css("--on-brand") || "#fff",
    );
  },

  /* ---- pitchfork ---- */

  /* Andrews: a handle from the pivot to the midpoint of the other two, and
     parallels through each of them. */
  pitchfork(ch, c, o, P, H) {
    if (!P[2]) return;
    const mid = { x: (P[1].x + P[2].x) / 2, y: (P[1].y + P[2].y) / 2 };
    const dx = mid.x - P[0].x,
      dy = mid.y - P[0].y;
    const ext = (from) => {
      const t = dx === 0 ? 0 : (H.pw - from.x) / dx;
      c.beginPath();
      c.moveTo(from.x, from.y);
      c.lineTo(dx === 0 ? from.x : H.pw, from.y + dy * t);
      c.stroke();
    };
    c.save();
    c.globalAlpha = fillA(o, 8);
    c.fillStyle = H.col;
    const t1 = dx === 0 ? 0 : (H.pw - P[1].x) / dx,
      t2 = dx === 0 ? 0 : (H.pw - P[2].x) / dx;
    c.beginPath();
    c.moveTo(P[1].x, P[1].y);
    c.lineTo(H.pw, P[1].y + dy * t1);
    c.lineTo(H.pw, P[2].y + dy * t2);
    c.lineTo(P[2].x, P[2].y);
    c.closePath();
    c.fill();
    c.restore();
    c.setLineDash([]);
    c.lineWidth = 1.6;
    ext(mid);
    c.save();
    c.globalAlpha = 0.85;
    c.lineWidth = 1.2;
    ext(P[1]);
    ext(P[2]);
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(mid.x, mid.y);
    c.moveTo(P[1].x, P[1].y);
    c.lineTo(P[2].x, P[2].y);
    c.stroke();
    c.restore();
    shapeLabel(
      c,
      mid.x + 6,
      mid.y - 11,
      "median",
      css("--surf2"),
      css("--txt"),
    );
  },

  /* ---- fibonacci ---- */

  /* Fib levels measured across a channel rather than a vertical move: the
     levels are parallels between the base line and the third point. */
  fibchannel(ch, c, o, P, H) {
    if (!P[2]) return;
    const off = P[2].y - P[1].y;
    c.font = '9.5px "IBM Plex Mono",monospace';
    [0].concat(FIB_LEVELS, [1.618]).forEach((l) => {
      const dy = off * l;
      const first = l === 0 || l === 1;
      c.save();
      c.strokeStyle = first ? "rgba(159,176,206,.85)" : H.col;
      c.globalAlpha = (H.ghost ? 0.6 : 1) * (first ? 1 : 0.72);
      c.setLineDash(first ? [] : dashOf(o, [5, 4]));
      c.beginPath();
      c.moveTo(P[0].x, P[0].y + dy);
      c.lineTo(P[1].x, P[1].y + dy);
      c.stroke();
      c.restore();
      c.fillStyle = css("--txt2");
      c.textAlign = "left";
      c.fillText(String(l), Math.max(P[0].x, P[1].x) + 4, P[1].y + dy);
    });
  },

  /* Vertical lines at Fibonacci bar counts from the anchor. */
  fibtime(ch, c, o, P, H) {
    const i0 = o.pts[0].i,
      step = o.pts[1].i - o.pts[0].i;
    if (!step) return;
    c.font = '9.5px "IBM Plex Mono",monospace';
    FIB_TIME.forEach((n, k) => {
      const x = ch.x(i0 + step * n);
      if (x < -20 || x > H.pw + 20) return;
      c.save();
      c.globalAlpha = (H.ghost ? 0.6 : 1) * (k < 2 ? 1 : 0.68);
      c.setLineDash(k < 2 ? [] : dashOf(o, [4, 4]));
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, ch.axisY);
      c.stroke();
      c.restore();
      c.fillStyle = css("--txt2");
      c.textAlign = "left";
      c.fillText(String(n), x + 3, 10);
    });
  },

  /* Rays from the origin through the Fibonacci fractions of the box. */
  fibfan(ch, c, o, P, H) {
    const x0 = P[0].x,
      y0 = P[0].y,
      dx = P[1].x - x0,
      dy = P[1].y - y0;
    c.font = '9.5px "IBM Plex Mono",monospace';
    c.save();
    c.globalAlpha = fillA(o, 7);
    c.fillStyle = H.col;
    c.fillRect(x0, y0, dx, dy);
    c.restore();
    FIB_LEVELS.concat([0]).forEach((l) => {
      c.save();
      c.globalAlpha = (H.ghost ? 0.6 : 1) * (l === 0 || l === 1 ? 1 : 0.7);
      c.setLineDash(l === 0 || l === 1 ? [] : dashOf(o, [5, 4]));
      c.strokeStyle = H.col;
      lineThrough(c, x0, y0, x0 + dx, y0 + dy * l, H.pw, ch.axisY);
      c.restore();
      /* Placed well out along each ray so the labels fan out with the
         lines. Sharing one x stacked them all on top of each other at the
         anchor, which is where they were before. */
      const tf = dx === 0 ? 0 : ((H.pw - 18 - x0) / dx) * 0.82;
      const lx = Math.min(H.pw - 20, x0 + dx * tf + 4);
      const ly = y0 + dy * l * tf;
      if (ly > 8 && ly < ch.axisY - 8) {
        c.fillStyle = css("--txt2");
        c.textAlign = "left";
        c.fillText(String(l), lx, ly - 6);
      }
    });
  },

  /* Concentric arcs at Fibonacci multiples of the anchor radius. */
  fibcircle(ch, c, o, P, H) {
    const r = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y);
    if (r < 2) return;
    c.font = '9.5px "IBM Plex Mono",monospace';
    [0.382, 0.5, 0.618, 1, 1.618, 2.618].forEach((l) => {
      c.save();
      c.globalAlpha = (H.ghost ? 0.6 : 1) * (l === 1 ? 1 : 0.65);
      c.setLineDash(l === 1 ? [] : dashOf(o, [5, 4]));
      c.beginPath();
      c.arc(P[0].x, P[0].y, r * l, 0, Math.PI * 2);
      c.stroke();
      c.restore();
      c.fillStyle = css("--txt2");
      c.textAlign = "center";
      c.fillText(String(l), P[0].x, P[0].y - r * l - 5);
    });
    c.save();
    c.globalAlpha = 0.5;
    c.setLineDash([3, 3]);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(P[1].x, P[1].y);
    c.stroke();
    c.restore();
  },

  /* ---- gann ---- */

  /* The box divided in eighths both ways, plus its diagonal. */
  gannbox(ch, c, o, P, H) {
    const x0 = Math.min(P[0].x, P[1].x),
      x1 = Math.max(P[0].x, P[1].x);
    const y0 = Math.min(P[0].y, P[1].y),
      y1 = Math.max(P[0].y, P[1].y);
    const w = x1 - x0,
      h = y1 - y0;
    c.save();
    c.globalAlpha = fillA(o, 6);
    c.fillStyle = H.col;
    c.fillRect(x0, y0, w, h);
    c.restore();
    c.font = '9px "IBM Plex Mono",monospace';
    for (let k = 0; k <= 8; k++) {
      const f = k / 8;
      const major = k === 0 || k === 8 || k === 4;
      c.save();
      c.globalAlpha = (H.ghost ? 0.6 : 1) * (major ? 0.95 : 0.4);
      c.setLineDash(major ? [] : [3, 3]);
      c.beginPath();
      c.moveTo(x0 + w * f, y0);
      c.lineTo(x0 + w * f, y1);
      c.moveTo(x0, y0 + h * f);
      c.lineTo(x1, y0 + h * f);
      c.stroke();
      c.restore();
      if (k && k < 8) {
        c.fillStyle = css("--txt3");
        c.textAlign = "left";
        c.fillText(k + "/8", x1 + 3, y0 + h * f);
      }
    }
    c.save();
    c.globalAlpha = 0.8;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(P[1].x, P[1].y);
    c.stroke();
    c.restore();
  },

  /* The 1x1 and its harmonics from one origin. */
  gannfan(ch, c, o, P, H) {
    const x0 = P[0].x,
      y0 = P[0].y;
    const ux = P[1].x - x0,
      uy = P[1].y - y0;
    if (!ux) return;
    c.font = '9px "IBM Plex Mono",monospace';
    GANN_RATIOS.forEach(([a, b]) => {
      const oneOne = a === 1 && b === 1;
      c.save();
      c.globalAlpha = (H.ghost ? 0.6 : 1) * (oneOne ? 1 : 0.6);
      c.lineWidth = oneOne ? 1.8 : 1;
      c.setLineDash(oneOne ? [] : [4, 4]);
      c.strokeStyle = H.col;
      lineThrough(c, x0, y0, x0 + ux * (b / a), y0 + uy, H.pw, ch.axisY);
      c.restore();
      const t = (H.pw - x0) / (ux * (b / a));
      const ly = y0 + uy * t;
      if (ly > 8 && ly < ch.axisY - 8) {
        c.fillStyle = css("--txt3");
        c.textAlign = "right";
        c.fillText(a + "×" + b, H.pw - 3, ly - 6);
      }
    });
  },

  /* ---- shapes ---- */

  ellipse(ch, c, o, P, H) {
    const cx = (P[0].x + P[1].x) / 2,
      cy = (P[0].y + P[1].y) / 2;
    const rx = Math.abs(P[1].x - P[0].x) / 2,
      ry = Math.abs(P[1].y - P[0].y) / 2;
    c.save();
    c.globalAlpha = (H.ghost ? 0.5 : 1) * fillA(o, 12);
    c.fillStyle = H.col;
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.setLineDash(H.dsh);
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    c.stroke();
    if (o.text) {
      c.fillStyle = H.col;
      c.textAlign = "center";
      c.fillText(o.text, cx, cy);
    }
  },

  triangle(ch, c, o, P, H) {
    if (!P[2]) return;
    c.save();
    c.globalAlpha = (H.ghost ? 0.5 : 1) * fillA(o, 12);
    c.fillStyle = H.col;
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(P[1].x, P[1].y);
    c.lineTo(P[2].x, P[2].y);
    c.closePath();
    c.fill();
    c.restore();
    c.setLineDash(H.dsh);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(P[1].x, P[1].y);
    c.lineTo(P[2].x, P[2].y);
    c.closePath();
    c.stroke();
  },

  brush(ch, c, o, P, H) {
    if (P.length < 2) return;
    c.setLineDash([]);
    c.lineJoin = "round";
    c.lineCap = "round";
    c.lineWidth = (o.style && o.style.width) || 2;
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    for (let k = 1; k < P.length; k++) c.lineTo(P[k].x, P[k].y);
    c.stroke();
  },

  highlighter(ch, c, o, P, H) {
    if (P.length < 2) return;
    c.save();
    c.setLineDash([]);
    c.globalAlpha = 0.25;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.lineWidth = ((o.style && o.style.width) || 2) * 9;
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    for (let k = 1; k < P.length; k++) c.lineTo(P[k].x, P[k].y);
    c.stroke();
    c.restore();
  },

  /* ---- annotations ---- */

  callout(ch, c, o, P, H) {
    const s = o.text || "Callout";
    const fs = (H.st.font || 11) + 0;
    c.font = fs + 'px "IBM Plex Sans",sans-serif';
    const w = Math.max(48, c.measureText(s).width + 16),
      h = fs + 14;
    const bx = P[1].x,
      by = P[1].y - h / 2;
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(bx + (P[0].x < bx ? 0 : w), by + h / 2);
    c.stroke();
    c.save();
    c.globalAlpha = (H.ghost ? 0.6 : 1) * 0.94;
    c.fillStyle = css("--surf2");
    c.beginPath();
    if (c.roundRect) c.roundRect(bx, by, w, h, 5);
    else c.rect(bx, by, w, h);
    c.fill();
    c.restore();
    c.strokeStyle = H.col;
    c.beginPath();
    if (c.roundRect) c.roundRect(bx + 0.5, by + 0.5, w - 1, h - 1, 5);
    else c.rect(bx + 0.5, by + 0.5, w - 1, h - 1);
    c.stroke();
    c.fillStyle = css("--txt");
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillText(s, bx + 8, by + h / 2);
    c.beginPath();
    c.arc(P[0].x, P[0].y, 2.5, 0, 7);
    c.fillStyle = H.col;
    c.fill();
  },

  pricelabel(ch, c, o, P, H) {
    const txt = (o.text ? o.text + "  " : "") + fmt(o.pts[0].p, H.S);
    c.setLineDash([2, 3]);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    c.lineTo(H.pw, P[0].y);
    c.stroke();
    shapeLabel(
      c,
      P[0].x + 6,
      P[0].y - 11,
      txt,
      H.col,
      css("--on-brand") || "#fff",
    );
    c.beginPath();
    c.arc(P[0].x, P[0].y, 3, 0, 7);
    c.fill();
  },

  flag(ch, c, o, P, H) {
    const x = P[0].x,
      y = P[0].y;
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 26);
    c.stroke();
    c.beginPath();
    c.moveTo(x, y - 26);
    c.lineTo(x + 17, y - 21);
    c.lineTo(x, y - 16);
    c.closePath();
    c.fill();
    if (o.text) {
      c.fillStyle = css("--txt");
      c.textAlign = "left";
      c.fillText(o.text, x + 20, y - 21);
    }
  },

  /* ---- measure ---- */

  drange(ch, c, o, P, H) {
    const x0 = Math.min(P[0].x, P[1].x),
      x1 = Math.max(P[0].x, P[1].x);
    c.save();
    c.globalAlpha = fillA(o, 10);
    c.fillStyle = H.col;
    c.fillRect(x0, 0, x1 - x0, ch.axisY);
    c.restore();
    c.setLineDash(H.dsh);
    c.beginPath();
    c.moveTo(x0, 0);
    c.lineTo(x0, ch.axisY);
    c.moveTo(x1, 0);
    c.lineTo(x1, ch.axisY);
    c.stroke();
    const bars = Math.abs(Math.round(o.pts[1].i - o.pts[0].i));
    const mins = (bars * (IV_MS[ch.cfg.iv] || 6e4)) / 6e4;
    shapeLabel(
      c,
      (x0 + x1) / 2 - 40,
      14,
      `${bars} bars  ${fmtDur(mins)}`,
      css("--surf2"),
      css("--txt"),
    );
  },

  dprange(ch, c, o, P, H) {
    const x0 = Math.min(P[0].x, P[1].x),
      x1 = Math.max(P[0].x, P[1].x);
    const y0 = Math.min(P[0].y, P[1].y),
      y1 = Math.max(P[0].y, P[1].y);
    const dp = o.pts[1].p - o.pts[0].p;
    const good = dp >= 0 ? css("--up") : css("--dn");
    c.save();
    c.globalAlpha = 0.12;
    c.fillStyle = good;
    c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.restore();
    c.strokeStyle = good;
    c.setLineDash([]);
    c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    c.beginPath();
    c.moveTo(x0, P[1].y);
    c.lineTo(x1, P[1].y);
    c.stroke();
    const bars = Math.abs(Math.round(o.pts[1].i - o.pts[0].i));
    const mins = (bars * (IV_MS[ch.cfg.iv] || 6e4)) / 6e4;
    shapeLabel(
      c,
      (x0 + x1) / 2 - 60,
      (y0 + y1) / 2,
      deltaText(o, H.S, o.pts[0].p, o.pts[1].p),
      css("--surf2"),
      good,
    );
    shapeLabel(
      c,
      (x0 + x1) / 2 - 34,
      y1 + 11,
      `${bars} bars  ${fmtDur(mins)}`,
      css("--surf2"),
      css("--txt2"),
    );
  },

  /* ---- patterns ---- */

  /* The ratio labels are the tool: an ABCD without BC/AB printed is four
     lines. Retracement is measured on price, the way it is quoted. */
  abcd(ch, c, o, P, H) {
    SHAPES._poly(ch, c, o, P, H, ["A", "B", "C", "D"]);
    const p = o.pts.map((q) => q.p);
    if (p.length < 4) return;
    const ab = Math.abs(p[1] - p[0]),
      bc = Math.abs(p[2] - p[1]),
      cd = Math.abs(p[3] - p[2]);
    const lab = [];
    if (ab) lab.push("BC/AB " + (bc / ab).toFixed(3));
    if (bc) lab.push("CD/BC " + (cd / bc).toFixed(3));
    shapeLabel(
      c,
      Math.min(H.pw - 150, Math.max(4, (P[1].x + P[2].x) / 2)),
      Math.min(ch.axisY - 10, Math.max(12, (P[1].y + P[2].y) / 2 - 14)),
      lab.join("   "),
      css("--surf2"),
      css("--txt"),
    );
  },

  xabcd(ch, c, o, P, H) {
    SHAPES._poly(ch, c, o, P, H, ["X", "A", "B", "C", "D"]);
    const p = o.pts.map((q) => q.p);
    if (p.length < 5) return;
    const xa = Math.abs(p[1] - p[0]),
      ab = Math.abs(p[2] - p[1]),
      bc = Math.abs(p[3] - p[2]),
      cd = Math.abs(p[4] - p[3]),
      xd = Math.abs(p[4] - p[0]);
    const rows = [];
    if (xa) rows.push("AB/XA " + (ab / xa).toFixed(3));
    if (ab) rows.push("BC/AB " + (bc / ab).toFixed(3));
    if (bc) rows.push("CD/BC " + (cd / bc).toFixed(3));
    if (xa) rows.push("XD/XA " + (xd / xa).toFixed(3));
    c.save();
    /* Clamped into the plot: unclamped, the block sat under the Data Window
       or off the right edge whenever D landed near either. */
    const bx = Math.min(H.pw - 116, Math.max(4, P[4].x + 8));
    const by = Math.min(ch.axisY - 16, Math.max(46, P[4].y));
    rows.forEach((r, k) =>
      shapeLabel(c, bx, by - 26 + k * 15, r, css("--surf2"), css("--txt2")),
    );
    c.restore();
  },

  elliott(ch, c, o, P, H) {
    SHAPES._poly(ch, c, o, P, H, ["0", "1", "2", "3", "4", "5"]);
  },

  headshoulders(ch, c, o, P, H) {
    SHAPES._poly(ch, c, o, P, H, ["LS", "", "H", "", "RS"]);
    if (P.length < 5) return;
    /* The neckline is what the pattern trades off, so it is drawn and
       extended rather than left for the eye to infer. */
    const a = P[1],
      b = P[3];
    c.save();
    c.setLineDash([5, 4]);
    c.globalAlpha = 0.9;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = dx ? (H.pw - a.x) / dx : 0;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(H.pw, a.y + dy * t);
    c.stroke();
    c.restore();
    shapeLabel(
      c,
      Math.min(H.pw - 60, b.x + 6),
      b.y + 12,
      "neckline",
      css("--surf2"),
      css("--txt2"),
    );
  },

  /* Shared polyline-with-vertex-labels body for the pattern tools. */
  _poly(ch, c, o, P, H, labels) {
    c.setLineDash(H.dsh);
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    for (let k = 1; k < P.length; k++) c.lineTo(P[k].x, P[k].y);
    c.stroke();
    c.save();
    c.globalAlpha = fillA(o, 7);
    c.fillStyle = H.col;
    c.beginPath();
    c.moveTo(P[0].x, P[0].y);
    for (let k = 1; k < P.length; k++) c.lineTo(P[k].x, P[k].y);
    c.closePath();
    c.fill();
    c.restore();
    c.font = '9.5px "IBM Plex Sans",sans-serif';
    P.forEach((p, k) => {
      const l = labels[k];
      if (!l) return;
      c.beginPath();
      c.arc(p.x, p.y, 3, 0, 7);
      c.fillStyle = H.col;
      c.fill();
      c.fillStyle = css("--txt");
      c.textAlign = "center";
      c.fillText(l, p.x, p.y - 11);
    });
  },
};

/* There is no harmonicName() here, and that is deliberate. Naming a shape
   "Gartley" commits to one reading of the D-point ratio, and the two
   readings in common circulation — D at 0.786 of XA measured from X, and D
   at a 0.786 retracement of XA measured back from A — give different
   numbers for the same drawing. Printing the wrong name on a trader's chart
   is worse than printing none, so the tool reports the four measured ratios
   and leaves the naming to whichever table the trader uses. */

/* ── seeding the extra anchors ──────────────────────────────────
   A drag gives two points. Shapes that need three or six get the rest
   placed on a plausible skeleton inside the dragged box, then the user
   drags the handles — the same trick the parallel channel always used,
   generalised. Each entry is a list of [time fraction, price fraction]
   from the first anchor to the second, for points 2..n. */
const SEED = {
  channel: [[1, 1.35]],
  flatchannel: [[1, 1]],
  fibchannel: [[1, 1.35]],
  pitchfork: [[0.55, 0.35]],
  triangle: [[0, 1]],
  /* The drag defines the WHOLE pattern's box, not its first leg. An earlier
     version treated it as the first leg and continued the skeleton three or
     four legs to the right, which put most of every pattern past the right
     edge of the plot on an ordinary-sized drag. Time fractions are therefore
     all inside 0..1 and the shape lands where it was drawn. Price fractions
     are of the dragged height, picked so the leg ratios start out near the
     textbook figures. */
  abcd: [
    [0.55, 0.28],
    [1, 1],
  ],
  xabcd: [
    [0.3, 1],
    [0.47, 0.38],
    [0.68, 0.76],
    [1, 0.21],
  ],
  elliott: [
    [0.16, 0.42],
    [0.3, 0.22],
    [0.56, 0.78],
    [0.72, 0.58],
    [1, 1],
  ],
  headshoulders: [
    [0.22, 0.55],
    [0.5, 1],
    [0.78, 0.55],
    [1, 0.72],
  ],
};

function seedPts(o, a, b) {
  const rows = SEED[o.t];
  if (!rows) return;
  const di = b.i - a.i,
    dp = (b.p || 0) - (a.p || 0),
    /* A flat drag would collapse the skeleton onto one line, so fall back
       to a small fraction of price rather than zero. */
    amp = Math.abs(dp) > 1e-9 ? dp : (a.p || 1) * 0.004;
  rows.forEach((r, k) => {
    o.pts[k + 2] = { i: a.i + di * r[0], p: a.p + amp * r[1] };
  });
  o.pts.length = rows.length + 2;
}
