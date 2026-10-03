/* TheOnePercent — sign-up page behaviour (pages/sign-up.html)
   -------------------------------------------------------------------
   Same logic as the original inline script (country->currency/timezone
   sync, simulated username check, password strength meter, confirm
   match, terms gate), plus: on submit, save a session profile via
   Shell.saveProfile() so the shared shell renders logged-in everywhere
   else, then hand off to onboarding. No backend in Phase 1 — this is a
   design-accurate front end, not a real account system yet.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  const countrySel = $("#country");
  const currencySel = $("#currency");
  const tzSel = $("#timezone");
  const usernameInput = $("#username");
  const usernameHint = $("#username-hint");
  const pw = $("#signup-password");
  const strengthFill = $("#strength-fill");
  const strengthHint = $("#strength-hint");
  const confirmInput = $("#confirm");
  const matchHint = $("#match-hint");
  const termsCheckbox = $("#terms");
  const submitBtn = $("#signup-submit");
  const form = $("#signup-form");
  const googleBtn = $("#google-signup");

  /* ------------------------------------------------------------ country -> currency/timezone */

  function syncFromCountry() {
    const opt = countrySel.selectedOptions[0];
    currencySel.value = opt.dataset.currency;
    tzSel.value = opt.dataset.tz;
  }
  countrySel.addEventListener("change", syncFromCountry);
  syncFromCountry();

  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = [...tzSel.options].find((o) => o.value === browserTz);
    if (match) tzSel.value = browserTz;
  } catch (e) {
    /* Intl not available — keep the country-derived default. */
  }

  /* ------------------------------------------------------------ username availability (simulated) */

  const taken = ["admin", "trader", "kampala_kev", "test"];
  usernameInput.addEventListener("input", () => {
    const v = usernameInput.value.trim().toLowerCase();
    usernameHint.classList.remove("is-ok", "is-err");
    if (!v) {
      usernameHint.textContent = "Only this name appears on the leaderboard.";
      return;
    }
    if (taken.includes(v)) {
      usernameHint.textContent = "Already taken — try another.";
      usernameHint.classList.add("is-err");
    } else {
      usernameHint.textContent = "Available.";
      usernameHint.classList.add("is-ok");
    }
  });

  /* ------------------------------------------------------------ password strength */

  pw.addEventListener("input", () => {
    const v = pw.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (v.length >= 12) score++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    const pct = (score / 4) * 100;
    strengthFill.style.width = pct + "%";
    const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const weak = css("--down") || "#c7303a";
    const mid = css("--warn-ink") || "#8a6416";
    const good = css("--up") || "#14824a";
    const colors = [weak, weak, mid, good, good];
    strengthFill.style.background = colors[score];
    const labels = ["Too short", "Weak", "Fair", "Strong", "Strong"];
    strengthHint.textContent = v
      ? labels[score] + " · 12+ characters, mixed case, a number"
      : "Use 12+ characters, mixed case and a number.";
    checkMatch();
  });

  /* ------------------------------------------------------------ confirm match */

  function checkMatch() {
    matchHint.classList.remove("is-ok", "is-err");
    if (!confirmInput.value) {
      matchHint.textContent = "";
      return;
    }
    if (confirmInput.value === pw.value) {
      matchHint.textContent = "Passwords match.";
      matchHint.classList.add("is-ok");
    } else {
      matchHint.textContent = "Passwords don't match.";
      matchHint.classList.add("is-err");
    }
  }
  confirmInput.addEventListener("input", checkMatch);

  /* ------------------------------------------------------------ terms gate */

  termsCheckbox.addEventListener("change", () => {
    submitBtn.disabled = !termsCheckbox.checked;
  });

  /* ------------------------------------------------------------ submit */

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const profile = {
      firstName: $("#first-name").value.trim(),
      middleName: $("#middle-name").value.trim(),
      lastName: $("#last-name").value.trim(),
      name: $("#first-name").value.trim(),
      username: usernameInput.value.trim(),
      email: $("#signup-email").value.trim(),
      phone: (countrySel && $("#dial-code").value) + " " + $("#phone").value.trim(),
      country: countrySel.value,
      currency: currencySel.value,
      timezone: tzSel.value,
      dob: $("#dob").value,
    };

    if (window.Shell && Shell.saveProfile) {
      Shell.saveProfile(profile);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";

    setTimeout(() => {
      window.location.href = "/onboarding";
    }, 450);
  });

  googleBtn.addEventListener("click", () => {
    googleBtn.disabled = true;
    googleBtn.textContent = "Connecting to Google…";
    setTimeout(() => {
      if (window.Shell && Shell.saveProfile) {
        Shell.saveProfile({ name: "Trader", email: "trader@gmail.com" });
      }
      window.location.href = "/onboarding";
    }, 500);
  });
})();