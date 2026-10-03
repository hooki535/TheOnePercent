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

  /* ------------------------------------------------------------ session
     No backend in Phase 1: a successful login just means the form is
     valid. We save (or refresh) a session profile so every other page's
     shared shell renders the logged-in nav. If onboarding was already
     completed in this browser, that data is preserved rather than
     overwritten. */

  function logIn(email) {
    const existing = window.Shell && Shell.profile ? Shell.profile() : null;
    const name = (existing && existing.name) || email.split("@")[0];
    if (window.Shell && Shell.saveProfile) {
      Shell.saveProfile({ email, name });
    }
    return !!(existing && existing.markets && existing.markets.length);
  }

  function redirectAfterLogin() {
    const hasOnboarded = window.Shell && Shell.profile && Shell.profile() && Shell.profile().markets && Shell.profile().markets.length;
    window.location.href = hasOnboarded ? "/dashboard" : "/onboarding";
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showFormError("");

    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";

    // Simulated network delay so the state change is visible.
    setTimeout(() => {
      logIn(emailInput.value.trim());
      redirectAfterLogin();
    }, 450);
  });

  googleBtn.addEventListener("click", () => {
    googleBtn.disabled = true;
    googleBtn.textContent = "Connecting to Google…";
    setTimeout(() => {
      logIn("trader@gmail.com");
      redirectAfterLogin();
    }, 500);
  });

  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    showFormError("Password reset isn't built yet — this link is a placeholder for Phase 1.");
  });
})();