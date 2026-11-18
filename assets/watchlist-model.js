/* Shared UTC-day snapshot and watchlist ordering. No storage or chart dependencies. */
window.WatchlistModel=(()=>{
  const utc=t=>Number.isFinite(t)?new Date(t).toISOString().slice(0,10):'';
  function snapshot(bars){
    if(!bars?.length)return null;
    const last=bars[bars.length-1];if(![last.t,last.c,last.o,last.h,last.l].every(Number.isFinite))return null;
    const date=utc(last.t);let start=bars.length-1,low=last.l,high=last.h;
    while(start>0&&utc(bars[start-1].t)===date){start--;low=Math.min(low,bars[start].l);high=Math.max(high,bars[start].h);}
    const open=bars[start].o,change=last.c-open;
    return {price:last.c,time:last.t,date,open,low,high,change,percent:open!==0?change/open*100:null,rangeAt:high>low?Math.max(0,Math.min(100,(last.c-low)/(high-low)*100)):50};
  }
  function sort(rows,mode){return rows.slice().sort((a,b)=>{if(mode==='name')return a.symbol.localeCompare(b.symbol);if(!['gain','loss'].includes(mode))return 0;const x=a.snapshot?.percent,y=b.snapshot?.percent;if(x==null)return y==null?0:1;if(y==null)return -1;return mode==='gain'?y-x:x-y;});}
  function move(list,symbol,direction){const next=list.slice(),from=next.indexOf(symbol),to=from+direction;if(from<0||to<0||to>=next.length)return next;[next[from],next[to]]=[next[to],next[from]];return next;}
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function seed(profile,find){
    const defaults={Forex:["EURUSD","GBPUSD","USDJPY","GBPJPY","USDUGX","USDKES"],Crypto:["BTCUSDT","ETHUSDT","SOLUSDT"],Indices:["US500","US30","NAS100","DE40"],Commodities:["XAUUSD","XAGUSD"],Futures:["NQ1!","ES1!","CL1!"]};
    const picked=(profile?.markets||[]).map(m=>String(m).toLowerCase());
    const keys=Object.keys(defaults).filter(k=>picked.some(p=>k.toLowerCase().includes(p)||p.includes(k.toLowerCase())));
    const out=[];(keys.length?keys:["Forex","Commodities","Crypto"]).forEach(k=>defaults[k].forEach(symbol=>{if(find(symbol)&&!out.includes(symbol))out.push(symbol);}));
    return out.slice(0,14);
  }
  return {snapshot,sort,move,escape,seed};
})();
