/* Pure study and analytics calculations. Input is always revealed history. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BacktestLab=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const day=t=>new Date(t*1000).toISOString().slice(0,10),sum=rows=>rows.reduce((n,t)=>n+t.pnl,0),average=rows=>rows.length?sum(rows)/rows.length:null;
 function study(bars,type,period=20){
  const result=[];let ema=null,gain=0,loss=0,atr=0;
  for(let i=0;i<bars.length;i++){
   const b=bars[i];let value;
   if(type==='SMA'||type.startsWith('BB')){if(i<period-1)continue;const values=bars.slice(i-period+1,i+1).map(b=>b.c),mean=values.reduce((a,b)=>a+b,0)/period;value=mean;if(type.startsWith('BB'))value=mean+(type==='BBLOW'?-2:2)*Math.sqrt(values.reduce((n,v)=>n+(v-mean)**2,0)/period);}
   else if(type==='EMA'){if(i<period-1)continue;if(ema==null)ema=bars.slice(0,period).reduce((n,b)=>n+b.c,0)/period;else ema+=(b.c-ema)*2/(period+1);value=ema;}
   else if(type==='RSI'){if(!i)continue;const change=b.c-bars[i-1].c,g=Math.max(0,change),l=Math.max(0,-change);if(i<=period){gain+=g;loss+=l;if(i<period)continue;gain/=period;loss/=period;}else{gain=(gain*(period-1)+g)/period;loss=(loss*(period-1)+l)/period;}value=loss===0?(gain===0?50:100):100-100/(1+gain/loss);}
   else if(type==='ATR'){if(!i)continue;const tr=Math.max(b.h-b.l,Math.abs(b.h-bars[i-1].c),Math.abs(b.l-bars[i-1].c));if(i<=period){atr+=tr;if(i<period)continue;atr/=period;}else atr=(atr*(period-1)+tr)/period;value=atr;}
   if(Number.isFinite(value))result.push({time:b.t,value});
  }
  return result;
 }
 function riskSize({balance,riskPct,entry,stop,multiplier,fee=0,slippage=0}){
  if(![balance,riskPct,entry,stop,multiplier,fee,slippage].every(Number.isFinite)||balance<=0||riskPct<=0||riskPct>100||entry<=0||stop<=0||entry===stop||multiplier<=0||fee<0||slippage<0)throw Error('Enter positive balance, risk, entry, stop and cash multiplier.');
  const cash=balance*riskPct/100,perUnit=Math.abs(entry-stop)*multiplier+2*fee+2*slippage*multiplier;
  return {cash,quantity:Math.min(1e9,Math.floor(cash/perUnit*1e6)/1e6),perUnit};
 }
 function analytics(sessions){
  const trades=sessions.flatMap(s=>s.trades.map(t=>({...t,symbol:t.symbol||s.symbol,sessionId:s.id,sessionName:s.name,startBalance:s.startBalance}))).sort((a,b)=>a.exitTime-b.exitTime||a.entryTime-b.entryTime);
  const wins=trades.filter(t=>t.pnl>0),losses=trades.filter(t=>t.pnl<0),breakeven=trades.filter(t=>t.pnl===0),daily=new Map(),monthly=new Map(),weekly=new Map();
  const weekdays=Array.from({length:7},(_,i)=>({name:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],trades:[],pnl:0}));
  const buckets=[{name:'Asia',hours:'00:00–07:00 UTC',trades:[]},{name:'London',hours:'07:00–13:00 UTC',trades:[]},{name:'New York',hours:'13:00–21:00 UTC',trades:[]},{name:'Outside sessions',hours:'21:00–00:00 UTC',trades:[]}],pairs=new Map();
  let winStreak=0,lossStreak=0,maxWins=0,maxLosses=0,cumulative=0;
  for(const t of trades){
   const d=day(t.exitTime),dt=new Date(t.exitTime*1000);if(!daily.has(d))daily.set(d,[]);daily.get(d).push(t);
   const month=d.slice(0,7);if(!monthly.has(month))monthly.set(month,[]);monthly.get(month).push(t);
   const monday=new Date(d+'T00:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);const wk=monday.toISOString().slice(0,10);if(!weekly.has(wk))weekly.set(wk,[]);weekly.get(wk).push(t);
   weekdays[dt.getUTCDay()].trades.push(t);weekdays[dt.getUTCDay()].pnl+=t.pnl;
   const hour=new Date(t.entryTime*1000).getUTCHours();buckets[hour<7?0:hour<13?1:hour<21?2:3].trades.push(t);
   if(!pairs.has(t.symbol))pairs.set(t.symbol,[]);pairs.get(t.symbol).push(t);
   winStreak=t.pnl>0?winStreak+1:0;lossStreak=t.pnl<0?lossStreak+1:0;maxWins=Math.max(maxWins,winStreak);maxLosses=Math.max(maxLosses,lossStreak);
  }
  const days=[...daily].sort(([a],[b])=>a.localeCompare(b)).map(([date,rows])=>{cumulative+=sum(rows);return {date,pnl:sum(rows),trades:rows,cumulative};});
  const periods=map=>[...map].map(([date,rows])=>({date,pnl:sum(rows),trades:rows}));
  const extremes=rows=>rows.length?{best:rows.reduce((a,b)=>a.pnl>=b.pnl?a:b),worst:rows.reduce((a,b)=>a.pnl<=b.pnl?a:b)}:{best:null,worst:null};
  const months=periods(monthly),weeks=periods(weekly);
  let dayWin=0,dayLoss=0,maxDayWins=0,maxDayLosses=0;for(const d of days){dayWin=d.pnl>0?dayWin+1:0;dayLoss=d.pnl<0?dayLoss+1:0;maxDayWins=Math.max(maxDayWins,dayWin);maxDayLosses=Math.max(maxDayLosses,dayLoss);}
  const grossWin=sum(wins),grossLoss=-sum(losses);
  return {trades,wins,losses,breakeven,days,months,weeks,weekdays,buckets,pairs:[...pairs].map(([symbol,trades])=>({symbol,trades,pnl:sum(trades)})),net:sum(trades),fees:trades.reduce((n,t)=>n+t.fees,0),grossWin,grossLoss,profitFactor:grossLoss?grossWin/grossLoss:grossWin?Infinity:null,winRate:trades.length?wins.length/trades.length*100:null,expectancy:average(trades),avgWin:average(wins),avgLoss:average(losses),avgDay:days.length?sum(trades)/days.length:null,maxWins,maxLosses,maxDayWins,maxDayLosses,profitableDays:days.filter(d=>d.pnl>0).length,dayExtremes:extremes(days),monthExtremes:extremes(months),weekExtremes:extremes(weeks),largestWin:wins.length?wins.reduce((n,t)=>Math.max(n,t.pnl),-Infinity):null,largestLoss:losses.length?losses.reduce((n,t)=>Math.min(n,t.pnl),Infinity):null,averageDuration:trades.length?trades.reduce((n,t)=>n+t.exitTime-t.entryTime,0)/trades.length:null};
 }
 function scopeSessions(sessions,scope='all'){if(scope==='all')return sessions.slice();if(scope.startsWith('strategy:')){const id=scope.slice(9);return id?sessions.filter(s=>s.strategyId===id):[];}return sessions.filter(s=>s.id===scope);}
 function strategyMetrics(sessions,id){const selected=scopeSessions(sessions,'strategy:'+id),a=analytics(selected);return {sessions:selected.length,trades:a.trades.length,winRate:a.winRate,net:a.net,replayedSeconds:selected.reduce((n,s)=>n+Math.max(0,s.kind==='portfolio'?s.clock-s.initialTime:s.candles[s.cursor].t-s.candles[s.initialCursor].t),0)};}
 return {study,riskSize,analytics,scopeSessions,strategyMetrics};
});
