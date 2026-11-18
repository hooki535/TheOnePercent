(() => {
 'use strict';
 const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
 const M=MarketsModel,E=M.esc,iv='15m',featured=['EURUSD','XAUUSD','BTCUSDT','US500'];
 const example=document.body.dataset.marketExample==='true';
 const state={category:'Forex',q:'',savedOnly:false,sort:'symbol',asc:true,page:1,selected:'EURUSD',watchQ:''};
 const bars=new Map(),quotes=new Map(),requested=new Set();let catalog=[],watch=[],scheduled=false,signature='',catalogError='';
 const tone=q=>q&&Number.isFinite(q.percent)?q.percent>0?'positive':q.percent<0?'negative':'':'';
 const time=q=>q?new Date(q.time).toISOString().slice(0,16).replace('T',' ')+' UTC':'Unavailable';
 const chart=s=>'charts.html?source=overview&symbol='+encodeURIComponent(s)+'&interval=15m';
 const size=s=>'calculators.html?symbol='+encodeURIComponent(s)+'#ps';
 function toast(msg){$('#toast').textContent=msg;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,3500);}
 function loadCatalog(){
  const seen=new Set();catalog=Feed.list().filter(s=>s&&typeof s.symbol==='string'&&!seen.has(s.symbol)&&seen.add(s.symbol));
  watch=M.watch(Store.settings.get().chartsWatch,WatchlistModel.seed(window.Shell?.profile?.()||{},symbol=>Instruments.find(symbol)));
 }
 function instrument(symbol){return catalog.find(s=>s.symbol===symbol)||Feed.symbol(symbol)||{symbol,name:'Instrument details unavailable',market:'Unknown',digits:5,quote:''};}
 function badge(s){return HomeIcons.mark(s.symbol);}
 function read(symbol){
  if(!requested.has(symbol)){requested.add(symbol);Feed.history(symbol,iv);}
  // Cache reads stay with Feed, which guards repeated network requests.
  const list=Feed.history(symbol,iv)||[];bars.set(symbol,list);quotes.set(symbol,WatchlistModel.snapshot(list));
 }
 function status(symbol){return window.ChartHistory?.status(symbol,iv)||{state:'idle',message:'Stored history'};}
 function quoteMarkup(s,q){return `<strong>${q?M.price(q.price,s.digits):'Unavailable'}</strong><span class="${tone(q)}">${q?M.percent(q.percent):'No stored quote'}</span>`;}
 function select(symbol){state.selected=symbol;read(symbol);render();}
 function toggle(symbol){
  watch=watch.includes(symbol)?watch.filter(s=>s!==symbol):[...watch,symbol];
  Store.settings.patch({chartsWatch:watch});render();
  toast(Store.storageBlocked?.()?'Watchlist updated for this session only.':watch.includes(symbol)?symbol+' added to watchlist':symbol+' removed from watchlist');
 }
 function render(){
  loadCatalog();
  const filtered=M.rows(catalog,quotes,{...state,watchlist:watch});
  const pages=Math.max(1,Math.ceil(filtered.length/12));state.page=Math.min(state.page,pages);
  const visible=filtered.slice((state.page-1)*12,state.page*12);
  const need=new Set([...featured,state.selected,...visible.map(row=>row.s.symbol),...watch]);
  need.forEach(symbol=>read(symbol));
  // Quotes that arrived since filtering are consumed on the next feed notification.
  const demo=Feed.isDemoMode();
  $('#market-mode').textContent=example?'Example data · 15m':demo?'Synthetic demo mode · 15m':'Database history · 15m';
  $('#market-mode').classList.toggle('is-demo',demo);$('#market-real').hidden=!demo;
  $('#market-status').textContent=example?'Example instruments and candles · Changes reset on reload.':catalogError|| (demo?'Synthetic demo data is enabled in your chart preferences. It is not stored market history.':'Latest stored candle closes, not live quotes. Select an instrument to see its source and timestamp.');
  $('#market-summary').innerHTML=featured.map(symbol=>{const s=instrument(symbol),q=quotes.get(symbol);return `<button type="button" class="market-summary-card" data-select="${E(symbol)}" aria-label="Select ${E(symbol)}"><div class="market-badge">${badge(s)}</div><div><span>${E(s.name)}</span>${quoteMarkup(s,q)}<small>${q?E(time(q)):'Awaiting stored candles'}</small></div><div class="${tone(q)}">${M.spark(bars.get(symbol)||[],symbol)}</div></button>`;}).join('');
  $('#market-rows').innerHTML=visible.length?visible.map(({s})=>{const q=quotes.get(s.symbol),saved=watch.includes(s.symbol),st=status(s.symbol);return `<tr class="${state.selected===s.symbol?'is-selected':''}"><td><button type="button" class="market-star ${saved?'is-saved':''}" data-star="${E(s.symbol)}" aria-pressed="${saved}" aria-label="${saved?'Remove':'Save'} ${E(s.symbol)} ${saved?'from':'to'} watchlist">${saved?'★':'☆'}</button></td><th scope="row"><button type="button" class="market-instrument" data-select="${E(s.symbol)}" aria-label="Select ${E(s.symbol)}" aria-pressed="${state.selected===s.symbol}"><span class="market-badge">${badge(s)}</span><span><b>${E(s.symbol)}</b><small>${E(s.name)}</small></span></button></th><td class="market-price">${q?M.price(q.price,s.digits):'—'}<small>${q?E(time(q)):st.state==='loading'?'Loading…':'No stored quote'}</small></td><td class="${tone(q)}">${q?M.percent(q.percent):'—'}</td><td class="${tone(q)}">${M.spark(bars.get(s.symbol)||[],s.symbol)}</td><td><a class="market-chart-link" href="${chart(s.symbol)}" aria-label="Open ${E(s.symbol)} chart">${HomeIcons.ui('chart')}</a></td></tr>`;}).join(''):'<tr><td colspan="6" class="market-empty"><strong>No matching instruments</strong><p>Try another symbol, clear the filters, or save an instrument first.</p></td></tr>';
  $('#market-count').textContent=filtered.length+' instrument(s) · Select a row for details';$('#market-page').textContent=state.page+' / '+pages;$('#market-prev').disabled=state.page<=1;$('#market-next').disabled=state.page>=pages;
  $$('[data-sort]').forEach(button=>$('#sort-'+button.dataset.sort).setAttribute('aria-sort',state.sort===button.dataset.sort?(state.asc?'ascending':'descending'):'none'));
  $('#market-clear').hidden=state.category==='All'&&!state.q&&!state.savedOnly;
  const watched=watch.filter(symbol=>(symbol+' '+instrument(symbol).name).toLowerCase().includes(state.watchQ.toLowerCase()));
  $('#market-watch').innerHTML=watched.length?watched.map(symbol=>{const s=instrument(symbol),q=quotes.get(symbol);return `<div class="market-watch-row ${state.selected===symbol?'is-selected':''}"><button type="button" data-select="${E(symbol)}" aria-label="Select saved ${E(symbol)}"><b>${E(symbol)}</b><span>${q?M.price(q.price,s.digits):'—'}</span><span class="${tone(q)}">${q?M.percent(q.percent):'—'}</span></button><button type="button" data-star="${E(symbol)}" aria-label="Remove saved ${E(symbol)}">×</button></div>`;}).join(''):`<div class="market-watch-empty"><strong>${watch.length?'No matching favourites':'Your watchlist is empty'}</strong><p>${watch.length?'Clear the watchlist filter.':'Use the star beside an instrument to save it.'}</p></div>`;
  const s=instrument(state.selected),q=quotes.get(state.selected),st=status(state.selected);
  const source=Feed.historicalSource(state.selected,iv)||(demo?'Synthetic demo candles':'Source unavailable until stored candles load');
  $('#market-detail').innerHTML=`<div class="market-detail-heading"><span class="market-badge">${badge(s)}</span><div><h2 id="market-detail-title">${E(s.symbol)}</h2><p>${E(s.name)}</p></div><button type="button" class="market-star ${watch.includes(s.symbol)?'is-saved':''}" data-star="${E(s.symbol)}" aria-label="Toggle ${E(s.symbol)} favourite" aria-pressed="${watch.includes(s.symbol)}">${watch.includes(s.symbol)?'★':'☆'}</button></div><div class="market-detail-price">${q?M.price(q.price,s.digits):'Unavailable'}</div><div class="${tone(q)}">${q?M.percent(q.percent):'No stored quote'}</div><p class="markets-detail-status">${example?'Example close · '+E(time(q)):demo?'Synthetic demo candles':q?'Historical close · '+E(time(q)):st.state==='loading'?'Loading database candles…':'Stored history is unavailable for this selection.'}</p><dl><dt>Category</dt><dd>${E(s.market)}</dd><dt>Quote currency</dt><dd>${E(s.quote||'Not recorded')}</dd><dt>Data source</dt><dd>${E(source)}</dd><dt>Interval</dt><dd>15 minutes</dd><dt>Loaded UTC day</dt><dd>${q?E(q.date):'—'}</dd></dl><p class="markets-method">Change uses only the loaded candles on that UTC date. It is not a verified exchange session return.</p><a class="btn btn-primary" href="${chart(s.symbol)}">Open chart ${HomeIcons.ui('external')}</a>${Instruments.find(s.symbol)?`<a class="btn btn-quiet" href="${size(s.symbol)}">Plan position</a>`:'<p class="markets-method">Sizing is unavailable until an instrument specification is configured.</p>'}`;
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;const active=document.activeElement;const attr=active?.dataset?.star?'star':active?.dataset?.select?'select':null;const value=attr?active.dataset[attr]:null;const rows=Array.from(requested).map(symbol=>{const b=Feed.history(symbol,iv)||[];return [symbol,b.length,b.at(-1)?.t,b.at(-1)?.c];});const sig=JSON.stringify([rows,Feed.list().length,Store.settings.get().chartsWatch,Feed.isDemoMode()]);if(sig!==signature){signature=sig;render();if(attr){const target=Array.from(document.querySelectorAll('[data-'+attr+']')).find(b=>b.dataset[attr]===value);target?.focus({preventScroll:true});}}});}
 function clear(){state.category='All';state.q='';state.savedOnly=false;state.page=1;$('#market-search').value='';$('#market-saved').checked=false;setCategory('All');}
 function setCategory(category){state.category=category;state.page=1;$$('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));render();}
 function init(){
  $('#market-search-icon').innerHTML=HomeIcons.ui('search');
  document.addEventListener('click',e=>{const star=e.target.closest('[data-star]');if(star){toggle(star.dataset.star);return;}const selected=e.target.closest('[data-select]');if(selected){select(selected.dataset.select);return;}const cat=e.target.closest('[data-category],[data-browse]');if(cat){setCategory(cat.dataset.category||cat.dataset.browse);return;}const sort=e.target.closest('[data-sort]');if(sort){state.asc=state.sort===sort.dataset.sort?!state.asc:sort.dataset.sort==='symbol';state.sort=sort.dataset.sort;state.page=1;render();}});
  $('#market-search').oninput=e=>{state.q=e.target.value;state.page=1;render();};$('#market-saved').onchange=e=>{state.savedOnly=e.target.checked;state.page=1;render();};$('#watch-search').oninput=e=>{state.watchQ=e.target.value;render();};$('#market-clear').onclick=clear;
  $('#watch-add').onclick=()=>{state.savedOnly=false;$('#market-saved').checked=false;setCategory('All');$('#market-search').focus();toast('Search for an instrument, then select its star to save it.');};
  $('#market-prev').onclick=()=>{state.page--;render();};$('#market-next').onclick=()=>{state.page++;render();};
  $('#market-retry').onclick=()=>{catalogError='';window.ChartHistory?.catalog().then(()=>{loadCatalog();render();}).catch(()=>{catalogError='Market history connection unavailable. You can still browse instruments and manage your watchlist.';render();});for(const symbol of requested)if(!quotes.get(symbol))Feed.retryHistory(symbol,iv);};
  $('#market-real').onclick=()=>{Feed.setDemoMode(false);render();};
  render();Feed.subscribe(schedule);window.addEventListener('storechange',schedule);
  window.ChartHistory?.catalog().then(()=>{loadCatalog();render();}).catch(()=>{catalogError='Market history connection unavailable. You can still browse instruments and manage your watchlist.';render();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
