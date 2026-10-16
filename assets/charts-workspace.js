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
    body.classList.toggle("workspace-panel-open", !!prefs.panel);
    body.classList.toggle("chart-notes-open", !!prefs.notes);
    body.classList.toggle("workspace-no-tools", !prefs.tools);
    body.classList.toggle("workspace-no-dock", !prefs.dock);
    body.classList.toggle("workspace-no-ranges", !prefs.ranges);
    body.classList.toggle("workspace-no-badge", !prefs.badge);
    fields.forEach(el => { el.checked = !!prefs[el.dataset.workspacePref]; });
    const panel = $("workspacePanelToggle"), notes = $("workspaceNotesToggle");
  $("workspaceSettingsMore")?.addEventListener("click", () => $("workspaceSettingsOpen")?.click());
  $("workspaceFullscreenMore")?.addEventListener("click", () => $("workspaceFullscreen")?.click());
  $("workspaceNotesMore")?.addEventListener("click", () => $("workspaceNotesToggle")?.click());
    if (panel) { panel.setAttribute("aria-expanded", String(!!prefs.panel)); panel.classList.toggle("workspace-open", !!prefs.panel); }
    if (notes) { notes.setAttribute("aria-expanded", String(!!prefs.notes)); notes.classList.toggle("workspace-open", !!prefs.notes); }
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) {}
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }
  fields.forEach(el => el.addEventListener("change", () => { prefs[el.dataset.workspacePref] = el.checked; apply(); }));
  const panel = $("workspacePanelToggle"), notes = $("workspaceNotesToggle");
  if (panel) panel.addEventListener("click", () => { prefs.panel = !prefs.panel; apply(); });
  document.querySelectorAll(".dock-btn[data-tab]").forEach(button => button.addEventListener("click", () => {
    if (!prefs.panel) { prefs.panel = true; apply(); }
  }));
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
  const appearance = $("workspaceChartAppearance");
  if (appearance) appearance.addEventListener("click", () => {
    showSettings(false);
    // Reuse the native chart settings modal and its existing canvas rendering.
    $("setBtn")?.click();
  });
  const presets = {
    clean: { panel: false, notes: false, tools: false, dock: false, ranges: false, badge: true },
    analysis: { panel: true, notes: false, tools: true, dock: true, ranges: true, badge: true },
    trading: { panel: true, notes: true, tools: true, dock: true, ranges: true, badge: true }
  };
  settings.querySelectorAll("[data-workspace-preset]").forEach(button => {
    button.addEventListener("click", () => {
      const next = presets[button.dataset.workspacePreset];
      if (!next) return;
      Object.assign(prefs, next);
      apply();
    });
  });
  // Drag the panel's left edge to allocate more room to the chart.
  const panelEl = $("panel");
  const panelGrip = $("workspacePanelGrip");
  const panelWidthKey = "top.chartPanelWidth.v1";
  const savedWidth = Number(localStorage.getItem(panelWidthKey));
  function setPanelWidth(px) {
    if (!panelEl || !Number.isFinite(px)) return;
    const max = Math.max(240, Math.min(620, window.innerWidth - 340));
    const width = Math.max(240, Math.min(max, px));
    panelEl.style.setProperty("flex-basis", width + "px", "important");
    panelEl.style.setProperty("width", width + "px", "important");
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return width;
  }
  if (savedWidth >= 240) setPanelWidth(savedWidth);
  if (panelGrip && panelEl) {
    panelGrip.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      e.preventDefault();
      panelGrip.setPointerCapture(e.pointerId);
      const startX = e.clientX, startWidth = panelEl.getBoundingClientRect().width;
      const move = event => {
        const width = setPanelWidth(startWidth + startX - event.clientX);
        if (width) {
          try { localStorage.setItem(panelWidthKey, String(width)); } catch (_) {}
        }
      };
      const stop = () => {
        panelGrip.removeEventListener("pointermove", move);
        panelGrip.removeEventListener("pointerup", stop);
        panelGrip.removeEventListener("pointercancel", stop);
      };
      panelGrip.addEventListener("pointermove", move);
      panelGrip.addEventListener("pointerup", stop);
      panelGrip.addEventListener("pointercancel", stop);
    });
    panelGrip.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const width = setPanelWidth(panelEl.getBoundingClientRect().width + (e.key === "ArrowLeft" ? 20 : -20));
      if (width) localStorage.setItem(panelWidthKey, String(width));
    });
  }
  const themeButton = $("workspaceThemeToggle");
  function syncThemeButton() {
    if (!themeButton || !window.Theme) return;
    const dark = Theme.current() === "dark";
    themeButton.textContent = dark ? "☀ Light mode" : "◐ Dark mode";
    themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  if (themeButton && window.Theme) {
    themeButton.addEventListener("click", () => { Theme.toggle(); syncThemeButton(); });
    window.addEventListener("themechange", () => { syncThemeButton(); applyLook(); });
    syncThemeButton();
  }
  const LOOK_KEY = "top.chartAppearance.v1";
  const lookDefaults = { up: "#089981", dn: "#f23645", wickUp: "#089981", wickDn: "#f23645", borderUp: "#089981", borderDn: "#f23645", background: "#ffffff", candleWidth: 0.68, candleBorders: true, gridH: true, gridV: true, dataWin: true, countdown: true };
  let lookPrefs;
  try { lookPrefs = Object.assign({}, lookDefaults, JSON.parse(localStorage.getItem(LOOK_KEY) || "{}")); }
  catch (_) { lookPrefs = Object.assign({}, lookDefaults); }
  const lookFields = Array.from(settings.querySelectorAll("[data-chart-look]"));
  function applyLook() {
    if (typeof state === "undefined" || !state.look) return;
    // A default white canvas was masking the dark terminal. Respect a
    // deliberate custom background, but adapt the default to the active theme.
    const storedAppearance = (() => { try { return JSON.parse(localStorage.getItem(LOOK_KEY) || "{}"); } catch (_) { return {}; } })();
    const automaticBackground = !storedAppearance.background || storedAppearance.background === "#ffffff" || storedAppearance.background === "#0d1727";
    if (automaticBackground) lookPrefs.background = window.Theme?.current() === "dark" ? "#0d1727" : "#ffffff";
    for (const [key, value] of Object.entries(lookPrefs)) {
      if (["up", "dn", "wickUp", "wickDn", "borderUp", "borderDn", "background"].includes(key)) {
        if (/^#[0-9a-f]{6}$/i.test(value)) state.look[key] = value;
      } else if (key === "candleWidth") {
        const width = Number(value);
        if (Number.isFinite(width)) state.look[key] = Math.max(0.3, Math.min(1, width));
      } else state.look[key] = !!value;
    }
    lookFields.forEach(el => {
      const value = lookPrefs[el.dataset.chartLook];
      if (el.type === "checkbox") el.checked = !!value;
      else if (el.type === "range") el.value = String(value);
      else if (/^#[0-9a-f]{6}$/i.test(value)) el.value = value;
    });
    try { localStorage.setItem(LOOK_KEY, JSON.stringify(lookPrefs)); } catch (_) {}
    if (typeof draw === "function") draw();
  }
  lookFields.forEach(el => el.addEventListener(el.type === "color" || el.type === "range" ? "input" : "change", () => {
    lookPrefs[el.dataset.chartLook] = el.type === "checkbox" ? el.checked : el.value;
    applyLook();
  }));
  const reset = $("workspaceReset");
  if (reset) reset.addEventListener("click", () => { prefs = Object.assign({}, defaults); lookPrefs = Object.assign({}, lookDefaults); apply(); applyLook(); });
  apply();
  applyLook();
})();
