/* ======================================================= academy/figures.js
   The1% Academy — lesson diagrams.

   Teaching diagrams are drawn here as inline SVG from a small declarative
   spec. Real-market examples ("shot") are images rendered from real price
   history by tools/chart-shots, with the annotations placed on the exact
   candles. Nothing is a third-party screenshot and nothing is an AI
   picture, for one reason: a teaching chart has to be *correct*. A zone
   that sits two candles off, or a "sweep" whose wick never crosses the
   level, teaches the wrong thing. With specs, the chart and the lesson
   text are written together and reviewed together.

   Colours are CSS tokens (var(--up), var(--down), var(--brand)…) so every
   figure follows the dark / light theme toggle with no extra work.

   Spec types
     candles  { type:"candles", n, path:[[bar, price]…], seed, vol,
                wicks:[[bar, price]…], overlays:[…], h }
              path is the route the closes follow; the engine fills in
              realistic bars between waypoints. Overlays are placed in
              bar/price coordinates, so they always line up with candles.
     line     { type:"line", series:[{pts:[[x,y]…], kind, label}], xLabels,
                marks:[{at:[x,y], text}], yLabel }
     bars     { type:"bars", items:[{label, value, kind}], unit, max }
     flow     { type:"flow", steps:["…"], loop:bool }
     shot     { type:"shot", src:"id", alt, meta }
              a real-market chart screenshot. Rendered from real price
              history by tools/chart-shots (The1% branded, never a third-
              party screenshot) so the annotations sit on the exact candles.
              src is the file name in assets/academy/shots without .webp.

   Overlays (candles)
     { zone:[b0, b1|null, lo, hi], kind:"demand"|"supply"|"brand", label }
     { hline:price, kind, label, dash:true, from:b0, to:b1 }
     { seg:[[b,p],[b,p]], kind, label, dash }
     { poly:[[b,p]…], kind, dash }                 structure zig-zag
     { label:"text", at:[b,p], kind, pos:"above"|"below"|"left"|"right" }
     { ring:[b,p], kind }                          highlight a wick
     { arrow:[[b,p],[b,p]], kind }
   ====================================================================== */

window.Figures = (() => {
  "use strict";

  const W = 720;
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const COLOR = {
    up: "var(--up)",
    down: "var(--down)",
    demand: "var(--up)",
    supply: "var(--down)",
    brand: "var(--brand)",
    warn: "var(--warn-ink)",
    muted: "var(--muted)",
    ink: "var(--ink)",
  };
  const col = (k) => COLOR[k] || COLOR.brand;

  /* deterministic PRNG so a figure never changes between reloads */
  function rng(seed) {
    let s = (seed || 7) >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------ candles */

  function build(spec) {
    const n = spec.n || 40;
    const path = spec.path || [[0, 100], [n - 1, 110]];
    const r = rng(spec.seed);
    const prices = path.map((p) => p[1]);
    const range = Math.max(...prices) - Math.min(...prices) || 1;
    const vol = spec.vol == null ? 1 : spec.vol;

    const target = (i) => {
      for (let k = 0; k < path.length - 1; k++) {
        const [b0, p0] = path[k];
        const [b1, p1] = path[k + 1];
        if (i >= b0 && i <= b1) return b1 === b0 ? p1 : p0 + ((p1 - p0) * (i - b0)) / (b1 - b0);
      }
      return i < path[0][0] ? path[0][1] : path[path.length - 1][1];
    };

    const bars = [];
    const waypointBars = new Set(path.map((p) => p[0]));
    const slope0 = target(1) - target(0);
    let prev = target(0) - slope0 - range * 0.02;
    for (let i = 0; i < n; i++) {
      const noise = waypointBars.has(i) ? 0 : (r() - 0.5) * range * 0.07 * vol;
      const c = target(i) + noise;
      /* small open gaps and uneven wicks make the bars read as a market,
         not a staircase */
      const o = prev + (r() - 0.5) * range * 0.012 * vol;
      const body = Math.abs(c - o);
      const wickU = (r() * r()) * range * 0.05 * vol + body * 0.08;
      const wickD = (r() * r()) * range * 0.05 * vol + body * 0.08;
      bars.push({ o, c, h: Math.max(o, c) + wickU, l: Math.min(o, c) - wickD });
      prev = c;
    }
    (spec.wicks || []).forEach(([i, p]) => {
      const b = bars[i];
      if (!b) return;
      if (p > Math.max(b.o, b.c)) b.h = p;
      else b.l = p;
    });
    (spec.set || []).forEach(([i, o, h, l, c]) => {
      bars[i] = { o, h, l, c };
      if (bars[i + 1]) bars[i + 1].o = c;
    });
    return bars;
  }

  function candles(spec) {
    const H = spec.h || 280;
    const padL = 14;
    const padR = 14;
    const padT = 26;
    const padB = 24;
    const bars = build(spec);
    const n = bars.length;
    const ov = spec.overlays || [];

    /* spec.only: draw just the hand-set candles (anatomy diagrams) */
    const onlySet = spec.only ? new Set((spec.set || []).map((s) => s[0])) : null;
    const shown = onlySet ? bars.filter((_, i) => onlySet.has(i)) : bars;
    let lo = Math.min(...shown.map((b) => b.l));
    let hi = Math.max(...shown.map((b) => b.h));
    ov.forEach((o) => {
      if (o.at && o.label) {
        lo = Math.min(lo, o.at[1]);
        hi = Math.max(hi, o.at[1]);
      }
      if (o.zone) {
        lo = Math.min(lo, o.zone[2]);
        hi = Math.max(hi, o.zone[3]);
      }
      if (o.hline != null) {
        lo = Math.min(lo, o.hline);
        hi = Math.max(hi, o.hline);
      }
    });
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;

    const step = (W - padL - padR) / n;
    const X = (i) => padL + step * (i + 0.5);
    const Y = (p) => padT + ((hi - p) / (hi - lo)) * (H - padT - padB);
    const bw = Math.max(2, step * 0.62);
    const out = [];

    /* grid */
    for (let g = 0; g <= 4; g++) {
      const y = padT + (g * (H - padT - padB)) / 4;
      out.push('<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '" class="fg-grid"/>');
    }

    /* zones first, so candles sit on top of them */
    ov.filter((o) => o.zone).forEach((o) => {
      const [b0, b1, zlo, zhi] = o.zone;
      const x0 = X(b0) - step / 2;
      const x1 = b1 == null ? W - padR : X(b1) + step / 2;
      const c = col(o.kind);
      out.push(
        '<rect x="' + x0 + '" y="' + Y(zhi) + '" width="' + (x1 - x0) + '" height="' + Math.max(2, Y(zlo) - Y(zhi)) +
          '" fill="' + c + '" fill-opacity="0.14" stroke="' + c + '" stroke-opacity="0.55" stroke-width="1" rx="2"/>'
      );
      if (o.label)
        out.push(
          '<text x="' + (x0 + 6) + '" y="' + (o.labelPos === "below" ? Y(zlo) + 13 : Y(zhi) - 5) + '" class="fg-t fg-b fg-halo" fill="' + c + '">' + esc(o.label) + "</text>"
        );
    });

    /* candles */
    bars.forEach((b, i) => {
      if (onlySet && !onlySet.has(i)) return;
      const up = b.c >= b.o;
      const c = up ? COLOR.up : COLOR.down;
      const x = X(i);
      const yTop = Y(Math.max(b.o, b.c));
      const yBot = Y(Math.min(b.o, b.c));
      out.push('<line x1="' + x + '" x2="' + x + '" y1="' + Y(b.h) + '" y2="' + Y(b.l) + '" stroke="' + c + '" stroke-width="1.2"/>');
      out.push(
        '<rect x="' + (x - bw / 2) + '" y="' + yTop + '" width="' + bw + '" height="' + Math.max(1.2, yBot - yTop) + '" fill="' + c + '" rx="0.8"/>'
      );
    });

    /* lines and annotations */
    ov.forEach((o) => {
      if (o.hline != null) {
        const c = col(o.kind || "muted");
        const x0 = o.from != null ? X(o.from) : padL;
        const x1 = o.to != null ? X(o.to) : W - padR;
        out.push(
          '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(o.hline) + '" y2="' + Y(o.hline) + '" stroke="' + c + '" stroke-width="1.3"' +
            (o.dash === false ? "" : ' stroke-dasharray="5 4"') + "/>"
        );
        if (o.label) {
          const below = o.labelPos === "below";
          out.push(
            '<text x="' + (x1 - 2) + '" y="' + (Y(o.hline) + (below ? 14 : -5)) + '" text-anchor="end" class="fg-t fg-b fg-halo" fill="' + c + '">' + esc(o.label) + "</text>"
          );
        }
      }
      if (o.seg) {
        const c = col(o.kind || "brand");
        const [[b0, p0], [b1, p1]] = o.seg;
        out.push(
          '<line x1="' + X(b0) + '" y1="' + Y(p0) + '" x2="' + X(b1) + '" y2="' + Y(p1) + '" stroke="' + c + '" stroke-width="1.4"' +
            (o.dash ? ' stroke-dasharray="4 3"' : "") + "/>"
        );
        if (o.label)
          out.push(
            '<text x="' + (X(b0) + X(b1)) / 2 + '" y="' + (Math.min(Y(p0), Y(p1)) - 6) + '" text-anchor="middle" class="fg-t fg-b fg-halo" fill="' + c + '">' + esc(o.label) + "</text>"
          );
      }
      if (o.poly) {
        const c = col(o.kind || "brand");
        out.push(
          '<polyline fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linejoin="round"' + (o.dash ? ' stroke-dasharray="5 4"' : "") +
            ' points="' + o.poly.map(([b, p]) => X(b) + "," + Y(p)).join(" ") + '"/>'
        );
      }
      if (o.ring) {
        const c = col(o.kind || "warn");
        out.push('<circle cx="' + X(o.ring[0]) + '" cy="' + Y(o.ring[1]) + '" r="11" fill="none" stroke="' + c + '" stroke-width="1.6"/>');
      }
      if (o.arrow) {
        const c = col(o.kind || "brand");
        const [[b0, p0], [b1, p1]] = o.arrow;
        const x0 = X(b0), y0 = Y(p0), x1 = X(b1), y1 = Y(p1);
        const a = Math.atan2(y1 - y0, x1 - x0);
        const hx = (d) => x1 - 9 * Math.cos(a + d);
        const hy = (d) => y1 - 9 * Math.sin(a + d);
        out.push('<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + c + '" stroke-width="1.6"/>');
        out.push('<polygon fill="' + c + '" points="' + x1 + "," + y1 + " " + hx(0.45) + "," + hy(0.45) + " " + hx(-0.45) + "," + hy(-0.45) + '"/>');
      }
      if (o.label && o.at) {
        const c = col(o.kind || "ink");
        const pos = o.pos || "above";
        let x = X(o.at[0]);
        let y = Y(o.at[1]);
        let anchor = "middle";
        if (pos === "above") y -= 10;
        if (pos === "below") y += 18;
        if (pos === "left") { x -= 10; y += 4; anchor = "end"; }
        if (pos === "right") { x += 10; y += 4; anchor = "start"; }
        out.push('<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" class="fg-t fg-b fg-halo" fill="' + c + '">' + esc(o.label) + "</text>");
      }
    });

    return '<svg viewBox="0 0 ' + W + " " + H + '" class="fg" role="img" aria-label="' + esc(spec.alt || "Price chart diagram") + '">' + out.join("") + "</svg>";
  }

  /* --------------------------------------------------------------- line */

  function line(spec) {
    const H = spec.h || 260;
    const padL = 40, padR = 24, padT = 24, padB = 34;
    const all = spec.series.flatMap((s) => s.pts);
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let y0 = spec.yMin != null ? spec.yMin : Math.min(...ys);
    let y1 = spec.yMax != null ? spec.yMax : Math.max(...ys);
    const pad = (y1 - y0) * 0.1;
    if (spec.yMin == null) y0 -= pad;
    if (spec.yMax == null) y1 += pad;
    const X = (x) => padL + ((x - x0) / (x1 - x0 || 1)) * (W - padL - padR);
    const Y = (y) => padT + ((y1 - y) / (y1 - y0 || 1)) * (H - padT - padB);
    const out = [];
    for (let g = 0; g <= 4; g++) {
      const y = padT + (g * (H - padT - padB)) / 4;
      out.push('<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '" class="fg-grid"/>');
    }
    if (spec.zero != null)
      out.push('<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(spec.zero) + '" y2="' + Y(spec.zero) + '" stroke="var(--line-strong)" stroke-width="1"/>');
    spec.series.forEach((s) => {
      const c = col(s.kind || "brand");
      const d = s.pts.map(([x, y], i) => (i ? "L" : "M") + X(x).toFixed(1) + " " + Y(y).toFixed(1)).join(" ");
      if (s.fill)
        out.push('<path d="' + d + " L" + X(s.pts[s.pts.length - 1][0]) + " " + (H - padB) + " L" + X(s.pts[0][0]) + " " + (H - padB) + ' Z" fill="' + c + '" fill-opacity="0.12"/>');
      out.push('<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"' + (s.dash ? ' stroke-dasharray="6 5"' : "") + "/>");
      if (s.label) {
        const [lx, ly] = s.pts[s.pts.length - 1];
        const ty = Y(ly) - 8 < 16 ? Y(ly) + 18 : Y(ly) - 8;
        out.push('<text x="' + (X(lx) - 6) + '" y="' + ty + '" text-anchor="end" class="fg-t fg-b fg-halo" fill="' + c + '">' + esc(s.label) + "</text>");
      }
    });
    (spec.marks || []).forEach((m) => {
      const c = col(m.kind || "ink");
      const x = X(m.at[0]), y = Y(m.at[1]);
      out.push('<circle cx="' + x + '" cy="' + y + '" r="4" fill="' + c + '"/>');
      const below = m.pos === "below";
      out.push('<text x="' + x + '" y="' + (below ? y + 18 : y - 10) + '" text-anchor="' + (m.anchor || "middle") + '" class="fg-t" fill="' + c + '">' + esc(m.text) + "</text>");
    });
    (spec.xLabels || []).forEach(([x, t]) => {
      out.push('<text x="' + X(x) + '" y="' + (H - 12) + '" text-anchor="middle" class="fg-t" fill="var(--muted)">' + esc(t) + "</text>");
    });
    if (spec.yLabel)
      out.push('<text x="12" y="' + (padT - 8) + '" class="fg-t" fill="var(--muted)">' + esc(spec.yLabel) + "</text>");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="fg" role="img" aria-label="' + esc(spec.alt || "Line chart") + '">' + out.join("") + "</svg>";
  }

  /* --------------------------------------------------------------- bars */

  function barsChart(spec) {
    const items = spec.items;
    const rowH = 34;
    const H = spec.h || items.length * rowH + 20;
    const labelW = spec.labelW || 190;
    const max = spec.max || Math.max(...items.map((i) => Math.abs(i.value)));
    const out = [];
    items.forEach((it, k) => {
      const y = 10 + k * rowH;
      const w = ((W - labelW - 90) * Math.abs(it.value)) / max;
      const c = col(it.kind || "brand");
      out.push('<text x="' + (labelW - 12) + '" y="' + (y + 18) + '" text-anchor="end" class="fg-t" fill="var(--ink)">' + esc(it.label) + "</text>");
      out.push('<rect x="' + labelW + '" y="' + (y + 4) + '" width="' + Math.max(2, w) + '" height="20" rx="3" fill="' + c + '" fill-opacity="0.85"/>');
      out.push('<text x="' + (labelW + w + 8) + '" y="' + (y + 18) + '" class="fg-t fg-b" fill="' + c + '">' + esc(it.text || it.value + (spec.unit || "")) + "</text>");
    });
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="fg" role="img" aria-label="' + esc(spec.alt || "Bar chart") + '">' + out.join("") + "</svg>";
  }

  /* --------------------------------------------------------------- flow */

  function flow(spec) {
    const steps = spec.steps;
    const n = steps.length;
    const perRow = spec.perRow || Math.min(n, 4);
    const rows = Math.ceil(n / perRow);
    const gap = 26;
    const bw = (W - 20 - gap * (perRow - 1)) / perRow;
    /* wrap every step first, so all boxes share the height of the tallest */
    const maxCh = Math.max(8, Math.floor((bw - 22) / 6.7));
    const wrapped = steps.map((s) => {
      const lines = [];
      let cur = "";
      String(s).split(" ").forEach((w) => {
        if (cur && (cur + " " + w).length > maxCh) {
          lines.push(cur);
          cur = w;
        } else cur = cur ? cur + " " + w : w;
      });
      if (cur) lines.push(cur);
      return lines;
    });
    const maxLines = Math.max(...wrapped.map((l) => l.length));
    const bh = 34 + maxLines * 15 + 6;
    const H = rows * (bh + 30) + 10;
    const out = [];
    steps.forEach((s, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const x = 10 + c * (bw + gap);
      const y = 10 + r * (bh + 30);
      out.push('<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="10" fill="var(--surface-2)" stroke="var(--line-strong)"/>');
      out.push('<text x="' + (x + 12) + '" y="' + (y + 20) + '" class="fg-t fg-b" fill="var(--brand)">' + String(i + 1).padStart(2, "0") + "</text>");
      wrapped[i].forEach((l, k) =>
        out.push('<text x="' + (x + 12) + '" y="' + (y + 40 + k * 15) + '" class="fg-t" fill="var(--ink)">' + esc(l) + "</text>")
      );
      if (c < perRow - 1 && i < n - 1) {
        const ax = x + bw + 4;
        const ay = y + bh / 2;
        out.push('<line x1="' + ax + '" y1="' + ay + '" x2="' + (ax + gap - 10) + '" y2="' + ay + '" stroke="var(--brand)" stroke-width="1.6"/>');
        out.push('<polygon fill="var(--brand)" points="' + (ax + gap - 6) + "," + ay + " " + (ax + gap - 13) + "," + (ay - 4) + " " + (ax + gap - 13) + "," + (ay + 4) + '"/>');
      }
    });
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="fg" role="img" aria-label="' + esc(spec.alt || "Process diagram") + '">' + out.join("") + "</svg>";
  }


  const SHOTS = (window.ACADEMY_ROOT || "../") + "assets/academy/shots/";

  function shot(spec) {
    const src = SHOTS + spec.src + ".webp";
    return (
      '<figure class="fig fig-shot">' +
      (spec.title ? '<div class="fig-head"><b>' + esc(spec.title) + "</b><span>" + esc(spec.tag || "Real chart") + "</span></div>" : "") +
      '<button type="button" class="shot" data-shot="' + esc(src) + '" aria-label="Enlarge chart: ' + esc(spec.alt || spec.title || "") + '">' +
      '<img src="' + esc(src) + '" alt="' + esc(spec.alt || spec.title || "") + '" width="1440" height="810" loading="lazy" decoding="async">' +
      "</button>" +
      "<figcaption>" + (spec.caption ? esc(spec.caption) : "") +
      (spec.meta ? '<span class="shot-meta">' + esc(spec.meta) + " · real market data · The1% Charts</span>" : "") +
      "</figcaption>" +
      "</figure>"
    );
  }

  function render(spec) {
    if (!spec) return "";
    if (spec.type === "shot") return shot(spec);
    const svg =
      spec.type === "line" ? line(spec) : spec.type === "bars" ? barsChart(spec) : spec.type === "flow" ? flow(spec) : candles(spec);
    return (
      '<figure class="fig">' +
      (spec.title ? '<div class="fig-head"><b>' + esc(spec.title) + "</b>" + (spec.tag ? "<span>" + esc(spec.tag) + "</span>" : "") + "</div>" : "") +
      '<div class="fig-body">' + svg + "</div>" +
      (spec.caption ? "<figcaption>" + esc(spec.caption) + "</figcaption>" : "") +
      "</figure>"
    );
  }

  return { render, build };
})();
