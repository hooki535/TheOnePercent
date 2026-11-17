/* Video-reference workspace chrome; all commands reuse the custom chart engine. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), body=document.body;
  const icon = (name) => {
    const paths={settings:'<path d="m10 2-.6 2.3-2 .9-2.2-.6L3 8.4 4.7 10v2L3 13.6l2.2 3.8 2.2-.6 2 .9L10 20h4l.6-2.3 2-.9 2.2.6 2.2-3.8-1.7-1.6v-2L21 8.4l-2.2-3.8-2.2.6-2-.9L14 2Z" transform="translate(0 1)"/><circle cx="12" cy="12" r="3"/>',indicator:'<path d="M4 19V5m0 14h16M7 15l4-6 4 3 5-8"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',grip:'<path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" stroke-width="3"/>',undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v4"/>',redo:'<path d="m16 4 5 5-5 5m5-5H11a7 7 0 0 0-7 7v4"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',candle:'<path d="M7 2v4m0 10v6M17 2v9m0 8v3"/><rect x="4" y="6" width="6" height="10"/><rect x="14" y="11" width="6" height="8"/>',bell:'<path d="M5 17V9a7 7 0 0 1 14 0v8l2 2H3zm5 5h4"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',chevron:'<path d="m8 5 7 7-7 7"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'};
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
  graphic('typeBtn','candle');$('typeBtn').setAttribute('aria-label','Chart type');graphic('indBtn','indicator','Indicators');graphic('alertBtn','bell','Alert');
  graphic('workspacePanelToggle','chevron');graphic('moreBtn','more');
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
    if(!user){profile.href='login.html';profile.classList.add('is-guest');profile.textContent='Sign in';return;}
    const meta=user.user_metadata||{}, src=meta.avatar_url||meta.picture;
    if(typeof src==='string' && /^https:\/\//.test(src)){const im=new Image();im.src=src;im.alt='';im.onerror=()=>{profile.innerHTML=icon('user');};profile.replaceChildren(im);}
    profile.title=meta.full_name||meta.name||'Your account';profile.setAttribute('aria-label',profile.title);
  }).catch(()=>{});
  // Favorites use the existing stored tool IDs and rail star controls.
  const favorites=document.createElement('div');favorites.className='research-favorites';favorites.setAttribute('role','toolbar');favorites.setAttribute('aria-label','Favourite drawing tools');document.querySelector('.cmid').append(favorites);
  let favoriteSignature='';
  function wireDrag(bar) {
    const grip=bar.querySelector('.research-grip');if(!grip)return;
    grip.onpointerdown=e=>{
      if(e.button!==0)return;e.preventDefault();grip.setPointerCapture(e.pointerId);
      const rect=bar.getBoundingClientRect(), host=bar.parentElement.getBoundingClientRect();
      const startX=e.clientX,startY=e.clientY;
      const move=event=>{const left=Math.max(4,Math.min(host.width-rect.width-4,rect.left-host.left+event.clientX-startX));const top=Math.max(4,Math.min(host.height-rect.height-40,rect.top-host.top+event.clientY-startY));bar.style.left=left+'px';bar.style.top=top+'px';bar.style.transform='none';};
      const end=()=>{grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);};
      grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
    };
  }
  function paintFavorites(){
    const ids=railFavs;
    const sig=ids.join('|')+'|'+state.tool;
    favorites.hidden=!!state.favoritesHidden || !ids.length;
    if(sig===favoriteSignature)return;favoriteSignature=sig;
    favorites.innerHTML='<span class="research-grip" title="Drag favourite tools" aria-hidden="true">'+icon('grip')+'</span>';wireDrag(favorites);
    ids.forEach(id=>{const b=document.createElement('button');b.type='button';b.innerHTML=svgIcon(id);b.title=toolName(id);b.setAttribute('aria-label',toolName(id));b.setAttribute('aria-pressed',String(state.tool===id));b.onclick=()=>pickTool(id);b.draggable=true;
      b.onkeydown=e=>{if(e.altKey && ['ArrowLeft','ArrowRight'].includes(e.key)){const index=railFavs.indexOf(id),to=index+(e.key==='ArrowLeft'?-1:1);if(to>=0&&to<railFavs.length){e.preventDefault();reorderFavorite(id,railFavs[to]);paintFavorites();favorites.querySelector(`[data-favorite="${id}"]`)?.focus();}}};
      b.dataset.favorite=id;b.setAttribute('aria-keyshortcuts','Alt+ArrowLeft Alt+ArrowRight');
      b.ondragstart=e=>{e.dataTransfer.setData('text/plain',id);b.classList.add('dragging');};
      b.ondragend=()=>b.classList.remove('dragging');b.ondragover=e=>e.preventDefault();
      b.ondrop=e=>{e.preventDefault();reorderFavorite(e.dataTransfer.getData('text/plain'),id);paintFavorites();};
      favorites.append(b);});
  }
  // A compact edit bar for the selected real drawing; engine keeps hit testing/handles.
  const edit=document.createElement('div');edit.className='research-editbar';edit.hidden=true;edit.setAttribute('role','toolbar');edit.setAttribute('aria-label','Selected drawing controls');
  edit.innerHTML='<span class="research-grip" title="Drag drawing controls" aria-hidden="true">'+icon('grip')+'</span><input type="color" aria-label="Drawing line colour"><select aria-label="Drawing line width"><option value="1">1 px</option><option value="1.5">1.5 px</option><option value="2">2 px</option><option value="3">3 px</option><option value="4">4 px</option><option value="5">5 px</option></select>';
  function selected(){const c=charts[state.sel];return {c,o:state.posSelected&&state.pos?.key===c?.key?state.pos:c?.drw.find(o=>o.id===state.selObj),position:!!(state.posSelected&&state.pos?.key===c?.key)};}
  function mutate(fn){const {c,o,position}=selected();if(!o)return;pushUndo();fn(o,c,position);if(position){recalc();syncInputs();}paintObjects();draw();}
  edit.querySelector('input').onchange=e=>mutate(o=>{o.style={...DRAW_STYLE_DEFAULTS,...o.style,color:e.target.value};});
  const dash=document.createElement('select');dash.setAttribute('aria-label','Drawing line style');dash.innerHTML='<option value="solid">Solid</option><option value="dash">Dashed</option><option value="dot">Dotted</option>';edit.append(dash);dash.onchange=e=>mutate(o=>{o.style={...DRAW_STYLE_DEFAULTS,...o.style,dash:e.target.value};});
  edit.querySelector('select').onchange=e=>mutate(o=>{o.style={...DRAW_STYLE_DEFAULTS,...o.style,width:Number(e.target.value)};});
  [['settings','Drawing settings',()=>{const {c,o,position}=selected();if(o){if(position)editPositionSettings(c);else editDrawing(c,o);}}],['lock','Lock or unlock drawing',()=>mutate(o=>o.locked=!o.locked)],['copy','Duplicate drawing',()=>mutate((o,c)=>{const next=JSON.parse(JSON.stringify(o));next.id='o'+Date.now();next.pts.forEach(p=>p.i+=4);c.drw.push(next);state.selObj=next.id;})],['trash','Delete drawing',()=>mutate((o,c,position)=>{if(position){state.pos=null;state.posSelected=false;}else state.drawings[c.key]=c.drw.filter(d=>d.id!==o.id);state.selObj=null;})]].forEach(([name,label,fn])=>{const b=document.createElement('button');b.type='button';b.innerHTML=icon(name);b.title=label;b.setAttribute('aria-label',label);b.onclick=fn;edit.append(b);});
  const labels=document.createElement('button');labels.type='button';labels.title='Show position labels';labels.setAttribute('aria-label','Show position labels');labels.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16M12 5v15M8 20h8"/></svg>';labels.onclick=()=>mutate(o=>{o.style={...DRAW_STYLE_DEFAULTS,...o.style,showLabels:o.style?.showLabels===false};});edit.append(labels);
  const fills=['targetColor','stopColor'].map((key,i)=>{const el=document.createElement('input');el.type='color';el.setAttribute('aria-label',i?'Stop fill colour':'Target fill colour');el.onchange=e=>mutate(o=>{o.style={...DRAW_STYLE_DEFAULTS,...o.style,[key]:e.target.value};});edit.append(el);return el;});
  document.querySelector('.cmid').append(edit);wireDrag(edit);
  function update(){
    paintFavorites();const {o,position}=selected();edit.hidden=!o||o.hidden;
    edit.querySelector('[aria-label="Duplicate drawing"]').hidden=position;
    edit.classList.toggle('is-position',position);
    labels.hidden=!position;fills.forEach((el,i)=>{el.hidden=!position;if(o&&document.activeElement!==el)el.value=o.style?.[i?'stopColor':'targetColor']||(i?'#f23645':'#089981');});labels.setAttribute('aria-pressed',String(o?.style?.showLabels!==false));
    if(o){if(document.activeElement!==edit.querySelector('input')) edit.querySelector('input').value=o.style?.color||DRAW_STYLE_DEFAULTS.color;
      if(document.activeElement!==edit.querySelector('select'))edit.querySelector('select').value=o.style?.width||DRAW_STYLE_DEFAULTS.width;
      if(document.activeElement!==dash)dash.value=o.style?.dash||'solid';
      edit.querySelector('[aria-label="Lock or unlock drawing"]').setAttribute('aria-pressed',String(!!o.locked));}
    const cfg=state.charts[state.sel], status=ChartHistory.status(cfg.sym,cfg.iv), empty=document.querySelector('.desk-empty');
    if(!empty.hidden){
      const loading=status.state==='loading';
      empty.querySelector('h1').textContent=loading?'Loading your chart':'Candles unavailable';
      empty.querySelector('p').textContent=loading?'Loading stored candles. You can view charts without an account.':status.message;
      const retry=empty.querySelector('.research-retry');if(retry){retry.hidden=loading;retry.disabled=loading;}
      favorites.hidden=loading || !!state.favoritesHidden || !railFavs.length;
    }else favorites.hidden=!!state.favoritesHidden || !railFavs.length;
  }
  document.addEventListener('chart-render',update);document.addEventListener('click',()=>requestAnimationFrame(update));
  // Category navigation operates on the native chart settings and handlers.
  const setBody=$('setBody');
  new MutationObserver(()=>{
    if(setBody.querySelector('.research-settings-nav'))return;
    const groups=[...setBody.querySelectorAll('[data-settings-section]')];if(!groups.length)return;
    const nav=document.createElement('nav');nav.className='research-settings-nav';nav.setAttribute('aria-label','Chart settings categories');
    const symbols=['candle','indicator','chevron','settings','eye'];
    groups.forEach((g,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=icon(symbols[i])+'<span></span>';b.querySelector('span').textContent=g.dataset.settingsSection;b.onclick=()=>{groups.forEach((section,n)=>section.hidden=n!==i);nav.querySelectorAll('button').forEach((x,n)=>x.setAttribute('aria-pressed',String(n===i)));};nav.append(b);});
    setBody.prepend(nav);nav.firstChild.click();
  }).observe(setBody,{childList:true});
  const sheet=$('setModal').querySelector('.sheet');
  const footer=document.createElement('footer');footer.className='research-settings-footer';footer.innerHTML='<span>Changes apply immediately</span><button type="button">Done</button>';footer.querySelector('button').onclick=()=>hide('#setModal');sheet.append(footer);
  $('setModal').setAttribute('role','dialog');$('setModal').setAttribute('aria-label','Chart settings');$('setModal').setAttribute('aria-modal','true');
  // Use the existing safe post-login return mechanism.
  const empty=document.querySelector('.desk-empty');
  profile.addEventListener('click',()=>window.Cloud?.setReturn('charts',location.hash));
  const retry=document.createElement('button');retry.type='button';retry.className='research-retry';retry.textContent='Retry loading candles';retry.onclick=()=>{const cfg=state.charts[state.sel];Feed.retryHistory(cfg.sym,cfg.iv);draw();};empty.querySelector('div').append(retry);
  document.querySelector('.symbol-source-filter').hidden=true;$('symBrokerDirectoryBtn').hidden=true;
  ChartHistory.catalog().then(rows=>{ rows.forEach(row=>{const record=Feed.symbol(row.symbol);if(record) SYMBOLS[row.symbol]=record;});if(!$('symModal').hidden)paintSymSearch($('symSearch').value); }).catch(()=>{});
  const compare=document.createElement('button');compare.type='button';compare.className='tb-btn research-compare';compare.title='Compare instruments';compare.setAttribute('aria-label','Compare instruments');compare.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>';compare.onclick=()=>{if(!body.classList.contains('workspace-panel-open'))command('workspacePanelToggle');switchTab('watchlist');switchWatchView('compare');};$('symBtn').after(compare);
  const caret='<svg class="research-caret" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="m1 1 4 4 4-4" stroke="currentColor" stroke-width="1.3"/></svg>';
  $('typeBtn').innerHTML=icon('candle')+caret;
  $('indBtn').innerHTML=icon('indicator')+caret+'<span id="indCount" hidden></span>';$('indBtn').title='Indicators (I)';
  $('alertBtn').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="13" r="8"/><path d="M11 8v5l3 2M3 3 1 6M19 3l2 3M18 4v6m-3-3h6"/></svg>';
  const replay=document.querySelector('.desk-replay');replay.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="m11 5-8 7 8 7V5Zm10 0-8 7 8 7V5Z"/></svg>';replay.setAttribute('aria-label','Bar replay');
  const layout=document.querySelector('.desk-layout'), camera=document.querySelector('.desk-camera'), full=$('workspaceFullscreen'), more=$('moreBtn').closest('.menu-wrap');
  options.prepend(more);
  const workspace=document.createElement('div');workspace.className='research-workspace';
  const workspaceName=document.createElement('button');workspaceName.type='button';workspaceName.className='research-workspace-name';workspaceName.innerHTML='<span>Unnamed</span>'+caret;workspaceName.setAttribute('aria-label','Saved workspaces');workspaceName.onclick=()=>command('wsBtn');
  const save=document.querySelector('.desk-save');save.removeAttribute('data-desk-action');
  // Replace the desk proxy with a new button to avoid its old open-library handler.
  const saveNow=document.createElement('button');saveNow.type='button';saveNow.className='research-save';saveNow.textContent='Save';saveNow.title='Save workspace (Ctrl+S)';saveNow.onclick=()=>saveWorkspace();save.remove();workspace.append(workspaceName,saveNow);
  graphic('workspaceFullscreen','chevron');full.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/></svg>';full.setAttribute('aria-label','Full screen');
  const summary=document.querySelector('.desk-options summary');summary.innerHTML=icon('more');summary.title='More workspace options';
  toolbar.append(layout,workspace,appearance,full,camera,document.querySelector('.desk-options'),profile);
  document.addEventListener('chart-workspace-saved',e=>{workspaceName.querySelector('span').textContent=e.detail.name;});
  const notice=document.createElement('dialog');notice.className='research-save-notice';notice.innerHTML='<h2>Save your workspace</h2><p>Sign in to keep your saved workspace with your account. You can keep using charts without signing in.</p><div><button type="button">Keep exploring</button><a href="login.html">Sign in</a></div>';
  notice.querySelector('button').onclick=()=>notice.close();notice.querySelector('a').onclick=()=>window.Cloud?.setReturn('charts',location.hash);document.body.append(notice);
  document.addEventListener('chart-save-signin',()=>{if(!notice.open)notice.showModal();});
  update();
})();
