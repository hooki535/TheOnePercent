/* TheOnePercent — charts
   -------------------------------------------------------------------
   The workspace around the chart: panels, dialogs, the command palette,
   bar replay, alerts, saved workspaces and the keyboard map.

   Two rules hold this file together.

   First, it owns no numbers. The balance, the risk rule, the daily cap
   and the minimum R all come from `Store.settings`, the same values the
   calculators and the dashboard read, so the size this screen suggests
   is the size the journal will record. The sizing itself is done by
   `Instruments.positionSize` rather than repeated here.

   Second, nothing is asserted that cannot be shown. Where this screen
   talks about your history — the win-rate pane, the coaching lines — it
   is reading `Store.trades`, and where there is not enough history it
   says so instead of producing a confident number.

   The reason the screen exists is the hand-off at the bottom: a plan
   drawn on the chart becomes a journal draft with the symbol, the three
   prices, the size, the note and the screenshot already filled in. That
   is the friction the roadmap called the highest-leverage integration in
   Phase 1, and `Store.draft` is the seam it travels through.
   ------------------------------------------------------------------- */

/* ── helpers ─────────────────────────────────────────────────── */
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const fmt = (v, sym) =>
  v == null || isNaN(v) ? "—" : v.toFixed(SYMBOLS[sym].digits);
/* Money is shown in the account currency from settings, not in dollars.
   A Ugandan account reading its risk in USD was a small lie that made
   every number on the panel feel like somebody else's. */
function money(v) {
  if (v == null || isNaN(v)) return "—";
  const code = (state && state.risk && state.risk.currency) || "USD";
  const dp = Instruments.decimals ? Instruments.decimals(code) : 2;
  const n = Math.abs(v).toLocaleString(undefined, {
    maximumFractionDigits: dp,
    minimumFractionDigits: dp,
  });
  return (v < 0 ? "−" : "") + n + " " + code;
}
const cssCache = {};
function css(n) {
  if (!n || !n.startsWith("--")) return n;
  const k = document.documentElement.dataset.theme + n;
  if (cssCache[k]) return cssCache[k];
  return (cssCache[k] = getComputedStyle(document.documentElement)
    .getPropertyValue(n)
    .trim());
}
function toast(title, body, kind = "") {
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.innerHTML = `<b>${title}</b>${body ? `<p>${body}</p>` : ""}`;
  $("#toasts").appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = 0;
    setTimeout(() => el.remove(), 320);
  }, 4200);
}
/* Every timestamp the chart prints — the data window, the crosshair label,
   the axis — goes through the same UTC choice, so no two of them can
   disagree about what hour it is. */
const clock = (t) =>
  new Date(t).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: state.look.utc === false ? undefined : "UTC",
  });
/* ── one dialog at a time ─────────────────────────────────────
   Two sheets used to be able to sit on top of each other: opening the symbol
   search and then the indicator list left both on screen, neither of them
   dismissable by clicking the thing you could see. A modal is a claim on the
   whole screen, so opening one now closes any other that is holding that
   claim. The two dialogs marked `.top` — the command palette and the small
   text prompt — are deliberately layered on top of whatever asked for them,
   so they are the exception and they do not evict what is underneath.

   `modalStack` is the order things were opened in, so Escape closes the
   topmost one rather than all of them, and focus goes back to the control
   that opened it instead of to the top of the document. */
const modalStack = [];
const modalReturn = new WeakMap();

const show = (s) => {
    const el = $(s);
    if (!el || el.hidden === false) return;
    if (!el.classList.contains("top"))
      modalStack
        .slice()
        .filter((m) => !m.classList.contains("top"))
        .forEach((m) => hide("#" + m.id));
    const from = document.activeElement;
    if (from && from !== document.body) modalReturn.set(el, from);
    el.hidden = false;
    modalStack.push(el);
    const focusable = el.querySelector(
      "input:not([type=hidden]), select, textarea, button:not([data-close])",
    );
    if (focusable) setTimeout(() => focusable.focus(), 20);
  },
  hide = (s) => {
    const el = typeof s === "string" ? $(s) : s;
    if (!el || el.hidden === true) return;
    el.hidden = true;
    el.dispatchEvent(new CustomEvent("pplx-dismiss"));
    const i = modalStack.lastIndexOf(el);
    if (i > -1) modalStack.splice(i, 1);
    const back = modalReturn.get(el);
    modalReturn.delete(el);
    if (back && back.isConnected && document.body.contains(back)) {
      const still = modalStack[modalStack.length - 1];
      if (!still || still.contains(back)) back.focus();
    }
  },
  hideTopModal = () => {
    const top = modalStack[modalStack.length - 1];
    if (!top) return false;
    hide(top);
    return true;
  };

/* Tab is kept inside the open sheet, because a keyboard user tabbing into the
   chart behind a dialog they cannot see is the same trap in slower motion. */
addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Tab") return;
    const m = modalStack[modalStack.length - 1];
    if (!m || m.hidden !== false) return;
    const items = [...m.querySelectorAll(
      'a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0],
      last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!m.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  },
  true,
);

/* ── state ───────────────────────────────────────────────────── */
function newChart(sym, iv, studies) {
  return {
    sym,
    iv,
    studies: studies || [
      makeStudy("ema", { length: 21 }),
      makeStudy("ema", { length: 55 }),
      makeStudy("vol"),
    ],
    view: { n: 140, end: 0, fwd: 0 },
    scale: { mode: "normal", auto: true, factor: 1, offset: 0, invert: false },
    vp: false,
  };
}
const state = {
  layout: 1,
  sel: 0,
  charts: [
    newChart("EURUSD", "15m", [
      makeStudy("ema", { length: 21 }),
      makeStudy("ema", { length: 55 }),
      makeStudy("vol"),
      makeStudy("rsi"),
    ]),
    newChart("GBPJPY", "15m"),
    newChart("XAUUSD", "1H"),
    newChart("NAS100", "15m"),
    newChart("BTCUSD", "1H"),
    newChart("DXY", "1H"),
  ],
  type: "candle",
  tool: "cursor",
  magnet: true,
  trades: true,
  drawColor: "#7E96FF",
  drawStyle: {
    color: "#7E96FF",
    width: 1.5,
    dash: "solid",
    fill: 12,
    extendR: false,
    extendL: false,
    label: true,
    font: 11,
  },
  compare: new Set(),
  /* Which of the watch tab's three views is showing. */
  watchView: "list",
  look: {
    up: "",
    dn: "",
    wickMatch: true,
    gridH: true,
    gridV: true,
    sessions: true,
    countdown: true,
    dataWin: true,
    cross: "free",
    cursor: "cross",
    /* UTC by default: a chart of a global market read by someone in Kampala
       and someone in London should put the same candle at the same label. */
    utc: true,
    syncCross: true,
    syncSymbol: false,
  },
  replay: { on: false, idx: 520, playing: false, speed: 1, blind: false },
  /* Filled by syncSettings() before first paint. Never edited here —
     the calculators and the settings screen own these values. */
  risk: {
    balance: 0,
    pct: 1,
    dayUsed: 0,
    dayCap: 0,
    minRR: 1.5,
    currency: "USD",
    side: "long",
  },
  pos: null,
  drawings: {},
  alerts: [],
  fired: [],
  journal: [],
  hover: null,
  overrides: 0,
  selObj: null,
  watch: [],
  live: true,
  notes: "",
};

/* ── settings, watchlist and the day's risk ──────────────────────

   The watchlist is seeded from the markets picked during onboarding and
   then belongs to the user: once they add or remove a row, the edited
   list is what persists. Seeding rather than hard-coding is what makes
   a Kampala trader who chose Forex open this screen to USDUGX instead
   of a list of US index CFDs they will never trade. */

const WATCH_DEFAULTS = {
  Forex: ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "USDUGX", "USDKES"],
  Crypto: ["BTCUSD", "ETHUSD", "SOLUSD"],
  Indices: ["US500", "US30", "NAS100", "DE40"],
  Commodities: ["XAUUSD", "XAGUSD"],
  Futures: ["NQ1!", "ES1!", "CL1!"],
};

function seedWatch() {
  const me = (window.Shell && Shell.profile ? Shell.profile() : null) || {};
  const picked = (me.markets || []).map((m) => String(m).toLowerCase());
  const keys = Object.keys(WATCH_DEFAULTS).filter((k) =>
    picked.some(
      (p) => k.toLowerCase().includes(p) || p.includes(k.toLowerCase()),
    ),
  );
  const out = [];
  (keys.length ? keys : ["Forex", "Commodities", "Crypto"]).forEach((k) => {
    WATCH_DEFAULTS[k].forEach((s) => {
      if (Instruments.find(s) && out.indexOf(s) < 0) out.push(s);
    });
  });
  return out.slice(0, 14);
}

/* One read of the shared settings, mirrored into state.risk. Called at
   startup and again whenever another tab or screen changes them, so a
   balance edited in the calculators shows up here without a reload. */
function syncSettings() {
  const s = Store.settings.get();
  const g = Store.guardrails(Store.trades.list(), s);
  const R = state.risk;
  R.balance = +s.balance || 0;
  R.pct = +s.riskPct || 1;
  R.dayCap = +s.maxDailyLossPct || 0;
  R.minRR = +s.minRR || 1.5;
  R.currency = s.currency || "USD";
  /* What the rule has already spent today: realised losses, from the
     journal — not a number this screen invents. */
  R.dayUsed = g.lossPctToday || 0;

  const saved = Array.isArray(s.chartsWatch)
    ? s.chartsWatch.filter((x) => Instruments.find(x))
    : null;
  state.watch = saved && saved.length ? saved : seedWatch();
  if (typeof s.chartsUtc === "boolean") state.look.utc = s.chartsUtc;
  if (typeof s.chartsWatchView === "string")
    state.watchView = s.chartsWatchView;
  /* Favourite drawing tools live in the same settings blob; the rail owns the
     list and reads it here so one sync covers the whole page. */
  if (typeof loadFavs === "function") loadFavs();
  if (state.pos) recalc();
}

function saveWatch() {
  Store.settings.patch({ chartsWatch: state.watch.slice() });
}

/* Alerts live in the shared settings so they survive a reload and are
   visible to the rest of the app. No seeded examples: an empty alert
   list is the truth for a new account, and a fake one would be the
   first thing the user tried to delete. */
function loadAlerts() {
  const a = Store.settings.get().chartsAlerts;
  state.alerts = Array.isArray(a) ? a : [];
}
function saveAlerts() {
  Store.settings.patch({
    chartsAlerts: state.alerts.map((a) => ({ ...a, _fired: undefined })),
  });
}

/* ── undo / redo ─────────────────────────────────────────────── */
const undoStack = [],
  redoStack = [];
function snapshotState() {
  return JSON.stringify({
    charts: state.charts.map((c) => ({
      ...c,
      studies: c.studies.map((s) => ({ ...s, _c: undefined })),
    })),
    drawings: state.drawings,
    layout: state.layout,
    pos: state.pos,
    type: state.type,
  });
}
function pushUndo() {
  undoStack.push(snapshotState());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}
function applySnap(j) {
  const o = JSON.parse(j);
  state.charts = o.charts;
  state.drawings = o.drawings;
  state.layout = o.layout;
  state.pos = o.pos;
  state.type = o.type;
  buildGrid();
  paintAll();
}
function undo() {
  if (!undoStack.length) return toast("Nothing to undo");
  redoStack.push(snapshotState());
  applySnap(undoStack.pop());
  toast("Undone");
}
function redo() {
  if (!redoStack.length) return toast("Nothing to redo");
  undoStack.push(snapshotState());
  applySnap(redoStack.pop());
  toast("Redone");
}

/* ══════════════════════════════════════════════════════════════
   position maths — the differentiator
   ══════════════════════════════════════════════════════════════ */
function makePos(key, a, b, opts) {
  /* The interval is stripped off the end of the key. Built from the live
     interval list rather than a hard-coded alternation, so adding an
     interval cannot quietly break symbol lookup here. */
  const sym = key.replace(
    new RegExp(
      "(" +
        INTERVALS.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .sort((x, y) => y.length - x.length)
          .join("|") +
        ")$",
    ),
    "",
  );
  let entry = a,
    stop = b;
  /* The short-position tool forces the direction instead of reading it off
     the drag, so dragging upward from entry still gives you a short. */
  const want = opts && opts.side;
  if (want === "short" && entry > stop) {
    entry = b;
    stop = a;
  }
  if (want === "long" && entry < stop) {
    entry = b;
    stop = a;
  }
  const dist = Math.abs(entry - stop);
  state.risk.side = entry > stop ? "long" : "short";
  const target = entry > stop ? entry + dist * 2 : entry - dist * 2;
  state.pos = { key, sym, entry, stop, target };
  recalc();
  syncInputs();
  $$(".st").forEach((x) =>
    x.classList.toggle("on", x.dataset.side === state.risk.side),
  );
  if (!(opts && opts.quiet))
    toast(
      "Position tool placed",
      "Size, risk and R come from your balance and your rule — drag any line to resize.",
    );
}
function movePos(k, price) {
  const P = state.pos;
  P[k] = price;
  state.risk.side = P.entry > P.stop ? "long" : "short";
  recalc();
  syncInputs();
  $$(".st").forEach((x) =>
    x.classList.toggle("on", x.dataset.side === state.risk.side),
  );
}
/* The sizing answer comes from Instruments.positionSize — the same
   function behind the calculators screen. This used to be its own
   arithmetic with its own pip values, which is why the two screens
   could disagree about a yen pair. The only work left here is rounding
   to a tradeable step and translating the result into the readouts. */
function recalc() {
  const P = state.pos;
  if (!P) {
    renderReadouts();
    return;
  }
  const S = SYMBOLS[P.sym],
    R = state.risk,
    inst = S.instrument;
  const riskCash = (R.balance * R.pct) / 100;

  const ideal = Instruments.positionSize({
    instrument: inst,
    entry: P.entry,
    stop: P.stop,
    riskMoney: riskCash,
    accountCurrency: R.currency,
  });
  if (!ideal) {
    P.calc = null;
    renderReadouts();
    return;
  }

  /* Brokers deal in steps, so the size actually tradeable is the rounded
     one — and every number below is recomputed from that, not from the
     ideal. Rounding up past the rule is what the warning is for. */
  const unitsPerSize = S.unit === "lots" ? inst.contract : 1;
  const rawSize = ideal.units / unitsPerSize;
  const size = Math.max(S.step, Math.round(rawSize / S.step) * S.step);
  const units = size * unitsPerSize;

  const fx = ideal.fx;
  const dist = Math.abs(P.entry - P.stop);
  const ticks = dist / inst.pip;
  const perPriceUnit =
    units * inst.unitValue * fx; /* account money per 1.0 of price */
  const realRisk = dist * perPriceUnit;
  const reward = Math.abs(P.target - P.entry) * perPriceUnit;
  const cost = (S.costTicks || 1) * inst.pip * perPriceUnit;
  const pctOfBal = R.balance ? (realRisk / R.balance) * 100 : 0;

  P.calc = {
    size: +size.toFixed(S.step < 0.01 ? 3 : 2),
    units,
    ticks,
    fx,
    risk: realRisk,
    reward,
    cost,
    r: realRisk > 0 ? (reward - cost) / realRisk : 0,
    pct: pctOfBal,
    over: pctOfBal > R.pct * 1.05,
    day: R.dayUsed + pctOfBal,
    ruleSize: +(size * (pctOfBal ? R.pct / pctOfBal : 1)).toFixed(
      S.step < 0.01 ? 3 : 2,
    ),
  };
  renderReadouts();
}
function renderReadouts() {
  const box = $("#readouts"),
    P = state.pos,
    R = state.risk;
  /* keep the two account fields showing what Store actually holds */
  const bEl = $("#fBalance"),
    rEl = $("#fRisk");
  if (bEl && document.activeElement !== bEl) bEl.value = R.balance;
  if (rEl && document.activeElement !== rEl) rEl.value = R.pct;
  const cur = $("#balCur");
  if (cur) cur.textContent = R.currency;
  if (!P) {
    box.innerHTML = `<div class="ro"><span>Nothing on the chart yet</span><b>—</b></div>`;
    $("#warn").hidden = true;
    $("#coachBody").innerHTML = coachHTML(null);
    return;
  }
  const S = SYMBOLS[P.sym],
    c = P.calc;
  box.innerHTML = `
    <div class="ro big"><span>Size</span><b>${c.size} ${S.unit}</b></div>
    <div class="ro"><span>Risk</span><b class="dn">${money(c.risk)} <em>${c.pct.toFixed(2)}% of balance</em></b></div>
    <div class="ro"><span>Reward at target</span><b class="up">${money(c.reward)}</b></div>
    <div class="ro"><span>R multiple, after costs</span><b>${c.r.toFixed(2)}R</b></div>
    <div class="ro"><span>Stop distance</span><b>${c.ticks.toFixed(S.tickName === "pips" ? 1 : 0)} ${S.tickName}</b></div>
    <div class="ro"><span>Spread + commission</span><b>${money(c.cost)} <em>${((c.cost / c.risk) * 100).toFixed(1)}% of risk</em></b></div>
    <div class="ro"><span>Day risk if filled</span><b>${c.day.toFixed(1)}% <em>cap ${R.dayCap.toFixed(1)}%</em></b></div>`;
  const overDay = c.day > R.dayCap,
    w = $("#warn");
  if (c.over || overDay) {
    w.hidden = false;
    $("#warnH").textContent = c.over
      ? `Size is ${c.pct.toFixed(2)}% — above your ${R.pct.toFixed(1)}% rule`
      : `This fill takes today to ${c.day.toFixed(1)}%, past your ${R.dayCap.toFixed(1)}% day cap`;
    $("#warnB").textContent = c.over
      ? `Sizing to the rule would be ${((c.size * R.pct) / c.pct).toFixed(S.step < 0.01 ? 3 : 2)} ${S.unit}. Nothing is blocked — the warning and your choice are both written to the journal entry.`
      : `You can still take it. The override is recorded with the entry so the weekly review sees the sequence, not just the result.`;
  } else w.hidden = true;
  $("#rpFill").style.width = Math.min(100, (c.day / R.dayCap) * 100) + "%";
  $("#rpFill").style.background =
    c.day > R.dayCap
      ? css("--dn")
      : c.day > R.dayCap * 0.7
        ? css("--warn")
        : css("--acc");
  $("#rpVal").textContent = `${c.day.toFixed(1)}% / ${R.dayCap.toFixed(1)}%`;
  $("#coachBody").innerHTML = coachHTML(P);
}
function atrTicks(sym) {
  const c = charts[state.sel],
    d = c ? c.data : getSeries(sym, "15m");
  const r = d.slice(-14).reduce((a, b) => a + (b.h - b.l), 0) / 14;
  return Math.max(1e-9, r / SYMBOLS[sym].tick);
}
/* What this symbol has actually done in the journal. Returns null rather
   than a shrug of a number when the sample is too thin to mean anything —
   the caller drops the line entirely in that case. */
function symbolRecord(sym) {
  const rows = Store.trades
    .list()
    .filter((t) => t.symbol === sym)
    .map((t) => Store.compute(t))
    .filter((m) => m && !m.open && m.netPL != null);
  if (rows.length < 5) return { n: rows.length, thin: true };
  const wins = rows.filter((m) => m.netPL > 0);
  const wr = wins.length / rows.length;
  const avgWin = wins.length
    ? wins.reduce((a, m) => a + m.netPL, 0) / wins.length
    : 0;
  const losses = rows.filter((m) => m.netPL <= 0);
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((a, m) => a + m.netPL, 0) / losses.length)
    : 0;
  /* R needed to break even at this hit rate: (1-wr)/wr */
  const breakeven = wr > 0 && wr < 1 ? (1 - wr) / wr : null;
  return { n: rows.length, thin: false, wr, avgWin, avgLoss, breakeven };
}

function hourRecord(sym, hour) {
  const rows = Store.trades
    .list()
    .filter(
      (t) => t.symbol === sym && t.date && new Date(t.date).getHours() === hour,
    )
    .map((t) => Store.compute(t))
    .filter((m) => m && !m.open && m.netPL != null);
  if (rows.length < 3) return null;
  return {
    n: rows.length,
    wr: rows.filter((m) => m.netPL > 0).length / rows.length,
  };
}

function coachHTML(P) {
  if (!P)
    return `<div><i>·</i><span>Pick the position tool (<kbd>P</kbd>) and drag from your entry to your stop. Size, risk, R and the day budget appear here.</span></div>`;
  const c = P.calc;
  if (!c)
    return `<div><i>·</i><span>Entry and stop are at the same price, so there is no risk to size against. Drag the stop away from the entry.</span></div>`;

  const S = SYMBOLS[P.sym],
    rec = symbolRecord(P.sym),
    items = [];
  const atr = atrTicks(P.sym);

  items.push(
    `Stop sits ${c.ticks.toFixed(0)} ${S.tickName} away — ${(c.ticks / atr).toFixed(1)}× the 14-bar ATR on this interval.`,
  );

  /* The R judgement is made against the user's own minimum from settings,
     and sharpened by their record on this symbol only when there is one. */
  if (rec.thin) {
    items.push(
      c.r < state.risk.minRR
        ? `Target is ${c.r.toFixed(2)}R after costs, under the ${state.risk.minRR}R minimum in your settings.`
        : `Target is ${c.r.toFixed(2)}R after costs, above the ${state.risk.minRR}R minimum in your settings.`,
    );
  } else {
    const be = rec.breakeven;
    items.push(
      be && c.r < be
        ? `Target is ${c.r.toFixed(2)}R after costs. At your ${Math.round(rec.wr * 100)}% hit rate on ${P.sym} across ${rec.n} trades, break-even needs ${be.toFixed(2)}R.`
        : `Target is ${c.r.toFixed(2)}R after costs${be ? `, past the ${be.toFixed(2)}R your ${Math.round(rec.wr * 100)}% hit rate on ${P.sym} needs to break even` : ""}.`,
    );
  }

  /* Only speak about the hour if the journal has something to say. */
  const hr = hourRecord(P.sym, new Date().getHours());
  if (hr)
    items.push(
      `You are ${Math.round(hr.wr * 100)}% on ${P.sym} in this hour of the day, across ${hr.n} logged trade${hr.n === 1 ? "" : "s"}.`,
    );
  else if (rec.thin && rec.n === 0)
    items.push(
      `No logged trades on ${P.sym} yet, so there is no record to check this against. Journalling this one starts it.`,
    );

  items.push(
    c.cost / c.risk > 0.08
      ? `Spread and commission are ${((c.cost / c.risk) * 100).toFixed(0)}% of the risk at this stop distance — the ${S.spread} ${S.tickName} spread on ${S.venue}. A wider stop, or a cheaper session, is the fix.`
      : `Spread and commission are ${((c.cost / c.risk) * 100).toFixed(1)}% of the risk, at the ${S.spread} ${S.tickName} spread on ${S.venue}.`,
  );

  items.push(
    `Save to journal carries the symbol, all three prices, the size, your note and a picture of the chart into a draft entry.`,
  );

  return items.map((t) => `<div><i>·</i><span>${t}</span></div>`).join("");
}
function syncInputs() {
  const P = state.pos;
  if (!P) return;
  const S = SYMBOLS[P.sym];
  $("#fEntry").value = P.entry.toFixed(S.digits);
  $("#fStop").value = P.stop.toFixed(S.digits);
  $("#fTarget").value = P.target.toFixed(S.digits);
  $("#fEntry").step = $("#fStop").step = $("#fTarget").step = S.tick;
}

/* ══════════════════════════════════════════════════════════════
   grid / render loop
   ══════════════════════════════════════════════════════════════ */
let charts = [];
function buildGrid() {
  const g = $("#grid");
  g.innerHTML = "";
  g.dataset.layout = state.layout;
  charts = [];
  for (let i = 0; i < state.layout; i++) {
    const c = new Chart(i);
    g.appendChild(c.el);
    charts.push(c);
  }
  if (state.sel >= state.layout) state.sel = 0;
  charts.forEach((c) => c.el.classList.toggle("sel", c.slot === state.sel));
  draw();
}
let raf = null;
function draw() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = null;
    charts.forEach((c) => c.render());
  });
}
addEventListener("resize", draw);
function select(slot) {
  if (state.sel === slot) return;
  state.sel = slot;
  charts.forEach((c) => c.el.classList.toggle("sel", c.slot === slot));
  paintIntervals();
  paintSymbol();
  paintIndCount();
  paintObjects();
  paintTypeBtn();
}

/* ══════════════════════════════════════════════════════════════
   tools rail
   ══════════════════════════════════════════════════════════════ */
/* The rail, its icons, its groups and its flyouts live in
   assets/charts-rail.js — forty tools in eight group buttons. `setTool`
   and `renderRail` come from there. */

/* ══════════════════════════════════════════════════════════════
   top bar painters
   ══════════════════════════════════════════════════════════════ */
/* ── intervals ────────────────────────────────────────────────
   Twenty-nine intervals will not fit across a toolbar, so the chips show
   favourites only and the dropdown carries the full ladder, grouped by unit
   with a star on each row. That is TradingView's arrangement and it is the
   right one — the four you actually trade stay one click away.

   Favourites live in state and travel with a saved workspace. */
function ivFavs() {
  if (!state.ivFavs)
    state.ivFavs = (Feed.IV_DEFAULT_FAVS || INTERVALS.slice(0, 7)).slice();
  return state.ivFavs;
}
function setInterval_(iv) {
  state.charts[state.sel].iv = iv;
  closeIvMenu();
  paintIntervals();
  draw();
}
function paintIntervals() {
  const cur = state.charts[state.sel].iv;
  const favs = ivFavs();
  /* The current interval always shows as a chip even when it is not a
     favourite, so the toolbar never fails to say what you are looking at. */
  const shown = favs.includes(cur) ? favs : favs.concat([cur]);
  $("#intervals").innerHTML = shown
    .map(
      (i) =>
        `<button class="chip ${cur === i ? "on" : ""} ${favs.includes(i) ? "" : "ghost"}" data-iv="${i}"
      title="${favs.includes(i) ? i : i + " — not a favourite, showing because it is selected"}">${i}</button>`,
    )
    .join("");
  $$("#intervals .chip").forEach(
    (b) => (b.onclick = () => setInterval_(b.dataset.iv)),
  );
  const v = $("#ivBtnV");
  if (v) v.textContent = cur;
  if ($("#ivMenu") && $("#ivMenu").classList.contains("open")) paintIvMenu();
}
function paintIvMenu() {
  const m = $("#ivMenu");
  if (!m) return;
  const cur = state.charts[state.sel].iv,
    favs = ivFavs();
  const groups = Feed.IV_GROUPS || [{ label: "", ivs: INTERVALS }];
  /* Anything added through "custom interval" is not in Feed's groups, so it
     gets a group of its own rather than disappearing from the menu. */
  const known = new Set(groups.reduce((a, g) => a.concat(g.ivs), []));
  const custom = INTERVALS.filter((i) => !known.has(i));
  const all = groups.concat(
    custom.length ? [{ label: "Custom", ivs: custom }] : [],
  );
  m.innerHTML =
    `<div class="mh">Interval</div>` +
    `<button class="iv-add" id="ivAdd">Add custom interval…</button>` +
    all
      .map(
        (g) =>
          `<div class="fly-s">${g.label}</div>` +
          g.ivs
            .map(
              (i) =>
                `<div class="iv-r ${cur === i ? "on" : ""}">
           <button class="iv-p" data-iv="${i}">${i}<span>${ivWords(i)}</span></button>
           <button class="iv-star ${favs.includes(i) ? "on" : ""}" data-fav="${i}"
             aria-label="${favs.includes(i) ? "Remove " + i + " from favourites" : "Add " + i + " to favourites"}"
             aria-pressed="${favs.includes(i)}">
             <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l1.9 4 4.4.6-3.2 3 .8 4.3L8 11.5 4.1 13.5l.8-4.3-3.2-3 4.4-.6z"
               fill="${favs.includes(i) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.3"/></svg>
           </button>
         </div>`,
            )
            .join(""),
      )
      .join("") +
    `<div class="fly-f">Starred intervals become the chips in the toolbar.</div>`;
  $$("#ivMenu [data-iv]").forEach(
    (b) => (b.onclick = () => setInterval_(b.dataset.iv)),
  );
  $$("#ivMenu [data-fav]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        const i = b.dataset.fav,
          f = ivFavs(),
          k = f.indexOf(i);
        if (k < 0) f.push(i);
        else if (f.length > 1) f.splice(k, 1);
        else
          return toast(
            "Keep at least one favourite",
            "The chips would have nothing to show.",
          );
        f.sort((a, b2) => IV_MS[a] - IV_MS[b2]);
        paintIntervals();
        paintIvMenu();
      }),
  );
  $("#ivAdd").onclick = addCustomInterval;
}
/* "45m" reads as forty-five minutes; spelling it out is what makes the
   longer end of the ladder unambiguous (1M is a month, not a minute). */
function ivWords(iv) {
  const n = parseFloat(iv),
    u = iv.replace(/[\d.]/g, "");
  const word =
    { s: "second", m: "minute", H: "hour", D: "day", W: "week", M: "month" }[
      u
    ] || "";
  return word ? n + " " + word + (n === 1 ? "" : "s") : "";
}
function addCustomInterval() {
  const raw = prompt(
    "Interval — a number and a unit.\n\ns seconds · m minutes · H hours · D days · W weeks · M months\n\nFor example 7m, 90m, 2D, 8H.",
  );
  if (raw == null) return;
  const v = raw.trim().replace(/\s+/g, "");
  const mm = /^(\d+(?:\.\d+)?)([smHhDdWwMy])$/.exec(v);
  if (!mm)
    return toast(
      "That is not an interval",
      "Give a number and one of s, m, H, D, W, M — for example 7m or 8H.",
    );
  let [, num, unit] = mm;
  num = parseFloat(num);
  /* h and H both mean hours, but m and M do not both mean minutes, so the
     case of the month/minute unit is taken literally and the rest is not. */
  if (unit === "h") unit = "H";
  if (unit === "d") unit = "D";
  if (unit === "w") unit = "W";
  if (unit === "y") unit = "M";
  const per = { s: 1e3, m: 6e4, H: 36e5, D: 864e5, W: 6048e5, M: 2592e6 };
  if (!per[unit] || !(num > 0)) return toast("That is not an interval");
  const id = num + unit,
    ms = num * per[unit];
  if (ms < 1000)
    return toast("Too short", "A second is the finest this feed generates.");
  if (IV_MS[id]) {
    setInterval_(id);
    return toast(id + " already exists", "Selected it.");
  }
  IV_MS[id] = ms;
  INTERVALS.push(id);
  INTERVALS.sort((a, b) => IV_MS[a] - IV_MS[b]);
  if (!ivFavs().includes(id)) {
    ivFavs().push(id);
    ivFavs().sort((a, b) => IV_MS[a] - IV_MS[b]);
  }
  setInterval_(id);
  toast(
    id + " added",
    "Candles are generated for it the same way as any other interval. It is starred, so it is in the chips.",
  );
}
/* ── date ranges ──────────────────────────────────────────────
   A range is a span of time, not a number of bars, which is the whole
   difficulty: "1Y" on a one-minute chart is 375,000 bars and the view caps
   at 520. So a range picks the interval too — the finest rung of the ladder
   that covers the span in a sensible number of candles — and then sets the
   zoom. That is what TradingView does when the interval changes by itself
   after you click 5Y, and it is the only honest answer: the alternative is
   showing a year of a minute chart as a 520-bar sliver of one afternoon and
   labelling it 1Y.

   YTD is a real calendar measurement, not 365 days. */
const RANGES = [
  { id: "1D", name: "1 day", ms: 864e5 },
  { id: "5D", name: "5 days", ms: 5 * 864e5 },
  { id: "1M", name: "1 month", ms: 30 * 864e5 },
  { id: "3M", name: "3 months", ms: 91 * 864e5 },
  { id: "6M", name: "6 months", ms: 182 * 864e5 },
  { id: "YTD", name: "Year to date", ytd: true },
  { id: "1Y", name: "1 year", ms: 365 * 864e5 },
  { id: "5Y", name: "5 years", ms: 5 * 365 * 864e5 },
  { id: "All", name: "Everything the feed holds", all: true },
];
function rangeMs(r) {
  if (r.ytd) {
    const n = new Date();
    return n - new Date(Date.UTC(n.getUTCFullYear(), 0, 1));
  }
  return r.ms;
}
/* Target roughly 160 candles: enough structure to read, few enough to see. */
function ivForSpan(ms) {
  const want = 160;
  let best = INTERVALS[0],
    bestErr = Infinity;
  INTERVALS.forEach((iv) => {
    const bars = ms / IV_MS[iv];
    if (bars < 24) return; /* too few candles to be a chart */
    const err = Math.abs(Math.log(bars / want));
    if (err < bestErr) {
      bestErr = err;
      best = iv;
    }
  });
  return best;
}
function setRange(id) {
  const r = RANGES.find((x) => x.id === id);
  if (!r) return;
  const ch = state.charts[state.sel];
  const c = charts[state.sel];
  if (!c) return;
  ch.range = id;

  if (r.all) {
    /* Everything means everything, so the interval is left alone and the
       view opens as wide as the engine allows. */
    c.view.n = Math.min(520, c.raw ? c.raw.length : 520);
    c.view.end = 0;
    c.view.fwd = 0;
    paintRanges();
    draw();
    return;
  }

  const ms = rangeMs(r);
  const iv = ivForSpan(ms);
  const changed = iv !== ch.iv;
  if (changed) ch.iv = iv;
  /* Re-read after a possible interval change so the bar count matches the
     series actually on screen. */
  paintIntervals();
  const bars = Math.round(ms / IV_MS[ch.iv]);
  const c2 = charts[state.sel];
  c2.view.n = Math.max(20, Math.min(520, bars));
  c2.view.end = 0;
  c2.view.fwd = 0;
  paintRanges();
  draw();
  if (changed)
    toast(
      id + " needs " + ch.iv + " candles",
      "A " +
        r.name.toLowerCase() +
        " span is more bars than one chart can show at the old interval, so the interval moved with it.",
    );
}
/* Any zoom or pan by hand means the view no longer matches a named range. */
function clearRange() {
  const ch = state.charts[state.sel];
  if (ch && ch.range) {
    ch.range = null;
    paintRanges();
  }
}
function paintRanges() {
  const el = $("#ranges");
  if (!el) return;
  const cur = state.charts[state.sel].range;
  el.innerHTML = RANGES.map(
    (r) =>
      `<button class="cb-btn ${cur === r.id ? "on" : ""}" data-range="${r.id}" title="${r.name}">${r.id}</button>`,
  ).join("");
  $$("#ranges [data-range]").forEach(
    (b) => (b.onclick = () => setRange(b.dataset.range)),
  );
}

/* ── clock ────────────────────────────────────────────────────
   TradingView shows exchange time. There is no exchange here, so it shows
   the two times that are actually true — the clock on this machine and UTC —
   and says which one it is showing rather than implying a venue. */
function paintClock() {
  const c = $("#tzClock"),
    n = $("#tzName");
  if (!c) return;
  const utc = state.look.utc !== false;
  const d = new Date();
  c.textContent = utc
    ? d.toISOString().slice(11, 19)
    : d.toTimeString().slice(0, 8);
  n.textContent = utc ? "UTC" : localTzName();
}
function localTzName() {
  try {
    const p = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(new Date())
      .find((x) => x.type === "timeZoneName");
    return p ? p.value : "Local";
  } catch (e) {
    return "Local";
  }
}

function closeIvMenu() {
  const m = $("#ivMenu"),
    b = $("#ivBtn");
  if (m) m.classList.remove("open");
  if (b) b.setAttribute("aria-expanded", "false");
}
function paintSymbol() {
  const c = state.charts[state.sel];
  $("#symName").textContent = c.sym;
  $("#symMeta").textContent = SYMBOLS[c.sym].venue;
  $$("#wl .wr").forEach((r) =>
    r.classList.toggle("on", r.dataset.sym === c.sym),
  );
}
function paintTypeBtn() {
  const t = TYPES.find((x) => x[0] === state.type);
  $("#typeBtn").firstChild.textContent = (t ? t[1] : "Candles") + " ";
  $$("#typeMenu button").forEach((b) =>
    b.classList.toggle("on", b.dataset.t === state.type),
  );
}
function paintLayoutBtn() {
  $$("#layoutMenu button").forEach((b) =>
    b.classList.toggle("on", +b.dataset.l === state.layout),
  );
}
function paintIndCount() {
  $("#indCount").textContent = state.charts[state.sel].studies.length;
}
function setSymbol(sym) {
  /* Every route to a symbol — search, watchlist, compare chip, a journal row,
     the command palette — comes through here, so this is the one honest place
     to record what was actually looked at. */
  pushRecent(sym);
  if (state.look.syncSymbol) state.charts.forEach((c) => (c.sym = sym));
  else state.charts[state.sel].sym = sym;
  if (state.pos && charts[state.sel] && state.pos.key !== charts[state.sel].key)
    state.pos = null;
  paintSymbol();
  paintSymCard();
  paintWatchlist();
  paintObjects();
  renderReadouts();
  draw();
}

/* ── the card above the watchlist ────────────────────────────────

   What the chart is showing, said in words and in a price big enough to
   read across a room, because the number in the legend is 11px and sits
   inside a busy corner.

   Everything here is read from Feed at paint time — the same call the
   legend, the watchlist row and the position panel make. Nothing is
   stored, so the card cannot hold a stale price while the chart moves on.

   The day range is a real bar, not an ornament: the marker sits where the
   last price falls between the session low and the session high, which is
   the one question a number alone cannot answer — 2341.75 is meaningless
   until you know the day ran 2320 to 2345. */
function paintSymCard() {
  const el = $("#symCard");
  if (!el) return;
  const sym = state.charts[state.sel].sym,
    S = Feed.symbol(sym),
    q = Feed.quote(sym);
  if (!S || !q) {
    el.innerHTML = "";
    return;
  }
  const d = Feed.history(sym, "15m"),
    day = new Date(d[d.length - 1].t).getUTCDate();
  let lo = Infinity,
    hi = -Infinity;
  for (let i = d.length - 1; i >= 0; i--) {
    if (new Date(d[i].t).getUTCDate() !== day) break;
    lo = Math.min(lo, d[i].l);
    hi = Math.max(hi, d[i].h);
  }
  const at = hi > lo ? ((q.price - lo) / (hi - lo)) * 100 : 50;
  const up = q.chgPct >= 0,
    dg = S.digits;
  /* The last digit is set apart the way a broker terminal does it: the pip
     you are actually paid in should not look like the digits you are not. */
  const px = q.price.toFixed(dg),
    head = px.slice(0, -1),
    tail = px.slice(-1);
  el.innerHTML =
    `<div class="sc-h"><div><b>${sym}</b><span class="sc-m">${S.market}</span></div>
       <div class="sc-n">${S.name} · ${S.venue}</div></div>
     <div class="sc-p ${up ? "up" : "dn"}"><span>${head}</span><i>${tail}</i>
       <em>${S.quote || ""}</em></div>
     <div class="sc-c ${up ? "up" : "dn"}">${up ? "+" : "−"}${Math.abs(q.chg).toFixed(dg)}
       <span>${up ? "+" : "−"}${Math.abs(q.chgPct).toFixed(2)}%</span>
       <b>today</b></div>
     <div class="sc-rg" title="Where the last price sits between the session low and the session high">
       <span class="sc-rl">${lo.toFixed(dg)}</span>
       <span class="sc-rt"><i style="left:${at.toFixed(1)}%"></i></span>
       <span class="sc-rl">${hi.toFixed(dg)}</span></div>
     <div class="sc-f">
       <span title="The spread charged on this symbol">Spread <b>${S.spread.toFixed(1)} ${S.tickName}</b></span>
       <span title="The session this symbol is most liquid in">Session <b>${S.session}</b></span>
       <span title="The interval the chart is drawn at">Interval <b>${state.charts[state.sel].iv}</b></span>
     </div>` + specHTML(sym, S);
}

/* ── contract specification ────────────────────────────────────
   The Details view is the symbol card plus the numbers a trader needs before
   sizing a position, and those are not decoration: you cannot work out a lot
   size without the contract size and what one pip of it is worth. Every value
   here is read from the instrument table that the position panel and the
   calculators size from, so the three cannot disagree.

   Nothing is estimated. Where the table has no value for a field the row is
   left out rather than filled with a plausible number. */
function specHTML(sym, S) {
  const inst = Instruments.find(sym);
  if (!inst) return "";
  const rows = [];
  const add = (k, v, t) => {
    if (v != null && v !== "") rows.push([k, v, t || ""]);
  };
  const num = (n) => n.toLocaleString("en-US");
  /* Format a tick at its own precision. A tick of 0.25 rendered at the price's
     decimals minus one is "0.3", and a tick of 0.1 on a one-decimal index is
     "0" — a contract spec that rounds the tick is worse than no contract spec,
     because a wrong number reads as an authoritative one. */
  const exact = (n) => {
    const str = String(n);
    const dp = str.includes(".") ? str.split(".")[1].length : 0;
    return n.toFixed(dp);
  };
  /* "lots" → "lot". Crypto's unit is already a ticker (BTC) and takes no s. */
  const one =
    S.unit === "lots" ? "lot" : S.unit === "contracts" ? "contract" : S.unit;

  /* What one unit of size actually is. `contract` is the base-currency amount
     behind a lot on FX and metals; on an index or a future it is 1 and the
     money lives in `unitValue` instead, so those get the multiplier rather than
     a meaningless "1". */
  /* Crypto would otherwise read "One BTC = 1 BTC", which is true and useless.
     It is sized in the coin itself, and the smallest-size row below carries the
     only number there is to carry. */
  add(
    S.market === "Crypto" ? "Sized in" : `One ${one}`,
    S.contract > 1
      ? `${num(S.contract)} ${S.base || ""}`.trim()
      : S.market === "Crypto"
        ? `${S.base}, any fraction`
        : S.unitValue
          ? `${num(S.unitValue)} ${S.quote || ""} per point`.trim()
          : null,
    S.contract > 1
      ? "One standard lot, in the base currency"
      : "What one unit of size is worth per point of price",
  );
  add(
    `One ${S.tickName === "pips" ? "pip" : "point"}`,
    S.tick != null ? exact(S.tick) : null,
    "The move this market counts as one",
  );
  try {
    const pv = Instruments.pipValuePerLot(inst);
    add(
      `${S.tickName === "pips" ? "Pip" : "Point"} value`,
      pv
        ? `${pv >= 1000 ? num(Math.round(pv)) : pv.toFixed(2)} ${S.quote || ""}`.trim()
        : null,
      `Per ${one}, in the quote currency`,
    );
  } catch (e) {
    /* An instrument the table cannot value omits the row rather than guess. */
  }
  add(
    "Smallest size",
    S.step ? `${exact(S.step)} ${S.unit}` : null,
    "The size increment this market trades in",
  );
  add(
    "Quoted to",
    `${S.digits} ${S.digits === 1 ? "decimal" : "decimals"}`,
    "Digits shown on the price",
  );
  add("Market", S.market, "");
  add("Venue", S.venue, "Where this price is quoted from");

  return `<div class="sc-spec">
    <div class="sc-sh">Contract</div>
    ${rows
      .map(
        ([k, v, t]) =>
          `<div class="sc-sr"${t ? ` title="${t}"` : ""}><span>${k}</span><b class="mono">${v}</b></div>`,
      )
      .join("")}
    <p class="sc-sn">Read from the same instrument table the position panel and the calculators size from, so the three cannot disagree. Prices are simulated.</p>
  </div>`;
}

/* ── watchlist with sparklines ───────────────────────────────── */
let wlSort = "none";
function paintWatchlist() {
  /* Quote, change and sparkline all come from Feed, so a row and the main
     chart can never show two different prices for the same symbol. */
  const rows = state.watch
    .map((s) => {
      const S = SYMBOLS[s],
        q = Feed.quote(s);
      if (!S || !q) return null;
      return { s, S, last: q.price, ch: q.chgPct, d: Feed.spark(s, 40) };
    })
    .filter(Boolean);
  if (wlSort === "gain") rows.sort((a, b) => b.ch - a.ch);
  if (wlSort === "loss") rows.sort((a, b) => a.ch - b.ch);
  if (wlSort === "name") rows.sort((a, b) => a.s.localeCompare(b.s));
  /* Grouped by asset class, because a list that runs EURUSD, XAUUSD, BTCUSD,
     US500 in one column asks the reader to classify every row themselves.
     Order is fixed rather than alphabetical so the groups do not reshuffle
     when a symbol is added. Suppressed while a sort is active: a heading
     that says FOREX above rows ordered by percentage gain would be lying
     about what governs the order. */
  const GRP = ["Forex", "Commodities", "Indices", "Futures", "Crypto"];
  const row = (r) => `
    <div class="wr ${state.charts[state.sel].sym === r.s ? "on" : ""}" data-sym="${r.s}">
      <div class="wr-l"><span class="wr-s">${r.s}</span><span class="wr-n">${r.S.name}</span></div>
      <canvas class="spark" width="72" height="26" data-spark="${r.s}"></canvas>
      <div class="wr-r"><span class="wr-p">${r.last.toFixed(r.S.digits)}</span>
        <span class="wr-c ${r.ch >= 0 ? "up" : "dn"}">${r.ch >= 0 ? "+" : "−"}${Math.abs(r.ch).toFixed(2)}%</span></div>
      <button class="wr-x" data-rm="${r.s}" title="Remove from watchlist">✕</button></div>`;
  if (wlSort === "none") {
    $("#wl").innerHTML = GRP.map((g) => {
      const inG = rows.filter((r) => r.S.market === g);
      if (!inG.length) return "";
      return (
        `<div class="wl-g">${g}<span>${inG.length}</span></div>` +
        inG.map(row).join("")
      );
    }).join("");
  } else {
    $("#wl").innerHTML = rows.map(row).join("");
  }
  rows.forEach((r) => {
    const cv = $(`#wl [data-spark="${r.s}"]`);
    if (!cv) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = 72 * dpr;
    cv.height = 26 * dpr;
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lo = Math.min(...r.d),
      hi = Math.max(...r.d),
      y = (v) => 24 - ((v - lo) / (hi - lo || 1)) * 22;
    c.beginPath();
    r.d.forEach((v, i) => {
      const x = (i / (r.d.length - 1)) * 70 + 1;
      i ? c.lineTo(x, y(v)) : c.moveTo(x, y(v));
    });
    c.strokeStyle = r.ch >= 0 ? css("--up") : css("--dn");
    c.lineWidth = 1.2;
    c.stroke();
    c.lineTo(71, 26);
    c.lineTo(1, 26);
    c.closePath();
    c.globalAlpha = 0.12;
    c.fillStyle = r.ch >= 0 ? css("--up") : css("--dn");
    c.fill();
  });
  $$("#wl .wr").forEach(
    (r) =>
      (r.onclick = (e) => {
        if (e.target.dataset.rm !== undefined) return;
        setSymbol(r.dataset.sym);
      }),
  );
  $$("#wl [data-rm]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        state.watch = state.watch.filter((x) => x !== b.dataset.rm);
        saveWatch();
        paintWatchlist();
      }),
  );
  paintCompare();
}

/* The compare chips are their own view now, so they paint on their own. They
   still follow the watchlist, because comparing against something you do not
   watch is not a thing this panel offers. */
function paintCompare() {
  if (!$("#cmp")) return;
  const cur = state.charts[state.sel].sym;
  /* The eight-chip cap was there because these lived under the watchlist with
     two rows of room. The view is the whole pane now, so every watched symbol
     is offered. The current symbol is not: overlaying a chart on itself draws
     a flat line at zero. */
  const list = state.watch.filter((x) => x !== cur);
  $("#cmp").innerHTML =
    (list.length
      ? list
          .map(
            (s) =>
              `<button class="chip ${state.compare.has(s) ? "on" : ""}" data-cmp="${s}" aria-pressed="${state.compare.has(s)}">${s}</button>`,
          )
          .join("")
      : `<div class="empty">Add a second symbol to the watchlist and it can be overlaid here.</div>`) +
    `<p class="wsub-note cmp-n">${
      state.compare.size
        ? `Overlaid on ${cur}: <b>${[...state.compare].join(", ")}</b>. Two at a time — a third replaces the first.`
        : `Nothing overlaid. Pick up to two.`
    }</p>`;
  $$("#cmp .chip").forEach(
    (b) =>
      (b.onclick = () => {
        const s = b.dataset.cmp;
        state.compare.has(s) ? state.compare.delete(s) : state.compare.add(s);
        if (state.compare.size > 2) state.compare.delete([...state.compare][0]);
        paintCompare();
        draw();
        toast(
          "Comparison updated",
          "Overlaid in percent from the left edge of the visible window.",
        );
      }),
  );
}

/* ── objects tree ────────────────────────────────────────────── */
function paintObjects() {
  const c = charts[state.sel];
  if (!c || !$("#objs")) return;
  const list = c.drw;
  $("#objTitle").textContent = `${c.cfg.sym} · ${c.cfg.iv}`;
  $("#objs").innerHTML = list.length
    ? list
        .map(
          (o, i) => `
    <div class="ob ${o.id === state.selObj ? "sel" : ""}" data-o="${o.id}">
      <span class="ob-n">${DRAW[o.t] ? DRAW[o.t].name : o.t}</span>
      <span class="ob-v mono">${o.pts[0].p != null ? fmt(o.pts[0].p, c.cfg.sym) : "—"}</span>
      <button data-a="eye" title="${o.hidden ? "Show" : "Hide"}">${o.hidden ? "◎" : "◉"}</button>
      <button data-a="lock" title="${o.locked ? "Unlock" : "Lock"}">${o.locked ? "🔒" : "🔓"}</button>
      <button data-a="set" title="Settings">⚙</button>
      <button data-a="del" title="Remove">✕</button>
    </div>`,
        )
        .join("")
    : `<div class="empty">No drawings on this chart yet. Pick a tool on the left rail.</div>`;
  $$("#objs .ob").forEach((el) => {
    el.onclick = (e) => {
      if (e.target.dataset.a) return;
      state.selObj = el.dataset.o;
      paintObjects();
      draw();
    };
    el.querySelectorAll("[data-a]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          const o = c.drw.find((x) => x.id === el.dataset.o);
          if (!o) return;
          const a = b.dataset.a;
          if (a === "eye") o.hidden = !o.hidden;
          if (a === "lock") o.locked = !o.locked;
          if (a === "del") {
            pushUndo();
            state.drawings[c.key] = c.drw.filter((x) => x.id !== o.id);
          }
          if (a === "set") {
            state.selObj = o.id;
            editDrawing(c, o);
            return;
          }
          paintObjects();
          draw();
        }),
    );
  });
  $("#objCount").textContent = list.length;
}

/* ── journal ─────────────────────────────────────────────────── */
let jlScope = "symbol";

/* The journal panel is a reader, not a second journal. Entries come from
   Store.trades and clicking one loads its symbol and interval back onto
   the chart, so reviewing a trade means looking at it again rather than
   reading a description of it. */
function paintJournal() {
  const all = Store.trades.list();
  const sym = state.charts[state.sel].sym;
  const mine = all.filter((t) => t.symbol === sym);
  const rows = (jlScope === "symbol" ? mine : all).slice(0, 40);
  const esc = (t) =>
    String(t == null ? "" : t).replace(
      /[&<>"]/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
    );

  $("#jlScope").innerHTML = [
    ["symbol", sym],
    ["all", "All symbols"],
  ]
    .map(
      ([k, label]) =>
        `<button class="chip ${jlScope === k ? "on" : ""}" data-scope="${k}">${esc(label)}</button>`,
    )
    .join("");
  $$("#jlScope [data-scope]").forEach(
    (b) =>
      (b.onclick = () => {
        jlScope = b.dataset.scope;
        paintJournal();
      }),
  );

  if (!rows.length) {
    $("#jl").innerHTML = `<div class="empty">
      <b>${all.length ? `Nothing logged on ${esc(sym)} yet.` : "Your journal is empty."}</b>
      <p>${
        all.length
          ? "Switch to all symbols to see the rest, or plan this one on the chart and save it across."
          : "Plan a trade with the position tool, write what you expect in the note below, then Save to journal. The entry arrives with the prices and the chart already attached."
      }</p>
    </div>`;
    return;
  }

  $("#jl").innerHTML =
    rows
      .map((t) => {
        const m = Store.compute(t);
        const r = m && m.rMultiple != null ? m.rMultiple : null;
        const when = t.date
          ? new Date(t.date).toLocaleString("en-GB", {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";
        const tags = (t.tags || []).slice(0, 3);
        return `<div class="je" data-id="${esc(t.id)}">
      <div class="je-h"><div><span class="je-s">${esc(t.symbol)} ${esc(String(t.side || "").toLowerCase())}</span>
        <div class="je-t">${esc(when)}${t.chartState && t.chartState.interval ? " · " + esc(t.chartState.interval) : ""}</div></div>
        ${
          m && m.open
            ? `<span class="je-r">open</span>`
            : r != null
              ? `<span class="je-r ${r >= 0 ? "up" : "dn"}">${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}R</span>`
              : `<span class="je-r">—</span>`
        }</div>
      ${tags.length ? `<div class="je-tags">${tags.map((x) => `<span class="tag ${/rule|honoured|planned/.test(x) ? "rule" : ""}">${esc(x)}</span>`).join("")}</div>` : ""}
      ${t.plan ? `<div class="je-n">${esc(t.plan).slice(0, 180)}${t.plan.length > 180 ? "…" : ""}</div>` : ""}
    </div>`;
      })
      .join("") +
    `<p class="hint">Click an entry to load its symbol and interval back onto the chart. Open it in the journal for the full note and the screenshot.</p>`;

  $$("#jl .je").forEach(
    (el) =>
      (el.onclick = () => {
        const t = Store.trades.find(el.dataset.id);
        if (!t) return;
        const c = state.charts[state.sel];
        if (Instruments.find(t.symbol)) c.sym = t.symbol;
        if (
          t.chartState &&
          t.chartState.interval &&
          IV_MS[t.chartState.interval]
        )
          c.iv = t.chartState.interval;
        buildGrid();
        paintSymbol();
        paintWatchlist();
        draw();
        toast(
          "Chart reloaded from the entry",
          `${t.symbol} on the ${c.iv}. Drawings are not restored — the screenshot on the entry is the record of those.`,
        );
      }),
  );
}

/* ── alerts ──────────────────────────────────────────────────── */
function paintAlerts() {
  $("#al").innerHTML =
    state.alerts
      .map(
        (a, i) => `
    <div class="ai" data-a="${i}"><div class="ai-d"><div class="ai-t">${a.title}</div><div class="ai-c">${a.cond}</div></div>
      <div class="sw ${a.on ? "on" : ""}" data-sw="${i}"><i></i></div>
      <button class="ai-x" data-rm="${i}" title="Delete alert">✕</button></div>`,
      )
      .join("") +
    `<div class="alog"><span class="lbl">Triggered</span>${
      state.fired.length
        ? state.fired
            .slice(0, 12)
            .map(
              (f) =>
                `<div class="lg"><b>${f.title}</b><span>${f.when} · ${f.px}</span></div>`,
            )
            .join("")
        : `<div class="empty">Nothing has fired yet. Alerts also fire inside replay, so you can test one on history before you trust it.</div>`
    }</div>` +
    `<p class="hint">Checked on this device while the page is open, and saved with your settings so they survive a reload. Server-side evaluation, which would let you close the tab, arrives with the backend.</p>`;
  $$("#al [data-sw]").forEach(
    (el) =>
      (el.onclick = () => {
        const a = state.alerts[+el.dataset.sw];
        a.on = !a.on;
        a.fired = false;
        saveAlerts();
        paintAlerts();
        draw();
      }),
  );
  $$("#al [data-rm]").forEach(
    (el) =>
      (el.onclick = () => {
        state.alerts.splice(+el.dataset.rm, 1);
        saveAlerts();
        paintAlerts();
        draw();
      }),
  );
}

/* ══════════════════════════════════════════════════════════════
   indicator browser — per chart, with real parameters
   ══════════════════════════════════════════════════════════════ */
let famSel = "overlay";

/* ── indicator templates ──────────────────────────────────────
   A workspace saves every chart in the layout; a template saves one thing,
   the set of studies, so it can be dropped onto any symbol on any interval.
   That is the difference that matters in practice: the way you read a chart
   travels between charts, while a workspace is where you left off. Stored as
   a plain list of {id, params}, so a template written today still applies
   after a study gains new inputs — makeStudy fills in whatever is missing. */
const tplList = () => Store.settings.get().chartsTemplates || [];
const tplSave = (list) =>
  Store.settings.patch({ chartsTemplates: list.slice(0, 24) });

async function saveTemplate() {
  const cfg = state.charts[state.sel];
  if (!cfg.studies.length)
    return toast(
      "Nothing to save",
      "Add at least one study before saving it as a template.",
      "warn",
    );
  const name = await ask(
    "Save an indicator template",
    "A name you will recognise later",
    cfg.studies.map((s) => STUDIES[s.id].name).join(" + ").slice(0, 40),
  );
  if (!name) return;
  const list = tplList().filter((t) => t.name !== name);
  list.unshift({
    name,
    studies: cfg.studies.map((s) => ({ id: s.id, params: { ...s.params } })),
  });
  tplSave(list);
  paintInd($("#indSearch").value);
  toast(
    `Template “${name}” saved`,
    `${cfg.studies.length} stud${cfg.studies.length === 1 ? "y" : "ies"}. Apply it to any chart from the indicator list.`,
  );
}
function applyTemplate(name, add) {
  const t = tplList().find((x) => x.name === name);
  if (!t) return;
  const cfg = state.charts[state.sel];
  pushUndo();
  const made = t.studies.map((s) => makeStudy(s.id, s.params));
  cfg.studies = add ? cfg.studies.concat(made) : made;
  paintInd($("#indSearch").value);
  paintIndCount();
  draw();
  toast(
    `${add ? "Added" : "Applied"} “${t.name}”`,
    add
      ? `${made.length} more on ${cfg.sym}.`
      : `${cfg.sym} now shows only this template's ${made.length} stud${made.length === 1 ? "y" : "ies"}. Ctrl Z puts the old set back.`,
  );
}

function paintInd(filter = "") {
  const cfg = state.charts[state.sel];
  const tpls = tplList();
  $("#indFams").innerHTML =
    FAMS.map(([id, n]) => {
      const count = Object.values(STUDIES).filter((s) => s.fam === id).length;
      return `<div class="fam ${famSel === id ? "on" : ""} ${id === "journal" ? "jd" : ""}" data-f="${id}">${n}<b>${count}</b></div>`;
    }).join("") +
    `<div class="tpl-g">
       <div class="mh">Templates</div>
       ${
         tpls.length
           ? tpls
               .map(
                 (t) =>
                   `<div class="tpl" data-t="${t.name.replace(/"/g, "&quot;")}">
                      <button class="tpl-n" data-apply title="Replace the studies on this chart with this set">${t.name}<span>${t.studies.length}</span></button>
                      <button class="tpl-b" data-add title="Add this set on top of what is already here">+</button>
                      <button class="tpl-b" data-del title="Delete this template">✕</button>
                    </div>`,
               )
               .join("")
           : `<p class="hint">No templates yet. Set a chart up the way you read it, then save it here and drop it onto any symbol.</p>`
       }
       <button class="btn sm" id="tplSave">Save this chart's studies</button>
     </div>` +
    `<p class="hint" style="margin-top:8px">Every study here computes for real on this chart. Add the same one twice with different lengths — there is no per-chart cap.</p>`;
  $$("#indFams .fam").forEach(
    (f) =>
      (f.onclick = () => {
        famSel = f.dataset.f;
        paintInd($("#indSearch").value);
      }),
  );
  $("#tplSave").onclick = saveTemplate;
  $$("#indFams .tpl").forEach((el) => {
    const name = el.dataset.t;
    el.querySelector("[data-apply]").onclick = () => applyTemplate(name, false);
    el.querySelector("[data-add]").onclick = () => applyTemplate(name, true);
    el.querySelector("[data-del]").onclick = () => {
      tplSave(tplList().filter((t) => t.name !== name));
      paintInd($("#indSearch").value);
      toast(`Template “${name}” deleted`);
    };
  });
  const q = filter.trim().toLowerCase();
  const rows = Object.entries(STUDIES).filter(([id, S]) =>
    q ? (S.name + S.desc).toLowerCase().includes(q) : S.fam === famSel,
  );
  $("#indList").innerHTML = rows.length
    ? rows
        .map(([id, S]) => {
          const on = cfg.studies.filter((s) => s.id === id).length;
          return `<div class="ir ${on ? "added" : ""}" data-i="${id}"><div><div class="ir-n">${S.name}<span class="ir-w">${S.where === "sub" ? "own pane" : "on price"}</span></div>
      <div class="ir-d">${S.desc}</div></div><span class="ir-a">${on ? on + " on chart · add another" : "Add"}</span></div>`;
        })
        .join("")
    : `<div class="empty">Nothing matches “${filter}”.</div>`;
  $$("#indList .ir").forEach(
    (r) =>
      (r.onclick = () => {
        pushUndo();
        cfg.studies.push(makeStudy(r.dataset.i));
        paintInd($("#indSearch").value);
        paintIndCount();
        draw();
      }),
  );
  paintIndSettings();
}
function paintIndSettings() {
  const cfg = state.charts[state.sel];
  $("#indSettings").innerHTML = cfg.studies.length
    ? cfg.studies
        .map((s) => {
          const S = STUDIES[s.id];
          const fields = Object.keys(S.params)
            .map((k) => {
              const v = s.params[k];
              if (k === "source")
                return `<div class="sp-r"><span>Source</span><select data-uid="${s.uid}" data-k="${k}">
        ${["close", "open", "high", "low", "hl2", "hlc3"].map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;
              return `<div class="sp-r"><span>${k}</span><input type="number" step="${k === "mult" ? 0.1 : 1}" value="${v}" data-uid="${s.uid}" data-k="${k}"></div>`;
            })
            .join("");
          return `<div class="sp"><div class="sp-h">${S.name}<button data-rm="${s.uid}">remove</button></div>
      ${fields || '<div class="sp-r"><span>No parameters</span><span>—</span></div>'}
      <div class="sp-r"><span>Colour</span><input type="color" value="${hexOf(s.color)}" data-uid="${s.uid}" data-k="__color"></div>
      <div class="sp-r"><span>Pane</span><span>${S.where === "sub" ? "separate" : "on price"}</span></div>
      ${S.where === "sub" ? `<div class="sp-r"><span>Pane height</span><input type="range" min="8" max="34" value="${Math.round(s.h * 100)}" data-uid="${s.uid}" data-k="__h"></div>` : ""}
    </div>`;
        })
        .join("")
    : `<div class="empty">Nothing added yet.</div>`;
  $$("#indSettings [data-k]").forEach((f) => {
    const ev = f.type === "range" ? "oninput" : "onchange";
    f[ev] = () => {
      const s = cfg.studies.find((x) => x.uid === f.dataset.uid);
      if (!s) return;
      const k = f.dataset.k;
      if (k === "__color") s.color = f.value;
      else if (k === "__h") s.h = +f.value / 100;
      else s.params[k] = f.type === "number" ? +f.value : f.value;
      draw();
    };
  });
  $$("#indSettings [data-rm]").forEach(
    (b) =>
      (b.onclick = () => {
        pushUndo();
        cfg.studies = cfg.studies.filter((x) => x.uid !== b.dataset.rm);
        paintInd($("#indSearch").value);
        paintIndCount();
        draw();
      }),
  );
}
function hexOf(c) {
  const v = c && c.startsWith("--") ? css(c) : c;
  return /^#[0-9a-f]{6}$/i.test(v || "") ? v : "#4C6BF5";
}
function openStudyCfg(slot, uid) {
  select(slot);
  show("#indModal");
  paintInd(($("#indSearch").value = ""));
  const el = $(`#indSettings [data-uid="${uid}"]`);
  if (el) el.closest(".sp").scrollIntoView({ block: "center" });
}

/* ══════════════════════════════════════════════════════════════
   chart settings
   ══════════════════════════════════════════════════════════════ */
function paintSettings() {
  const L = state.look,
    cfg = state.charts[state.sel];
  const row = (label, ctrl, note) =>
    `<div class="set-r"><div><b>${label}</b>${note ? `<span>${note}</span>` : ""}</div>${ctrl}</div>`;
  const chk = (k, on) =>
    `<label class="sw2"><input type="checkbox" data-look="${k}" ${on ? "checked" : ""}><i></i></label>`;
  $("#setBody").innerHTML = `
    <div class="set-g"><span class="lbl">Candles</span>
      ${row("Up colour", `<input type="color" data-look="up" value="${L.up || hexOf("--up")}">`)}
      ${row("Down colour", `<input type="color" data-look="dn" value="${L.dn || hexOf("--dn")}">`)}
      ${row("Wicks match the body", chk("wickMatch", L.wickMatch))}
    </div>
    <div class="set-g"><span class="lbl">Grid and axes</span>
      ${row("Horizontal grid", chk("gridH", L.gridH))}
      ${row("Vertical grid", chk("gridV", L.gridV))}
      ${row("Session breaks", chk("sessions", L.sessions), "dotted line at each new day")}
      ${row("Countdown to bar close", chk("countdown", L.countdown))}
      ${row(
        "Price scale",
        `<select data-scale="mode">${[
          ["normal", "Regular"],
          ["log", "Logarithmic"],
          ["pct", "Percent"],
        ]
          .map(
            ([v, n]) =>
              `<option value="${v}" ${cfg.scale.mode === v ? "selected" : ""}>${n}</option>`,
          )
          .join("")}</select>`,
      )}
      ${row("Invert the price scale", `<label class="sw2"><input type="checkbox" data-invert ${cfg.scale.invert ? "checked" : ""}><i></i></label>`, "up is down — a chart you cannot read as a rising line is the fastest bias check there is")}
    </div>
    <div class="set-g"><span class="lbl">Cursor</span>
      ${row(
        "Crosshair",
        `<select data-look="cross">${[
          ["free", "Free"],
          ["bar", "Snap to bar"],
        ]
          .map(
            ([v, n]) =>
              `<option value="${v}" ${L.cross === v ? "selected" : ""}>${n}</option>`,
          )
          .join("")}</select>`,
      )}
      ${row("Data window", chk("dataWin", L.dataWin), "OHLC and every study value under the cursor")}
      ${row("Sync crosshair across the layout", chk("syncCross", L.syncCross))}
      ${row("Sync symbol across the layout", chk("syncSymbol", L.syncSymbol))}
    </div>
    <div class="set-g"><span class="lbl">This chart</span>
      ${row("Volume profile of the visible range", `<label class="sw2"><input type="checkbox" data-vp ${cfg.vp ? "checked" : ""}><i></i></label>`)}
      ${row("Live simulated ticks", `<label class="sw2"><input type="checkbox" data-live ${state.live ? "checked" : ""}><i></i></label>`, "the last bar moves; history never changes")}
    </div>`;
  $$("#setBody [data-look]").forEach((f) => {
    f.onchange = () => {
      const k = f.dataset.look;
      state.look[k] = f.type === "checkbox" ? f.checked : f.value;
      draw();
    };
  });
  const sm = $("#setBody [data-scale]");
  if (sm)
    sm.onchange = () => {
      cfg.scale.mode = sm.value;
      cfg.scale.factor = 1;
      cfg.scale.offset = 0;
      draw();
    };
  const iv2 = $("#setBody [data-invert]");
  if (iv2)
    iv2.onchange = () => {
      cfg.scale.invert = iv2.checked;
      draw();
    };
  const vp = $("#setBody [data-vp]");
  if (vp)
    vp.onchange = () => {
      cfg.vp = vp.checked;
      draw();
    };
  const lv = $("#setBody [data-live]");
  if (lv)
    lv.onchange = () => {
      state.live = lv.checked;
      toast(state.live ? "Live ticks on" : "Live ticks paused");
    };
}

/* ══════════════════════════════════════════════════════════════
   symbol search
   ══════════════════════════════════════════════════════════════ */
/* ── symbol search ──────────────────────────────────────────
   Three things a search box like this has to do that a filtered list does not.
   It has to let you browse by asset class when you do not know the ticker —
   nobody types "DE40" from memory. It has to remember what you actually look
   at, because a trader returns to the same four pairs. And it has to be
   drivable from the keyboard alone: type, arrow down, Enter, gone. The class
   row and the `symSel` cursor below are those three. */
let symCls = "all";
let symSel = 0;
let symRows = [];
const recentList = () => Store.settings.get().chartsRecent || [];
function pushRecent(k) {
  const list = [k].concat(recentList().filter((x) => x !== k)).slice(0, 8);
  Store.settings.patch({ chartsRecent: list });
}

function paintSymSearch(q = "") {
  const s = q.trim().toLowerCase();
  const classes = [...new Set(Object.values(SYMBOLS).map((S) => S.cls))].sort();
  const recents = recentList().filter((k) => SYMBOLS[k]);
  const tabs = [["all", "All"]]
    .concat(recents.length ? [["recent", "Recent"]] : [])
    .concat(state.watch.length ? [["watch", "Watchlist"]] : [])
    .concat(classes.map((c) => [c, c]));
  if (!tabs.some(([v]) => v === symCls)) symCls = "all";
  $("#symTabs").innerHTML = tabs
    .map(
      ([v, n]) =>
        `<button class="stab ${symCls === v ? "on" : ""}" data-c="${v}" role="tab" aria-selected="${symCls === v}">${n}</button>`,
    )
    .join("");
  $$("#symTabs .stab").forEach(
    (b) =>
      (b.onclick = () => {
        symCls = b.dataset.c;
        symSel = 0;
        paintSymSearch($("#symSearch").value);
      }),
  );

  /* A class tab narrows the list; typing searches across everything, because
     a ticker you can spell is a stronger signal than a tab you last clicked. */
  let rows = Object.entries(SYMBOLS);
  if (s)
    rows = rows.filter(([k, S]) =>
      (k + S.name + S.cls).toLowerCase().includes(s),
    );
  else if (symCls === "recent")
    rows = recents.map((k) => [k, SYMBOLS[k]]);
  else if (symCls === "watch")
    rows = state.watch.filter((k) => SYMBOLS[k]).map((k) => [k, SYMBOLS[k]]);
  else if (symCls !== "all") rows = rows.filter(([, S]) => S.cls === symCls);
  if (s)
    /* Exact ticker first, then ticker prefix, then everything else — so "eu"
       puts EURUSD above the pair whose description happens to say "euro". */
    /* Within a tier, something you already watch or have just looked at beats
       alphabetical order: "eu" should not put EURGBP above EURUSD just because
       G sorts before U. */
    rows.sort((a, b) => {
      const rank = ([k]) =>
        k.toLowerCase() === s ? 0 : k.toLowerCase().startsWith(s) ? 1 : 2;
      const known = ([k]) =>
        recents.includes(k) ? 0 : state.watch.includes(k) ? 1 : 2;
      return (
        rank(a) - rank(b) || known(a) - known(b) || a[0].localeCompare(b[0])
      );
    });
  symRows = rows.map(([k]) => k);
  symSel = Math.max(0, Math.min(symSel, symRows.length - 1));

  $("#symList").innerHTML =
    rows
      .map(([k, S], i) => {
        const d = getSeries(k, "15m"),
          last = d[d.length - 1].c,
          prev = d[d.length - 25].c,
          ch = ((last - prev) / prev) * 100;
        return `<div class="sr ${i === symSel ? "cur" : ""}" data-s="${k}" data-i="${i}" ${i === symSel ? 'aria-selected="true"' : ""}>
      <div><div class="sr-n">${k}<span class="sr-cls">${S.cls}</span></div><div class="sr-d">${S.name} · ${S.venue}</div></div>
      <div class="sr-r"><span class="mono">${last.toFixed(S.digits)}</span>
        <span class="${ch >= 0 ? "up" : "dn"} mono">${ch >= 0 ? "+" : "−"}${Math.abs(ch).toFixed(2)}%</span>
        <button data-add="${k}" title="Add to watchlist">${state.watch.includes(k) ? "★" : "☆"}</button></div></div>`;
      })
      .join("") || `<div class="empty">No instrument matches “${q}”.</div>`;
  $$("#symList .sr").forEach((el) => {
    el.onmouseenter = () => {
      const i = +el.dataset.i;
      if (i === symSel) return;
      $$("#symList .sr.cur").forEach((x) => x.classList.remove("cur"));
      el.classList.add("cur");
      symSel = i;
    };
    el.onclick = (e) => {
      if (e.target.dataset.add !== undefined) return;
      chooseSymbol(el.dataset.s);
    };
  });
  $("#symCount").textContent = rows.length
    ? `${rows.length} instrument${rows.length === 1 ? "" : "s"} · ↑↓ to move, Enter to open`
    : "";
  $$("#symList [data-add]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        const k = b.dataset.add;
        state.watch.includes(k)
          ? (state.watch = state.watch.filter((x) => x !== k))
          : state.watch.push(k);
        saveWatch();
        paintSymSearch($("#symSearch").value);
        paintWatchlist();
      }),
  );
}

function chooseSymbol(k) {
  setSymbol(k);
  hide("#symModal");
}
/* Arrow keys and Enter are bound to the input rather than the document, so
   they cannot fight the chart's own ← → panning while the sheet is open. */
function symKeys(e) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!symRows.length) return;
    symSel =
      (symSel + (e.key === "ArrowDown" ? 1 : -1) + symRows.length) %
      symRows.length;
    $$("#symList .sr").forEach((el) =>
      el.classList.toggle("cur", +el.dataset.i === symSel),
    );
    const cur = $("#symList .sr.cur");
    if (cur) cur.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" && symRows[symSel]) {
    e.preventDefault();
    chooseSymbol(symRows[symSel]);
  }
}

/* ══════════════════════════════════════════════════════════════
   small text prompt (window.prompt is blocked in sandboxed frames)
   ══════════════════════════════════════════════════════════════ */
function ask(title, label, value = "", type = "text") {
  return new Promise((res) => {
    const m = $("#askModal");
    $("#askTitle").textContent = title;
    $("#askLabel").textContent = label;
    const inp = $("#askIn");
    inp.type = type;
    inp.value = value;
    show("#askModal");
    setTimeout(() => {
      inp.focus();
      inp.select();
    }, 30);
    const done = (v) => {
      hide(m);
      inp.onkeydown = null;
      res(v);
    };
    /* Escape reaches this dialog through the global stack too, so a dismissal
       from there has to resolve the promise rather than leave the caller
       waiting on a sheet that is no longer on screen. */
    m.addEventListener("pplx-dismiss", () => done(null), { once: true });
    $("#askOk").onclick = () => done(inp.value.trim() || null);
    $("#askCancel").onclick = () => done(null);
    inp.onkeydown = (e) => {
      if (e.key === "Enter") done(inp.value.trim() || null);
      if (e.key === "Escape") done(null);
    };
  });
}

/* ══════════════════════════════════════════════════════════════
   drawing settings — style one object, or set the default
   ══════════════════════════════════════════════════════════════ */
const DRAW_COLORS = [
  "#7E96FF",
  "#4C6BF5",
  "#22C08A",
  "#F0524D",
  "#F2B53B",
  "#B07CF0",
  "#3FC7E0",
  "#9FB0CE",
  "#FFFFFF",
];
let drawEdit = null; /* {chart, obj} */

function editDrawing(chart, obj) {
  drawEdit = { chart, obj };
  obj.style = Object.assign({}, DRAW_STYLE_DEFAULTS, obj.style || {});
  paintDrawSettings();
  show("#drawModal");
}
function paintDrawSettings() {
  if (!drawEdit) return;
  const { obj: o, chart: c } = drawEdit,
    st = o.style;
  const name = DRAW[o.t] ? DRAW[o.t].name : o.t;
  const isShape = ["rect", "channel", "text", "prange"].includes(o.t);
  const isLine = [
    "trend",
    "ray",
    "xline",
    "arrow",
    "hline",
    "vline",
    "channel",
    "fib",
    "fibext",
    "measure",
    "rect",
  ].includes(o.t);
  const canExtend = ["trend", "arrow"].includes(o.t);
  const canLabel = ["hline", "trend", "ray", "xline"].includes(o.t);
  $("#drawSub").textContent = `${name} · ${c.cfg.sym} ${c.cfg.iv}`;
  $("#drawBody").innerHTML = `
    <div class="set-g">
      <div class="mh">Line</div>
      <div class="set-r"><span>Colour</span>
        <span class="sw-row">
          ${DRAW_COLORS.map((h) => `<button class="sw2c ${h.toLowerCase() === String(st.color).toLowerCase() ? "on" : ""}" data-col="${h}" style="background:${h}" title="${h}"></button>`).join("")}
          <input type="color" data-k="color" value="${st.color}" />
        </span>
      </div>
      <div class="set-r"><span>Thickness</span>
        <span class="sw-row"><input type="range" min="1" max="5" step="0.5" data-k="width" value="${st.width}" />
        <b class="mono" style="width:26px;text-align:right">${(+st.width).toFixed(1)}</b></span></div>
      ${
        isLine
          ? `<div class="set-r"><span>Style</span>
        <select data-k="dash">
          ${[
            ["solid", "Solid"],
            ["dash", "Dashed"],
            ["dot", "Dotted"],
          ]
            .map(
              ([v, l]) =>
                `<option value="${v}" ${st.dash === v ? "selected" : ""}>${l}</option>`,
            )
            .join("")}
        </select></div>`
          : ""
      }
      ${
        isShape
          ? `<div class="set-r"><span>Fill opacity</span>
        <span class="sw-row"><input type="range" min="0" max="60" step="2" data-k="fill" value="${st.fill}" />
        <b class="mono" style="width:30px;text-align:right">${st.fill}%</b></span></div>`
          : ""
      }
    </div>

    ${
      canExtend || canLabel
        ? `<div class="set-g">
      <div class="mh">Behaviour</div>
      ${
        canExtend
          ? `<div class="set-r"><span>Extend to the right</span><button class="sw2 ${st.extendR ? "on" : ""}" data-t="extendR"><i></i></button></div>
      <div class="set-r"><span>Extend to the left</span><button class="sw2 ${st.extendL ? "on" : ""}" data-t="extendL"><i></i></button></div>`
          : ""
      }
      ${canLabel ? `<div class="set-r"><span>Price label on the axis</span><button class="sw2 ${st.label !== false ? "on" : ""}" data-t="label"><i></i></button></div>` : ""}
    </div>`
        : ""
    }

    <div class="set-g">
      <div class="mh">Note</div>
      <div class="set-r"><span>Text on the chart</span>
        <input type="text" data-k="text" value="${(o.text || "").replace(/"/g, "&quot;")}" placeholder="optional" style="width:180px" /></div>
      ${
        o.t === "text"
          ? `<div class="set-r"><span>Font size</span>
        <span class="sw-row"><input type="range" min="9" max="20" step="1" data-k="font" value="${st.font || 11}" />
        <b class="mono" style="width:26px;text-align:right">${st.font || 11}</b></span></div>`
          : ""
      }
    </div>

    <div class="set-g">
      <div class="mh">This object</div>
      <div class="set-r"><span>Locked — cannot be dragged</span><button class="sw2 ${o.locked ? "on" : ""}" data-o="locked"><i></i></button></div>
      <div class="set-r"><span>Hidden on the chart</span><button class="sw2 ${o.hidden ? "on" : ""}" data-o="hidden"><i></i></button></div>
    </div>`;

  /* colour swatches + native picker */
  $$("#drawBody [data-col]").forEach(
    (b) => (b.onclick = () => setStyle("color", b.dataset.col)),
  );
  $$("#drawBody [data-k]").forEach((el) => {
    const k = el.dataset.k;
    const handler = () => {
      if (k === "text") {
        o.text = el.value;
        draw();
        return;
      }
      setStyle(
        k,
        el.type === "range" || k === "width" || k === "fill" || k === "font"
          ? +el.value
          : el.value,
        el.type === "range",
      );
    };
    el.oninput = handler;
    el.onchange = handler;
  });
  $$("#drawBody [data-t]").forEach(
    (b) => (b.onclick = () => setStyle(b.dataset.t, !st[b.dataset.t])),
  );
  $$("#drawBody [data-o]").forEach(
    (b) =>
      (b.onclick = () => {
        o[b.dataset.o] = !o[b.dataset.o];
        paintDrawSettings();
        paintObjects();
        draw();
      }),
  );
}
function setStyle(k, v, quiet) {
  if (!drawEdit) return;
  drawEdit.obj.style[k] = v;
  if (k === "color") state.drawColor = v;
  draw();
  if (!quiet) paintDrawSettings();
  else {
    const b = $(`#drawBody [data-k="${k}"]`);
    if (b && b.nextElementSibling)
      b.nextElementSibling.textContent =
        k === "fill" ? v + "%" : k === "width" ? (+v).toFixed(1) : v;
  }
}
$("#drawApplyType").onclick = () => {
  if (!drawEdit) return;
  const { obj: o, chart: c } = drawEdit,
    n = c.drw.filter((x) => x.t === o.t).length;
  c.drw.forEach((x) => {
    if (x.t === o.t) x.style = Object.assign({}, o.style);
  });
  draw();
  toast(
    "Style applied",
    `${n} ${DRAW[o.t] ? DRAW[o.t].name.toLowerCase() : o.t} object${n > 1 ? "s" : ""} on this chart now match.`,
  );
};
$("#drawDefault").onclick = () => {
  if (!drawEdit) return;
  state.drawStyle = Object.assign({}, drawEdit.obj.style);
  state.drawColor = state.drawStyle.color;
  toast(
    "Default style set",
    "New drawings will be created with this colour, thickness and line style.",
    "up",
  );
};
$("#drawClone").onclick = () => {
  if (!drawEdit) return;
  pushUndo();
  const { obj: o, chart: c } = drawEdit;
  const c2 = JSON.parse(JSON.stringify(o));
  c2.id = "o" + Date.now();
  c2.pts.forEach((q) => (q.i += 4));
  c.drw.push(c2);
  state.selObj = c2.id;
  drawEdit.obj = c2;
  paintObjects();
  paintDrawSettings();
  draw();
};
$("#drawRemove").onclick = () => {
  if (!drawEdit) return;
  pushUndo();
  const { obj: o, chart: c } = drawEdit;
  state.drawings[c.key] = c.drw.filter((x) => x.id !== o.id);
  state.selObj = null;
  drawEdit = null;
  hide("#drawModal");
  paintObjects();
  draw();
};

/* ══════════════════════════════════════════════════════════════
   right-click menu
   ══════════════════════════════════════════════════════════════ */
function openCtx(x, y, chart, obj, price) {
  const m = $("#ctx");
  const items = [];
  if (obj) {
    items.push([
      "Drawing settings…",
      () => {
        state.selObj = obj.id;
        paintObjects();
        editDrawing(chart, obj);
      },
    ]);
    items.push([
      obj.locked ? "Unlock drawing" : "Lock drawing",
      () => {
        obj.locked = !obj.locked;
        paintObjects();
        draw();
      },
    ]);
    items.push([
      "Clone drawing",
      () => {
        pushUndo();
        const c2 = JSON.parse(JSON.stringify(obj));
        c2.id = "o" + Date.now();
        c2.pts.forEach((p) => (p.i += 4));
        chart.drw.push(c2);
        paintObjects();
        draw();
      },
    ]);
    items.push([
      "Alert on this drawing",
      () =>
        openAlert(
          obj.pts[0].p || price,
          chart.cfg.sym,
          "from the drawing you right-clicked",
        ),
    ]);
    items.push([
      "Remove drawing",
      () => {
        pushUndo();
        state.drawings[chart.key] = chart.drw.filter((o) => o.id !== obj.id);
        paintObjects();
        draw();
      },
    ]);
  } else {
    items.push([
      `Alert at ${fmt(price, chart.cfg.sym)}`,
      () => openAlert(price, chart.cfg.sym),
    ]);
    items.push([
      `Horizontal line at ${fmt(price, chart.cfg.sym)}`,
      () => {
        pushUndo();
        chart.drw.push({
          id: "o" + Date.now(),
          t: "hline",
          pts: [{ i: 0, p: price }],
          style: drawStyle(),
          locked: false,
          hidden: false,
          text: "",
        });
        paintObjects();
        draw();
      },
    ]);
    items.push([
      "Position tool from here",
      () => {
        const a = chart.data;
        const rg = a.slice(-20).reduce((s, b) => s + (b.h - b.l), 0) / 20;
        makePos(chart.key, price, price - rg * 2.2);
        draw();
      },
    ]);
    items.push([
      chart.cfg.vp ? "Hide volume profile" : "Show volume profile",
      () => {
        chart.cfg.vp = !chart.cfg.vp;
        draw();
      },
    ]);
    items.push([
      "Reset the price scale",
      () => {
        chart.cfg.scale = {
          mode: chart.cfg.scale.mode,
          auto: true,
          factor: 1,
          offset: 0,
        };
        chart.fit();
        draw();
      },
    ]);
    items.push(["Save chart snapshot (PNG)", () => snapshotPNG(chart)]);
    items.push(["Log this chart to the journal", logJournal]);
  }
  m.innerHTML = items
    .map((it, i) => `<button data-i="${i}">${it[0]}</button>`)
    .join("");
  m.hidden = false;
  m.style.left = Math.min(innerWidth - 230, x) + "px";
  m.style.top = Math.min(innerHeight - m.offsetHeight - 10, y) + "px";
  m.querySelectorAll("button").forEach(
    (b) =>
      (b.onclick = () => {
        m.hidden = true;
        items[+b.dataset.i][1]();
      }),
  );
}
document.addEventListener(
  "mousedown",
  (e) => {
    if (!e.target.closest("#ctx")) $("#ctx").hidden = true;
  },
  true,
);

/* ══════════════════════════════════════════════════════════════
   alert builder
   ══════════════════════════════════════════════════════════════ */
let condRows = [{ l: "Price", op: "crosses up", r: "" }];
function openAlert(px, sym, sub) {
  const S = SYMBOLS[sym];
  condRows = [{ l: "Price", op: "crosses up", r: px.toFixed(S.digits) }];
  $("#alSub").textContent = sub || `on ${sym} · ${state.charts[state.sel].iv}`;
  paintCond();
  show("#alertModal");
}
function paintCond() {
  const L = [
    "Price",
    "RSI 14",
    "EMA 21",
    "Day risk used",
    "My drawn level",
    "Volume",
    "Position P&L in R",
  ];
  const OP = [
    "crosses up",
    "crosses down",
    "is above",
    "is below",
    "enters",
    "leaves",
  ];
  $("#condRows").innerHTML = condRows
    .map(
      (c, i) => `
    <div class="cr" data-c="${i}">
      <select data-k="l">${L.map((x) => `<option ${x === c.l ? "selected" : ""}>${x}</option>`).join("")}</select>
      <select data-k="op">${OP.map((x) => `<option ${x === c.op ? "selected" : ""}>${x}</option>`).join("")}</select>
      <input data-k="r" value="${c.r}" placeholder="value">
      ${i ? '<button class="rm">✕</button>' : "<span></span>"}
    </div>`,
    )
    .join("");
  $$("#condRows .cr").forEach((row) => {
    const i = +row.dataset.c;
    row
      .querySelectorAll("[data-k]")
      .forEach(
        (f) => (f.onchange = () => (condRows[i][f.dataset.k] = f.value)),
      );
    const rm = row.querySelector(".rm");
    if (rm)
      rm.onclick = () => {
        condRows.splice(i, 1);
        paintCond();
      };
  });
}
const DELIV = ["Push", "Email", "In-app", "Webhook", "SMS"];
function paintDeliv() {
  $("#alDeliv").innerHTML = DELIV.map(
    (d, i) =>
      `<button class="chip ${i < 2 ? "on" : ""}" data-d="${d}">${d}</button>`,
  ).join("");
  $$("#alDeliv .chip").forEach(
    (b) => (b.onclick = () => b.classList.toggle("on")),
  );
}
function checkAlerts() {
  state.alerts.forEach((a) => {
    if (!a.on || !a.px || a.fired) return;
    const d = getSeries(a.sym, state.charts[state.sel].iv),
      b = d[d.length - 1];
    if (!b) return;
    const hit = a.dir === "down" ? b.c <= a.px : b.c >= a.px;
    if (hit) {
      a.fired = true;
      state.fired.unshift({
        title: a.title,
        when: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        px: fmt(b.c, a.sym),
      });
      paintAlerts();
      draw();
      toast(
        "Alert fired · " + a.title,
        "Fired inside replay too, so the alert is tested before it is trusted.",
        "warn",
      );
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   command palette
   ══════════════════════════════════════════════════════════════ */
function palItems() {
  const out = [];
  Object.keys(SYMBOLS).forEach((s) =>
    out.push({
      k: "Symbol",
      t: s,
      s: SYMBOLS[s].name,
      run: () => setSymbol(s),
    }),
  );
  INTERVALS.forEach((i) =>
    out.push({
      k: "Interval",
      t: i,
      s: "selected chart",
      run: () => {
        state.charts[state.sel].iv = i;
        paintIntervals();
        draw();
      },
    }),
  );
  TYPES.forEach(([id, n, s]) =>
    out.push({
      k: "Chart type",
      t: n,
      s,
      run: () => {
        state.type = id;
        paintTypeBtn();
        draw();
      },
    }),
  );
  Object.entries(STUDIES).forEach(([id, S]) =>
    out.push({
      k: "Study",
      t: S.name,
      s: S.where === "sub" ? "own pane" : "on price",
      run: () => {
        pushUndo();
        state.charts[state.sel].studies.push(makeStudy(id));
        paintIndCount();
        draw();
        toast(S.name + " added");
      },
    }),
  );
  RAIL.forEach((g) =>
    g.sections.forEach((sec) =>
      sec.tools.forEach((id) =>
        out.push({
          k: "Tool",
          t: toolName(id),
          s:
            (sec.label || g.name) +
            (toolKey(id) ? " · key " + toolKey(id) : ""),
          run: () => setTool(id),
        }),
      ),
    ),
  );
  [1, 2, 3, 4, 6].forEach((n) =>
    out.push({
      k: "Layout",
      t: n + " chart" + (n > 1 ? "s" : ""),
      s: "one clock, synced crosshair",
      run: () => {
        state.layout = n;
        paintLayoutBtn();
        buildGrid();
      },
    }),
  );
  out.push({
    k: "Action",
    t: "Log this chart to the journal",
    s: "key J",
    run: logJournal,
  });
  out.push({
    k: "Action",
    t: "Chart settings",
    s: "colours, grid, scale",
    run: () => {
      show("#setModal");
      paintSettings();
    },
  });
  out.push({
    k: "Action",
    t: "Volume profile of the visible range",
    s: "this chart",
    run: () => {
      const c = state.charts[state.sel];
      c.vp = !c.vp;
      draw();
    },
  });
  out.push({
    k: "Action",
    t: "Save chart snapshot (PNG)",
    s: "downloads a file",
    run: () => snapshotPNG(charts[state.sel]),
  });
  out.push({
    k: "Action",
    t: "Save this workspace",
    s: "symbols, studies, drawings",
    run: saveWorkspace,
  });
  out.push({
    k: "Action",
    t: "Load a workspace",
    s: "saved locally",
    run: () => {
      show("#wsModal");
      paintWorkspaces();
    },
  });
  out.push({
    k: "Action",
    t: "Open replay",
    s: "one engine, four jobs",
    run: () => toggleReplay(true),
  });
  out.push({
    k: "Action",
    t: "New alert",
    s: "server-side in production",
    run: () => openAlert(lastPx(), state.charts[state.sel].sym),
  });
  out.push({
    k: "Action",
    t: "Toggle theme",
    s: "dark / light",
    run: toggleTheme,
  });
  out.push({
    k: "Action",
    t: "Keyboard map",
    s: "key ?",
    run: () => show("#keysModal"),
  });
  out.push({
    k: "Action",
    t: "What ships in which wave",
    s: "roadmap tags",
    run: () => show("#wavesModal"),
  });
  return out;
}
let palSel = 0,
  palCache = [];
function paintPal(q = "") {
  const all = palItems();
  palCache = q
    ? all
        .filter((i) =>
          (i.t + i.k + i.s).toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 40)
    : all.slice(0, 40);
  palSel = 0;
  $("#palList").innerHTML =
    palCache
      .map(
        (i, n) => `<div class="pi ${n === 0 ? "sel" : ""}" data-p="${n}">
    <span class="pi-k">${i.k}</span><span class="pi-t">${i.t}</span><span class="pi-s">${i.s || ""}</span></div>`,
      )
      .join("") || `<div class="empty">No match.</div>`;
  $$("#palList .pi").forEach(
    (el) =>
      (el.onclick = () => {
        palCache[+el.dataset.p].run();
        hide("#palette");
      }),
  );
}
function palMove(d) {
  palSel = Math.max(0, Math.min(palCache.length - 1, palSel + d));
  $$("#palList .pi").forEach((el, i) =>
    el.classList.toggle("sel", i === palSel),
  );
  const el = $$("#palList .pi")[palSel];
  if (el) el.scrollIntoView({ block: "nearest" });
}

/* ══════════════════════════════════════════════════════════════
   workspaces, snapshot, journal hand-off
   ══════════════════════════════════════════════════════════════ */
/* Workspaces go through Store like everything else, so they inherit its
   storage fallback — a sandboxed frame with blocked storage degrades to
   memory for the session instead of throwing. */
const readWS = () => {
  const w = Store.settings.get().chartsWorkspaces;
  return Array.isArray(w) ? w : [];
};
const writeWS = (w) => {
  try {
    Store.settings.patch({ chartsWorkspaces: w });
  } catch (e) {}
};
async function saveWorkspace() {
  const name = await ask(
    "Save workspace",
    "Name this workspace",
    "Session · " + new Date().toLocaleDateString("en-GB"),
  );
  if (!name) return;
  const w = readWS();
  w.unshift({
    name,
    at: new Date().toISOString(),
    data: JSON.parse(snapshotState()),
    look: state.look,
    watch: state.watch,
    type: state.type,
  });
  writeWS(w.slice(0, 20));
  toast(
    "Workspace saved",
    "Symbols, intervals, studies with their parameters, drawings and the layout. Stored on this device only.",
    "up",
  );
}
function paintWorkspaces() {
  const w = readWS();
  $("#wsList").innerHTML = w.length
    ? w
        .map(
          (
            x,
            i,
          ) => `<div class="ws"><div><b>${x.name}</b><span>${new Date(x.at).toLocaleString("en-GB")} · ${x.data.charts.length} charts</span></div>
    <div><button class="btn sm" data-load="${i}">Load</button><button class="btn sm" data-del="${i}">Delete</button></div></div>`,
        )
        .join("")
    : `<div class="empty">No saved workspaces yet. Save one from the toolbar, or with Ctrl+S.</div>`;
  $$("#wsList [data-load]").forEach(
    (b) =>
      (b.onclick = () => {
        const x = readWS()[+b.dataset.load];
        pushUndo();
        state.look = x.look || state.look;
        state.watch = x.watch || state.watch;
        state.type = x.type || state.type;
        applySnap(JSON.stringify(x.data));
        hide("#wsModal");
        toast("Workspace loaded", x.name);
      }),
  );
  $$("#wsList [data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        const w2 = readWS();
        w2.splice(+b.dataset.del, 1);
        writeWS(w2);
        paintWorkspaces();
      }),
  );
}
/* ── snapshot ──────────────────────────────────────────────────
   A chart image leaves this app and gets posted in a group chat, so it has to
   carry two things the live screen does not need: where it came from, and that
   the prices are not real. The logo answers the first. The words "Simulated
   prices" answer the second, and they are not optional — a candlestick chart
   with a broker-looking price scale is exactly the thing people screenshot and
   pass off as a live account.

   Drawn on a copy, never on the live canvas: the mark belongs in the file, not
   on the screen the user is still trading from. */
function stampSnapshot(src, c) {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const x = out.getContext("2d");
  x.drawImage(src, 0, 0);

  /* The engine draws at devicePixelRatio, so the backing store is larger than
     the CSS box. Scale the stamp by the same factor or it comes out tiny on a
     retina capture and oversized on a 1x one. */
  const box = src.getBoundingClientRect();
  const k = box.width ? src.width / box.width : 1;
  x.setTransform(k, 0, 0, k, 0, 0);
  const W = src.width / k,
    H = src.height / k;

  const root = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (root.getPropertyValue(n) || "").trim() || fb;
  const brand = tok("--brand", "#5B7CFF");
  const onBrand = tok("--on-brand", "#ffffff");
  const ink = tok("--ink", "#e8ecf4");
  const muted = tok("--muted", "#9aa6bd");
  const bg = tok("--bg", "#0e1117");

  const MONO =
    '600 10px ui-monospace, SFMono-Regular, Menlo, "DejaVu Sans Mono", monospace';
  const SANS =
    '600 12.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const pad = 10,
    mark = 22,
    r = 6,
    inner = 9;

  const stamp =
    new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const line2 = `${c.cfg.sym} · ${c.cfg.iv} · ${stamp} · Simulated prices`;

  /* Measure before placing: the plate is sized to the text, and the text
     carries a timestamp whose width is not knowable in advance. */
  x.font = MONO;
  const w2 = x.measureText(line2).width;
  x.font = SANS;
  const wName = x.measureText("TheOnePercent").width;

  const plateW = Math.min(
    W - pad * 2,
    Math.max(mark + 7 + wName, w2) + inner * 2,
  );
  const plateH = mark + 13 + inner * 2;
  /* Bottom left, clear of the time axis. TX is the strip the engine reserves
     along the bottom for times; laid out from the canvas edge instead, the
     caption sat on top of "09:00" and the plate ran off the bottom of the
     image. The price scale owns the right edge and the legend is a DOM overlay
     rather than pixels, so this corner is the one reliably free of drawn
     content. */
  const plateX = pad,
    plateY = Math.max(pad, H - TX - pad - plateH);
  const bx = plateX + inner,
    by = plateY + inner;

  /* A plate behind it, because the stamp has to stay legible over a green
     candle, a red candle and an indicator pane alike. */
  x.globalAlpha = 0.72;
  x.fillStyle = bg;
  roundRect(x, plateX, plateY, plateW, plateH, 8);
  x.fill();
  x.globalAlpha = 1;

  x.fillStyle = brand;
  roundRect(x, bx, by, mark, mark, r);
  x.fill();
  x.fillStyle = onBrand;
  x.font = MONO;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("1%", bx + mark / 2, by + mark / 2 + 0.5);

  x.textAlign = "left";
  x.textBaseline = "alphabetic";
  x.fillStyle = ink;
  x.font = SANS;
  x.fillText("TheOnePercent", bx + mark + 7, by + 16);

  x.fillStyle = muted;
  x.font = MONO;
  x.fillText(line2, bx, by + mark + 11);

  return out;
}

/* Path only — the caller decides fill or stroke. */
function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  if (x.roundRect) {
    x.roundRect(px, py, w, h, r);
    return;
  }
  /* Older engines: the same path by hand rather than square corners. */
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

function snapshotPNG(chart) {
  const c = chart || charts[state.sel];
  const a = document.createElement("a");
  a.download = `TheOnePercent-${c.cfg.sym}-${c.cfg.iv}-${new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "")}.png`;
  a.href = stampSnapshot(c.cv, c).toDataURL("image/png");
  a.click();
  toast(
    "Snapshot saved",
    "The chart as drawn, with your annotations, stamped TheOnePercent and marked as simulated prices.",
  );
}

/* A JPEG of the chart canvas, annotations included, small enough to sit
   in a journal entry without filling the device store. The journal keeps
   chart state too — state is what makes an entry searchable, the picture
   is what makes it recognisable a month later, and the roadmap asked for
   the picture. Both, then. */
function annotatedShot(chart) {
  const c = chart || charts[state.sel];
  try {
    const src = c.cv,
      maxW = 900;
    const scale = Math.min(1, maxW / src.width);
    const out = document.createElement("canvas");
    out.width = Math.round(src.width * scale);
    out.height = Math.round(src.height * scale);
    const x = out.getContext("2d");
    /* the canvas is transparent where the page shows through, so lay the
       surface colour down first or the JPEG comes back black */
    x.fillStyle = css("--surf") || "#131D38";
    x.fillRect(0, 0, out.width, out.height);
    x.drawImage(src, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", 0.72);
  } catch (e) {
    /* a tainted canvas must not cost the user the rest of the draft */
    return null;
  }
}
function lastPx() {
  const c = charts[state.sel];
  const d = c.data;
  return d[d.length - 1].c;
}

/* Chart state worth restoring later: enough to put the screen back the
   way it was, without the pixel data. */
function chartStateFor(c) {
  return {
    symbol: c.cfg.sym,
    interval: c.cfg.iv,
    type: state.type,
    studies: (c.cfg.studies || []).map((s) => ({ id: s.id, params: s.params })),
    drawings: (state.drawings[c.key] || []).length,
    view: { n: c.cfg.view.n, end: c.cfg.view.end },
    at: new Date().toISOString(),
  };
}
/* ── the hand-off ────────────────────────────────────────────────

   Writes a draft and sends the user to the journal, where the trade form
   opens with everything already in it. `Store.draft` is consumed exactly
   once by journal.js, which is what stops a plan being logged twice.

   Nothing is saved as a trade here. The user still confirms it on the
   journal screen — a chart is where a trade is planned, not where it is
   declared to have happened. */
function logJournal() {
  const c = charts[state.sel],
    cfg = c.cfg,
    P = state.pos;
  const S = SYMBOLS[cfg.sym];
  const marks = (c.drw || []).length;
  const notes = (($("#notes") && $("#notes").value) || "").trim();

  if (!P && !notes) {
    toast(
      "Nothing to carry over yet",
      "Place the position tool (P) or write a note below, then save. The journal needs at least a plan or a price.",
    );
    return;
  }

  const tags = ["planned on chart"];
  if (P)
    tags.push(
      P.calc.over ? "size override" : `sized to ${state.risk.pct.toFixed(1)}%`,
    );
  if (marks) tags.push(`${marks} drawing${marks === 1 ? "" : "s"} on chart`);
  if (cfg.studies.length)
    tags.push(
      `${cfg.studies.length} ${cfg.studies.length === 1 ? "study" : "studies"}`,
    );

  /* The plan text is the user's note first. The measured facts are
     appended underneath rather than replacing it, because the sentence a
     trader writes before entering is the part worth re-reading. */
  const facts = [];
  if (P) {
    facts.push(
      `Entry ${fmt(P.entry, cfg.sym)}, stop ${fmt(P.stop, cfg.sym)}, target ${fmt(P.target, cfg.sym)} on the ${cfg.iv}.`,
    );
    facts.push(
      `${P.calc.size} ${S.unit} — ${money(P.calc.risk)} at risk, ${P.calc.pct.toFixed(2)}% of balance, ${P.calc.r.toFixed(2)}R after costs.`,
    );
    if (P.calc.over)
      facts.push(
        `Taken above the ${state.risk.pct.toFixed(1)}% rule. Sizing to the rule was ${P.calc.ruleSize} ${S.unit}.`,
      );
    if (P.calc.day > state.risk.dayCap && state.risk.dayCap > 0)
      facts.push(
        `This fill puts the day at ${P.calc.day.toFixed(1)}% against a ${state.risk.dayCap.toFixed(1)}% cap.`,
      );
  }
  const plan = [notes, facts.join(" ")].filter(Boolean).join("\n\n");

  const shot = annotatedShot(c);
  const draft = {
    symbol: cfg.sym,
    market: S.market,
    side: state.risk.side === "long" ? "Long" : "Short",
    plan,
    tags,
    shot,
    chartState: chartStateFor(c),
    source: "charts",
  };
  if (P) {
    /* Strings, not numbers: 1.08420 coerced to a number is 1.0842, and a
       price field that drops the pip digit on the way to the journal reads
       like a different level than the one on the chart. Every consumer
       coerces with + anyway. */
    draft.entry = P.entry.toFixed(S.digits);
    draft.stop = P.stop.toFixed(S.digits);
    draft.target = P.target.toFixed(S.digits);
    draft.size = P.calc.size;
    /* contractValue is what the journal multiplies by, and for a lot-sized
       instrument that is the contract size times the unit multiplier. */
    draft.contractValue =
      S.unit === "lots" ? S.contract * S.unitValue : S.unitValue;
  }

  try {
    Store.draft.set(draft);
  } catch (e) {
    toast(
      "Could not save the draft",
      "Storage is blocked in this browser. The plan is still on the chart — copy the note before leaving the page.",
    );
    return;
  }

  toast(
    "Plan sent to the journal",
    shot
      ? "Symbol, prices, size, your note and a picture of the chart. Opening the entry now."
      : "Symbol, prices, size and your note. Opening the entry now.",
    "up",
  );
  setTimeout(() => {
    window.location.href = "/journal";
  }, 650);
}
/* ── the watch tab's three views ────────────────────────────────
   The tab is named Watchlist, so Watchlist is what it opens on and what it
   remembers unless told otherwise. Details and Compare are one click away and
   each gets the whole pane rather than a slice of it. */
function switchWatchView(view, remember = true) {
  const pane = $('.tabpane[data-pane="watchlist"]');
  if (!pane) return;
  const valid = ["list", "details", "compare"];
  if (!valid.includes(view)) view = "list";
  $$(".wsub-b", pane).forEach((b) => {
    const on = b.dataset.wsub === view;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });
  $$(".wsub-p", pane).forEach((p) =>
    p.classList.toggle("active", p.dataset.wsubpane === view),
  );
  state.watchView = view;
  if (remember) Store.settings.patch({ chartsWatchView: view });
  /* Repaint on arrival rather than on a timer: the symbol card and the compare
     chips both read live prices, and a view nobody is looking at should not be
     costing a repaint every tick. */
  if (view === "details") paintSymCard();
  if (view === "compare") paintCompare();
  if (view === "list") paintWatchlist();
}

function switchTab(name) {
  $$(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.tab === name),
  );
  $$(".tabpane").forEach((p) =>
    p.classList.toggle("active", p.dataset.pane === name),
  );
  if (name === "objects") paintObjects();
  if (name === "watchlist") switchWatchView(state.watchView || "list", false);
}
/* Theme.set is the only writer of data-theme on this site; it also fires
   a resize, which every canvas here already redraws on. All this has to
   do is drop the colour cache so the next paint re-reads the variables. */
function toggleTheme() {
  const next = Theme.toggle();
  const b = $("#themeBtn");
  if (b) b.textContent = next === "dark" ? "Light" : "Dark";
  Object.keys(cssCache).forEach((k) => delete cssCache[k]);
  paintWatchlist();
  draw();
}

/* ══════════════════════════════════════════════════════════════
   replay + live ticks
   ══════════════════════════════════════════════════════════════ */
function replayTime() {
  const cfg = state.charts[state.sel],
    base = getSeries(cfg.sym, cfg.iv);
  const i = Math.max(30, Math.min(base.length, state.replay.idx));
  return base[i - 1] ? base[i - 1].t : null;
}
let repTimer = null;
function toggleReplay(on) {
  const R = state.replay;
  R.on = on !== undefined ? on : !R.on;
  $("#replaybar").hidden = !R.on;
  $("#replayBtn").classList.toggle("on", R.on);
  if (!R.on) {
    R.playing = false;
    clearInterval(repTimer);
    repTimer = null;
    $("#rbPlay").textContent = "▶";
  } else {
    repStep(0);
    toast(
      "Replay armed",
      "One engine drives replay, backtests, marking exercises and replay-my-trade. Every chart in the layout moves on this clock.",
    );
  }
  draw();
}
function repStep(d) {
  const R = state.replay,
    max = getSeries(
      state.charts[state.sel].sym,
      state.charts[state.sel].iv,
    ).length;
  R.idx = Math.max(60, Math.min(max, R.idx + d));
  $("#rbScrub").value = Math.round((R.idx / max) * 100);
  const t = replayTime();
  $("#rbClock").textContent = t ? clock(t) : "—";
  $("#rbBar").textContent = R.idx + " / " + max;
  checkAlerts();
  draw();
}
function repPlay() {
  const R = state.replay;
  R.playing = !R.playing;
  $("#rbPlay").textContent = R.playing ? "❚❚" : "▶";
  clearInterval(repTimer);
  if (R.playing)
    repTimer = setInterval(() => repStep(1), Math.max(60, 700 / R.speed));
}
/* simulated tape: only the last bar of each series moves */
/* The feed moves the prices; this only reacts. Studies are invalidated
   rather than recomputed here, so a symbol nobody is looking at costs
   nothing. Replay takes over the clock, so ignore ticks while it runs. */
Feed.subscribe(() => {
  if (!state.live || state.replay.on) return;
  charts.forEach((c) => {
    c.studies.forEach((s) => (s._c = null));
  });
  checkAlerts();
  draw();
  const wl = $('.tabpane[data-pane="watchlist"]');
  if (wl && wl.classList.contains("active")) {
    /* Only the view on screen. Repainting the symbol card behind a hidden pane
       is work nobody can see. */
    if (state.watchView === "details") paintSymCard();
    else if (state.watchView === "compare") paintCompare();
    else paintWatchlist();
  }
});
setInterval(() => {
  if (state.look.countdown && !state.replay.on) draw();
}, 1000);

/* ══════════════════════════════════════════════════════════════
   keyboard
   ══════════════════════════════════════════════════════════════ */
const KEYS = [
  ["T", "Trend line"],
  ["Y", "Ray"],
  ["E", "Extended line"],
  ["H", "Horizontal level"],
  ["V", "Vertical line"],
  ["R", "Zone"],
  ["C", "Parallel channel"],
  ["F", "Fibonacci"],
  ["W", "Arrow"],
  ["G", "Price range"],
  ["M", "Measure"],
  ["N", "Note"],
  ["P", "Position tool"],
  ["A", "Alert at price"],
  ["X", "Remove drawing"],
  ["Alt + drag", "Quick measurement"],
  ["Del", "Delete the selected drawing"],
  ["Ctrl Z / Ctrl Shift Z", "Undo / redo"],
  ["Ctrl S", "Save workspace"],
  ["J", "Log to journal"],
  ["D", "Data window"],
  ["B", "Volume profile"],
  ["Alt M", "Magnet on / off"],
  ["Space", "Play / pause replay"],
  ["[ ]", "Step replay back / forward"],
  ["Ctrl K", "Command palette"],
  ["Alt 1 2 3 4 6", "Layout"],
  [", .", "Previous / next interval"],
  ["← →", "Pan the chart"],
  ["+ −", "Zoom in / out"],
  ["Home", "Back to the last bar"],
  ["?", "This map"],
  ["Esc", "Close, or drop the tool"],
];
addEventListener("keydown", (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
  if (e.key === "Escape") {
    /* Only if nothing is layered on top of it — Escape closes the topmost
       thing, and a dialog over a focused chart is the topmost thing. */
    /* Escape is a stack, not a broom: it closes the one thing on top. A
       dialog first, then the context menu, then focus mode, and only with
       nothing layered does it drop the drawing tool and the selection. */
    if (hideTopModal()) return;
    if ($("#ctx").hidden === false) {
      $("#ctx").hidden = true;
      return;
    }
    if (document.body.classList.contains("focus-mode")) {
      toggleFocus(false);
      return;
    }
    setTool("cursor");
    state.selObj = null;
    paintObjects();
    draw();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    show("#palette");
    paintPal();
    $("#palIn").value = "";
    $("#palIn").focus();
    return;
  }
  if ($("#palette").hidden === false) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      palMove(1);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      palMove(-1);
    }
    if (e.key === "Enter" && palCache[palSel]) {
      palCache[palSel].run();
      hide("#palette");
    }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveWorkspace();
    return;
  }
  if (typing) return;
  const k = e.key.toLowerCase(),
    c = charts[state.sel];
  if (e.altKey && ["1", "2", "3", "4", "6"].includes(k)) {
    state.layout = +k;
    paintLayoutBtn();
    buildGrid();
    return;
  }
  /* F for focus mode, which is what the More menu advertises. Guarded on the
     modifiers being absent so it does not steal a browser combination. */
  if (k === "f" && !e.altKey && !e.ctrlKey && !e.metaKey) {
    toggleFocus();
    return;
  }
  if (e.altKey && k === "m") {
    state.magnet = !state.magnet;
    setTool(state.tool);
    toast(`Magnet ${state.magnet ? "on" : "off"}`);
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    if (state.selObj) {
      pushUndo();
      state.drawings[c.key] = c.drw.filter((o) => o.id !== state.selObj);
      state.selObj = null;
      paintObjects();
      draw();
    }
    return;
  }
  const map = {
    t: "trend",
    y: "ray",
    e: "xline",
    h: "hline",
    v: "vline",
    r: "rect",
    c: "channel",
    f: "fib",
    w: "arrow",
    g: "prange",
    m: "measure",
    n: "text",
    p: "position",
    a: "alertline",
    x: "eraser",
  };
  if (map[k]) {
    setTool(map[k]);
    return;
  }
  if (k === "j") {
    logJournal();
    return;
  }
  if (k === "d") {
    state.look.dataWin = !state.look.dataWin;
    draw();
    return;
  }
  if (k === "b") {
    c.cfg.vp = !c.cfg.vp;
    draw();
    toast(c.cfg.vp ? "Volume profile on" : "Volume profile off");
    return;
  }
  if (k === "?") {
    show("#keysModal");
    return;
  }
  if (k === " ") {
    e.preventDefault();
    if (!state.replay.on) toggleReplay(true);
    repPlay();
    return;
  }
  if (k === "[") {
    if (state.replay.on) repStep(-1);
    return;
  }
  if (k === "]") {
    if (state.replay.on) repStep(1);
    return;
  }
  if (e.key === "ArrowLeft") {
    c.view.end = Math.min(c.raw.length - 40, c.view.end + 3);
    draw();
    return;
  }
  if (e.key === "ArrowRight") {
    c.view.end = Math.max(0, c.view.end - 3);
    draw();
    return;
  }
  if (k === "+" || k === "=") {
    c.view.n = Math.max(20, Math.round(c.view.n * 0.85));
    draw();
    return;
  }
  if (k === "-") {
    c.view.n = Math.min(520, Math.round(c.view.n * 1.18));
    draw();
    return;
  }
  if (e.key === "Home") {
    c.view.end = 0;
    c.view.fwd = 0;
    draw();
    return;
  }
  if (k === "," || k === ".") {
    const i = INTERVALS.indexOf(state.charts[state.sel].iv);
    state.charts[state.sel].iv =
      INTERVALS[
        Math.max(0, Math.min(INTERVALS.length - 1, i + (k === "." ? 1 : -1)))
      ];
    paintIntervals();
    draw();
  }
});

/* ══════════════════════════════════════════════════════════════
   wire the chrome
   ══════════════════════════════════════════════════════════════ */
$("#keysList").innerHTML = KEYS.map(
  ([k, a]) => `<div class="kr"><span>${a}</span><kbd>${k}</kbd></div>`,
).join("");
$("#typeMenu").innerHTML =
  `<div class="mh">Chart type</div>` +
  TYPES.map(
    ([id, n, s]) =>
      `<button data-t="${id}" class="${state.type === id ? "on" : ""}">${n}<span>${s}</span></button>`,
  ).join("");
$("#layoutMenu").innerHTML = [
  [1, "1", "A single chart"],
  [2, "2", "Two side by side"],
  [3, "3", "Three in a row"],
  [4, "4", "Two by two"],
  [6, "6", "Three by two"],
]
  .map(
    ([n, l, t]) =>
      `<button class="chip ${state.layout === n ? "on" : ""}" data-l="${n}" title="${t}" aria-label="${t}">${l}</button>`,
  )
  .join("");
/* The dropdowns are `position: fixed` to escape the toolbar's clipping, so
   their coordinates are ours to work out: under the button, right-aligned if
   the panel is wider than the space to its right, and clamped so a long menu
   never runs off the bottom of the window. */
function placeMenu(btn, el) {
  const b = $(btn).getBoundingClientRect();
  el.style.maxHeight = "";
  const w = el.offsetWidth,
    h = el.offsetHeight,
    pad = 8;
  let left = el.classList.contains("right") ? b.right - w : b.left;
  left = Math.max(pad, Math.min(left, innerWidth - w - pad));
  let top = b.bottom + 4;
  if (top + h > innerHeight - pad) {
    /* Prefer dropping down and shortening over flipping up, because a panel
       that flips has its first row somewhere different every time. */
    const room = innerHeight - top - pad;
    if (room > 200) el.style.maxHeight = room + "px";
    else top = Math.max(pad, b.top - h - 4);
  }
  el.style.left = Math.round(left) + "px";
  el.style.top = Math.round(top) + "px";
}
function menu(btn, m, onOpen) {
  $(btn).onclick = (e) => {
    e.stopPropagation();
    const el = $(m);
    const open = el.classList.contains("open");
    $$(".menu").forEach((x) => x.classList.remove("open"));
    $$("[aria-haspopup]").forEach((x) =>
      x.setAttribute("aria-expanded", "false"),
    );
    el.classList.toggle("open", !open);
    $(btn).setAttribute("aria-expanded", String(!open));
    if (!open) {
      if (onOpen) onOpen();
      placeMenu(btn, el);
    }
  };
  /* A fixed panel does not follow its button, so it closes rather than
     hanging in the wrong place. */
  addEventListener("resize", () => $(m).classList.remove("open"));
}
/* The clock ticks once a second, which is cheap, and only writes two text
   nodes. The range chips and the timezone toggle live down here with it. */
$("#tzBtn").onclick = () => {
  state.look.utc = state.look.utc === false;
  paintClock();
  /* Whether you read charts in UTC is a standing preference, not something
     to re-pick every visit, so it goes in shared settings rather than only
     into a saved workspace. */
  Store.settings.patch({ chartsUtc: state.look.utc });
  draw(); /* the axis, data window and crosshair all follow this */
};
paintClock();
setInterval(paintClock, 1000);

menu("#typeBtn", "#typeMenu");
menu("#moreBtn", "#moreMenu");
menu("#ivBtn", "#ivMenu", paintIvMenu);

/* A menu item that opens a dialog has to shut the menu behind it, or the
   dialog arrives with a floating panel still sitting over the chart. */
$$("#moreMenu .mi").forEach((b) =>
  b.addEventListener("click", () => $("#moreMenu").classList.remove("open")),
);
$("#keysBtn").onclick = () => show("#keysModal");
$("#themeBtn").textContent = Theme.current() === "dark" ? "Light" : "Dark";

/* The demo badge is rendered by the feed, so its wording is identical on
   every screen that shows a price. */
$("#feedBadge").innerHTML = Feed.badge({ compact: true });

/* Two doors to the same room: the toolbar button and the one under the
   note, which is where the roadmap mockup put it. */
$("#attachSave").onclick = () => logJournal();

/* The note grows with what is typed in it, up to a limit — a one-line
   box discourages writing anything, and a permanent five-line box steals
   chart height from people who do not want to write. */
const notesEl = $("#notes");
notesEl.addEventListener("input", () => {
  notesEl.style.height = "auto";
  notesEl.style.height = Math.min(120, notesEl.scrollHeight) + "px";
  state.notes = notesEl.value;
});
document.addEventListener("click", () =>
  $$(".menu").forEach((m) => m.classList.remove("open")),
);
$$("#typeMenu button").forEach(
  (b) =>
    (b.onclick = () => {
      state.type = b.dataset.t;
      paintTypeBtn();
      draw();
    }),
);
$$("#layoutMenu button").forEach(
  (b) =>
    (b.onclick = () => {
      state.layout = +b.dataset.l;
      paintLayoutBtn();
      buildGrid();
      toast(
        `Layout ${state.layout} chart${state.layout > 1 ? "s" : ""}`,
        "Crosshair, interval and replay clock stay in sync. Saved with the workspace.",
      );
    }),
);
$("#symBtn").onclick = () => {
  show("#symModal");
  symSel = 0;
  paintSymSearch(($("#symSearch").value = ""));
  $("#symSearch").focus();
};
$("#symSearch").oninput = (e) => {
  symSel = 0;
  paintSymSearch(e.target.value);
};
$("#symSearch").onkeydown = symKeys;
$("#indBtn").onclick = () => {
  show("#indModal");
  paintInd(($("#indSearch").value = ""));
};
$("#indSearch").oninput = (e) => paintInd(e.target.value);
$("#setBtn").onclick = () => {
  show("#setModal");
  paintSettings();
};
$("#snapBtn").onclick = () => snapshotPNG(charts[state.sel]);
/* Focus mode gives the chart the whole window by taking away the page's own
   furniture: the site nav, the drawing rail's labels, the right panel and the
   journal note bar. The chart is what you came to read; those four are what
   you read around it.

   The browser's Fullscreen API was the first implementation and is the wrong
   one here. This app is delivered inside an iframe, where that API is not
   available at all, so a native call is not the honest version of the feature
   — it is the version that does nothing. A class the stylesheet acts on works
   in the iframe, works on a standalone host, and works on a phone, where
   browsers grant full screen grudgingly or not at all.

   What it gives up is the operating system's own chrome. Whoever is running
   the page can still press F11 for that, and now get a chart that fills it.

   Escape leaves, which is what Escape does everywhere else on this page. */
function toggleFocus(on) {
  const next =
    on === undefined ? !document.body.classList.contains("focus-mode") : on;
  document.body.classList.toggle("focus-mode", next);
  $("#fsBtn").firstChild.textContent = next
    ? "Leave focus mode "
    : "Focus mode ";
  $("#fsBtn").setAttribute("aria-pressed", String(next));
  /* Every canvas is sized from its box at draw time, and four boxes just
     changed. One frame of delay lets the browser settle the new geometry. */
  requestAnimationFrame(() => requestAnimationFrame(draw));
}
$("#fsBtn").onclick = () => {
  $$(".menu").forEach((x) => x.classList.remove("open"));
  toggleFocus();
};
$("#wsBtn").onclick = () => {
  show("#wsModal");
  paintWorkspaces();
};
$("#wsSave").onclick = () => {
  saveWorkspace();
  paintWorkspaces();
};
$("#undoBtn").onclick = undo;
$("#redoBtn").onclick = redo;
$("#alertBtn").onclick = () => openAlert(lastPx(), state.charts[state.sel].sym);
$("#newAlert").onclick = () => openAlert(lastPx(), state.charts[state.sel].sym);
$("#addCond").onclick = () => {
  condRows.push({ l: "RSI 14", op: "is above", r: "70" });
  paintCond();
};
$$(".ao").forEach(
  (b) =>
    (b.onclick = () => {
      $$(".ao").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
    }),
);
$("#alCreate").onclick = () => {
  const c = condRows[0],
    sym = state.charts[state.sel].sym,
    px = parseFloat(c.r);
  state.alerts.unshift({
    id: Date.now(),
    on: true,
    title: `${sym} ${c.op} ${c.r}`,
    cond: `${c.l.toLowerCase()} ${c.op} ${c.r} · ${condRows.length > 1 ? condRows.length + " conditions · " : ""}${[...$$("#alDeliv .chip.on")].map((x) => x.textContent.toLowerCase()).join(" + ") || "in-app"}`,
    px: isNaN(px) ? null : px,
    dir: c.op.includes("down") || c.op.includes("below") ? "down" : "up",
    sym,
  });
  saveAlerts();
  paintAlerts();
  switchTab("alerts");
  hide("#alertModal");
  draw();
  toast(
    "Alert created",
    "It will fire in replay as well, so you can test it on history before you trust it.",
    "up",
  );
};
$$(".wsub-b").forEach((b) => {
  b.onclick = () => switchWatchView(b.dataset.wsub);
  /* Left and right arrows across a tablist, which is what a tablist promises. */
  b.onkeydown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const all = $$(".wsub-b");
    const i = all.indexOf(b);
    const next =
      all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
    switchWatchView(next.dataset.wsub);
    next.focus();
  };
});

$("#wlSort").onchange = (e) => {
  wlSort = e.target.value;
  paintWatchlist();
};
$("#wlAdd").onclick = () => {
  show("#symModal");
  paintSymSearch(($("#symSearch").value = ""));
};
$("#replayBtn").onclick = () => toggleReplay();
$("#rbClose").onclick = () => toggleReplay(false);
$("#rbPlay").onclick = repPlay;
$("#rbFwd").onclick = () => repStep(1);
$("#rbBack").onclick = () => repStep(-1);
$("#rbJump").onclick = async () => {
  const v = await ask("Jump forward", "How many bars?", "20", "number");
  const n = +v;
  if (n) repStep(n);
};
$("#rbSpeeds").innerHTML = [0.25, 1, 4, 10]
  .map(
    (s) =>
      `<button class="chip ${s === 1 ? "on" : ""}" data-s="${s}">${s}×</button>`,
  )
  .join("");
$$("#rbSpeeds .chip").forEach(
  (b) =>
    (b.onclick = () => {
      state.replay.speed = +b.dataset.s;
      $$("#rbSpeeds .chip").forEach((x) => x.classList.toggle("on", x === b));
      if (state.replay.playing) {
        repPlay();
        repPlay();
      }
    }),
);
$("#rbScrub").oninput = (e) => {
  const max = getSeries(
    state.charts[state.sel].sym,
    state.charts[state.sel].iv,
  ).length;
  state.replay.idx = Math.round((max * e.target.value) / 100);
  repStep(0);
};
$("#rbBlind").onchange = (e) => {
  state.replay.blind = e.target.checked;
  draw();
  toast(
    e.target.checked ? "Blind mode on" : "Blind mode off",
    "The symbol and date are hidden so the setup is judged, not the memory of what happened.",
  );
};
$("#journalBtn").onclick = logJournal;
$("#themeBtn").onclick = toggleTheme;
$("#paletteBtn").onclick = () => {
  show("#palette");
  paintPal();
  $("#palIn").value = "";
  $("#palIn").focus();
};
$("#palIn").oninput = (e) => paintPal(e.target.value);
$$(".tab").forEach((t) => (t.onclick = () => switchTab(t.dataset.tab)));
$$(".st").forEach(
  (b) =>
    (b.onclick = () => {
      state.risk.side = b.dataset.side;
      $$(".st").forEach((x) => x.classList.toggle("on", x === b));
      if (state.pos) {
        const P = state.pos,
          d = Math.abs(P.entry - P.stop);
        P.stop = state.risk.side === "long" ? P.entry - d : P.entry + d;
        P.target =
          state.risk.side === "long" ? P.entry + d * 2 : P.entry - d * 2;
        recalc();
        syncInputs();
        draw();
      }
    }),
);
/* Balance and the risk rule are account settings, not chart settings, so
   editing them here writes through to Store — the same edit the settings
   screen and the calculators make. Debounced, because a patch per
   keystroke would also be a re-render per keystroke on every open tab. */
let settingsWrite = null;
function pushSettings() {
  clearTimeout(settingsWrite);
  settingsWrite = setTimeout(() => {
    try {
      Store.settings.patch({
        balance: state.risk.balance,
        riskPct: +state.risk.pct.toFixed(2),
      });
    } catch (e) {
      /* blocked storage: the session still works */
    }
  }, 600);
}

["fBalance", "fRisk", "fEntry", "fStop", "fTarget"].forEach((id) => {
  const el = $("#" + id);
  if (!el) return;
  el.oninput = () => {
    if (id === "fBalance") {
      state.risk.balance = Math.max(1, +el.value || 0);
      pushSettings();
    }
    if (id === "fRisk") {
      state.risk.pct = Math.max(0.05, +el.value || 1);
      pushSettings();
    }
    if (state.pos) {
      const P = state.pos;
      if (id === "fEntry") P.entry = +$("#fEntry").value || P.entry;
      if (id === "fStop") P.stop = +$("#fStop").value || P.stop;
      if (id === "fTarget") P.target = +$("#fTarget").value || P.target;
    }
    recalc();
    draw();
  };
});
/* "Size to the rule" means: stop overriding. The override is what made
   the number too big, so clearing it is the whole action — the rule
   percentage itself is not what changes. */
$("#sizeToRule").onclick = () => {
  if (!state.pos || !state.pos.calc) return;
  recalc();
  draw();
  toast(
    "Sized to your rule",
    "The tool resized, the warning cleared, and the decision is recorded in the entry.",
    "up",
  );
};
$("#override").onclick = () => {
  state.overrides++;
  toast(
    "Override recorded",
    "Nothing was blocked. The entry now carries the warning, the size you chose, and the reason field for the review.",
    "warn",
  );
};
$("#tourClose").onclick = () => hide("#tour");
$$("[data-close]").forEach(
  (b) => (b.onclick = () => hide(b.closest(".modal"))),
);
$$(".modal").forEach((m) =>
  m.addEventListener("mousedown", (e) => {
    if (e.target === m) hide(m);
  }),
);
$("#mobPanel").onclick = () => {
  document.body.classList.toggle("sheet-open");
  /* The chart column changes height with the sheet, so the canvas has to
       re-measure — after the 0.22s slide, not before it. */
  setTimeout(draw, 240);
};

/* ── what ships when ─────────────────────────────────────────── */
const WAVES = [
  [
    "w1",
    "Wave 1 · Phase 1",
    "<b>The engine and the risk layer.</b> Candles and eight chart types, the drawing set with selection, locking and an objects tree, real studies with parameters in their own panes, chart-native alerts, the position tool sized from your live balance and your rule, save-to-journal, watchlist, and multi-chart layouts.",
  ],
  [
    "w2",
    "Wave 2 · Phase 2",
    "<b>Scripting, replay and the loop closing.</b> 1%Script, the wider drawing set, the full study library, the replay engine with simulated entries, the screener wired to the chart, the journal-derived studies, and your reconciled trades drawn as a chart layer.",
  ],
  [
    "w3",
    "Wave 3 · Phase 3",
    "<b>Depth and reach.</b> Detached windows, footprint and market profile from licensed venues, TPO and the DOM ladder, the mobile chart inside its stated limits, embeds, and the script marketplace with source escrow.",
  ],
  [
    "w0",
    "Never",
    "<b>Refusals, stated once.</b> No order execution — read-only is permanent. No Pine import or translation. No ranked idea feed. No synthetic FX volume or order flow. We will not match 100,000 community scripts, and will not imply we do.",
  ],
];
$("#wavesList").innerHTML = WAVES.map(
  ([c, t, b]) =>
    `<div class="wv"><span class="wv-t ${c}">${t.split(" · ")[0]}</span><div class="wv-b"><b>${t}</b><br>${b}</div></div>`,
).join("");
$("#wavesBtn").onclick = () => show("#wavesModal");

/* ── boot ────────────────────────────────────────────────────── */
function paintAll() {
  paintIntervals();
  paintRanges();
  paintWatchlist();
  paintSymbol();
  paintJournal();
  paintAlerts();
  paintIndCount();
  paintLayoutBtn();
  paintTypeBtn();
  paintObjects();
}
syncSettings();
loadAlerts();

/* Another screen changing the balance or the risk rule has to land here
   too, or the size on the chart quietly goes stale. Store announces
   writes on the window, including writes from a second tab. */
addEventListener("storechange", (e) => {
  const kind = e.detail && e.detail.kind;
  if (kind === "settings" || kind === "*") {
    syncSettings();
    paintWatchlist();
  }
  if (kind === "trades" || kind === "*") {
    syncSettings();
    paintJournal();
    draw();
  }
});

renderRail();
railAudit();
paintDeliv();
paintAll();
buildGrid();

/* A demonstration position is placed on first open so the readouts have
   something to say, but silently — the tour is already talking, and two
   overlays arriving at once was how the first version covered its own
   chart. The toast only fires when the user places one themselves. */
requestAnimationFrame(() => {
  const c = charts[0],
    d = c.data,
    last = d[d.length - 1].c;
  const rng20 = d.slice(-20).reduce((a, b) => a + (b.h - b.l), 0) / 20;
  makePos(c.key, last, last - rng20 * 3.6, { quiet: true });
  paintObjects();
  draw();
});

/* Shown once, then remembered. A tour that returns every visit is an
   advert for itself. */
const TOUR_KEY = "chartsTourSeen";
if (!Store.settings.get()[TOUR_KEY]) {
  setTimeout(() => {
    const t = $("#tour");
    if (t) t.hidden = false;
  }, 900);
}
$("#tourClose") &&
  $("#tourClose").addEventListener("click", () => {
    try {
      Store.settings.patch({ [TOUR_KEY]: true });
    } catch (e) {}
  });
