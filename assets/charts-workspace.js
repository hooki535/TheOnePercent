/* TheOnePercent personal workspace controls; no trading/data mutations. */
(function () {
  "use strict";
  const KEY = "top.chartWorkspace.v1";
  const defaults = { panel: false, notes: false, tools: true, dock: true, ranges: true, badge: true, theme: "light" };
  let prefs;
  try { prefs = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch (_) { prefs = Object.assign({}, defaults); }
  const body = document.body;
  const $ = id => document.getElementById(id);
  const settings = $("workspaceSettings");
  if (!settings) return;
  const fields = Array.from(settings.querySelectorAll("[data-workspace-pref]"));
  function apply() {
    body.classList.toggle("chart-first", !prefs.panel);
    body.classList.toggle("chart-notes-open", !!prefs.notes);
    body.classList.toggle("workspace-no-tools", !prefs.tools);
    body.classList.toggle("workspace-no-dock", !prefs.dock);
    body.classList.toggle("workspace-no-ranges", !prefs.ranges);
    body.classList.toggle("workspace-no-badge", !prefs.badge);
    fields.forEach(el => { el.checked = !!prefs[el.dataset.workspacePref]; });
    const panel = $("workspacePanelToggle"), notes = $("workspaceNotesToggle");
    if (panel) { panel.setAttribute("aria-expanded", String(!!prefs.panel)); panel.classList.toggle("workspace-open", !!prefs.panel); }
    if (notes) { notes.setAttribute("aria-expanded", String(!!prefs.notes)); notes.classList.toggle("workspace-open", !!prefs.notes); }
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) {}
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }
  fields.forEach(el => el.addEventListener("change", () => { prefs[el.dataset.workspacePref] = el.checked; apply(); }));
  const panel = $("workspacePanelToggle"), notes = $("workspaceNotesToggle");
  if (panel) panel.addEventListener("click", () => { prefs.panel = !prefs.panel; apply(); });
  if (notes) notes.addEventListener("click", () => { prefs.notes = !prefs.notes; apply(); });
  const open = $("workspaceSettingsOpen");
  const close = $("workspaceSettingsClose");
  function showSettings(show) {
    settings.hidden = !show;
    if (open) open.setAttribute("aria-expanded", String(show));
    if (show) settings.querySelector("input")?.focus();
    else open?.focus();
  }
  if (open) open.addEventListener("click", () => showSettings(settings.hidden));
  if (close) close.addEventListener("click", () => showSettings(false));
  settings.addEventListener("click", e => { if (e.target === settings) showSettings(false); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !settings.hidden) showSettings(false);
    if (e.key.toLowerCase() === "f" && e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleFullscreen();
    }
  });
  const full = $("workspaceFullscreen");
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  if (full) full.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    if (full) { full.setAttribute("aria-pressed", String(!!document.fullscreenElement)); full.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen"; }
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  });
  const reset = $("workspaceReset");
  if (reset) reset.addEventListener("click", () => { prefs = Object.assign({}, defaults); apply(); });
  apply();
})();
