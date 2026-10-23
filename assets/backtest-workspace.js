/* Multi-market session facade. One balance, one UTC replay clock, up to five pairs. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./backtest-engine.js'):root.BacktestEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.BacktestWorkspace=api;})(typeof window==='object'?window:globalThis,function(B){
 'use strict';
 const multi=s=>s.kind==='portfolio',active=s=>multi(s)?s.markets.find(m=>m.symbol===s.activeSymbol):s;
 const unrealized=s=>multi(s)?s.markets.reduce((n,m)=>n+B.unrealized(m),0):B.unrealized(s);
 const balance=s=>s.startBalance+s.markets.reduce((n,m)=>n+m.balance-m.startBalance,0);
 const finished=s=>multi(s)?!s.markets.some(m=>m.cursor<m.candles.length-1&&m.candles[m.cursor+1].t<=s.endTime):s.cursor===s.candles.length-1;
 function decorate(s){
  for(const key of ['symbol','interval','candles','cursor','initialCursor','position','pending','multiplier','fxMode','fee','slippage','drawings','annotations','indicators','notice'])Object.defineProperty(s,key,{enumerable:true,configurable:true,get:()=>active(s)[key],set:v=>active(s)[key]=v});
  Object.defineProperty(s,'balance',{enumerable:true,get:()=>balance(s)});
  Object.defineProperty(s,'source',{enumerable:true,get:()=>active(s).source});
  Object.defineProperty(s,'trades',{enumerable:true,get:()=>s.markets.flatMap(m=>m.trades.map(t=>({...t,symbol:m.symbol}))).sort((a,b)=>a.exitTime-b.exitTime||a.symbol.localeCompare(b.symbol))});
  return s;
 }
 function createPortfolio(options,datasets){
  if(!Array.isArray(datasets)||datasets.length<2||datasets.length>5||new Set(datasets.map(m=>m.symbol)).size!==datasets.length)throw Error('Choose two to five distinct pairs.');
  const checked=datasets.map(m=>({...m,candles:B.validateBars(m.candles)})),windowStart=Math.max(...checked.map(m=>m.candles[0].t)),windowEnd=Math.min(...checked.map(m=>m.candles.at(-1).t),options.endTime||Infinity);
  const markets=checked.map(m=>B.createSession({...options,...m,challenge:null,cursor:29},B.validateBars(m.candles.filter(b=>b.t>=windowStart&&b.t<=windowEnd))));
  const contextStart=Math.max(...markets.map(m=>m.candles[29].t)),start=options.startTime??contextStart;
  if(!Number.isInteger(start)||start<contextStart||start>=windowEnd)throw Error('Choose a start within the common history, with 30 earlier candles for every pair.');
  for(const m of markets){while(m.cursor<m.candles.length-1&&m.candles[m.cursor+1].t<=start)B.step(m);m.initialCursor=m.cursor;m.equity=[{t:start,value:m.startBalance}];}
  const s=decorate({kind:'portfolio',chartType:['candles','hollow','bars','line','area'].includes(options.chartType)?options.chartType:'candles',id:B.id(),name:String(options.name||markets.map(m=>m.symbol).join(' + ')).slice(0,80),description:String(options.description||'').slice(0,2000),startBalance:markets[0].startBalance,markets,activeSymbol:markets[0].symbol,initialTime:start,clock:start,endTime:windowEnd,actions:[],equity:[{t:start,value:markets[0].startBalance}],strategyId:String(options.strategyId||''),strategySnapshot:markets[0].strategySnapshot,challenge:B.cleanChallenge(options.challenge),notes:'',reviews:{},checklist:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  if(finished(s))throw Error('No shared history remains after the chosen start.');return s;
 }
 function challengeState(s){if(!multi(s))return B.challengeState(s);const state=B.challengeState(s,unrealized(s));if(state?.status==='passed'&&s.markets.some(m=>m.position||m.pending))state.status='active';return state;}
 function step(s){
  if(!multi(s))return B.step(s);if(finished(s))return false;
  const next=Math.min(...s.markets.filter(m=>m.cursor<m.candles.length-1&&m.candles[m.cursor+1].t<=s.endTime).map(m=>m.candles[m.cursor+1].t));
  for(const m of s.markets)if(m.cursor<m.candles.length-1&&m.candles[m.cursor+1].t===next)B.step(m);
  s.clock=next;s.equity.push({t:next,value:s.balance+unrealized(s)});if(s.balance+unrealized(s)<=0||s.challenge&&challengeState(s).status==='failed')for(const market of s.markets)if(market.pending){B.cancelOrder(market);market.notice='Pending order cancelled: shared account loss limit reached.';}s.updatedAt=new Date().toISOString();return true;
 }
 function placeOrder(s,order){
  if(!multi(s))return B.placeOrder(s,order);if(finished(s))throw Error('Replay finished.');
  const equity=s.balance+unrealized(s);if(equity<=0)throw Error('The shared simulated account has no positive equity.');
  if(s.challenge&&challengeState(s).status!=='active')throw Error('This practice challenge has finished.');
  B.placeOrder(active(s),order,equity);active(s).pending.submittedAt=s.clock;const event=active(s).actions.at(-1);s.actions.push({at:s.clock,market:s.activeSymbol,kind:'order',order:{...event.order}});
 }
 function requestClose(s){if(!multi(s))return B.requestClose(s);B.requestClose(active(s));s.actions.push({at:s.clock,market:s.activeSymbol,kind:'close'});}
 function cancelOrder(s){if(!multi(s))return B.cancelOrder(s);B.cancelOrder(active(s));s.actions.push({at:s.clock,market:s.activeSymbol,kind:'cancel'});}
 function metrics(s){if(!multi(s))return B.metrics(s);const u=unrealized(s),m=B.metrics({...s,balance:s.balance+u,position:null,challenge:null});return {...m,unrealized:u};}
 function snapshot(s){
  if(!multi(s))return B.snapshot(s);
  const keys=['kind','id','name','description','startBalance','activeSymbol','initialTime','clock','endTime','actions','strategyId','strategySnapshot','challenge','notes','reviews','checklist','viewTimeframe','chartType','createdAt','updatedAt'];
  return {...Object.fromEntries(keys.map(k=>[k,s[k]])),markets:s.markets.map(m=>Object.fromEntries(['symbol','interval','source','multiplier','fxMode','fee','slippage','candles','drawings','annotations','indicators'].map(k=>[k,m[k]])))};
 }
 function restore(raw){
  if(raw?.kind!=='portfolio')return B.restore(raw);
  if(!/^[\w-]{1,100}$/.test(raw.id)||!Number.isInteger(raw.clock)||!Array.isArray(raw.actions)||raw.actions.length>30000)throw Error('Invalid multi-pair session.');
  const s=createPortfolio({...raw,startTime:raw.initialTime},raw.markets);
  for(const event of raw.actions){if(!event||!Number.isInteger(event.at)||event.at<s.clock||event.at>raw.clock||!s.markets.some(m=>m.symbol===event.market))throw Error('Invalid multi-pair action.');while(s.clock<event.at){if(!step(s))throw Error('Action is outside shared history.');}if(s.clock!==event.at)throw Error('Action does not match a replay candle.');s.activeSymbol=event.market;if(event.kind==='order')placeOrder(s,event.order);else if(event.kind==='close')requestClose(s);else if(event.kind==='cancel')cancelOrder(s);else throw Error('Unknown multi-pair action.');}
  while(s.clock<raw.clock){if(!step(s))throw Error('Saved clock is outside shared history.');}if(s.clock!==raw.clock)throw Error('Invalid saved portfolio clock.');
  for(const m of s.markets){const saved=raw.markets.find(x=>x.symbol===m.symbol);m.annotations=B.cleanAnnotations(saved.annotations);m.drawings=Array.isArray(saved.drawings)?saved.drawings.filter(n=>Number.isFinite(n)&&n>0).slice(0,30):[];m.indicators=Array.isArray(saved.indicators)?saved.indicators.filter(x=>['SMA20','EMA20','EMA50','EMA200','BB20','RSI14','ATR14','HIGHLOW52','AC','AD','ALMA9','AROON14','ADX14','AVGPRICE','AO','BOP','BBP20','DAYBREAK','WEEKDAYS'].includes(x)).slice(0,20):[];}
  if(!s.markets.some(m=>m.symbol===raw.activeSymbol))throw Error('Invalid active pair.');s.viewTimeframe=typeof raw.viewTimeframe==='string'?raw.viewTimeframe.slice(0,12):undefined;s.activeSymbol=raw.activeSymbol;s.id=raw.id;s.notes=String(raw.notes||'').slice(0,10000);s.createdAt=String(raw.createdAt||s.createdAt);s.updatedAt=String(raw.updatedAt||s.updatedAt);
  s.checklist=Array.isArray(raw.checklist)?raw.checklist.filter(x=>Number.isInteger(x)&&x>=0&&x<20).slice(0,20):[];const valid=new Set(s.trades.map(B.tradeKey));if(raw.reviews&&typeof raw.reviews==='object')for(const [key,v] of Object.entries(raw.reviews).slice(0,10000))if(valid.has(key)&&v&&typeof v==='object')s.reviews[key]={notes:String(v.notes||'').slice(0,4000),emotion:['confident','calm','neutral','anxious','frustrated'].includes(v.emotion)?v.emotion:'neutral'};
  return s;
 }
 function selectMarket(s,symbol){if(!multi(s)||!s.markets.some(m=>m.symbol===symbol))throw Error('Pair is not in this session.');s.activeSymbol=symbol;return active(s);}
 return {...B,createPortfolio,selectMarket,activeMarket:active,marketData:(s,symbol)=>multi(s)?s.markets.find(m=>m.symbol===symbol):s,finished,step,placeOrder,requestClose,cancelOrder,metrics,snapshot,restore,unrealized,challengeState};
});
