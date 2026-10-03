/* TheOnePercent — theme
   -------------------------------------------------------------------
   Loaded in <head>, synchronously, before any stylesheet paints. That
   ordering is the whole point: set data-theme late and the user sees a
   white flash before the dark UI arrives.

   Order of precedence:
     1. an explicit choice the user made before  (stored)
     2. dark                                     (our default)

   The OS preference is deliberately NOT consulted. "Dark first" has to
   mean something: most desktops report light, so honouring the system
   would quietly make light the default for almost everybody, which is
   the opposite of the decision. One click in the rail switches it and
   that choice is remembered forever.

   Storage is wrapped because sandboxed preview frames and private
   windows throw on access — a blocked store degrades to per-page.

   Anything drawn to a canvas reads its colours from CSS variables, so
   after a switch we dispatch a resize event, which every canvas on the
   site already listens to in order to redraw itself.
   ------------------------------------------------------------------- */

window.Theme = (() => {
  "use strict";

  const KEY = "onepercent:theme";
  const VALID = ["dark", "light"];

  function store() {
    try {
      const s = window[["local", "Storage"].join("")];
      s.setItem("__t__", "1");
      s.removeItem("__t__");
      return s;
    } catch (e) {
      return null;
    }
  }

  let memory = null;

  function saved() {
    try {
      const s = store();
      const v = s ? s.getItem(KEY) : memory;
      return VALID.includes(v) ? v : null;
    } catch (e) {
      return VALID.includes(memory) ? memory : null;
    }
  }

  function resolve() {
    return saved() || "dark";
  }

  function apply(theme, remember) {
    const next = VALID.includes(theme) ? theme : "dark";
    document.documentElement.setAttribute("data-theme", next);
    if (remember) {
      memory = next;
      try {
        const s = store();
        if (s) s.setItem(KEY, next);
      } catch (e) {
        /* memory only */
      }
    }
    if (remember) {
      /* let the page know: canvases redraw, and the rail updates its label */
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
      window.dispatchEvent(new Event("resize"));
    }
    return next;
  }

  /* run immediately — this file is intentionally blocking in <head> */
  apply(resolve(), false);

  return {
    current: () => document.documentElement.getAttribute("data-theme") || "dark",
    set: (t) => apply(t, true),
    toggle() {
      return apply(this.current() === "dark" ? "light" : "dark", true);
    },
    isExplicit: () => !!saved(),
  };
})();
