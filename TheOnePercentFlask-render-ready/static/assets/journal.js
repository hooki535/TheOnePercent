/* Journal (pages/journal.html)
   -------------------------------------------------------------------
   Reads and writes only through window.Store. No arithmetic lives here
   — risk, R, P&L and the discipline score all come from Store.compute
   so that this screen, the dashboard and the leaderboard can never
   report three different numbers for the same trade.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const V = Store.vocab;

  const state = {
    q: "",
    result: "all",
    market: "all",
    emotion: "all",
    range: "all",
    account: "all",
    sort: "date",
    asc: false,
    tab: "trades",
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  };

  /* ------------------------------------------------------------ format */

  const settings = () => Store.settings.get();

  function money(n, signed) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "—";
    const s = settings();
    const abs = Math.abs(n);
    const dp = abs >= 1000 || s.currency === "UGX" ? 0 : 2;
    const body = abs.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
    const sign = n < 0 ? "−" : signed && n > 0 ? "+" : "";
    return sign + body + " " + (s.currency || "");
  }

  /* Table cells carry the number only — the currency lives in the column
     header, the way every trading platform does it. Repeating "UGX" on
     every row wraps the cell on a phone and reads as noise. */
  function bare(n, signed) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "—";
    const s = settings();
    const abs = Math.abs(n);
    const dp = abs >= 1000 || s.currency === "UGX" ? 0 : 2;
    const body = abs.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
    return (n < 0 ? "−" : signed && n > 0 ? "+" : "") + body;
  }

  function rfmt(n) {
    if (n === null || !Number.isFinite(n)) return "—";
    return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(2) + "R";
  }

  function pct(n, dp) {
    return n === null || !Number.isFinite(n) ? "—" : n.toFixed(dp === undefined ? 2 : dp) + "%";
  }

  function dir(n) {
    return n > 0 ? "up" : n < 0 ? "down" : "";
  }

  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function dayKey(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.hidden = true), 2600);
  }

  /* ------------------------------------------------------------ filtering */

  function rowsFor() {
    const all = Store.trades.list();
    const cut =
      state.range === "all" ? null : Date.now() - parseInt(state.range, 10) * 864e5;
    const q = state.q.trim().toLowerCase();

    return all
      .filter((t) => {
        if (cut && new Date(t.date).getTime() < cut) return false;
        if (state.account !== "all" && (t.account || "") !== state.account) return false;
        if (state.market !== "all" && t.market !== state.market) return false;
        if (state.emotion !== "all" && t.emotion !== state.emotion) return false;
        if (state.result !== "all") {
          const r = Store.compute(t).result;
          if (state.result === "open" && r !== "Open") return false;
          if (state.result === "win" && r !== "Win") return false;
          if (state.result === "loss" && r !== "Loss") return false;
        }
        if (q) {
          const hay = [t.symbol, t.setup, t.session, t.review, (t.tags || []).join(" ")]
            .join(" ")
            .toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      })
      .map((t) => ({ t, c: Store.compute(t), d: Store.discipline(t, settings()) }));
  }

  function sortRows(rows) {
    const key = state.sort;
    const dirn = state.asc ? 1 : -1;
    return rows.slice().sort((a, b) => {
      let x, y;
      if (key === "date") {
        x = String(a.t.date || "");
        y = String(b.t.date || "");
        return x < y ? -dirn : x > y ? dirn : 0;
      }
      if (key === "discipline") {
        x = a.d;
        y = b.d;
      } else {
        x = a.c[key];
        y = b.c[key];
      }
      /* trades with no value sink to the bottom whichever way you sort */
      const nx = x === null || !Number.isFinite(x);
      const ny = y === null || !Number.isFinite(y);
      if (nx && ny) return 0;
      if (nx) return 1;
      if (ny) return -1;
      return (x - y) * dirn;
    });
  }

  /* ------------------------------------------------------------ summary */

  function renderSummary(rows) {
    const s = Store.stats(rows.map((r) => r.t), settings());
    const cards = [
      { k: "Trades", v: String(s.count), n: s.open ? s.open + " still open" : "all closed" },
      {
        k: "Net P/L",
        v: money(s.netPL, true),
        n: s.closed ? "across " + s.closed + " closed" : "nothing closed yet",
        cls: dir(s.netPL),
      },
      {
        k: "Expectancy",
        v: s.expectancy === null ? "—" : rfmt(s.expectancy),
        n: s.expectancy === null ? "needs a closed trade" : "average per trade",
        cls: s.expectancy === null ? "" : dir(s.expectancy),
      },
      {
        k: "Discipline",
        v: s.discipline === null ? "—" : s.discipline + "/100",
        n: s.avgRiskPct === null ? "risk not sized" : "avg risk " + pct(s.avgRiskPct, 2),
      },
    ];
    $("#summary").innerHTML = cards
      .map(
        (c) =>
          `<div class="stat"><div class="k">${esc(c.k)}</div>` +
          `<div class="v ${c.cls || ""}">${esc(c.v)}</div>` +
          `<div class="n">${esc(c.n)}</div></div>`
      )
      .join("");
  }

  /* ------------------------------------------------------------ table */

  function renderTable(rows) {
    const body = $("#trades-body");
    const empty = $("#empty");
    const total = Store.trades.list().length;

    if (!rows.length) {
      body.innerHTML = "";
      $(".table-scroll").hidden = true;
      empty.hidden = false;
      empty.innerHTML = total
        ? `<h3>No trades match those filters</h3>
           <p>Widen the period or clear the filters to see the rest of the log.</p>
           <div class="row"><button class="btn btn-quiet" id="empty-clear">Clear filters</button></div>`
        : `<h3>The log is empty</h3>
           <p>Every widget on your dashboard is built from this table, so the first trade you log is what switches the rest of the product on.</p>
           <div class="row">
             <button class="btn btn-primary" id="empty-new">Log your first trade</button>
             <button class="btn btn-quiet" id="empty-sample">Load 20 sample trades</button>
           </div>`;
      const c = $("#empty-clear");
      if (c) c.onclick = clearFilters;
      const n = $("#empty-new");
      if (n) n.onclick = () => openForm(null);
      const sm = $("#empty-sample");
      if (sm) sm.onclick = loadSample;
      return;
    }

    $(".table-scroll").hidden = false;
    empty.hidden = true;

    body.innerHTML = rows
      .map(({ t, c, d }) => {
        const dt = new Date(t.date);
        const band = d >= 75 ? "" : d >= 50 ? "mid" : "low";
        const thumb = t.shot
          ? `<img class="thumb" src="${esc(t.shot)}" alt="Chart for ${esc(t.symbol)}">`
          : "";
        return `<tr tabindex="0" data-id="${esc(t.id)}">
          <td class="t-date"><b>${dayKey(dt).slice(5)}</b><small>${dt.getFullYear()} · ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}</small></td>
          <td><div class="t-sym"><span class="side ${t.side === "Short" ? "short" : "long"}">${esc(t.side || "Long")}</span>
              <span><b>${esc(t.symbol)}</b><small>${esc(t.market || "")}</small></span></div></td>
          <td>${esc(t.setup || "—")}${t.session ? `<br><small style="color:var(--faint)">${esc(t.session)}</small>` : ""}</td>
          <td class="num">${pct(c.riskPct, 2)}</td>
          <td class="num ${c.r === null ? "" : dir(c.r)}">${c.open ? '<span class="t-open">open</span>' : rfmt(c.r)}</td>
          <td class="num ${c.open ? "" : dir(c.netPL)}">${c.open ? "—" : bare(c.netPL, true)}</td>
          <td>${t.emotion ? `<span class="tag">${esc(t.emotion)}</span>` : "—"}</td>
          <td class="num"><span class="disc"><span>${d}</span><span class="disc-bar ${band}"><i style="width:${d}%"></i></span></span></td>
          <td>${thumb}</td>
        </tr>`;
      })
      .join("");

    $$("#trades-body tr").forEach((tr) => {
      tr.onclick = () => openDetail(tr.dataset.id);
      tr.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail(tr.dataset.id);
        }
      };
    });
  }

  /* ------------------------------------------------------------ calendar */

  function renderCalendar(rows) {
    const m = state.month;
    $("#cal-title").textContent = MONTHS[m.getMonth()] + " " + m.getFullYear();

    const byDay = new Map();
    rows.forEach(({ t, c }) => {
      if (c.open) return;
      const k = String(t.date).slice(0, 10);
      const cur = byDay.get(k) || { pl: 0, n: 0 };
      cur.pl += c.netPL;
      cur.n += 1;
      byDay.set(k, cur);
    });

    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    /* Monday-first, matching the way trading weeks are talked about */
    const lead = (first.getDay() + 6) % 7;
    const today = dayKey(new Date());

    let html = DOW.map((d) => `<div class="dow">${d}</div>`).join("");
    for (let i = 0; i < lead; i++) html += '<div class="day pad"></div>';
    for (let d = 1; d <= days; d++) {
      const key = dayKey(new Date(m.getFullYear(), m.getMonth(), d));
      const hit = byDay.get(key);
      const cls = hit ? (hit.pl > 0 ? "up" : hit.pl < 0 ? "down" : "") : "";
      html += `<div class="day ${cls} ${key === today ? "today" : ""}">
        <div class="d">${d}</div>
        ${hit ? `<div class="pl">${bare(hit.pl, true)}</div><div class="ct">${hit.n} trade${hit.n > 1 ? "s" : ""}</div>` : ""}
      </div>`;
    }
    $("#cal").innerHTML = html;
  }

  /* ------------------------------------------------------------ insights */

  function groupBy(rows, field) {
    const map = new Map();
    rows.forEach((row) => {
      if (row.c.open || row.c.r === null) return;
      const k = row.t[field] || "Untagged";
      const cur = map.get(k) || { n: 0, r: 0, wins: 0, pl: 0 };
      cur.n += 1;
      cur.r += row.c.r;
      cur.pl += row.c.netPL;
      if (row.c.netPL > 0) cur.wins += 1;
      map.set(k, cur);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ label: k, n: v.n, exp: v.r / v.n, pl: v.pl, wr: (v.wins / v.n) * 100 }))
      .sort((a, b) => a.exp - b.exp);
  }

  function insightBlock(title, list, note) {
    if (!list.length) {
      return `<div class="ins"><h3>${esc(title)}</h3><p class="hint">Nothing closed yet in this group.</p></div>`;
    }
    const max = Math.max(...list.map((g) => Math.abs(g.exp)), 0.5);
    const rows = list
      .map((g) => {
        const w = (Math.abs(g.exp) / max) * 50;
        const left = g.exp >= 0 ? 50 : 50 - w;
        return `<div class="ins-row">
          <div>
            <div class="lab">${esc(g.label)}<small>${g.n} trade${g.n > 1 ? "s" : ""} · ${g.wr.toFixed(0)}% won · ${money(g.pl, true)}</small></div>
            <div class="track"><i class="${g.exp < 0 ? "neg" : ""}" style="left:${left}%;width:${w}%"></i></div>
          </div>
          <div class="val ${dir(g.exp)}">${rfmt(g.exp)}</div>
        </div>`;
      })
      .join("");
    return `<div class="ins"><h3>${esc(title)}</h3>${rows}${note ? `<p class="hint">${esc(note)}</p>` : ""}</div>`;
  }

  function renderInsights(rows) {
    $("#insights").innerHTML =
      insightBlock("By setup", groupBy(rows, "setup"), "The worst row is the one to stop trading first.") +
      insightBlock("By emotion", groupBy(rows, "emotion"), "If one feeling keeps costing you R, that is a rule, not a mood.") +
      insightBlock("By session", groupBy(rows, "session")) +
      insightBlock("By market", groupBy(rows, "market"));
  }

  /* ------------------------------------------------------------ detail */

  function openDetail(id) {
    const t = Store.trades.find(id);
    if (!t) return;
    const c = Store.compute(t);
    const d = Store.discipline(t, settings());
    const dt = new Date(t.date);

    $("#dr-title").textContent = t.symbol + " · " + dayKey(dt);
    $("#dr-body").innerHTML = `
      <div class="dr-hero">
        <span class="side ${t.side === "Short" ? "short" : "long"}">${esc(t.side)}</span>
        <b>${esc(t.symbol)}</b>
        <span class="tag">${esc(t.market || "—")}</span>
        <span class="dr-r ${c.open ? "" : dir(c.r)}">${c.open ? "Open" : rfmt(c.r)}</span>
      </div>
      ${t.shot ? `<img class="dr-shot" src="${esc(t.shot)}" alt="Chart screenshot for ${esc(t.symbol)}">` : ""}
      <dl class="kv">
        <div><dt>Entry</dt><dd>${esc(t.entry)}</dd></div>
        <div><dt>Stop</dt><dd>${esc(t.stop)}</dd></div>
        <div><dt>Target</dt><dd>${t.target ? esc(t.target) : "—"}</dd></div>
        <div><dt>Avg exit</dt><dd>${c.avgExit === null ? "—" : c.avgExit.toFixed(5).replace(/0+$/, "")}</dd></div>
        <div><dt>Size</dt><dd>${esc(t.size)}</dd></div>
        <div><dt>Risk</dt><dd>${money(c.riskMoney)}${c.riskPct === null ? "" : " · " + pct(c.riskPct, 2)}</dd></div>
        <div><dt>Planned R:R</dt><dd>${c.plannedRR === null ? "—" : c.plannedRR.toFixed(2)}</dd></div>
        <div><dt>Fees</dt><dd>${money(c.fees)}</dd></div>
        <div><dt>Gross P/L</dt><dd class="${c.open ? "" : dir(c.grossPL)}">${c.open ? "—" : money(c.grossPL, true)}</dd></div>
        <div><dt>Net P/L</dt><dd class="${c.open ? "" : dir(c.netPL)}">${c.open ? "—" : money(c.netPL, true)}</dd></div>
      </dl>

      <div class="dr-sec">
        <h3>Discipline ${d}/100</h3>
        <span class="disc-bar ${d >= 75 ? "" : d >= 50 ? "mid" : "low"}" style="width:100%;display:block"><i style="width:${d}%"></i></span>
        <p style="margin-top:8px;font-size:13px">${esc(disciplineNote(t, c, d))}</p>
      </div>

      ${
        (t.exits || []).length
          ? `<div class="dr-sec"><h3>Exits</h3><ul class="exit-list">${t.exits
              .map((e) => `<li><span>${esc(e.size)} @ ${esc(e.price)}</span><span>${esc(e.note || "")}</span></li>`)
              .join("")}</ul></div>`
          : `<div class="dr-sec"><h3>Exits</h3><p>Still open — no exit legs recorded.</p></div>`
      }

      ${
        t.plan
          ? `<div class="dr-sec"><h3>The plan</h3><p>${esc(t.plan)}</p></div>`
          : `<div class="dr-sec"><h3>The plan</h3><p class="muted-note">No reason was written before this one.</p></div>`
      }
      ${
        (t.unmet || []).length
          ? `<div class="dr-sec off-plan"><h3>Taken off plan</h3><p>${esc(
              (t.unmet || []).map((k) => HUMAN_LABEL[k] || (CHECK_LABEL[k] || k).toLowerCase()).join(", ")
            )} — unmet when this was logged.</p></div>`
          : ""
      }
      ${t.review ? `<div class="dr-sec"><h3>Review</h3><p>${esc(t.review)}</p></div>` : ""}
      ${
        (t.tags || []).length
          ? `<div class="dr-sec"><h3>Tags</h3><div class="tag-row">${t.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div></div>`
          : ""
      }
      <div class="dr-sec"><h3>Account</h3><p>${esc(t.account || "—")}${t.emotion ? " · felt " + esc(t.emotion.toLowerCase()) : ""}</p></div>

      <div class="dr-foot">
        <button class="btn btn-primary" id="dr-edit">Edit trade</button>
        <button class="btn btn-quiet danger" id="dr-del">Delete</button>
      </div>`;

    $("#dr-edit").onclick = () => {
      close($("#drawer"));
      openForm(t.id);
    };
    $("#dr-del").onclick = () => {
      if (!confirm("Delete this trade? It will not be recoverable.")) return;
      Store.trades.remove(t.id);
      close($("#drawer"));
      toast("Trade deleted");
    };

    open($("#drawer"));
  }

  /* Plain-language reason, so the score teaches instead of grading. */
  function disciplineNote(t, c, d) {
    const limit = settings().riskPct;
    const bits = [];
    if (c.riskPct === null) bits.push("no risk could be computed, so size was unverifiable");
    else if (c.riskPct > limit * 1.5) bits.push("you risked " + pct(c.riskPct, 2) + " against a " + limit + "% rule");
    else if (c.riskPct > limit) bits.push("slightly over your " + limit + "% rule at " + pct(c.riskPct, 2));
    else bits.push("size respected your " + limit + "% rule");
    if (t.stopHonoured === false) bits.push("the stop was moved or ignored");
    if (c.plannedRR !== null && c.plannedRR < 1) bits.push("the target paid less than the risk");
    if (!t.review) bits.push("no review was written");
    const body = bits.join("; ");
    return (
      (d >= 75 ? "Clean execution. " : d >= 50 ? "Mostly followed. " : "Off-plan. ") +
      body.charAt(0).toUpperCase() + body.slice(1) + "."
    );
  }

  /* ------------------------------------------------------------ form */

  function exitRow(e) {
    e = e || {};
    const div = document.createElement("div");
    div.className = "exit-row";
    div.innerHTML = `
      <label class="fld"><span>Exit price</span><input class="ex-price" type="number" step="any" inputmode="decimal" value="${e.price === undefined ? "" : esc(e.price)}"></label>
      <label class="fld"><span>Size closed</span><input class="ex-size" type="number" step="any" inputmode="decimal" value="${e.size === undefined ? "" : esc(e.size)}"></label>
      <button type="button" class="icon-btn" aria-label="Remove exit">✕</button>`;
    $("button", div).onclick = () => {
      div.remove();
      liveCalc();
    };
    $$("input", div).forEach((i) => i.addEventListener("input", liveCalc));
    return div;
  }

  function fillSelect(sel, list, placeholder) {
    /* A select that defaults to the first setup in the list is a select that
       records "Breakout" for every trade a hurried trader ever logs. With a
       placeholder, "not chosen" becomes a state the checklist can see. */
    sel.innerHTML =
      (placeholder ? `<option value="">${esc(placeholder)}</option>` : "") +
      list.map((o) => `<option>${esc(o)}</option>`).join("");
  }

  let shotData = null;

  /* Set when the charts screen hands over a trade. The screenshot proves
     what the chart looked like; this records what it *was* — symbol,
     interval, chart type, studies, the visible range — so the setup is
     searchable, and so a future version can reopen it rather than asking
     the user to read it back off a picture. Cleared with the form. */
  let pendingChartState = null;

  function readForm() {
    const f = $("#trade-form");
    const fd = new FormData(f);
    const exits = $$(".exit-row").map((row) => ({
      price: parseFloat($(".ex-price", row).value),
      size: parseFloat($(".ex-size", row).value),
    })).filter((e) => Number.isFinite(e.price) && Number.isFinite(e.size));

    /* the balance is captured with the trade so that a later deposit
       cannot rewrite what a past trade risked as a percentage */
    const existing = fd.get("tradeId") ? Store.trades.find(fd.get("tradeId")) : null;

    return {
      id: fd.get("tradeId") || undefined,
      balanceAtOpen: (existing && existing.balanceAtOpen) || settings().balance,
      date: fd.get("date"),
      symbol: String(fd.get("symbol") || "").trim().toUpperCase(),
      market: fd.get("market"),
      side: fd.get("side"),
      setup: fd.get("setup"),
      session: fd.get("session"),
      entry: parseFloat(fd.get("entry")),
      stop: parseFloat(fd.get("stop")),
      target: fd.get("target") === "" ? null : parseFloat(fd.get("target")),
      size: parseFloat(fd.get("size")),
      contractValue: parseFloat(fd.get("contractValue")) || 1,
      fees: parseFloat(fd.get("fees")) || 0,
      emotion: fd.get("emotion"),
      tags: String(fd.get("tags") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      stopHonoured: fd.get("stopHonoured") === "on",
      review: String(fd.get("review") || "").trim(),
      /* the pre-trade record: the reason, and the two things the app cannot
         verify for itself. Kept on the trade so the journal can later show
         what planned trades did against unplanned ones. */
      plan: String(fd.get("plan") || "").trim(),
      checks: {
        stopInvalidates: fd.get("chkStop") === "on",
        notRevenge: fd.get("chkNotRevenge") === "on",
      },
      exits,
      shot: shotData,
      chartState: pendingChartState || (existing && existing.chartState) || null,
    };
  }

  /* ------------------------------------------------------------ the gate
     Every leak the dashboard can name — oversized, stop moved, revenge
     entry, one trade too many — was a decision made in the minute before
     the entry. The dashboard reports them once the money is gone. This runs
     while it can still matter, and it is the only screen in the app that can.

     Two rules shaped it.

     First: never ask a human what the machine already knows. Risk percentage,
     R:R against the minimum, whether the stop is on the losing side, whether
     a guardrail is already breached — the app has all of that and asking
     would just train the user to tick without reading. So the checks split
     into what the app verifies and the two things only the trader can answer.

     Second: it does not block saving. A checklist that refuses gets lied to,
     and this app cannot stop an order at the broker anyway. What it can do is
     make overriding cost a sentence: the button changes, the confirm names
     what is unmet, and the trade is saved carrying that list — so a month
     later the journal can price what ignoring it was worth.
  */

  function guardState() {
    if (!Store.guardrails) return null;
    return Store.guardrails(Store.trades.list(), settings(), new Date());
  }

  /* Checks the app can make for itself. Each returns
     {ok, kind, text} — text is written for the failing case, since that is
     the one anybody reads. */
  function autoChecks(t, c) {
    const s = settings();
    const out = [];
    const ok = (kind, good, text) => out.push({ kind, ok: good, text });

    ok("stop", Number.isFinite(t.stop), "No stop, so there is no risk, no R and nothing to compare this trade to later.");

    /* only worth asking once there is a stop — otherwise it ticks green for
       a trade that has no stop at all, which is the opposite of the truth */
    if (Number.isFinite(t.stop) && Number.isFinite(t.entry)) {
      const wrongSide =
        (t.side === "Long" && t.stop > t.entry) || (t.side === "Short" && t.stop < t.entry);
      ok("stopSide", !wrongSide, "Your stop is on the profitable side of the entry for a " + String(t.side || "long").toLowerCase() + ".");
    }

    const cap = s.riskPct;
    ok(
      "risk",
      c.riskPct !== null && c.riskPct <= cap + 0.001,
      c.riskPct === null
        ? "Risk cannot be worked out yet — fill in the stop and the size."
        : "This risks " + pct(c.riskPct, 2) + " against your " + cap + "% rule. Size is the one thing you control completely before the market touches it."
    );

    ok(
      "rr",
      c.plannedRR !== null && c.plannedRR >= s.minRR,
      c.plannedRR === null
        ? "No target, so the reward is unknown and the trade cannot be judged against your " + s.minRR + ":1 minimum."
        : "Planned " + c.plannedRR.toFixed(2) + ":1 is below the " + s.minRR + ":1 you set for yourself."
    );

    ok("setup", !!t.setup, "No setup chosen. An unnamed setup cannot be reviewed, repeated or dropped.");
    ok("session", !!t.session, "No session chosen — and session is one of the strongest patterns in most journals.");

    const g = guardState();
    if (g && !g.muted && g.breaches.length) {
      out.push({
        kind: "guardrails",
        ok: false,
        text: g.breaches.map((b) => b.text).join(" "),
      });
    } else {
      out.push({ kind: "guardrails", ok: true, text: "A guardrail is already breached today." });
    }

    return out;
  }

  const CHECK_LABEL = {
    stop: "A stop is set",
    stopSide: "The stop is on the losing side",
    risk: "Inside your risk rule",
    rr: "Meets your minimum R:R",
    setup: "The setup is named",
    session: "The session is named",
    guardrails: "No guardrail breached today",
  };

  const HUMAN_LABEL = {
    plan: "a written reason",
    stopInvalidates: "the stop is where the idea is wrong",
    notRevenge: "this is not about the last trade",
  };

  /* what is unmet, as kinds — used by the verdict, the confirm and the
     record saved on the trade */
  function unmetFor(t, c) {
    const out = autoChecks(t, c).filter((x) => !x.ok).map((x) => x.kind);
    if (!t.plan) out.push("plan");
    if (!t.checks.stopInvalidates) out.push("stopInvalidates");
    if (!t.checks.notRevenge) out.push("notRevenge");
    return out;
  }

  function renderChecklist(t, c) {
    const box = $("#pre-trade");
    if (!box || box.hidden) return;

    /* on an existing trade there is no gate, so the button must not carry the
       override wording from whatever was last open in the drawer */
    if ($("#pt-auto").hidden) {
      const btnE = $("#trade-form").querySelector("button[type='submit']");
      if (btnE) btnE.textContent = "Save trade";
      return;
    }

    const checks = autoChecks(t, c);
    $("#pt-checks").innerHTML = checks
      .map(
        (x) =>
          '<li class="' + (x.ok ? "ok" : "no") + '">' +
          '<span class="pt-mark" aria-hidden="true">' + (x.ok ? "✓" : "!") + "</span>" +
          "<span><b>" + esc(CHECK_LABEL[x.kind] || x.kind) + "</b>" +
          (x.ok ? "" : "<small>" + esc(x.text) + "</small>") +
          "</span></li>"
      )
      .join("");

    /* the revenge question is sharper when the app can see the last trade
       was a loss, so it asks the sharper version then */
    const last = Store.trades
      .list()
      .map((x) => ({ t: x, c: Store.compute(x) }))
      .filter((x) => !x.c.open)
      .sort((a, b) => String(b.t.date || "").localeCompare(String(a.t.date || "")))[0];
    const rev = $("#pt-revenge");
    if (rev)
      rev.textContent =
        last && last.c.netPL < 0
          ? "Your last closed trade lost. This one is my setup, not the one that wins it back."
          : "I am taking this because it is my setup, not because of the last trade";

    /* An untouched form has nothing to judge, and opening the drawer to be
       told eight things are wrong before typing a character is nagging, not
       coaching. The verdict waits until there is a trade to check. */
    const started = Number.isFinite(t.entry) && Number.isFinite(t.size) && t.size > 0;

    const unmet = unmetFor(t, c);
    const ready = unmet.length === 0;
    const v = $("#pt-verdict");

    if (!started) {
      v.className = "pt-verdict wait";
      v.innerHTML = "<b>Waiting on the numbers</b><span>Fill in the entry, the stop and the size. Everything above checks itself as you type.</span>";
      const btn0 = $("#trade-form").querySelector("button[type='submit']");
      if (btn0) btn0.textContent = "Save trade";
      return;
    }

    v.className = "pt-verdict " + (ready ? "ready" : "not");
    v.innerHTML = ready
      ? "<b>Ready.</b><span>Every check you set for yourself is met. That is the trade you said you would take.</span>"
      : "<b>" + unmet.length + (unmet.length === 1 ? " thing unmet" : " things unmet") + "</b><span>" +
        esc(
          unmet
            .map((k) => HUMAN_LABEL[k] || (CHECK_LABEL[k] || k).toLowerCase())
            .join(", ")
        ) +
        ". You can still log it — it will be recorded as taken off plan.</span>";

    const save = $("#trade-form").querySelector("button[type='submit']");
    if (save) save.textContent = ready ? "Save trade" : "Log it anyway";
  }

  function liveCalc() {
    const t = readForm();
    const c = Store.compute(t);
    const limit = settings().riskPct;
    const over = c.riskPct !== null && c.riskPct > limit;
    const d = Store.discipline(t, settings());
    $("#calc").innerHTML = `
      <div><div class="k">Risk</div><div class="v ${over ? "warn" : ""}">${money(c.riskMoney)}</div></div>
      <div><div class="k">Risk % of balance</div><div class="v ${over ? "warn" : ""}">${pct(c.riskPct, 2)}</div></div>
      <div><div class="k">Planned R:R</div><div class="v">${c.plannedRR === null ? "—" : c.plannedRR.toFixed(2)}</div></div>
      <div><div class="k">Net P/L</div><div class="v ${c.open ? "" : dir(c.netPL)}">${c.open ? "open" : money(c.netPL, true)}</div></div>
      <div><div class="k">R multiple</div><div class="v ${c.r === null ? "" : dir(c.r)}">${c.open ? "—" : rfmt(c.r)}</div></div>
      <div><div class="k">Discipline</div><div class="v">${d}/100</div></div>`;

    renderChecklist(t, c);
  }

  /* `prefill` is a partial trade handed over from another screen — the
     calculators, and now the charts. It is never an id, so the form still
     opens as a new entry with the numbers already in it.

     Charts hands over more than numbers: the note written while the chart
     was on screen becomes the plan, and the annotated image becomes the
     screenshot, so the entry carries the reason and the picture without
     the user retyping either. `chartState` rides along unshown — it is
     what lets a later version reopen the exact chart. */
  function openForm(id, prefill) {
    const f = $("#trade-form");
    f.reset();
    $("#exits").innerHTML = "";
    f.elements.tradeId.value = "";
    shotData = null;
    pendingChartState = null;
    $("#shot-preview").hidden = true;
    $("#shot-preview").innerHTML = "";

    const t = id ? Store.trades.find(id) : null;
    $("#fm-title").textContent = t ? "Edit trade" : "Log a trade";
    $("#del-trade").hidden = !t;

    /* On an existing trade the gate is history, not a gate. The auto-checks
       and the verdict come off — grading a trade you already took teaches
       nothing — but the reason stays editable, because writing down after the
       fact why you took it is still worth more than leaving it blank. */
    const fresh = !t;
    $("#pre-trade").hidden = false;
    $("#pt-auto").hidden = !fresh;
    $("#pt-verdict").hidden = !fresh;
    $("#pt-title").textContent = fresh ? "Before you enter" : "The plan behind it";
    $("#pt-intro").textContent = fresh
      ? "Nothing here blocks you. It just makes taking the trade anyway a decision you made on purpose."
      : "This trade is already taken, so there is nothing left to check. The reason is still worth writing down.";

    if (t) {
      f.elements.tradeId.value = t.id;
      f.date.value = String(t.date).slice(0, 16);
      f.symbol.value = t.symbol || "";
      f.market.value = t.market || V.MARKETS[0];
      f.side.value = t.side || "Long";
      f.setup.value = t.setup || V.SETUPS[0];
      f.session.value = t.session || V.SESSIONS[0];
      f.entry.value = t.entry;
      f.stop.value = t.stop;
      f.target.value = t.target === null || t.target === undefined ? "" : t.target;
      f.size.value = t.size;
      f.contractValue.value = t.contractValue || 1;
      f.fees.value = t.fees || 0;
      f.emotion.value = t.emotion || V.EMOTIONS[0];
      f.tags.value = (t.tags || []).join(", ");
      f.stopHonoured.checked = t.stopHonoured !== false;
      f.review.value = t.review || "";
      f.plan.value = t.plan || "";
      f.chkStop.checked = !!(t.checks && t.checks.stopInvalidates);
      f.chkNotRevenge.checked = !!(t.checks && t.checks.notRevenge);
      (t.exits || []).forEach((e) => $("#exits").appendChild(exitRow(e)));
      if (t.shot) {
        shotData = t.shot;
        showShot();
      }
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      f.date.value = now.toISOString().slice(0, 16);
      f.stopHonoured.checked = true;
      f.contractValue.value = 1;
      f.fees.value = 0;

      if (prefill) {
        const set = (name, v) => {
          if (v === null || v === undefined || v === "") return;
          if (f.elements[name]) f.elements[name].value = v;
        };
        set("symbol", prefill.symbol);
        set("side", prefill.side);
        set("entry", prefill.entry);
        set("stop", prefill.stop);
        set("target", prefill.target);
        set("size", prefill.size);
        set("contractValue", prefill.contractValue);
        set("fees", prefill.fees);
        if (prefill.market && V.MARKETS.indexOf(prefill.market) >= 0) f.market.value = prefill.market;
        if (prefill.tags && prefill.tags.length) f.tags.value = prefill.tags.join(", ");
        if (prefill.setup && V.SETUPS.indexOf(prefill.setup) >= 0) f.setup.value = prefill.setup;
        if (prefill.session && V.SESSIONS.indexOf(prefill.session) >= 0) f.session.value = prefill.session;
        set("plan", prefill.plan);

        /* The chart came across as a data URL. Show it the same way an
           uploaded screenshot is shown, so it can be removed if the user
           would rather not keep it. */
        if (prefill.shot) {
          shotData = prefill.shot;
          showShot();
        }
        if (prefill.chartState) pendingChartState = prefill.chartState;

        $("#fm-title").textContent =
          prefill.source === "charts" ? "Log the trade you just planned" : "Log the trade you just sized";
        if (prefill.source === "charts") {
          $("#pt-intro").textContent =
            "Your note from the chart is in the reason below, and the chart is attached. Check it still reads true before you save.";
        }
      }
    }

    liveCalc();
    open($("#form-drawer"));
    setTimeout(() => f.symbol.focus(), 240);
  }

  function showShot() {
    const p = $("#shot-preview");
    p.hidden = false;
    p.innerHTML = `<img src="${esc(shotData)}" alt="Chart screenshot preview">
      <button type="button" class="btn btn-quiet sm">Remove screenshot</button>`;
    $("button", p).onclick = () => {
      shotData = null;
      p.hidden = true;
      p.innerHTML = "";
    };
  }

  /* Screenshots go into the same store as the trades, so they are
     downscaled hard before saving — a 4 MB PNG would blow the quota
     after a dozen trades. */
  function loadShot(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 960;
        const scale = Math.min(1, max / img.width);
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        try {
          shotData = cv.toDataURL("image/jpeg", 0.72);
        } catch (e) {
          shotData = reader.result;
        }
        showShot();
      };
      img.onerror = () => toast("That file could not be read as an image");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function saveForm(e) {
    e.preventDefault();
    const t = readForm();

    const problems = [];
    if (!t.symbol) problems.push("symbol");
    if (!Number.isFinite(t.entry)) problems.push("entry");
    if (!Number.isFinite(t.stop)) problems.push("stop");
    if (!Number.isFinite(t.size) || t.size <= 0) problems.push("size");
    if (Number.isFinite(t.entry) && Number.isFinite(t.stop) && t.entry === t.stop)
      problems.push("a stop different from the entry");

    if (problems.length) {
      toast("Still needed: " + problems.join(", "));
      const first = $("#trade-form").querySelector("[name='" + problems[0] + "']");
      if (first) first.focus();
      return;
    }

    /* the stop must sit on the losing side of the entry, or R is nonsense */
    const wrongSide =
      (t.side === "Long" && t.stop > t.entry) || (t.side === "Short" && t.stop < t.entry);
    if (wrongSide && !confirm("Your stop is on the profitable side of the entry for a " + t.side.toLowerCase() + ". Save anyway?"))
      return;

    /* The override. It is not a blocker — a checklist that refuses gets lied
       to, and nothing here can stop an order at the broker. It costs a
       sentence instead, and the trade carries what was unmet so the journal
       can later show what taking trades off plan was actually worth. */
    const fresh = !t.id;
    if (fresh) {
      const unmet = unmetFor(t, Store.compute(t));
      if (unmet.length) {
        const names = unmet.map((k) => HUMAN_LABEL[k] || (CHECK_LABEL[k] || k).toLowerCase());
        if (
          !confirm(
            "Taking this off plan. Unmet: " + names.join(", ") + ".\n\n" +
              "It will be logged and marked as taken off plan. Continue?"
          )
        )
          return;
      }
      t.unmet = unmet;
    } else {
      const prev = Store.trades.find(t.id);
      /* editing never rewrites the pre-trade record — that would let a
         trader tidy up history, which is the one thing a journal must not do */
      if (prev && prev.unmet) t.unmet = prev.unmet;
    }

    if (!t.id) delete t.id;
    Store.trades.save(t);
    close($("#form-drawer"));

    /* The trade is what matters, so Store drops chart screenshots rather
       than lose an entry when the browser's storage is full. Say so — a
       screenshot that quietly is not there is worse than one never offered. */
    if (Store.imagesShed && Store.imagesShed()) {
      toast(
        t.id ? "Trade updated" : "Trade logged",
        "This browser's storage is full, so chart screenshots were dropped to make room. Every trade and number is saved. Export to CSV and clear old entries in Settings to get pictures back.",
      );
    } else if (Store.storageBlocked && Store.storageBlocked()) {
      toast(
        "Saved for this session only",
        "This browser is not letting the app store data, so the log will be gone when the tab closes. Export to CSV before you leave.",
      );
    } else {
      toast(t.id ? "Trade updated" : "Trade logged");
    }
  }

  /* ------------------------------------------------------------ CSV */

  const CSV_COLS = ["date", "symbol", "market", "side", "setup", "session", "entry", "stop",
    "target", "size", "contractValue", "fees", "exitPrice", "exitSize", "emotion", "tags",
    "stopHonoured", "plan", "offPlan", "review"];

  function exportCsv() {
    const rows = rowsFor().map(({ t, c, d }) => ({
      date: t.date, symbol: t.symbol, market: t.market, side: t.side, setup: t.setup,
      session: t.session, entry: t.entry, stop: t.stop, target: t.target, size: t.size,
      contractValue: t.contractValue, fees: t.fees,
      exitPrice: c.avgExit === null ? "" : c.avgExit, exitSize: c.closedSize,
      emotion: t.emotion, tags: (t.tags || []).join("|"),
      stopHonoured: t.stopHonoured !== false, review: t.review,
      plan: t.plan || "", offPlan: (t.unmet || []).join("|"),
      netPL: c.netPL, r: c.r, riskPct: c.riskPct, discipline: d,
    }));
    if (!rows.length) return toast("Nothing to export with these filters");

    const cols = CSV_COLS.concat(["netPL", "r", "riskPct", "discipline"]);
    const cell = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [cols.join(",")]
      .concat(rows.map((r) => cols.map((c2) => cell(r[c2])).join(",")))
      .join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "theonepercent-journal-" + dayKey(new Date()) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Exported " + rows.length + " trades");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch !== "\r") field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c !== ""));
  }

  function importCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return toast("That file has no rows");
    const head = rows[0].map((h) => h.trim().replace(/\s+/g, "").toLowerCase());
    const idx = (name) => head.indexOf(name.toLowerCase());
    const need = ["symbol", "entry", "stop", "size"];
    const missing = need.filter((n) => idx(n) < 0);
    if (missing.length) return toast("Missing columns: " + missing.join(", "));

    let n = 0, skipped = 0;
    rows.slice(1).forEach((r) => {
      const g = (name) => {
        const i = idx(name);
        return i < 0 ? "" : (r[i] || "").trim();
      };
      const entry = parseFloat(g("entry"));
      const stop = parseFloat(g("stop"));
      const size = parseFloat(g("size"));
      if (!g("symbol") || !Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(size)) {
        skipped++;
        return;
      }
      const price = parseFloat(g("exitPrice"));
      const exitSize = parseFloat(g("exitSize"));
      const raw = g("date");
      const when = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw) : new Date();
      Store.trades.save({
        date: when.toISOString().slice(0, 16),
        symbol: g("symbol").toUpperCase(),
        market: V.MARKETS.indexOf(g("market")) >= 0 ? g("market") : V.MARKETS[0],
        side: /short|sell/i.test(g("side")) ? "Short" : "Long",
        setup: V.SETUPS.indexOf(g("setup")) >= 0 ? g("setup") : V.SETUPS[0],
        session: V.SESSIONS.indexOf(g("session")) >= 0 ? g("session") : V.SESSIONS[2],
        entry, stop, size,
        target: Number.isFinite(parseFloat(g("target"))) ? parseFloat(g("target")) : null,
        contractValue: Number.isFinite(parseFloat(g("contractValue"))) ? parseFloat(g("contractValue")) : 1,
        fees: Number.isFinite(parseFloat(g("fees"))) ? parseFloat(g("fees")) : 0,
        exits: Number.isFinite(price) ? [{ price, size: Number.isFinite(exitSize) ? exitSize : size }] : [],
        emotion: V.EMOTIONS.indexOf(g("emotion")) >= 0 ? g("emotion") : "",
        tags: g("tags") ? g("tags").split(/[|;]/).map((s) => s.trim()).filter(Boolean) : [],
        stopHonoured: !/false|no|0/i.test(g("stopHonoured")),
        review: g("review"),
      });
      n++;
    });
    toast("Imported " + n + " trades" + (skipped ? ", skipped " + skipped : ""));
  }

  /* ------------------------------------------------------------ sample data
     Deterministic, so screenshots and bug reports are reproducible.
     Shaped like a real beginner's log: a decent edge on pullbacks, a
     losing revenge habit, and one oversized trade that tanks the score. */

  function loadSample() {
    if (Store.trades.list().length && !confirm("Add 20 sample trades to the log?")) return;
    let seed = 8814423;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    const syms = [
      ["EURUSD", "Forex", 1.084, 0.0001, 100000],
      ["GBPUSD", "Forex", 1.271, 0.0001, 100000],
      ["BTCUSD", "Crypto", 64200, 1, 1],
      ["XAUUSD", "Commodities", 2341, 0.1, 100],
      ["US500", "Indices", 5431, 0.5, 10],
    ];
    const profile = [
      ["Pullback", 0.62, 1.9], ["Breakout", 0.42, 2.2], ["Range", 0.55, 1.2],
      ["Reversal", 0.3, 2.4], ["News", 0.35, 1.5], ["Trend continuation", 0.58, 1.8],
    ];

    for (let i = 19; i >= 0; i--) {
      const [symbol, market, base, tick, cv] = syms[Math.floor(rnd() * syms.length)];
      const [setup, winRate, rr] = profile[Math.floor(rnd() * profile.length)];
      const side = rnd() > 0.45 ? "Long" : "Short";
      const dirn = side === "Long" ? 1 : -1;

      const when = new Date();
      when.setDate(when.getDate() - i * 2 - Math.floor(rnd() * 2));
      when.setHours(9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);

      const entry = +(base * (1 + (rnd() - 0.5) * 0.01)).toFixed(5);
      const stopDist = tick * (12 + Math.floor(rnd() * 24));
      const stop = +(entry - dirn * stopDist).toFixed(5);
      const target = +(entry + dirn * stopDist * rr).toFixed(5);

      /* one deliberate rule-break so the discipline score has teeth */
      const reckless = i === 6;
      const riskPct = reckless ? 4.2 : 0.7 + rnd() * 0.5;
      const balance = 1000;
      const size = +(((balance * riskPct) / 100) / (stopDist * cv)).toFixed(2);

      /* Emotion is drawn first and then *biases* the outcome, rather than
         being labelled after the fact. Otherwise the Insights tab shows a
         tautology — "every calm trade won" — instead of a real tendency. */
      const moods = [
        ["Calm", 0.34, 1.18], ["Confident", 0.24, 1.08], ["Impatient", 0.18, 0.72],
        ["Fearful", 0.12, 0.78], ["Greedy", 0.07, 0.66], ["Revenge", 0.05, 0.42],
      ];
      let pick = rnd(), mood = moods[0];
      for (let k = 0; k < moods.length; k++) {
        pick -= moods[k][1];
        if (pick <= 0) { mood = moods[k]; break; }
      }
      const emotion = mood[0];
      const revenge = emotion === "Revenge";
      const won = rnd() < Math.min(0.9, winRate * mood[2]);
      const exitPrice = won
        ? +(entry + dirn * stopDist * rr * (0.75 + rnd() * 0.3)).toFixed(5)
        : +(entry - dirn * stopDist * (0.96 + rnd() * 0.08)).toFixed(5);

      Store.trades.save({
        date: when.toISOString().slice(0, 16),
        symbol, market, side, setup,
        session: V.SESSIONS[1 + Math.floor(rnd() * 3)],
        entry, stop, target, size,
        contractValue: cv,
        fees: +(rnd() * 3).toFixed(2),
        exits: [{ price: exitPrice, size }],
        emotion,
        tags: [setup.toLowerCase().replace(/ /g, "-")].concat(reckless ? ["oversized"] : []),
        stopHonoured: !reckless && rnd() > 0.12,
        review: revenge
          ? "Jumped straight back in after the last loss. No setup, just wanted it back."
          : won
          ? "Waited for the level, took the entry on confirmation and let it run to target."
          : emotion === "Impatient"
          ? "Entered before the candle closed. Right idea, wrong moment."
          : "Setup was there but I was early. Stop did its job.",
        balanceAtOpen: balance,
      });
    }
    toast("20 sample trades loaded");
  }

  /* ------------------------------------------------------------ drawers */

  let lastFocus = null;

  function open(d) {
    lastFocus = document.activeElement;
    d.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".drawer-panel", d).focus();
  }

  function close(d) {
    d.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ------------------------------------------------------------ chips */

  function chipSet(host, items, key) {
    host.innerHTML = items
      .map(
        (it) =>
          `<button type="button" data-v="${esc(it.v)}" aria-pressed="${state[key] === it.v}">${esc(it.l)}</button>`
      )
      .join("");
    $$("button", host).forEach((b) => {
      b.onclick = () => {
        state[key] = b.dataset.v;
        chipSet(host, items, key);
        render();
      };
    });
  }

  function clearFilters() {
    state.q = "";
    state.result = "all";
    state.market = "all";
    state.emotion = "all";
    $("#f-q").value = "";
    buildChips();
    render();
  }

  function buildChips() {
    chipSet($("#f-result"), [
      { v: "all", l: "All" }, { v: "win", l: "Wins" }, { v: "loss", l: "Losses" }, { v: "open", l: "Open" },
    ], "result");
    chipSet($("#f-market"), [{ v: "all", l: "All markets" }].concat(V.MARKETS.map((m) => ({ v: m, l: m }))), "market");
    chipSet($("#f-emotion"), [{ v: "all", l: "Any emotion" }].concat(V.EMOTIONS.map((m) => ({ v: m, l: m }))), "emotion");
  }

  /* ------------------------------------------------------------ render */

  function render() {
    const rows = sortRows(rowsFor());
    renderSummary(rows);
    renderTable(rows);
    renderCalendar(rows);
    renderInsights(rows);
    renderGuardrails();

    const dirty = state.q || state.result !== "all" || state.market !== "all" || state.emotion !== "all";
    $("#f-clear").hidden = !dirty;

    const cur = $("#trades th[data-sort='netPL'] .cur");
    if (cur) cur.textContent = settings().currency || "";

    $$("#trades th[data-sort]").forEach((th) => {
      th.classList.toggle("on", th.dataset.sort === state.sort);
      th.classList.toggle("asc", th.dataset.sort === state.sort && state.asc);
    });

    /* account filter list is derived from the trades themselves, so a
       renamed account never leaves an orphan option behind */
    const accounts = Array.from(new Set(Store.trades.list().map((t) => t.account).filter(Boolean)));
    const sel = $("#f-account");
    const want = ["all"].concat(accounts).join("|");
    if (sel.dataset.k !== want) {
      sel.dataset.k = want;
      sel.innerHTML =
        '<option value="all">All accounts</option>' +
        accounts.map((a) => `<option>${esc(a)}</option>`).join("");
      sel.value = accounts.indexOf(state.account) >= 0 ? state.account : "all";
      state.account = sel.value;
    }
  }

  function showTab(name) {
    state.tab = name;
    ["trades", "calendar", "insights"].forEach((n) => {
      $("#tab-" + n).setAttribute("aria-selected", String(n === name));
      $("#view-" + n).hidden = n !== name;
    });
  }

  /* ------------------------------------------------------------ init */


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

  function init() {
    fillSelect($("#fm-market"), V.MARKETS);
    fillSelect($("#fm-setup"), V.SETUPS, "Choose the setup");
    fillSelect($("#fm-session"), V.SESSIONS, "Choose the session");
    fillSelect($("#fm-emotion"), V.EMOTIONS);
    buildChips();

    $("#storage-warn").hidden = !Store.storageBlocked();

    $("#f-q").addEventListener("input", (e) => {
      state.q = e.target.value;
      render();
    });
    $("#f-range").addEventListener("change", (e) => {
      state.range = e.target.value;
      render();
    });
    $("#f-account").addEventListener("change", (e) => {
      state.account = e.target.value;
      render();
    });
    $("#f-clear").onclick = clearFilters;

    $$("#trades th[data-sort]").forEach((th) => {
      th.onclick = () => {
        if (state.sort === th.dataset.sort) state.asc = !state.asc;
        else {
          state.sort = th.dataset.sort;
          state.asc = false;
        }
        render();
      };
    });

    ["trades", "calendar", "insights"].forEach((n) => {
      $("#tab-" + n).onclick = () => showTab(n);
    });

    $("#cal-prev").onclick = () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
      render();
    };
    $("#cal-next").onclick = () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
      render();
    };

    $("#new-trade").onclick = () => openForm(null);
    $("#add-exit").onclick = () => {
      $("#exits").appendChild(exitRow());
      liveCalc();
    };
    $("#trade-form").addEventListener("submit", saveForm);
    $("#trade-form").addEventListener("input", liveCalc);
    /* selects and checkboxes are the two controls where a browser may give
       you change without input, and both now feed the checklist */
    $("#trade-form").addEventListener("change", liveCalc);
    $("#del-trade").onclick = () => {
      const id = $("#trade-form").elements.tradeId.value;
      if (!id || !confirm("Delete this trade? It will not be recoverable.")) return;
      Store.trades.remove(id);
      close($("#form-drawer"));
      toast("Trade deleted");
    };
    $("#fm-shot").addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) loadShot(e.target.files[0]);
    });

    /* the More menu */
    const trigger = $("#more-trigger");
    const panel = $("#jmore");
    trigger.onclick = (e) => {
      e.stopPropagation();
      const open2 = panel.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open2));
    };
    document.addEventListener("click", () => {
      panel.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    });
    $$("button", panel).forEach((b) => {
      b.onclick = () => {
        panel.classList.remove("open");
        const act = b.dataset.act;
        if (act === "export") exportCsv();
        if (act === "sample") loadSample();
        if (act === "import") $("#csv-input").click();
        if (act === "wipe") {
          if (confirm("Delete every trade in this journal? This cannot be undone.")) {
            Store.trades.clear();
            toast("Journal cleared");
          }
        }
      };
    });
    $("#csv-input").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => importCsv(String(r.result));
      r.readAsText(f);
      e.target.value = "";
    });

    $$("[data-close]").forEach((b) => {
      b.onclick = () => close(b.closest(".drawer"));
    });

    document.addEventListener("keydown", (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "").toUpperCase());
      if (e.key === "Escape") {
        const openDrawer = $('.drawer[aria-hidden="false"]');
        if (openDrawer) close(openDrawer);
        return;
      }
      if (!typing && (e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openForm(null);
      }
    });

    window.addEventListener("storechange", render);
    render();
    showTab("trades");

    /* arrived from a calculator or from the chart: open the form with its
       numbers already in, and consume the draft so a reload does not
       resurrect it. The message has to name the right screen — telling
       someone who just dragged levels on a chart that they sized it on the
       calculator is a small lie that makes them doubt the numbers. */
    const draft = fromHash() || (Store.draft && Store.draft.take());
    if (draft) {
      openForm(null, draft);
      toast(
        draft.source === "charts"
          ? "Planned on the chart — check it and save"
          : "Sized on the calculator — check it and save",
      );
    }
  }

  /* The calculators fall back to the URL fragment when storage is blocked
     (private windows, embedded previews). Read it, then strip it so a
     reload does not re-open the same draft. */
  function fromHash() {
    const m = /[#&]draft=([^&]+)/.exec(window.location.hash || "");
    if (!m) return null;
    let data = null;
    try {
      data = JSON.parse(decodeURIComponent(m[1]));
    } catch (e) {
      data = null;
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return data && typeof data === "object" ? data : null;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
