/* Dashboard (pages/dashboard.html)
   -------------------------------------------------------------------
   Two states, decided by one question: has anything been logged?

   Empty  -> the guided "start here" block and the watchlist only. No
             wall of zeroes, no fake sparklines.
   Live   -> equity curve, R by setup, recent trades, real metrics.

   Every number comes from Store.stats / Store.compute, so this screen
   cannot disagree with the journal. The account + period filter at the
   top governs the whole page, which is the thing the original roadmap
   was missing: four widgets each with their own implied date range
   read as four contradictions.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const state = { range: "30", account: "all" };

  const settings = () => Store.settings.get();

  function money(n, signed) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "—";
    const s = settings();
    const abs = Math.abs(n);
    const dp = abs >= 1000 || s.currency === "UGX" ? 0 : 2;
    const body = abs.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
    return (n < 0 ? "−" : signed && n > 0 ? "+" : "") + body + " " + (s.currency || "");
  }

  function bare(n, signed) {
    if (n === null || !Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    const dp = abs >= 1000 || settings().currency === "UGX" ? 0 : 2;
    return (
      (n < 0 ? "−" : signed && n > 0 ? "+" : "") +
      abs.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) + " calculation units"
    );
  }

  const rfmt = (n) =>
    n === null || !Number.isFinite(n) ? "—" : (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(2) + "R";
  const pct = (n, dp) => (n === null || !Number.isFinite(n) ? "—" : n.toFixed(dp === undefined ? 1 : dp) + "%");
  const dir = (n) => (n > 0 ? "up" : n < 0 ? "down" : "");
  const esc = (s) =>
    String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* ------------------------------------------------------------ data */

  function filtered() {
    const cut = state.range === "all" ? null : Date.now() - parseInt(state.range, 10) * 864e5;
    return Store.trades.list().filter((t) => {
      if (cut && new Date(t.date).getTime() < cut) return false;
      if (state.account !== "all" && (t.account || "") !== state.account) return false;
      return true;
    });
  }

  function accountTrades() {
    return Store.trades.list().filter((t) =>
      state.account === "all" || (t.account || "") === state.account
    );
  }

  /* ------------------------------------------------------------ account overview */

  function renderAccountSummary(trades, stats) {
    const s = settings();
    const open = Store.openRisk(trades, s);
    const missingStops = open.unknown
      ? " · " + open.unknown + (open.unknown === 1 ? " position is" : " positions are") + " individually unmeasurable"
      : "";

    const cards = [
      { k: "Shared sizing balance", v: money(s.balance), n: "Position-sizing setting · not equity", icon: "bank" },
      { k: "Realised net P/L", v: "Unavailable", n: stats.eligiblePL + " eligible of " + stats.closed + " closed · Compatible units not recorded", icon: "chart" },
      { k: "Open journal positions", v: String(open.n), n: "Selected account · all opening dates", icon: "layers" },
      { k: "Aggregate open risk", v: open.n ? "Unavailable" : "—", n: open.n ? "Compatible units not recorded" + missingStops : "No open positions", icon: "shield" },
    ];

    [cards[1], cards[2]] = [cards[2], cards[1]];
    $("#account-summary").innerHTML = cards
      .map(
        (c) =>
          `<div class="stat"><div class="stat-top"><div class="k">${esc(c.k)}</div>${HomeIcons.ui(c.icon || "chart")}</div>` +
          `<div class="v ${c.cls || ""}">${esc(c.v)}</div><div class="n">${esc(c.n)}</div></div>`
      )
      .join("");
  }

  /* ------------------------------------------------------------ metrics */

  function renderStats(trades) {
    const s = Store.stats(trades, settings());
    const limit = settings().riskPct;
    const factor = s.profitFactor === null ? "—" : s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2);

    const cards = [
      {
        k: "Net P/L of fully closed trades",
        v: "Unavailable",
        n: s.eligiblePL + " individually valid of " + s.closed + " closed; aggregate unavailable because compatible units are not recorded",
      },
      {
        k: "Win rate",
        v: pct(s.winRate, 1),
        n: s.eligiblePL + " eligible P/L records; unavailable records excluded; breakeven remains in denominator",
      },
      {
        k: "Average R",
        v: rfmt(s.averageR),
        n: s.eligibleR + " eligible R records; uses the recorded stop, not an immutable initial-risk snapshot",
        cls: dir(s.averageR),
      },
      {
        k: "Profit factor",
        v: factor,
        n: s.profitFactorUnavailableReason,
      },
      {
        k: "Expectancy",
        v: rfmt(s.expectancy),
        n: s.expectancy === null ? "needs a closed trade with valid P/L and risk" : "mean R per eligible trade; uses the recorded stop",
        cls: dir(s.expectancy),
      },
      {
        k: "Absolute drawdown",
        v: "Unavailable",
        n: s.drawdownUnavailableReason,
      },
      {
        k: "Best trade (R)",
        v: rfmt(s.bestR),
        n: s.bestR === null ? "no realised R yet" : "highest realised R",
        cls: dir(s.bestR),
      },
      {
        k: "Worst trade (R)",
        v: rfmt(s.worstR),
        n: s.worstR === null ? "no realised R yet" : "lowest realised R",
        cls: dir(s.worstR),
      },
      {
        k: "Discipline",
        v: s.discipline === null ? "—" : s.discipline + "/100",
        n:
        s.avgRiskPct === null
            ? s.avgRiskPctUnavailableReason
            : "avg risk " + pct(s.avgRiskPct, 2) + " vs " + limit + "% rule",
        cls: s.discipline === null ? "" : s.discipline >= 75 ? "up" : s.discipline < 50 ? "down" : "",
      },
    ];


    const primary = cards.slice(1, 4);
    const secondary = cards.slice(4);
    const metricCard = (c) => `<div class="stat"><div class="k">${esc(c.k)}</div><div class="v ${c.cls || ""}">${esc(c.v)}</div><details class="metric-note"><summary>Calculation details</summary><p>${esc(c.n)}</p></details></div>`;
    $("#stats").innerHTML = primary.map(metricCard).join("") + `<details class="more-metrics"><summary>More metrics</summary><div class="secondary-metrics">${secondary.map(metricCard).join("")}</div></details>`;
    return s;
  }

  /* ------------------------------------------------------------ equity */

  /* the last drawn geometry, so the hover handler can map a cursor x back
     to a point without redrawing or recomputing anything */
  let eq = null;

  function drawEquity(stats) {
    const cv = $("#equity");
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || cv.parentElement.clientWidth;
    const h = 180;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.height = h + "px";
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const pts = stats.realizedCurve;
    const unavailable = !pts || pts.length < 2;
    $("#performance-empty").hidden = !unavailable;
    $("#equity-wrap").hidden = unavailable;
    $("#performance-empty-note").textContent = !stats.closed
      ? "Close a journal trade to begin reviewing your results. No returns are estimated."
      : "A money-based curve is unavailable because compatible P/L units are not recorded. Review eligible R metrics above.";
    if (!pts) {
      eq = null;
      g.fillStyle = css("--faint");
      g.font = "13px " + (css("--sans") || "sans-serif");
      g.textAlign = "center";

      $("#eq-note").textContent = "Unavailable";
      $("#eq-dd").textContent = "";
      return;
    }
    if (pts.length < 2) {
      eq = null;
      g.fillStyle = css("--faint");
      g.font = "13px " + (css("--sans") || "sans-serif");
      g.textAlign = "center";
      g.fillText("Close a trade and the curve starts here.", w / 2, h / 2);
      return;
    }

    const vals = pts.map((p) => p.netPL);
    let lo = Math.min.apply(null, vals);
    let hi = Math.max.apply(null, vals);
    const padv = (hi - lo || Math.abs(hi) * 0.02 || 1) * 0.14;
    lo -= padv;
    hi += padv;

    const padL = 8, padR = 8, padT = 12, padB = 20;
    const x = (i) => padL + (i / (pts.length - 1)) * (w - padL - padR);
    const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);

    /* the starting balance, so gains and losses are read against it */
    const start = 0;
    g.strokeStyle = css("--line-strong");
    g.setLineDash([3, 4]);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(padL, y(start));
    g.lineTo(w - padR, y(start));
    g.stroke();
    g.setLineDash([]);

    const ending = vals[vals.length - 1];
    const colour = ending >= start ? css("--up") : css("--down");

    /* fill under the curve, clipped to the baseline */
    const grad = g.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, colour + "38");
    grad.addColorStop(1, colour + "00");
    g.beginPath();
    g.moveTo(x(0), y(vals[0]));
    pts.forEach((p, i) => g.lineTo(x(i), y(p.netPL)));
    g.lineTo(x(pts.length - 1), y(start));
    g.lineTo(x(0), y(start));
    g.closePath();
    g.fillStyle = grad;
    g.fill();

    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(x(i), y(p.netPL)) : g.moveTo(x(i), y(p.netPL))));
    g.strokeStyle = colour;
    g.lineWidth = 1.8;
    g.lineJoin = "round";
    g.stroke();

    /* last point marked, because the current balance is the only value
       anyone actually looks for */
    g.beginPath();
    g.arc(x(pts.length - 1), y(ending), 3.2, 0, Math.PI * 2);
    g.fillStyle = colour;
    g.fill();

    eq = { pts, x, y, w, h, colour, start };

    $("#eq-note").textContent = "Unavailable units";
    $("#eq-dd").textContent = "Drawdown unavailable: compatible P/L units are not recorded.";
  }

  /* ------------------------------------------------------------ equity hover
     A curve without values is decoration. Reading a balance off the shape of
     a line is guesswork, so the cursor names the point: which trade, when,
     the balance after it and the change it caused. Redraws the curve and
     paints the crosshair on top, because canvas has no other way back. */

  function eqHover(ev) {
    if (!eq) return;
    const cv = $("#equity");
    const tip = $("#eq-tip");
    const rect = cv.getBoundingClientRect();
    const mx = ev.clientX - rect.left;

    /* nearest point by x, not the one under the cursor — a 40-trade curve
       has points closer together than a fingertip */
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < eq.pts.length; i++) {
      const d = Math.abs(eq.x(i) - mx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }

    const p = eq.pts[best];
    const prev = best ? eq.pts[best - 1] : null;
    const px = eq.x(best);
    const py = eq.y(p.netPL);

    drawEquity(Store.stats(filtered(), settings()));

    const g = cv.getContext("2d");
    g.strokeStyle = css("--line-strong");
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(px, 8);
    g.lineTo(px, eq.h - 20);
    g.stroke();
    g.beginPath();
    g.arc(px, py, 4.5, 0, Math.PI * 2);
    g.fillStyle = eq.colour;
    g.fill();
    g.strokeStyle = css("--surface");
    g.lineWidth = 2;
    g.stroke();

    const chg = prev ? p.netPL - prev.netPL : 0;
    tip.innerHTML =
      "<b>" + esc(bare(p.netPL, true)) + " calculation units</b>" +
      (prev ? '<span class="' + dir(chg) + '">' + esc(money(chg, true)) + "</span>" : "<span>opening balance</span>") +
      "<small>" + esc(p.t ? String(p.t).slice(0, 10) : "before the first trade") + "</small>";
    tip.hidden = false;

    /* keep the tip inside the panel rather than letting it clip */
    const tw = tip.offsetWidth || 130;
    let left = px - tw / 2;
    left = Math.max(2, Math.min(left, eq.w - tw - 2));
    tip.style.left = left + "px";
    tip.style.top = Math.max(0, py - tip.offsetHeight - 12) + "px";
  }

  function eqLeave() {
    const tip = $("#eq-tip");
    if (tip) tip.hidden = true;
    if (eq) drawEquity(Store.stats(filtered(), settings()));
  }

  /* ------------------------------------------------------------ by setup */

  function renderBySetup(trades) {
    const map = new Map();
    trades.forEach((t) => {
      const c = Store.compute(t);
      if (c.open || !Number.isFinite(c.r)) return;
      const k = t.setup || "Untagged";
      const cur = map.get(k) || { n: 0, r: 0 };
      cur.n += 1;
      cur.r += c.r;
      map.set(k, cur);
    });

    const rows = Array.from(map.entries())
      .map(([k, v]) => ({ k, n: v.n, exp: v.r / v.n }))
      .sort((a, b) => b.exp - a.exp);

    if (!rows.length) {
      $("#by-setup").innerHTML =
        '<p class="muted-note">Nothing closed in this period yet. Setups appear here once a trade has an exit.</p>';
      return;
    }

    const max = Math.max.apply(null, rows.map((r) => Math.abs(r.exp)).concat([0.5]));
    $("#by-setup").innerHTML = rows
      .map((r) => {
        const wide = (Math.abs(r.exp) / max) * 50;
        const left = r.exp >= 0 ? 50 : 50 - wide;
        return `<div class="bs-row">
          <div>
            <div class="lab">${esc(r.k)}<small>${r.n} eligible R trade${r.n > 1 ? "s" : ""}</small></div>
            <div class="track"><i class="${r.exp < 0 ? "neg" : ""}" style="left:${left}%;width:${wide}%"></i></div>
          </div>
          <div class="val ${dir(r.exp)}">${rfmt(r.exp)}</div>
        </div>`;
      })
      .join("");
  }

  /* ------------------------------------------------------------ recent */

  function renderRecent(trades) {
    const rows = trades.slice(0, 8);
    $("#recent-body").innerHTML = rows.length ? rows
      .map((t) => {
        const c = Store.compute(t);
        const d = Store.discipline(t, settings());
        const band = d >= 75 ? "" : d >= 50 ? "mid" : "low";
        return `<tr>
          <td class="t-date"><b>${String(t.date).slice(5, 10)}</b></td>
          <td><div class="t-sym"><span class="side ${t.side === "Short" ? "short" : "long"}">${esc(t.side)}</span><b>${esc(t.symbol)}</b></div></td>
          <td><span class="trade-status ${c.open ? "is-open" : ""}">${c.open ? "Open" : "Closed"}</span></td>
          <td class="num">${esc(t.entry == null ? "—" : t.entry)}</td>
          <td class="num ${c.r === null ? "" : dir(c.r)}">${c.open ? '<span class="t-open">open</span>' : rfmt(c.r)}</td>
          <td class="num ${c.open ? "" : dir(c.netPL)}">${c.open ? "—" : bare(c.netPL, true)}</td>
        </tr>`;
      })
      .join("") : '<tr><td colspan="6" class="muted-note">No trades match this account and period.</td></tr>';
  }

  /* ------------------------------------------------------------ open risk
     The stat cards are all history. This is the only number on the screen
     that is about the next hour: what is currently at risk if every open
     stop is hit, against the daily loss rail. Three positions each risking
     the full rule is a three percent day already in motion. */

  function renderOpenRisk() {
    const box = $("#open-risk");
    const panel = $("#panel-open");
    if (!box || !Store.openRisk) return;

    const o = Store.openRisk(accountTrades(), settings());
    panel.hidden = o.n === 0;
    if (!o.n) return;

    $("#or-note").textContent = o.n + (o.n === 1 ? " position open" : " positions open");

    const cap = o.cap;
    const hot = o.over;
    const bar = null;

    box.innerHTML =
      '<div class="or-head">' +
      '<div class="or-fig' + (hot ? " hot" : "") + '">' +
      "<span>Aggregate open risk</span><b>Unavailable</b>" +
      "<small>" + esc(o.aggregateReason || "No open risk") + (o.unknown ? " · " + o.unknown + " individually unmeasurable" : "") + "</small>" +
      "</div>" +
      (cap && bar !== null
        ? '<div class="or-cap">' +
          '<div class="or-cap-top"><span>Open risk against your daily stop</span><b class="' + (hot ? "hot" : "") + '">' +
          esc(pct(o.riskPct, 2)) + " of " + cap + "%</b></div>" +
          '<div class="or-track"><i class="' + (hot ? "hot" : "") + '" style="width:' + bar.toFixed(1) + '%"></i></div>' +
          "<small>" + (hot
            ? "You are past the daily stop before a single stop has been hit. Closing one of these is the only way back inside the rule."
            : "There is " + pct(Math.max(0, cap - o.riskPct), 2) + " of room left before the day is over by your own rule.") +
          "</small></div>"
        : '<div class="or-cap"><small>Open-risk total and percentage are unavailable because instrument currency units are not recorded.</small></div>') +
      "</div>" +
      '<div class="or-rows">' +
      o.rows
        .map((x) => {
          const t = x.t;
          const c = x.c;
          return '<div class="or-row">' +
            '<span class="or-sym"><span class="side ' + (t.side === "Short" ? "short" : "long") + '">' + esc(t.side) +
            "</span><b>" + esc(t.symbol) + "</b><small>" + esc(t.setup || "no setup") + "</small></span>" +
            '<span class="or-risk">' + (x.openRiskMoney === null ? "risk unavailable" : esc(bare(-Math.abs(x.openRiskMoney), true)) + " calculation units") +
            "<small>" + (x.openRiskPct === null ? "unmeasurable" : pct(x.openRiskPct, 2)) + " · remaining size</small></span>" +
            "</div>";
        })
        .join("") +
      "</div>";
  }

  /* ------------------------------------------------------------ leaks
     Store.leaks() does the diagnosis; this draws it, and the drawing has
     one job the maths cannot do for it: make the difference between a rule
     that was broken and a pattern that might be noise visible at a glance.
     Rules get a hard label and an exact cost. Patterns get their sample
     size printed next to the claim, every time, without exception. */

  function renderLeaks() {
    const box = $("#leaks");
    if (!box || !Store.leaks) return;
    box.innerHTML = '<p class="muted-note">Setup cost summaries are unavailable because compatible trade and risk units are not recorded. R-based setup averages are shown separately.</p>';
  }

  /* ------------------------------------------------------------ greeting */


  /* ------------------------------------------------------------ guardrails
     The other half of discipline: not "how did that trade score" but
     "should there be another one today". Store.guardrails() does the
     thinking; this only draws it, and it draws nothing when nothing is
     broken, because a banner that is always there is wallpaper. */
  function renderRiskDiscipline() {
    const s = settings();
    const g = Store.guardrails(Store.trades.list(), s);
    const o = Store.openRisk(accountTrades(), s);
    const status = {notConfigured: "Not configured", unavailable: "Unavailable", breached: "Limit breached", withinLimit: "Within limit", within: "Within limit", ok: "Within limit"};
    $("#risk-facts").innerHTML = [
      ["Risk per trade", Number.isFinite(Number(s.riskPct)) ? pct(Number(s.riskPct)) + " configured" : "Not configured"],
      ["Daily loss · all accounts", g.muted ? "Guardrails disabled" : status[g.dailyLossStatus] || "Unavailable"],
      ["Current exposure", o.n + (o.n === 1 ? " open position" : " open positions")],
    ].map(([k,v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("") + '<div class="risk-scope">Selected account · all opening dates</div>';
  }

  function renderGuardrails() {
    const box = document.getElementById("guard-warn");
    if (!box || !Store.guardrails) return;

    const g = Store.guardrails(Store.trades.list(), Store.settings.get());
    if (!g.breaches.length && g.assessmentStatus !== "unavailable") {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    box.innerHTML =
      '<span><details' + (g.breaches.length ? ' open' : '') + '><summary>' +
      (g.breaches.length ? (g.breaches.length === 1 ? "A configured limit is breached" : g.breaches.length + " configured limits are breached") : "Guardrail assessment unavailable") +
      "</summary><ul>" +
      g.breaches.map((b) => "<li>" + esc(b.text) + "</li>").join("") +
      g.unavailableReasons.map((x) => "<li>Assessment unavailable: " + esc(x) + "</li>").join("") +
      '</ul><small>Advisory journal assessment; no broker orders are controlled.</small></details></span><a class="btn btn-quiet" href="settings.html#guardrails">Review rules</a>';
    box.hidden = false;
  }

  function renderGreeting() {
    const me = document.body.dataset.preview === "empty" ? null : Shell.profile();
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const total = Store.trades.list().length;

    if (!me) {
      $("#notice").hidden = false;
      $("#greeting").textContent = part;
      $("#sub").textContent = "Plan clearly. Journal your decisions. Review consistently.";
      return;
    }

    $("#notice").hidden = true;
    $("#greeting").textContent = part + (me.name ? ", " + me.name.split(" ")[0] : "");

    if (total) {
      const s = Store.stats(filtered(), settings());
      $("#sub").textContent =
        s.eligibleR >= 1
          ? "You have closed " + s.closed + " trade" + (s.closed > 1 ? "s" : "") +
            " in this period at " + rfmt(s.expectancy) + " a trade. " +
            "Review your setups and risk before the next session."
          : "Review your open trades. Eligible results appear after trades are closed.";
    } else {
      const exp = (me.experience || "").toLowerCase();
      $("#sub").textContent =
        exp.indexOf("new") >= 0 || exp.indexOf("begin") >= 0
          ? "Start with the Academy, then size and log your first trade."
          : exp.indexOf("exp") >= 0 || exp.indexOf("adv") >= 0
          ? "Your journal and risk tools are ready for the next session."
          : "Your preferences are saved. The journal and calculators are ready when you are.";
    }

    const list = me.markets && me.markets.length ? me.markets : [];
    $("#chips").innerHTML =
      list.map((m) => `<span class="chip accent">${esc(m)}</span>`).join("") +
      (me.experience ? `<span class="chip">${esc(me.experience)}</span>` : "");
  }

  /* ------------------------------------------------------------ watchlist */

  function renderWatchlist() {
    const me = document.body.dataset.preview === "empty" ? null : Shell.profile();
    const picked = me && me.markets && me.markets.length ? me.markets.map((m) => String(m).toLowerCase()) : null;
    const rows = picked
      ? Shell.quotes.filter((q) =>
          picked.some(
            (p) =>
              q.cls.toLowerCase().indexOf(p) >= 0 ||
              p.indexOf(q.cls.toLowerCase()) >= 0 ||
              q.symbol.toLowerCase() === p
          )
        )
      : Shell.quotes;
    const show = rows.length ? rows : Shell.quotes;

    $("#wl-source").textContent = picked && rows.length ? "from onboarding" : "defaults";
    $("#watchlist").innerHTML = show.map((q) => `<a class="wl-row" href="charts.html?source=overview&amp;symbol=${encodeURIComponent(q.symbol)}"><span><b>${esc(q.symbol)}</b><small>${esc(q.name)} · ${esc(q.cls)}</small></span><span class="panel-link">Open chart ↗</span></a>`).join("");
    $("#wl-foot").textContent = "Market shortcuts · Prices and available history are shown in Charts.";
  }

  /* ------------------------------------------------------------ render */

  function render() {
    const accounts = Array.from(new Set(Store.trades.list().map((t) => t.account).filter(Boolean)));
    const sel = $("#f-account");
    const want = accounts.join("|");
    if (sel.dataset.k !== want) {
      sel.dataset.k = want;
      sel.innerHTML =
        '<option value="all">All accounts</option>' + accounts.map((a) => `<option>${esc(a)}</option>`).join("");
      sel.value = accounts.indexOf(state.account) >= 0 ? state.account : "all";
      state.account = sel.value;
    }
    const trades = filtered();
    const exposureTrades = accountTrades();

    $("#live-grid").hidden = false;
    const stats = renderStats(trades);
    renderAccountSummary(exposureTrades, stats);
    renderGreeting();
    renderGuardrails();
    renderRiskDiscipline();
    renderWatchlist();

    {
      drawEquity(stats);
      renderBySetup(trades);
      renderOpenRisk();
      renderLeaks();
      renderRecent(trades);
    }


  }

  function init() {
    document.querySelectorAll("[data-dash-icon]").forEach((el) => { el.innerHTML = HomeIcons.ui(el.dataset.dashIcon); });
    $("#dashboard-theme").addEventListener("click", () => Theme.toggle());
    const tabs = $$("[data-performance]");
    function selectTab(tab) {
      tabs.forEach((button) => {
        const active = button === tab;
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
        $("#view-" + button.dataset.performance).hidden = !active;
      });
      if (tab.dataset.performance === "overview") drawEquity(Store.stats(filtered(), settings()));
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => selectTab(tab));
      tab.addEventListener("keydown", (e) => {
        let next;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i + tabs.length - 1) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); selectTab(next); next.focus(); }
      });
    });
    const checks = $$("[data-session-check]");
    const updateChecks = () => { $("#checklist-count").textContent = checks.filter(c => c.checked).length + " / 3"; };
    checks.forEach(c => c.addEventListener("change", updateChecks));
    $("#reset-checklist").addEventListener("click", () => { checks.forEach(c => { c.checked = false; }); updateChecks(); });
    $("#f-range").addEventListener("change", (e) => {
      state.range = e.target.value;
      render();
    });
    $("#f-account").addEventListener("change", (e) => {
      state.account = e.target.value;
      render();
    });

    const cv = $("#equity");
    if (cv) {
      cv.addEventListener("mousemove", eqHover);
      cv.addEventListener("mouseleave", eqLeave);
      /* touch: a tap reads the nearest point and leaves it up */
      cv.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches[0]) eqHover(e.touches[0]);
      }, { passive: true });
      cv.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches[0]) eqHover(e.touches[0]);
      }, { passive: true });
    }

    window.addEventListener("storechange", render);
    window.addEventListener("themechange", () => {
      const s = Store.stats(filtered(), settings());
      drawEquity(s);
    });

    let t = null;
    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!$("#live-grid").hidden) drawEquity(Store.stats(filtered(), settings()));
      }, 140);
    });

    render();
  }

  /* The shell and data layer are loaded before dashboard interactions. */
  if (window.Shell) init();
  else window.addEventListener("load", init);
})();
