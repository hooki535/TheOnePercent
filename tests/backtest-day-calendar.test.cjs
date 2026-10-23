const test=require('node:test'),assert=require('node:assert/strict'),S=require('../assets/backtest-studies.js'),E=require('../assets/backtest-engine.js'),W=require('../assets/backtest-workspace.js');
const stamp=s=>Date.parse(s)/1000,rows=dates=>dates.map(t=>({t:stamp(t)}));
test('day boundaries and weekday labels follow the selected timezone',()=>{
 const bars=rows(['2026-10-04T23:00:00Z','2026-10-05T00:00:00Z','2026-10-05T01:00:00Z','2026-10-06T00:00:00Z']);
 assert.deepEqual(S.daySegments(bars).map(s=>[s.date,s.weekday,s.from,s.to,s.boundary]),[['2026-10-04','Sunday',0,1,false],['2026-10-05','Monday',1,3,true],['2026-10-06','Tuesday',3,4,true]]);
 assert.deepEqual(S.daySegments(bars,'America/New_York').map(s=>s.date),['2026-10-04','2026-10-05']);
 assert.equal(S.daySegments(bars,'Africa/Kampala')[0].weekday,'Monday');assert.deepEqual(S.daySegments(bars,'invalid/zone'),S.daySegments(bars));
});
test('DST, missing weekends and revealed prefixes never invent day markers',()=>{
 assert.equal(S.daySegments(rows(['2026-11-01T05:00:00Z','2026-11-01T06:00:00Z']),'America/New_York').length,1);
 assert.equal(S.daySegments(rows(['2026-03-08T06:00:00Z','2026-03-08T07:00:00Z']),'America/New_York').length,1);
 const bars=rows(['2026-10-02T22:00:00Z','2026-10-05T00:00:00Z','2026-10-06T00:00:00Z']);assert.deepEqual(S.daySegments(bars).map(s=>s.weekday),['Friday','Monday','Tuesday']);assert.equal(S.daySegments(bars.slice(0,2)).at(-1).weekday,'Monday');assert.deepEqual(S.daySegments([]),[]);
});
test('new sessions enable the calendar while restore preserves each saved choice',()=>{
 const bars=Array.from({length:100},(_,i)=>({t:1700000100+i*3600,o:100,h:102,l:99,c:101})),options={symbol:'EURUSD',interval:'1H',startBalance:10000,multiplier:1};
 const s=E.createSession(options,bars);assert.deepEqual(s.indicators,['DAYBREAK','WEEKDAYS']);s.indicators=['WEEKDAYS'];assert.deepEqual(E.restore(E.snapshot(s)).indicators,['WEEKDAYS']);s.indicators=[];assert.deepEqual(E.restore(E.snapshot(s)).indicators,[]);
 const p=W.createPortfolio(options,[{symbol:'EURUSD',candles:bars},{symbol:'GBPUSD',candles:bars}]);p.markets[0].indicators=['DAYBREAK'];p.markets[1].indicators=['WEEKDAYS'];assert.deepEqual(W.restore(W.snapshot(p)).markets.map(m=>m.indicators),[['DAYBREAK'],['WEEKDAYS']]);
});
test('both new indicators are listed and all modified implementations match Flask',()=>{
 for(const id of ['DAYBREAK','WEEKDAYS'])assert.ok(S.get(id));const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');for(const file of ['backtest-studies.js','backtest-chart.js','backtest-engine.js','backtest-workspace.js','backtest-desk.js'])assert.ok(fs.readFileSync(path.join(root,'assets',file)).equals(fs.readFileSync(path.join(root,'TheOnePercentFlask-render-ready/static/assets',file))),file);
});
