const test=require('node:test'),assert=require('node:assert/strict'),I=require('../assets/backtest-import.js'),E=require('../assets/backtest-engine.js');
const start=Date.UTC(2019,0,1)/1000;
const csv=(count=30000,reverse=false)=>{const rows=Array.from({length:count},(_,i)=>[start+i*3600,1,1.2,.9,1.1].join(','));if(reverse)rows.reverse();return 'Date,Open,High,Low,Close\r\n'+rows.join('\r\n');};
test('large files load the selected older date with context in either chronological direction',async()=>{
 const text=csv(40000);assert.ok(text.length>1000000);const selected=new Date((start+30000*3600)*1000).toISOString().slice(0,16);
 const a=await I.read(new Blob([text]),{start:selected}),b=await I.read(new Blob([csv(40000,true)]),{start:selected});
 assert.deepEqual(a,b);assert.equal(a.total,40000);assert.equal(a.candles.length,5000);assert.equal(a.cursor,99);assert.equal(a.candles[100].t,start+30000*3600);assert.equal(a.interval,'1H');assert.equal(a.first,start);assert.equal(a.last,start+39999*3600);assert.equal(a.truncated,true);
 const s=E.createSession({symbol:'EURUSD',startBalance:10000,multiplier:1,cursor:a.cursor},a.candles);assert.equal(s.candles[s.cursor].t,start+29999*3600);assert.equal(E.restore(E.snapshot(s)).cursor,s.cursor);
});
test('quoted records and UTF-8 characters spanning file chunks parse correctly',async()=>{
 const rows=['\ufeff"Date","Open","High","Low","Close","note"',...Array.from({length:1200},(_,i)=>`${start+i*60},1,2,.5,1,"${'€'.repeat(35)}, quote ""x""\nmore"`)];
 const result=await I.read(new Blob([rows.join('\n')]));assert.equal(result.total,1200);assert.equal(result.interval,'1m');assert.equal(result.candles.length,1200);
});
test('invalid data anywhere in a long file is rejected, even beyond the selected window',async()=>{
 const text=csv(12000).replace(`${start+11000*3600},1,1.2,0.9,1.1`,`${start+11000*3600},1,0.2,0.9,1.1`);
 await assert.rejects(()=>I.read(new Blob([text])),/Invalid/);
 await assert.rejects(()=>I.read(new Blob([csv()+`\r\n${start},1,2,.5,1`])),/ordered|duplicate/);
 await assert.rejects(()=>I.read(new Blob([csv(100)]),{start:'2022-01-01T00:00'}),/start date|candles/);
 await assert.rejects(()=>I.read(new Blob([csv(100)]),{start:'2022-01-01T00:00',end:'2021-01-01T00:00'}),/precede/);
});
test('end dates, cancellation and input bounds are respected without a provider',async()=>{
 const end=new Date((start+99*3600)*1000).toISOString().slice(0,16),result=await I.read(new Blob([csv(1000)]),{end});assert.equal(result.candles.length,100);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>I.read(new Blob([csv(100)]),{signal:controller.signal}),/cancelled/);
 await assert.rejects(()=>I.read({size:I.MAX_BYTES+1,slice(){throw Error('must not read');}}),/250 MB/);
});
test('HistData ASCII M1 uses fixed EST in both winter and summer, with no daylight adjustment',async()=>{
 for(const month of ['01','07']){const rows=Array.from({length:120},(_,i)=>`2022${month}03 ${String(Math.floor(i/60)).padStart(2,'0')}${String(i%60).padStart(2,'0')}00;1;1.2;0.9;1.1;0`);const result=await I.read(new Blob([rows.join('\n')]),{format:'histdata'});assert.equal(new Date(result.first*1000).toISOString(),`2022-${month}-03T05:00:00.000Z`);assert.equal(result.interval,'1m');}
 await assert.rejects(()=>I.read(new Blob(['20220103 000000;1;2;0.5;1']),{format:'histdata'}),/six/);
});
