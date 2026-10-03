/* TheOnePercent — login page behaviour (pages/login.html)
   -------------------------------------------------------------------
   Phase 1 has no backend yet, so "logging in" means: validate the form,
   then write a session via Shell.saveProfile() and hand off to the
   dashboard. Shell (assets/shell.js) is what actually decides whether
   the nav shows logged-in or logged-out state on every other page, by
   reading that same saved profile — so this is the one place that has
   to set it correctly.
   ------------------------------------------------------------------- */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  const form = $("#login-form");
  const emailInput = $("#email");
  const passwordInput = $("#password");
  const submitBtn = $("#submit-btn");
  const formError = $("#form-error");
  const googleBtn = $("#google-login");
  const toggleBtn = $("#toggle-password");
  const forgotLink = $("#forgot-link");

  /* ------------------------------------------------------------ helpers */

  function fieldError(input, message) {
    const small = document.querySelector(`.auth-error[data-for="${input.id}"]`);
    if (small) small.textContent = message || "";
    input.classList.toggle("field-invalid", !!message);
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = !message;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    let ok = true;

    if (!emailInput.value.trim()) {
      fieldError(emailInput, "Enter your email address.");
      ok = false;
    } else if (!validEmail(emailInput.value.trim())) {
      fieldError(emailInput, "That doesn't look like a valid email.");
      ok = false;
    } else {
      fieldError(emailInput, "");
    }

    if (!passwordInput.value) {
      fieldError(passwordInput, "Enter your password.");
      ok = false;
    } else if (passwordInput.value.length < 8) {
      fieldError(passwordInput, "Password must be at least 8 characters.");
      ok = false;
    } else {
      fieldError(passwordInput, "");
    }

    return ok;
  }

  /* ------------------------------------------------------------ session (Lovable Cloud) */

  async function redirectAfterLogin() {
    await Cloud.ready;
    const me = window.Shell && Shell.profile ? Shell.profile() : null;
    window.location.href = me && me.markets && me.markets.length ? "dashboard.html" : "onboarding.html";
  }

  /* ------------------------------------------------------------ events */

  emailInput.addEventListener("blur", () => {
    if (emailInput.value.trim()) validate();
  });

  passwordInput.addEventListener("blur", () => {
    if (passwordInput.value) validate();
  });

  toggleBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    toggleBtn.classList.toggle("is-visible", isPassword);
    toggleBtn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFormError("");
    if (!validate()) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";
    const { error } = await Cloud.client.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
      showFormError(/confirm/i.test(error.message) ? "Please confirm your email first — check your inbox." : "Wrong email or password.");
      return;
    }
    sessionStorage.removeItem("op-synced");
    window.location.reload();
  });

  document.querySelectorAll("[data-provider]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const provider = b.dataset.provider === "microsoft" ? "azure" : b.dataset.provider;
      Cloud.client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL("login.html", window.location.href).href },
      }).then(({ error }) => {
        if (error) showFormError("That sign-in option isn't available right now. Use your email and password instead.");
      });
    }, true);
  });

  forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!validEmail(email)) {
      fieldError(emailInput, "Enter your email above, then click Forgot password.");
      return;
    }
    await Cloud.client.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("reset-password.html", window.location.href).href,
    });
    showFormError("If that email has an account, a reset link is on its way.");
  });

  // Already signed in? Skip the form.
  Cloud.ready.then((u) => { if (u) redirectAfterLogin(); });
})();
