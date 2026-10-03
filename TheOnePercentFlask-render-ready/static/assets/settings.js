/* TheOnePercent — settings behaviour (pages/settings.html)
   -------------------------------------------------------------------
   Step 7 of the build order. Until now the "Account settings" link in
   the nav went to "#", which meant the only way to change a balance was
   the account strip on the calculators screen.

   Three rules this screen follows:

   1. Save on change, never on a Save button. A settings page with a
      submit button invites the user to edit five fields and lose four of
      them by navigating away. Every control here writes immediately and
      says so.
   2. Show the consequence, not the value. A 1% rule means nothing; "10
      USD a trade, 69 losses to halve the account" means something. Every
      number that has a consequence prints it underneath.
   3. Everything goes through Store and Shell. No storage access here.

   Account numbers → Store.settings. Markets and experience →
   Shell.saveProfile. Theme → Theme.set. That split is the same one the
   onboarding screen uses.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const I = window.Instruments;

  const esc = (s) =>
    String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  const num = (el) => {
    const n = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const settings = () => Store.settings.get();

  function money(n, code) {
    if (!Number.isFinite(n)) return "—";
    const dp = I ? I.decimals(code) : 2;
    return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) + " " + code;
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 2600);
  }

  /* ------------------------------------------------------------ account */

  function fillCurrencies() {
    const sel = $("#st-currency");
    const list = I ? I.CURRENCIES : [{ code: "USD", name: "US dollar" }];
    sel.innerHTML = list.map((c) => '<option value="' + c.code + '">' + esc(c.code + " — " + c.name) + "</option>").join("");
  }

  /* A short, honest time-zone list: the user's own resolved zone first,
     then the African and market zones this product actually cares about.
     A full IANA list is 600 entries of noise for a trading journal. */
  function fillTimezones() {
    const sel = $("#st-tz");
    const mine = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch (e) {
        return "UTC";
      }
    })();
    const zones = [
      mine,
      "Africa/Kampala",
      "Africa/Nairobi",
      "Africa/Lagos",
      "Africa/Johannesburg",
      "Africa/Cairo",
      "Europe/London",
      "Europe/Berlin",
      "America/New_York",
      "America/Chicago",
      "Asia/Dubai",
      "Asia/Tokyo",
      "Australia/Sydney",
      "UTC",
    ].filter((z, i, a) => z && a.indexOf(z) === i);

    sel.innerHTML = zones
      .map((z) => '<option value="' + esc(z) + '">' + esc(z === mine ? z + " — this device" : z) + "</option>")
      .join("");
  }

  function paintAccount() {
    const s = settings();
    $("#st-name").value = s.accountName || "";
    $("#st-currency").value = s.currency;
    $("#st-balance").value = s.balance;
    $("#st-risk").value = s.riskPct;
    $("#st-minrr").value = s.minRR;
    if (!$$("#st-tz option").some((o) => o.value === s.timezone)) {
      $("#st-tz").insertAdjacentHTML("afterbegin", '<option value="' + esc(s.timezone) + '">' + esc(s.timezone) + "</option>");
    }
    $("#st-tz").value = s.timezone;

    $("#st-guard-on").checked = s.guardrailsOn !== false;
    $("#st-maxloss").value = s.maxDailyLossPct;
    $("#st-maxtrades").value = s.maxTradesPerDay;
    $("#st-cooloff").value = s.coolOffAfterLosses;

    paintConsequences();
  }

  function paintConsequences() {
    const s = settings();
    const risk = (s.balance * s.riskPct) / 100;

    $("#st-balance-note").textContent =
      "Trades already logged keep the balance they were opened against, so changing this never rewrites your history — " +
      "it only changes what the next trade is sized from.";

    $("#st-risk-note").textContent =
      "At " + s.riskPct + "% of " + money(s.balance, s.currency) + " that is " + money(risk, s.currency) +
      " on a trade, and " + Math.ceil(Math.log(0.5) / Math.log(1 - s.riskPct / 100)) +
      " straight losses to halve the account. The discipline score gives full marks to a plan that risks no more than this " +
      "and aims for at least " + s.minRR + "R.";

    paintGuardLive();
  }

  /* The live state of the rails, so the numbers above are not abstract */
  function paintGuardLive() {
    const s = settings();
    const g = Store.guardrails(Store.trades.list(), s);
    const box = $("#guard-live");

    const rail = (label, value, limit, hot) =>
      '<div class="gl' + (hot ? " hot" : "") + '">' +
      "<span>" + esc(label) + "</span><b>" + esc(value) + "</b><small>" + esc(limit) + "</small></div>";

    box.innerHTML =
      rail(
        "Today's P&L",
        money(g.netToday, s.currency),
        s.maxDailyLossPct > 0 ? "stop at −" + s.maxDailyLossPct + "%" : "no daily stop",
        g.breaches.some((b) => b.kind === "dailyLoss")
      ) +
      rail(
        "Trades today",
        String(g.tradesToday),
        s.maxTradesPerDay > 0 ? "limit " + s.maxTradesPerDay : "no limit",
        g.breaches.some((b) => b.kind === "tradeCount")
      ) +
      rail(
        "Losses in a row",
        String(g.consecutiveLosses),
        s.coolOffAfterLosses > 0 ? "cool off at " + s.coolOffAfterLosses : "no cool-off",
        g.breaches.some((b) => b.kind === "coolOff")
      );

    if (g.breaches.length && g.muted)
      box.insertAdjacentHTML(
        "beforeend",
        '<p class="gl-note">' + esc(g.breaches.length === 1 ? "One rule is broken right now" : g.breaches.length + " rules are broken right now") +
          " and warnings are switched off, so nothing will say so on the journal.</p>"
      );
    else if (g.breaches.length)
      box.insertAdjacentHTML("beforeend", '<p class="gl-note hot">' + esc(g.breaches[0].text) + "</p>");
  }

  function wireAccount() {
    const save = (patch, msg) => {
      Store.settings.patch(patch);
      paintConsequences();
      toast(msg || "Saved");
    };

    $("#st-name").addEventListener("change", (e) => save({ accountName: e.target.value.trim() || "Demo account" }, "Account name saved"));
    $("#st-currency").addEventListener("change", (e) => save({ currency: e.target.value }, "Currency saved — every screen now reads " + e.target.value));

    $("#st-balance").addEventListener("change", () => {
      const v = num($("#st-balance"));
      if (v === null || v <= 0) return toast("A balance has to be a number above zero");
      save({ balance: v, balanceSet: true }, "Balance saved");
    });

    $("#st-risk").addEventListener("change", () => {
      const v = num($("#st-risk"));
      if (v === null || v <= 0 || v > 100) return toast("Risk has to be between 0 and 100%");
      if (v > 5) toast("Saved — but " + v + "% a trade is a fast way to lose an account");
      else toast("Risk rule saved");
      Store.settings.patch({ riskPct: v });
      paintConsequences();
    });

    $("#st-minrr").addEventListener("change", () => {
      const v = num($("#st-minrr"));
      if (v === null || v <= 0) return toast("A minimum R:R has to be above zero");
      save({ minRR: v }, "Minimum R:R saved");
    });

    $("#st-tz").addEventListener("change", (e) => save({ timezone: e.target.value }, "Time zone saved"));

    $("#st-guard-on").addEventListener("change", (e) =>
      save({ guardrailsOn: e.target.checked }, e.target.checked ? "Guardrails on" : "Guardrails off — nothing will warn you")
    );

    const ints = [
      ["#st-maxloss", "maxDailyLossPct", "Daily loss stop saved"],
      ["#st-maxtrades", "maxTradesPerDay", "Trade limit saved"],
      ["#st-cooloff", "coolOffAfterLosses", "Cool-off rule saved"],
    ];
    ints.forEach(([sel, key, msg]) => {
      $(sel).addEventListener("change", () => {
        const v = num($(sel));
        if (v === null || v < 0) return toast("That has to be zero or more");
        save({ [key]: v }, v === 0 ? "That rail is off now" : msg);
      });
    });
  }

  /* ------------------------------------------------------------ profile */

  const EXPERIENCE = ["New to trading", "Experienced"];

  function profile() {
    return (window.Shell && Shell.profile ? Shell.profile() : null) || { markets: [], experience: "" };
  }

  function paintProfile() {
    const me = profile();
    const picked = (me.markets || []).map((m) => String(m).toLowerCase());

    $("#st-markets").innerHTML = Store.vocab.MARKETS.map(
      (m) =>
        '<button type="button" class="chip-pick" data-market="' + esc(m) + '" aria-pressed="' +
        (picked.includes(m.toLowerCase()) ? "true" : "false") + '">' + esc(m) + "</button>"
    ).join("");

    $("#st-exp").innerHTML = EXPERIENCE.map(
      (e) =>
        '<button type="button" class="chip-pick" data-exp="' + esc(e) + '" aria-pressed="' +
        (String(me.experience || "").toLowerCase() === e.toLowerCase() ? "true" : "false") + '">' + esc(e) + "</button>"
    ).join("");
  }

  function wireProfile() {
    $("#st-markets").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-market]");
      if (!btn) return;
      btn.setAttribute("aria-pressed", String(btn.getAttribute("aria-pressed") !== "true"));
      const markets = $$("#st-markets [aria-pressed='true']").map((b) => b.dataset.market);
      if (window.Shell && Shell.saveProfile) Shell.saveProfile({ markets });
      toast(markets.length ? markets.length + " markets saved" : "No markets selected");
    });

    $("#st-exp").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-exp]");
      if (!btn) return;
      $$("#st-exp [data-exp]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      if (window.Shell && Shell.saveProfile) Shell.saveProfile({ experience: btn.dataset.exp });
      toast("Experience saved");
    });
  }

  /* ------------------------------------------------------------ appearance
     Only dark and light: theme.js deliberately does not consult the OS
     preference, and offering a "system" option here would contradict it.

     The attribute is data-mode, not data-theme: shell.css declares its
     palettes on [data-theme="light"] and [data-theme="dark"], and those
     selectors match ANY element, so a button carrying data-theme="dark"
     quietly redefined every colour variable inside itself and rendered
     dark on the light theme.  */

  function paintTheme() {
    const now = window.Theme ? Theme.current() : "dark";
    $("#st-theme").innerHTML = [
      ["dark", "Dark"],
      ["light", "Light"],
    ]
      .map(
        ([v, label]) =>
          '<button type="button" class="chip-pick" data-mode="' + v + '" aria-pressed="' + (now === v ? "true" : "false") + '">' + label + "</button>"
      )
      .join("");
  }

  function wireTheme() {
    $("#st-theme").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mode]");
      if (!btn || !window.Theme) return;
      Theme.set(btn.dataset.mode);
      paintTheme();
      toast(btn.dataset.mode === "dark" ? "Dark theme" : "Light theme");
    });
    window.addEventListener("themechange", paintTheme);
  }

  /* ------------------------------------------------------------ data */

  function paintData() {
    const trades = Store.trades.list();
    const s = settings();
    const st = Store.stats(trades, s);
    const first = trades.length ? trades[trades.length - 1].date : null;

    const stat = (k, v, n) =>
      '<div class="stat"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + "</div>" +
      (n ? '<div class="n">' + esc(n) + "</div>" : "") + "</div>";

    $("#st-stats").innerHTML =
      stat("Trades stored", String(trades.length), first ? "since " + String(first).slice(0, 10) : "nothing logged yet") +
      stat("Closed", String(st.closed), st.open + " still open") +
      stat("Discipline average", st.discipline === null ? "—" : st.discipline + " / 100", "needs 20 trades to rank") +
      stat("Where it lives", Store.driver() === "local" ? "This device" : Store.driver(), "no server copy yet");

    $("#st-driver").textContent =
      Store.storageBlocked()
        ? "this browser is blocking storage"
        : "stored on this device · " + Store.driver() + " driver";

    const blocked = Store.storageBlocked();
    $("#storage-notice").hidden = !blocked;
    if (blocked)
      $("#storage-note").textContent =
        "Everything still works, but it is held in memory only and will be gone when you close the tab. " +
        "That happens in private windows and embedded previews. Open the site in a normal window to keep your journal.";
  }

  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function exportJson() {
    const payload = {
      app: "TheOnePercent",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: settings(),
      profile: profile(),
      trades: Store.trades.list(),
    };
    download("theonepercent-backup-" + stamp() + ".json", JSON.stringify(payload, null, 2), "application/json");
    toast("Backup downloaded");
  }

  /* CSV is one row per trade with the computed columns included, because a
     spreadsheet that only holds raw inputs makes the user redo the maths. */
  function exportCsv() {
    const s = settings();
    const trades = Store.trades.list();
    if (!trades.length) return toast("No trades to export yet");

    const cols = [
      "date", "symbol", "market", "side", "setup", "session", "entry", "stop", "target",
      "size", "fees", "result", "netPL", "R", "riskPct", "plannedRR", "discipline", "emotion", "tags", "review",
    ];

    const rows = trades.map((t) => {
      const c = Store.compute(t);
      const cell = (v) => {
        const str = v === null || v === undefined ? "" : String(v);
        return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
      };
      return [
        t.date, t.symbol, t.market, t.side, t.setup, t.session, t.entry, t.stop, t.target,
        t.size, t.fees, c.result,
        c.netPL === null ? "" : c.netPL.toFixed(2),
        c.r === null ? "" : c.r.toFixed(2),
        c.riskPct === null ? "" : c.riskPct.toFixed(2),
        c.plannedRR === null ? "" : c.plannedRR.toFixed(2),
        Store.discipline(t, s), t.emotion, (t.tags || []).join(" "), t.review,
      ].map(cell).join(",");
    });

    download("theonepercent-trades-" + stamp() + ".csv", [cols.join(",")].concat(rows).join("\n"), "text/csv");
    toast(trades.length + " trades exported");
  }

  function importJson(text) {
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return toast("That file is not valid JSON");
    }
    if (!data || typeof data !== "object" || !Array.isArray(data.trades))
      return toast("That does not look like a TheOnePercent backup");

    if (!window.confirm("Import " + data.trades.length + " trades and replace your current settings? Your existing trades will be removed.")) return;

    Store.trades.clear();
    data.trades.forEach((t) => Store.trades.save(t));
    if (data.settings && typeof data.settings === "object") Store.settings.patch(data.settings);
    if (data.profile && typeof data.profile === "object" && window.Shell && Shell.saveProfile)
      Shell.saveProfile(data.profile.raw || data.profile);

    paintAccount();
    paintProfile();
    paintData();
    toast(data.trades.length + " trades imported");
  }

  function wireData() {
    $("#st-export-json").addEventListener("click", exportJson);
    $("#st-export-csv").addEventListener("click", exportCsv);
    $("#st-import").addEventListener("click", () => $("#st-file").click());
    $("#st-file").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => importJson(String(reader.result));
      reader.readAsText(file);
      e.target.value = "";
    });

    $("#st-clear-trades").addEventListener("click", () => {
      const n = Store.trades.list().length;
      if (!n) return toast("There are no trades to delete");
      if (!window.confirm("Delete all " + n + " trades? This cannot be undone.")) return;
      Store.trades.clear();
      paintData();
      toast(n + " trades deleted");
    });

    $("#st-clear-all").addEventListener("click", () => {
      if (!window.confirm("Reset the whole account — trades, settings and preferences? This cannot be undone.")) return;
      Store.trades.clear();
      Store.settings.clear ? Store.settings.clear() : Store.settings.patch({});
      if (window.Shell && Shell.saveProfile) Shell.saveProfile({ markets: [], experience: "" });
      window.location.href = "/onboarding";
    });
  }

  /* ------------------------------------------------------------ boot */

  function init() {
    fillCurrencies();
    fillTimezones();
    paintAccount();
    paintProfile();
    paintTheme();
    paintData();

    wireAccount();
    wireProfile();
    wireTheme();
    wireData();

    /* another tab, or the calculators in this one, can change settings */
    window.addEventListener("storechange", (e) => {
      const kind = e.detail && e.detail.kind;
      if (kind === "settings" || kind === "*") paintAccount();
      if (kind === "trades" || kind === "*") {
        paintData();
        paintGuardLive();
      }
    });
  }

  /* shell.js loads after this file and owns the profile */
  if (window.Shell) init();
  else window.addEventListener("load", init);
})();
