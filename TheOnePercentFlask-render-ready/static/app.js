/* TheOnePercent — cover page behaviour (index.html)
   -------------------------------------------------------------------
   Scope: chart preview, featured index card and the major-markets
   table. Navigation, global search and the right-edge rail are handled
   by assets/shell.js. Prices refresh in place — never a full reload.

   Quotes come from a seeded random walk shaped like a provider payload,
   so swapping in a live feed only touches MARKETS / buildCandles.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888";

  /* ------------------------------------------------------------ helpers */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const seedOf = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const fmt = (n, d) =>
    n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n, d) => (n >= 0 ? "+" : "−") + fmt(Math.abs(n), d);
  const pct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";

  /* ------------------------------------------------------------ market data */

  /* The five markets on the roadmap mockup, one per asset class. */
  const MARKETS = [
    { symbol: "EURUSD", name: "Euro / US Dollar", cls: "Forex", base: 1.0842, dec: 4, step: 0.0006, chg: 0.38 },
    { symbol: "BTCUSD", name: "Bitcoin", cls: "Crypto", base: 64218, dec: 0, step: 42, chg: 1.92 },
    { symbol: "NQ1!", name: "Nasdaq 100 futures", cls: "Futures", base: 19884, dec: 0, step: 11, chg: -0.21 },
    { symbol: "US500", name: "S&P 500 index", cls: "Indices", base: 5431.6, dec: 1, step: 1.8, chg: 0.78 },
    { symbol: "XAUUSD", name: "Gold spot", cls: "Commodities", base: 2341.5, dec: 1, step: 0.9, chg: 0.44 },
  ];

  const rows = MARKETS.map((m) => {
    const rnd = mulberry32(seedOf(m.symbol));
    const open = m.base / (1 + m.chg / 100);
    const series = [];
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      series.push(open + (m.base - open) * t + (rnd() - 0.5) * m.step * 5);
    }
    series[series.length - 1] = m.base;
    return { ...m, price: m.base, open, series };
  });

  const changePct = (r) => ((r.price - r.open) / r.open) * 100;

  /* ------------------------------------------------------------ sparklines */

  function drawSpark(canvas, series, color) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const x = (i) => 1 + (i / (series.length - 1)) * (w - 2);
    const y = (v) => h - 3 - ((v - min) / span) * (h - 8);

    ctx.beginPath();
    series.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.lineTo(x(series.length - 1), h);
    ctx.lineTo(x(0), h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color + "30");
    g.addColorStop(1, color + "00");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    series.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  const trendColor = (up) => (up ? css("--up") : css("--down"));

  /* ------------------------------------------------------------ table */

  const tbody = $("#market-body");

  function skeleton() {
    tbody.innerHTML = MARKETS.map(
      () => `<tr>
        <td><div class="skeleton sk-line" style="width:104px"></div></td>
        <td><div class="skeleton" style="width:64px;height:19px;border-radius:999px"></div></td>
        <td class="num"><div class="skeleton sk-line" style="width:62px;margin-left:auto"></div></td>
        <td class="num"><div class="skeleton sk-line" style="width:46px;margin-left:auto"></div></td>
        <td><div class="skeleton" style="width:88px;height:22px"></div></td>
      </tr>`
    ).join("");
  }

  function renderTable() {
    tbody.innerHTML = rows
      .map((r) => {
        const c = changePct(r);
        return `<tr data-symbol="${r.symbol}">
          <td class="sym"><b>${r.symbol}</b><small>${r.name}</small><small class="cls-m">${r.cls}</small></td>
          <td><span class="tag">${r.cls}</span></td>
          <td class="num" data-cell="price">${fmt(r.price, r.dec)}</td>
          <td class="num" data-cell="chg"><span class="chg ${c >= 0 ? "up" : "down"}">${pct(c)}</span></td>
          <td><canvas class="row-spark" data-spark="${r.symbol}" aria-hidden="true"></canvas></td>
        </tr>`;
      })
      .join("");

    rows.forEach((r) => {
      const canvas = tbody.querySelector(`[data-spark="${CSS.escape(r.symbol)}"]`);
      if (canvas) drawSpark(canvas, r.series, trendColor(changePct(r) >= 0));
    });
  }

  /* ------------------------------------------------------------ featured card */

  const featured = rows.find((r) => r.symbol === "US500");

  function renderFeatured() {
    const c = changePct(featured);
    const up = c >= 0;
    $("#feat-price").textContent = fmt(featured.price, 2);
    $("#feat-abs").textContent = signed(featured.price - featured.open, 2);
    const pill = $("#feat-pct");
    pill.textContent = pct(c);
    pill.className = "pill " + (up ? "up" : "down");
    $("#feat-delta").style.color = up ? "var(--up)" : "var(--down)";
    drawSpark($("#feat-spark"), featured.series, trendColor(up));
  }

  /* ------------------------------------------------------------ chart preview */

  const chart = { canvas: $("#chart"), tip: $("#chart-tip"), tf: "1H", candles: [], hover: -1 };
  const TF_MIN = { "1H": 60, "4H": 240, "1D": 1440 };
  const PAIR = { base: 1.0842, dec: 4, vol: 0.0011 };

  function buildCandles(tf) {
    const rnd = mulberry32(seedOf("EURUSD" + tf));
    const n = 76;
    const step = TF_MIN[tf] * 60000;
    const scale = Math.sqrt(TF_MIN[tf] / 60);
    const start = Date.now() - (n - 1) * step;
    const out = [];
    let price = PAIR.base / 1.0038; /* opens 0.38% below the last price */

    for (let i = 0; i < n; i++) {
      const open = price;
      const move = (PAIR.base - price) * 0.05 + (rnd() - 0.5) * PAIR.vol * 2 * scale;
      const close = open + move;
      const wick = Math.abs(move) * (0.4 + rnd()) + PAIR.vol * 0.3 * scale;
      out.push({
        t: start + i * step,
        o: open,
        c: close,
        h: Math.max(open, close) + wick * rnd(),
        l: Math.min(open, close) - wick * rnd(),
      });
      price = close;
    }
    const last = out[out.length - 1];
    last.c = PAIR.base;
    last.h = Math.max(last.h, PAIR.base);
    last.l = Math.min(last.l, PAIR.base);
    return out;
  }

  function drawChart() {
    const canvas = chart.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padR = 52;
    const padB = 16;
    const plotW = w - padR;
    const plotH = h - padB;
    const candles = chart.candles;

    let max = Math.max(...candles.map((c) => c.h));
    let min = Math.min(...candles.map((c) => c.l));
    const pad = (max - min) * 0.1 || 1;
    max += pad;
    min -= pad;

    const cw = plotW / candles.length;
    const bodyW = Math.max(2, Math.min(8, cw * 0.6));
    const x = (i) => i * cw + cw / 2;
    const y = (v) => ((max - v) / (max - min)) * (plotH - 20) + 12;

    const up = css("--up");
    const down = css("--down");

    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textBaseline = "middle";

    for (let g = 0; g <= 3; g++) {
      const v = min + ((max - min) * g) / 3;
      const gy = Math.round(y(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(plotW, gy);
      ctx.strokeStyle = css("--line-soft");
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = css("--faint");
      ctx.textAlign = "left";
      ctx.fillText(fmt(v, PAIR.dec), plotW + 8, gy);
    }

    candles.forEach((c, i) => {
      const isUp = c.c >= c.o;
      ctx.strokeStyle = isUp ? up : down;
      ctx.fillStyle = isUp ? up : down;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x(i)) + 0.5, y(c.h));
      ctx.lineTo(Math.round(x(i)) + 0.5, y(c.l));
      ctx.stroke();
      ctx.fillRect(
        x(i) - bodyW / 2,
        y(Math.max(c.o, c.c)),
        bodyW,
        Math.max(1.2, Math.abs(y(c.o) - y(c.c)))
      );
    });

    /* last price tag */
    const last = candles[candles.length - 1];
    const ly = Math.round(y(last.c)) + 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(plotW, ly);
    ctx.strokeStyle = css("--brand");
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = css("--brand");
    ctx.fillRect(plotW + 2, ly - 8, padR - 4, 16);
    ctx.fillStyle = css("--on-brand");
    ctx.textAlign = "center";
    ctx.fillText(fmt(last.c, PAIR.dec), plotW + 2 + (padR - 4) / 2, ly);

    /* time axis */
    ctx.fillStyle = css("--faint");
    ctx.textAlign = "center";
    const every = Math.ceil(candles.length / 5);
    candles.forEach((c, i) => {
      if (i % every || x(i) < 26 || x(i) > plotW - 26) return;
      const d = new Date(c.t);
      ctx.fillText(
        chart.tf === "1D"
          ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
          : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        x(i),
        h - padB / 2 + 1
      );
    });

    /* crosshair */
    if (chart.hover >= 0 && chart.hover < candles.length) {
      const c = candles[chart.hover];
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = css("--faint");
      ctx.beginPath();
      ctx.moveTo(Math.round(x(chart.hover)) + 0.5, 0);
      ctx.lineTo(Math.round(x(chart.hover)) + 0.5, plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x(chart.hover), y(c.c), 3, 0, Math.PI * 2);
      ctx.fillStyle = css("--brand");
      ctx.fill();
    }
  }

  function renderChartHead() {
    const candles = chart.candles;
    const last = candles[candles.length - 1];
    const c = ((last.c - candles[0].o) / candles[0].o) * 100;
    $("#chart-last").textContent = fmt(last.c, PAIR.dec);
    const pill = $("#chart-chg");
    pill.textContent = pct(c);
    pill.className = "pill " + (c >= 0 ? "up" : "down");
  }

  function loadChart() {
    chart.candles = buildCandles(chart.tf);
    renderChartHead();
    drawChart();
  }

  $$("[data-tf]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$("[data-tf]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      chart.tf = btn.dataset.tf;
      $(".pair span").textContent = "· " + chart.tf;
      loadChart();
    });
  });

  chart.canvas.addEventListener("mousemove", (e) => {
    const rect = chart.canvas.getBoundingClientRect();
    const cw = (rect.width - 52) / chart.candles.length;
    const i = Math.floor((e.clientX - rect.left) / cw);
    if (i < 0 || i >= chart.candles.length) return;
    chart.hover = i;
    drawChart();

    const c = chart.candles[i];
    const d = new Date(c.t);
    chart.tip.innerHTML =
      `<div class="t-date"><span>${d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}</span></div>` +
      `<div><span>O</span><span>${fmt(c.o, PAIR.dec)}</span></div>` +
      `<div><span>H</span><span>${fmt(c.h, PAIR.dec)}</span></div>` +
      `<div><span>L</span><span>${fmt(c.l, PAIR.dec)}</span></div>` +
      `<div><span>C</span><span style="color:${c.c >= c.o ? "var(--up)" : "var(--down)"}">${fmt(
        c.c,
        PAIR.dec
      )}</span></div>`;
    chart.tip.classList.add("show");
    const tw = 132;
    let left = e.clientX - rect.left + 14;
    if (left + tw > rect.width) left = e.clientX - rect.left - tw - 14;
    chart.tip.style.left = Math.max(0, left) + "px";
    chart.tip.style.top = Math.min(rect.height - 92, Math.max(0, e.clientY - rect.top - 36)) + "px";
  });

  chart.canvas.addEventListener("mouseleave", () => {
    chart.hover = -1;
    chart.tip.classList.remove("show");
    drawChart();
  });

  /* ------------------------------------------------------------ live refresh
     Definition of done: prices refresh without a full reload. */

  let lastSync = Date.now();

  function refresh() {
    /* two rows move per tick, cells update in place */
    const picks = new Set();
    while (picks.size < 2) picks.add(Math.floor(Math.random() * rows.length));

    picks.forEach((i) => {
      const r = rows[i];
      const before = r.price;
      r.price += (Math.random() - 0.48) * r.step * 1.8;
      r.series.push(r.price);
      if (r.series.length > 40) r.series.shift();

      const tr = tbody.querySelector(`tr[data-symbol="${CSS.escape(r.symbol)}"]`);
      if (!tr) return;
      const c = changePct(r);
      const priceCell = tr.querySelector('[data-cell="price"]');
      const chgCell = tr.querySelector('[data-cell="chg"]');
      priceCell.textContent = fmt(r.price, r.dec);
      chgCell.innerHTML = `<span class="chg ${c >= 0 ? "up" : "down"}">${pct(c)}</span>`;
      [priceCell, chgCell].forEach((cell) => {
        cell.classList.remove("flash-up", "flash-down");
        void cell.offsetWidth;
        cell.classList.add(r.price >= before ? "flash-up" : "flash-down");
      });
      const spark = tr.querySelector("[data-spark]");
      if (spark) drawSpark(spark, r.series, trendColor(c >= 0));
      if (r === featured) renderFeatured();
    });

    /* the live candle keeps forming */
    const last = chart.candles[chart.candles.length - 1];
    last.c += (Math.random() - 0.48) * PAIR.vol * 0.6;
    last.h = Math.max(last.h, last.c);
    last.l = Math.min(last.l, last.c);
    renderChartHead();
    drawChart();

    lastSync = Date.now();
  }

  function syncLabels() {
    const age = Math.round((Date.now() - lastSync) / 1000);
    const label = age < 2 ? "updated just now" : "updated " + age + "s ago";
    $("#chart-sync").textContent = label;
    $("#summary-sync").textContent = label;
  }

  /* ------------------------------------------------------------ boot */

  skeleton();
  loadChart();
  renderFeatured();

  /* first quote batch lands after the shell paints, into fixed-height rows */
  setTimeout(() => {
    renderTable();
    syncLabels();
    setInterval(refresh, 1800);
    setInterval(syncLabels, 1000);
  }, 520);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawChart();
      renderFeatured();
      renderTable();
    }, 140);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      drawChart();
      renderFeatured();
    });
  }
})();