/* Watchlist presentation over the existing Feed, chart and persistence APIs. */
(function(){
  const byId=id=>document.getElementById(id),esc=WatchlistModel.escape;
  const icon=(p)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const close=icon('<path d="m6 6 12 12M18 6 6 18"/>'),search=icon('<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>');
  const flags={USD:'🇺🇸',EUR:'🇪🇺',GBP:'🇬🇧',JPY:'🇯🇵',AUD:'🇦🇺',NZD:'🇳🇿',CAD:'🇨🇦',CHF:'🇨🇭',UGX:'🇺🇬',KES:'🇰🇪'};
  function badge(symbol,S){if(S.market==='Forex')return `<span class="mw-badge mw-pair" aria-hidden="true"><i>${flags[S.base||symbol.slice(0,3)]||'◦'}</i><i>${flags[S.quote||symbol.slice(3,6)]||'◦'}</i></span>`;const text=symbol.startsWith('XAU')?'Au':symbol.startsWith('XAG')?'Ag':S.base||symbol.slice(0,2);return `<span class="mw-badge mw-asset" aria-hidden="true">${esc(text.slice(0,3))}</span>`;}
  const list=byId('wsub-list'),top=list.querySelector('.wl-top');
  top.classList.add('mw-toolbar');
  const filter=document.createElement('label');filter.className='mw-filter';filter.innerHTML=search+'<input type="search" aria-label="Filter watchlist" placeholder="Filter symbols">';top.before(filter);
  const add=byId('wlAdd');add.textContent='';add.innerHTML=icon('<path d="M12 5v14M5 12h14"/>');add.title='Add symbol';add.setAttribute('aria-label','Add symbol to watchlist');
  const heading=document.createElement('div');heading.className='mw-columns';heading.innerHTML='<span>Symbol</span><span>Last</span><span>Chg%</span><span></span>';top.after(heading);
  const note=document.createElement('p');note.className='mw-data-note';note.textContent='Stored candle closes · UTC day change';heading.after(note);
  const summary=document.createElement('section');summary.id='watchSnapshot';summary.className='mw-summary';summary.setAttribute('aria-label','Selected instrument');list.append(summary);
  const price=(v,d)=>Number.isFinite(v)?v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const signed=(v,d)=>Number.isFinite(v)?(v>=0?'+':'−')+Math.abs(v).toFixed(d):'—';
  function data(symbol){const S=Feed.symbol(symbol)||SYMBOLS[symbol],iv=state.charts[state.sel].iv,bars=Feed.history(symbol,iv);return {symbol,S,bars,snapshot:WatchlistModel.snapshot(bars),iv};}
  function card(compact){
    const {symbol,S,snapshot:q,iv}=data(state.charts[state.sel].sym);if(!S)return '<p class="mw-empty">Instrument unavailable.</p>';
    const source=Feed.historicalSource(symbol,iv)|| (Feed.isDemoMode()?'Synthetic demo candles':q?'Provider candles':'Source unavailable until candles load');
    const title=`<div class="mw-instrument"><div>${badge(symbol,S)}<b>${esc(symbol)}</b><span class="mw-market">${esc(S.market)}</span></div>${compact?'<button type="button" data-mw-details aria-label="Open instrument details" title="Instrument details">'+icon('<path d="M9 5h10v10M19 5 5 19"/>')+'</button>':''}</div><p class="mw-full-name">${esc(S.name)}</p>`;
    const body=q?`<div class="mw-price">${price(q.price,S.digits)} <small>${esc(S.quote||'')}</small></div><div class="mw-change ${q.change>=0?'up':'dn'}">${signed(q.change,S.digits)} <span>${signed(q.percent,2)}%</span></div><p class="mw-status"><i></i>${Feed.isDemoMode()?'Demo candles':'Historical candles'} · ${esc(iv)}</p><div class="mw-range-label"><span>Loaded day low</span><span>High</span></div><div class="mw-range-prices"><b>${price(q.low,S.digits)}</b><b>${price(q.high,S.digits)}</b></div><div class="mw-range"><i style="left:${q.rangeAt}%"></i></div><p class="mw-time">As of ${new Date(q.time).toISOString().replace('T',' ').slice(0,16)} UTC</p>`:`<p class="mw-no-data">${ChartHistory.status(symbol,iv).state==='loading'?'Loading candles…':'No candles available for this timeframe.'}</p>`;
    return title+body+`<p class="mw-source">${esc(source)}</p>`+(compact?'':`<p class="mw-method">Change is measured from the first loaded candle open on the latest UTC date. Historical prices do not indicate that the market is currently open.</p>${specHTML(symbol,S)}`);
  }
  function wireDetails(){summary.querySelector('[data-mw-details]')?.addEventListener('click',()=>switchWatchView('details'));}
  function paintCard(){byId('symCard').innerHTML=card(false);summary.innerHTML=card(true);wireDetails();}
  function paint(){
    const term=filter.querySelector('input').value.trim().toLowerCase(),selected=state.charts[state.sel].sym;
    let rows=state.watch.map(data).filter(r=>r.S&&(!term||(r.symbol+' '+r.S.name).toLowerCase().includes(term)));rows=WatchlistModel.sort(rows,wlSort);
    byId('wl').innerHTML=rows.length?rows.map(r=>{const q=r.snapshot;return `<div class="mw-row ${selected===r.symbol?'selected':''}" data-mw-symbol="${esc(r.symbol)}"><button type="button" class="mw-select" data-mw-select="${esc(r.symbol)}" aria-label="Open ${esc(r.symbol)} chart" aria-pressed="${selected===r.symbol}" title="${esc(r.S.name)} · ${esc(r.iv)}${wlSort==='none'?' · Alt+↑/↓ to reorder':''}"><span class="mw-symbol">${badge(r.symbol,r.S)}<span>${esc(r.symbol)}</span></span><span class="mw-last">${q?price(q.price,r.S.digits):'—'}</span><span class="mw-percent ${q?q.change>=0?'up':'dn':'mw-missing'}" title="${q?'Change from first loaded candle open on '+q.date+' UTC':'No candles available'}">${q?signed(q.percent,2)+'%':'—'}</span></button><button type="button" class="mw-remove" data-mw-remove="${esc(r.symbol)}" aria-label="Remove ${esc(r.symbol)} from watchlist">${close}</button></div>`;}).join(''):`<div class="mw-empty"><b>${term?'No matching symbols':'Your watchlist is empty'}</b><p>${term?'Try another symbol or clear the filter.':'Add instruments using the + button above.'}</p></div>`;
    byId('wl').querySelectorAll('[data-mw-select]').forEach(b=>{b.onclick=()=>{setSymbol(b.dataset.mwSelect);byId('wl').querySelector(`[data-mw-select="${b.dataset.mwSelect}"]`)?.focus();};b.onkeydown=e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key)||wlSort!=='none')return;e.preventDefault();state.watch=WatchlistModel.move(state.watch,b.dataset.mwSelect,e.key==='ArrowUp'?-1:1);saveWatch();paint();byId('wl').querySelector(`[data-mw-select="${b.dataset.mwSelect}"]`)?.focus();};});
    byId('wl').querySelectorAll('[data-mw-remove]').forEach(b=>b.onclick=()=>{state.watch=state.watch.filter(s=>s!==b.dataset.mwRemove);saveWatch();paint();});
    note.textContent=(Feed.isDemoMode()?'Demo':'Stored')+' closes · '+state.charts[state.sel].iv+' · UTC day change';paintCard();paintCompare();
  }
  filter.querySelector('input').oninput=paint;
  window.ChartWatchlist={paint,paintCard};
  let signature='';document.addEventListener('chart-render',()=>{if(document.body.dataset.workspaceTab!=='watchlist')return;const cfg=state.charts[state.sel],current=data(cfg.sym),sig=JSON.stringify([cfg.sym,cfg.iv,current.snapshot,state.watch.map(s=>{const q=WatchlistModel.snapshot(Feed.history(s,cfg.iv));return [s,q?.time,q?.price];})]);if(sig!==signature){signature=sig;if(state.watchView==='details')paintCard();else if(state.watchView==='list')paint();}});
  paint();
})();
