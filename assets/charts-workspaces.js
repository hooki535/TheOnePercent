/* Saved workspace manager; existing settings key and custom chart layouts. */
const WorkspaceModel=(()=>{
  const clone=x=>JSON.parse(JSON.stringify(x));
  const layouts=[1,2,3,4,6];
  const key=w=>w.id||JSON.stringify([w.name,w.at,w.data]);
  function valid(w){return !!w?.data&&layouts.includes(w.data.layout)&&Array.isArray(w.data.charts)&&w.data.charts.length>=w.data.layout&&w.data.charts.every(c=>c&&typeof c.sym==='string'&&typeof c.iv==='string');}
  function validateName(name,list,except){const n=name.trim();if(!n||n.length>80)return 'Use a name between 1 and 80 characters.';if(list.some(w=>key(w)!==except&&String(w.name).trim().toLowerCase()===n.toLowerCase()))return 'That workspace name is already in use.';return '';}
  function copyName(name,list){let n=1,next;do{const suffix=' copy'+(n===1?'':' '+n);next=String(name).slice(0,80-suffix.length)+suffix;n++;}while(list.some(w=>String(w.name).toLowerCase()===next.toLowerCase()));return next;}
  function restore(w,defaults){if(!valid(w))throw Error('This workspace has an incomplete chart configuration.');const o=clone(w.data),saved=o.charts;o.charts=Array.from({length:6},(_,i)=>{const base=clone(defaults[i]||defaults[0]),s=saved[i];return s?{...base,...s,studies:s.studies||base.studies,view:{...base.view,...s.view},scale:{...base.scale,...s.scale}}:base;});o.drawings=o.drawings||{};o.pos=o.pos||null;return {data:o,look:clone(w.look||{}),watch:Array.isArray(w.watch)?clone(w.watch):null,selected:Number.isInteger(w.selected)&&w.selected>=0&&w.selected<o.layout?w.selected:0};}
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return {clone,key,valid,validateName,copyName,restore,escape};
})();
(function(){
  const $=id=>document.getElementById(id),esc=WorkspaceModel.escape,defaults=WorkspaceModel.clone(state.charts);let current=null,renaming=null,deleted=null;
  const modal=$('wsModal'),list=$('wsList'),body=modal.querySelector('.sheet-b'),footer=modal.querySelector('.sheet-f');
  const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const pencil=icon('<path d="m14 4 6 6M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16Z"/>'),copy=icon('<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>'),trash=icon('<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>');
  function layoutGraphic(n){return '<span class="wm-layout-icon" style="--cols:'+(n===1?1:n===2||n===4?2:3)+'">'+'<i></i>'.repeat(n)+'</span>';}
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','workspaceManagerTitle');modal.querySelector('.sheet-h b').id='workspaceManagerTitle';modal.querySelector('.sh-sub').textContent='Keep your symbols, studies, drawings and layout together.';
  const tools=document.createElement('div');tools.className='wm-tools';tools.innerHTML='<input type="search" aria-label="Search saved workspaces" placeholder="Search workspaces or symbols"><select aria-label="Sort workspaces"><option value="recent">Recently saved</option><option value="name">Name A–Z</option></select>';body.before(tools);
  const banner=document.createElement('div');banner.className='wm-banner';tools.after(banner);
  footer.innerHTML='<div class="wm-save-form"><label for="workspaceNewName">Save this chart setup as a new workspace</label><div><input id="workspaceNewName" maxlength="80" placeholder="e.g. London session" aria-label="New workspace name"><button type="button" class="btn primary" id="wsSave">Save as new</button></div></div><p class="wm-error" role="alert"></p><div class="wm-footer-note"><span>Explicit saves · Uses your existing workspace storage</span><button type="button" class="btn sm" id="workspaceUpdate">Update current</button></div>';
  const error=message=>{footer.querySelector('.wm-error').textContent=message||'';};
  const findCurrent=()=>readWS().find(w=>WorkspaceModel.key(w)===current);
  async function authorised(){if(window.THEONEPERCENT_CHART_ARCHIVE&&(!window.Cloud||!await Cloud.ready)){document.dispatchEvent(new Event('chart-save-signin'));return false;}return true;}
  function persist(records){try{Store.settings.patch({chartsWorkspaces:WorkspaceModel.clone(records)});return true;}catch{error('The workspace could not be saved. Please try again.');return false;}}
  function announce(w){current=WorkspaceModel.key(w);document.dispatchEvent(new CustomEvent('chart-workspace-saved',{detail:{name:w.name}}));}
  function nowRecord(name,id){return {id:id||'workspace-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name,at:new Date().toISOString(),data:JSON.parse(snapshotState()),look:WorkspaceModel.clone(state.look),watch:state.watch.slice(),type:state.type,selected:state.sel};}
  function paint(){
    const records=readWS(),term=tools.querySelector('input').value.trim().toLowerCase(),sort=tools.querySelector('select').value;
    const rows=records.filter(w=>[w.name,...(w.data?.charts||[]).map(c=>c.sym)].join(' ').toLowerCase().includes(term));rows.sort((a,b)=>sort==='name'?String(a.name).localeCompare(String(b.name)):(Date.parse(b.at)||0)-(Date.parse(a.at)||0));
    const active=findCurrent();$('workspaceUpdate').hidden=!active;
    banner.innerHTML=deleted?'<span>Workspace deleted.</span><button type="button" data-undo-workspace>Undo</button>':'<span>'+records.length+' saved · Current setup: '+state.layout+' chart'+(state.layout===1?'':'s')+'</span>';
    banner.querySelector('[data-undo-workspace]')?.addEventListener('click',async()=>{if(!await authorised())return;const next=readWS();if(next.some(w=>WorkspaceModel.key(w)===WorkspaceModel.key(deleted.record))){error('This workspace has already been restored.');return;}next.splice(Math.min(deleted.index,next.length),0,deleted.record);if(persist(next)){deleted=null;paint();}});
    list.innerHTML=rows.length?rows.map((w,i)=>{const valid=WorkspaceModel.valid(w),count=valid?w.data.layout:1,key=WorkspaceModel.key(w),date=new Date(w.at),stamp=Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});return '<article class="wm-row '+(key===current?'current':'')+'" data-wm-row="'+i+'"><div class="wm-row-head">'+layoutGraphic(count)+'<div class="wm-row-title">'+(renaming===key?'<input aria-label="Rename workspace" maxlength="80" value="'+esc(w.name)+'">':'<b>'+esc(w.name||'Untitled')+'</b>')+'<small>'+esc(stamp)+(key===current?' · Open':'')+'</small></div></div><p class="wm-symbols">'+(valid?w.data.charts.slice(0,count).map(c=>esc(c.sym)+' <span>'+esc(c.iv)+'</span>').join(' · '):'Incomplete configuration · cannot open')+'</p><div class="wm-row-actions">'+(renaming===key?'<button type="button" data-wm-action="rename-save">Save name</button><button type="button" data-wm-action="rename-cancel">Cancel</button>':'<button type="button" class="wm-open" data-wm-action="open" '+(!valid?'disabled':'')+'>Open</button><button type="button" data-wm-action="rename" aria-label="Rename '+esc(w.name)+'">'+pencil+'</button><button type="button" data-wm-action="copy" aria-label="Duplicate '+esc(w.name)+'">'+copy+'</button><button type="button" data-wm-action="delete" aria-label="Delete '+esc(w.name)+'">'+trash+'</button>')+'</div></article>';}).join(''):'<div class="wm-empty">'+layoutGraphic(state.layout)+'<b>'+(records.length?'No matching workspaces':'Your next session, ready to reopen')+'</b><p>'+(records.length?'Try another name or symbol.':'Choose a chart layout, add your studies and drawings, then save your setup below.')+'</p></div>';
    list.querySelectorAll('[data-wm-row]').forEach(row=>row.querySelectorAll('[data-wm-action]').forEach(b=>b.onclick=async()=>{
      const record=rows[+row.dataset.wmRow],key=WorkspaceModel.key(record),action=b.dataset.wmAction;let latest=readWS(),index=latest.findIndex(w=>WorkspaceModel.key(w)===key);if(index<0){error('This workspace changed. Reopen the list and try again.');paint();return;}
      error('');if(action==='open'){
        let restored;try{restored=WorkspaceModel.restore(latest[index],defaults);}catch(e){error(e.message);return;}
        pushUndo();state.look={...state.look,...restored.look};if(restored.watch)state.watch=restored.watch;state.sel=restored.selected;applySnap(JSON.stringify(restored.data));paintLayoutBtn();announce(latest[index]);hide('#wsModal');toast('Workspace opened',record.name);return;
      }
      if(action==='rename-cancel'){renaming=null;paint();return;}if(action==='rename'){renaming=key;paint();list.querySelector('[aria-label="Rename workspace"]')?.focus();return;}
      if(!await authorised())return;latest=readWS();index=latest.findIndex(w=>WorkspaceModel.key(w)===key);if(index<0){error('This workspace changed. Reopen the list and try again.');paint();return;}
      if(action==='rename-save'){const name=row.querySelector('input').value.trim(),message=WorkspaceModel.validateName(name,latest,key);if(message){error(message);return;}latest[index]={...latest[index],name};if(persist(latest)){if(current===key)announce(latest[index]);renaming=null;paint();}return;}
      if(action==='copy'){if(latest.length>=20){error('You have 20 workspaces. Remove one before creating another.');return;}const copied={...WorkspaceModel.clone(latest[index]),id:'workspace-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:WorkspaceModel.copyName(record.name,latest),at:new Date().toISOString()};latest.unshift(copied);if(persist(latest))paint();return;}
      if(action==='delete'){deleted={record:WorkspaceModel.clone(latest[index]),index};latest.splice(index,1);if(persist(latest)){if(current===key){current=null;document.dispatchEvent(new CustomEvent('chart-workspace-saved',{detail:{name:'Unnamed'}}));}renaming=null;paint();}}
    }));
  }
  async function save(asNew=false){
    if(!await authorised())return;
    const records=readWS(),active=asNew?null:findCurrent();
    if(!asNew&&!active){show('#wsModal');paint();$('workspaceNewName').focus();return;}
    const name=active?active.name:$('workspaceNewName').value.trim(),message=WorkspaceModel.validateName(name,records,active&&WorkspaceModel.key(active));if(message){error(message);return;}
    if(!active&&records.length>=20){error('You have 20 workspaces. Remove one before saving another.');return;}
    const w=nowRecord(name,active?.id);if(active){const index=records.findIndex(x=>WorkspaceModel.key(x)===current);records[index]={...records[index],...w};}else records.unshift(w);
    if(persist(records)){announce(w);error('');$('workspaceNewName').value='';paint();toast('Workspace saved',name,'up');}
  }
  tools.querySelector('input').oninput=paint;tools.querySelector('select').onchange=paint;$('wsSave').onclick=()=>save(true);$('workspaceUpdate').onclick=()=>save(false);
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
