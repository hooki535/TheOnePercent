/* TheOnePercent — cloud accounts + sync (Lovable Cloud)
   -------------------------------------------------------------------
   Loaded in <head> on every page, right after theme.js and the
   supabase-js UMD bundle. Pages keep using web storage synchronously
   (store.js / shell.js unchanged); this module mirrors every
   "onepercent*" key to the signed-in user's rows in public.user_data,
   and pulls them back on each page load.
   ------------------------------------------------------------------- */
(() => {
  "use strict";
  const URL_ = "https://lyhbjcwqnaublolnabys.supabase.co";
  const KEY = "sb_publishable_-gvgZlB15d5pZf4BABYXew_RWL5ePRL";
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

  const ready = (async () => {
    const { data } = await sb.auth.getSession();
    const user = data.session && data.session.user;
    if (user) {
      userId = user.id;
      await pull();
    } else {
      if (ls.getItem(OWNER)) wipeLocal();
      if (PROTECTED.includes(page)) location.replace(root + "pages/login.html");
    }
    return user || null;
  })();

  /* ---------- log out everywhere */
  document.addEventListener("click", async (e) => {
    const el = e.target.closest && e.target.closest("[data-shell-logout]");
    if (!el) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    await flush();
    await sb.auth.signOut();
    wipeLocal();
    location.href = root + "index.html";
  }, true);

  window.Cloud = { client: sb, ready, root, flush };
})();
