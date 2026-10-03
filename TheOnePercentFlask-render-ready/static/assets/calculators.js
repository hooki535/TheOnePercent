/* Calculators and converters (pages/calculators.html)
   -------------------------------------------------------------------
   Step 5 of the build order. Deliberately self-contained: no market-data
   dependency, no journal dependency, useful the minute it loads.

   Three rules this screen keeps:

   1. Nothing is typed twice. Balance, currency and risk rule come from
      Store.settings, and the three fields at the top of the page write
      back to it — so the sizing input and the journal's idea of the
      account can never disagree.

   2. Every instrument fact comes from Instruments. Pip sizes, contract
      sizes and multipliers are not re-declared here, because a pip that
      is 0.0001 on this screen and 0.001 on another is how a calculator
      quietly lies.

   3. The answer is stated in every unit the user's tools speak: lots,
      units, pips and money. Brokers, charts and stops each use a
      different one, and translating between them in your head at the
      moment of entry is exactly when people oversize.

   The one output that matters most is the Log this trade button: it
   writes the sized trade to Store.draft and the journal picks it up, so
   planned risk and logged risk are the same number rather than two.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const I = window.Instruments;

  const settings = () => Store.settings.get();

  /* ------------------------------------------------------------ format */

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  /* money in a named currency, with that currency's own decimal habit —
     shillings do not have meaningful cents and printing them implies a
     precision the rate does not have */
  function inCcy(n, code) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    /* a zero-decimal currency still has to show a small number honestly:
       printing a 0.4-shilling pip value as "0" is a lie the user would
       then multiply by their position size */
    let dp = I.decimals(code);
    if (abs > 0 && abs < 1) dp = Math.max(dp, abs < 0.01 ? 4 : 2);
    const body = abs.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
    return (n < 0 ? "−" : "") + body + " " + code;
  }

  const money = (n) => inCcy(n, settings().currency);

  /* significant-figure friendly: a size can be 0.03 lots or 240,000 units
     and one fixed decimal count is wrong for one of them */
  function qty(n) {
    if (n === null || !Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    const dp = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 6;
    return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  const px = (n, inst) =>
    n === null || !Number.isFinite(n) ? "—" : n.toFixed(inst ? inst.dp : 2);
  const pct = (n, dp) => (n === null || !Number.isFinite(n) ? "—" : n.toFixed(dp === undefined ? 2 : dp) + "%");
  const num = (el) => {
    const v = parseFloat(el && el.value);
    return Number.isFinite(v) ? v : null;
  };

  function cell(k, v, cls) {
    return `<div><div class="k">${esc(k)}</div><div class="v ${cls || ""}">${v}</div></div>`;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.hidden = true;
    }, 2600);
  }

  /* ------------------------------------------------------------ selects */

  function fillInstruments(sel, chosen) {
    const groups = {};
    I.INSTRUMENTS.forEach((i) => {
      (groups[i.market] = groups[i.market] || []).push(i);
    });
    sel.innerHTML = Object.keys(groups)
      .map(
        (g) =>
          `<optgroup label="${esc(g)}">` +
          groups[g]
            .map((i) => `<option value="${esc(i.symbol)}">${esc(i.symbol)} · ${esc(i.name)}</option>`)
            .join("") +
          `</optgroup>`
      )
      .join("");
    if (chosen) sel.value = chosen;
  }

  function fillCurrencies(sel, chosen) {
    sel.innerHTML = I.CURRENCIES.map(
      (c) => `<option value="${esc(c.code)}">${esc(c.code)} — ${esc(c.name)}</option>`
    ).join("");
    if (chosen) sel.value = chosen;
  }

  function fillLeverage(sel, chosen) {
    sel.innerHTML = I.LEVERAGE.map(
      (l) => `<option value="${l.value}">${esc(l.label)}</option>`
    ).join("");
    sel.value = String(chosen || 100);
  }

  /* The instrument the user's onboarding suggests, so the page opens on
     something they actually trade rather than always on EURUSD. Read
     through Shell.profile() — no screen touches storage directly. */
  function preferred() {
    const me = window.Shell && Shell.profile ? Shell.profile() : null;
    const markets = me && Array.isArray(me.markets) ? me.markets : [];
    for (const m of markets) {
      const key = String(m).toLowerCase();
      const match = I.INSTRUMENTS.find(
        (i) => i.market.toLowerCase() === key || i.symbol.toLowerCase() === key || key.indexOf(i.market.toLowerCase()) >= 0
      );
      if (match) return match.symbol;
    }
    return I.INSTRUMENTS[0].symbol;
  }

  /* ------------------------------------------------------------ account strip
     The three settings values, editable here because a calculator whose
     inputs are hidden two screens away is a calculator nobody trusts. */

  function paintAccount() {
    const s = settings();
    $("#s-balance").value = s.balance;
    $("#s-risk").value = s.riskPct;
    fillCurrencies($("#s-currency"), s.currency);
  }

  function wireAccount() {
    const save = () => {
      const balance = num($("#s-balance"));
      const riskPct = num($("#s-risk"));
      const patch = { currency: $("#s-currency").value };
      if (balance !== null && balance > 0) {
        patch.balance = balance;
        patch.balanceSet = true; /* stops onboarding treating it as unset later */
      }
      if (riskPct !== null && riskPct > 0) patch.riskPct = riskPct;
      Store.settings.patch(patch);
      $("#acct-note").textContent = "Saved to your settings.";
      renderAll();
    };
    ["#s-balance", "#s-risk"].forEach((id) => $(id).addEventListener("change", save));
    $("#s-currency").addEventListener("change", save);
  }

  /* ------------------------------------------------------------ 1 · position size */

  function psInputs() {
    const inst = I.find($("#ps-symbol").value);
    const mode = $("#ps-risk-mode").value;
    const s = settings();
    const riskIn = num($("#ps-risk"));
    const riskMoney = mode === "pct" ? (riskIn === null ? null : (s.balance * riskIn) / 100) : riskIn;
    const riskPctOf = mode === "pct" ? riskIn : riskIn === null || !s.balance ? null : (riskIn / s.balance) * 100;
    return {
      inst,
      side: $("#ps-side").value,
      entry: num($("#ps-entry")),
      stop: num($("#ps-stop")),
      target: num($("#ps-target")),
      fees: num($("#ps-fees")) || 0,
      lev: parseFloat($("#ps-lev").value) || 1,
      fx: num($("#ps-fx")),
      riskMoney,
      riskPct: riskPctOf,
    };
  }

  let lastSize = null;

  function renderPositionSize() {
    const v = psInputs();
    const s = settings();
    const out = $("#ps-out");
    const verdict = $("#ps-verdict");

    $("#ps-risk-unit").textContent = $("#ps-risk-mode").value === "pct" ? "% of balance" : "in " + s.currency;
    $("#ps-fx-label").textContent = v.inst ? v.inst.quote + " → " + s.currency : "quote → account";

    if (!v.inst || v.entry === null || v.stop === null || v.riskMoney === null) {
      lastSize = null;
      out.innerHTML =
        cell("Risk", "—") + cell("Stop distance", "—") + cell("Position size", "—") +
        cell("Lots", "—") + cell("Value per pip", "—") + cell("Margin needed", "—");
      verdict.textContent = "Pick an instrument, then type an entry and a stop. Without a stop there is no risk, and without risk there is no size to compute.";
      $("#ps-journal").disabled = true;
      return;
    }

    if (v.entry === v.stop) {
      lastSize = null;
      out.innerHTML = cell("Stop distance", "0") + cell("Position size", "—") + cell("Lots", "—");
      verdict.textContent = "The stop is on top of the entry. That is not a trade with a tight stop, it is a trade with no stop.";
      $("#ps-journal").disabled = true;
      return;
    }

    /* a long with the stop above entry (or the reverse) is almost always a
       typo, and silently sizing it would hide the mistake */
    const wrongSide =
      (v.side === "Long" && v.stop > v.entry) || (v.side === "Short" && v.stop < v.entry);

    const r = I.positionSize({
      instrument: v.inst,
      entry: v.entry,
      stop: v.stop,
      riskMoney: v.riskMoney,
      accountCurrency: s.currency,
      fxOverride: v.fx,
    });

    if (!r) {
      out.innerHTML = cell("Position size", "—");
      verdict.textContent = "That instrument's currency cannot be converted to " + s.currency + " with the rates on file.";
      $("#ps-journal").disabled = true;
      return;
    }

    const margin = r.notionalAccount / (v.lev || 1);
    const rr =
      v.target === null ? null : Math.abs(v.target - v.entry) / Math.abs(v.entry - v.stop);
    const reward = v.target === null ? null : v.riskMoney * rr - v.fees;

    lastSize = { v, r, rr };

    out.innerHTML =
      cell("Risk", money(v.riskMoney), v.riskPct !== null && v.riskPct > s.riskPct ? "warn" : "") +
      cell("Stop distance", qty(r.stopPips) + " pips") +
      cell("Position size", qty(r.units) + " units") +
      cell("Lots", qty(r.lots)) +
      cell("Value per pip", money(r.pipValueAccount)) +
      cell("Margin at 1:" + v.lev, money(margin)) +
      cell("Notional", money(r.notionalAccount)) +
      cell("Planned R:R", rr === null ? "—" : rr.toFixed(2)) +
      cell("If target hits", reward === null ? "—" : money(reward), reward === null ? "" : "up");

    const bits = [];
    if (wrongSide)
      bits.push(
        "Check the direction: a " + v.side.toLowerCase() + " with the stop on the other side of entry is usually a typo."
      );
    if (v.riskPct !== null && v.riskPct > s.riskPct)
      bits.push(
        "That is " + pct(v.riskPct) + " of the account against your own " + pct(s.riskPct) + " rule — " +
        qty((v.riskPct / s.riskPct)) + "× your limit. The rule is the edge; this is the trade that breaks it."
      );
    else if (v.riskPct !== null && v.riskPct > 0)
      bits.push(
        "Inside your " + pct(s.riskPct) + " rule. Risking " + pct(v.riskPct) +
        " a trade, it takes " + Math.ceil(Math.log(0.5) / Math.log(1 - v.riskPct / 100)) +
        " straight losses to halve the account — that is what the rule is buying you."
      );
    if (rr !== null && rr < 1)
      bits.push("The target pays less than the stop risks, so you need to be right more than " + pct((1 / (1 + rr)) * 100, 0) + " of the time to break even.");
    if (margin > s.balance)
      bits.push("The margin alone is more than the account holds at 1:" + v.lev + ".");
    verdict.innerHTML = bits.map(esc).join(" ");

    $("#ps-journal").disabled = false;
  }

  function sendToJournal() {
    if (!lastSize) return;
    const { v, r } = lastSize;
    const draft = {
      symbol: v.inst.symbol,
      market: v.inst.market,
      side: v.side,
      entry: v.entry,
      stop: v.stop,
      target: v.target === null ? "" : v.target,
      size: Number(r.units.toFixed(6)),
      contractValue: v.inst.unitValue,
      fees: v.fees,
      tags: ["sized"],
    };

    Store.draft.set(draft);

    /* Storage is not always available — private windows and embedded
       previews block it, and Store falls back to memory, which does not
       survive a navigation. Carry the draft in the fragment in that case
       so the hand-off still works instead of silently opening a blank
       form. The fragment never reaches a server. */
    let hash = "";
    if (Store.storageBlocked && Store.storageBlocked()) {
      try {
        hash = "#draft=" + encodeURIComponent(JSON.stringify(draft));
      } catch (e) {
        hash = "";
      }
    }

    window.location.href = "/journal" + hash;
  }

  function copySummary() {
    if (!lastSize) return toast("Nothing to copy yet");
    const { v, r, rr } = lastSize;
    const s = settings();
    const text = [
      v.inst.symbol + " " + v.side.toLowerCase(),
      "entry " + px(v.entry, v.inst) + "  stop " + px(v.stop, v.inst) + (v.target === null ? "" : "  target " + px(v.target, v.inst)),
      "risk " + inCcy(v.riskMoney, s.currency) + (v.riskPct === null ? "" : " (" + pct(v.riskPct) + ")"),
      "size " + qty(r.units) + " units = " + qty(r.lots) + " lots",
      "stop " + qty(r.stopPips) + " pips, " + inCcy(r.pipValueAccount, s.currency) + " per pip",
      rr === null ? "" : "planned R:R " + rr.toFixed(2),
    ]
      .filter(Boolean)
      .join("\n");

    const done = () => toast("Copied");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => toast("Could not copy"));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {
        toast("Could not copy");
      }
      ta.remove();
    }
  }

  function seedPositionSize() {
    const sym = preferred();
    fillInstruments($("#ps-symbol"), sym);
    fillLeverage($("#ps-lev"), 100);
    const inst = I.find(sym);
    $("#ps-risk").value = settings().riskPct;
    $("#ps-entry").value = inst.price.toFixed(inst.dp);
    $("#ps-stop").value = (inst.price - 25 * inst.pip).toFixed(inst.dp);
    $("#ps-target").value = (inst.price + 50 * inst.pip).toFixed(inst.dp);
    syncFx("#ps-symbol", "#ps-fx");
  }

  /* quote-currency money in the account currency, using the traded pair's
     own price as the rate where it provides one (see fxToAccount) rather
     than the reference table — so every card agrees with the sizing panel. */
  function toAcct(amountQuote, inst, price) {
    const fx = I.fxToAccount(inst, settings().currency, price);
    if (!Number.isFinite(amountQuote) || !fx) return null;
    return amountQuote * fx;
  }

  /* pre-fill the conversion rate whenever the instrument changes, but never
     overwrite a rate the user typed for the pair they are still on */
  function syncFx(symSel, fxSel) {
    const inst = I.find($(symSel).value);
    const fx = I.fxToAccount(inst, settings().currency, inst && inst.price);
    $(fxSel).value = fx === null ? "" : Number(fx.toPrecision(8));
  }

  /* ------------------------------------------------------------ 2 · risk to reward */

  function renderRR() {
    const entry = num($("#rr-entry"));
    const stop = num($("#rr-stop"));
    const target = num($("#rr-target"));
    const wr = num($("#rr-wr"));
    const out = $("#rr-out");

    if (entry === null || stop === null || target === null || entry === stop) {
      out.innerHTML = cell("R:R", "—") + cell("Break-even win rate", "—");
      $("#rr-note").textContent = "Entry, stop and target. The answer is a ratio, so it needs no instrument and no size.";
      return;
    }

    const rr = Math.abs(target - entry) / Math.abs(entry - stop);
    const beWr = (1 / (1 + rr)) * 100;
    const exp = wr === null ? null : (wr / 100) * rr - (1 - wr / 100);

    out.innerHTML =
      cell("R:R", rr.toFixed(2)) +
      cell("Break-even win rate", pct(beWr, 1)) +
      cell("Expectancy", exp === null ? "—" : (exp > 0 ? "+" : "") + exp.toFixed(2) + "R", exp === null ? "" : exp > 0 ? "up" : "down") +
      cell("Per 100 trades", exp === null ? "—" : (exp * 100 > 0 ? "+" : "") + (exp * 100).toFixed(0) + "R", exp === null ? "" : exp > 0 ? "up" : "down");

    $("#rr-note").textContent =
      exp === null
        ? "Add your win rate and this turns into expectancy — the number that actually predicts survival."
        : exp > 0
        ? "Positive expectancy: at " + pct(wr, 0) + " you make " + exp.toFixed(2) + "R a trade on average. Size small enough to survive the variance and this compounds."
        : "Negative expectancy at " + pct(wr, 0) + ". Either the target has to pay more, or the win rate has to rise — position size cannot fix this.";
  }

  /* ------------------------------------------------------------ 3 · pip value */

  function renderPip() {
    const inst = I.find($("#pv-symbol").value);
    const amt = num($("#pv-size"));
    const unit = $("#pv-unit").value;
    const s = settings();
    const out = $("#pv-out");

    if (!inst || amt === null) {
      out.innerHTML = cell("Per pip", "—") + cell("Per 10 pips", "—");
      $("#pv-note").textContent = "";
      return;
    }

    const lots = unit === "lots" ? amt : amt / inst.contract;
    const perLotQuote = I.pipValuePerLot(inst);
    const quote = perLotQuote * lots;
    const acct = toAcct(quote, inst, inst.price);

    out.innerHTML =
      cell("Per pip", inCcy(acct, s.currency)) +
      cell("Per 10 pips", inCcy(acct === null ? null : acct * 10, s.currency)) +
      cell("In " + inst.quote, inCcy(quote, inst.quote)) +
      cell("One pip is", px(inst.pip, inst));

    $("#pv-note").textContent =
      "One standard lot of " + inst.symbol + " is " + qty(inst.contract) + " units, so a pip moves " +
      inCcy(perLotQuote, inst.quote) + " per lot. Your size of " + qty(lots) + " lots is " + qty(lots * inst.contract) + " units.";
  }

  /* ------------------------------------------------------------ 4 · margin */

  function renderMargin() {
    const inst = I.find($("#mg-symbol").value);
    const lots = num($("#mg-lots"));
    const lev = parseFloat($("#mg-lev").value) || 1;
    const s = settings();
    const out = $("#mg-out");

    if (!inst || lots === null) {
      out.innerHTML = cell("Margin", "—") + cell("Notional", "—");
      $("#mg-note").textContent = "";
      return;
    }

    const units = lots * inst.contract;
    const notionalQuote = units * inst.price * inst.unitValue;
    const notional = toAcct(notionalQuote, inst, inst.price);
    const margin = notional === null ? null : notional / lev;
    const share = margin === null || !s.balance ? null : (margin / s.balance) * 100;

    out.innerHTML =
      cell("Margin needed", inCcy(margin, s.currency), share !== null && share > 50 ? "warn" : "") +
      cell("Notional", inCcy(notional, s.currency)) +
      cell("Of your balance", pct(share, 1), share !== null && share > 50 ? "warn" : "") +
      cell("Free after", inCcy(margin === null ? null : s.balance - margin, s.currency));

    $("#mg-note").textContent =
      share === null
        ? ""
        : share > 100
        ? "You cannot open this position: the margin is more than the account."
        : share > 50
        ? "Over half the account would be tied up as margin, which leaves almost nothing to absorb a drawdown."
        : "Margin is what the broker holds, not what you risk. The stop decides the risk — this only decides whether the position fits.";
  }

  /* ------------------------------------------------------------ 5 · profit and loss */

  function renderSim() {
    const inst = I.find($("#sim-symbol").value);
    const side = $("#sim-side").value;
    const lots = num($("#sim-lots"));
    const entry = num($("#sim-entry"));
    const stop = num($("#sim-stop"));
    const target = num($("#sim-target"));
    const s = settings();
    const out = $("#sim-out");

    if (!inst || lots === null || entry === null) {
      out.innerHTML = cell("If stopped", "—") + cell("If target hits", "—") + cell("R:R", "—");
      $("#sim-note").textContent = "";
      return;
    }

    const units = lots * inst.contract;
    const loss = stop === null ? null : I.outcome({ instrument: inst, units, side, from: entry, to: stop, accountCurrency: s.currency, fees: 0 });
    const win = target === null ? null : I.outcome({ instrument: inst, units, side, from: entry, to: target, accountCurrency: s.currency, fees: 0 });
    const rr = loss && win ? Math.abs(win / loss) : null;
    const lossPct = loss === null || !s.balance ? null : (Math.abs(loss) / s.balance) * 100;

    out.innerHTML =
      cell("If stopped", inCcy(loss, s.currency), "down") +
      cell("If target hits", inCcy(win, s.currency), "up") +
      cell("R:R", rr === null ? "—" : rr.toFixed(2)) +
      cell("Loss as % of account", pct(lossPct, 2), lossPct !== null && lossPct > s.riskPct ? "warn" : "") +
      cell("Per pip", inCcy(toAcct(I.pipValuePerLot(inst) * lots, inst, entry), s.currency)) +
      cell("Position", qty(units) + " units");

    $("#sim-note").textContent =
      lossPct === null
        ? "Add a stop and this tells you what the trade actually costs when it is wrong."
        : lossPct > s.riskPct
        ? "That loss is " + pct(lossPct) + " of the account, past your " + pct(s.riskPct) + " rule. Reduce the lots, not the stop."
        : "A loss here costs " + pct(lossPct) + " of the account. This is the number to make peace with before entry, not after.";
  }

  /* ------------------------------------------------------------ 6 · break-even */

  function renderBreakEven() {
    const inst = I.find($("#be-symbol").value);
    const side = $("#be-side").value;
    const lots = num($("#be-lots"));
    const entry = num($("#be-entry"));
    const spread = num($("#be-spread"));
    const fees = num($("#be-fees")) || 0;
    const s = settings();
    const out = $("#be-out");

    if (!inst || lots === null || entry === null || spread === null) {
      out.innerHTML = cell("Break-even price", "—") + cell("Cost to open", "—");
      $("#be-note").textContent = "";
      return;
    }

    const units = lots * inst.contract;
    const perPipAcct = toAcct(I.pipValuePerLot(inst) * lots, inst, entry);
    /* the spread is already paid the moment you enter; fees are the round trip */
    const spreadCost = perPipAcct === null ? null : perPipAcct * spread;
    const totalCost = spreadCost === null ? null : spreadCost + fees;
    /* price move needed to recover that cost, in pips then in price */
    const pipsNeeded = perPipAcct ? totalCost / perPipAcct : null;
    const dir = side === "Short" ? -1 : 1;
    const bePrice = pipsNeeded === null ? null : entry + dir * pipsNeeded * inst.pip;

    out.innerHTML =
      cell("Break-even price", px(bePrice, inst)) +
      cell("Distance", pipsNeeded === null ? "—" : qty(pipsNeeded) + " pips") +
      cell("Spread costs", inCcy(spreadCost, s.currency)) +
      cell("Total cost", inCcy(totalCost, s.currency));

    $("#be-note").textContent =
      "You start every trade this far behind. On a " + qty(spread) + "-pip spread with " +
      inCcy(fees, s.currency) + " in fees, price has to travel " + qty(pipsNeeded) +
      " pips your way before the trade is worth nothing — which is why scalping a wide spread is arithmetic, not skill.";
  }

  /* ------------------------------------------------------------ 7 · compounding */

  function renderCompound() {
    const start = num($("#cp-start"));
    const rate = num($("#cp-rate"));
    const n = Math.max(0, Math.floor(num($("#cp-n")) || 0));
    const perYear = parseInt($("#cp-period").value, 10);
    const label = { 252: "trading days", 52: "weeks", 12: "months" }[perYear];
    const s = settings();
    const out = $("#cp-out");

    $("#cp-span-unit").textContent = label;

    if (start === null || rate === null || !n) {
      out.innerHTML = cell("Ending balance", "—") + cell("Total gain", "—");
      $("#cp-table").innerHTML = "";
      $("#cp-note").textContent = "";
      return;
    }

    const g = 1 + rate / 100;
    const end = start * Math.pow(g, n);
    const growth = ((end - start) / start) * 100;
    const annual = (Math.pow(g, perYear) - 1) * 100;
    const doubling = Math.log(2) / Math.log(g);

    out.innerHTML =
      cell("Ending balance", inCcy(end, s.currency), "up") +
      cell("Total gain", pct(growth, 1), "up") +
      cell("Annualised", pct(annual, 0), "up") +
      cell("Doubles in", qty(doubling) + " " + label);

    /* a handful of waypoints, because one final number hides the shape */
    const marks = [1, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n]
      .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
      .sort((a, b) => a - b);
    $("#cp-table").innerHTML = marks
      .map(
        (k) =>
          `<div class="ms"><span>${k} ${esc(label)}</span><b>${inCcy(start * Math.pow(g, k), s.currency)}</b></div>`
      )
      .join("");

    $("#cp-note").textContent =
      annual > 500
        ? "That annualises to " + pct(annual, 0) + ", which nobody sustains. The point of this calculator is not the fantasy number — it is that the fantasy number is what " + pct(rate) + " a " + label.replace(/s$/, "") + " actually claims."
        : "Compounding is the whole thesis of the name. It also assumes no drawdown, no missed periods and no withdrawals — so treat it as the ceiling, not the forecast.";
  }

  /* ------------------------------------------------------------ converters */

  function renderCurrency() {
    const amt = num($("#cv-amt"));
    const from = $("#cv-from").value;
    const to = $("#cv-to").value;
    const val = amt === null ? null : I.convert(amt, from, to);
    const one = I.rate(from, to);
    $("#cv-out").innerHTML =
      val === null
        ? "—"
        : `<b>${esc(inCcy(val, to))}</b><small>1 ${esc(from)} = ${one === null ? "—" : esc(Number(one.toPrecision(6)).toLocaleString("en-US"))} ${esc(to)}</small>`;
  }

  function renderPips() {
    const inst = I.find($("#pp-symbol").value);
    const amt = num($("#pp-amt"));
    const unit = $("#pp-unit").value;
    if (!inst || amt === null) return void ($("#pp-out").textContent = "—");

    /* a point is the last decimal a broker quotes; a pip is ten of them on
       a five-digit feed, which is the confusion this converter exists for */
    const pointsPerPip = Math.round(inst.pip / Math.pow(10, -inst.dp));
    let pips;
    if (unit === "pips") pips = amt;
    else if (unit === "points") pips = amt / pointsPerPip;
    else pips = amt / inst.pip;

    $("#pp-out").innerHTML =
      `<b>${esc(qty(pips))} pips</b><small>= ${esc(qty(pips * pointsPerPip))} points = ${esc((pips * inst.pip).toFixed(inst.dp))} in price · one pip is ${esc(String(pointsPerPip))} point${pointsPerPip === 1 ? "" : "s"} on ${esc(inst.symbol)}</small>`;
  }

  function renderLots() {
    const inst = I.find($("#lu-symbol").value);
    const amt = num($("#lu-amt"));
    const unit = $("#lu-unit").value;
    if (!inst || amt === null) return void ($("#lu-out").textContent = "—");

    const lots = unit === "lots" ? amt : amt / inst.contract;
    const units = lots * inst.contract;
    $("#lu-out").innerHTML =
      `<b>${esc(qty(lots))} lots = ${esc(qty(units))} units</b><small>${esc(inst.symbol)}: one lot is ${esc(qty(inst.contract))} units · mini ${esc(qty(lots * 10))} · micro ${esc(qty(lots * 100))}</small>`;
  }

  /* ------------------------------------------------------------ render all */

  /* ------------------------------------------------------------ the picker
     Eight calculators stacked on one page is a filing cabinet, not a tool.
     Whichever one you came for was below the fold, and the two-column grid
     meant the wrong one was always in your eyeline while you typed.

     So: one at a time. The choice lives in the URL fragment, which costs
     nothing and buys three things — the back button works, a link to
     "calculators.html#mg" opens on margin, and the existing deep links from
     the rest of the site keep working unchanged instead of landing on a
     hidden panel. It is deliberately not saved to settings: a UI preference
     is not account data, and writing one on every click would fire a
     storechange across every open screen for nothing. The default is
     position size, which is the one you want most mornings anyway.

     Arrows next to the dropdown are for the case the dropdown is bad at:
     you do not know which calculator you want, and you want to look. */

  const VIEWS = ["ps", "rr", "mg", "pv", "sim", "be", "cp", "conv"];

  /* one line each, in the second person, saying what question it answers —
     a dropdown of eight nouns does not tell a beginner which to pick */
  const WHAT = {
    ps: "How many lots, given your balance, your risk rule and where your stop is. Start here — it is the only one that can stop you oversizing.",
    rr: "Whether the trade is worth taking at all: what you stand to make against what you are risking, and the win rate that would need.",
    mg: "How much of your balance the broker will lock up to hold the position, and what is left for everything else.",
    pv: "What one pip is worth in your account currency, so a 20-pip stop stops being an abstraction.",
    sim: "What a win and a loss on this position would actually do to your balance, in money rather than pips.",
    be: "Where price has to get to before you are level, once the spread and the fees are counted.",
    cp: "What one percent a week compounds to, and how long the numbers you have in mind would really take.",
    conv: "Currency, pips and points, lots and units — the three conversions that come up mid-trade.",
  };

  let view = null;

  function show(which, push) {
    const next = VIEWS.indexOf(which) >= 0 ? which : VIEWS[0];
    view = next;

    $$("[data-calc]").forEach((sec) => {
      const on = sec.getAttribute("data-calc") === next;
      sec.hidden = !on;
      sec.classList.toggle("on", on);
    });

    const sel = $("#calc-which");
    if (sel && sel.value !== next) sel.value = next;
    $("#calc-what").textContent = WHAT[next] || "";

    /* the demo-rates badge is only honest where rates are actually used */
    const warn = $(".notice.demo");
    if (warn) warn.hidden = next === "cp";

    if (push && window.location.hash.slice(1) !== next) {
      /* replaceState, not a new entry per click — the back button should
         leave the page, not walk you through every calculator you tried */
      history.replaceState(null, "", "#" + next);
    }

    renderAll();
  }

  function step(by) {
    const i = VIEWS.indexOf(view);
    show(VIEWS[(i + by + VIEWS.length) % VIEWS.length], true);
  }

  function firstView() {
    const hash = window.location.hash.slice(1);
    return VIEWS.indexOf(hash) >= 0 ? hash : VIEWS[0];
  }

  function wirePicker() {
    $("#calc-which").addEventListener("change", (e) => show(e.target.value, true));
    $("#calc-prev").addEventListener("click", () => step(-1));
    $("#calc-next").addEventListener("click", () => step(1));
    window.addEventListener("hashchange", () => show(window.location.hash.slice(1) || firstView(), false));
    show(firstView(), false);
  }

  function renderAll() {
    renderPositionSize();
    renderRR();
    renderPip();
    renderMargin();
    renderSim();
    renderBreakEven();
    renderCompound();
    renderCurrency();
    renderPips();
    renderLots();
  }

  /* ------------------------------------------------------------ init */

  function init() {
    $("#demo-note").textContent = I.DEMO_NOTE;
    $("#storage-warn").hidden = !Store.storageBlocked();

    paintAccount();
    wireAccount();
    seedPositionSize();

    const s = settings();
    const sym = preferred();
    const inst = I.find(sym);

    /* every card opens on the same instrument and a live price, so the page
       is readable before a single field is touched */
    [["#pv-symbol"], ["#mg-symbol"], ["#sim-symbol"], ["#be-symbol"], ["#pp-symbol"], ["#lu-symbol"]].forEach(
      ([id]) => fillInstruments($(id), sym)
    );
    fillLeverage($("#mg-lev"), 100);
    fillCurrencies($("#cv-from"), "USD");
    fillCurrencies($("#cv-to"), s.currency === "USD" ? "UGX" : s.currency);

    $("#rr-entry").value = inst.price.toFixed(inst.dp);
    $("#rr-stop").value = (inst.price - 25 * inst.pip).toFixed(inst.dp);
    $("#rr-target").value = (inst.price + 50 * inst.pip).toFixed(inst.dp);

    $("#sim-entry").value = inst.price.toFixed(inst.dp);
    $("#sim-stop").value = (inst.price - 25 * inst.pip).toFixed(inst.dp);
    $("#sim-target").value = (inst.price + 50 * inst.pip).toFixed(inst.dp);
    $("#be-entry").value = inst.price.toFixed(inst.dp);
    $("#cp-start").value = s.balance;

    /* one listener per section, on the section — every field inside it is
       live, and no field needs to be wired by name */
    $$("section.panel, .acct").forEach((sec) => {
      sec.addEventListener("input", renderAll);
      sec.addEventListener("change", renderAll);
    });

    $("#ps-symbol").addEventListener("change", () => {
      const i = I.find($("#ps-symbol").value);
      $("#ps-entry").value = i.price.toFixed(i.dp);
      $("#ps-stop").value = (i.price - 25 * i.pip).toFixed(i.dp);
      $("#ps-target").value = (i.price + 50 * i.pip).toFixed(i.dp);
      syncFx("#ps-symbol", "#ps-fx");
      renderAll();
    });

    ["#pv-symbol", "#mg-symbol", "#sim-symbol", "#be-symbol"].forEach((id) =>
      $(id).addEventListener("change", () => {
        const i = I.find($(id).value);
        const target = { "#sim-symbol": "#sim-", "#be-symbol": "#be-" }[id];
        if (target) {
          $(target + "entry").value = i.price.toFixed(i.dp);
          if ($(target + "stop")) $(target + "stop").value = (i.price - 25 * i.pip).toFixed(i.dp);
          if ($(target + "target")) $(target + "target").value = (i.price + 50 * i.pip).toFixed(i.dp);
        }
        renderAll();
      })
    );

    $("#cv-swap").onclick = () => {
      const a = $("#cv-from").value;
      $("#cv-from").value = $("#cv-to").value;
      $("#cv-to").value = a;
      renderCurrency();
    };

    $("#ps-journal").onclick = sendToJournal;
    $("#ps-copy").onclick = copySummary;
    $("#ps-reset").onclick = () => {
      seedPositionSize();
      renderAll();
      toast("Back to your defaults");
    };

    /* a settings change from another tab, or from the rail, must repaint */
    wirePicker();

    window.addEventListener("storechange", (e) => {
      if (!e.detail || e.detail.kind === "settings" || e.detail.kind === "*") {
        paintAccount();
        renderAll();
      }
    });

    renderAll();
  }

  /* shell.js loads after this file, and preferred() reads the profile
     through it — so wait for the shell, exactly as the dashboard does */
  if (window.Shell) init();
  else window.addEventListener("load", init);
})();
