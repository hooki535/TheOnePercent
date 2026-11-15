/* TheOnePercent homepage. Preview fixtures are isolated from the existing Feed. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const D = window.HomeData;
  const STORAGE = 'theonepercent:homepage-preview:v1';
  const initial = {mode:'preview',watch:['EURUSD','GBPUSD','GBPJPY','USDJPY','AUDUSD','XAUUSD','BTCUSDT','US30','NAS100'],saved:[],profile:{name:'Simon Peter',photo:null}};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}; } catch {}
  const validSymbol = s => typeof s==='string' && /^[A-Z0-9!.]{2,20}$/.test(s) && (D.find(s)||window.Feed?.symbol(s));
  const state = {
    mode:saved.mode==='real'?'real':'preview',
    watch:Array.isArray(saved.watch)?saved.watch.filter(validSymbol).slice(0,20):initial.watch.slice(),
    saved:Array.isArray(saved.saved)?saved.saved.filter(s=>D.posts.some(p=>p.id===s)):[],
    profile:{name:typeof saved.profile?.name==='string'?saved.profile.name.slice(0,50):initial.profile.name,photo:typeof saved.profile?.photo==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(saved.profile.photo)?saved.profile.photo:null},
    hero:'US500',detail:'EURUSD',range:'1D',period:'1D',currency:'All',highImpact:false,savedOnly:false,searchCategory:'All',searchAction:'select'
  };
  let frame=null,chartState=null,hoverIndex=-1,toastTimer=null,profileDraft=null;
  const htmlCache=new Map();
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format = (n,d=2) => Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const signed = (n,d=2) => Number.isFinite(n)?(n>=0?'+':'−')+format(Math.abs(n),d):'—';
  const percent = n => Number.isFinite(n)?signed(n,2)+'%':'—';
  const tone = n => Number.isFinite(n)?n>=0?'up':'down':'muted';
  function setHTML(selector,html){if(htmlCache.get(selector)!==html){$(selector).innerHTML=html;htmlCache.set(selector,html);$(selector).querySelectorAll('button[aria-label], a[aria-label]').forEach(el=>{if(el.querySelector('svg.ui-icon'))el.title=el.getAttribute('aria-label')})}}
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({mode:state.mode,watch:state.watch,saved:state.saved,profile:state.profile}))}catch{toast('This browser could not save the preview settings.')}}
  function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4000)}
  function instrument(sym){const m=D.find(sym);const f=window.Feed?.symbol(sym);return m||f&&{symbol:sym,name:f.name,market:f.market,currency:f.quote,digits:f.digits,icon:sym.slice(0,2)}}
  function quote(sym){
    if(state.mode==='preview')return D.quote(sym);
    if(!window.Feed?.symbol(sym))return null;
    const v=Feed.quote(sym);if(!v)return null;
    const bars=Feed.history(sym,'15m'),day=bars.length?new Date(bars.at(-1).t).toISOString().slice(0,10):null;
    const today=day?bars.filter(b=>new Date(b.t).toISOString().slice(0,10)===day):[];
    return {...v,currency:Feed.symbol(sym).quote,time:bars.at(-1)?.t,high:today.length?Math.max(...today.map(b=>b.h)):null,low:today.length?Math.min(...today.map(b=>b.l)):null};
  }
  function bars(sym,range='1D'){
    if(state.mode==='preview')return D.series(sym,range);
    if(!window.Feed?.symbol(sym))return[];
    const iv={'1D':'15m','1W':'1H','1M':'4H','3M':'1D','1Y':'1D'}[range]||'15m';
    const all=Feed.history(sym,iv)||[];
    const days={'1D':1,'1W':7,'1M':30,'3M':90,'1Y':365}[range]||1;
    if(!all.length)return[];
    const from=all.at(-1).t-days*86400000;
    return all.filter(b=>b.t>=from);
  }
  function source(sym,range='1D'){
    if(state.mode==='preview')return 'Sample snapshot · 13 Nov 2026';
    const iv={'1D':'15m','1W':'1H','1M':'4H','3M':'1D','1Y':'1D'}[range]||'15m';
    return Feed?.isHistorical(sym,iv)?Feed.historicalSource(sym,iv):'History unavailable';
  }
  function icon(sym){return instrument(sym)?.icon||sym.slice(0,2)}
  function asset(sym){return `<span class="asset-icon" data-asset-symbol="${esc(sym)}">${HomeIcons.mark(sym)}</span>`}
  function marketButton(sym,cls='market-table-row'){
    const m=instrument(sym);if(!m)return'';const v=quote(sym);
    return `<button class="${cls}" data-market="${esc(sym)}"><span class="name">${asset(sym)}${esc(sym)}</span><span>${v?format(v.price,v.digits):'—'}</span><span class="${tone(v?.chgPct)}">${v?percent(v.chgPct):'Unavailable'}</span></button>`;
  }
  function spark(sym,range='1D',height=56){
    const values=bars(sym,range).map(b=>b.c);if(values.length<2)return `<div class="empty-state">No history available</div>`;
    const min=Math.min(...values),max=Math.max(...values),span=max-min||1,w=320,h=height;
    const coords=values.map((v,i)=>[2+i/(values.length-1)*(w-4),h-5-(v-min)/span*(h-12)]);
    const path=coords.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(1)).join(' ')).join(' ');
    const col=values.at(-1)>=values[0]?'--up':'--down';
    return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(sym)} ${state.mode==='preview'?'illustrative':'historical'} trend"><path d="${path}L${w-2} ${h}L2 ${h}Z" fill="var(${col})" opacity=".08"/><path d="${path}" fill="none" stroke="var(${col})" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function assetCard(sym){const m=instrument(sym),v=quote(sym);if(!m)return'';return `<button class="asset-card panel" data-market="${esc(sym)}"><span class="asset-title">${asset(sym)}${esc(m.name.split(' / ')[0])}</span><div class="asset-price">${v?format(v.price,v.digits):'—'}</div><div class="asset-change ${tone(v?.chgPct)}">${v?percent(v.chgPct):'History unavailable'}</div>${spark(sym)}</button>`}
  function renderSummary(){
    const m=instrument(state.hero),v=quote(state.hero);if(!m)return;
    $('#hero-search').innerHTML=esc(m.name)+` <span class="symbol-tag">${esc(state.hero==='US500'?'SPX':state.hero)}</span>`+iconSVG('chevron');
    $('#hero-icon').innerHTML=HomeIcons.mark(state.hero);
    $('#hero-icon').className='market-logo'+(state.hero==='US500'?' spx':m.market==='Crypto'?' crypto':'');
    $('#hero-price').textContent=v?format(v.price,v.digits):'—';
    $('#hero-change').textContent=v?percent(v.chgPct):'History unavailable';$('#hero-change').className=tone(v?.chgPct);
    $('#summary-mode').textContent=state.mode==='preview'?'Illustrative data':'Provider history';
    $('#hero-source').textContent=source(state.hero,state.range)+(state.mode==='preview'?' · UTC':'');
    setHTML('#mini-markets',['NAS100','US30'].map(sym=>{const d=instrument(sym),v=quote(sym);return `<button class="panel mini-market" data-market="${sym}"><strong>${esc(d.name)} <span class="symbol-tag">${sym==='NAS100'?'NDX':'DJI'}</span></strong><div class="mini-value">${v?format(v.price,v.digits):'—'}<small class="${tone(v?.chgPct)}">${v?percent(v.chgPct):'Unavailable'}</small></div>${spark(sym)}</button>`}).join(''));
    drawHero();
  }
  function drawHero(){
    const canvas=$('#hero-canvas'),w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const dpr=window.devicePixelRatio||1;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const data=bars(state.hero,state.range),empty=$('#chart-empty');empty.hidden=data.length>1;
    if(data.length<2){chartState=null;empty.textContent='No verified history is available for this instrument and period. Select another market or use clearly labelled preview data.';canvas.setAttribute('aria-label','Market history unavailable');$('#chart-tooltip').hidden=true;return}
    const css=getComputedStyle(document.documentElement),col=n=>css.getPropertyValue(n).trim();
    const values=data.map(b=>b.c),min=Math.min(...values),max=Math.max(...values),span=max-min||max*.001||1;
    const L=5,R=w<400?61:75,T=12,B=h-30,low=min-span*.08,high=max+span*.08;
    const x=i=>L+i/(data.length-1)*(w-L-R),y=v=>T+(high-v)/(high-low)*(B-T);
    ctx.font='11px Arial';ctx.textAlign='left';ctx.textBaseline='middle';
    const digits=instrument(state.hero)?.digits||2;
    for(let i=0;i<4;i++){const value=low+(high-low)*i/3,yy=y(value);ctx.fillStyle=col('--muted');ctx.fillText(format(value,digits),w-R+8,yy);}
    const color=values.at(-1)>=values[0]?col('--up'):col('--down');
    ctx.beginPath();data.forEach((b,i)=>i?ctx.lineTo(x(i),y(b.c)):ctx.moveTo(x(i),y(b.c)));ctx.lineTo(x(data.length-1),B);ctx.lineTo(L,B);ctx.closePath();
    const gradient=ctx.createLinearGradient(0,T,0,B);gradient.addColorStop(0,color+'32');gradient.addColorStop(1,color+'02');ctx.fillStyle=gradient;ctx.fill();
    ctx.beginPath();data.forEach((b,i)=>i?ctx.lineTo(x(i),y(b.c)):ctx.moveTo(x(i),y(b.c)));ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.lineJoin='round';ctx.stroke();
    const ticks=w<400?3:5;ctx.fillStyle=col('--muted');ctx.font='10px Arial';
    for(let i=0;i<ticks;i++){const index=Math.round(i*(data.length-1)/(ticks-1)),date=new Date(data[index].t);ctx.textAlign=i===ticks-1?'right':'left';const label=state.range==='1D'?date.toLocaleTimeString('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});ctx.fillText(label,x(index),h-10)}
    chartState={data,x,y,w,h,L,R,T,B};
    canvas.setAttribute('aria-label',`${instrument(state.hero).name} ${state.range} ${state.mode==='preview'?'illustrative':'provider historical'} line chart, ${format(values.at(-1),digits)} ${instrument(state.hero).currency}. Time in UTC.`);
    if(hoverIndex>=0&&hoverIndex<data.length){const xx=x(hoverIndex),yy=y(data[hoverIndex].c);ctx.strokeStyle=col('--muted');ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(xx,T);ctx.lineTo(xx,B);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(xx,yy,3.6,0,Math.PI*2);ctx.fill();}
  }
  function renderWorld(){setHTML('#world-indices',['JP225','SHCOMP','UK100','DE40','CAC40'].map(s=>marketButton(s)).join(''));
    if(state.mode==='preview')setHTML('#crypto-overview',`<div class="crypto-total"><small>Total market cap</small><strong>2.43T <span>USD <span class="up">+0.68%</span></span></strong>${spark('BTCUSDT')}</div>`);
    else setHTML('#crypto-overview','<div class="empty-state">Market-cap and dominance data are not connected.</div>');
    $('.dominance').hidden=state.mode==='real';setHTML('#crypto-rows',['BTCUSDT','ETHUSDT'].map(s=>marketButton(s)).join(''));
  }
  function renderWatch(){
    setHTML('#watchlist',state.watch.map(sym=>{const v=quote(sym);return `<button class="watch-row" data-watch="${esc(sym)}" aria-pressed="${state.detail===sym}"><span class="symbol">${asset(sym)}${esc(sym)}</span><span>${v?format(v.price,v.digits):'—'}</span><span class="${tone(v?.chg)}">${v?signed(v.chg,Math.min(v.digits,5)):'—'}</span><span class="${tone(v?.chgPct)}">${v?percent(v.chgPct):'—'}</span></button>`}).join(''));$('#watch-empty').hidden=state.watch.length>0;
    const m=instrument(state.detail),v=quote(state.detail);if(!m)return;
    $('#detail-symbol').textContent=state.detail;$('#detail-icon').innerHTML=HomeIcons.mark(state.detail);$('#detail-name').textContent=m.name+' · '+m.market;
    $('#detail-price').textContent=v?format(v.price,v.digits):'—';$('#detail-currency').textContent=m.currency||'';
    $('#detail-change').textContent=v?signed(v.chg,v.digits)+' ('+percent(v.chgPct)+')':'No verified quote available';$('#detail-change').className=tone(v?.chgPct);
    $('#detail-source').textContent=source(state.detail);setHTML('#detail-spark',spark(state.detail,'1D',95));
    const stats=[['Open',v?.open],['High',v?.high],['Low',v?.low],['Latest close',v?.price]];
    setHTML('#detail-stats',stats.map(([k,val])=>`<div><dt>${k}</dt><dd>${format(val,m.digits)}</dd></div>`).join('')+`<div><dt>Last candle (UTC)</dt><dd>${v?.time?new Date(v.time).toISOString().slice(5,16).replace('T',' '):'—'}</dd></div>`);
  }
  function renderEditorials(){
    const ids=state.savedOnly?D.posts.filter(p=>state.saved.includes(p.id)):D.posts.slice(0,2);
    const card=p=>`<article class="editorial-card"><button class="image-button" data-article="${p.id}" aria-label="Read ${esc(p.title)}"><img src="assets/home/${p.image}" alt="${esc(p.alt)}" loading="lazy"></button><div class="editorial-body"><span class="sample-tag">${esc(p.tag)}</span><h3><button data-article="${p.id}" style="padding:0;text-align:left">${esc(p.title)}</button></h3><p>${esc(p.intro)}</p><div class="editorial-footer"><span class="author-mark"><img src="assets/home/logo.svg" alt="" width="18" height="20"></span><span>${esc(p.author)}</span><button class="icon-button save-idea" data-save="${p.id}" aria-pressed="${state.saved.includes(p.id)}" aria-label="${state.saved.includes(p.id)?'Unsave':'Save'} ${esc(p.title)}">${iconSVG('bookmark')}</button></div></div></article>`;
    setHTML('#trade-cards',ids.map(card).join(''));setHTML('#study-cards',D.posts.slice(2).map(card).join(''));
    $('#ideas-saved-filter').setAttribute('aria-pressed',state.savedOnly);$('#ideas-saved-filter').textContent=state.savedOnly?'Show all ideas':'Saved ideas';
    setHTML('#news-grid',D.news.map(p=>`<article class="news-story"><span class="topic">${esc(p.topic)}</span><h3>${esc(p.title)}</h3><p>${esc(p.intro)}</p><button class="section-link" data-article="${p.id}">Read more →</button></article>`).join(''));
  }
  function renderMovers(){
    const stocks=D.markets.filter(m=>m.market==='Stocks').map(m=>quote(m.symbol)).filter(Boolean);
    const row=v=>`<button class="mover-row" data-market="${esc(v.symbol)}" style="width:100%;text-align:left"><span class="name">${asset(v.symbol)}${esc(v.symbol)}</span><span>${format(v.price,v.digits)}</span><span class="${tone(v.chgPct)}">${percent(v.chgPct)}</span></button>`;
    setHTML('#gainers',stocks.filter(v=>v.chgPct>0).sort((a,b)=>b.chgPct-a.chgPct).slice(0,5).map(row).join('')||'<div class="empty-state">Stock quotes are not connected.</div>');
    setHTML('#losers',stocks.filter(v=>v.chgPct<0).sort((a,b)=>a.chgPct-b.chgPct).slice(0,5).map(row).join('')||'<div class="empty-state">Stock quotes are not connected.</div>');
    $('.stock-mode').textContent=state.mode==='preview'?'Sample snapshot':'Provider data only';
    setHTML('#volume-stocks',state.mode==='preview'?['NVDA','MSFT','AAPL','TSLA','AMD','AMZN'].map(sym=>{const v=quote(sym),m=instrument(sym);return `<button class="volume-card" data-market="${sym}">${asset(sym)}<span class="company">${sym}<small>${esc(m.name)}</small></span><span class="quote">${format(v.price,v.digits)}<small class="${tone(v.chgPct)}">${percent(v.chgPct)}</small></span></button>`}).join(''):'<div class="empty-state">Stock volume rankings are unavailable from the existing feed.</div>');
  }
  function renderPerformance(){
    const multipliers={'1D':1,'1W':2.8,'1M':4.5,'3M':6.7,'6M':8.3,'1Y':12};
    const pairs=['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCHF','USDCAD','NZDUSD'];
    const vals=pairs.map(sym=>{const v=quote(sym);return {sym,value:v?state.mode==='preview'?v.chgPct*multipliers[state.period]:v.chgPct:null}});
    const max=Math.max(...vals.map(v=>Math.abs(v.value||0)),.01);
    setHTML('#forex-performance',vals.map(({sym,value})=>{const width=Math.abs(value||0)/max*45,left=value>=0?50:50-width;return `<button class="performance-row" data-market="${sym}" style="width:100%;text-align:left"><span class="symbol">${asset(sym)}${sym}</span><span class="performance-track">${value===null?'':`<span class="performance-bar" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;background:var(${value>=0?'--up':'--down'})"></span>`}</span><span class="pct ${tone(value)}">${percent(value)}</span></button>`}).join(''));
    $('#forex-label').textContent=state.mode==='preview'?'Illustrative '+state.period+' performance':'Latest available UTC session';
    $$('[data-period]').forEach(b=>{b.disabled=state.mode==='real'&&b.dataset.period!=='1D';b.setAttribute('aria-pressed',b.dataset.period===state.period)});
    setHTML('#crypto-cards',['BTCUSDT','ETHUSDT','SOLUSDT'].map(assetCard).join(''));
    setHTML('#futures-cards',['NQ1!','ES1!','GC1!'].map(assetCard).join(''));
    $('#futures-label').textContent=state.mode==='preview'?'Illustrative contracts':'Provider data only';
  }
  function renderCalendar(){
    const events=D.events.filter(e=>(state.currency==='All'||e.currency===state.currency)&&(!state.highImpact||e.impact==='High'));
    setHTML('#event-grid',events.map(e=>`<button class="panel event-card" data-event-detail="${e.currency}"><div class="event-top"><strong>${esc(e.currency)}</strong><span class="impact ${e.impact==='Medium'?'medium':''}"><i></i>${e.impact}</span></div><h3>${esc(e.name)}</h3><span class="example">Example event · No scheduled date</span><dl><div><dt>Actual</dt><dd>—</dd></div><div><dt>Forecast</dt><dd>—</dd></div><div><dt>Previous</dt><dd>—</dd></div></dl></button>`).join('')||'<p class="empty-state">No sample events match these filters.</p>');
  }
  function renderCourses(){
    const courses=[['Market Structure','Beginner','ms-uptrend-gold.webp','Understand trends, ranges and key structural levels.'],['Liquidity','Intermediate','liq-eqh-gold.webp','Study liquidity, sweeps and reactions around prior highs and lows.'],['Risk Management','All levels','rm-position-gold.webp','Build a practical approach to position sizing and risk.']];
    setHTML('#course-grid',courses.map(([title,level,image,description])=>`<article class="course-card"><img src="assets/home/${image}" loading="lazy" alt="${esc(title)} Academy teaching chart"><div class="course-content"><h3>${title}</h3><span class="level">${level}</span><p>${description}</p><a class="section-link" href="https://hooki535.github.io/TheOnePercent/pages/learn.html#masterclasses">Explore course ↗</a></div></article>`).join(''));
  }
  function render(){
    $('#mode-label').textContent=state.mode==='preview'?'Preview data':'Real feed';$('#data-button').classList.toggle('real',state.mode==='real');
    renderSummary();renderWorld();renderWatch();renderMovers();renderPerformance();
  }
  function schedule(){if(state.mode==='real'&&frame===null)frame=requestAnimationFrame(()=>{frame=null;render()})}
  function choose(sym,scroll=false){if(!instrument(sym))return;state.hero=sym;state.detail=sym;hoverIndex=-1;render();if(scroll)$('#market-summary').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  function renderSearch(){
    const term=$('#search-input').value.trim().toLowerCase();
    const union=new Map(D.markets.map(m=>[m.symbol,m]));
    if(window.Feed)Feed.list().forEach(m=>{if(!union.has(m.symbol))union.set(m.symbol,{symbol:m.symbol,name:m.name,market:m.market,currency:m.quote,digits:m.digits})});
    const found=[...union.values()].filter(m=>(state.searchCategory==='All'||m.market===state.searchCategory)&&(m.symbol+' '+m.name).toLowerCase().includes(term)).slice(0,35);
    const pages=[['Chart workspace','charts.html'],['Trading Journal','journal.html'],['Dashboard','dashboard.html'],['Academy and learning','learn.html'],['Calculators','calculators.html']].filter(([title])=>state.searchCategory==='All'&&term&&title.toLowerCase().includes(term));
    setHTML('#search-results',found.map(m=>{const v=quote(m.symbol);return `<button class="search-result" data-result="${esc(m.symbol)}">${asset(m.symbol)}<span class="result-meta"><strong>${esc(m.symbol)}</strong><small>${esc(m.name)} · ${esc(m.market)}</small></span><span class="result-price">${v?format(v.price,v.digits):'—'}</span><span class="watch-add">${state.searchAction==='add'?(state.watch.includes(m.symbol)?'✓':'+'):'↗'}</span></button>`}).join('')+pages.map(([title,page])=>`<a class="search-result" href="https://hooki535.github.io/TheOnePercent/pages/${page}"><span class="result-meta"><strong>${esc(title)}</strong><small>Open the existing website ↗</small></span></a>`).join('')||'<div class="empty-state">No markets or pages match your search.</div>');
  }
  function openSearch(category='All',action='select'){
    closeMenus();state.searchCategory=category;state.searchAction=action;
    $$('[data-search]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.search===category));$('#search-input').value='';renderSearch();$('#search-dialog').showModal();$('#search-input').focus();
  }
  function openContent(title,html,eyebrow='TheOnePercent'){closeMenus();$('#dialog-eyebrow').textContent=eyebrow;$('#dialog-content').innerHTML=`<h2>${esc(title)}</h2>${html}`;$('#content-dialog').showModal()}
  function openArticle(id){
    const p=D.posts.find(p=>p.id===id)||D.news.find(p=>p.id===id);if(!p)return;
    openContent(p.title,`${p.image?`<img src="assets/home/${p.image}" alt="${esc(p.alt)}">`:''}<p>${esc(p.body)}</p>${p.bullets?'<ul>'+p.bullets.map(t=>`<li>${esc(t)}</li>`).join('')+'</ul>':''}<div class="dialog-actions"><a class="primary-button" href="https://hooki535.github.io/TheOnePercent/pages/learn.html#masterclasses">Explore the Academy ↗</a><a class="secondary-button" href="https://hooki535.github.io/TheOnePercent/pages/journal.html">Open Journal ↗</a></div>`,p.tag||p.topic);
  }
  function toggleSave(id){if(state.saved.includes(id))state.saved=state.saved.filter(x=>x!==id);else state.saved.push(id);persist();renderEditorials();toast(state.saved.includes(id)?'Idea saved on this device.':'Idea removed from saved items.')}
  function openDataModes(){openContent('Market data',`<p>This private review opens with clearly labelled sample data so every part of the design can be assessed. Real mode uses your existing Feed module and configured provider. Unsupported instruments remain unavailable.</p><div class="data-mode-options"><button data-mode="preview" aria-pressed="${state.mode==='preview'}"><strong>Preview snapshot</strong><small>Illustrative prices and charts dated 13 Nov 2026. No claim of live market data.</small></button><button data-mode="real" aria-pressed="${state.mode==='real'}"><strong>Existing real feed</strong><small>Reuse the current provider. Crypto history may load; forex, indices and stocks require supported sources. The private backtesting archive is unchanged.</small></button></div>`,'Data source and freshness')}
  function setMode(mode){state.mode=mode;state.period='1D';if(mode==='real'&&window.Feed){Feed.setDemoMode(false);if(!Feed.symbol(state.hero))state.hero='BTCUSDT';if(state.hero==='US500')state.hero='BTCUSDT';state.detail=state.hero;}persist();$('#content-dialog').close();render();toast(mode==='preview'?'Showing the labelled preview snapshot.':'Using the existing provider. Unsupported data will remain unavailable.')}
  function closeMenus(){['navigation','profile-menu'].forEach(id=>$('#'+id).hidden=true);$('#menu-button').setAttribute('aria-expanded',false);$('#profile-button').setAttribute('aria-expanded',false)}
  function updateProfile(){
    $('#profile-name').textContent=state.profile.name||'My profile';$('#profile-menu-name').textContent=state.profile.name||'My profile';
    $$('.profile-photo').forEach(el=>{el.classList.toggle('custom',!!state.profile.photo);el.style.backgroundImage=state.profile.photo?`url("${state.profile.photo}")`:''});
  }
  function showProfile(){closeMenus();profileDraft=state.profile.photo;$('#name-input').value=state.profile.name;$('#photo-input').value='';$('#profile-error').textContent='';$('#profile-dialog').showModal()}
  function showWatchSettings(){openContent('Your watchlist',`<p>These favourites are saved on this device for the private preview. Choose an instrument to remove it, or add another using the + button.</p><div>${state.watch.map(sym=>`<button class="search-result" data-remove-watch="${esc(sym)}"><span class="result-meta"><strong>${esc(sym)}</strong><small>${esc(instrument(sym)?.name||sym)}</small></span><span>Remove ×</span></button>`).join('')}</div><div class="dialog-actions"><button class="primary-button" id="add-from-settings">Add an instrument</button></div>`,'Watchlist settings')}
  function about(){openContent('About this homepage preview','<p>This is a private implementation of the approved TheOnePercent homepage design. The existing public website, Journal, charts engine, stored drawings and historical-data sources are unchanged.</p><p>Sample markets, editorial examples and calendar cards are labelled. Market data can be switched to the existing feed. News, current economic releases, community publishing and broker execution are not connected. Profile appearance, favourites and bookmarks are stored on this device for review.</p><p>Academy chart images are historical teaching examples from your existing project. They are not current Nasdaq or gold trade recommendations.</p>','Private design review')}
  function iconSVG(name){return HomeIcons.ui(name)}
  $$('[data-icon]').forEach(el=>el.outerHTML=iconSVG(el.dataset.icon));
  $$('button[aria-label], a[aria-label]').forEach(el=>{if(el.querySelector('svg.ui-icon')&&!el.getAttribute('title'))el.setAttribute('title',el.getAttribute('aria-label'))});
  document.addEventListener('click',event=>{
    const market=event.target.closest('[data-market]');if(market){choose(market.dataset.market);return}
    const watch=event.target.closest('[data-watch]');if(watch){choose(watch.dataset.watch);return}
    const article=event.target.closest('[data-article]');if(article){openArticle(article.dataset.article);return}
    const bookmark=event.target.closest('[data-save]');if(bookmark){toggleSave(bookmark.dataset.save);return}
    const result=event.target.closest('[data-result]');if(result){const sym=result.dataset.result;if(state.searchAction==='add'){if(!state.watch.includes(sym)){if(state.watch.length>=20){toast('Your preview watchlist can hold up to 20 instruments.');return}state.watch.push(sym);persist();renderWatch();toast(sym+' added to watchlist.')}renderSearch();return}choose(sym,true);$('#search-dialog').close();return}
    const mode=event.target.closest('[data-mode]');if(mode){setMode(mode.dataset.mode);return}
    const removed=event.target.closest('[data-remove-watch]');if(removed){state.watch=state.watch.filter(s=>s!==removed.dataset.removeWatch);persist();renderWatch();$('#content-dialog').close();showWatchSettings();return}
    if(event.target.closest('#add-from-settings')){$('#content-dialog').close();openSearch('All','add');return}
    const detail=event.target.closest('[data-event-detail]');if(detail){const e=D.events.find(e=>e.currency===detail.dataset.eventDetail);openContent(e.currency+' · '+e.name,`<p>${esc(e.about)}</p><p>Actual, forecast and previous values remain blank until a real calendar provider is connected.</p>`,'Sample economic event');return}
    const explore=event.target.closest('[data-explore]');if(explore){openSearch(explore.dataset.explore);return}
    if(event.target.closest('.close-dialog')){event.target.closest('dialog').close();return}
    if(!event.target.closest('.floating-menu,#menu-button,#profile-button'))closeMenus();
  });
  $('#menu-button').onclick=()=>{const was=$('#navigation').hidden;closeMenus();$('#navigation').hidden=!was;$('#menu-button').setAttribute('aria-expanded',was)};
  $('#profile-button').onclick=()=>{const was=$('#profile-menu').hidden;closeMenus();$('#profile-menu').hidden=!was;$('#profile-button').setAttribute('aria-expanded',was)};
  $('#navigation').addEventListener('click',e=>{if(e.target.closest('a'))closeMenus()});
  $('#open-search').onclick=()=>openSearch();$('#hero-search').onclick=()=>openSearch();$('#add-watch').onclick=()=>openSearch('All','add');
  $('#watch-settings').onclick=showWatchSettings;$('#data-button').onclick=openDataModes;
  $('#chart-options').onclick=()=>location.href='https://hooki535.github.io/TheOnePercent/pages/charts.html';
  $('#detail-open').onclick=()=>openContent(instrument(state.detail)?.name||state.detail,`<p>${esc(state.detail)} · ${esc(source(state.detail))}</p><p>The homepage shows a market summary. The existing custom Charts workspace contains the full drawing tools, indicators and saved analysis.</p><a class="primary-button" href="https://hooki535.github.io/TheOnePercent/pages/charts.html">Open chart workspace ↗</a>`,'Instrument details');
  function toggleWatch(){if(innerWidth<=700)document.body.classList.toggle('mobile-watch-open');else document.body.classList.toggle('watch-hidden');const visible=innerWidth<=700?document.body.classList.contains('mobile-watch-open'):!document.body.classList.contains('watch-hidden');$('#rail-watch').setAttribute('aria-pressed',visible)}
  $('#collapse-watch').onclick=toggleWatch;$('#rail-watch').onclick=toggleWatch;
  $('#theme-button').onclick=$('#footer-theme').onclick=()=>Theme.toggle();
  $('#edit-profile').onclick=showProfile;$('#saved-ideas').onclick=$('#footer-saved').onclick=()=>{closeMenus();state.savedOnly=true;renderEditorials();$('#trade-ideas').scrollIntoView({behavior:'smooth'})};
  $('#ideas-saved-filter').onclick=()=>{state.savedOnly=!state.savedOnly;renderEditorials()};
  $('#rail-help').onclick=$('#about-preview').onclick=about;
  $('#broker-plan').onclick=()=>openContent('Broker connections: planned integration','<p>The homepage reserves this area for a future broker directory. Broker comparisons, eligibility, account connections, paper orders and execution need their own design and integration review.</p><p>No broker account is connected and this page cannot place orders.</p>','Future section');
  $('#explain-map').onclick=()=>openContent('Global economy view','<p>The geographic outlines use Natural Earth data through World Atlas. Country shading is a deterministic illustrative dataset for design review, not current inflation, GDP or policy-rate information.</p><p>Select a metric to preview the map interaction, or select a country for its sample value. A real economic-data provider will be required before this can become a current macro dashboard.</p>','Illustrative macro view');
  $$('[data-range]').forEach(b=>b.onclick=()=>{state.range=b.dataset.range;hoverIndex=-1;$$('[data-range]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderSummary()});
  $$('[data-period]').forEach(b=>b.onclick=()=>{state.period=b.dataset.period;renderPerformance()});
  $$('[data-event]').forEach(b=>b.onclick=()=>{state.currency=b.dataset.event;$$('[data-event]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderCalendar()});
  $('#high-impact').onchange=e=>{state.highImpact=e.target.checked;renderCalendar()};
  $$('[data-search]').forEach(b=>b.onclick=()=>{state.searchCategory=b.dataset.search;$$('[data-search]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderSearch()});
  $('#search-input').oninput=renderSearch;
  $('#photo-input').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){$('#profile-error').textContent='Choose a JPG, PNG or WebP smaller than 2 MB.';event.target.value='';return}
    try{const reader=new FileReader();const data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=data});const size=Math.min(image.naturalWidth,image.naturalHeight);const canvas=document.createElement('canvas');canvas.width=canvas.height=160;canvas.getContext('2d').drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,160,160);profileDraft=canvas.toDataURL('image/jpeg',.88);$('#profile-error').textContent='Photo ready. Select Save profile to apply it.'}catch{$('#profile-error').textContent='That image could not be read. Please choose another.'}
  };
  $('#reset-photo').onclick=()=>{profileDraft=null;$('#photo-input').value='';$('#profile-error').textContent='The sample photo will be used when you save.'};
  $('#profile-form').onsubmit=event=>{event.preventDefault();const name=$('#name-input').value.trim();if(!name){$('#profile-error').textContent='Enter a display name.';return}state.profile={name:name.slice(0,50),photo:profileDraft};persist();updateProfile();$('#profile-dialog').close();toast('Preview profile saved on this device.')};
  const canvas=$('#hero-canvas');
  canvas.addEventListener('pointermove',event=>{if(!chartState)return;const rect=canvas.getBoundingClientRect(),xx=event.clientX-rect.left;if(xx<chartState.L||xx>chartState.w-chartState.R)return;hoverIndex=Math.max(0,Math.min(chartState.data.length-1,Math.round((xx-chartState.L)/(chartState.w-chartState.L-chartState.R)*(chartState.data.length-1))));drawHero();const b=chartState.data[hoverIndex],tip=$('#chart-tooltip');tip.innerHTML=`<strong>${format(b.c,instrument(state.hero).digits)}</strong>${new Date(b.t).toLocaleString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} UTC`;tip.hidden=false;const width=tip.offsetWidth;tip.style.left=Math.max(0,Math.min(chartState.w-width,chartState.x(hoverIndex)+12))+'px';tip.style.top=Math.max(0,Math.min(chartState.h-60,chartState.y(b.c)-50))+'px'});
  canvas.addEventListener('pointerleave',()=>{hoverIndex=-1;$('#chart-tooltip').hidden=true;drawHero()});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(!document.querySelector('dialog[open]'))openSearch()}if(event.key==='Escape')closeMenus()});
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}}));
  const sectionObserver=new IntersectionObserver(entries=>{const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(active)$$('[data-nav-section]').forEach(a=>a.classList.toggle('active',a.dataset.navSection===active.target.id))},{rootMargin:'-15% 0px -65% 0px',threshold:0});
  $$('[data-nav-section]').forEach(a=>{const target=$('#'+a.dataset.navSection);if(target)sectionObserver.observe(target)});
  const resize=new ResizeObserver(()=>{hoverIndex=-1;drawHero()});resize.observe(canvas);
  function syncThemeIcons(){const dark=Theme.current()==='dark';$('#theme-button').innerHTML=iconSVG(dark?'sun':'moon');$('#theme-button').setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');$('#theme-button').title=dark?'Switch to light theme':'Switch to dark theme';$('#footer-theme').innerHTML=iconSVG(dark?'sun':'moon')}
  window.addEventListener('themechange',()=>{syncThemeIcons();hoverIndex=-1;drawHero()});
  const unsubscribe=window.Feed?Feed.subscribe(schedule):()=>{};
  if(state.mode==='real'&&window.Feed)Feed.setDemoMode(false);
  window.addEventListener('pagehide',()=>{unsubscribe();resize.disconnect();sectionObserver.disconnect();clearTimeout(toastTimer);if(frame!==null)cancelAnimationFrame(frame)},{once:true});
  syncThemeIcons();updateProfile();renderEditorials();renderCalendar();renderCourses();render();
  window.Homepage={openContent,showToast:toast};
})();
