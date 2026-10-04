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

  /* ------------------------------------------------------------ username availability (checked against accounts) */

  const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
  let usernameOk = true;
  let usernameTimer = null;
  usernameInput.addEventListener("input", () => {
    const v = usernameInput.value.trim().toLowerCase();
    usernameHint.classList.remove("is-ok", "is-err");
    clearTimeout(usernameTimer);
    if (!v) {
      usernameOk = true;
      usernameHint.textContent = "Only this name appears on the leaderboard.";
      return;
    }
    if (!USERNAME_RE.test(v)) {
      usernameOk = false;
      usernameHint.textContent = "3–24 characters: letters, numbers and _ only.";
      usernameHint.classList.add("is-err");
      return;
    }
    usernameOk = false;
    usernameHint.textContent = "Checking…";
    usernameTimer = setTimeout(async () => {
      const { data, error } = await Cloud.client.rpc("username_available", { name: v });
      if (usernameInput.value.trim().toLowerCase() !== v) return;
      if (error) { usernameOk = true; usernameHint.textContent = "Couldn't check right now — we'll confirm when you sign up."; return; }
      usernameOk = !!data;
      usernameHint.textContent = data ? "Available." : "Already taken — try another.";
      usernameHint.classList.add(data ? "is-ok" : "is-err");
    }, 400);
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
      : "At least 8 characters. 12+ with mixed case and a number is stronger.";
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

    const password = pw.value;
    matchHint.classList.remove("is-ok", "is-err");
    const fail = (msg) => { matchHint.textContent = msg; matchHint.classList.add("is-err"); };
    if (!profile.firstName || !profile.lastName) return fail("Enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return fail("Enter a valid email address.");
    if (!profile.dob) return fail("Enter your date of birth.");
    const dob = new Date(profile.dob + "T00:00:00");
    const adult = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
    if (isNaN(dob) || adult > new Date()) return fail("You must be 18 or older to create an account.");
    if (!usernameOk) return fail("Pick a different username.");
    if (password.length < 8) return fail("Password must be at least 8 characters.");
    if (password !== confirmInput.value) return fail("Passwords don't match.");

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";

    Cloud.client.auth
      .signUp({
        email: profile.email,
        password,
        options: {
          data: {
            first_name: profile.firstName,
            middle_name: profile.middleName,
            last_name: profile.lastName,
            username: profile.username.toLowerCase() || null,
            phone: profile.phone.trim(),
            country: profile.country,
            currency: profile.currency,
            timezone: profile.timezone,
            dob: profile.dob,
          },
          emailRedirectTo: new URL(window.OP_FLASK ? "/onboarding" : "onboarding.html", window.location.href).href,
        },
      })
      .then(({ data, error }) => {
        if (error) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create account";
          fail(/already registered/i.test(error.message) ? "An account with this email already exists. Try logging in." : /username/i.test(error.message) ? "That username was just taken — pick another." : error.message);
          return;
        }
        // With email confirmation on, Supabase answers an existing address with a
        // user that has no identities and sends nothing. Say so instead of
        // telling them to check an inbox that will stay empty.
        if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create account";
          fail("An account with this email already exists. Try logging in.");
          return;
        }
        // Save locally only once the account really exists.
        if (window.Shell && Shell.saveProfile) Shell.saveProfile(profile);
        if (data.session) {
          window.location.href = window.OP_FLASK ? "/onboarding" : "onboarding.html";
          return;
        }
        form.innerHTML =
          '<h2>Check your email</h2><p>We sent a confirmation link to <b></b>. Click it to finish creating your account.</p><p><a class="auth-link" href="' + (window.OP_FLASK ? "/login" : "login.html") + '">Back to log in</a></p>';
        form.querySelector("b").textContent = profile.email;
      })
      .catch(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create account";
        fail("Can't reach the server. Check your connection and try again.");
      });
  });

  document.querySelectorAll("[data-provider]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const provider = b.dataset.provider === "microsoft" ? "azure" : b.dataset.provider;
      Cloud.client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL(window.OP_FLASK ? "/login" : "login.html", window.location.href).href.split("#")[0].split("?")[0] },
      }).then(({ error }) => {
        if (error) { matchHint.textContent = "That sign-in option isn't available right now. Use the form below."; matchHint.classList.add("is-err"); }
      });
    }, true);
  });
})();
