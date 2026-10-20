/* Terminal navigation over the existing chart, feed and drawing engine. */
(function () {
  'use strict';
  if (typeof state === 'undefined' || !document.querySelector('.desk-top')) return;
  const byId = id => document.getElementById(id);
  const body = document.body;
  const icons = {
    watchlist: '<path d="M4 5h16M4 12h16M4 19h16M8 3v18"/>',
    alerts: '<path d="M6 16V9a6 6 0 0 1 12 0v7l2 2H4zm4 5h4"/>',
    objects: '<path d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    data: '<path d="M4 20V10m8 10V4m8 16v-7"/>',
    position: '<path d="M3 17h18M7 21V3m5 4h9m-4-4v8"/>',
    journal: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>',
    replay: '<path d="M5 4v16M10 5l10 7-10 7z"/>',
    camera: '<path d="M3 7h5l2-3h4l2 3h5v14H3z"/><circle cx="12" cy="13" r="4"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M14 3v18"/>'
  };
  const svg = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + '</svg>';
  const labels = {watchlist: 'Watchlist', alerts: 'Price alerts', objects: 'Drawing layers', data: 'Crosshair data', position: 'Position planner', journal: 'Trade journal'};
  function command(id) { byId(id)?.click(); }
  document.querySelectorAll('[data-desk-action]').forEach(button => button.addEventListener('click', () => command(button.dataset.deskAction)));

  // Move the actual buttons, keeping their existing event handlers and settings.
  const options = byId('deskOptions');
  // Keep the site's original navigation, search and account handlers available.
  const apps = document.createElement('details'); apps.className = 'desk-apps';
  apps.innerHTML = '<summary aria-label="TheOnePercent menu" title="TheOnePercent menu">☰</summary><div class="desk-apps-panel"><strong>TheOnePercent</strong></div>';
  const appPanel = apps.querySelector('.desk-apps-panel');
  function syncAppNavigation() {
    const shellHeader = document.querySelector('header.topbar');
    ['.nav-links', '.nav-search', '.nav-actions'].forEach(selector => {
      const node = shellHeader?.querySelector(selector);
      if (node) { appPanel.querySelector(selector)?.remove(); appPanel.append(node); }
    });
  }
  // Shell mounts at DOM ready and can replace its header after account changes.
  const navigationObserver = new MutationObserver(syncAppNavigation);
  navigationObserver.observe(body, {childList:true});
  document.addEventListener('DOMContentLoaded', syncAppNavigation);
  syncAppNavigation();
  document.querySelector('.desk-top').prepend(apps);
  ['workspaceSettingsOpen', 'workspaceThemeToggle', 'workspaceFullscreen', 'workspaceNotesToggle', 'dataModeToggle'].forEach(id => {
    const button = byId(id);
    if (button) { button.classList.remove('toolbar-secondary'); options.append(button); }
  });
  options.addEventListener('click', e => { if (e.target.closest('button')) options.closest('details').open = false; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.desk-options[open],.desk-layout[open],.desk-apps[open]').forEach(el => { el.open = false; el.querySelector('summary').focus(); }); });
  document.addEventListener('click', e => document.querySelectorAll('.desk-options[open],.desk-layout[open],.desk-apps[open]').forEach(el => { if (!el.contains(e.target)) el.open = false; }));

  // A scrollable tool shelf preserves every control at small widths.
  const shelf = document.createElement('nav'); shelf.className = 'desk-tool-shelf'; shelf.setAttribute('aria-label','Chart tools and favorite timeframes');
  const typeControl = byId('typeBtn')?.closest('.menu-wrap');
  if (typeControl) shelf.append(typeControl);
  shelf.append(byId('intervals'));
  function shelfButton(label, action, title) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'desk-shelf-button'; b.textContent = label; b.title = title || label;
    b.addEventListener('click', action); shelf.append(b); return b;
  }
  shelfButton('Drawing tools', () => { library.showModal(); library.querySelector('input').focus(); }, 'Browse and search every drawing tool');
  shelfButton('Compare', () => { openPanel('watchlist'); switchWatchView('compare'); }, 'Compare symbols on this chart');
  shelfButton('↶', () => command('undoBtn'), 'Undo (Ctrl+Z)').setAttribute('aria-label','Undo');
  shelfButton('↷', () => command('redoBtn'), 'Redo (Ctrl+Shift+Z)').setAttribute('aria-label','Redo');
  shelfButton('Chart settings', () => command('setBtn'));
  const notesShortcut = shelfButton('Notes', () => command('workspaceNotesToggle'));
  shelfButton('Save workspace', () => command('wsBtn'));
  shelfButton('Full screen', () => command('workspaceFullscreen'));
  shelfButton('Commands', () => command('paletteBtn'), 'Command palette (Ctrl+K)');
  document.querySelector('.ctoolbar').after(shelf);

  // The catalog enumerates the existing engine's tools; nothing is substituted.
  const library = document.createElement('dialog'); library.className = 'desk-tool-library';
  library.setAttribute('aria-labelledby','deskLibraryTitle');
  library.innerHTML = '<header><div><h2 id="deskLibraryTitle">Drawing tools</h2><p>Lines, Fibonacci, patterns, shapes, annotations and position tools</p></div><form method="dialog"><button aria-label="Close drawing tools">✕</button></form></header><input type="search" aria-label="Search all drawing tools" placeholder="Search every drawing tool…"><div class="desk-library-results"></div><p class="desk-library-empty" hidden>No matching drawing tools</p>';
  const results = library.querySelector('.desk-library-results');
  if (typeof RAIL !== 'undefined') RAIL.forEach(group => {
    const section = document.createElement('section'), heading = document.createElement('h3'); heading.textContent = group.name; section.append(heading);
    const grid = document.createElement('div'); grid.className = 'desk-library-grid'; section.append(grid);
    group.sections.forEach(category => category.tools.forEach(id => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.libraryTool = id;
      b.dataset.search = (toolName(id) + ' ' + group.name + ' ' + category.label).toLowerCase();
      const icon = document.createElement('span'), label = document.createElement('span'); icon.innerHTML = svgIcon(id); label.textContent = toolName(id); b.append(icon,label);
      b.addEventListener('click', () => { pickTool(id); library.close(); }); grid.append(b);
    })); results.append(section);
  });
  const search = library.querySelector('input');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase(); let count = 0;
    results.querySelectorAll('button').forEach(b => { b.hidden = !b.dataset.search.includes(q); if (!b.hidden) count++; });
    results.querySelectorAll('section').forEach(section => { section.hidden = ![...section.querySelectorAll('button')].some(b => !b.hidden); });
    library.querySelector('.desk-library-empty').hidden = count > 0;
  });
  search.addEventListener('keydown', e => {
    const first = [...results.querySelectorAll('button')].find(b => !b.hidden);
    if (first && (e.key === 'Enter' || e.key === 'ArrowDown')) { e.preventDefault(); if (e.key === 'Enter') first.click(); else first.focus(); }
  });
  document.body.append(library);

  const analysis = document.querySelector('.toolbar-analysis');
  const replay = document.createElement('button');
  replay.type = 'button'; replay.className = 'tb-btn desk-replay'; replay.innerHTML = svg('replay') + '<span>Replay</span>'; replay.title = 'Bar replay (R)';
  replay.addEventListener('click', () => { command('replayBtn'); refresh(); }); analysis.append(replay);
  const layout = document.createElement('details'); layout.className = 'desk-layout';
  layout.innerHTML = '<summary title="Chart layouts" aria-label="Choose chart layout">' + svg('layout') + '<span>Layout</span></summary><div class="desk-layout-menu"><strong>Chart layout</strong><div role="group" aria-label="Choose charts on screen"></div><small>Each chart keeps its own symbol and studies.</small></div>';
  const layoutButtons = layout.querySelector('[role=group]');
  [[1,'Single'],[2,'Two columns'],[3,'Three columns'],[4,'Four charts'],[6,'Six charts']].forEach(([n,label]) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.deskLayout = n;
    button.innerHTML = '<span class="desk-layout-icon" style="--columns:' + (n === 1 ? 1 : n === 2 || n === 4 ? 2 : 3) + '">' + '<i></i>'.repeat(n) + '</span><span>' + label + '</span>';
    button.addEventListener('click', () => { document.querySelector('#layoutMenu [data-l="' + n + '"]')?.click(); layout.open = false; refresh(); });
    layoutButtons.append(button);
  });
  document.querySelector('.toolbar-workspace').prepend(layout);
  const snapshot = document.createElement('button'); snapshot.type = 'button'; snapshot.className = 'tb-btn desk-camera'; snapshot.innerHTML = svg('camera'); snapshot.setAttribute('aria-label','Download chart image'); snapshot.title = 'Download chart image';
  snapshot.addEventListener('click', () => command('snapBtn')); layout.after(snapshot);

  const rail = document.createElement('nav'); rail.className = 'desk-activity'; rail.setAttribute('aria-label','Chart panels');
  Object.entries(labels).forEach(([name,label]) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.deskPanel = name;
    button.innerHTML = svg(name) + '<span class="desk-tooltip">' + label + '</span>'; button.title = label; button.setAttribute('aria-label',label); button.setAttribute('aria-controls','panel');
    button.addEventListener('click', () => {
      const open = body.classList.contains('workspace-panel-open') || body.classList.contains('sheet-open');
      if (open && body.dataset.workspaceTab === name) closePanel(); else openPanel(name);
    }); rail.append(button);
  });
  document.querySelector('.cshell').append(rail);
  function openPanel(name) {
    if (!body.classList.contains('workspace-panel-open')) command('workspacePanelToggle');
    body.classList.remove('chart-first'); switchTab(name); refresh();
  }
  function closePanel() {
    if (body.classList.contains('workspace-panel-open')) command('workspacePanelToggle');
    body.classList.remove('sheet-open'); refresh();
  }
  byId('deskPanelClose').addEventListener('click', closePanel);
  // The first visit starts with a useful list; existing selected workspaces remain intact.
  let initialPanel = 'watchlist';
  try { const saved = localStorage.getItem('top.chartDeskPanel.v1'); if (labels[saved]) initialPanel = saved; } catch (_) {}
  switchTab(initialPanel);

  const footer = document.createElement('footer'); footer.className = 'desk-bottom';
  footer.innerHTML = '<div class="desk-bottom-actions"><button type="button" data-desk-bottom="position">Position planner</button><button type="button" data-desk-bottom="journal">Journal</button><button type="button" data-desk-bottom="alerts">Alerts</button><a href="backtesting.html#sessions">Backtesting <span aria-hidden="true">↗</span></a></div><div class="desk-feed-status" id="deskFeedStatus" role="status"></div>';
  document.querySelector('.cshell').after(footer);
  const badgeHost = byId('deskFeedStatus'); badgeHost.append(byId('feedBadge'));
  const blindStatus = document.createElement('span'); blindStatus.textContent = 'Blind replay · symbol and date hidden'; blindStatus.hidden = true; badgeHost.append(blindStatus);
  const riskPill = byId('riskPill'); if (riskPill) footer.querySelector('.desk-bottom-actions').after(riskPill);
  const empty = document.createElement('section'); empty.className = 'desk-empty'; empty.hidden = true;
  empty.setAttribute('aria-label','Choose chart data');
  empty.innerHTML = '<span class="desk-empty-symbol" aria-hidden="true">' + svg('data') + '</span><h1>Choose your chart data</h1><p id="deskEmptyMessage">Historical candles are not available for this instrument. Search for a supported market, or explore the chart tools with clearly labeled demo candles.</p><div><button type="button" class="desk-empty-primary">Search markets</button><button type="button" class="desk-empty-demo">Use demo candles</button></div><a href="' + (window.OP_FLASK ? '/backtesting#sessions' : 'backtesting.html#sessions') + '">Practice with archived history in Backtesting ↗</a>';
  empty.querySelector('.desk-empty-primary').addEventListener('click', () => command('symBtn'));
  empty.querySelector('.desk-empty-demo').addEventListener('click', () => { if (!Feed.isDemoMode()) command('dataModeToggle'); });
  document.querySelector('.cmid').append(empty);
  footer.querySelectorAll('[data-desk-bottom]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.deskBottom)));
  if (window.OP_FLASK) document.querySelectorAll('.desk-top a,.desk-bottom a').forEach(a => { const href = a.getAttribute('href'); a.setAttribute('href', href.includes('index') ? '/' : '/' + href.replace('.html','')); });
  let signature = '';
  const marketList = byId('deskMarkets');
  function refresh() {
    const selected = state.charts[state.sel];
    const blind = state.replay.on && state.replay.blind;
    const series = charts[state.sel]?.data;
    empty.hidden = !!series?.length || Feed.isDemoMode();
    empty.querySelector('#deskEmptyMessage').textContent = window.THEONEPERCENT_LOCAL_MT5
      ? 'No broker candles are available for this instrument. Check your local MT5 connection, search for the exact broker symbol, or explore the tools with clearly labeled demo candles.'
      : 'Historical candles are not available for this instrument. Search for a supported market, or explore the chart tools with clearly labeled demo candles.';
    // No quote is synthesized for navigation, and blind replay does not expose symbols.
    const symbols = [...new Set([selected.sym,...state.watch])].slice(0,8);
    const next = JSON.stringify([symbols, selected.sym, blind]);
    if (signature !== next) {
      signature = next;
      marketList.replaceChildren(...symbols.map(sym => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'desk-market';
        const selectedSymbol = selected.sym === sym;
        button.classList.toggle('active', selectedSymbol); button.setAttribute('aria-pressed',String(selectedSymbol));
        const code = document.createElement('strong'), market = document.createElement('span');
        code.textContent = blind ? 'Hidden' : sym; market.textContent = blind ? 'Blind replay' : (Feed.symbol(sym)?.market || 'Market');
        button.append(code,market); button.disabled = blind;
        button.addEventListener('click', () => { setSymbol(sym); refresh(); }); return button;
      }));
    }
    const name = body.dataset.workspaceTab || 'watchlist';
    byId('deskPanelTitle').textContent = labels[name] || 'Workspace';
    const open = body.classList.contains('workspace-panel-open') || body.classList.contains('sheet-open');
    rail.querySelectorAll('button').forEach(b => { b.classList.toggle('active',open && b.dataset.deskPanel === name); b.setAttribute('aria-expanded',String(open && b.dataset.deskPanel === name)); });
    layout.querySelectorAll('[data-desk-layout]').forEach(b => b.setAttribute('aria-pressed',String(Number(b.dataset.deskLayout) === state.layout)));
    replay.setAttribute('aria-pressed',String(state.replay.on));
    const badge = byId('feedBadge');
    if (badge) badge.hidden = blind;
    blindStatus.hidden = !blind;
    notesShortcut.setAttribute('aria-expanded',String(body.classList.contains('chart-notes-open')));
    byId('deskFeedStatus').classList.toggle('is-demo',Feed.isDemoMode());
    try { localStorage.setItem('top.chartDeskPanel.v1',name); } catch (_) {}
  }
  const observer = new MutationObserver(refresh);
  observer.observe(body,{attributes:true,attributeFilter:['data-workspace-tab','class']});
  observer.observe(byId('symName'),{childList:true,characterData:true,subtree:true});
  observer.observe(byId('feedBadge'),{childList:true,characterData:true,subtree:true});
  // The feed already owns its cadence. No extra network connection or polling is added.
  Feed.subscribe(refresh);
  document.addEventListener('change', refresh);
  byId('rbClose')?.addEventListener('click', refresh);
  document.querySelector('#grid').addEventListener('click',refresh);
  refresh();
})();
