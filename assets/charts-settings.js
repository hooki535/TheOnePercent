/* Chart appearance drafts never mutate the workspace before Apply. */
const ChartSettingsModel = (() => {
  const clone=x=>JSON.parse(JSON.stringify(x));
  const defaults={up:'',dn:'',borderUp:'',borderDn:'',wickUp:'',wickDn:'',wickMatch:true,candleBodies:true,candleBorders:true,candleWicks:true,candleWidth:.68,background:'',gridColor:'',gridH:true,gridV:true,sessions:true,cross:'free',crossColor:'',crossDash:'dash',cursor:'cross',showOhlc:true,showStudyLegend:true,dataWin:false,countdown:true,utc:true,syncCross:true,syncSymbol:false,lastPriceLine:true,lastPriceLabel:true,lastPriceColor:'',lastPriceDash:'dot',previousCloseLine:false,previousCloseColor:'',showPositions:true,showAlerts:true,showTrades:true};
  const keys=Object.keys(defaults);
  function begin(look,scale){return {look:{...clone(defaults),...clone(look)},scale:clone(scale),originalLook:clone(look),originalScale:clone(scale)};}
  function reset(d){Object.assign(d.look,clone(defaults));d.scale={...d.scale,mode:'normal',invert:false};return d;}
  function validate(d){
    for(const k of keys){const v=d.look[k];if(typeof defaults[k]==='boolean'&&typeof v!=='boolean')return 'Invalid visibility setting.';if((k.endsWith('Color')||['up','dn','borderUp','borderDn','wickUp','wickDn','background'].includes(k))&&v!==''&&!/^#[0-9a-f]{6}$/i.test(v))return 'Choose a valid colour.';}
    if(!Number.isFinite(d.look.candleWidth)||d.look.candleWidth<.2||d.look.candleWidth>.95)return 'Candle width must be between 20% and 95%.';
    if(!['free','bar'].includes(d.look.cross)||!['cross','dot','arrow'].includes(d.look.cursor)||!['solid','dash','dot'].includes(d.look.crossDash)||!['solid','dash','dot'].includes(d.look.lastPriceDash))return 'Choose a supported line or cursor style.';
    if(!['normal','log','pct'].includes(d.scale.mode)||typeof d.scale.invert!=='boolean')return 'Choose a valid price scale.';return '';
  }
  function result(d,currentLook,currentScale){
    const error=validate(d);if(error)throw Error(error);
    const look=clone(currentLook);keys.forEach(k=>{if(d.look[k]!==d.originalLook[k]&&!(d.originalLook[k]===undefined&&d.look[k]===defaults[k]))look[k]=d.look[k];});
    const changed=d.scale.mode!==d.originalScale.mode||!!d.scale.invert!==!!d.originalScale.invert;
    const scale=changed?{...clone(currentScale),mode:d.scale.mode,invert:d.scale.invert,auto:true,factor:1,offset:0}:clone(currentScale);if(changed)delete scale.range;
    return {look,scale};
  }
  function previousClose(data){if(data.length<2)return null;const day=t=>Math.floor((t<1e12?t*1000:t)/86400000),last=day(data.at(-1).t);for(let i=data.length-2;i>=0;i--)if(day(data[i].t)<last)return data[i].c;return null;}
  return {clone,defaults,begin,reset,validate,result,previousClose};
})();
const ChartSettings = (() => {
  let session=null;
  const modal=document.getElementById('setModal'),body=document.getElementById('setBody');
  const categories=['Symbol','Appearance','Scales','Status line','Trading'];
  const icons=['M6 3v18M18 3v18M3 7h6v9H3zM15 5h6v8h-6z','M4 4h16v16H4zM4 12h16M12 4v16','M5 3v18h16M9 7h4M9 12h8M9 17h12','M4 5h16M4 12h10M4 19h16','M4 5h16v5H4zM7 14h10v6H7z'];
  function palette(token,fallback='#787b86') {
    const value=css(token).trim();if(/^#[0-9a-f]{6}$/i.test(value))return value;
    if(/^#[0-9a-f]{3}$/i.test(value))return '#'+value.slice(1).split('').map(x=>x+x).join('');
    const rgb=value.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);return rgb?'#'+rgb.slice(1,4).map(x=>Math.min(255,+x).toString(16).padStart(2,'0')).join(''):fallback;
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colour=(key,label,fallback)=>`<input type="color" data-cs="${key}" aria-label="${label}" value="${session.draft.look[key]||fallback}">`;
  const check=(key,label)=>`<label class="cs-check"><input type="checkbox" data-cs="${key}" aria-label="${label}" ${session.draft.look[key]?'checked':''}><span>${label}</span></label>`;
  const row=(label,control)=>`<div class="cs-row"><span>${label}</span><div>${control}</div></div>`;
  const select=(key,label,values,value,scale=false)=>`<select ${scale?'data-cs-scale':'data-cs'}="${key}" aria-label="${label}">${values.map(([v,n])=>`<option value="${v}" ${value===v?'selected':''}>${n}</option>`).join('')}</select>`;
  const lineStyles=[['solid','Solid'],['dash','Dashed'],['dot','Dotted']];
  function open(){
    const cfg=state.charts[state.sel];session={slot:state.sel,cfg,key:cfg.sym+cfg.iv,category:'Symbol',draft:ChartSettingsModel.begin(state.look,cfg.scale),data:charts[state.sel].data.slice(-48).map(b=>({...b})),previous:ChartSettingsModel.previousClose(charts[state.sel].data)};
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','chartSettingsTitle');
    modal.querySelector('.sheet-h').innerHTML='<b id="chartSettingsTitle">Chart settings</b><button type="button" class="x" data-close aria-label="Close chart settings">×</button>';
    modal.querySelector('.sheet-h button').onclick=()=>hide(modal);
    let footer=modal.querySelector('.cs-footer');if(!footer){footer=document.createElement('footer');footer.className='cs-footer';modal.querySelector('.sheet').append(footer);}
    footer.innerHTML='<button type="button" class="cs-reset">Reset to defaults</button><div><button type="button" class="cs-cancel">Cancel</button><button type="button" class="cs-apply">Apply</button></div>';
    footer.querySelector('.cs-reset').onclick=()=>{ChartSettingsModel.reset(session.draft);paint();};footer.querySelector('.cs-cancel').onclick=()=>hide(modal);footer.querySelector('.cs-apply').onclick=apply;
    paint();requestAnimationFrame(()=>body.querySelector('[aria-current="page"]')?.focus());
  }
  function paint(){
    if(!session)return;const d=session.draft,L=d.look,up=L.up||palette('--up'),dn=L.dn||palette('--dn');let content='';
    if(session.category==='Symbol'){
      content='<h3>Candles</h3>';
      for(const [key,label,u,v] of [['candleBodies','Body','up','dn'],['candleBorders','Borders','borderUp','borderDn'],['candleWicks','Wicks','wickUp','wickDn']])content+=row(check(key,label),colour(u,'Rising '+label.toLowerCase(),up)+colour(v,'Falling '+label.toLowerCase(),dn));
      content+=row(check('wickMatch','Wicks match body'),'')+row('Candle width',`<input type="range" min="0.2" max="0.95" step="0.01" data-cs="candleWidth" aria-label="Candle width" value="${L.candleWidth}">`)+
      '<h3 class="cs-divider">Price lines</h3>'+row(check('lastPriceLine','Last price line'),colour('lastPriceColor','Last price colour',up)+select('lastPriceDash','Last price line style',lineStyles,L.lastPriceDash))+row(check('lastPriceLabel','Last price label'),'')+row(check('previousCloseLine','Previous UTC close line'),colour('previousCloseColor','Previous close colour',palette('--txt3')))+`<p class="cs-help">Previous close uses the last available candle before the latest loaded UTC day. ${session.previous==null?'Unavailable in this loaded window.':''}</p>`;
    }else if(session.category==='Appearance'){
      content='<h3>Background and grid</h3>'+row('Background',colour('background','Chart background',palette('--bg')))+row('Grid colour',colour('gridColor','Grid colour',palette('--grid')))+row(check('gridH','Horizontal grid'),'')+row(check('gridV','Vertical grid'),'')+row(check('sessions','UTC session breaks'),'')+'<h3 class="cs-divider">Crosshair</h3>'+row('Cursor',select('cursor','Cursor appearance',[['cross','Crosshair'],['dot','Dot'],['arrow','Arrow']],L.cursor))+row('Snapping',select('cross','Crosshair mode',[['free','Free'],['bar','Snap to candle']],L.cross))+row('Line colour',colour('crossColor','Crosshair colour',palette('--txt3')))+row('Line style',select('crossDash','Crosshair line style',lineStyles,L.crossDash));
    }else if(session.category==='Scales'){
      content='<h3>Price and time scales</h3>'+row('Price scale',select('mode','Price scale',[['normal','Regular'],['log','Logarithmic'],['pct','Percent']],d.scale.mode,true))+row('Invert price scale',`<input type="checkbox" data-cs-scale="invert" aria-label="Invert price scale" ${d.scale.invert?'checked':''}>`)+row(check('utc','Use UTC time'),'')+row(check('syncCross','Sync crosshair'),'')+row(check('syncSymbol','Sync symbol'),'')+'<p class="cs-help">Colours and visibility apply across this workspace. Price scale changes apply to the selected chart and reset its vertical fit.</p>';
    }else if(session.category==='Status line'){
      content='<h3>Chart information</h3>'+row(check('showOhlc','OHLC values'),'')+row(check('showStudyLegend','Indicator legend'),'')+row(check('dataWin','Data window'),'')+'<p class="cs-help">OHLC values appear in the expanded Details row. The data window shows crosshair values when the chart has enough width.</p>';
      if(!(window.THEONEPERCENT_CHART_ARCHIVE&&!Feed.isDemoMode()))content+=row(check('countdown','Countdown to bar close'),'');else content+='<p class="cs-help">Historical candles have no live countdown or stored volume.</p>';
    }else content='<h3>Trading overlays</h3>'+row(check('showPositions','Position drawings'),'')+row(check('showAlerts','Alert lines'),'')+row(check('showTrades','Journal trade markers'),'')+'<p class="cs-help">These controls change chart visibility. Alert evaluation continues while its chart is open. Positions and journal entries are retained.</p>';
    body.innerHTML=`<nav class="cs-nav" aria-label="Chart settings categories">${categories.map((n,i)=>`<button type="button" data-cs-category="${n}" aria-current="${n===session.category?'page':'false'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${icons[i]}"/></svg>${n}</button>`).join('')}</nav><section class="cs-controls" aria-label="${session.category} settings">${content}<p class="cs-error" role="alert"></p></section><aside class="cs-preview"><h3>Preview</h3><p class="cs-preview-symbol">${esc(session.cfg.sym)} · ${esc(session.cfg.iv)}</p><canvas width="280" height="280" aria-label="Chart appearance preview using loaded candles" role="img"></canvas><p class="cs-help">Preview only until applied. Uses a snapshot of loaded candles.</p><p class="cs-help">Apply updates this workspace. Save the workspace to keep its appearance.</p></aside>`;
    body.querySelectorAll('[data-cs-category]').forEach(b=>{b.onclick=()=>{session.category=b.dataset.csCategory;paint();body.querySelector('[aria-current="page"]').focus();};b.onkeydown=e=>{const list=[...body.querySelectorAll('[data-cs-category]')],i=list.indexOf(b);let n;if(['ArrowDown','ArrowRight'].includes(e.key))n=(i+1)%list.length;if(['ArrowUp','ArrowLeft'].includes(e.key))n=(i+list.length-1)%list.length;if(e.key==='Home')n=0;if(e.key==='End')n=list.length-1;if(n!=null){e.preventDefault();list[n].click();}};});
    body.querySelectorAll('[data-cs]').forEach(el=>{el.oninput=el.onchange=()=>{const k=el.dataset.cs;L[k]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(['wickUp','wickDn'].includes(k)){L.wickMatch=false;const box=body.querySelector('[data-cs="wickMatch"]');if(box)box.checked=false;}preview();};});
    body.querySelectorAll('[data-cs-scale]').forEach(el=>el.onchange=()=>{d.scale[el.dataset.csScale]=el.type==='checkbox'?el.checked:el.value;preview();});preview();
  }
  function apply(){
    if(!session)return;const cfg=state.charts[session.slot],error=body.querySelector('.cs-error');
    if(cfg!==session.cfg||cfg.sym+cfg.iv!==session.key){error.textContent='The chart changed while settings were open. Close and reopen settings.';return;}
    const before=snapshotState();
    let next;try{next=ChartSettingsModel.result(session.draft,state.look,cfg.scale);if(next.look.utc!==state.look.utc)Store.settings.patch({chartsUtc:next.look.utc});}catch(e){error.textContent=e.message||'Could not apply settings.';return;}
    pushUndo(before);state.look=next.look;window.ChartAppearance?.syncLook(state.look);Object.assign(cfg.scale,next.scale);if(!('range' in next.scale))delete cfg.scale.range;
    hide(modal);paintClock();draw();
  }
  function preview(){
    if(!session)return;const cv=body.querySelector('canvas'),c=cv.getContext('2d'),L=session.draft.look,d=session.data,mode=session.draft.scale.mode,W=280,H=280,pw=222,ph=242;
    c.clearRect(0,0,W,H);c.fillStyle=L.background||css('--bg');c.fillRect(0,0,W,H);c.font='10px sans-serif';c.fillStyle=css('--txt2');
    if(!d.length){c.fillText('Load candles to preview',35,130);return;}
    const base=d[0].o,tp=p=>mode==='log'?Math.log(Math.max(1e-12,p)):mode==='pct'?(p/base-1)*100:p,inv=v=>mode==='log'?Math.exp(v):mode==='pct'?base*(1+v/100):v;
    let lo=Math.min(...d.map(b=>tp(b.l))),hi=Math.max(...d.map(b=>tp(b.h)));const pad=(hi-lo)*.1||Math.abs(lo*.01)||1;lo-=pad;hi+=pad;
    const y=p=>{const f=(hi-tp(p))/(hi-lo);return 12+(session.draft.scale.invert?1-f:f)*ph;},x=i=>6+(i+.5)*(pw-12)/d.length;
    c.lineWidth=1;c.strokeStyle=L.gridColor||css('--grid');
    for(let i=0;i<=4;i++){if(L.gridH){c.beginPath();c.moveTo(0,12+i*ph/4);c.lineTo(pw,12+i*ph/4);c.stroke();}if(L.gridV){c.beginPath();c.moveTo(i*pw/4,12);c.lineTo(i*pw/4,ph+12);c.stroke();}c.fillStyle=css('--txt2');const v=lo+(hi-lo)*(session.draft.scale.invert?i/4:1-i/4);c.fillText(mode==='pct'?v.toFixed(2)+'%':inv(v).toFixed(SYMBOLS[session.cfg.sym].digits),pw+3,16+i*ph/4);}
    c.save();c.beginPath();c.rect(0,0,pw,ph+16);c.clip();
    // The same candle/bar/line renderer is shared by the live chart and draft preview.
    Chart.prototype.drawSeries.call({plotW:pw,x,y},c,d,0,d.length,Math.max(1,(pw-12)/d.length*L.candleWidth),L.up||css('--up'),L.dn||css('--dn'),{y:12,h:ph},L);
    function line(price,col,dash){if(!Number.isFinite(price))return;c.strokeStyle=col;c.setLineDash(DASHES[dash]||[]);c.beginPath();c.moveTo(0,y(price));c.lineTo(pw,y(price));c.stroke();}
    if(L.previousCloseLine)line(session.previous,L.previousCloseColor||css('--txt3'),'dash');if(L.lastPriceLine)line(d.at(-1).c,L.lastPriceColor||(d.at(-1).c>=d.at(-1).o?L.up||css('--up'):L.dn||css('--dn')),L.lastPriceDash);
    if(L.cursor==='cross'){c.strokeStyle=L.crossColor||css('--txt3');c.setLineDash(DASHES[L.crossDash]||[]);c.beginPath();c.moveTo(pw*.6,12);c.lineTo(pw*.6,ph+12);c.moveTo(0,ph*.4);c.lineTo(pw,ph*.4);c.stroke();}c.restore();
    if(L.lastPriceLabel){const price=d.at(-1).c,yy=Math.max(8,Math.min(H-16,y(price)));c.fillStyle=L.lastPriceColor||(price>=d.at(-1).o?L.up||css('--up'):L.dn||css('--dn'));c.fillRect(pw,yy-8,W-pw,16);c.fillStyle='#fff';c.fillText(price.toFixed(SYMBOLS[session.cfg.sym].digits),pw+3,yy+3);}
    c.fillStyle=css('--txt2');c.fillText('Loaded history · '+(L.utc?'UTC':'Local time'),6,H-5);
  }
  modal.addEventListener('pplx-dismiss',()=>{session=null;});
  return {open};
})();
