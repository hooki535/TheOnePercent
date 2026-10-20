const test=require('node:test'),assert=require('node:assert/strict'),E=require('../assets/backtest-workspace.js'),Lab=require('../assets/backtest-lab.js');
const candles=(count=100,interval=3600,offset=0)=>Array.from({length:count},(_,i)=>({t:1700000000+offset+i*interval,o:100,h:101,l:99,c:100}));
const options={name:'Portfolio fixture',startBalance:1000,multiplier:1,fee:0,slippage:0};
const market=(symbol,count=100,interval=3600,extra={})=>({symbol,interval:'1H',candles:candles(count,interval),source:'Synthetic test fixture',multiplier:1,fee:0,slippage:0,...extra});
const order={side:'long',type:'market',quantity:1,stop:50,target:200};
test('two pairs share exactly one balance and both fees reconcile',()=>{
 const s=E.createPortfolio(options,[market('A',100,3600,{fee:1}),market('B',100,3600,{fee:1})]);
 assert.equal(E.metrics(s).equity,1000);E.placeOrder(s,order);E.selectMarket(s,'B');E.placeOrder(s,order);E.step(s);assert.equal(E.metrics(s).equity,998);
 E.requestClose(s);E.selectMarket(s,'A');E.requestClose(s);E.step(s);assert.equal(s.trades.length,2);assert.equal(s.balance,996);assert.equal(E.metrics(s).realized,-4);
 const restored=E.restore(E.snapshot(s));assert.deepEqual(E.metrics(restored),E.metrics(s));assert.equal(restored.trades[0].symbol,'A');
});
test('UTC portfolio clock processes only the markets whose next bar is revealed',()=>{
 const s=E.createPortfolio(options,[market('HOURLY',200,3600),market('TWO-HOUR',100,7200)]);
 assert.equal(s.cursor,58);E.selectMarket(s,'TWO-HOUR');E.placeOrder(s,order);const start=s.clock;
 E.step(s);assert.equal(s.clock,start+3600);assert.equal(s.cursor,29);assert.ok(s.pending);assert.equal(s.position,null);
 E.step(s);assert.equal(s.clock,start+7200);assert.equal(s.cursor,30);assert.ok(s.position);
 const restored=E.restore(E.snapshot(s));assert.equal(restored.clock,s.clock);assert.equal(restored.position.entryTime,s.position.entryTime);
});
test('portfolio rejects duplicate pairs, missing overlap and over-five pair sessions',()=>{
 assert.throws(()=>E.createPortfolio(options,[market('A'),market('A')]));
 assert.throws(()=>E.createPortfolio(options,[market('A'),{...market('B'),candles:candles(100,3600,10000000)}]));
 assert.throws(()=>E.createPortfolio(options,Array.from({length:6},(_,i)=>market('M'+i))));
});
test('per-market drawings and indicators survive portfolio restoration',()=>{
 const s=E.createPortfolio(options,[market('A'),market('B')]);s.drawings=[100];s.annotations=[{id:'test-drawing',type:'trend',points:[{i:28,p:100},{i:30,p:101}],color:'#f8c344'}];s.indicators=['EMA20'];E.selectMarket(s,'B');assert.deepEqual(s.drawings,[]);
 const restored=E.restore(E.snapshot(s));E.selectMarket(restored,'A');assert.deepEqual(restored.drawings,[100]);assert.equal(restored.annotations[0].type,'trend');assert.deepEqual(restored.indicators,['EMA20']);
});
test('invalid portfolio history cannot add a future order or invent a balance',()=>{
 const s=E.createPortfolio(options,[market('A'),market('B')]),saved=E.snapshot(s);saved.balance=1000000;assert.equal(E.restore(saved).balance,1000);
 saved.actions=[{at:s.clock+3600,market:'A',kind:'order',order}];assert.throws(()=>E.restore(saved));
});
test('risk sizing includes configured costs and avoids rounding beyond the cash budget',()=>{
 const r=Lab.riskSize({balance:10000,riskPct:1,entry:1.1,stop:1.09,multiplier:1,fee:.00001,slippage:.00002});
 assert.equal(r.cash,100);assert.ok(r.quantity*r.perUnit<=100);assert.ok(r.quantity>9900&&r.quantity<10000);
 assert.throws(()=>Lab.riskSize({balance:10000,riskPct:1,entry:1,stop:1,multiplier:1}));
});
test('studies use only their supplied prefix and have correct seed/window behavior',()=>{
 const bars=candles(30).map((b,i)=>({...b,c:i+1}));assert.equal(Lab.study(bars,'SMA',20)[0].value,10.5);assert.equal(Lab.study(bars,'EMA',20)[0].value,10.5);
 assert.equal(Lab.study(bars,'RSI',14).at(-1).value,100);assert.equal(Lab.study(candles(30),'RSI',14).at(-1).value,50);assert.equal(Lab.study(candles(30),'ATR',14).at(-1).value,2);
 const short=Lab.study(bars.slice(0,21),'EMA',20),long=Lab.study(bars,'EMA',20);assert.deepEqual(short,long.slice(0,short.length));
});
test('analytics reconciles UTC dates, fees, outcomes and Monday calendar weeks',()=>{
 const t=(entry,exit,pnl)=>({side:'long',entryTime:Date.parse(entry)/1000,exitTime:Date.parse(exit)/1000,pnl,fees:2});
 const a=Lab.analytics([{id:'s',name:'Fixture',symbol:'EURUSD',startBalance:1000,trades:[t('2026-01-18T14:00Z','2026-01-18T15:00Z',100),t('2026-01-19T01:00Z','2026-01-19T02:00Z',-50),t('2026-01-19T07:00Z','2026-01-19T08:00Z',0)]}]);
 assert.equal(a.net,50);assert.equal(a.fees,6);assert.equal(a.days.length,2);assert.equal(a.days[1].cumulative,50);assert.ok(Math.abs(a.winRate-100/3)<1e-10);assert.equal(a.profitFactor,2);assert.equal(a.weeks[0].date,'2026-01-12');assert.equal(a.weeks[1].date,'2026-01-19');assert.equal(a.buckets[2].trades.length,1);assert.equal(a.breakeven.length,1);
 const empty=Lab.analytics([]);assert.equal(empty.winRate,null);assert.equal(empty.expectancy,null);assert.equal(empty.dayExtremes.best,null);
});
test('trade reviews and frozen strategy checklists survive old/new session backups',()=>{
 const s=E.createSession({...options,symbol:'TEST',cursor:29,strategySnapshot:{name:'Rules',color:'#4385ff',checklist:['Wait for close']}},candles());E.placeOrder(s,order);E.step(s);E.requestClose(s);E.step(s);
 const key=E.tradeKey(s.trades[0]);s.reviews[key]={notes:'Waited for the close.',emotion:'calm'};s.checklist=[0];const restored=E.restore(E.snapshot(s));assert.equal(restored.reviews[key].notes,'Waited for the close.');assert.equal(restored.strategySnapshot.checklist[0],'Wait for close');assert.deepEqual(restored.checklist,[0]);
 const legacy=E.snapshot(s);delete legacy.reviews;delete legacy.annotations;delete legacy.challenge;assert.equal(E.restore(legacy).trades.length,1);
});
test('challenge drawdown breaches remain failed and block new trades',()=>{
 const s=E.createSession({...options,symbol:'TEST',cursor:29,challenge:{name:'Practice',targetPct:10,dailyLossPct:3,maxLossPct:6,minDays:1,trailing:false}},candles());s.equity.push({t:s.candles[s.cursor].t+3600,value:960});s.equity.push({t:s.candles[s.cursor].t+7200,value:1000});assert.equal(E.challengeState(s).status,'failed');assert.throws(()=>E.placeOrder(s,order),/challenge has finished/);
});
test('challenge account losses use combined mark-to-market across pairs',()=>{
 const data=candles();data[30]={...data[30],c:99};const s=E.createPortfolio({...options,challenge:{name:'Shared',targetPct:10,dailyLossPct:3,maxLossPct:6,minDays:1,trailing:false}},[market('A',100,3600,{candles:data}),market('B',100,3600,{candles:data})]);
 E.placeOrder(s,{...order,quantity:20});E.selectMarket(s,'B');E.placeOrder(s,{...order,quantity:20});E.step(s);assert.equal(E.metrics(s).equity,960);assert.equal(E.challengeState(s).status,'failed');assert.equal(E.restore(E.snapshot(s)).equity.at(-1).value,960);
});
test('challenge failure cancels other pending pairs and remains reproducible',()=>{
 const data=candles();data[30]={...data[30],c:99};const s=E.createPortfolio({...options,challenge:{name:'Shared',targetPct:10,dailyLossPct:3,maxLossPct:6,minDays:1,trailing:false}},[market('A',100,3600,{candles:data}),market('B')]);
 E.placeOrder(s,{...order,quantity:40});E.selectMarket(s,'B');E.placeOrder(s,{side:'long',type:'stop',entry:150,stop:140,target:200,quantity:1});E.step(s);assert.equal(E.challengeState(s).status,'failed');assert.equal(s.pending,null);assert.equal(E.restore(E.snapshot(s)).pending,null);
});
test('a completed profit target requires a closed position and blocks a new challenge order',()=>{
 const data=candles();data[30]={...data[30],h:120,c:115};const s=E.createSession({...options,symbol:'TEST',cursor:29,challenge:{name:'Target',targetPct:1,dailyLossPct:3,maxLossPct:6,minDays:1,trailing:false}},data);
 E.placeOrder(s,{...order,quantity:2,stop:90,target:110});E.step(s);assert.equal(E.challengeState(s).status,'passed');assert.throws(()=>E.placeOrder(s,order));assert.equal(E.challengeState(E.restore(E.snapshot(s))).status,'passed');
});
