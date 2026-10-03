/* TheOnePercent — onboarding behaviour (pages/onboarding.html)
   -------------------------------------------------------------------
   Three questions, one screen: which markets, how experienced, and what
   the account looks like. Those answers configure the dashboard, the
   calculators and where the lesson path starts (roadmap, Foundation 03).

   Two destinations, on purpose:
     • markets + experience are preferences → Shell.saveProfile()
     • balance, currency, risk % are account settings → Store.settings
   The calculators and the journal read Store.settings, so the third
   question has to land there or sizing silently uses defaults.

   Neither one touches storage directly — that stays inside shell.js and
   store.js, so a real backend later changes those files and nothing here.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const form = $("#ob-form");
  const cards = $$(".ob-card");
  const continueBtn = $("#ob-continue");
  const skipBtn = $("#ob-skip");
  const hint = $("#ob-hint");

  const stepLevel = $("#step-level");
  const barLevel = $("#bar-level");
  const stepAccount = $("#step-account");
  const barAccount = $("#bar-account");
  const stepCount = $("#step-count");

  const ccySel = $("#ob-currency");
  const balInput = $("#ob-balance");
  const riskInput = $("#ob-risk");
  const riskNote = $("#ob-risk-note");

  const num = (el) => {
    const n = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  /* ------------------------------------------------------------ state */

  const chosen = () => cards.filter((c) => c.getAttribute("aria-pressed") === "true");

  const experience = () => {
    const picked = $('input[name="experience"]:checked');
    return picked ? picked.value : "New to trading";
  };

  /* ------------------------------------------------------------ prefill
     Someone re-opening onboarding from the account panel ("Edit
     preferences") should see their current answers, not a blank form. */

  /* Currency list comes from instruments.js so onboarding, the
     calculators and the journal can never drift apart on what is
     supported — one table, three screens. */
  function fillCurrencies() {
    if (!ccySel) return;
    const s = window.Store ? Store.settings.get() : { currency: "USD" };
    const list = window.Instruments ? Instruments.CURRENCIES : [{ code: "USD", name: "US dollar" }];
    ccySel.innerHTML = list
      .map((c) => '<option value="' + c.code + '">' + c.code + " — " + c.name + "</option>")
      .join("");
    ccySel.value = list.some((c) => c.code === s.currency) ? s.currency : "USD";
  }

  function prefillAccount() {
    if (!window.Store) return;
    const s = Store.settings.get();
    /* only prefill a balance the user actually chose — the default is a
       placeholder, and showing it as a value pretends they set it */
    if (s.balanceSet) balInput.value = s.balance;
    riskInput.value = s.riskPct;
  }

  function prefill() {
    const me = window.Shell && Shell.profile ? Shell.profile() : null;
    if (!me) return;

    if (me.markets && me.markets.length) {
      const saved = me.markets.map((m) => String(m).toLowerCase());
      cards.forEach((card) => {
        const value = card.dataset.market.toLowerCase();
        if (saved.includes(value)) card.setAttribute("aria-pressed", "true");
      });
    }

    if (me.experience) {
      const match = $$('input[name="experience"]').find(
        (r) => r.value.toLowerCase() === String(me.experience).toLowerCase()
      );
      if (match) match.checked = true;
    }
  }

  /* ------------------------------------------------------------ progress
     The third dot lights up once a market is chosen, so the bar reflects
     real progress rather than just counting page loads. */

  function paint() {
    const count = chosen().length;
    const ready = count > 0;

    continueBtn.disabled = !ready;

    if (ready) {
      stepLevel.dataset.state = "active";
      barLevel.dataset.filled = "true";
      stepAccount.dataset.state = "active";
      barAccount.dataset.filled = "true";
      stepCount.textContent = "Step 4 of 4";
      hint.textContent =
        count === 1
          ? "1 market selected — you can change this later in settings."
          : count + " markets selected — you can change this later in settings.";
    } else {
      stepLevel.dataset.state = "todo";
      barLevel.dataset.filled = "false";
      stepAccount.dataset.state = "todo";
      barAccount.dataset.filled = "false";
      stepCount.textContent = "Step 2 of 4";
      hint.textContent = "Pick at least one market to continue.";
    }

    paintRisk();
  }

  /* The risk line is the whole product argument in one sentence, so it
     shows the actual shilling figure rather than an abstract percentage. */
  function paintRisk() {
    if (!riskNote) return;
    const bal = num(balInput);
    const risk = num(riskInput);
    const ccy = ccySel ? ccySel.value : "USD";
    if (bal === null || risk === null || bal <= 0 || risk <= 0) {
      riskNote.textContent = "A 1% rule is the default for a reason: it takes 69 losses in a row to halve an account.";
      return;
    }
    const dp = window.Instruments ? Instruments.decimals(ccy) : 2;
    const per = (bal * risk) / 100;
    riskNote.textContent =
      "That is " +
      per.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) +
      " " + ccy + " at risk on a trade, and " +
      Math.ceil(Math.log(0.5) / Math.log(1 - risk / 100)) +
      " straight losses to halve the account.";
  }

  /* ------------------------------------------------------------ events */

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const on = card.getAttribute("aria-pressed") === "true";
      card.setAttribute("aria-pressed", String(!on));
      paint();
    });
  });

  [balInput, riskInput].forEach((el) => el && el.addEventListener("input", paintRisk));
  if (ccySel) ccySel.addEventListener("change", paintRisk);

  function saveAccount() {
    if (!window.Store) return;
    const patch = {};
    const bal = num(balInput);
    const risk = num(riskInput);
    if (ccySel && ccySel.value) patch.currency = ccySel.value;
    if (bal !== null && bal > 0) {
      patch.balance = bal;
      patch.balanceSet = true;
    }
    if (risk !== null && risk > 0 && risk <= 100) patch.riskPct = risk;
    if (Object.keys(patch).length) Store.settings.patch(patch);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!chosen().length) return;

    continueBtn.disabled = true;
    continueBtn.textContent = "Saving…";

    saveAccount();

    if (window.Shell && Shell.saveProfile) {
      Shell.saveProfile({
        markets: chosen().map((c) => c.dataset.market),
        experience: experience(),
        onboardedAt: new Date().toISOString(),
      });
    }

    window.location.href = "/dashboard";
  });

  /* Skipping is allowed — the dashboard has a real empty state that
     prompts for markets, so nobody is trapped here. */
  skipBtn.addEventListener("click", () => {
    if (window.Shell && Shell.saveProfile) {
      Shell.saveProfile({ onboardingSkipped: true });
    }
    window.location.href = "/dashboard";
  });

  /* ------------------------------------------------------------ boot */

  fillCurrencies();
  prefillAccount();
  prefill();
  paint();
})();