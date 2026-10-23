/* Original study calculations; callers supply revealed bars only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BacktestStudies=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const definitions=[
 ['DAYBREAK','Day Break Lines',0],['WEEKDAYS','Weekday Labels',0],
 ['HIGHLOW52','52 Week High/Low',0],['AC','Accelerator Oscillator',1],['AD','Accumulation/Distribution',1,'volume'],['ASI','Accumulative Swing Index',1,'limit'],['ADVDEC','Advance/Decline',1,'breadth'],['ALMA9','Arnaud Legoux Moving Average',0],['AROON14','Aroon',1],['ADX14','Average Directional Index',1],['AVGPRICE','Average Price',0],['ATR14','Average True Range',1],['AO','Awesome Oscillator',1],['BOP','Balance of Power',1],['BB20','Bollinger Bands',0],['BBP20','Bollinger Bands %B',1],['SMA20','Simple Moving Average · 20',0],['EMA20','Exponential Moving Average · 20',0],['EMA50','Exponential Moving Average · 50',0],['EMA200','Exponential Moving Average · 200',0],['RSI14','Relative Strength Index · 14',1]
 ].map(([id,label,pane,requires])=>({id,label,pane,requires}));
 const ids=definitions.map(d=>d.id),get=id=>definitions.find(d=>d.id===id);
 function unavailable(id,bars){const d=get(id);if(d?.requires==='breadth')return 'Requires advancing and declining counts for a market universe.';if(d?.requires==='limit')return 'Requires the exchange limit-move value; not available for this forex/CFD history.';if(d?.requires==='volume'&&(!bars.length||!bars.every(b=>Number.isFinite(b.v)&&b.v>=0)||!bars.some(b=>b.v>0)))return 'Requires real volume in the selected history.';return '';}
 function sma(values,n){return values.map((_,i)=>i<n-1?null:values.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n);}
 function calculate(bars,id){
  if(!get(id)||unavailable(id,bars))return [];
  const close=bars.map(b=>b.c),median=bars.map(b=>(b.h+b.l)/2),out=[],make=(key,values,color)=>({key,color,data:values.flatMap((v,i)=>Number.isFinite(v)?[{time:bars[i].t,value:v}]:[])});
  if(id==='HIGHLOW52'){const highs=[],lows=[];let from=0;bars.forEach((b,i)=>{while(bars[from].t<b.t-364*86400)from++;const rows=bars.slice(from,i+1);highs.push(Math.max(...rows.map(b=>b.h)));lows.push(Math.min(...rows.map(b=>b.l)));});return [make('52W High',highs,'#26a69a'),make('52W Low',lows,'#ef5350')];}
  if(id==='ALMA9'){const weights=Array.from({length:9},(_,i)=>Math.exp(-((i-.85*8)**2)/(2*(9/6)**2))),sum=weights.reduce((a,b)=>a+b,0);return [make('ALMA 9',close.map((_,i)=>i<8?null:weights.reduce((s,w,j)=>s+w*close[i-8+j],0)/sum),'#ffb74d')];}
  if(id==='AVGPRICE')return [make('Average Price',bars.map(b=>(b.o+b.h+b.l+b.c)/4),'#59c5c8')];
  if(id==='BOP')return [make('Balance of Power',bars.map(b=>b.h===b.l?0:(b.c-b.o)/(b.h-b.l)),'#59c5c8')];
  if(id==='AD'){let total=0;return [make('Accumulation/Distribution',bars.map(b=>total+=(b.h===b.l?0:(2*b.c-b.h-b.l)/(b.h-b.l))*b.v),'#59c5c8')];}
  if(id==='AO'||id==='AC'){const fast=sma(median,5),slow=sma(median,34),ao=median.map((_,i)=>i<33?null:fast[i]-slow[i]);if(id==='AO')return [make('Awesome Oscillator',ao,'#26a69a')];const sm=sma(ao.slice(33),5);return [make('Accelerator Oscillator',ao.map((v,i)=>i<37?null:v-sm[i-33]),'#26a69a')];}
  if(id==='AROON14'){const up=[],down=[];bars.forEach((b,i)=>{if(i<14){up.push(null);down.push(null);return;}let hi=i,lo=i;for(let j=i-1;j>=i-14;j--){if(bars[j].h>bars[hi].h)hi=j;if(bars[j].l<bars[lo].l)lo=j;}up.push(100*(14-i+hi)/14);down.push(100*(14-i+lo)/14);});return [make('Aroon Up',up,'#26a69a'),make('Aroon Down',down,'#ef5350')];}
  if(id==='ADX14'){let tr=0,plus=0,minus=0,adx=0,n=0;const values=bars.map((b,i)=>{if(!i)return null;const prev=bars[i-1],range=Math.max(b.h-b.l,Math.abs(b.h-prev.c),Math.abs(b.l-prev.c)),u=b.h-prev.h,d=prev.l-b.l,p=u>d&&u>0?u:0,m=d>u&&d>0?d:0;if(i<=14){tr+=range;plus+=p;minus+=m;if(i<14)return null;}else{tr=tr-tr/14+range;plus=plus-plus/14+p;minus=minus-minus/14+m;}const dx=plus+minus?100*Math.abs(plus-minus)/(plus+minus):0;if(n<14){adx+=dx;n++;if(n<14)return null;adx/=14;}else adx=(adx*13+dx)/14;return adx;});return [make('ADX 14',values,'#b18cff')];}
  if(id==='BBP20'){const mean=sma(close,20);return [make('Bollinger %B',close.map((c,i)=>{if(i<19)return null;const sd=Math.sqrt(close.slice(i-19,i+1).reduce((s,v)=>s+(v-mean[i])**2,0)/20);return sd?(c-(mean[i]-2*sd))/(4*sd):.5;}),'#59c5c8')];}
  return out;
 }
 function daySegments(bars,zone='UTC'){
  let formatter;const options={timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'long'};
  try{formatter=new Intl.DateTimeFormat('en-US',options);}catch(_){formatter=new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'});}
  const segments=[];let last;
  bars.forEach((bar,i)=>{const parts=Object.fromEntries(formatter.formatToParts(new Date(bar.t*1000)).map(p=>[p.type,p.value])),date=parts.year+'-'+parts.month+'-'+parts.day;
   if(!last||last.date!==date){last={from:i,to:i+1,date,weekday:parts.weekday,boundary:i>0};segments.push(last);}else last.to=i+1;
  });return segments;
 }
 return {definitions,ids,get,unavailable,calculate,daySegments};
});
