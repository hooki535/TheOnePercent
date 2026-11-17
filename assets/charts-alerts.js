/* Local price alerts: observed closes, one-time triggers and transactional editing. */
const PriceAlertModel=(()=>{
  const ops=['crosses','crosses up','crosses down','is above','is below'];
  const operation=a=>a.op||(a.dir==='down'?'is below':'is above');
  function supported(a){if(!a.iv)return false;return a.type==='price'||(!a.type&&(!a.cond||/^price\b/i.test(a.cond))&&!/\d+ conditions/i.test(a.cond));}
  function validate(a){if(!a.sym)return 'Choose an instrument.';if(!Number.isFinite(a.px)||a.px<=0)return 'Enter a price greater than zero.';if(!ops.includes(operation(a)))return 'Choose a supported price condition.';if(!a.iv)return 'Choose a timeframe.';if(!(a.name||'').trim())return 'Enter a name for this alert.';return '';}
  function sample(bars,cutoff=null){if(!bars?.length)return null;let i=bars.length-1;if(cutoff!==null){if(!Number.isFinite(cutoff))return null;while(i>=0&&bars[i].t>cutoff)i--;}const b=bars[i];return b&&Number.isFinite(b.t)&&Number.isFinite(b.c)?{t:b.t,price:b.c}:null;}
  function hit(a,previous,next){if(!a.on||a.fired||!supported(a)||!previous||!next||!Number.isFinite(a.px))return false;if(next.t<previous.t||(next.t===previous.t&&next.price===previous.price))return false;const up=(previous.price<a.px&&next.price>=a.px)||(previous.price===a.px&&next.price>a.px),down=(previous.price>a.px&&next.price<=a.px)||(previous.price===a.px&&next.price<a.px);switch(operation(a)){case 'crosses':return up||down;case 'crosses up':return up;case 'crosses down':return down;case 'is above':return next.price>a.px;case 'is below':return next.price<a.px;default:return false;}}
  const status=a=>!supported(a)?'review':a.fired?'triggered':a.on?'active':'paused';
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return {ops,operation,supported,validate,sample,hit,status,escape};
})();
(function(){
  const $=id=>document.getElementById(id),esc=PriceAlertModel.escape,seen=new Map();let editing=null,view='alerts',filter='all';
  const paths={bell:'<path d="M5 17V9a7 7 0 0 1 14 0v8l2 2H3zm5 5h4"/>',edit:'<path d="m14 4 6 6M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m7 4 13 8-13 8Z"/>',trash:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',plus:'<path d="M12 5v14M5 12h14"/>'};
  const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n]}</svg>`;
  const panel=document.querySelector('[data-pane="alerts"]');panel.querySelector('.mh').textContent='Price alerts';$('newAlert').innerHTML=icon('plus');$('newAlert').setAttribute('aria-label','Create price alert');
  const controls=document.createElement('div');controls.className='pa-controls';controls.innerHTML='<div class="pa-tabs" role="tablist" aria-label="Alert views"><button type="button" role="tab" data-pa-view="alerts">Alerts</button><button type="button" role="tab" data-pa-view="log">Log</button></div><select aria-label="Filter alerts"><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="triggered">Triggered</option><option value="review">Needs review</option></select>';panel.querySelector('.ob-top').after(controls);
  const notice=document.createElement('p');notice.className='pa-notice';notice.textContent='In-app only · This chart must stay open. Stored history is evaluated only as new closes arrive or you advance replay.';controls.after(notice);
  function title(a){return a.name||a.title||a.sym+' price alert';}
  function interval(a){return a.iv||state.charts[state.sel].iv;}
  function observe(a){const cfg=state.charts[state.sel],replay=state.replay.on;if(replay&&(a.sym!==cfg.sym||interval(a)!==cfg.iv))return null;return PriceAlertModel.sample(getSeries(a.sym,interval(a)),replay?replayTime():null);}
  function signature(a){return [a.sym,interval(a),a.px,PriceAlertModel.operation(a),state.replay.on?'replay':'history'].join('|');}
  function arm(a){seen.set(String(a.id),{signature:signature(a),sample:observe(a)});}
  function logs(){const value=Store.settings.get().chartsAlertLog;return Array.isArray(value)?value:[];}
  function paint(){
    if(!$('al'))return;controls.querySelectorAll('[data-pa-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.paView===view)));controls.querySelector('select').hidden=view==='log';
    if(view==='log'){const rows=logs();$('al').innerHTML=rows.length?rows.map(a=>`<article class="pa-log"><b>${esc(a.title)}</b><p>${esc(a.symbol)} · ${esc(a.interval)} · ${esc(a.price)}</p><small>${esc(a.barTime)} UTC · ${a.mode==='replay'?'Replay':'Observed close'}</small>${a.message?'<p>'+esc(a.message)+'</p>':''}</article>`).join(''):'<div class="pa-empty">'+icon('bell')+'<b>No triggered alerts</b><p>When an alert fires, its observed price and candle time appear here.</p></div>';return;}
    const rows=state.alerts.filter(a=>filter==='all'||PriceAlertModel.status(a)===filter);
    $('al').innerHTML=rows.length?rows.map(a=>{const status=PriceAlertModel.status(a),label={active:'Active',paused:'Paused',triggered:'Triggered',review:'Needs review'}[status];return `<article class="pa-item" data-alert-id="${esc(a.id)}"><div class="pa-item-heading"><span class="pa-state ${status}">${label}</span><span>${esc(a.sym)} · ${a.iv?esc(a.iv):'Legacy interval'}</span></div><button type="button" class="pa-open" data-pa-open="${esc(a.id)}" title="Open this chart">${esc(title(a))}</button><p class="pa-condition">${PriceAlertModel.supported(a)?'Price '+esc(PriceAlertModel.operation(a))+' '+esc(fmt(a.px,a.sym)):'Review legacy conditions before enabling'}</p>${a.message?'<p class="pa-message">'+esc(a.message)+'</p>':''}<div class="pa-item-actions"><button type="button" data-pa-edit="${esc(a.id)}" aria-label="Edit alert ${esc(title(a))}">${icon('edit')}<span>Edit</span></button><button type="button" data-pa-toggle="${esc(a.id)}" ${status==='review'?'disabled':''} aria-label="${a.on&&!a.fired?'Pause':'Rearm'} alert ${esc(title(a))}">${icon(a.on&&!a.fired?'pause':'play')}<span>${a.on&&!a.fired?'Pause':'Rearm'}</span></button><button type="button" data-pa-remove="${esc(a.id)}" aria-label="Delete alert ${esc(title(a))}">${icon('trash')}</button></div></article>`;}).join(''):'<div class="pa-empty">'+icon('bell')+'<b>No '+(filter==='all'?'price':esc(filter))+' alerts</b><p>Create an alert from the toolbar or right-click a price on the chart.</p></div>';
    const find=id=>state.alerts.find(a=>String(a.id)===id);
    $('al').querySelectorAll('[data-pa-edit]').forEach(b=>b.onclick=()=>{const a=find(b.dataset.paEdit);if(a)open(a.px,a.sym,null,a);});
    $('al').querySelectorAll('[data-pa-toggle]').forEach(b=>b.onclick=()=>{const a=find(b.dataset.paToggle);if(!a)return;a.on=!(a.on&&!a.fired);a.fired=false;arm(a);saveAlerts();paint();draw();});
    $('al').querySelectorAll('[data-pa-remove]').forEach(b=>b.onclick=()=>{state.alerts=state.alerts.filter(a=>String(a.id)!==b.dataset.paRemove);seen.delete(b.dataset.paRemove);saveAlerts();paint();draw();});
    $('al').querySelectorAll('[data-pa-open]').forEach(b=>b.onclick=()=>{const a=find(b.dataset.paOpen);if(!a)return;if(a.iv&&INTERVALS.includes(a.iv))state.charts[state.sel].iv=a.iv;setSymbol(a.sym);paintIntervals();draw();});
  }
  function open(px,sym,sub,original=null){
    editing=original?original.id:null;const S=Feed.symbol(sym)||SYMBOLS[sym],iv=original?.iv||state.charts[state.sel].iv;
    $('priceAlertTitle').textContent=original?'Edit price alert':'Create price alert';$('alSub').textContent=(S?.name||sym)+' · '+sym;
    $('paSymbol').value=sym;$('paInterval').innerHTML=INTERVALS.map(v=>`<option value="${esc(v)}" ${v===iv?'selected':''}>${esc(v)}</option>`).join('');
    $('paName').value=original?title(original):sym+' price level';$('paMessage').value=original?.message||'';$('paPrice').value=Number.isFinite(px)?px.toFixed(S?.digits??5):'';$('paPrice').step=S?.tick||'any';$('paOp').value=original?PriceAlertModel.operation(original):'crosses';$('paError').textContent='';$('alCreate').textContent=original?'Save changes':'Create alert';$('paMode').textContent=state.replay.on?'Replay checks the selected instrument and timeframe only.':'New alerts start from the current stored close; loading old candles does not trigger them.';
    show('#alertModal');
  }
  function save(){
    const draft={type:'price',sym:$('paSymbol').value,iv:$('paInterval').value,px:$('paPrice').valueAsNumber,op:$('paOp').value,name:$('paName').value.trim().slice(0,80),message:$('paMessage').value.trim().slice(0,240)};
    const error=PriceAlertModel.validate(draft);if(error){$('paError').textContent=error;return;}
    const original=editing==null?null:state.alerts.find(a=>a.id===editing);if(editing!=null&&!original){$('paError').textContent='This alert was removed. Close and create a new alert.';return;}
    const a=Object.assign(original||{id:'alert-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),createdAt:Date.now()},draft,{on:original?original.on:true,fired:original?original.fired:false,title:draft.name,cond:'price '+draft.op+' '+draft.px+' · in-app',dir:draft.op.includes('down')||draft.op.includes('below')?'down':'up'});
    if(!original)state.alerts.unshift(a);arm(a);saveAlerts();view='alerts';filter='all';controls.querySelector('select').value='all';paint();hide('#alertModal');switchTab('alerts');draw();toast(original?'Alert updated':'Alert created','One-time alert. In-app notification while this page stays open.','up');
  }
  function evaluate(){
    let changed=false;const fired=[];
    state.alerts.forEach(a=>{if(!a.on||a.fired||!PriceAlertModel.supported(a))return;const next=observe(a);if(!next)return;const key=String(a.id),sig=signature(a),prev=seen.get(key);seen.set(key,{signature:sig,sample:next});if(!prev||prev.signature!==sig||!PriceAlertModel.hit(a,prev.sample,next))return;
      a.fired=true;a.on=false;changed=true;const row={id:key,title:title(a),symbol:a.sym,interval:interval(a),price:fmt(next.price,a.sym),barTime:new Date(next.t).toISOString().replace('T',' ').slice(0,19),firedAt:Date.now(),mode:state.replay.on?'replay':'history',message:a.message||''};fired.push(row);toast('Price alert · '+title(a),a.message||a.sym+' '+PriceAlertModel.operation(a)+' '+fmt(a.px,a.sym),'warn');});
    if(changed){Store.settings.patch({chartsAlerts:state.alerts.map(a=>({...a,_fired:undefined})),chartsAlertLog:fired.concat(logs()).slice(0,50)});paint();draw();}
  }
  controls.querySelectorAll('[data-pa-view]').forEach(b=>b.onclick=()=>{view=b.dataset.paView;paint();});controls.querySelector('select').onchange=e=>{filter=e.target.value;paint();};
  $('alCreate').onclick=save;$('paCancel').onclick=()=>hide('#alertModal');$('paOp').innerHTML=PriceAlertModel.ops.map(op=>`<option value="${op}">${op[0].toUpperCase()+op.slice(1)}</option>`).join('');
  $('alertModal').setAttribute('role','dialog');$('alertModal').setAttribute('aria-modal','true');$('alertModal').setAttribute('aria-labelledby','priceAlertTitle');
  window.ChartAlerts={paint,open,evaluate};
  addEventListener('storechange',e=>{if(['settings','*'].includes(e.detail?.kind)){loadAlerts();paint();}});
  document.addEventListener('chart-render',evaluate);paint();
})();
