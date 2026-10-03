/* charts-rail.js — the drawing rail and its flyouts.
   ---------------------------------------------------------------------------
   Forty-odd tools will not fit in a 42px column as forty-odd buttons, so the
   rail is ten group buttons and each opens a flyout. A group button shows the
   icon of the tool last picked from it and activates that tool on click; the
   caret in its corner opens the flyout. That is TradingView's arrangement,
   and it is the right one: the tool you used last is one click away, and the
   other eight in its family are two.

   Loaded after charts-engine.js and charts-shapes.js, before charts.js.
   `DRAW` supplies every name and point count, so a tool listed here that the
   engine cannot draw shows up as a hole at load time rather than a dead
   button in the UI — see `railAudit()` at the bottom. */

/* ── icons ──────────────────────────────────────────────────────
   One path each, on an 18×18 grid, stroked not filled unless noted. Kept
   deliberately plain: at 17px a detailed glyph is a smudge. */
const ICON = {
  cursor: "M4 2l11 8.4-4.7.6L13 16.6l-1.9.9-2.6-5.3L4 15.6z",
  cursordot: "M9 9h.01M9 2v3M9 13v3M2 9h3M13 9h3",
  cursorarrow: "M4 2l9 7-3.6.4 2 4.4-1.6.8-2-4.4L4 13z",
  eraser: "M3 13l7-7 5 5-4 4H5zM2 16h14",

  trend: "M2 15L15 3",
  ray: "M2 15L15 3M15 3h.01",
  infoline: "M2 15L15 3M4 6h6M4 9h4",
  xline: "M1 16L17 2",
  trendangle: "M2 15L15 4M2 15h9M6 15a7 7 0 002.4-4",
  hline: "M1 9h16",
  hray: "M6 9h11M6 9h.01",
  vline: "M9 1v16",
  crossline: "M1 9h16M9 1v16",

  channel: "M2 14L15 5M2 17L15 8",
  regression: "M2 13L15 5M2 16L15 8M2 10L15 2",
  flatchannel: "M2 5h13M2 13h13M2 5v8M15 5v8",
  pitchfork: "M3 15L15 3M8 10l4 4M6 8l4 4M10 12l4 4",

  fib: "M2 4h14M2 8h14M2 12h14M2 16h9",
  fibext: "M2 3h14M2 7h9M2 11h14M2 15h6",
  fibchannel: "M2 12L14 4M3 15L15 7M1 9L13 1",
  fibtime: "M3 2v14M6 2v14M11 2v14M16 2v14",
  fibfan: "M2 16L16 2M2 16L16 8M2 16L16 13M2 16h14",
  fibcircle: "M9 9a7 7 0 100 .01M9 9a4 4 0 100 .01M9 9h.01",
  gannbox: "M2.5 2.5h13v13h-13zM2.5 7h13M2.5 11h13M7 2.5v13M11 2.5v13",
  gannfan: "M2 16L16 2M2 16L16 9M2 16L9 2M2 16h14M2 16V2",

  rect: "M2.5 4.5h13v9h-13z",
  ellipse: "M9 9a6.5 4.5 0 100 .01",
  triangle: "M9 3l6.5 12h-13z",
  arrow: "M2 15L15 3M15 3h-5M15 3v5",
  brush: "M3 15c3 0 2-4 5-6s5-4 7-6M3 15l-1 2 2-1",
  highlighter: "M4 14l8-9 3 3-8 9H4zM3 17h12",

  text: "M3 4h12M9 4v11",
  callout: "M3 3h12v8H9l-3 4v-4H3z",
  pricelabel: "M2 9h8l3-3h4v6h-4l-3-3",
  flag: "M5 16V3l9 3-9 3",

  measure: "M2 12l6-6 3 3 5-5M2 12v3h3",
  prange: "M4 4h10M4 14h10M9 4v10",
  drange: "M4 4v10M14 4v10M4 9h10",
  dprange: "M3 3h12v12H3zM3 9h12M9 3v12",

  abcd: "M2 15l4-8 4 6 6-10",
  xabcd: "M2 4l3 9 3-5 3 6 4-9",
  elliott: "M2 16l2-4 2 2 3-7 2 3 4-8",
  headshoulders: "M2 14l3-3 2 2 2-8 2 8 2-2 3 3",

  position: "M2.5 5.5h13v3h-13zM2.5 10.5h13v3h-13z",
  shortpos: "M2.5 10.5h13v3h-13zM2.5 5.5h13v3h-13z",
  alertline:
    "M9 2a5 5 0 00-5 5c0 4-2 5-2 5h14s-2-1-2-5a5 5 0 00-5-5zM7 15a2 2 0 004 0",
  replayhere: "M4 3v12l10-6z",

  magnet: "M4 3v6a5 5 0 0010 0V3h-3v6a2 2 0 01-4 0V3z",
  trades: "M2 14l4-5 3 2 4-6 3 3",
  lock: "M4 8h10v7H4zM6 8V5.5a3 3 0 016 0V8",
  hide: "M1 9s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5zM9 7a2 2 0 100 4 2 2 0 000-4",
  trash: "M4 5h10l-1 10H5zM7 5V3h4v2",
  zoomrect: "M2.5 4.5h9v7h-9zM11 11l5 5M6 8h3M7.5 6.5v3",
};

/* ── groups ──────────────────────────────────────────────────────
   `sections` mirrors the headed lists in TradingView's flyouts (LINES,
   CHANNELS, PITCHFORKS in one panel). `tools` are DRAW ids, except the
   cursor entries, which set a cursor mode rather than a drawing tool. */
const RAIL = [
  {
    id: "cursors",
    name: "Cursors",
    sections: [
      { label: "", tools: ["cursor", "cursordot", "cursorarrow", "eraser"] },
    ],
  },
  {
    id: "lines",
    name: "Trend line tools",
    sections: [
      {
        label: "Lines",
        tools: [
          "trend",
          "ray",
          "infoline",
          "xline",
          "trendangle",
          "hline",
          "hray",
          "vline",
          "crossline",
        ],
      },
      { label: "Channels", tools: ["channel", "regression", "flatchannel"] },
      { label: "Pitchforks", tools: ["pitchfork"] },
    ],
  },
  {
    id: "fib",
    name: "Fibonacci and Gann",
    sections: [
      {
        label: "Fibonacci",
        tools: [
          "fib",
          "fibext",
          "fibchannel",
          "fibtime",
          "fibfan",
          "fibcircle",
        ],
      },
      { label: "Gann", tools: ["gannbox", "gannfan"] },
    ],
  },
  {
    id: "patterns",
    name: "Patterns",
    sections: [
      { label: "Harmonic", tools: ["xabcd", "abcd"] },
      { label: "Chart patterns", tools: ["elliott", "headshoulders"] },
    ],
  },
  {
    id: "shapes",
    name: "Shapes and brushes",
    sections: [
      { label: "Shapes", tools: ["rect", "ellipse", "triangle", "arrow"] },
      { label: "Brushes", tools: ["brush", "highlighter"] },
    ],
  },
  {
    id: "notes",
    name: "Annotations",
    sections: [{ label: "", tools: ["text", "callout", "pricelabel", "flag"] }],
  },
  {
    id: "measure",
    name: "Measure",
    sections: [
      { label: "", tools: ["measure", "prange", "drange", "dprange"] },
    ],
  },
  {
    id: "trade",
    name: "Trading tools",
    sections: [
      {
        label: "",
        tools: ["position", "shortpos", "alertline", "replayhere"],
      },
    ],
  },
];

/* Cursor modes are not drawings, so they carry their own labels. */
const CURSOR_TOOLS = {
  cursor: ["Cross", "Full reticle with price and time on both axes"],
  cursordot: ["Dot", "Marks the point without lines across the chart"],
  cursorarrow: ["Arrow", "No reticle — axis labels only"],
  eraser: ["Eraser", "Click a drawing to remove it"],
};

function toolName(id) {
  if (CURSOR_TOOLS[id]) return CURSOR_TOOLS[id][0];
  if (id === "shortpos") return "Short position";
  if (id === "position") return "Long position";
  if (id === "replayhere") return "Replay from bar";
  if (id === "alertline") return "Alert at price";
  return (DRAW[id] && DRAW[id].name) || id;
}
function toolKey(id) {
  return (DRAW[id] && DRAW[id].key) || "";
}
function toolHint(id) {
  if (CURSOR_TOOLS[id]) return CURSOR_TOOLS[id][1];
  const n = DRAW[id] ? DRAW[id].pts : 2;
  if (DRAW[id] && DRAW[id].free) return "Hold and drag to draw freehand";
  if (n === 1) return "Click once to place it";
  if (n > 2) return "Drag the first leg, then drag the handles";
  return "Drag from one point to the other";
}

/* ── state ─────────────────────────────────────────────────────── */

/* Last tool picked out of each group, so the group button is a one-click
   repeat of what you were just using. */
const railPick = {
  cursors: "cursor",
  lines: "trend",
  fib: "fib",
  patterns: "xabcd",
  shapes: "rect",
  notes: "text",
  measure: "measure",
  trade: "position",
};
let railOpen = null;

/* ── favourites ─────────────────────────────────────────────────
   Forty tools in eight groups means the two or three a trader actually uses
   are still two clicks away, and which two differ per trader: someone trading
   ranges lives in horizontal lines, someone trading harmonics lives in XABCD.
   A starred tool gets its own button at the top of the rail, above the groups,
   so it is one click from anywhere.

   Stars persist through Store.settings like the watchlist and the clock, so
   the rail a trader arranges is the rail they come back to. */
let railFavs = [];

function loadFavs() {
  const s = Store.settings.get().chartsFavTools;
  /* Filter against the rail itself: a tool renamed or dropped between
     releases should vanish from the favourites rather than render a button
     that sets a tool the engine cannot draw. */
  railFavs = Array.isArray(s) ? s.filter(isRailTool) : [];
}

function saveFavs() {
  Store.settings.patch({ chartsFavTools: railFavs.slice() });
}

function isRailTool(id) {
  return (
    !!CURSOR_TOOLS[id] ||
    RAIL.some((g) => g.sections.some((x) => x.tools.includes(id)))
  );
}

function toggleFav(id) {
  if (!isRailTool(id)) return;
  const i = railFavs.indexOf(id);
  if (i >= 0) railFavs.splice(i, 1);
  else railFavs.push(id);
  saveFavs();
  /* Deliberately does not close the flyout: starring four tools in one visit
     should be four clicks, not four open-star-reopen rounds. */
  renderRail();
  toast(
    i >= 0
      ? `${toolName(id)} removed from favourites`
      : `${toolName(id)} added to favourites`,
    i >= 0
      ? "The rail keeps it in its group."
      : "It now has its own button at the top of the rail.",
  );
}

function groupOf(tool) {
  return RAIL.find((g) => g.sections.some((s) => s.tools.includes(tool)));
}

/* ── markup ────────────────────────────────────────────────────── */

function svgIcon(id) {
  return `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[id] || ICON.cursor}"/></svg>`;
}

function railHTML() {
  const cursorMode = () =>
    state.tool === "eraser"
      ? "eraser"
      : "cursor" + (state.look.cursor === "cross" ? "" : state.look.cursor);

  const groupBtn = (g) => {
    let pick = railPick[g.id];
    if (g.id === "cursors") pick = cursorMode();
    const active =
      g.id === "cursors"
        ? state.tool === "cursor" || state.tool === "eraser"
        : g.sections.some((s) => s.tools.includes(state.tool));
    return `<div class="rgrp" data-grp="${g.id}">
      <button class="rtool ${active ? "on" : ""}" data-pick="${pick}" data-grp-main="${g.id}"
        aria-label="${toolName(pick)} — ${g.name}" aria-pressed="${active}">
        ${svgIcon(pick)}
        <span class="tip">${toolName(pick)}${toolKey(pick) ? `<kbd>${toolKey(pick)}</kbd>` : ""}</span>
      </button>
      <button class="rcaret" data-grp-open="${g.id}" aria-label="More ${g.name.toLowerCase()}"
        aria-expanded="${railOpen === g.id}"><svg viewBox="0 0 6 6" aria-hidden="true"><path d="M6 0v6H0z" fill="currentColor"/></svg></button>
    </div>`;
  };

  const toggle = (k, label, tip, icon) =>
    `<button class="rtool ${state[k] ? "on" : ""}" data-toggle="${k}"
       aria-label="${label}" aria-pressed="${!!state[k]}">${svgIcon(icon)}<span class="tip">${tip}</span></button>`;

  /* A favourite is a plain tool button — no caret, because there is no group
     behind it to open. It shows `on` on exactly the same test a group button
     uses, so a starred tool in use lights up in both places at once. */
  const favBtn = (id) => {
    const on = CURSOR_TOOLS[id]
      ? id === "eraser"
        ? state.tool === "eraser"
        : state.tool === "cursor" && cursorMode() === id
      : state.tool === id;
    return `<button class="rtool rfav ${on ? "on" : ""}" data-pick-fav="${id}"
      aria-label="${toolName(id)} — favourite" aria-pressed="${on}">
      ${svgIcon(id)}
      <span class="tip">${toolName(id)}${toolKey(id) ? `<kbd>${toolKey(id)}</kbd>` : ""} — favourite</span>
    </button>`;
  };

  return (
    (railFavs.length
      ? railFavs.map(favBtn).join("") + `<div class="rdiv"></div>`
      : "") +
    RAIL.map(groupBtn).join("") +
    `<div class="rdiv"></div>` +
    toggle(
      "magnet",
      "Magnet",
      "Magnet — snap to OHLC<kbd>Alt M</kbd>",
      "magnet",
    ) +
    toggle("trades", "Trade layer", "Your trades as a chart layer", "trades") +
    `<button class="rtool" data-lockall aria-label="Lock every drawing">${svgIcon("lock")}<span class="tip">Lock every drawing on this chart</span></button>` +
    `<button class="rtool" data-hideall aria-label="Hide every drawing">${svgIcon("hide")}<span class="tip">Hide every drawing — they stay saved</span></button>` +
    `<button class="rtool" data-clear aria-label="Remove all drawings">${svgIcon("trash")}<span class="tip">Remove every drawing on this chart</span></button>` +
    flyoutHTML()
  );
}

function flyoutHTML() {
  if (!railOpen) return "";
  const g = RAIL.find((x) => x.id === railOpen);
  if (!g) return "";
  const idx = RAIL.indexOf(g);
  const row = (id) => {
    const on =
      g.id === "cursors"
        ? id === "eraser"
          ? state.tool === "eraser"
          : state.tool === "cursor" &&
            "cursor" +
              (state.look.cursor === "cross" ? "" : state.look.cursor) ===
              id
        : state.tool === id;
    const fav = railFavs.includes(id);
    /* The row is a button, so the star cannot be one nested inside it. It is a
       span with a button role and its own key handling — same affordance, legal
       markup. */
    return `<div class="fly-w">
      <button class="fly-r ${on ? "on" : ""}" data-fly="${id}" title="${toolHint(id)}">
        <span class="fly-i">${svgIcon(id)}</span>
        <span class="fly-n">${toolName(id)}</span>
        ${toolKey(id) ? `<kbd>${toolKey(id)}</kbd>` : ""}
      </button>
      <span class="fly-star ${fav ? "on" : ""}" role="button" tabindex="0" data-fav="${id}"
        aria-pressed="${fav}"
        aria-label="${fav ? "Remove" : "Add"} ${toolName(id)} ${fav ? "from" : "to"} favourites"
        title="${fav ? "Remove from favourites" : "Add to favourites — gives it its own rail button"}">${fav ? "★" : "☆"}</span>
    </div>`;
  };
  return `<div class="rfly" id="rfly" role="menu" aria-label="${g.name}" style="--fly-top:${idx * 34}px">
    <div class="fly-h">${g.name}</div>
    ${g.sections
      .map(
        (s) =>
          (s.label ? `<div class="fly-s">${s.label}</div>` : "") +
          s.tools.map(row).join(""),
      )
      .join("")}
    <div class="fly-f">Escape closes. The rail button repeats whatever you pick here, and a star gives a tool its own button at the top of the rail.</div>
  </div>`;
}

/* ── behaviour ─────────────────────────────────────────────────── */

function pickTool(id) {
  /* The cursor group sets a pointer mode; everything else sets a tool. */
  if (CURSOR_TOOLS[id]) {
    if (id === "eraser") {
      state.tool = "eraser";
    } else {
      state.look.cursor =
        id === "cursordot" ? "dot" : id === "cursorarrow" ? "arrow" : "cross";
      state.tool = "cursor";
    }
    railPick.cursors = id;
  } else {
    const g = groupOf(id);
    if (g) railPick[g.id] = id;
    state.tool = id;
  }
  railOpen = null;
  renderRail();
  draw();
}

function renderRail() {
  const el = document.querySelector("#crail");
  if (!el) return;
  el.innerHTML = railHTML();
  wireRail();
}

/* charts.js and the command palette both call setTool(); keep that name. */
function setTool(t) {
  pickTool(t);
}

function wireRail() {
  const $$r = (s) => Array.from(document.querySelectorAll("#crail " + s));

  $$r("[data-grp-main]").forEach((b) => {
    b.onclick = () => pickTool(b.dataset.pick);
  });
  $$r("[data-grp-open]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      railOpen = railOpen === b.dataset.grpOpen ? null : b.dataset.grpOpen;
      renderRail();
    };
  });
  $$r("[data-fly]").forEach((b) => {
    b.onclick = () => pickTool(b.dataset.fly);
  });
  $$r("[data-pick-fav]").forEach((b) => {
    b.onclick = () => pickTool(b.dataset.pickFav);
  });
  $$r("[data-fav]").forEach((el) => {
    const go = (e) => {
      /* Stop it reaching the row, which would pick the tool and close the
         flyout — the opposite of what a star click asked for. */
      e.stopPropagation();
      e.preventDefault();
      toggleFav(el.dataset.fav);
    };
    el.onclick = go;
    el.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") go(e);
    };
  });
  $$r("[data-toggle]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.toggle;
      state[k] = !state[k];
      toast(
        k === "magnet"
          ? `Magnet ${state.magnet ? "on" : "off"}`
          : `Trade layer ${state.trades ? "shown" : "hidden"}`,
        k === "magnet"
          ? "Drawings snap to the nearest open, high, low or close."
          : "Reconciled fills from your journal, drawn where they happened.",
      );
      renderRail();
      draw();
    };
  });

  const each = (fn) => {
    const c = charts[state.sel];
    if (!c.drw.length) {
      toast("No drawings on this chart");
      return null;
    }
    pushUndo();
    c.drw.forEach(fn);
    paintObjects();
    draw();
    return c;
  };
  const lock = $$r("[data-lockall]")[0];
  if (lock)
    lock.onclick = () => {
      const c = charts[state.sel];
      if (!c.drw.length) return toast("No drawings on this chart");
      const anyOpen = c.drw.some((o) => !o.locked);
      each((o) => {
        o.locked = anyOpen;
      });
      toast(
        anyOpen ? "Drawings locked" : "Drawings unlocked",
        anyOpen
          ? "They still show and still alert — they just will not move."
          : "They can be dragged again.",
      );
    };
  const hide = $$r("[data-hideall]")[0];
  if (hide)
    hide.onclick = () => {
      const c = charts[state.sel];
      if (!c.drw.length) return toast("No drawings on this chart");
      const anyShown = c.drw.some((o) => !o.hidden);
      each((o) => {
        o.hidden = anyShown;
      });
      toast(
        anyShown ? "Drawings hidden" : "Drawings shown",
        "Nothing was deleted — the Objects tab still lists them.",
      );
    };
  const cl = $$r("[data-clear]")[0];
  if (cl)
    cl.onclick = () => {
      const c = charts[state.sel];
      if (!c.drw.length) return toast("No drawings on this chart");
      pushUndo();
      state.drawings[c.key] = [];
      state.selObj = null;
      paintObjects();
      draw();
      toast("Drawings cleared", "Ctrl+Z restores them.");
    };
}

/* Click-away and Escape close the flyout — a menu that only closes by
   reselecting is a menu that gets in the way. */
document.addEventListener("click", (e) => {
  if (!railOpen) return;
  if (e.target.closest && e.target.closest(".rgrp, #rfly")) return;
  railOpen = null;
  renderRail();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && railOpen) {
    railOpen = null;
    renderRail();
  }
});

/* ── audit ──────────────────────────────────────────────────────
   Every tool in the rail must be a thing the engine can actually draw.
   This logs a warning at load rather than letting a dead button ship. */
function railAudit() {
  const known = new Set(
    Object.keys(DRAW).concat(Object.keys(CURSOR_TOOLS), [
      "position",
      "shortpos",
      "alertline",
      "replayhere",
    ]),
  );
  const missing = [];
  RAIL.forEach((g) =>
    g.sections.forEach((s) =>
      s.tools.forEach((t) => {
        if (!known.has(t)) missing.push(g.id + "/" + t);
        if (!ICON[t]) missing.push(g.id + "/" + t + " (no icon)");
      }),
    ),
  );
  if (missing.length)
    console.warn("rail tools with nothing behind them:", missing);
  return missing;
}
