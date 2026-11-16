const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {gzipSync}=require('node:zlib');
const factory=require('../assets/charts-history.js');
const fs=require('node:fs'),vm=require('node:vm');
const rows=Array.from({length:180},(_,i)=>[Date.UTC(2026,10,2,0,i)/1000,'100','103','98',String(100+i%3)]);
function fixture(){
 const body={schema:1,provider:'histdata',symbol:'GBPJPY',timeframe:'M1',timezone:'UTC',candles:rows};
 const raw=gzipSync(JSON.stringify(body));
 return {encoded:raw.toString('base64'),meta:{provider:body.provider,symbol:body.symbol,timeframe:body.timeframe,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),candle_count:rows.length,first_utc:new Date(rows[0][0]*1000).toISOString(),last_utc:new Date(rows.at(-1)[0]*1000).toISOString(),month:'2026-11-01',object_path:'histdata/GBPJPY/M1/2026-11/test.json.gz'}};
}
function setup(overrides={},user={id:"test-account"}){
 const f=fixture(),calls=[];
 const data={history_catalog:[{provider:'histdata',symbol:'GBPJPY',timeframe:'M1',last_utc:f.meta.last_utc}],history_months:[f.meta],history_read_payload:f.encoded,...overrides};
 const reader=factory({ready:Promise.resolve(user),client:{rpc:async(name,args)=>{calls.push({name,args});return {data:data[name],error:null};}}});return {reader,calls,f};
}
test('private database candles retain verified OHLC and aggregate without invented prices or volume',async()=>{
 const {reader,calls}=setup();const {bars,info}=await reader.load('GBPJPY','15m');
 assert.equal(bars.length,11);assert.equal(bars[0].o,100);assert.equal(bars[0].h,103);assert.equal(bars[0].l,98);assert.ok(bars.every(b=>b.v===0));assert.equal(info.volumeAvailable,false);
 assert.deepEqual(calls.map(x=>x.name),['history_catalog','history_months','history_read_payload']);
 assert.equal(reader.status('GBPJPY','15m').state,'ready');
 await reader.load('GBPJPY','5m');assert.equal(calls.length,3,'validated chunk reused');
});
test('checksum and metadata mismatches are rejected before candles reach the chart',async()=>{
 const {reader,f}=setup();await assert.rejects(reader.decode({...f.meta,sha256:'0'.repeat(64)},f.encoded),/checksum/);
 await assert.rejects(reader.decode({...f.meta,symbol:'EURUSD'},f.encoded),/identity/);
 await assert.rejects(reader.decode({...f.meta,bytes:1},f.encoded),/size/);
 await assert.rejects(reader.decode({...f.meta,last_utc:'2026-11-03T00:00:00Z'},f.encoded),/coverage/);
});
test('guests load published candles through the same read-only RPCs without sign-in',async()=>{
 const {reader,calls}=setup({},null);const {bars}=await reader.load('GBPJPY','5m');
 assert.ok(bars.length>0);assert.deepEqual(calls.map(x=>x.name),['history_catalog','history_months','history_read_payload']);
});
test('unpublished or failed market reads do not substitute private or sample candles',async()=>{
 const {reader}=setup({history_catalog:[]},null);await assert.rejects(reader.load('GBPJPY','1H'),/No published market history/);
 const denied=setup({history_read_payload:null},null);await assert.rejects(denied.reader.load('GBPJPY','5m'),/not available/);
});
test('hourly archives cannot be split into artificial minute candles',async()=>{
 const {reader,calls}=setup({history_catalog:[{provider:'histdata',symbol:'GBPJPY',timeframe:'H1',last_utc:'2026-11-06'}]});
 await assert.rejects(reader.load('GBPJPY','15m'),/No stored candles/);assert.equal(calls.length,1);
 assert.throws(()=>reader.intervalSpec('5s'),/no second candles/);
});
test('weekly and monthly buckets follow UTC calendar boundaries',()=>{
 const {reader}=setup();const bar=t=>({t:Date.parse(t),o:1,h:3,l:1,c:2,v:0});
 assert.equal(new Date(reader.aggregate([bar('2026-11-08T22:00Z')],'1W')[0].t).toISOString(),'2026-11-02T00:00:00.000Z');
 assert.equal(new Date(reader.aggregate([bar('2026-11-15T00:00Z')],'1M')[0].t).toISOString(),'2026-11-01T00:00:00.000Z');
});
test('archive Charts mode makes no external provider calls and ignores stored demo preference',async()=>{
 let resolveLoad;const pending=new Promise(resolve=>resolveLoad=resolve),network=[];
 const win={THEONEPERCENT_CHART_ARCHIVE:true,ChartHistory:{catalog:async()=>[],load:()=>pending,status:()=>({message:'Database history'})},THEONEPERCENT_MARKET_API:'https://example.test',Store:{settings:{get:()=>({chartsDataMode:'demo'})}},Instruments:{find:()=>({symbol:'GBPJPY',name:'GBPJPY',market:'Forex',base:'GBP',quote:'JPY',price:190,dp:3,pip:0.001,contract:100000,unitValue:1}),INSTRUMENTS:[]},fetch:(...args)=>{network.push(args);throw Error('External call');}};
 const ctx={window:win,Store:win.Store,Date,location:{protocol:'https:'},setInterval:()=>1,clearInterval(){},console,fetch:win.fetch,Event};
 vm.runInNewContext(fs.readFileSync('assets/feed.js','utf8'),ctx);
 assert.equal(win.Feed.isDemoMode(),false);assert.equal(win.Feed.history('GBPJPY','1H').length,0);
 resolveLoad({bars:[{t:1,o:190,h:192,l:189,c:191,v:0}],info:{source:'histdata',lastLabel:'2026-11-06 21:00 UTC'}});
 await new Promise(setImmediate);assert.equal(win.Feed.history('GBPJPY','1H')[0].c,191);assert.equal(win.Feed.isHistorical('GBPJPY','1H'),true);assert.match(win.Feed.badge({symbol:'GBPJPY',interval:'1H'}),/Database.*last candle/);assert.equal(network.length,0);
});
