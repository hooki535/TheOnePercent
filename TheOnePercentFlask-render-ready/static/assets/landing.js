/* TheOnePercent — landing sections behaviour (index.html only)
   -------------------------------------------------------------------
   Powers the ticker tape, the market screener, the heatmap, the top
   movers columns, the idea sparklines and the scroll reveal.

   All quotes come from one seeded universe below, shaped like a
   provider payload, so a real feed only replaces UNIVERSE + tick().
   Nothing here touches app.js (hero chart + market summary) or
   shell.js (nav + rail).
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const token = (n) =>
    getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888";

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
  const pct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";
  const compact = (n) =>
    n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.round(n / 1e3) + "K";

  /* ------------------------------------------------------------ universe */

  /* symbol, name, asset class, last, decimals, tick size, day change %, notional volume */
  const UNIVERSE = [
    ["EURUSD", "Euro / US Dollar", "Forex", 1.0842, 4, 0.0006, 0.38, 8.4e9],
    ["GBPUSD", "Pound / US Dollar", "Forex", 1.2714, 4, 0.0007, -0.22, 3.1e9],
    ["USDJPY", "US Dollar / Yen", "Forex", 157.42, 2, 0.08, 0.61, 5.2e9],
    ["USDCHF", "US Dollar / Franc", "Forex", 0.8962, 4, 0.0005, -0.14, 1.2e9],
    ["AUDUSD", "Aussie / US Dollar", "Forex", 0.6678, 4, 0.0005, 0.52, 1.6e9],
    ["USDCAD", "US Dollar / Loonie", "Forex", 1.3684, 4, 0.0006, -0.09, 1.4e9],
    ["EURJPY", "Euro / Yen", "Forex", 170.66, 2, 0.09, 0.94, 0.9e9],
    ["BTCUSD", "Bitcoin", "Crypto", 64218, 0, 42, 1.92, 21.4e9],
    ["ETHUSD", "Ethereum", "Crypto", 3418.6, 1, 4.2, 2.64, 9.8e9],
    ["SOLUSD", "Solana", "Crypto", 148.32, 2, 0.7, -3.18, 2.7e9],
    ["XRPUSD", "XRP", "Crypto", 0.5218, 4, 0.0022, 0.87, 1.1e9],
    ["BNBUSD", "BNB", "Crypto", 596.4, 1, 2.1, -1.04, 0.8e9],
    ["NQ1!", "Nasdaq 100 futures", "Futures", 19884, 0, 11, -0.21, 6.1e9],
    ["ES1!", "S&P 500 futures", "Futures", 5438.5, 1, 2.2, 0.74, 7.9e9],
    ["CL1!", "Crude oil futures", "Futures", 78.42, 2, 0.14, -1.36, 3.4e9],
    ["GC1!", "Gold futures", "Futures", 2348.9, 1, 1.1, 0.49, 2.2e9],
    ["US500", "S&P 500 index", "Indices", 5431.6, 1, 1.8, 0.78, 0],
    ["US100", "Nasdaq 100 index", "Indices", 19846, 0, 9, -0.18, 0],
    ["US30", "Dow 30 index", "Indices", 39412, 0, 18, 0.31, 0],
    ["DE40", "DAX index", "Indices", 18418, 0, 14, -0.44, 0],
    ["UK100", "FTSE 100 index", "Indices", 8241.6, 1, 5.2, 0.12, 0],
    ["JP225", "Nikkei 225 index", "Indices", 38914, 0, 32, 1.24, 0],
    ["XAUUSD", "Gold spot", "Commodities", 2341.5, 1, 0.9, 0.44, 4.6e9],
    ["XAGUSD", "Silver spot", "Commodities", 29.18, 2, 0.06, -0.92, 1.2e9],
    ["WTIUSD", "WTI crude spot", "Commodities", 78.16, 2, 0.12, -1.28, 2.1e9],
    ["NGAS", "Natural gas", "Commodities", 2.684, 3, 0.014, 2.36, 0.7e9],
    ["COPPER", "Copper", "Commodities", 4.482, 3, 0.011, 0.68, 0.5e9],
  ];

  const quotes = UNIVERSE.map(([symbol, name, cls, base, dec, step, chg, vol]) => {
    const rnd = mulberry32(seedOf(symbol));
    const open = base / (1 + chg / 100);
    const series = [];
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      series.push(open + (base - open) * t + (rnd() - 0.5) * step * 5);
    }
    series[series.length - 1] = base;
    return { symbol, name, cls, price: base, open, dec, step, vol, series, rnd };
  });

  const change = (q) => ((q.price - q.open) / q.open) * 100;
  const CLASSES = ["All", "Forex", "Crypto", "Futures", "Indices", "Commodities"];

  /* ------------------------------------------------------------ ticker tape */

  const tape = $("#tape-track");

  function tapeMarkup() {
    return quotes
      .map((q) => {
        const c = change(q);
        return `<a class="tape-item" href="#screener" data-tape="${q.symbol}">
          <b>${q.symbol}</b>
          <span class="t-last">${fmt(q.price, q.dec)}</span>
          <span class="t-chg ${c >= 0 ? "up" : "down"}">${pct(c)}</span>
        </a>`;
      })
      .join("");
  }

  function buildTape() {
    if (!tape) return;
    /* the list is duplicated so the -50% keyframe loops seamlessly */
    tape.innerHTML = tapeMarkup() + tapeMarkup();
  }

  function updateTape(q) {
    if (!tape) return;
    const c = change(q);
    $$(`[data-tape="${CSS.escape(q.symbol)}"]`, tape).forEach((el) => {
      el.querySelector(".t-last").textContent = fmt(q.price, q.dec);
      const chg = el.querySelector(".t-chg");
      chg.textContent = pct(c);
      chg.className = "t-chg " + (c >= 0 ? "up" : "down");
    });
  }

  /* ------------------------------------------------------------ screener */

  const scrBody = $("#screener-body");
  const scrEmpty = $("#screener-empty");
  let scrClass = "All";
  let sortKey = "vol";
  let sortDir = -1;

  const maxVol = Math.max(...quotes.map((q) => q.vol));

  const sorters = {
    symbol: (a, b) => a.symbol.localeCompare(b.symbol),
    cls: (a, b) => a.cls.localeCompare(b.cls) || a.symbol.localeCompare(b.symbol),
    price: (a, b) => a.price - b.price,
    chg: (a, b) => change(a) - change(b),
    vol: (a, b) => a.vol - b.vol,
  };

  function screenerRows() {
    const list = quotes.filter((q) => scrClass === "All" || q.cls === scrClass);
    return list.sort((a, b) => sorters[sortKey](a, b) * sortDir);
  }

  function renderScreener() {
    if (!scrBody) return;
    const list = screenerRows();
    if (scrEmpty) scrEmpty.hidden = list.length > 0;

    scrBody.innerHTML = list
      .map((q) => {
        const c = change(q);
        const share = q.vol ? Math.max(4, (q.vol / maxVol) * 100) : 0;
        return `<tr data-scr="${q.symbol}">
          <td class="sym"><b>${q.symbol}</b><small>${q.name}</small><small class="cls-m">${q.cls}</small></td>
          <td><span class="tag">${q.cls}</span></td>
          <td class="num" data-cell="price">${fmt(q.price, q.dec)}</td>
          <td class="num" data-cell="chg"><span class="chg ${c >= 0 ? "up" : "down"}">${pct(c)}</span></td>
          <td class="num">${q.vol ? compact(q.vol) : "—"}</td>
          <td>${q.vol ? `<div class="bar" role="img" aria-label="Relative turnover"><span style="width:${share.toFixed(0)}%"></span></div>` : ""}</td>
        </tr>`;
      })
      .join("");
  }

  function markSort() {
    $$("#screener th[data-sort]").forEach((th) => {
      if (th.dataset.sort === sortKey) {
        th.setAttribute("aria-sort", sortDir === 1 ? "ascending" : "descending");
        th.querySelector("i").textContent = sortDir === 1 ? "↑" : "↓";
      } else {
        th.removeAttribute("aria-sort");
      }
    });
  }

  function wireScreener() {
    const seg = $("#screener-seg");
    if (seg) {
      seg.innerHTML = CLASSES.map(
        (c) =>
          `<button type="button" role="tab" data-cls="${c}" aria-selected="${c === scrClass}">${c}</button>`
      ).join("");
      seg.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-cls]");
        if (!btn) return;
        scrClass = btn.dataset.cls;
        $$("button", seg).forEach((b) =>
          b.setAttribute("aria-selected", String(b === btn))
        );
        renderScreener();
      });
    }

    $$("#screener th[data-sort]").forEach((th) => {
      th.setAttribute("tabindex", "0");
      const apply = () => {
        const key = th.dataset.sort;
        sortDir = key === sortKey ? -sortDir : key === "symbol" || key === "cls" ? 1 : -1;
        sortKey = key;
        markSort();
        renderScreener();
      };
      th.addEventListener("click", apply);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          apply();
        }
      });
    });
    markSort();
  }

  function updateScreenerRow(q) {
    if (!scrBody) return;
    const tr = scrBody.querySelector(`tr[data-scr="${CSS.escape(q.symbol)}"]`);
    if (!tr) return;
    const c = change(q);
    const price = tr.querySelector('[data-cell="price"]');
    const chg = tr.querySelector('[data-cell="chg"]');
    const rising = q.price >= q.prev;
    price.textContent = fmt(q.price, q.dec);
    chg.innerHTML = `<span class="chg ${c >= 0 ? "up" : "down"}">${pct(c)}</span>`;
    [price, chg].forEach((cell) => {
      cell.classList.remove("flash-up", "flash-down");
      void cell.offsetWidth;
      cell.classList.add(rising ? "flash-up" : "flash-down");
    });
  }

  /* ------------------------------------------------------------ heatmap */

  const heat = $("#heat");

  /* teal-to-red ramp, driven by day change and clamped at ±3% */
  function heatColor(c) {
    const k = Math.max(-1, Math.min(1, c / 3));
    const mag = Math.abs(k);
    /* near-flat symbols stay grey; saturation and darkness grow with the move */
    const sat = 8 + mag * 54;
    const light = 56 - mag * 26;
    const hue = k >= 0 ? 153 : 356;
    return { css: `hsl(${hue} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`, pale: light > 46 };
  }

  function renderHeat() {
    if (!heat) return;
    heat.innerHTML = quotes
      .slice()
      .sort((a, b) => (b.vol || 1) - (a.vol || 1))
      .map((q) => {
        const c = change(q);
        const tone = heatColor(c);
        return `<a class="heat-tile${tone.pale ? " pale" : ""}" href="#screener" data-heat="${q.symbol}" style="background:${tone.css}">
          <span><b>${q.symbol}</b><small>${q.cls}</small></span>
          <span class="h-chg">${pct(c)}</span>
        </a>`;
      })
      .join("");
  }

  function updateHeatTile(q) {
    if (!heat) return;
    const tile = heat.querySelector(`[data-heat="${CSS.escape(q.symbol)}"]`);
    if (!tile) return;
    const c = change(q);
    const tone = heatColor(c);
    tile.style.background = tone.css;
    tile.classList.toggle("pale", tone.pale);
    tile.querySelector(".h-chg").textContent = pct(c);
  }

  /* ------------------------------------------------------------ top movers */

  function moverRows(list) {
    return list
      .map((q) => {
        const c = change(q);
        return `<div class="mover-row" data-mover="${q.symbol}">
          <span><b>${q.symbol}</b><small>${q.name}</small></span>
          <span class="m-last">${fmt(q.price, q.dec)}</span>
          <span class="m-chg ${c >= 0 ? "up" : "down"}">${pct(c)}</span>
        </div>`;
      })
      .join("");
  }

  function renderMovers() {
    const byChg = quotes.slice().sort((a, b) => change(b) - change(a));
    const active = quotes.slice().sort((a, b) => b.vol - a.vol);
    const targets = [
      ["#movers-gain", byChg.slice(0, 5)],
      ["#movers-lose", byChg.slice(-5).reverse()],
      ["#movers-active", active.slice(0, 5)],
    ];
    targets.forEach(([sel, list]) => {
      const el = $(sel);
      if (el) el.innerHTML = moverRows(list);
    });
  }

  /* ------------------------------------------------------------ idea sparklines */

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
    const y = (v) => h - 4 - ((v - min) / span) * (h - 10);

    ctx.beginPath();
    series.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.lineTo(x(series.length - 1), h);
    ctx.lineTo(x(0), h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color + "2e");
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

  function drawIdeaSparks() {
    $$("[data-idea-spark]").forEach((canvas) => {
      const q = quotes.find((x) => x.symbol === canvas.dataset.ideaSpark) || quotes[0];
      const up = canvas.dataset.ideaDir !== "down";
      drawSpark(canvas, q.series, up ? token("--up") : token("--down"));
    });
  }

  /* ------------------------------------------------------------ scroll reveal */

  function wireReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------ live ticks */

  function tick() {
    /* four symbols move per tick; cells update in place, never a reload */
    const picks = new Set();
    while (picks.size < 4) picks.add(Math.floor(Math.random() * quotes.length));

    picks.forEach((i) => {
      const q = quotes[i];
      q.prev = q.price;
      q.price += (Math.random() - 0.48) * q.step * 1.6;
      q.series.push(q.price);
      if (q.series.length > 40) q.series.shift();
      updateTape(q);
      updateScreenerRow(q);
      updateHeatTile(q);
    });

    renderMovers();
  }

  /* ------------------------------------------------------------ boot */

  buildTape();
  wireScreener();
  renderScreener();
  renderHeat();
  renderMovers();
  drawIdeaSparks();
  wireReveal();

  setInterval(tick, 2200);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawIdeaSparks, 140);
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawIdeaSparks);
})();