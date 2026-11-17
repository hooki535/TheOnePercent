/* Saved workspace manager; existing settings key and custom chart layouts. */
const WorkspaceModel=(()=>{
  const clone=x=>JSON.parse(JSON.stringify(x));
  const layouts=[1,2,3,4,6];
  const key=w=>w.id||JSON.stringify([w.name,w.at,w.data]);
  function valid(w){return !!w?.data&&layouts.includes(w.data.layout)&&Array.isArray(w.data.charts)&&w.data.charts.length>=w.data.layout&&w.data.charts.every(c=>c&&typeof c.sym==='string'&&typeof c.iv==='string');}
  function validateName(name,list,except){const n=name.trim();if(!n||n.length>80)return 'Use a name between 1 and 80 characters.';if(list.some(w=>key(w)!==except&&String(w.name).trim().toLowerCase()===n.toLowerCase()))return 'That workspace name is already in use.';return '';}
  function copyName(name,list){let n=1,next;do{const suffix=' copy'+(n===1?'':' '+n);next=String(name).slice(0,80-suffix.length)+suffix;n++;}while(list.some(w=>String(w.name).toLowerCase()===next.toLowerCase()));return next;}
  function restore(w,defaults){if(!valid(w))throw Error('This workspace has an incomplete chart configuration.');const o=clone(w.data),saved=o.charts;o.charts=Array.from({length:6},(_,i)=>{const base=clone(defaults[i]||defaults[0]),s=saved[i];return s?{...base,...s,studies:s.studies||base.studies,view:{...base.view,...s.view},scale:{...base.scale,...s.scale}}:base;});o.drawings=o.drawings||{};o.pos=o.pos||null;if(typeof PositionPlanModel!=='undefined')Object.assign(o,PositionPlanModel.normalise(o));return {data:o,look:clone(w.look||{}),watch:Array.isArray(w.watch)?clone(w.watch):null,selected:Number.isInteger(w.selected)&&w.selected>=0&&w.selected<o.layout?w.selected:0};}
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function layoutGraphic(n){return '<span class="wm-layout-icon" style="--cols:'+(n===1?1:n===2||n===4?2:3)+'" aria-hidden="true">'+'<i></i>'.repeat(n)+'</span>';}
  function rowHTML(w,i,current,renaming){
    const ready=valid(w),count=ready?w.data.layout:1,id=key(w),date=new Date(w.at),stamp=Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}),esc=escape;
    return '<article class="wm-row '+(id===current?'current':'')+'" data-wm-row="'+i+'">'+layoutGraphic(count)+'<div class="wm-row-content"><div class="wm-row-title">'+(renaming===id?'<input aria-label="Rename workspace" maxlength="80" value="'+esc(w.name)+'">':'<b>'+esc(w.name||'Untitled')+'</b>'+(id===current?'<span class="wm-current">Current</span>':''))+'</div><p class="wm-symbols">'+(ready?w.data.charts.slice(0,count).map(c=>esc(c.sym)+' <span>'+esc(c.iv)+'</span>').join(' · '):'Incomplete configuration · cannot open')+'</p><small>'+count+' chart'+(count===1?'':'s')+' · '+esc(stamp)+'</small></div><div class="wm-row-actions">'+(renaming===id?'<button type="button" data-wm-action="rename-save">Save</button><button type="button" data-wm-action="rename-cancel">Cancel</button>':'<button type="button" class="wm-open" data-wm-action="open" '+(!ready?'disabled':'')+'>Open</button><button type="button" class="wm-more" data-wm-menu="'+i+'" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for '+esc(w.name)+'"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>')+'</div></article>';
  }
  return {clone,key,valid,validateName,copyName,restore,escape,layoutGraphic,rowHTML};
})();
(function(){
  const $=id=>document.getElementById(id),esc=WorkspaceModel.escape,defaults=WorkspaceModel.clone(state.charts);let current=null,renaming=null,deleted=null,naming=false;
  const modal=$('wsModal'),list=$('wsList'),body=modal.querySelector('.sheet-b'),footer=modal.querySelector('.sheet-f');
  const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const pencil=icon('<path d="m14 4 6 6M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16Z"/>'),copy=icon('<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>'),trash=icon('<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>');
  const layoutGraphic=WorkspaceModel.layoutGraphic;
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','workspaceManagerTitle');modal.querySelector('.sheet-h b').id='workspaceManagerTitle';modal.querySelector('.sh-sub').textContent='Your charts. Ready for the next session.';
  const tools=document.createElement('div');tools.className='wm-tools';tools.innerHTML='<label class="wm-search">'+icon('<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>')+'<input type="search" aria-label="Search saved workspaces" placeholder="Search workspaces or symbols"></label><select aria-label="Sort workspaces"><option value="recent">Recently saved</option><option value="name">Name A–Z</option></select>';body.before(tools);
  const banner=document.createElement('div');banner.className='wm-banner';tools.after(banner);
  footer.innerHTML='<div class="wm-save-form" hidden><label for="workspaceNewName">Workspace name</label><div><input id="workspaceNewName" maxlength="80" placeholder="e.g. London Session" aria-label="New workspace name"><button type="button" class="btn primary" id="wsSave">Save workspace</button><button type="button" class="btn" id="workspaceCancelNew">Cancel</button></div></div><p class="wm-error" role="alert"></p><div class="wm-footer-controls"><div class="wm-footer-copy"><b id="workspaceSaveLabel">Save this chart setup</b><small>Save explicitly when your setup is ready.</small></div><div class="wm-footer-buttons"><button type="button" class="btn" id="workspaceAsNew">Save as new</button><button type="button" class="btn primary" id="workspaceUpdate">Save workspace</button></div></div>';
  const context=document.createElement('div');context.className='wm-context';context.hidden=true;context.setAttribute('role','menu');context.setAttribute('aria-label','Workspace actions');modal.append(context);let menuTrigger=null;
  function closeContext(focus=false){context.hidden=true;if(menuTrigger){menuTrigger.setAttribute('aria-expanded','false');if(focus&&menuTrigger.isConnected)menuTrigger.focus();}menuTrigger=null;}
  function openContext(trigger,run){closeContext();menuTrigger=trigger;trigger.setAttribute('aria-expanded','true');context.innerHTML=[['rename','Rename',pencil],['copy','Duplicate',copy],['delete','Delete',trash]].map(([action,label,svg])=>'<button type="button" role="menuitem" data-context-action="'+action+'">'+svg+'<span>'+label+'</span></button>').join('');context.hidden=false;const r=trigger.getBoundingClientRect(),w=174,h=144;context.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';context.style.top=(r.bottom+h+8<innerHeight?r.bottom+6:Math.max(8,r.top-h-6))+'px';context.querySelectorAll('button').forEach(b=>b.onclick=()=>{const action=b.dataset.contextAction;closeContext();run(action);});context.querySelector('button').focus();}
  context.onkeydown=e=>{const buttons=[...context.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeContext(true);}if(e.key==='Tab')closeContext();};
  document.addEventListener('pointerdown',e=>{if(!context.hidden&&!context.contains(e.target)&&!menuTrigger?.contains(e.target))closeContext();});
  modal.addEventListener('pplx-dismiss',()=>{closeContext();naming=false;renaming=null;error('');});addEventListener('resize',()=>closeContext());body.addEventListener('scroll',()=>closeContext(),{passive:true});
  function beginNew(){naming=true;paint();$('workspaceNewName').focus();}

  const error=message=>{footer.querySelector('.wm-error').textContent=message||'';};
  const findCurrent=()=>readWS().find(w=>WorkspaceModel.key(w)===current);
  async function authorised(){if(window.THEONEPERCENT_CHART_ARCHIVE&&(!window.Cloud||!await Cloud.ready)){document.dispatchEvent(new Event('chart-save-signin'));return false;}return true;}
  function persist(records){try{Store.settings.patch({chartsWorkspaces:WorkspaceModel.clone(records)});return true;}catch{error('The workspace could not be saved. Please try again.');return false;}}
  function announce(w){current=WorkspaceModel.key(w);document.dispatchEvent(new CustomEvent('chart-workspace-saved',{detail:{name:w.name}}));}
  function nowRecord(name,id){return {id:id||'workspace-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name,at:new Date().toISOString(),data:JSON.parse(snapshotState()),look:WorkspaceModel.clone(state.look),watch:state.watch.slice(),type:state.type,selected:state.sel};}
  function paint(){
    const records=readWS(),term=tools.querySelector('input').value.trim().toLowerCase(),sort=tools.querySelector('select').value;
    const rows=records.filter(w=>[w.name,...(w.data?.charts||[]).map(c=>c.sym)].join(' ').toLowerCase().includes(term));rows.sort((a,b)=>sort==='name'?String(a.name).localeCompare(String(b.name)):(Date.parse(b.at)||0)-(Date.parse(a.at)||0));
    closeContext();if(!modal.hidden)layout.open=false;
    const active=findCurrent();$('workspaceUpdate').textContent=active?'Save changes':'Save workspace';$('workspaceSaveLabel').textContent=active?'Save changes to '+active.name:'Save this chart setup';footer.querySelector('.wm-save-form').hidden=!naming;
    banner.innerHTML=deleted?'<span>Workspace deleted.</span><button type="button" data-undo-workspace>Undo</button>':'<span>'+records.length+' workspace'+(records.length===1?'':'s')+'</span><button type="button" data-new-workspace>+ New workspace</button>';
    banner.querySelector('[data-new-workspace]')?.addEventListener('click',beginNew);
    banner.querySelector('[data-undo-workspace]')?.addEventListener('click',async()=>{if(!await authorised())return;const next=readWS();if(next.some(w=>WorkspaceModel.key(w)===WorkspaceModel.key(deleted.record))){error('This workspace has already been restored.');return;}next.splice(Math.min(deleted.index,next.length),0,deleted.record);if(persist(next)){deleted=null;paint();}});
    list.innerHTML=rows.length?rows.map((w,i)=>WorkspaceModel.rowHTML(w,i,current,renaming)).join(''):'<div class="wm-empty">'+layoutGraphic(state.layout)+'<b>'+(records.length?'No matching workspaces':'Your next session, ready to reopen')+'</b><p>'+(records.length?'Try another name or symbol.':'Choose a chart layout, add your studies and drawings, then save your setup below.')+'</p></div>';
    list.querySelectorAll('[data-wm-row]').forEach(row=>{const run=async(action)=>{
      const record=rows[+row.dataset.wmRow],key=WorkspaceModel.key(record);let latest=readWS(),index=latest.findIndex(w=>WorkspaceModel.key(w)===key);if(index<0){error('This workspace changed. Reopen the list and try again.');paint();return;}
      error('');if(action==='open'){
        let restored;try{restored=WorkspaceModel.restore(latest[index],defaults);}catch(e){error(e.message);return;}
        pushUndo();state.look={...state.look,...restored.look};if(restored.watch)state.watch=restored.watch;state.sel=restored.selected;applySnap(JSON.stringify(restored.data));paintLayoutBtn();announce(latest[index]);hide('#wsModal');toast('Workspace opened',record.name);return;
      }
      if(action==='rename-cancel'){renaming=null;paint();return;}if(action==='rename'){renaming=key;paint();list.querySelector('[aria-label="Rename workspace"]')?.focus();return;}
      if(!await authorised())return;latest=readWS();index=latest.findIndex(w=>WorkspaceModel.key(w)===key);if(index<0){error('This workspace changed. Reopen the list and try again.');paint();return;}
      if(action==='rename-save'){const name=row.querySelector('input').value.trim(),message=WorkspaceModel.validateName(name,latest,key);if(message){error(message);return;}latest[index]={...latest[index],name};if(persist(latest)){if(current===key)announce(latest[index]);renaming=null;paint();}return;}
      if(action==='copy'){if(latest.length>=20){error('You have 20 workspaces. Remove one before creating another.');return;}const copied={...WorkspaceModel.clone(latest[index]),id:'workspace-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:WorkspaceModel.copyName(record.name,latest),at:new Date().toISOString()};latest.unshift(copied);if(persist(latest))paint();return;}
      if(action==='delete'){deleted={record:WorkspaceModel.clone(latest[index]),index};latest.splice(index,1);if(persist(latest)){if(current===key){current=null;document.dispatchEvent(new CustomEvent('chart-workspace-saved',{detail:{name:'Unnamed'}}));}renaming=null;paint();}}
    };row.querySelectorAll('[data-wm-action]').forEach(b=>b.onclick=()=>run(b.dataset.wmAction));const trigger=row.querySelector('[data-wm-menu]');if(trigger){trigger.onclick=()=>openContext(trigger,run);trigger.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();openContext(trigger,run);}};}row.querySelector('[aria-label="Rename workspace"]')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run('rename-save');}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();run('rename-cancel');}});});
  }
  async function save(asNew=false){
    if(!await authorised())return;
    const records=readWS(),active=asNew?null:findCurrent();
    if(!asNew&&!active){show('#wsModal');beginNew();return;}
    const name=active?active.name:$('workspaceNewName').value.trim(),message=WorkspaceModel.validateName(name,records,active&&WorkspaceModel.key(active));if(message){error(message);return;}
    if(!active&&records.length>=20){error('You have 20 workspaces. Remove one before saving another.');return;}
    const w=nowRecord(name,active?.id);if(active){const index=records.findIndex(x=>WorkspaceModel.key(x)===current);records[index]={...records[index],...w};}else records.unshift(w);
    if(persist(records)){announce(w);error('');naming=false;$('workspaceNewName').value='';paint();toast('Workspace saved',name,'up');}
  }
  tools.querySelector('input').oninput=paint;tools.querySelector('select').onchange=paint;$('wsSave').onclick=()=>save(true);$('workspaceUpdate').onclick=()=>findCurrent()?save(false):beginNew();$('workspaceAsNew').onclick=beginNew;$('workspaceCancelNew').onclick=()=>{naming=false;error('');paint();};$('workspaceNewName').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save(true);}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();naming=false;error('');paint();}};
  // Enhance the working layout picker; each button still invokes the existing engine.
  const layout=document.querySelector('.desk-layout'),menu=layout.querySelector('.desk-layout-menu');
  menu.querySelector('small').textContent='Each chart keeps its own timeframe and studies.';
  const sync=document.createElement('div');sync.className='wm-sync';sync.innerHTML='<b>Synchronise charts</b><label><input type="checkbox" data-wm-sync="syncSymbol">Symbol</label><label><input type="checkbox" data-wm-sync="syncCross">Crosshair</label>';menu.append(sync);
  sync.querySelectorAll('input').forEach(input=>{input.checked=!!state.look[input.dataset.wmSync];input.onchange=()=>{state.look[input.dataset.wmSync]=input.checked;draw();};});
  layout.addEventListener('toggle',()=>{if(layout.open)sync.querySelectorAll('input').forEach(input=>input.checked=!!state.look[input.dataset.wmSync]);});
  document.addEventListener('pointerdown',e=>{if(layout.open&&!layout.contains(e.target))layout.open=false;});
  layout.addEventListener('keydown',e=>{if(e.key==='Escape'){layout.open=false;layout.querySelector('summary').focus();}});
  window.ChartWorkspaces={paint,save};
  addEventListener('storechange',e=>{if(['settings','*'].includes(e.detail?.kind)&&!modal.hidden)paint();});
  paint();
})();
