/* Video-reference workspace chrome; all commands reuse the custom chart engine. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), body=document.body;
  const icon = (name) => {
    const paths={settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v4"/>',redo:'<path d="m16 4 5 5-5 5m5-5H11a7 7 0 0 0-7 7v4"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',candle:'<path d="M7 2v4m0 10v6M17 2v9m0 8v3"/><rect x="4" y="6" width="6" height="10"/><rect x="14" y="11" width="6" height="8"/>',bell:'<path d="M5 17V9a7 7 0 0 1 14 0v8l2 2H3zm5 5h4"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',chevron:'<path d="m8 5 7 7-7 7"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'};
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.settings)+'</svg>';
  };
  const command=id=>$(id)?.click(), toolbar=document.querySelector('.ctoolbar');
  const top=document.querySelector('.desk-top'), options=$('deskOptions');
  // Rehome existing controls, preserving their bound handlers.
  toolbar.prepend(document.querySelector('.desk-brand'));
  toolbar.prepend(document.querySelector('.desk-apps'));
  document.querySelector('.desk-save').textContent='Save';
  toolbar.append(document.querySelector('.desk-save'),document.querySelector('.desk-options'));
  top.hidden=true;
  const market=document.querySelector('.toolbar-market'), intervals=$('intervals');
  market.insertBefore(intervals,$('ivBtn').closest('.menu-wrap'));
  const type=$('typeBtn').closest('.menu-wrap');market.insertBefore(type,document.querySelector('.toolbar-analysis'));
  function graphic(id,name,label) { const b=$(id);if(!b)return;b.innerHTML=icon(name)+(label?'<span>'+label+'</span>':''); b.setAttribute('aria-label',b.title||label||id); }
  graphic('typeBtn','candle');graphic('indBtn','settings','Indicators');graphic('alertBtn','bell','Alert');
  graphic('workspacePanelToggle','chevron');graphic('moreBtn','settings');
  // Put appearance and replay beside the price/timeframe controls.
  const appearance=document.createElement('button');appearance.className='tb-btn research-settings';appearance.innerHTML=icon('settings');appearance.title='Chart settings';appearance.setAttribute('aria-label','Chart settings');appearance.onclick=()=>command('setBtn');toolbar.append(appearance);
  ['undoBtn','redoBtn'].forEach((id,i)=>{const b=document.createElement('button');b.type='button';b.className='tb-btn research-history';b.innerHTML=icon(i?'redo':'undo');b.title=i?'Redo (Ctrl+Shift+Z)':'Undo (Ctrl+Z)';b.setAttribute('aria-label',b.title);b.onclick=()=>command(id);document.querySelector('.toolbar-analysis').append(b);});
  // Less frequent commands remain reachable from Workspace rather than adding rows.
  const extra=document.createElement('div');extra.className='research-extra';
  [...document.querySelector('.desk-tool-shelf').children].filter(el=>['Drawing tools','Compare','Notes','Commands'].includes(el.textContent.trim())).forEach(el=>extra.append(el));options.append(extra);
  document.querySelector('.desk-tool-shelf').hidden=true;
  document.querySelector('.desk-markets').hidden=true;
  document.querySelector('[data-tab="objects"]').textContent='Object Tree';
  document.querySelector('[data-tab="watchlist"]').textContent='Watchlist';
  document.querySelector('.desk-activity [data-desk-panel="objects"]').setAttribute('aria-label','Object Tree');
  document.querySelector('.desk-bottom-actions').querySelector('[data-desk-bottom="journal"]').textContent='Trading Journal';
  const dataButton=document.createElement('button');dataButton.type='button';dataButton.textContent='Data';dataButton.onclick=()=>{if(!body.classList.contains('workspace-panel-open'))command('workspacePanelToggle');switchTab('data');};document.querySelector('.desk-bottom-actions').append(dataButton);
  const profile=document.createElement('a');profile.className='research-profile';profile.href='settings.html';profile.innerHTML=icon('user');profile.title='Sign in to your account';profile.setAttribute('aria-label','Sign in to your account');toolbar.append(profile);
  if(window.Cloud) Cloud.ready.then(user=>{
    if(!user){profile.href='login.html';return;}
    const meta=user.user_metadata||{}, src=meta.avatar_url||meta.picture;
    if(typeof src==='string' && /^https:\/\//.test(src)){const im=new Image();im.src=src;im.alt='';im.onerror=()=>{profile.innerHTML=icon('user');};profile.replaceChildren(im);}
    profile.title=meta.full_name||meta.name||'Your account';profile.setAttribute('aria-label',profile.title);
  }).catch(()=>{});
  // Favorites use the existing stored tool IDs and rail star controls.
  const favorites=document.createElement('div');favorites.className='research-favorites';favorites.setAttribute('role','toolbar');favorites.setAttribute('aria-label','Favourite drawing tools');document.querySelector('.cmid').append(favorites);
  let favoriteSignature='';
  function paintFavorites(){
    const ids=railFavs.length?railFavs:['trend','hline','rect','fib','text','measure'].filter(isRailTool);
    const sig=ids.join('|')+'|'+state.tool;
    if(sig===favoriteSignature)return;favoriteSignature=sig;
    favorites.innerHTML='<span class="research-grip" aria-hidden="true">⠿</span>';
    ids.forEach(id=>{const b=document.createElement('button');b.type='button';b.innerHTML=svgIcon(id);b.title=toolName(id);b.setAttribute('aria-label',toolName(id));b.setAttribute('aria-pressed',String(state.tool===id));b.onclick=()=>pickTool(id);favorites.append(b);});
  }
  // A compact edit bar for the selected real drawing; engine keeps hit testing/handles.
  const edit=document.createElement('div');edit.className='research-editbar';edit.hidden=true;edit.setAttribute('role','toolbar');edit.setAttribute('aria-label','Selected drawing controls');
  edit.innerHTML='<input type="color" aria-label="Drawing line colour"><select aria-label="Drawing line width"><option value="1">1 px</option><option value="1.5">1.5 px</option><option value="2">2 px</option><option value="3">3 px</option><option value="4">4 px</option><option value="5">5 px</option></select>';
  function selected(){const c=charts[state.sel];return {c,o:c?.drw.find(o=>o.id===state.selObj)};}
  function mutate(fn){const {c,o}=selected();if(!o)return;pushUndo();fn(o,c);paintObjects();draw();}
  edit.querySelector('input').onchange=e=>mutate(o=>{o.style={...DRAW_STYLE_DEFAULTS,...o.style,color:e.target.value};});
  edit.querySelector('select').onchange=e=>mutate(o=>{o.style={...DRAW_STYLE_DEFAULTS,...o.style,width:Number(e.target.value)};});
  [['settings','Drawing settings',()=>{const {c,o}=selected();if(o)editDrawing(c,o);}],['lock','Lock or unlock drawing',()=>mutate(o=>o.locked=!o.locked)],['copy','Duplicate drawing',()=>mutate((o,c)=>{const next=JSON.parse(JSON.stringify(o));next.id='o'+Date.now();next.pts.forEach(p=>p.i+=4);c.drw.push(next);state.selObj=next.id;})],['trash','Delete drawing',()=>mutate((o,c)=>{state.drawings[c.key]=c.drw.filter(d=>d.id!==o.id);state.selObj=null;})]].forEach(([name,label,fn])=>{const b=document.createElement('button');b.type='button';b.innerHTML=icon(name);b.title=label;b.setAttribute('aria-label',label);b.onclick=fn;edit.append(b);});
  document.querySelector('.cmid').append(edit);
  function update(){
    paintFavorites();const {o}=selected();edit.hidden=!o||o.hidden;
    if(o){if(document.activeElement!==edit.querySelector('input')) edit.querySelector('input').value=o.style?.color||DRAW_STYLE_DEFAULTS.color;
      if(document.activeElement!==edit.querySelector('select'))edit.querySelector('select').value=o.style?.width||DRAW_STYLE_DEFAULTS.width;
      edit.querySelector('[aria-label="Lock or unlock drawing"]').setAttribute('aria-pressed',String(!!o.locked));}
    const cfg=state.charts[state.sel], status=ChartHistory.status(cfg.sym,cfg.iv), empty=document.querySelector('.desk-empty');
    if(!empty.hidden){empty.querySelector('h1').textContent=status.state==='loading'?'Loading your chart':'Database history';empty.querySelector('p').textContent=status.message;}
  }
  document.addEventListener('chart-render',update);document.addEventListener('click',()=>requestAnimationFrame(update));
  // Organise the actual settings fields rather than presenting inert mock controls.
  const setBody=$('setBody');
  new MutationObserver(()=>{
    if(setBody.querySelector('.research-settings-nav'))return;
    const groups=[...setBody.querySelectorAll(':scope > .set-g')];if(!groups.length)return;
    const nav=document.createElement('nav');nav.className='research-settings-nav';nav.setAttribute('aria-label','Chart settings categories');
    ['Symbol','Scales and lines','Canvas and cursor','Studies'].forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{groups.forEach((g,n)=>g.hidden=n!==i);nav.querySelectorAll('button').forEach((x,n)=>x.setAttribute('aria-pressed',String(n===i)));};nav.append(b);});
    setBody.prepend(nav);nav.firstChild.click();
  }).observe(setBody,{childList:true});
  ChartHistory.catalog().then(rows=>{ rows.forEach(row=>{const record=Feed.symbol(row.symbol);if(record) SYMBOLS[row.symbol]=record;}); }).catch(()=>{});
  update();
})();
