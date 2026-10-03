/* TheOnePercent — application shell
   -------------------------------------------------------------------
   One source of truth for the chrome that must look identical on every
   screen: the top navigation and the right-edge icon rail (roadmap:
   "present on every screen so the layout never shifts after login").

   Usage — put this at the end of <body>:

     <body data-page="dashboard" data-depth="1">
       ...page content...
       <script src="../assets/shell.js"></script>

     data-page   which nav item is current: dashboard | journal | charts |
                 calculators | learn | markets | none
     data-depth  how many folders deep the file is (0 = repo root,
                 1 = pages/). Controls link prefixes.
     data-auth   optional override: "in" or "out". Left off, the shell
                 shows the logged-in state when an onboarding profile
                 exists and the logged-out state when it does not.
     data-shell  set to "nav" to skip the rail, "rail" to skip the nav.

   The shell injects the markup itself, so a new screen needs no chrome
   HTML at all. Page-specific scripts can read Shell.profile().
   ------------------------------------------------------------------- */

window.Shell = (() => {
  "use strict";

  const body = document.body;
  const page = body.dataset.page || "none";
  const parts = body.dataset.shell || "nav rail";

  /* Every screen is now a top-level Flask route (see app.py) rather than
     a file nested under pages/, so there's no per-page depth to correct
     for anymore — every path here is absolute from the site root. */
  const P = {
    home: "/",
    signup: "/sign-up",
    login: "/login",
    onboarding: "/onboarding",
    dashboard: "/dashboard",
    journal: "/journal",
    charts: "/charts",
    calculators: "/calculators",
    settings: "/settings",
    learn: "/learn",
    markets: "/#summary",
  };

  /* ---------------------------------------------------------- storage
     Wrapped so a page still works where web storage is blocked (private
     mode, sandboxed preview frames) — it silently falls back to memory
     for the session. Written by the onboarding screen, read here. */

  const memory = new Map();
  const STORE = ["local", "Storage"].join("");
  const KEYS = [
    "onepercent:profile",
    "onepercent.profile",
    "op_profile",
    "onboarding",
  ];

  function store() {
    try {
      const s = window[STORE];
      const probe = "__op__";
      s.setItem(probe, "1");
      s.removeItem(probe);
      return s;
    } catch (e) {
      return null;
    }
  }

  function readRaw(key) {
    const s = store();
    try {
      return s ? s.getItem(key) : memory.get(key) || null;
    } catch (e) {
      return memory.get(key) || null;
    }
  }

  function writeRaw(key, value) {
    const s = store();
    memory.set(key, value);
    try {
      if (s) s.setItem(key, value);
    } catch (e) {
      /* memory only */
    }
  }

  function clearProfile() {
    const s = store();
    KEYS.forEach((k) => {
      memory.delete(k);
      try {
        if (s) s.removeItem(k);
      } catch (e) {
        /* ignore */
      }
    });
  }

  /* Accepts whatever shape onboarding saved and normalises it. */
  function profile() {
    for (const key of KEYS) {
      const raw = readRaw(key);
      if (!raw) continue;
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        continue;
      }
      if (!data || typeof data !== "object") continue;
      const markets = []
        .concat(data.markets || data.selectedMarkets || data.assets || [])
        .filter(Boolean);
      const experience =
        data.experience || data.level || data.experienceLevel || "";
      const name = data.name || data.fullName || data.firstName || "";
      const email = data.email || "";
      if (!markets.length && !experience && !name) continue;
      return { markets, experience, name, email, key, raw: data };
    }
    return null;
  }

  function saveProfile(patch) {
    const current = profile();
    const next = Object.assign({}, current ? current.raw : {}, patch);
    writeRaw(current ? current.key : KEYS[0], JSON.stringify(next));
    return next;
  }

  const me = profile();
  const authed = body.dataset.auth ? body.dataset.auth === "in" : !!me;
  const displayName =
    (me && me.name) ||
    (me && me.email ? me.email.split("@")[0] : "") ||
    "Trader";
  const initials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "T";

  /* ---------------------------------------------------------- icons */

  const ICON = {
    caret:
      '<svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 3.6 5 6.6l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search:
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.6" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    burger:
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    close:
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3l2.2 4.6 5 .7-3.6 3.5.85 5-4.45-2.35L5.55 16.8l.85-5L2.8 8.3l5-.7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    clock:
      '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.6" stroke="currentColor" stroke-width="1.4"/><path d="M10 6.4V10l2.6 1.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    cal: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3.4" y="4.6" width="13.2" height="11.4" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3.4 8.2h13.2M7.2 3.4v2.4M12.8 3.4v2.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    bell: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 9a4 4 0 1 1 8 0c0 3 1.2 4.2 1.2 4.2H4.8S6 12 6 9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.6 15.4a1.6 1.6 0 0 0 2.8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    user: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="7.6" r="2.9" stroke="currentColor" stroke-width="1.4"/><path d="M4.4 16c.7-2.7 2.9-4 5.6-4s4.9 1.3 5.6 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M15.4 12.4A6 6 0 0 1 7.6 4.6a6 6 0 1 0 7.8 7.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    sun: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="3.4" stroke="currentColor" stroke-width="1.4"/><path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M15.2 4.8l-1.4 1.4M6.2 13.8l-1.4 1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  };

  /* ---------------------------------------------------------- nav markup */

  const NAV = [
    { id: "dashboard", label: "Dashboard", href: P.dashboard },
    { id: "journal", label: "Journal", href: P.journal },
    { id: "charts", label: "Charts", href: P.charts },
    { id: "calculators", label: "Calculators", href: P.calculators },
    { id: "learn", label: "Learn", href: P.learn },
  ];

  const MARKET_LINKS = [
    ["Forex", "28 pairs"],
    ["Crypto", "major coins"],
    ["Futures", "index & energy"],
    ["Stocks & indices", "global"],
    ["Commodities", "metals"],
  ];

  /* label, href — "#" stays for the parts of Phase 1 that are not built
     yet, so nothing pretends to be a working link */
  const MORE_LINKS = [
    ["Economic calendar", "#"],
    ["News & sentiment", "#"],
    ["Discipline leaderboard", "#"],
    ["Resource library", P.learn + "#library"],
    ["Glossary", P.learn + "#glossary"],
  ];

  function navHTML() {
    const links = NAV.map(
      (n) =>
        `<a href="${n.href}"${page === n.id ? ' aria-current="page"' : ""}>${n.label}</a>`,
    ).join("");

    const markets = MARKET_LINKS.map(
      ([label, sub]) =>
        `<a href="${P.markets}">${label} <small>${sub}</small></a>`,
    ).join("");

    const more = MORE_LINKS.map(([l, href]) => `<a href="${href}">${l}</a>`).join("");

    const actions = authed
      ? `<div class="dd">
           <button class="avatar-trigger" data-dd="account" aria-expanded="false" aria-controls="dd-account">
             <span class="avatar" aria-hidden="true">${initials}</span>
             <span class="who">${displayName}</span>
             ${ICON.caret}
           </button>
           <div class="dd-panel right" id="dd-account">
             <div class="dd-head"><b>${displayName}</b><small>${
               me && me.email ? me.email : "Free plan"
             }</small></div>
             <a href="${P.dashboard}">Dashboard</a>
             <a href="${P.onboarding}">Trading preferences</a>
             <a href="${P.settings}">Account settings</a>
             <a href="#" data-shell-logout>Log out</a>
           </div>
         </div>`
      : `<a class="btn btn-quiet" href="${P.login}">Log in</a>
         <a class="btn btn-primary" href="${P.signup}">Sign up</a>`;

    return `<div class="wrap nav-row">
      <a class="brand" href="${P.home}" aria-label="TheOnePercent home">
        <span class="brand-mark" aria-hidden="true">1%</span>
        <span class="brand-name">TheOnePercent</span>
      </a>

      <nav class="nav-links" aria-label="Primary">
        ${links}
        <div class="dd">
          <button class="dd-trigger" data-dd="markets" aria-expanded="false" aria-controls="dd-markets">Markets ${ICON.caret}</button>
          <div class="dd-panel" id="dd-markets">${markets}</div>
        </div>
        <div class="dd">
          <button class="dd-trigger" data-dd="more" aria-expanded="false" aria-controls="dd-more">More ${ICON.caret}</button>
          <div class="dd-panel" id="dd-more">${more}</div>
        </div>
      </nav>

      <div class="nav-search">
        <div class="search-field">
          ${ICON.search}
          <input id="shell-search" type="search" placeholder="Search markets, lessons, tools" autocomplete="off"
                 role="combobox" aria-expanded="false" aria-controls="shell-search-results"
                 aria-label="Search markets, lessons and tools">
        </div>
        <div class="search-results" id="shell-search-results" role="listbox" aria-label="Search results"></div>
      </div>

      <div class="nav-actions">
        ${actions}
        <button class="burger" id="shell-burger" aria-expanded="false" aria-controls="shell-sheet" aria-label="Open menu">${ICON.burger}</button>
      </div>
    </div>`;
  }

  function sheetHTML() {
    const links = NAV.map(
      (n) =>
        `<a class="sheet-link" href="${n.href}"${page === n.id ? ' aria-current="page"' : ""}>${n.label}</a>`,
    ).join("");
    const markets = MARKET_LINKS.map(
      ([label]) => `<a class="sheet-link" href="${P.markets}">${label}</a>`,
    ).join("");
    const more = MORE_LINKS.map(([l, href]) => `<a class="sheet-link" href="${href}">${l}</a>`).join("");

    const cta = authed
      ? `<a class="btn btn-quiet" href="${P.settings}">Settings</a>
         <a class="btn btn-quiet" href="${P.onboarding}">Trading preferences</a>
         <a class="btn btn-quiet" href="#" data-shell-logout>Log out</a>`
      : `<a class="btn btn-primary" href="${P.signup}">Start free →</a>
         <a class="btn btn-quiet" href="${P.login}">Log in</a>`;

    return `<div class="sheet-veil" data-close></div>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="sheet-head">
          <h2>${authed ? displayName : "Menu"}</h2>
          <button class="icon-btn" data-close aria-label="Close menu">${ICON.close}</button>
        </div>
        <h3>Product</h3>${links}
        <h3>Markets</h3>${markets}
        <h3>More</h3>${more}
        <div class="sheet-cta">${cta}</div>
      </div>`;
  }

  /* ---------------------------------------------------------- rail data */

  const QUOTES = [
    {
      symbol: "EURUSD",
      name: "Euro / US Dollar",
      cls: "Forex",
      price: 1.0842,
      dec: 4,
      chg: 0.38,
    },
    {
      symbol: "BTCUSD",
      name: "Bitcoin",
      cls: "Crypto",
      price: 64218,
      dec: 0,
      chg: 1.92,
    },
    {
      symbol: "NQ1!",
      name: "Nasdaq 100 futures",
      cls: "Futures",
      price: 19884,
      dec: 0,
      chg: -0.21,
    },
    {
      symbol: "US500",
      name: "S&P 500 index",
      cls: "Indices",
      price: 5431.6,
      dec: 1,
      chg: 0.78,
    },
    {
      symbol: "XAUUSD",
      name: "Gold spot",
      cls: "Commodities",
      price: 2341.5,
      dec: 1,
      chg: 0.44,
    },
  ];

  /* UTC open hours, Monday–Friday */
  const SESSIONS = [
    { name: "Sydney", open: 21, close: 6 },
    { name: "Tokyo", open: 0, close: 9 },
    { name: "London", open: 7, close: 16 },
    { name: "New York", open: 12, close: 21 },
  ];

  const EVENTS = [
    { time: "13:30", ccy: "USD", title: "Core CPI (MoM)", impact: "High" },
    { time: "15:00", ccy: "USD", title: "Fed Chair remarks", impact: "High" },
    { time: "09:00", ccy: "EUR", title: "ECB bulletin", impact: "Medium" },
  ];

  const fmt = (n, d) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  const pct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";

  function watchlist() {
    const picked =
      me && me.markets.length
        ? me.markets.map((m) => String(m).toLowerCase())
        : null;
    const rows = picked
      ? QUOTES.filter((q) =>
          picked.some(
            (p) =>
              q.cls.toLowerCase().includes(p) ||
              p.includes(q.cls.toLowerCase()) ||
              q.symbol.toLowerCase() === p,
          ),
        )
      : QUOTES;
    return rows.length ? rows : QUOTES;
  }

  function sessionState(now) {
    const h = now.getUTCHours() + now.getUTCMinutes() / 60;
    const weekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
    return SESSIONS.map((s) => {
      const open =
        s.open < s.close
          ? h >= s.open && h < s.close
          : h >= s.open || h < s.close;
      return {
        name: s.name,
        open: weekday && open,
        window: `${String(s.open).padStart(2, "0")}:00–${String(s.close).padStart(2, "0")}:00 UTC`,
      };
    });
  }

  /* Panel tabs, then a divider, then the two pinned utilities. The order
     is fixed on purpose — muscle memory only forms if nothing moves. */
  function railHTML() {
    const items = [
      ["watchlist", "Watchlist", ICON.star],
      ["sessions", "Session clock", ICON.clock],
      ["calendar", "Economic calendar", ICON.cal],
      ["alerts", "Alerts", ICON.bell, true],
    ];
    const panels = items
      .map(
        ([id, tip, icon, badge]) =>
          `<button data-rail="${id}" data-tip="${tip}" aria-label="${tip}" aria-expanded="false" aria-controls="rp-${id}">
             ${icon}${badge ? '<span class="rail-badge" aria-hidden="true"></span>' : ""}
           </button>`,
      )
      .join("");

    const dark = !window.Theme || window.Theme.current() === "dark";
    const themeBtn = `<button id="shell-theme" data-tip="${
      dark ? "Light theme" : "Dark theme"
    }" aria-label="Switch to ${dark ? "light" : "dark"} theme">${dark ? ICON.sun : ICON.moon}</button>`;

    const accountBtn = `<button data-rail="account" data-tip="Account" aria-label="Account" aria-expanded="false" aria-controls="rp-account">${ICON.user}</button>`;

    return `${panels}<span class="rail-div" aria-hidden="true"></span>${themeBtn}${accountBtn}`;
  }

  function panelHTML(id) {
    if (id === "watchlist") {
      const rows = watchlist()
        .map(
          (q) => `<div class="rp-row">
            <span><b>${q.symbol}</b><small>${q.cls}</small></span>
            <span style="text-align:right"><b>${fmt(q.price, q.dec)}</b>
            <small class="chg ${q.chg >= 0 ? "up" : "down"}">${pct(q.chg)}</small></span>
          </div>`,
        )
        .join("");
      return `<div class="rp-head"><h3>Watchlist</h3><span>${
        me && me.markets.length ? "from your markets" : "defaults"
      }</span></div>${rows}<div class="rp-foot">Tap a symbol to open it in Charts.</div>`;
    }

    if (id === "sessions") {
      const rows = sessionState(new Date())
        .map(
          (s) => `<div class="rp-row">
            <span>${s.name}<small>${s.window}</small></span>
            <span class="sess-chip ${s.open ? "on" : "off"}">${s.open ? "Open" : "Closed"}</span>
          </div>`,
        )
        .join("");
      return `<div class="rp-head"><h3>Session clock</h3><span id="rp-now"></span></div>${rows}
        <div class="rp-foot">Your time zone: ${
          Intl.DateTimeFormat().resolvedOptions().timeZone || "local"
        }</div>`;
    }

    if (id === "calendar") {
      const rows = EVENTS.map(
        (e) => `<div class="rp-row">
          <span><b>${e.time}</b><small>${e.ccy} · ${e.title}</small></span>
          <span class="tag">${e.impact}</span>
        </div>`,
      ).join("");
      return `<div class="rp-head"><h3>Today</h3><span>times in UTC</span></div>${rows}
        <div class="rp-foot">Full calendar arrives with the Market context block.</div>`;
    }

    if (id === "alerts") {
      return `<div class="rp-head"><h3>Alerts</h3><span>1 new</span></div>
        <div class="rp-row"><span>Welcome to TheOnePercent<small>Log your first trade to start the streak</small></span></div>
        <p class="rp-note" style="margin-top:10px">Price and calendar alerts switch on once you add symbols to your watchlist.</p>`;
    }

    if (id === "account") {
      return authed
        ? `<div class="rp-head"><h3>${displayName}</h3><span>Free plan</span></div>
           <div class="rp-row"><span>Markets<small>${
             me && me.markets.length ? me.markets.join(", ") : "not set yet"
           }</small></span></div>
           <div class="rp-row"><span>Experience<small>${
             (me && me.experience) || "not set yet"
           }</small></span></div>
           <div class="sheet-cta" style="margin-top:12px">
             <a class="btn btn-quiet" href="${P.settings}">Settings</a>
             <a class="btn btn-quiet" href="${P.onboarding}">Edit preferences</a>
             <a class="btn btn-quiet" href="#" data-shell-logout>Log out</a>
           </div>`
        : `<div class="rp-head"><h3>Account</h3></div>
           <p class="rp-note">You are browsing as a guest. Create a free account to keep a journal, a watchlist and your streak.</p>
           <div class="sheet-cta" style="margin-top:12px">
             <a class="btn btn-primary" href="${P.signup}">Start free →</a>
             <a class="btn btn-quiet" href="${P.login}">Log in</a>
           </div>`;
    }
    return "";
  }

  /* ---------------------------------------------------------- mount */

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function mount() {
    if (!$(".skip")) {
      const skip = document.createElement("a");
      skip.className = "skip";
      skip.href = "#main";
      skip.textContent = "Skip to content";
      body.insertBefore(skip, body.firstChild);
    }

    if (parts.includes("nav")) {
      const header = document.createElement("header");
      header.className = "topbar";
      header.innerHTML = navHTML();
      body.insertBefore(header, $(".skip").nextSibling);

      const sheet = document.createElement("div");
      sheet.className = "sheet";
      sheet.id = "shell-sheet";
      sheet.setAttribute("aria-hidden", "true");
      sheet.innerHTML = sheetHTML();
      header.after(sheet);

      wireNav();
      wireSearch();
    }

    if (parts.includes("rail")) {
      const rail = document.createElement("div");
      rail.className = "rail";
      rail.setAttribute("role", "toolbar");
      rail.setAttribute("aria-label", "Quick panels");
      rail.innerHTML = railHTML();
      body.appendChild(rail);
      wireRail(rail);
      wireTheme(rail);
    }

    $$("[data-shell-logout]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        clearProfile();
        window.location.href = P.home;
      }),
    );
  }

  /* ---------------------------------------------------------- nav wiring */

  function closeDropdowns(except) {
    $$(".dd-trigger, .avatar-trigger").forEach((t) => {
      if (t === except) return;
      t.setAttribute("aria-expanded", "false");
      const panel = $("#dd-" + t.dataset.dd);
      if (panel) panel.classList.remove("open");
    });
  }

  function closeSheet() {
    const sheet = $("#shell-sheet");
    if (!sheet || !sheet.classList.contains("open")) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    $("#shell-burger").setAttribute("aria-expanded", "false");
    body.style.overflow = "";
  }

  function wireNav() {
    $$(".dd-trigger, .avatar-trigger").forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = $("#dd-" + trigger.dataset.dd);
        const open = trigger.getAttribute("aria-expanded") === "true";
        closeDropdowns(trigger);
        trigger.setAttribute("aria-expanded", String(!open));
        if (panel) panel.classList.toggle("open", !open);
      });
    });

    const burger = $("#shell-burger");
    const sheet = $("#shell-sheet");
    burger.addEventListener("click", () => {
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
      burger.setAttribute("aria-expanded", "true");
      body.style.overflow = "hidden";
      const first = sheet.querySelector("a, button");
      if (first) first.focus();
    });
    $$("[data-close], .sheet-link", sheet).forEach((el) =>
      el.addEventListener("click", closeSheet),
    );
  }

  /* ---------------------------------------------------------- search */

  /* The market half of the search index is the real instrument table when the
     page has loaded it, and the five demo quotes only as a fallback.

     It was the five, everywhere. So a Ugandan trader typing "UGX" — or
     "shilling", or "silver", or "DXY" — got "Nothing for that". Twenty-two of
     the twenty-seven instruments this app trades were unsearchable from the
     one search box on every page, and the pairs a project aimed at East
     Africa exists to offer were among the missing.

     `base` and `quote` go into the haystack so a currency code finds its
     pairs: "UGX" reaches USDUGX even though the word does not appear in
     "US dollar / Ugandan shilling". */
  const MARKET_INDEX =
    (window.Instruments && window.Instruments.INSTRUMENTS) || null
      ? window.Instruments.INSTRUMENTS.map((i) => ({
          group: "Markets",
          label: i.symbol,
          sub: i.name,
          tag: i.market,
          extra: `${i.base || ""} ${i.quote || ""}`,
          href: P.markets,
        }))
      : QUOTES.map((q) => ({
          group: "Markets",
          label: q.symbol,
          sub: q.name,
          tag: q.cls,
          extra: "",
          href: P.markets,
        }));

  const INDEX = [
    ...MARKET_INDEX,
    { group: "Tools", label: "Trading journal", sub: "Entry, exit, size, screenshot, emotion", tag: "Journal", href: P.journal },
    { group: "Tools", label: "Position size calculator", sub: "Risk percent to lot size", tag: "Calculator", href: P.calculators },
    { group: "Tools", label: "Pip value calculator", sub: "In your account currency", tag: "Calculator", href: P.calculators },
    { group: "Tools", label: "Currency converter", sub: "Same rates as the market tables", tag: "Converter", href: P.calculators },
    /* Lessons come from the curriculum itself rather than two hardcoded
       rows, so search can never advertise a lesson that no longer exists.
       The glossary is searchable too — looking up "expectancy" is the most
       likely reason anyone types a word into this box. */
    /* Academy masterclasses, where the catalog is loaded (the Learn page). */
    ...(window.Academy
      ? window.Academy.courses.map((c) => ({
          group: "Masterclasses",
          label: c.title,
          sub: c.tagline,
          tag: window.Academy.isLive(c) ? "Full course" : c.level,
          href: P.learn + "#mc/" + c.id,
        }))
      : []),
    ...(window.Curriculum
      ? window.Curriculum.lessons.map((l) => ({
          group: "Lessons",
          label: l.title,
          sub: l.summary,
          tag: (window.Curriculum.block(l.block) || {}).level || "Lesson",
          href: P.learn + "#lesson/" + l.id,
        }))
      : []),
    ...(window.Curriculum
      ? Object.keys(window.Curriculum.glossary).map((t) => ({
          group: "Glossary",
          label: t,
          sub: window.Curriculum.glossary[t],
          tag: "Definition",
          href: P.learn + "#glossary",
        }))
      : []),
    ...(window.Curriculum
      ? window.Curriculum.resources.map((r) => ({
          group: "Library",
          label: r.title,
          sub: r.blurb,
          tag: r.kind,
          href: P.learn + "#library",
        }))
      : []),
  ];

  let active = -1;

  function closeSearch() {
    const panel = $("#shell-search-results");
    if (!panel) return;
    panel.classList.remove("open");
    $("#shell-search").setAttribute("aria-expanded", "false");
    active = -1;
  }

  function wireSearch() {
    const input = $("#shell-search");
    const panel = $("#shell-search-results");

    function render(q) {
      const query = q.trim().toLowerCase();
      if (!query) return closeSearch();
      const hits = INDEX.filter(
        (i) =>
          i.label.toLowerCase().includes(query) ||
          i.sub.toLowerCase().includes(query) ||
          i.tag.toLowerCase().includes(query) ||
          (i.extra || "").toLowerCase().includes(query),
      ).slice(0, 8);

      if (!hits.length) {
        panel.innerHTML = `<div class="sr-empty">Nothing for “${q}”. Try a symbol like EURUSD, or “risk”.</div>`;
      } else {
        let html = "";
        let group = "";
        hits.forEach((h) => {
          if (h.group !== group) {
            group = h.group;
            html += `<div class="sr-group">${group}</div>`;
          }
          html += `<a class="sr-item" role="option" aria-selected="false" href="${h.href}">
            <span><b>${h.label}</b><small>${h.sub}</small></span>
            <span class="tag">${h.tag}</span></a>`;
        });
        panel.innerHTML = html;
      }
      panel.classList.add("open");
      input.setAttribute("aria-expanded", "true");
      active = -1;
    }

    input.addEventListener("input", (e) => render(e.target.value));
    input.addEventListener("focus", (e) => {
      if (e.target.value) render(e.target.value);
    });
    input.addEventListener("keydown", (e) => {
      const items = $$(".sr-item", panel);
      if (!items.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active =
          (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length;
        items.forEach((it, i) => {
          it.classList.toggle("active", i === active);
          it.setAttribute("aria-selected", String(i === active));
        });
        items[active].scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        items[active].click();
      }
    });
  }

  /* ---------------------------------------------------------- theme */

  function wireTheme(rail) {
    const btn = $("#shell-theme", rail);
    if (!btn || !window.Theme) return;

    function sync() {
      const dark = window.Theme.current() === "dark";
      btn.innerHTML = dark ? ICON.sun : ICON.moon;
      btn.dataset.tip = dark ? "Light theme" : "Dark theme";
      btn.setAttribute(
        "aria-label",
        "Switch to " + (dark ? "light" : "dark") + " theme",
      );
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.Theme.toggle();
    });
    window.addEventListener("themechange", sync);
    sync();
  }

  /* ---------------------------------------------------------- rail wiring */

  let clockTimer = null;

  function closePanels(except) {
    $$(".rail-panel").forEach((p) => {
      if (p.id === "rp-" + except) return;
      p.classList.remove("open");
    });
    $$("[data-rail]").forEach((b) => {
      if (b.dataset.rail !== except) b.setAttribute("aria-expanded", "false");
    });
    if (except !== "sessions" && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function wireRail(rail) {
    $$("[data-rail]", rail).forEach((btn) => {
      const id = btn.dataset.rail;
      const panel = document.createElement("div");
      panel.className = "rail-panel";
      panel.id = "rp-" + id;
      body.appendChild(panel);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = btn.getAttribute("aria-expanded") === "true";
        closePanels(open ? null : id);
        if (open) {
          panel.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
          return;
        }
        panel.innerHTML = panelHTML(id);
        btn.setAttribute("aria-expanded", "true");
        panel.classList.add("open");

        /* keep the flyout next to its button and inside the viewport */
        const r = btn.getBoundingClientRect();
        const h = panel.offsetHeight;
        panel.style.top =
          Math.min(window.innerHeight - h - 12, Math.max(12, r.top - 12)) +
          "px";

        if (id === "sessions") {
          const tick = () => {
            const now = $("#rp-now");
            if (now)
              now.textContent = new Date().toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });
          };
          tick();
          clockTimer = setInterval(tick, 1000);
        }

        $$("[data-shell-logout]", panel).forEach((el) =>
          el.addEventListener("click", (ev) => {
            ev.preventDefault();
            clearProfile();
            window.location.href = P.home;
          }),
        );
      });
    });
  }

  /* ---------------------------------------------------------- global keys */

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dd")) closeDropdowns();
    if (!e.target.closest(".nav-search")) closeSearch();
    if (!e.target.closest(".rail") && !e.target.closest(".rail-panel"))
      closePanels(null);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdowns();
      closeSearch();
      closeSheet();
      closePanels(null);
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      const input = $("#shell-search");
      if (input) {
        e.preventDefault();
        input.focus();
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  return {
    paths: P,
    icons: ICON,
    profile,
    saveProfile,
    clearProfile,
    quotes: QUOTES,
    isAuthed: () => authed,
    displayName,
  };
})();
