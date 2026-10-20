const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('../assets/backtest-engine.js');
const bars=()=>Array.from({length:80},(_,i)=>({t:1700000000+i*3600,o:100,h:101,l:99,c:100}));
const session=(options={})=>E.createSession({symbol:'TEST',startBalance:1000,multiplier:1,fee:0,slippage:0,cursor:29,...options},bars());
test('broker symbol suffix casing survives session creation and restoration',()=>{
 const s=session({symbol:'GBPJPYm'});assert.equal(s.symbol,'GBPJPYm');assert.equal(E.restore(E.snapshot(s)).symbol,'GBPJPYm');
});
const order=(s,extra={})=>E.placeOrder(s,{side:'long',type:'market',quantity:1,stop:90,target:120,...extra});

test('market entries wait for the next opening price, never current or future close',()=>{
 const s=session();s.candles[30]={t:s.candles[30].t,o:105,h:113,l:103,c:112};
 order(s);assert.equal(s.position,null);assert.equal(s.cursor,29);E.step(s);assert.equal(s.position.entry,105);assert.equal(s.cursor,30);
});
test('fee and adverse slippage accounting reconciles entry, exit and balance',()=>{
 const s=session({fee:1,multiplier:10,slippage:.5});s.candles[30]={t:s.candles[30].t,o:102,h:104,l:101,c:103};
 order(s,{quantity:2});E.step(s);assert.equal(s.balance,998);assert.equal(s.position.entry,102.5);
 E.requestClose(s);s.candles[31]={t:s.candles[31].t,o:105,h:106,l:104,c:105};E.step(s);
 assert.equal(s.trades[0].exit,104.5);assert.equal(s.trades[0].pnl,36);assert.equal(s.trades[0].fees,4);assert.equal(s.balance,1036);
});
test('a stop gap fills at the adverse opening price',()=>{
 const s=session();order(s);E.step(s);s.candles[31]={t:s.candles[31].t,o:80,h:85,l:78,c:81};E.step(s);
 assert.equal(s.trades[0].exit,80);assert.equal(s.trades[0].pnl,-20);assert.equal(s.trades[0].reason,'Stop gap');
});
test('a candle touching both stop and target uses the stop first',()=>{
 const s=session();s.candles[30]={t:s.candles[30].t,o:100,h:115,l:85,c:103};order(s,{target:110});E.step(s);
 assert.equal(s.trades[0].pnl,-10);assert.match(s.trades[0].reason,/ambiguous/);
});
test('target limits do not receive adverse fills beyond their limit',()=>{
 const s=session({slippage:1});s.candles[30]={t:s.candles[30].t,o:100,h:111,l:99,c:110};order(s,{target:110});E.step(s);
 assert.equal(s.trades[0].entry,101);assert.equal(s.trades[0].exit,110);assert.equal(s.trades[0].pnl,9);
});
test('intrabar limit entries never receive an uncertain entry-bar target',()=>{
 const s=session();s.candles[30]={t:s.candles[30].t,o:100,h:110,l:97,c:105};order(s,{type:'limit',entry:98,stop:95,target:108});E.step(s);
 assert.equal(s.position.entry,98);assert.equal(s.trades.length,0);
});
test('intrabar entry and stop uncertainty remains conservative',()=>{
 const s=session();s.candles[30]={t:s.candles[30].t,o:100,h:110,l:90,c:105};order(s,{type:'limit',entry:98,stop:95,target:108});E.step(s);
 assert.equal(s.trades[0].exit,95);assert.match(s.trades[0].reason,/uncertainty/);
});
test('short stop entries and target exits use the correct direction',()=>{
 const s=session();s.candles[30]={t:s.candles[30].t,o:100,h:101,l:97,c:98};order(s,{side:'short',type:'stop',entry:98,stop:105,target:90});E.step(s);
 assert.equal(s.position.entry,98);s.candles[31]={t:s.candles[31].t,o:97,h:99,l:89,c:90};E.step(s);assert.equal(s.trades[0].pnl,8);
});
test('a bracket crossed by an entry gap is rejected rather than awarded a win',()=>{
 const s=session();order(s,{target:105});s.candles[30]={t:s.candles[30].t,o:110,h:112,l:108,c:111};E.step(s);
 assert.equal(s.position,null);assert.equal(s.pending,null);assert.equal(s.trades.length,0);assert.match(s.notice,/rejected/);
});
test('pending orders can be cancelled without a simulated fill',()=>{
 const s=session();order(s);E.cancelOrder(s);E.step(s);assert.equal(s.trades.length,0);assert.equal(s.position,null);
});
test('existing gap brackets have priority over a queued manual exit',()=>{
 const s=session();order(s,{target:110});E.step(s);E.requestClose(s);s.candles[31]={t:s.candles[31].t,o:115,h:118,l:114,c:117};E.step(s);
 assert.equal(s.trades[0].exit,110);assert.equal(s.trades[0].reason,'Target');
});
test('engine blocks overlapping positions, invalid brackets and nonfinite size',()=>{
 const s=session();assert.throws(()=>order(s,{quantity:Infinity}));assert.throws(()=>order(s,{stop:101}));order(s);assert.throws(()=>order(s));E.step(s);assert.throws(()=>order(s));
});
test('end of dataset does not invent a closing trade',()=>{
 const s=session();order(s);while(E.step(s)){}assert.ok(s.position);assert.equal(s.trades.length,0);assert.equal(E.step(s),false);assert.throws(()=>E.requestClose(s));
});
test('action-log restoration recomputes results and preserves replay position',()=>{
 const s=session({fee:.25});order(s);E.step(s);E.requestClose(s);E.step(s);s.notes='A hypothesis';s.drawings=[99,101];
 const raw=E.snapshot(s);raw.balance=999999;const restored=E.restore(JSON.parse(JSON.stringify(raw)));
 assert.equal(restored.balance,s.balance);assert.equal(restored.cursor,s.cursor);assert.equal(restored.trades[0].pnl,s.trades[0].pnl);assert.deepEqual(restored.equity,s.equity);assert.equal(restored.notes,s.notes);assert.deepEqual(restored.drawings,s.drawings);
});
test('invalid or future saved actions are rejected',()=>{
 const s=session();const raw=E.snapshot(s);raw.actions=[{cursor:50,kind:'close'}];assert.throws(()=>E.restore(raw));
});
test('net metrics and marked equity drawdown include entry fees',()=>{
 const s=session({fee:1});order(s);E.step(s);assert.equal(E.metrics(s).equity,999);assert.ok(Math.abs(E.metrics(s).drawdown-.1)<1e-8);E.requestClose(s);E.step(s);
 const m=E.metrics(s);assert.equal(m.realized,-2);assert.equal(m.profitFactor,0);assert.equal(m.winRate,0);assert.equal(m.expectancy,-2);
});
test('empty metrics do not imply a win rate or profit factor',()=>{
 const m=E.metrics(session());assert.equal(m.winRate,null);assert.equal(m.profitFactor,null);assert.equal(m.trades,0);
});
test('short CSV datasets still leave a meaningful replay window',()=>{
 const s=E.createSession({startBalance:1000,multiplier:1},bars().slice(0,60));assert.equal(s.cursor,29);assert.equal(s.candles.length-1-s.cursor,30);
});
test('quoted CSV fields, descending rows and timezone offsets normalize correctly',()=>{
 const text='Datetime,Open,High,Low,Close\r\n'+Array.from({length:60},(_,i)=>`"${new Date(1700000000000+i*3600000).toISOString()}",100,101,99,100`).reverse().join('\r\n');
 const parsed=E.parseCSV(text);assert.equal(parsed.length,60);assert.equal(parsed[0].t,1700000000);
 assert.throws(()=>E.parseCSV(text+'\n'+text.split('\n')[1]),/Invalid/);
});
test('invalid OHLC, timestamps and headers are rejected',()=>{
 const b=bars();b[5].h=90;assert.throws(()=>E.validateBars(b));assert.throws(()=>E.parseCSV('time,x,y\n1,2,3'));const invalid=bars();invalid[1].t=1e20;assert.throws(()=>E.validateBars(invalid));
});
test('every bundled archive is valid and uses actual stored OHLC rows',()=>{
 for(const name of ['EURUSD_1H','BTCUSD_1D','GBPUSD_1D']){const b=E.parseCSV(fs.readFileSync(__dirname+'/../assets/backtesting/data/'+name+'.csv','utf8'));assert.ok(b.length>=60);assert.ok(b.length<=2000);}
});

test('a session freezes its playbook rather than following later edits',()=>{
 const strategy={name:'Original',setup:'Fixed rule',entry:'Next bar',exit:'Bracket',risk:'Fixed size'};
 const s=session({strategySnapshot:strategy});strategy.name='Edited';assert.equal(s.strategySnapshot.name,'Original');
 const restored=E.restore(E.snapshot(s));assert.equal(restored.strategySnapshot.name,'Original');
});
test('CSV does not silently normalize impossible calendar dates',()=>{
 const rows='Date,Open,High,Low,Close\n'+Array.from({length:60},(_,i)=>`${i===0?'2026-02-30':new Date(1700000000000+i*86400000).toISOString()},100,101,99,100`).join('\n');
 assert.throws(()=>E.parseCSV(rows),/calendar/);
});
test('negative account equity cannot fund a fresh simulated position',()=>{
 const s=session();s.balance=-1;assert.throws(()=>order(s),/positive equity/);
});
