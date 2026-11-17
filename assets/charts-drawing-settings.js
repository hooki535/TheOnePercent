/* Transactional drawing properties. Original controls, existing drawing IDs/storage. */
const DrawingProperties = (() => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const fib = new Set(['fib','fibext','fibchannel','fibfan','fibcircle','fibtime']);
  const filled = new Set(['rect','channel','ellipse','triangle','callout','gannbox','regression','fibchannel','fibfan','brush','highlighter','text','prange','drange','dprange','xabcd','abcd','elliott','headshoulders','flatchannel']);
  function profile(t) { return { levels:fib.has(t)||t==='gannbox'||t==='gannfan', fill:filled.has(t), extend:['trend','ray','xline','arrow','fib','fibext'].includes(t), text:!fib.has(t)&&!['gannbox','gannfan','position','shortpos'].includes(t), position:['position','shortpos'].includes(t) }; }
  function levels(o) {
    if(Array.isArray(o.levelStyles)) return clone(o.levelStyles);
    const defaults=o.t==='fibtime'?[0,1,2,3,5,8,13,21,34,55]:o.t==='fibcircle'?[.382,.5,.618,1,1.618,2.618]:o.t==='gannbox'?[0,.125,.25,.375,.5,.625,.75,.875,1]:o.t==='gannfan'?[.125,.25,.3333,.5,1,2,3,4,8]:drawingLevelsFor(o);
    const colors=['#787b86','#f23645','#ff9800','#9e9e9e','#089981','#fbc02d','#787b86','#2962ff','#9c27b0'];
    return defaults.map((value,i)=>({value,enabled:true,color:colors[i%colors.length]}));
  }
  function visible(o,iv) {
    if(o.hidden)return false;
    if(!o.visibility)return true;
    const group=/[sm]$/.test(iv)?(iv.endsWith('s')?'seconds':'minutes'):/H$/.test(iv)?'hours':/D$/.test(iv)?'days':/W$/.test(iv)?'weeks':'months';
    const rule=o.visibility[group]; if(!rule)return true;
    const n=parseInt(iv,10)||1;return rule.enabled!==false && n>=(rule.min||1) && n<=(rule.max||100000);
  }
  function validate(o) {
    if(!o.pts?.length || o.pts.some(p=>!Number.isFinite(p.i)||(p.p!=null&&!Number.isFinite(p.p))))return 'Enter valid anchor coordinates.';
    if(o.levelStyles?.some(l=>!Number.isFinite(l.value)||Math.abs(l.value)>1000))return 'Levels must be numbers between −1000 and 1000.';
    if(o.levelStyles?.some(l=>l.value<0 && ['fibcircle','fibtime','gannbox','gannfan'].includes(o.t)))return 'This tool requires non-negative levels.';
    if(o.t==='gannfan'&&o.levelStyles?.some(l=>l.value===0))return 'Gann fan ratios must be greater than zero.';
    if(o.t==='gannbox'&&o.levelStyles?.some(l=>l.value>1))return 'Gann box levels must lie between 0 and 1.';
    if(o.visibility && Object.values(o.visibility).some(r=>!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min<1||r.max<r.min))return 'Each visibility range must start at 1 or higher and end after its start.';
    return '';
  }
  function template(o) { const x={style:clone(o.style||{})};if(o.levelStyles)x.levelStyles=clone(o.levelStyles);if(o.visibility)x.visibility=clone(o.visibility);return x; }
  return {clone,profile,levels,visible,validate,template};
})();
/* Pure helpers keep price/tick fields and the sizing preview in agreement. */
const PositionProperties = (() => {
  function tickSize(S) {
    const exact=Number(S?.catalogRecord?.price_tick);
    return exact>0?exact:S?.instrument?.market==='Forex'&&Number.isInteger(S.digits)?10**(-S.digits):S?.tick;
  }
  function price(o,kind,ticks,tick) {
    if(!Number.isFinite(ticks)||ticks<=0||!(tick>0))return NaN;
    const sign=o.t==='shortpos'?-1:1;
    return o.position.entry+(kind==='stop'?-sign:sign)*ticks*tick;
  }
  function validate(o) {
    const p=o.position,a=o.account;
    if(![p.entry,p.stop,p.target,p.startBar,p.endBar].every(Number.isFinite)||p.endBar<=p.startBar||
      (o.t==='shortpos'?!(p.stop>p.entry&&p.target<p.entry):!(p.stop<p.entry&&p.target>p.entry)))return 'Keep stop and target on opposite sides of entry and use a positive chart width.';
    if(!Number.isFinite(a.balance)||a.balance<=0||!Number.isFinite(a.pct)||a.pct<=0||a.pct>100)return 'Account size must be positive and risk must be greater than 0 and at most 100%.';
    if(!Number.isFinite(p.leverage)||p.leverage<1||p.leverage>10000)return 'Planning leverage must be between 1 and 10,000.';
    return '';
  }
  function preview(o,S,currency) {
    const p=o.position,a=o.account;
    if(!S?.instrument||validate(o))return null;
    const ideal=Instruments.positionSize({instrument:S.instrument,entry:p.entry,stop:p.stop,riskMoney:a.balance*a.pct/100,accountCurrency:currency});
    if(!ideal||!(ideal.units>0))return null;
    const perSize=S.unit==='lots'?S.instrument.contract:1;
    const size=Math.max(S.step,Math.round(ideal.units/perSize/S.step)*S.step);
    const units=size*perSize,margin=Math.abs(units*p.entry*S.instrument.unitValue*ideal.fx/p.leverage);
    return Number.isFinite(size)&&Number.isFinite(margin)?{size,margin}:null;
  }
  return {tickSize,price,validate,preview};
})();
let drawingSession=null;
function editDrawing(chart,obj) {
  drawingSession={chart,original:obj,draft:DrawingProperties.clone(obj),tab:'Style',applyAll:false,saveDefault:false};
  drawingSession.draft.style={...DRAW_STYLE_DEFAULTS,...obj.style};
  if(DrawingProperties.profile(obj.t).levels)drawingSession.draft.levelStyles=DrawingProperties.levels(obj);
  paintDrawingProperties();show('#drawModal');
}
function editPositionSettings(chart,p=state.pos) {
  if(!p||p.key!==chart.key)return;
  const o={id:'position-planner',t:p.entry>p.stop?'position':'shortpos',pts:[{i:0,p:p.entry}],style:p.style||{},visibility:p.visibility,hidden:p.hidden,locked:p.locked,position:{name:p.name||PositionPlanModel.name(p),entry:p.entry,stop:p.stop,target:p.target,leverage:p.leverage||100,startBar:Number.isFinite(p.startBar)?p.startBar:Math.round(chart.ix(chart.plotW*.42)),endBar:Number.isFinite(p.endBar)?p.endBar:Math.round(chart.ix(chart.plotW-12))}};
  editDrawing(chart,o);drawingSession.position=true;drawingSession.positionId=p.id;drawingSession.positionOriginal=p;drawingSession.draft.account={balance:state.risk.balance,pct:state.risk.pct};drawingSession.tab='Inputs';paintDrawingProperties();
}
function paintDrawingProperties() {
  const session=drawingSession;if(!session)return;
  const o=session.draft,st=o.style,p=DrawingProperties.profile(o.t),modal=document.getElementById('drawModal');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const check=(key,label,value,scope='style')=>`<label class="dp-check"><input type="checkbox" data-scope="${scope}" data-key="${key}" ${value?'checked':''}>${label}</label>`;
  const number=(scope,key,v,min,max,step='any')=>`<input type="number" data-scope="${scope}" data-key="${key}" value="${scope==='position'&&['entry','stop','target'].includes(key)&&Number.isFinite(v)?Number(v.toFixed(SYMBOLS[session.chart.cfg.sym].digits)):v}" ${min!=null?`min="${min}"`:''} ${max!=null?`max="${max}"`:''} step="${step}" aria-label="${esc(key)}">`;
  const select=(key,values,value)=>`<select data-scope="style" data-key="${key}" aria-label="${key}">${values.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select>`;
  const color=(key,v)=>`<input type="color" data-scope="style" data-key="${key}" value="${/^#[0-9a-f]{6}$/i.test(v)?v:'#787b86'}" aria-label="${key}">`;
  const row=(label,controls)=>`<div class="dp-row"><span>${label}</span><div>${controls}</div></div>`;
  modal.classList.toggle('dp-position',!!session.position);
  const name=p.position?(o.t==='shortpos'?'Short position':'Long position'):(DRAW[o.t]?.name||o.t);
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','drawingTitle');
  modal.querySelector('.sheet-h').innerHTML=`<b id="drawingTitle">${esc(name)}</b><button type="button" class="x" data-dp-cancel aria-label="Close drawing settings">✕</button>`;
  const tabs=[...(p.position?['Inputs']:[]),'Style',...(p.text?['Text']:[]),...(!p.position?['Coordinates']:[]),'Visibility'];
  let body='';
  if(session.tab==='Inputs'&&p.position){
    const P=o.position,S=SYMBOLS[session.chart.cfg.sym],tick=PositionProperties.tickSize(S);
    const level=(kind,label)=>`<fieldset class="dp-position-level"><legend>${label}</legend>${row('Ticks',`<input type="number" data-position-ticks="${kind}" step="any" min="0" value="${Math.abs(P[kind]-P.entry)/tick}" aria-label="${label} ticks">`)}${row('Price',number('position',kind,P[kind]))}</fieldset>`;
    body=row('Name',`<input type="text" maxlength="80" data-scope="position" data-key="name" aria-label="Position name" value="${esc(P.name)}">`)+row('Account size',number('account','balance',o.account.balance,0)+`<span class="dp-unit">${esc(state.risk.currency)}</span>`)+
      row('Calculated size',`<output data-position-size>—</output><span class="dp-unit">${esc(S.unit)}</span>`)+
      row('Risk',number('account','pct',o.account.pct,0,100)+`<span class="dp-unit">%</span>`)+
      row('Entry price',number('position','entry',P.entry))+
      row('Planning leverage',number('position','leverage',P.leverage,1,10000))+
      `<p class="dp-help">Account size and risk use the shared account settings. Changes save only with OK. Leverage is for the margin estimate below, not a broker setting.</p>`+
      level('target','Profit level')+level('stop','Stop level')+
      row('Risk / reward (gross)',`<output data-position-ratio>—</output>`)+
      row('Estimated margin',`<output data-position-margin>—</output>`)+
      `<p class="dp-help">Uses existing instrument specifications and available currency conversions; margin excludes broker-specific rules. Chart width is adjusted on the drawing.</p>`;
  }else if(session.tab==='Style'){
    body+=row(p.position?'Entry line':'Line',color('color',st.color)+select('dash',[['solid','━━━━'],['dash','┄┄┄┄'],['dot','········']],st.dash)+number('style','width',st.width,1,5,.5));
    if(p.fill)body+=row('Background opacity',number('style','fill',st.fill,0,100,1)+'<span>%</span>');
    if(p.extend)body+=row('Extend',select('extension',[['none','Don’t extend'],['left','Extend left'],['right','Extend right'],['both','Extend both']],st.extendL?(st.extendR?'both':'left'):(st.extendR?'right':'none')));
    if(p.levels){
      if(['fib','fibext'].includes(o.t))body+=check('trendLine','Trend line',st.trendLine!==false)+row('Trend line colour',color('trendColor',st.trendColor||'#787b86'));
      body+=`<div class="dp-levels">${o.levelStyles.map((l,i)=>`<div class="dp-level"><input type="checkbox" data-level="${i}" data-field="enabled" ${l.enabled!==false?'checked':''} aria-label="Enable level ${l.value}"><input type="number" step="any" min="-1000" max="1000" data-level="${i}" data-field="value" value="${l.value}" aria-label="Level ${i+1} value"><input type="color" data-level="${i}" data-field="color" value="${l.color}" aria-label="Level ${i+1} colour"><button type="button" data-level-remove="${i}" aria-label="Remove level ${i+1}">×</button></div>`).join('')}</div><button type="button" class="btn sm" data-add-level>+ Add level</button>`;
      body+=`<div class="dp-checks">${check('showLevels','Show levels',st.showLevels!==false)}${['fib','fibext'].includes(o.t)?check('showPrices','Show prices',st.showPrices!==false):''}</div>`;
    }
    if(p.position)body+=row('Target colour',color('targetColor',st.targetColor||'#089981'))+row('Stop colour',color('stopColor',st.stopColor||'#f23645'))+row('Background opacity',number('style','fill',st.fill,0,100,1))+check('showLabels','Show labels',st.showLabels!==false);
    if(['hline','trend','ray','xline'].includes(o.t))body+=check('label','Price label',st.label!==false);
    body+=`<div class="dp-checks">${check('locked','Lock drawing',o.locked,'object')}${check('hidden','Hide drawing',o.hidden,'object')}</div>`;
  }else if(session.tab==='Text'){
    body=`<label class="dp-text">Text<textarea data-scope="object" data-key="text" rows="4">${esc(o.text||'')}</textarea></label>`;
    // Every supported annotation is rendered through the shared note layer.
    body+=row('Font size',number('style','font',st.font||11,9,32,1))+row('Text colour',color('textColor',st.textColor||st.color))+`<div class="dp-checks">${check('bold','Bold',st.bold)}${check('italic','Italic',st.italic)}</div>`;
  }else if(session.tab==='Coordinates'){
    const data=session.chart.data||[];
    body=`<p class="dp-help">Prices and UTC timestamps identify each anchor. Bar indices also allow placement beyond the last stored candle.</p>`+o.pts.map((a,i)=>{
      const t=data[Math.round(a.i)]?.t,stamp=t?new Date(t<1e12?t*1000:t).toISOString().slice(0,16):'';
      return `<fieldset class="dp-anchor"><legend>Point ${i+1}</legend><label>Price<input type="number" step="any" data-point="${i}" data-field="p" value="${a.p??''}" ${a.p==null?'disabled':''}></label><label>Bar<input type="number" step="any" data-point="${i}" data-field="i" value="${a.i}"></label><label>Time (UTC)<input type="datetime-local" data-point="${i}" data-field="time" value="${stamp}" ${data.length?'':'disabled'}></label></fieldset>`;
    }).join('');
  }else if(session.tab==='Visibility'){
    body=`<p class="dp-help">Show this drawing only on the selected chart intervals.</p>`;
    for(const [key,label,max] of [['seconds','Seconds',59],['minutes','Minutes',59],['hours','Hours',24],['days','Days',366],['weeks','Weeks',52],['months','Months',12]]){
      const r=o.visibility?.[key]||{enabled:true,min:1,max};
      body+=`<div class="dp-visibility"><label><input type="checkbox" data-vis="${key}" data-field="enabled" ${r.enabled!==false?'checked':''}>${label}</label><input type="number" min="1" data-vis="${key}" data-field="min" value="${r.min}" aria-label="${label} minimum"><span>to</span><input type="number" min="1" data-vis="${key}" data-field="max" value="${r.max}" aria-label="${label} maximum"></div>`;
    }
  }
  const templates=Store.settings.get().chartsDrawingTemplates?.[o.t]||{};
  document.getElementById('drawBody').innerHTML=`<div role="tablist" class="dp-tabs">${tabs.map(t=>`<button type="button" role="tab" aria-selected="${session.tab===t}" data-dp-tab="${t}">${t}</button>`).join('')}</div><div class="dp-content" role="tabpanel">${body}<p class="dp-error" role="alert" id="drawingError"></p></div>`;
  modal.querySelector('.sheet-f').innerHTML=`<details class="dp-template"><summary class="btn sm">Template⌄</summary><div><label>Template name<input id="drawingTemplateName" placeholder="My setup" maxlength="60"></label><button type="button" data-template-save>Save template</button><button type="button" data-default>Set as default</button><button type="button" data-apply-all>Apply style to this type${session.applyAll?' ✓':''}</button>${Object.keys(templates).map((t,i)=>`<button type="button" data-template-load="${i}">${esc(t)}</button>`).join('')}</div></details><span class="dp-foot-status">${session.saveDefault?'Default queued':''}${session.applyAll?' · Apply to this type':''}</span><button type="button" class="btn" data-dp-cancel>Cancel</button><button type="button" class="btn primary" data-dp-ok>OK</button>`;
  const error=message=>document.getElementById('drawingError').textContent=message;
  modal.querySelectorAll('[data-dp-cancel]').forEach(b=>b.onclick=()=>hide(modal));
  modal.querySelectorAll('[data-dp-tab]').forEach(b=>{b.tabIndex=session.tab===b.dataset.dpTab?0:-1;b.onclick=()=>{session.tab=b.dataset.dpTab;paintDrawingProperties();modal.querySelector('[aria-selected="true"]').focus();};b.onkeydown=e=>{const list=[...modal.querySelectorAll('[data-dp-tab]')],i=list.indexOf(b);let n;if(e.key==='ArrowRight')n=(i+1)%list.length;if(e.key==='ArrowLeft')n=(i+list.length-1)%list.length;if(e.key==='Home')n=0;if(e.key==='End')n=list.length-1;if(n!=null){e.preventDefault();list[n].click();}};});
  modal.querySelectorAll('[data-scope]').forEach(el=>el.onchange=()=>{
    const {scope,key}=el.dataset,value=el.type==='checkbox'?el.checked:el.type==='number'?el.valueAsNumber:el.value;
    if(scope==='style'&&key==='extension'){st.extendL=['left','both'].includes(value);st.extendR=['right','both'].includes(value);}
    else (scope==='style'?st:scope==='position'?o.position:scope==='account'?o.account:o)[key]=value;
    if(session.position)refreshPositionPreview();
  });
  function refreshPositionPreview(sourceKind) {
    if(!session.position)return;
    const P=o.position,S=SYMBOLS[session.chart.cfg.sym];
    ['stop','target'].forEach(kind=>{
      const ticks=modal.querySelector(`[data-position-ticks="${kind}"]`);
      const price=modal.querySelector(`[data-scope="position"][data-key="${kind}"]`);
      if(ticks&&sourceKind!==kind&&document.activeElement!==ticks)ticks.value=Number.isFinite(P[kind])?+(Math.abs(P[kind]-P.entry)/PositionProperties.tickSize(S)).toFixed(6):'';
      if(price&&document.activeElement!==price)price.value=Number.isFinite(P[kind])?Number(P[kind].toFixed(S.digits)):'';
    });
    const size=PositionProperties.preview(o,S,state.risk.currency),risk=Math.abs(P.entry-P.stop),ratio=Math.abs(P.target-P.entry)/risk;
    const set=(sel,value)=>{const el=modal.querySelector(sel);if(el)el.textContent=value;};
    set('[data-position-size]',size?Number(size.size.toFixed(6)):'Unavailable');
    set('[data-position-ratio]',Number.isFinite(ratio)?ratio.toFixed(2)+' R':'—');
    set('[data-position-margin]',size?size.margin.toFixed(2)+' '+state.risk.currency:'Unavailable');
  }
  modal.querySelectorAll('[data-position-ticks]').forEach(el=>el.oninput=()=>{
    const kind=el.dataset.positionTicks;o.position[kind]=PositionProperties.price(o,kind,el.valueAsNumber,PositionProperties.tickSize(SYMBOLS[session.chart.cfg.sym]));refreshPositionPreview(kind);
  });
  refreshPositionPreview();
  modal.querySelectorAll('[data-level]').forEach(el=>el.onchange=()=>{o.levelStyles[+el.dataset.level][el.dataset.field]=el.type==='checkbox'?el.checked:el.type==='number'?el.valueAsNumber:el.value;});
  modal.querySelectorAll('[data-level-remove]').forEach(b=>b.onclick=()=>{o.levelStyles.splice(+b.dataset.levelRemove,1);paintDrawingProperties();});
  modal.querySelector('[data-add-level]')?.addEventListener('click',()=>{if(o.levelStyles.length>=30)return error('Maximum 30 levels.');o.levelStyles.push({value:1,enabled:true,color:st.color});paintDrawingProperties();});
  modal.querySelectorAll('[data-point]').forEach(el=>el.onchange=()=>{
    const a=o.pts[+el.dataset.point];if(el.dataset.field!=='time')a[el.dataset.field]=el.valueAsNumber;
    else {const ms=Date.parse(el.value+'Z'),d=session.chart.data;const i=d.findIndex(b=>(b.t<1e12?b.t*1000:b.t)>=ms);if(!Number.isFinite(ms)||i<0)return error('Choose a time within the loaded history or edit the bar index.');a.i=i;paintDrawingProperties();}
  });
  modal.querySelectorAll('[data-vis]').forEach(el=>el.onchange=()=>{o.visibility||={};const k=el.dataset.vis;o.visibility[k]||={enabled:true,min:1,max:100000};o.visibility[k][el.dataset.field]=el.type==='checkbox'?el.checked:el.valueAsNumber;});
  modal.querySelector('[data-default]').onclick=()=>{session.saveDefault=true;paintDrawingProperties();};
  modal.querySelector('[data-apply-all]').onclick=()=>{session.applyAll=!session.applyAll;paintDrawingProperties();};
  modal.querySelector('[data-template-save]').onclick=()=>{
    const name=modal.querySelector('#drawingTemplateName').value.trim();if(!name)return error('Enter a template name.');const invalid=DrawingProperties.validate(o);if(invalid)return error(invalid);
    // Queue template writes until OK, so Cancel has no persistence side effects.
    session.savedTemplate={name,value:DrawingProperties.template(o)};error('Template will be saved when you press OK.');
  };
  modal.querySelectorAll('[data-template-load]').forEach(b=>b.onclick=()=>{Object.assign(o,DrawingProperties.clone(templates[Object.keys(templates)[+b.dataset.templateLoad]]));paintDrawingProperties();});
  modal.querySelectorAll('[data-scope],[data-level],[data-point],[data-vis]').forEach(el=>{if(el.dataset.field!=='time')el.oninput=el.onchange;});
  modal.querySelector('[data-dp-ok]').onclick=()=>{
    modal.querySelectorAll('[data-scope],[data-level],[data-point],[data-vis]').forEach(el=>{if(el.dataset.field!=='time'&&!el.disabled)el.onchange?.();});
    const invalid=DrawingProperties.validate(o);if(invalid)return error(invalid);
    if(!Number.isFinite(st.width)||st.width<1||st.width>5||!Number.isFinite(st.fill)||st.fill<0||st.fill>100||!Number.isFinite(st.font)||st.font<9||st.font>32)return error('Check line width, opacity and font size ranges.');
    if(session.position){
      if(PositionPlans.find(session.positionId)!==session.positionOriginal)return error('This position changed. Close and reopen its settings.');
      if(!o.position.name?.trim()||o.position.name.trim().length>80)return error('Use a position name between 1 and 80 characters.');
      o.position.name=o.position.name.trim();
      const invalid=PositionProperties.validate(o);if(invalid)return error(invalid);
      // Persist shared edits before applying geometry; Cancel never writes.
      if(o.account.balance!==state.risk.balance||o.account.pct!==state.risk.pct){
        try{Store.settings.patch({balance:o.account.balance,riskPct:o.account.pct});}
        catch(e){return error('Could not save account settings. Please retry.');}
      }
    }
    pushUndo();
    if(session.position){state.risk.balance=o.account.balance;state.risk.pct=o.account.pct;state.risk.side=o.t==='shortpos'?'short':'long';Object.assign(session.positionOriginal,o.position,{side:o.t==='shortpos'?'short':'long',style:DrawingProperties.clone(st),visibility:DrawingProperties.clone(o.visibility||{}),hidden:o.hidden,locked:o.locked});PositionPlans.select(session.positionId);if(session.applyAll)PositionPlans.all().filter(p=>p.side===session.positionOriginal.side).forEach(p=>Object.assign(p,DrawingProperties.template(o)));recalc();syncInputs();}
    else {Object.assign(session.original,DrawingProperties.clone(o));if(session.applyAll)session.chart.drw.filter(x=>x.t===o.t).forEach(x=>Object.assign(x,DrawingProperties.template(o)));}
    const settings=Store.settings.get(),patch={};
    if(session.savedTemplate){const all=DrawingProperties.clone(settings.chartsDrawingTemplates||{});all[o.t]||={};Object.defineProperty(all[o.t],session.savedTemplate.name,{value:session.savedTemplate.value,enumerable:true,writable:true,configurable:true});patch.chartsDrawingTemplates=all;}
    if(session.saveDefault){const all=DrawingProperties.clone(settings.chartsDrawingDefaults||{});all[o.t]=DrawingProperties.template(o);patch.chartsDrawingDefaults=all;}
    if(Object.keys(patch).length)Store.settings.patch(patch);
    drawingSession=null;hide(modal);paintObjects();draw();
  };
}
document.getElementById('drawModal').addEventListener('pplx-dismiss',()=>{drawingSession=null;});

(function(){
  const button=document.createElement('button');button.type='button';button.className='btn sm';button.textContent='Position drawing settings';button.hidden=true;button.onclick=()=>editPositionSettings(charts[state.sel]);
  const host=document.querySelector('.desk-bottom-actions')||document.querySelector('#panel');host?.append(button);
  document.addEventListener('chart-render',()=>{button.hidden=state.look.showPositions===false||!state.pos||state.pos.key!==charts[state.sel]?.key;});
})();
