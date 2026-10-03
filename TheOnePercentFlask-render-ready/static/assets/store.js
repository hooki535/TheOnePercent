/* TheOnePercent — data layer
   -------------------------------------------------------------------
   Every screen reads and writes through this module. No page touches
   web storage directly, and no page does trade arithmetic of its own.

   Why it exists: the roadmap promises a persistent journal, verified
   accounts and a leaderboard, none of which a static front end can do.
   Rather than fake it forever or stop and build a server, all access
   goes through one driver interface:

       list(kind)            -> array
       put(kind, record)      -> record        (upsert by id)
       remove(kind, id)       -> boolean
       get(kind)              -> object        (singleton kinds)
       patch(kind, partial)   -> object

   The `local` driver below keeps everything in web storage, falling
   back to memory where storage is blocked (sandboxed frames, private
   windows). A `rest` driver with the same five methods will point at
   a real API without a single screen changing.

   Trade maths lives here too, for one reason: the journal, the
   dashboard and the leaderboard must never disagree about what R is.
   ------------------------------------------------------------------- */

window.Store = (() => {
  "use strict";

  const NS = "onepercent:";
  const SINGLETONS = { settings: true, profile: true, draft: true, learn: true, academy: true };

  /* ---------------------------------------------------------- defaults */

  /* Defaults exist only for the window between landing and onboarding —
     onboarding asks for all three, and the calculators let them be edited
     in place. 1,000 UGX was the old default and it was a bug: it is about
     a quarter of a dollar, which made every sized position round to zero. */
  const DEFAULT_SETTINGS = {
    balance: 1000,
    currency: "USD",
    riskPct: 1,
    accountName: "Demo account",

    /* Guardrails. Not in the original roadmap, added because a risk rule
       that is only checked after the fact is a report, not a rule. These
       are the limits the journal and the dashboard warn against BEFORE
       the next trade. Zero or false disables an individual rail. */
    minRR: 1.5,
    guardrailsOn: true,
    maxDailyLossPct: 3,
    maxTradesPerDay: 3,
    coolOffAfterLosses: 3,
    timezone: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch (e) {
        return "UTC";
      }
    })(),
  };

  /* The vocabulary the journal offers. Kept here so the form, the filter
     chips and the dashboard breakdowns can never drift apart. */
  const EMOTIONS = ["Calm", "Confident", "Impatient", "Fearful", "Greedy", "Revenge"];
  const SETUPS = ["Breakout", "Pullback", "Range", "Reversal", "News", "Trend continuation"];
  const SESSIONS = ["Sydney", "Tokyo", "London", "New York"];
  const MARKETS = ["Forex", "Crypto", "Futures", "Indices", "Commodities"];

  /* ---------------------------------------------------------- local driver */

  function webStorage() {
    try {
      const s = window[["local", "Storage"].join("")];
      s.setItem("__s__", "1");
      s.removeItem("__s__");
      return s;
    } catch (e) {
      return null;
    }
  }

  const memory = new Map();
  let storageBlocked = false;

  function readKey(key) {
    const s = webStorage();
    if (!s) {
      storageBlocked = true;
      return memory.has(key) ? memory.get(key) : null;
    }
    try {
      const raw = s.getItem(key);
      return raw === null ? (memory.has(key) ? memory.get(key) : null) : JSON.parse(raw);
    } catch (e) {
      return memory.has(key) ? memory.get(key) : null;
    }
  }

  /* Set when a write had to drop chart images to fit. The UI reads it to
     say so, because a screenshot vanishing without a word is worse than
     never having been offered. */
  let shedImages = false;

  /* Chart screenshots are the only thing in here big enough to fill the
     quota — roughly 50KB of base64 each, against a 5MB budget. When a write
     fails, the trades are worth more than the pictures, so the pictures go
     first and the write is retried. Losing an entry silently is not an
     option: before this, a quota error was caught, the value stayed in
     memory only, and the trade disappeared on the next reload. */
  function withoutImages(value) {
    if (!Array.isArray(value)) return null;
    let dropped = false;
    const lean = value.map((row) => {
      if (row && typeof row === "object" && row.shot) {
        dropped = true;
        const copy = Object.assign({}, row);
        delete copy.shot;
        return copy;
      }
      return row;
    });
    return dropped ? lean : null;
  }

  function writeKey(key, value) {
    memory.set(key, value);
    const s = webStorage();
    if (!s) {
      storageBlocked = true;
      return;
    }
    try {
      s.setItem(key, JSON.stringify(value));
      return;
    } catch (e) {
      const lean = withoutImages(value);
      if (lean) {
        try {
          s.setItem(key, JSON.stringify(lean));
          memory.set(key, lean);
          shedImages = true;
          return;
        } catch (e2) {
          /* fall through — even without images it does not fit */
        }
      }
      storageBlocked = true;
    }
  }

  const localDriver = {
    name: "local",
    list(kind) {
      const rows = readKey(NS + kind);
      return Array.isArray(rows) ? rows : [];
    },
    put(kind, record) {
      const rows = this.list(kind);
      const i = rows.findIndex((r) => r.id === record.id);
      if (i >= 0) rows[i] = record;
      else rows.push(record);
      writeKey(NS + kind, rows);
      return record;
    },
    remove(kind, id) {
      const rows = this.list(kind);
      const next = rows.filter((r) => r.id !== id);
      writeKey(NS + kind, next);
      return next.length !== rows.length;
    },
    get(kind) {
      const v = readKey(NS + kind);
      return v && typeof v === "object" ? v : {};
    },
    patch(kind, partial) {
      const next = Object.assign({}, this.get(kind), partial);
      writeKey(NS + kind, next);
      return next;
    },
    clear(kind) {
      writeKey(NS + kind, SINGLETONS[kind] ? {} : []);
    },
  };

  let driver = localDriver;

  /* ---------------------------------------------------------- events
     One event name for everything. A screen re-renders on `storechange`
     rather than guessing when its data went stale, which is also how
     two open tabs stay honest with each other. */

  function emit(kind) {
    window.dispatchEvent(new CustomEvent("storechange", { detail: { kind } }));
  }

  try {
    window.addEventListener("storage", (e) => {
      if (e.key && e.key.indexOf(NS) === 0) emit(e.key.slice(NS.length));
    });
  } catch (e) {
    /* ignore */
  }

  /* ---------------------------------------------------------- ids */

  function uid(prefix) {
    return (
      (prefix || "id") +
      "_" +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7)
    );
  }

  /* ---------------------------------------------------------- trade maths
     The one place R is computed. Read this before changing anything:

     grossPL   sum of every exit leg, signed by direction, in trade units
     netPL     grossPL minus fees                    <- what the user made
     riskMoney what was at stake when the trade opened
     R         netPL / riskMoney                     <- the only comparable
               number across symbols, sizes and accounts

     A trade with no stop has no risk and therefore no R. We report null
     rather than zero, because zero would quietly average into the stats
     and flatter a reckless trade. */

  function num(v) {
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function compute(trade) {
    const t = trade || {};
    const dir = t.side === "Short" ? -1 : 1;
    const entry = num(t.entry);
    const stop = num(t.stop);
    const size = num(t.size) || 0;
    const fees = num(t.fees) || 0;

    const legs = (Array.isArray(t.exits) ? t.exits : []).filter(
      (l) => num(l.price) !== null && num(l.size) !== null
    );

    const closedSize = legs.reduce((a, l) => a + num(l.size), 0);
    const open = size > 0 && closedSize < size - 1e-9;

    let gross = 0;
    legs.forEach((l) => {
      gross += (num(l.price) - entry) * dir * num(l.size);
    });

    const contract = num(t.contractValue) || 1;
    const grossPL = gross * contract;
    const netPL = grossPL - fees;

    const riskPerUnit = entry !== null && stop !== null ? Math.abs(entry - stop) : null;
    const riskMoney = riskPerUnit !== null && size ? riskPerUnit * size * contract : null;
    const r = riskMoney ? netPL / riskMoney : null;

    /* planned R:R, known before the trade is taken */
    const target = num(t.target);
    const plannedRR =
      riskPerUnit && target !== null ? Math.abs(target - entry) / riskPerUnit : null;

    const balance = num(t.balanceAtOpen);
    const riskPct = riskMoney && balance ? (riskMoney / balance) * 100 : null;

    const result = !legs.length ? "Open" : netPL > 0 ? "Win" : netPL < 0 ? "Loss" : "Break-even";

    return {
      grossPL,
      netPL,
      fees,
      riskMoney,
      riskPct,
      r,
      plannedRR,
      closedSize,
      open,
      result,
      avgExit: closedSize ? legs.reduce((a, l) => a + num(l.price) * num(l.size), 0) / closedSize : null,
    };
  }

  /* Per-trade discipline score, 0–100. Deliberately winnable by a losing
     trade that followed the plan — that is the whole thesis of the
     product, so it is scored, not merely stated. */
  function discipline(trade, settings) {
    const c = compute(trade);
    const limit = num((settings || {}).riskPct) || DEFAULT_SETTINGS.riskPct;
    let score = 0;

    /* 45 — did the size respect the user's own risk ceiling */
    if (c.riskPct === null) score += 0;
    else if (c.riskPct <= limit + 1e-9) score += 45;
    else if (c.riskPct <= limit * 1.5) score += 22;

    /* 20 — was a stop defined at all */
    if (num(trade.stop) !== null) score += 20;

    /* 15 — was the stop honoured (self-reported, and asked plainly) */
    if (trade.stopHonoured !== false) score += 15;

    /* 10 — was the trade planned to pay more than it risked. The bar is
       the user's own minimum R:R, not a number baked in here. */
    const minRR = num((settings || {}).minRR) || DEFAULT_SETTINGS.minRR;
    if (c.plannedRR !== null && c.plannedRR >= minRR) score += 10;
    else if (c.plannedRR !== null && c.plannedRR >= 1) score += 5;

    /* 10 — was it reviewed, and was the emotion honest */
    if (trade.review && String(trade.review).trim().length >= 12) score += 6;
    if (trade.emotion) score += 4;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /* ---------------------------------------------------------- aggregates
     What the dashboard reads. Never recomputed on a page. */

  /* ------------------------------------------------------------------ leaks
     "What is costing you money."

     Every other number on this site is descriptive: net P&L, expectancy,
     win rate. None of them tell a trader what to *change*, and a dashboard
     that only describes is a mirror, not a coach.

     Two kinds of finding, kept deliberately separate because they carry
     very different weight:

     RULES are deterministic. A trade risked 8% against a 1% rule, or lost
     1.8R against a 1R stop — that is not an inference, it happened, and the
     cost is arithmetic. One occurrence is worth naming, so there is no
     sample-size gate and the cost is exact.

     PATTERNS are statistical. "New York is your worst session" is a claim
     about the future made from a handful of trades, so it needs MIN_N
     trades in the subset, MIN_TOTAL closed in the journal, and it is priced
     against the rest of the journal rather than against zero. Every pattern
     carries its sample size so the user can discount it.

     Cost is given in R and in money. R is the honest unit; money is the one
     that stings. One R is priced at the average money risked per trade,
     which is the only defensible conversion when position sizes differ.
     ------------------------------------------------------------------ */

  const MIN_N = 3;
  const MIN_TOTAL = 6;

  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function leaks(trades, settings) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const all = (trades || []).slice();

    /* one pass, oldest first, so the sequence rules below can look back */
    const rows = all
      .map((t) => ({ t, c: compute(t) }))
      .filter((x) => !x.c.open && x.c.r !== null)
      .sort((a, b) => String(a.t.date || "").localeCompare(String(b.t.date || "")));

    const out = { closed: rows.length, enough: rows.length >= MIN_TOTAL, findings: [], wins: [] };
    if (!rows.length) return out;

    const avgRisk = rows.reduce((a, x) => a + Math.abs(x.c.riskMoney || 0), 0) / rows.length;
    const rValue = avgRisk || (num(s.balance) * num(s.riskPct)) / 100 || 1;
    out.rValue = rValue;
    out.avgR = rows.reduce((a, x) => a + x.c.r, 0) / rows.length;

    const ids = (list) => list.map((x) => x.t.id).sort().join("|");

    /* --------------------------------------------------------- rules */

    function rule(kind, title, list, costR, text) {
      if (!list.length) return;
      out.findings.push({
        basis: "rule",
        kind,
        title,
        text,
        n: list.length,
        costR,
        costMoney: costR * rValue,
        share: (list.length / rows.length) * 100,
        key: ids(list),
      });
    }

    /* 1 — sizing. The most expensive habit there is, and the one every
       trader is certain they do not have. Priced as the risk taken beyond
       the rule, because that is the exposure the rule existed to prevent. */
    const cap = num(s.riskPct);
    const ruleMoney = (num(s.balance) * cap) / 100;
    const oversized = rows.filter((x) => x.c.riskPct !== null && x.c.riskPct > cap * 1.25);
    if (oversized.length) {
      const excess = oversized.reduce((a, x) => a + Math.max(0, Math.abs(x.c.riskMoney) - ruleMoney), 0);
      const worst = oversized.reduce((a, x) => Math.max(a, x.c.riskPct), 0);
      const realised = oversized.reduce((a, x) => a + x.c.netPL, 0);
      rule(
        "oversized",
        oversized.length === 1 ? "One trade sized above your own rule" : oversized.length + " trades sized above your own rule",
        oversized,
        -(excess / rValue),
        "Your rule is " + cap + "%; the worst of these risked " + worst.toFixed(2) +
          "%. That is " + excess.toFixed(2) + " of exposure the rule existed to prevent, and those trades came to " +
          realised.toFixed(2) + " between them. Size is the one variable you control completely before the market touches it."
      );
    }

    /* 2 — the stop. A loss past 1R means it was moved, widened, or was
       never really there. The excess is exact, so price that. */
    const overrun = rows.filter((x) => x.c.r < -1.15);
    if (overrun.length) {
      const excessR = overrun.reduce((a, x) => a + (x.c.r + 1), 0);
      rule(
        "stopOverrun",
        overrun.length === 1 ? "A loss bigger than the risk you planned" : overrun.length + " losses bigger than the risk you planned",
        overrun,
        excessR,
        "These came in past 1.15R, which means the stop moved after the trade went live. The excess alone is " +
          Math.abs(excessR).toFixed(2) + "R, or about " + Math.abs(excessR * rValue).toFixed(2) +
          " — the cost of the decision, not of the setup."
      );
    }

    /* 3 — no stop at all. No cost can be computed, which is the point. */
    const noStop = rows.filter((x) => num(x.t.stop) === null);
    rule(
      "noStop",
      noStop.length === 1 ? "A trade logged with no stop" : noStop.length + " trades logged with no stop",
      noStop,
      0,
      "With no stop recorded there is no risk to measure, so these trades cannot be graded, sized or compared. " +
        "They are also the ones that end accounts."
    );

    /* 4 — over-trading, against the user's own limit rather than an opinion */
    const limit = num(s.maxTradesPerDay) || 0;
    if (limit > 0) {
      const perDay = new Map();
      rows.forEach((x) => {
        const k = String(x.t.date || "").slice(0, 10);
        perDay.set(k, (perDay.get(k) || []).concat([x]));
      });
      const extra = [];
      let busyDays = 0;
      perDay.forEach((list) => {
        if (list.length <= limit) return;
        busyDays++;
        /* only the trades past the limit — the first three were allowed */
        extra.push.apply(extra, list.slice(limit));
      });
      if (extra.length) {
        const costR = extra.reduce((a, x) => a + x.c.r, 0);
        rule(
          "overTrading",
          extra.length + (extra.length === 1 ? " trade" : " trades") + " past your daily limit",
          extra,
          Math.min(0, costR),
          "On " + busyDays + (busyDays === 1 ? " day" : " days") + " you went past your limit of " + limit +
            " a day. Those extra entries came to " + costR.toFixed(2) + "R between them. The first trades of a day " +
            "are the planned ones; the extras are the ones the day talks you into."
        );
      }
    }

    /* --------------------------------------------------------- patterns */

    function versusRest(subset) {
      if (!subset.length || subset.length === rows.length) return null;
      const set = new Set(subset.map((x) => x.t.id));
      const rest = rows.filter((x) => !set.has(x.t.id));
      if (!rest.length) return null;
      const mine = subset.reduce((a, x) => a + x.c.r, 0) / subset.length;
      const theirs = rest.reduce((a, x) => a + x.c.r, 0) / rest.length;
      return { n: subset.length, expR: mine, restR: theirs, gapR: mine - theirs, costR: (mine - theirs) * subset.length };
    }

    function pattern(kind, title, list, text) {
      if (!out.enough || list.length < MIN_N) return;
      const v = versusRest(list);
      if (!v || v.gapR >= 0) return;
      const key = ids(list);
      /* two cuts over exactly the same trades are one finding said twice */
      if (out.findings.some((f) => f.key === key)) return;
      out.findings.push({
        basis: "pattern",
        kind,
        title,
        text,
        n: v.n,
        expR: v.expR,
        restR: v.restR,
        costR: v.costR,
        costMoney: v.costR * rValue,
        share: (v.n / rows.length) * 100,
        key,
      });
    }

    /* 5 — revenge entries: opened within 90 minutes of closing a loss.
       Named plainly, because the euphemism is how the habit survives. */
    const revenge = [];
    rows.forEach((x, i) => {
      if (!i) return;
      const prev = rows[i - 1];
      if (prev.c.netPL >= 0) return;
      const a = new Date(prev.t.date).getTime();
      const b = new Date(x.t.date).getTime();
      if (Number.isFinite(a) && Number.isFinite(b) && b - a > 0 && b - a <= 90 * 60000) revenge.push(x);
    });
    pattern(
      "revenge",
      revenge.length + " entries taken straight after a loss",
      revenge,
      "Opened within ninety minutes of closing a loser. That is the most expensive ninety minutes in trading, " +
        "and the journal is the only place it is visible."
    );

    /* 6 — the checklist, priced. This is the pair to the pre-trade gate on
       the journal: the gate cannot block a trade, so the only thing that
       makes it worth obeying is being able to show later what ignoring it
       cost. Both cuts need trades on each side to say anything at all, which
       versusRest already enforces. */
    const offPlan = rows.filter((x) => (x.t.unmet || []).length);
    pattern(
      "offPlan",
      offPlan.length + " trades taken with your own checklist unmet",
      offPlan,
      "You logged these knowing something was unmet — the size, the R:R, the reason, or the stop. " +
        "The checklist cannot stop you. This is what walking past it has been worth."
    );

    const noPlan = rows.filter((x) => !String(x.t.plan || "").trim());
    pattern(
      "noPlan",
      noPlan.length + " trades with no reason written",
      noPlan,
      "Nothing was written down before entry on these. A trade you cannot explain afterwards is a trade you " +
        "cannot repeat on purpose or stop taking on purpose."
    );

    /* 7 — the behavioural cuts: same machinery, different key */
    const cuts = [
      ["session", (t) => t.session, "session"],
      ["emotion", (t) => t.emotion, "state of mind"],
      ["setup", (t) => t.setup, "setup"],
      ["weekday", (t) => { const d = new Date(t.date); return Number.isFinite(d.getTime()) ? WEEKDAYS[d.getDay()] : ""; }, "day"],
      ["symbol", (t) => t.symbol, "instrument"],
    ];

    cuts.forEach(([kind, key, noun]) => {
      const groups = new Map();
      rows.forEach((x) => {
        const k = key(x.t);
        if (!k) return;
        groups.set(k, (groups.get(k) || []).concat([x]));
      });
      if (groups.size < 2) return;

      let worst = null;
      groups.forEach((list, k) => {
        if (list.length < MIN_N) return;
        const v = versusRest(list);
        if (!v) return;
        if (!worst || v.costR < worst.v.costR) worst = { k, list, v };
      });
      if (!worst) return;

      pattern(
        kind,
        "Your worst " + noun + ": " + worst.k,
        worst.list,
        worst.k + " runs at " + worst.v.expR.toFixed(2) + "R a trade against " + worst.v.restR.toFixed(2) +
          "R everywhere else, over " + worst.v.n + " trades."
      );
    });

    /* --------------------------------------------------------- the rest */

    /* concentration: if three trades carry the whole result, the edge is
       not proven — worth knowing, but it is not a habit to fix */
    if (rows.length >= MIN_TOTAL) {
      const byPL = rows.slice().sort((a, b) => a.c.netPL - b.c.netPL);
      const worst3 = byPL.slice(0, 3);
      const net = rows.reduce((a, x) => a + x.c.netPL, 0);
      const without = net - worst3.reduce((a, x) => a + x.c.netPL, 0);
      out.concentration = {
        net,
        withoutWorst3: without,
        n: worst3.length,
        gap: without - net,
        text:
          "Your three worst trades account for " + Math.abs(without - net).toFixed(2) +
          ". Without them the period reads " + without.toFixed(2) + " instead of " + net.toFixed(2) + ".",
      };
    }

    /* what is working — a screen that only lists faults gets closed once
       and never opened again */
    const best = [];
    [["setup", (t) => t.setup, "setup"], ["session", (t) => t.session, "session"]].forEach(([kind, key, noun]) => {
      const groups = new Map();
      rows.forEach((x) => {
        const k = key(x.t);
        if (!k) return;
        groups.set(k, (groups.get(k) || []).concat([x]));
      });
      let top = null;
      groups.forEach((list, k) => {
        if (list.length < MIN_N) return;
        const v = versusRest(list);
        if (!v || v.gapR <= 0) return;
        if (!top || v.gapR > top.v.gapR) top = { k, v };
      });
      if (top && out.enough)
        best.push({
          kind,
          title: "Your best " + noun + ": " + top.k,
          text:
            top.k + " runs at " + top.v.expR.toFixed(2) + "R against " + top.v.restR.toFixed(2) + "R elsewhere, over " +
            top.v.n + " trades. That is the one to do more of.",
          n: top.v.n,
          expR: top.v.expR,
        });
    });
    out.wins = best;

    /* worst first, and a rule outranks a pattern at equal cost because it
       is the one you can act on tomorrow without arguing about the sample */
    out.findings.sort((a, b) => a.costR - b.costR || (a.basis === "rule" ? -1 : 1));
    return out;
  }

  /* ------------------------------------------------------------- open risk
     What is actually at stake right now. The stat cards are all history;
     this is the only forward-looking number on the dashboard, and it is
     the one that decides whether the next trade is allowed to exist. */

  function openRisk(trades, settings) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const balance = num(s.balance) || DEFAULT_SETTINGS.balance;

    const open = (trades || [])
      .map((t) => ({ t, c: compute(t) }))
      .filter((x) => x.c.open);

    let risk = 0;
    let unknown = 0;
    open.forEach((x) => {
      if (x.c.riskMoney === null) unknown++;
      else risk += Math.abs(x.c.riskMoney);
    });

    return {
      n: open.length,
      rows: open,
      riskMoney: risk,
      riskPct: balance ? (risk / balance) * 100 : null,
      unknown,
      /* three positions each risking the full rule is a three percent day
         waiting to happen, so the cap is compared against the daily stop */
      cap: num(s.maxDailyLossPct) || null,
      over: num(s.maxDailyLossPct) > 0 && balance ? (risk / balance) * 100 > num(s.maxDailyLossPct) : false,
    };
  }

  function stats(trades, settings) {
    const closed = trades.filter((t) => !compute(t).open && compute(t).result !== "Open");
    const rows = closed.map((t) => compute(t));
    const wins = rows.filter((r) => r.netPL > 0);
    const losses = rows.filter((r) => r.netPL < 0);

    const grossWin = wins.reduce((a, r) => a + r.netPL, 0);
    const grossLoss = Math.abs(losses.reduce((a, r) => a + r.netPL, 0));
    const withR = rows.filter((r) => r.r !== null);

    const netPL = rows.reduce((a, r) => a + r.netPL, 0);
    const winRate = rows.length ? (wins.length / rows.length) * 100 : null;
    const avgWinR = wins.length
      ? wins.filter((r) => r.r !== null).reduce((a, r) => a + r.r, 0) / (wins.filter((r) => r.r !== null).length || 1)
      : null;
    const avgLossR = losses.length
      ? losses.filter((r) => r.r !== null).reduce((a, r) => a + r.r, 0) / (losses.filter((r) => r.r !== null).length || 1)
      : null;

    /* expectancy in R — the number that actually predicts survival */
    const expectancy = withR.length ? withR.reduce((a, r) => a + r.r, 0) / withR.length : null;

    /* equity curve and peak-to-trough drawdown, in account currency */
    let equity = num((settings || {}).balance) || DEFAULT_SETTINGS.balance;
    let peak = equity;
    let maxDD = 0;
    const curve = [{ t: null, equity }];
    closed
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .forEach((t) => {
        equity += compute(t).netPL;
        peak = Math.max(peak, equity);
        maxDD = Math.max(maxDD, peak ? ((peak - equity) / peak) * 100 : 0);
        curve.push({ t: t.date, equity });
      });

    const avgRisk = rows.filter((r) => r.riskPct !== null);

    return {
      count: trades.length,
      closed: rows.length,
      open: trades.length - rows.length,
      netPL,
      winRate,
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : null,
      expectancy,
      avgWinR,
      avgLossR,
      avgRiskPct: avgRisk.length ? avgRisk.reduce((a, r) => a + r.riskPct, 0) / avgRisk.length : null,
      maxDrawdownPct: maxDD,
      curve,
      discipline: trades.length
        ? Math.round(trades.reduce((a, t) => a + discipline(t, settings), 0) / trades.length)
        : null,
    };
  }

  /* Consecutive days with at least one logged trade, counting back from
     today. The streak is the cheapest retention mechanic that also
     happens to make the user better. */
  /* ---------------------------------------------------------- guardrails
     The forward-looking half of discipline. `discipline()` grades a trade
     that has already happened; this looks at today and says whether the
     next one should be taken at all.

     Everything is derived, nothing is stored: the rails are settings, the
     evidence is the trade log, so there is no state to get out of sync.
     Returns breaches even when guardrailsOn is false, with `muted: true`,
     because a user who switched them off should still be able to see what
     they switched off. */
  /* local calendar day, not UTC — a trade at 1am in Kampala belongs to
     that day, and toISOString would file it under the one before */
  function dayKey(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function guardrails(trades, settings, now) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const today = dayKey(now || new Date());
    const list = (trades || []).slice();

    const todays = list.filter((t) => String(t.date || "").slice(0, 10) === today);
    const closedToday = todays.filter((t) => !compute(t).open);

    const netToday = closedToday.reduce((a, t) => a + compute(t).netPL, 0);
    const balance = num(s.balance) || DEFAULT_SETTINGS.balance;
    const lossPct = netToday < 0 ? (Math.abs(netToday) / balance) * 100 : 0;

    /* consecutive losses, newest first, across days — a losing streak does
       not politely reset at midnight */
    const closed = list
      .filter((t) => !compute(t).open)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    let run = 0;
    for (const t of closed) {
      if (compute(t).netPL < 0) run++;
      else break;
    }

    const breaches = [];
    if (num(s.maxDailyLossPct) > 0 && lossPct >= num(s.maxDailyLossPct))
      breaches.push({
        kind: "dailyLoss",
        text:
          "You are down " + lossPct.toFixed(2) + "% today, at or past your " +
          num(s.maxDailyLossPct) + "% daily stop. The rule says the day is over.",
      });

    if (num(s.maxTradesPerDay) > 0 && todays.length >= num(s.maxTradesPerDay))
      breaches.push({
        kind: "tradeCount",
        text:
          todays.length + " trades logged today, against your limit of " +
          num(s.maxTradesPerDay) + ". Over-trading is the most common way a good system loses money.",
      });

    if (num(s.coolOffAfterLosses) > 0 && run >= num(s.coolOffAfterLosses))
      breaches.push({
        kind: "coolOff",
        text:
          run + " losses in a row. Your cool-off rule is " + num(s.coolOffAfterLosses) +
          " — step away before the next entry, not after it.",
      });

    return {
      today,
      tradesToday: todays.length,
      netToday,
      lossPctToday: lossPct,
      consecutiveLosses: run,
      breaches,
      muted: !s.guardrailsOn,
      blocked: s.guardrailsOn && breaches.length > 0,
    };
  }

  function streak(trades) {
    const days = new Set(trades.map((t) => String(t.date || "").slice(0, 10)).filter(Boolean));
    if (!days.size) return 0;
    const d = new Date();
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) n++;
      else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  /* ---------------------------------------------------------- public API */

  const api = {
    driver: () => driver.name,
    storageBlocked: () => storageBlocked,
    /* True once a write had to drop chart screenshots to fit the quota. */
    imagesShed: () => shedImages,
    vocab: { EMOTIONS, SETUPS, SESSIONS, MARKETS },

    /* swap in a backend later without touching a screen */
    useDriver(next) {
      driver = next;
      emit("*");
    },

    settings: {
      get() {
        return Object.assign({}, DEFAULT_SETTINGS, driver.get("settings"));
      },
      patch(partial) {
        const out = driver.patch("settings", partial);
        emit("settings");
        return Object.assign({}, DEFAULT_SETTINGS, out);
      },
      /* back to defaults — used by the reset in settings */
      clear() {
        driver.clear("settings");
        emit("settings");
        return Object.assign({}, DEFAULT_SETTINGS);
      },
    },

    /* A trade the user has planned on another screen but not yet logged.
       The calculators write one and the journal consumes it exactly once,
       which is what keeps planned risk and logged risk the same number
       instead of two numbers that happen to be typed twice. */
    draft: {
      get() {
        const d = driver.get("draft");
        return d && Object.keys(d).length ? d : null;
      },
      set(partial) {
        driver.clear("draft");
        const out = driver.patch("draft", partial);
        emit("draft");
        return out;
      },
      take() {
        const d = api.draft.get();
        if (d) {
          driver.clear("draft");
          emit("draft");
        }
        return d;
      },
      clear() {
        driver.clear("draft");
        emit("draft");
      },
    },

    trades: {
      list() {
        return driver
          .list("trades")
          .slice()
          .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      },
      find(id) {
        return driver.list("trades").find((t) => t.id === id) || null;
      },
      save(trade) {
        const now = new Date().toISOString();
        const record = Object.assign(
          {
            id: uid("t"),
            createdAt: now,
            exits: [],
            tags: [],
            fees: 0,
            account: api.settings.get().accountName,
          },
          trade
        );
        record.updatedAt = now;
        if (!record.balanceAtOpen) record.balanceAtOpen = api.settings.get().balance;
        driver.put("trades", record);
        emit("trades");
        return record;
      },
      remove(id) {
        const ok = driver.remove("trades", id);
        emit("trades");
        return ok;
      },
      clear() {
        driver.clear("trades");
        emit("trades");
      },
    },

    /* ------------------------------------------------------------ learn
       Lesson progress, quiz results and the missed-question review deck.
       Content lives in assets/lessons.js and gating lives in learn.js —
       this only persists what the user did, through the same driver as
       everything else, so a rest driver later needs no screen changes.

       Shape:
         read     { lessonId: ISO timestamp of first completion }
         notes    { lessonId: the user's own note on that lesson }
         quizzes  { blockId: { passed, best, attempts, lastAt, missed[] } }
         review   { questionId: { box, due, seen, lapses } }  Leitner boxes
         last     the lesson to resume at */
    learn: {
      get() {
        const raw = driver.get("learn") || {};
        return {
          read: raw.read || {},
          notes: raw.notes || {},
          quizzes: raw.quizzes || {},
          review: raw.review || {},
          last: raw.last || "",
          startedAt: raw.startedAt || "",
        };
      },

      /* Completing a lesson is idempotent: the first timestamp is kept, so
         re-reading a lesson never inflates the activity record. */
      markRead(lessonId) {
        const cur = api.learn.get();
        if (!cur.read[lessonId]) cur.read[lessonId] = new Date().toISOString();
        cur.last = lessonId;
        if (!cur.startedAt) cur.startedAt = new Date().toISOString();
        driver.patch("learn", cur);
        emit("learn");
        return cur;
      },

      unread(lessonId) {
        const cur = api.learn.get();
        delete cur.read[lessonId];
        driver.patch("learn", cur);
        emit("learn");
        return cur;
      },

      seen(lessonId) {
        const cur = api.learn.get();
        cur.last = lessonId;
        if (!cur.startedAt) cur.startedAt = new Date().toISOString();
        driver.patch("learn", cur);
        return cur;
      },

      note(lessonId, text) {
        const cur = api.learn.get();
        if (text && String(text).trim()) cur.notes[lessonId] = String(text);
        else delete cur.notes[lessonId];
        driver.patch("learn", cur);
        emit("learn");
        return cur;
      },

      /* A quiz result. `best` never goes down and `passed` never goes back
         to false — a gate that reopens because of a later practice attempt
         would punish revision, which is the opposite of the intent. */
      recordQuiz(blockId, result) {
        const cur = api.learn.get();
        const prev = cur.quizzes[blockId] || { passed: false, best: 0, attempts: 0 };
        const pct = num(result.pct) || 0;
        cur.quizzes[blockId] = {
          passed: prev.passed || !!result.passed,
          best: Math.max(num(prev.best) || 0, pct),
          last: pct,
          attempts: (num(prev.attempts) || 0) + 1,
          lastAt: new Date().toISOString(),
          missed: Array.isArray(result.missed) ? result.missed : [],
        };
        driver.patch("learn", cur);
        emit("learn");
        return cur.quizzes[blockId];
      },

      /* Spaced repetition over the questions you got wrong. Five Leitner
         boxes, doubling intervals: a question answered correctly moves up
         a box, a lapse drops it to box 1. Cheap, and it is the difference
         between passing a gate and remembering a month later. */
      schedule(questionId, correctly) {
        const DAYS = [0, 1, 3, 7, 21];
        const cur = api.learn.get();
        const prev = cur.review[questionId] || { box: 0, lapses: 0, seen: 0 };
        const box = correctly ? Math.min(4, (num(prev.box) || 0) + 1) : 0;
        const due = new Date(Date.now() + DAYS[box] * 86400000).toISOString();
        cur.review[questionId] = {
          box,
          due,
          seen: (num(prev.seen) || 0) + 1,
          lapses: (num(prev.lapses) || 0) + (correctly ? 0 : 1),
          retired: box >= 4,
        };
        driver.patch("learn", cur);
        emit("learn");
        return cur.review[questionId];
      },

      /* Questions due for review now, oldest due first. */
      due(limit) {
        const review = api.learn.get().review;
        const now = Date.now();
        return Object.keys(review)
          .filter((id) => !review[id].retired && new Date(review[id].due).getTime() <= now)
          .sort((a, b) => new Date(review[a].due) - new Date(review[b].due))
          .slice(0, limit || 20);
      },

      clear() {
        driver.clear("learn");
        emit("learn");
        return api.learn.get();
      },
    },

    /* ---------------------------------------------------------- academy
       The1% Academy masterclasses: enrolment, lesson completion, final
       quiz results and certificates. Kept apart from `learn` (the core
       path) so either can be reset without touching the other.

       Shape:
         enrolled  { courseId: ISO timestamp }
         done      { courseId: { lessonId: ISO timestamp } }
         quiz      { courseId: { best, passed, attempts, lastAt, passedAt } }
         last      { courseId: lessonId }   where to resume */
    academy: {
      get() {
        const raw = driver.get("academy") || {};
        return {
          enrolled: raw.enrolled || {},
          done: raw.done || {},
          quiz: raw.quiz || {},
          last: raw.last || {},
        };
      },
      _save(cur) {
        driver.patch("academy", cur);
        emit("academy");
        return cur;
      },
      enroll(courseId) {
        const cur = api.academy.get();
        if (!cur.enrolled[courseId]) cur.enrolled[courseId] = new Date().toISOString();
        return api.academy._save(cur);
      },
      leave(courseId) {
        const cur = api.academy.get();
        delete cur.enrolled[courseId];
        return api.academy._save(cur);
      },
      markDone(courseId, lessonId) {
        const cur = api.academy.get();
        cur.done[courseId] = cur.done[courseId] || {};
        if (!cur.done[courseId][lessonId]) cur.done[courseId][lessonId] = new Date().toISOString();
        cur.last[courseId] = lessonId;
        return api.academy._save(cur);
      },
      unmark(courseId, lessonId) {
        const cur = api.academy.get();
        if (cur.done[courseId]) delete cur.done[courseId][lessonId];
        return api.academy._save(cur);
      },
      seen(courseId, lessonId) {
        const cur = api.academy.get();
        cur.last[courseId] = lessonId;
        driver.patch("academy", cur);
        return cur;
      },
      /* best never goes down and a pass is never revoked, same rule as
         the core path's gates */
      recordQuiz(courseId, pct, passed) {
        const cur = api.academy.get();
        const prev = cur.quiz[courseId] || { best: 0, passed: false, attempts: 0 };
        cur.quiz[courseId] = {
          best: Math.max(num(prev.best) || 0, pct),
          last: pct,
          passed: prev.passed || !!passed,
          attempts: (num(prev.attempts) || 0) + 1,
          lastAt: new Date().toISOString(),
          passedAt: prev.passedAt || (passed ? new Date().toISOString() : ""),
        };
        return api.academy._save(cur);
      },
      clear() {
        driver.clear("academy");
        emit("academy");
        return api.academy.get();
      },
    },

    compute,
    discipline,
    guardrails,
    leaks,
    openRisk,
    stats,
    streak,
    uid,
  };

  return api;
})();
