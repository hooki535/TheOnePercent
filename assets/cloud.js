/* TheOnePercent — cloud accounts + sync (Supabase)
   -------------------------------------------------------------------
   Loaded in <head> on every page, right after theme.js and the
   supabase-js UMD bundle. Pages keep using web storage synchronously
   (store.js / shell.js unchanged); this module mirrors every
   "onepercent*" key to the signed-in user's rows in public.user_data,
   and pulls them back on each page load.
   ------------------------------------------------------------------- */
(() => {
  "use strict";
  const URL_ = "https://ecnxstqfnjaiibwiwwto.supabase.co";
  const KEY = "sb_publishable_vqHYZ_AasII7F611BTDWdg_Nftd7dCb";
  const OWNER = "onepercent:__owner";
  const isSynced = (k) => typeof k === "string" && k.indexOf("onepercent") === 0 && k !== OWNER;

  const ls = window.localStorage;
  const sb = window.supabase.createClient(URL_, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storage: ls },
  });

  const depth = Number((document.body && document.body.dataset.depth) || (location.pathname.includes("/pages/") ? 1 : 0));
  const root = depth ? "../" : "";
  const page = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
  const PROTECTED = ["dashboard", "journal", "settings", "onboarding"];
  // Flask serves flat routes (/login, /dashboard) instead of pages/*.html; templates set window.OP_FLASK.
  const FLASK = window.OP_FLASK === true;
  const go = (name) => (FLASK ? "/" + name : root + "pages/" + name + ".html");

  /* ---------- fast guard: a protected page with no stored session never paints.
     (The real check below still runs; this only removes the flash of private
     content. A sign-in link from an email carries its tokens in the URL, so
     those visits are let through to be verified.) */
  function hasStoredSession() {
    try {
      for (let i = 0; i < ls.length; i++) if (/^sb-.+-auth-token$/.test(ls.key(i)) && ls.getItem(ls.key(i))) return true;
    } catch (e) {}
    return false;
  }
  const cameFromAuthLink = /access_token}|refresh_token}|[?&]code=|type=(signup|recovery|magiclink|invite)/.test(location.hash + location.search);
  if (PROTECTED.includes(page) && !hasStoredSession() && !cameFromAuthLink) {
    location.replace(FLASK ? "/login" : root + "pages/login.html");
  }

  /* ---------- write-through: patch Storage so every synced write is queued */
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  let userId = null;
  let quiet = false;
  const pending = new Map();
  let timer = null;

  function queue(k, v) {
    if (quiet || !userId || !isSynced(k)) return;
    pending.set(k, v);
    clearTimeout(timer);
    timer = setTimeout(flush, 600);
  }
  async function flush() {
    if (!userId || !pending.size) return;
    const batch = [...pending];
    pending.clear();
    const ups = batch.filter(([, v]) => v !== null).map(([key, value]) => ({ user_id: userId, key, value, updated_at: new Date().toISOString() }));
    const dels = batch.filter(([, v]) => v === null).map(([k]) => k);
    if (ups.length) await sb.from("user_data").upsert(ups);
    if (dels.length) await sb.from("user_data").delete().eq("user_id", userId).in("key", dels);
  }
  window.addEventListener("pagehide", flush);

  Storage.prototype.setItem = function (k, v) {
    rawSet.call(this, k, v);
    if (this === ls) queue(k, String(v));
  };
  Storage.prototype.removeItem = function (k) {
    rawRemove.call(this, k);
    if (this === ls) queue(k, null);
  };

  function localKeys() {
    const out = [];
    for (let i = 0; i < ls.length; i++) if (isSynced(ls.key(i))) out.push(ls.key(i));
    return out;
  }
  function wipeLocal() {
    quiet = true;
    localKeys().forEach((k) => k !== "onepercent:theme" && rawRemove.call(ls, k));
    ["op_profile", "onboarding"].forEach((k) => rawRemove.call(ls, k));
    rawRemove.call(ls, OWNER);
    quiet = false;
  }

  /* ---------- pull on load */
  async function pull() {
    const { data, error } = await sb.from("user_data").select("key,value");
    if (error) return;
    const remote = new Map(data.map((r) => [r.key, r.value]));
    const owner = ls.getItem(OWNER);
    if (owner && owner !== userId) wipeLocal();
    let changed = false;
    quiet = true;
    remote.forEach((v, k) => {
      if (ls.getItem(k) !== v) { rawSet.call(ls, k, v); changed = true; }
    });
    quiet = false;
    if (owner === userId) {
      // remote is the source of truth for this user's keys
      localKeys().forEach((k) => { if (!remote.has(k) && k !== "onepercent:theme") { rawRemove.call(ls, k); changed = true; } });
    } else {
      // first sign-in on this browser: upload anything made before the account
      localKeys().forEach((k) => { if (!remote.has(k)) pending.set(k, ls.getItem(k)); });
      flush();
    }
    rawSet.call(ls, OWNER, userId);
    if (changed && !sessionStorage.getItem("op-synced")) {
      sessionStorage.setItem("op-synced", "1");
      location.reload();
      return;
    }
    sessionStorage.removeItem("op-synced");
  }

  /* ---------- "come back here after you sign in" (e.g. enrolling in a course)
     Kept in sessionStorage so it survives the Google/OAuth round trip in the
     same tab, and expires after 30 minutes so it can never hijack a later login.
     Only a known page + a plain #hash can be stored, so it can't be abused as
     an open redirect. */
  const RETURN_KEY = "op-return";
  const RETURN_PAGES = ["learn", "dashboard", "journal", "charts", "calculators", "settings"];
  function setReturn(pageName, hash) {
    if (RETURN_PAGES.indexOf(pageName) < 0) return;
    if (hash && !/^#[A-Za-z0-9/_-]*$/.test(hash)) hash = "";
    try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ page: pageName, hash: hash || "", at: Date.now() })); } catch (e) {}
  }
  function peekReturn() {
    try {
      const r = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
      if (!r || RETURN_PAGES.indexOf(r.page) < 0 || Date.now() - r.at > 30 * 60 * 1000) return null;
      return FLASK ? "/" + r.page + r.hash : r.page + ".html" + r.hash; // relative to /pages/ on the static site
    } catch (e) { return null; }
  }
  function takeReturn() {
    const url = peekReturn();
    try { sessionStorage.removeItem(RETURN_KEY); } catch (e) {}
    return url;
  }

  const ready = (async () => {
    const { data } = await sb.auth.getSession();
    const user = data.session && data.session.user;
    if (user) {
      userId = user.id;
      // Already signed in (e.g. just back from Google) — leave the login/sign-up pages.
      if (page === "login" || page === "sign-up") {
        let next = "dashboard.html";
        let needsOnboarding = false;
        try {
          const { data: prof } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
          if (!prof || !prof.username) { next = "onboarding.html"; needsOnboarding = true; }
        } catch (e) {}
        // Finished account + a pending destination (e.g. the course they wanted)? Go there.
        const back = needsOnboarding ? null : takeReturn();
        location.replace(back ? (FLASK ? back : root + "pages/" + back) : go(next.replace(".html", "")));
        return user;
      }
      await pull();
    } else {
      if (ls.getItem(OWNER)) wipeLocal();
      if (PROTECTED.includes(page)) location.replace(go("login"));
    }
    return user || null;
  })();

  /* ---------- keep every open tab in step with the account
     Fires when you sign out in another tab, or when a session can no longer be
     refreshed. Without this a tab stays "logged in" (or "logged out") until the
     next manual refresh. The login, sign-up and reset pages manage their own
     navigation, so they are left alone. */
  const SELF_MANAGED = ["login", "sign-up", "reset-password"];
  // The auth listener fires SIGNED_IN once on every page load, a split second
  // BEFORE `ready` above has set userId. Treating that first event as "signed
  // in from another tab" reloads the page, which reloads forever. Only react
  // to auth events that arrive after the initial session check has finished.
  let initialCheckDone = false;
  ready.finally(() => { initialCheckDone = true; });
  sb.auth.onAuthStateChange((event, session) => {
    if (SELF_MANAGED.includes(page)) return;
    if (!initialCheckDone) return;
    const signedInNow = !!(session && session.user);
    if (event === "SIGNED_OUT" && userId) {
      userId = null;
      wipeLocal();
      if (PROTECTED.includes(page)) location.replace(go("login"));
      else location.reload();
    } else if (event === "SIGNED_IN" && signedInNow && !userId) {
      // signed in from another tab while this one still thinks it is a guest
      sessionStorage.removeItem("op-synced");
      location.reload();
    }
  });

  /* ---------- log out everywhere */
  document.addEventListener("click", async (e) => {
    const el = e.target.closest && e.target.closest("[data-shell-logout]");
    if (!el) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    await flush();
    await sb.auth.signOut();
    wipeLocal();
    location.href = FLASK ? "/" : root + "index.html";
  }, true);

  window.Cloud = { client: sb, ready, root, flush, setReturn, takeReturn, peekReturn };
})();
