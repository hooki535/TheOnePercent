/* Pure market presentation: shared candle snapshots and stable missing-last sorts. */
window.MarketsModel=(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const price=(v,d=5)=>Number.isFinite(v)?v.toLocaleString('en-US',{minimumFractionDigits:Math.min(8,d),maximumFractionDigits:Math.min(8,d)}):'—';
 const percent=v=>Number.isFinite(v)?`${v>0?'+':v<0?'−':''}${Math.abs(v).toFixed(2)}%`:'—';
 function watch(saved,defaults){return Array.from(new Set((Array.isArray(saved)?saved:defaults).filter(v=>typeof v==='string'&&/^[A-Z0-9!.]{2,20}$/.test(v))));}
 function rows(list,quotes,{category='All',q='',savedOnly=false,watchlist=[],sort='symbol',asc=true}={}){
  const term=q.trim().toLowerCase();
  return list.filter(s=>(category==='All'||s.market===category)&&(!savedOnly||watchlist.includes(s.symbol))&&(!term||(s.symbol+' '+s.name).toLowerCase().includes(term))).map(s=>({s,q:quotes.get(s.symbol)||null})).sort((a,b)=>{
   if(sort==='symbol')return (asc?1:-1)*a.s.symbol.localeCompare(b.s.symbol);
   const x=sort==='price'?a.q?.price:a.q?.percent,y=sort==='price'?b.q?.price:b.q?.percent;
   if(!Number.isFinite(x))return Number.isFinite(y)?1:a.s.symbol.localeCompare(b.s.symbol);
   if(!Number.isFinite(y))return -1;
   return (asc?1:-1)*(x-y)||a.s.symbol.localeCompare(b.s.symbol);
  });
 }
 function spark(bars,label){
  const values=bars.slice(-48).map(b=>b.c);if(values.length<2||!values.every(Number.isFinite))return '<span class="markets-muted">No trend</span>';
  const lo=Math.min(...values),hi=Math.max(...values),range=hi-lo||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1)*105+3).toFixed(1)},${(26-(v-lo)/range*22).toFixed(1)}`).join(' ');
  return `<svg class="market-spark ${values.at(-1)>values[0]?'positive':values.at(-1)<values[0]?'negative':''}" viewBox="0 0 112 30" role="img" aria-label="${esc(label)} · last ${values.length} candle closes"><polyline points="${pts}"/></svg>`;
 }
 return {esc,price,percent,watch,rows,spark};
})();
