/* Named, independently managed position drawings in the existing Object Tree. */
const PositionTree=(()=>{
  let renaming=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ratio=p=>{const r=Math.abs(p.entry-p.stop);return r?(Math.abs(p.target-p.entry)/r).toFixed(2)+'R gross':'—';};
  const icons={copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',long:'<path d="m4 19 15-15M9 4h10v10"/>',short:'<path d="m4 5 15 15M9 20h10V10"/>'};
  const svg=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[k]+'</svg>';
  function refresh(){recalc();syncInputs();paintObjects();draw();}
  function action(p,act,chart){
    if(act==='settings'){PositionPlans.select(p.id);editPositionSettings(chart,p);draw();return;}
    if(act==='rename'){renaming=p.id;paintObjects();document.querySelector('#positionObjects input')?.focus();return;}
    if(act==='rename-cancel'){renaming=null;paintObjects();return;}
    if(act==='rename-save'){
      const input=document.querySelector('#positionObjects input'),name=input.value.trim();if(!name||name.length>80){input.setCustomValidity('Use a name between 1 and 80 characters.');input.reportValidity();return;}pushUndo();p.name=name;renaming=null;refresh();return;
    }
    pushUndo();if(act==='eye')p.hidden=!p.hidden;if(act==='lock')p.locked=!p.locked;if(act==='copy')PositionPlans.duplicate(p.id);if(act==='delete')PositionPlans.remove(p.id);refresh();
  }
  function paint(chart){
    const list=PositionPlans.forChart(chart.key),root=document.getElementById('objs');
    if(list.length)root.querySelector('.empty')?.remove();
    const host=document.createElement('div');host.id='positionObjects';host.className='pp-tree';root.prepend(host);
    if(!list.length)return;
    host.innerHTML='<div class="pp-title">Position drawings <span>'+list.length+'</span></div>'+list.map(p=>`<div class="pp-row ${state.posSelected&&p.id===state.activePositionId?'is-selected':''} ${p.hidden?'is-hidden':''}" data-position-row="${esc(p.id)}"><span class="pp-direction ${p.side}">${svg(p.side)}</span>${renaming===p.id?`<div class="pp-rename"><input aria-label="Position name" maxlength="80" value="${esc(p.name)}"><button data-pp-action="rename-save">Save</button><button data-pp-action="rename-cancel">Cancel</button></div>`:`<button class="pp-select" data-pp-select aria-label="Select ${esc(p.name)}"><b>${esc(p.name)}</b><small>${p.side==='short'?'Short':'Long'} position · ${ratio(p)}</small></button><button data-pp-action="eye" aria-label="${p.hidden?'Show':'Hide'} ${esc(p.name)}" title="${p.hidden?'Show':'Hide'}">${objectIcon(p.hidden?'hidden':'eye')}</button><button data-pp-action="lock" aria-label="${p.locked?'Unlock':'Lock'} ${esc(p.name)}" title="${p.locked?'Unlock':'Lock'}">${objectIcon(p.locked?'lock':'unlock')}</button><details class="pp-menu"><summary role="button" aria-haspopup="menu" aria-label="Actions for ${esc(p.name)}">${svg('more')}</summary><div>${[['settings','Settings'],['rename','Rename'],['copy','Duplicate'],['delete','Delete']].map(([a,n])=>`<button aria-label="${n} position" data-pp-action="${a}">${n}</button>`).join('')}</div></details>`}</div>`).join('');
    const selected=state.posSelected&&list.find(p=>p.id===state.activePositionId);
    if(selected)host.insertAdjacentHTML('beforeend',`<section class="pp-inspector"><h3>${esc(selected.name)}</h3><p>Selected drawing · ${ratio(selected)}</p><div>${[['settings','Settings'],['copy','Duplicate'],['delete','Delete']].map(([a,n])=>`<button data-pp-inspect="${a}">${a==='copy'?svg('copy'):objectIcon(a==='settings'?'set':'del')}<span>${n}</span></button>`).join('')}</div><button class="pp-save" data-pp-save>Save workspace</button></section>`);
    host.querySelectorAll('[data-position-row]').forEach(row=>{const p=PositionPlans.find(row.dataset.positionRow);row.querySelector('[data-pp-select]')?.addEventListener('click',()=>{PositionPlans.select(p.id);refresh();});row.querySelectorAll('[data-pp-action]').forEach(b=>b.onclick=()=>action(p,b.dataset.ppAction,chart));row.querySelector('input')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();action(p,'rename-save',chart);}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();action(p,'rename-cancel',chart);}});});
    host.querySelectorAll('.pp-menu').forEach(menu=>{menu.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();menu.open=false;menu.querySelector('summary').focus();}const buttons=[...menu.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);let n;if(e.key==='ArrowDown')n=(i+1)%buttons.length;if(e.key==='ArrowUp')n=(i+buttons.length-1)%buttons.length;if(e.key==='Home')n=0;if(e.key==='End')n=buttons.length-1;if(n!=null){e.preventDefault();menu.open=true;buttons[n].focus();}};});
    host.querySelectorAll('[data-pp-inspect]').forEach(b=>b.onclick=()=>action(selected,b.dataset.ppInspect,chart));host.querySelector('[data-pp-save]')?.addEventListener('click',()=>saveWorkspace());
  }
  return {paint};
})();

function openPositionCtx(x,y,chart,plan){
  const menu=document.getElementById('ctx');menu.innerHTML='';
  for(const [label,run] of [['Position settings…',()=>editPositionSettings(chart,plan)],['Duplicate position',()=>{pushUndo();PositionPlans.duplicate(plan.id);recalc();}], [plan.locked?'Unlock position':'Lock position',()=>{pushUndo();plan.locked=!plan.locked;}], [plan.hidden?'Show position':'Hide position',()=>{pushUndo();plan.hidden=!plan.hidden;}],['Remove position',()=>{pushUndo();PositionPlans.remove(plan.id);recalc();}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{menu.hidden=true;run();paintObjects();draw();};menu.append(b);}
  menu.style.left=Math.max(8,Math.min(innerWidth-210,x))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-200,y))+'px';menu.hidden=false;menu.querySelector('button').focus();
}
