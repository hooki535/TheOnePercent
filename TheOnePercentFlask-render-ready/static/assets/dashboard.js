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
      abs.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })
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

  /* ------------------------------------------------------------ metrics */

  function renderStats(trades) {
    const s = Store.stats(trades, settings());
    const streak = Store.streak(Store.trades.list());
    const limit = settings().riskPct;

    /* A win rate on five trades is noise dressed as information, so it
       stays hidden until the sample can carry it. */
    const enoughForWinRate = s.closed >= 10;

    const cards = [
      {
        k: "Net P/L",
        v: money(s.netPL, true),
        n: s.closed ? s.closed + " closed" + (s.open ? ", " + s.open + " open" : "") : "nothing closed yet",
        cls: dir(s.netPL),
      },
      {
        k: "Expectancy",
        v: rfmt(s.expectancy),
        n: s.expectancy === null ? "needs a closed trade" : "per trade, in R",
        cls: dir(s.expectancy),
      },
      {
        k: "Win rate",
        v: enoughForWinRate ? pct(s.winRate, 0) : "—",
        n: enoughForWinRate
          ? "profit factor " + (s.profitFactor === null ? "—" : s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2))
          : s.closed + " of 10 closed trades",
      },
      {
        k: "Discipline",
        v: s.discipline === null ? "—" : s.discipline + "/100",
        n:
          s.avgRiskPct === null
            ? "no sized trades yet"
            : "avg risk " + pct(s.avgRiskPct, 2) + " vs " + limit + "% rule",
        cls: s.discipline === null ? "" : s.discipline >= 75 ? "up" : s.discipline < 50 ? "down" : "",
      },
    ];

    if (streak > 0) {
      cards[3].n = streak + " day streak · " + cards[3].n;
    }

    $("#stats").innerHTML = cards
      .map(
        (c) =>
          `<div class="stat"><div class="k">${esc(c.k)}</div>` +
          `<div class="v ${c.cls || ""}">${esc(c.v)}</div><div class="n">${esc(c.n)}</div></div>`
      )
      .join("");

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

    const pts = stats.curve;
    if (pts.length < 2) {
      eq = null;
      g.fillStyle = css("--faint");
      g.font = "13px " + (css("--sans") || "sans-serif");
      g.textAlign = "center";
      g.fillText("Close a trade and the curve starts here.", w / 2, h / 2);
      return;
    }

    const vals = pts.map((p) => p.equity);
    let lo = Math.min.apply(null, vals);
    let hi = Math.max.apply(null, vals);
    const padv = (hi - lo || Math.abs(hi) * 0.02 || 1) * 0.14;
    lo -= padv;
    hi += padv;

    const padL = 8, padR = 8, padT = 12, padB = 20;
    const x = (i) => padL + (i / (pts.length - 1)) * (w - padL - padR);
    const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);

    /* the starting balance, so gains and losses are read against it */
    const start = pts[0].equity;
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
    pts.forEach((p, i) => g.lineTo(x(i), y(p.equity)));
    g.lineTo(x(pts.length - 1), y(start));
    g.lineTo(x(0), y(start));
    g.closePath();
    g.fillStyle = grad;
    g.fill();

    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(x(i), y(p.equity)) : g.moveTo(x(i), y(p.equity))));
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

    $("#eq-note").textContent = money(ending);
    $("#eq-dd").innerHTML =
      stats.maxDrawdownPct > 0.01
        ? `<span><i class="dot down"></i> max drawdown ${pct(stats.maxDrawdownPct, 1)}</span>`
        : "";
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
    const py = eq.y(p.equity);

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

    const chg = prev ? p.equity - prev.equity : 0;
    tip.innerHTML =
      "<b>" + esc(money(p.equity)) + "</b>" +
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
      if (c.open || c.r === null) return;
      const k = t.setup || "Untagged";
      const cur = map.get(k) || { n: 0, r: 0, pl: 0 };
      cur.n += 1;
      cur.r += c.r;
      cur.pl += c.netPL;
      map.set(k, cur);
    });

    const rows = Array.from(map.entries())
      .map(([k, v]) => ({ k, n: v.n, exp: v.r / v.n, pl: v.pl }))
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
            <div class="lab">${esc(r.k)}<small>${r.n} trade${r.n > 1 ? "s" : ""} · ${bare(r.pl, true)}</small></div>
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
    $("#recent-body").innerHTML = rows
      .map((t) => {
        const c = Store.compute(t);
        const d = Store.discipline(t, settings());
        const band = d >= 75 ? "" : d >= 50 ? "mid" : "low";
        return `<tr>
          <td class="t-date"><b>${String(t.date).slice(5, 10)}</b></td>
          <td><div class="t-sym"><span class="side ${t.side === "Short" ? "short" : "long"}">${esc(t.side)}</span><b>${esc(t.symbol)}</b></div></td>
          <td>${esc(t.setup || "—")}</td>
          <td class="num ${c.r === null ? "" : dir(c.r)}">${c.open ? '<span class="t-open">open</span>' : rfmt(c.r)}</td>
          <td class="num ${c.open ? "" : dir(c.netPL)}">${c.open ? "—" : bare(c.netPL, true)}</td>
          <td class="num"><span class="disc"><span>${d}</span><span class="disc-bar ${band}"><i style="width:${d}%"></i></span></span></td>
        </tr>`;
      })
      .join("");
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

    const o = Store.openRisk(filtered(), settings());
    panel.hidden = o.n === 0;
    if (!o.n) return;

    $("#or-note").textContent = o.n + (o.n === 1 ? " position open" : " positions open");

    const cap = o.cap;
    const hot = o.over;
    const bar = cap ? Math.min(100, (o.riskPct / cap) * 100) : null;

    box.innerHTML =
      '<div class="or-head">' +
      '<div class="or-fig' + (hot ? " hot" : "") + '">' +
      "<span>At risk if every stop is hit</span><b>" + esc(money(-o.riskMoney)) + "</b>" +
      "<small>" + esc(pct(o.riskPct, 2)) + " of the balance" +
      (o.unknown ? " · " + o.unknown + " with no stop, not counted" : "") + "</small>" +
      "</div>" +
      (cap
        ? '<div class="or-cap">' +
          '<div class="or-cap-top"><span>Open risk against your daily stop</span><b class="' + (hot ? "hot" : "") + '">' +
          esc(pct(o.riskPct, 2)) + " of " + cap + "%</b></div>" +
          '<div class="or-track"><i class="' + (hot ? "hot" : "") + '" style="width:' + bar.toFixed(1) + '%"></i></div>' +
          "<small>" + (hot
            ? "You are past the daily stop before a single stop has been hit. Closing one of these is the only way back inside the rule."
            : "There is " + pct(Math.max(0, cap - o.riskPct), 2) + " of room left before the day is over by your own rule.") +
          "</small></div>"
        : '<div class="or-cap"><small>No daily loss stop is set, so there is nothing to measure this against. ' +
          'Settings has one, and it is the rail that makes this number mean something.</small></div>') +
      "</div>" +
      '<div class="or-rows">' +
      o.rows
        .map((x) => {
          const t = x.t;
          const c = x.c;
          return '<div class="or-row">' +
            '<span class="or-sym"><span class="side ' + (t.side === "Short" ? "short" : "long") + '">' + esc(t.side) +
            "</span><b>" + esc(t.symbol) + "</b><small>" + esc(t.setup || "no setup") + "</small></span>" +
            '<span class="or-risk">' + (c.riskMoney === null ? "no stop" : esc(bare(-Math.abs(c.riskMoney), true))) +
            "<small>" + (c.riskPct === null ? "unmeasurable" : pct(c.riskPct, 2)) + "</small></span>" +
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

    const L = Store.leaks(filtered(), settings());

    if (!L.closed) {
      $("#lk-note").textContent = "";
      box.innerHTML =
        '<p class="muted-note">Nothing closed in this period, so there is nothing to diagnose. ' +
        "This panel reads your own journal — it has no opinions of its own until you give it some.</p>";
      return;
    }

    $("#lk-note").textContent = L.closed + " closed trades in view";

    /* the small-sample state is a first-class state, not an error */
    if (!L.enough && !L.findings.length) {
      box.innerHTML =
        '<p class="muted-note">' + L.closed + " closed trade" + (L.closed === 1 ? "" : "s") +
        " is not enough to tell a leak from a run of bad luck. This panel starts naming patterns at 6, " +
        "and it will flag a broken rule — an oversized trade, a stop that moved — from the first one.</p>";
      return;
    }

    const cost = (f) =>
      f.costR === 0
        ? '<span class="lk-cost none">not measurable</span>'
        : '<span class="lk-cost">' + esc(money(f.costMoney)) + "<small>" + esc(rfmt(f.costR)) + "</small></span>";

    const cards = L.findings
      .slice(0, 5)
      .map(
        (f) =>
          '<div class="lk ' + f.basis + '">' +
          '<div class="lk-top"><span class="lk-tag">' + (f.basis === "rule" ? "Rule broken" : "Pattern · " + f.n + " trades") +
          "</span>" + cost(f) + "</div>" +
          "<b>" + esc(f.title) + "</b><p>" + esc(f.text) + "</p>" +
          "</div>"
      )
      .join("");

    const wins = L.wins.length
      ? '<div class="lk-wins"><h3>And what is working</h3>' +
        L.wins.map((w) => "<div class=\"lk-win\"><b>" + esc(w.title) + "</b><p>" + esc(w.text) + "</p></div>").join("") +
        "</div>"
      : "";

    const conc = L.concentration
      ? '<p class="lk-conc">' + esc(L.concentration.text) +
        (L.concentration.gap > 0
          ? " A period carried by a handful of trades is not a proven edge yet, in either direction."
          : "") +
        "</p>"
      : "";

    box.innerHTML =
      (cards
        ? '<div class="lk-grid">' + cards + "</div>"
        : '<p class="muted-note">No broken rules and no losing pattern big enough to name, across ' +
          L.closed + " closed trades. That is the result this panel is built to be able to say.</p>") +
      conc +
      wins +
      '<p class="lk-fine">Costs are measured against the rest of your journal, not against zero, and one R is priced at ' +
      esc(money(L.rValue)) + " — your own average risk per trade.</p>";
  }

  /* ------------------------------------------------------------ greeting */


  /* ------------------------------------------------------------ guardrails
     The other half of discipline: not "how did that trade score" but
     "should there be another one today". Store.guardrails() does the
     thinking; this only draws it, and it draws nothing when nothing is
     broken, because a banner that is always there is wallpaper. */
  function renderGuardrails() {
    const box = document.getElementById("guard-warn");
    if (!box || !Store.guardrails) return;

    const g = Store.guardrails(Store.trades.list(), Store.settings.get());
    if (!g.blocked) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    box.innerHTML =
      "<span><b>" +
      (g.breaches.length === 1 ? "You have hit one of your own limits" : "You have hit " + g.breaches.length + " of your own limits") +
      "</b><ul>" +
      g.breaches.map((b) => "<li>" + esc(b.text) + "</li>").join("") +
      '</ul></span><a class="btn btn-quiet" href="/settings#guardrails">Adjust the rules</a>';
    box.hidden = false;
  }

  function renderGreeting() {
    const me = Shell.profile();
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const total = Store.trades.list().length;

    if (!me) {
      $("#notice").hidden = false;
      $("#greeting").textContent = part;
      $("#sub").textContent =
        "You are signed in as a guest with no preferences saved. Pick your markets and experience level and this page starts adapting to you.";
      return;
    }

    $("#notice").hidden = true;
    $("#greeting").textContent = part + (me.name ? ", " + me.name.split(" ")[0] : "");

    if (total) {
      const s = Store.stats(filtered(), settings());
      $("#sub").textContent =
        s.closed >= 1
          ? "You have closed " + s.closed + " trade" + (s.closed > 1 ? "s" : "") +
            " in this period at " + rfmt(s.expectancy) + " a trade. " +
            (s.expectancy > 0
              ? "Keep the size where it is."
              : "The size is the first thing to check, not the strategy.")
          : "Trades are logged but none are closed yet, so there is nothing to measure.";
    } else {
      const exp = (me.experience || "").toLowerCase();
      $("#sub").textContent =
        exp.indexOf("new") >= 0 || exp.indexOf("begin") >= 0
          ? "You told us you are new to trading, so the Learn path is unlocked first and position sizes stay capped at one percent until ten trades are logged."
          : exp.indexOf("exp") >= 0 || exp.indexOf("adv") >= 0
          ? "You told us you are experienced, so the journal opens with the full field set and the risk cap is yours to set."
          : "Your preferences are saved. The journal and calculators are ready when you are.";
    }

    const list = me.markets && me.markets.length ? me.markets : [];
    $("#chips").innerHTML =
      list.map((m) => `<span class="chip accent">${esc(m)}</span>`).join("") +
      (me.experience ? `<span class="chip">${esc(me.experience)}</span>` : "");
  }

  /* ------------------------------------------------------------ watchlist */

  function renderWatchlist() {
    const me = Shell.profile();
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
    $("#watchlist").innerHTML = show
      .map((q) => {
        const up = q.chg >= 0;
        return `<div class="wl-row">
          <span><b>${esc(q.symbol)}</b><small>${esc(q.name)} · ${esc(q.cls)}</small></span>
          <span class="wl-price">${q.price.toLocaleString("en-US", {
            minimumFractionDigits: q.dec,
            maximumFractionDigits: q.dec,
          })}
          <small class="chg ${up ? "up" : "down"}">${(up ? "+" : "−") + Math.abs(q.chg).toFixed(2)}%</small></span>
        </div>`;
      })
      .join("");

    if (!picked) {
      $("#wl-foot").textContent = "Showing the default five until you pick your markets in onboarding.";
    }
  }

  /* ------------------------------------------------------------ render */

  function render() {
    const trades = filtered();
    const hasAny = Store.trades.list().length > 0;

    $("#live-grid").hidden = !hasAny;
    /* the guided block keeps its place until the journal is genuinely
       started — an empty period is not an empty journal */
    $("#empty-grid").classList.toggle("started", hasAny);
    $$("#empty-grid .panel").forEach((p) => {
      if (p.querySelector("#watchlist")) return;
      p.hidden = hasAny;
    });

    const stats = renderStats(trades);
    renderGreeting();
    renderGuardrails();
    renderWatchlist();

    if (hasAny) {
      drawEquity(stats);
      renderBySetup(trades);
      renderOpenRisk();
      renderLeaks();
      renderRecent(trades);
    }

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
  }

  function init() {
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

  /* shell.js loads after this file, so wait for it before reading the profile */
  if (window.Shell) init();
  else window.addEventListener("load", init);
})();
