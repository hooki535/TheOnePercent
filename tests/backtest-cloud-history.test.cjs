const test=require('node:test'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib'),{createHash}=require('node:crypto');
const {History,unpack,validateMeta}=require('../assets/backtest-cloud-history.js');
function fixture(month,count=744){
 const first=Date.parse(month+'-01T00:00:00Z')/1000,rows=Array.from({length:count},(_,i)=>[first+i*3600,'1.10000','1.20000','1.00000','1.15000']);
 const bytes=gzipSync(JSON.stringify({schema:1,provider:'histdata',symbol:'EURUSD',timeframe:'H1',timezone:'UTC',price_side:'bid',columns:['time','open','high','low','close'],candles:rows}));
 const sha256=createHash('sha256').update(bytes).digest('hex');
 return {blob:new Blob([bytes]),meta:{provider:'histdata',symbol:'EURUSD',timeframe:'H1',month:month+'-01',sha256,object_path:`histdata/EURUSD/H1/${month}/${sha256}.json.gz`,candle_count:count,first_utc:new Date(first*1000).toISOString(),last_utc:new Date(rows.at(-1)[0]*1000).toISOString(),bytes:bytes.length},rows};
}
function client(fixtures){const downloads=[],calls=[];return {downloads,calls,async rpc(name,args){calls.push({name,args});if(name==='history_catalog'){const groups=new Map();for(const f of fixtures){const r=f.meta,key=[r.provider,r.symbol,r.timeframe].join(':');let group=groups.get(key);if(!group){group={provider:r.provider,symbol:r.symbol,timeframe:r.timeframe,first_utc:r.first_utc,last_utc:r.last_utc,candle_count:0};groups.set(key,group);}group.first_utc=group.first_utc<r.first_utc?group.first_utc:r.first_utc;group.last_utc=group.last_utc>r.last_utc?group.last_utc:r.last_utc;group.candle_count+=r.candle_count;}return {data:[...groups.values()],error:null};}if(name==='history_months')return {data:fixtures.map(f=>f.meta).filter(r=>r.provider===args.source_provider&&r.symbol===args.source_symbol&&r.timeframe===args.source_timeframe),error:null};assert.equal(name,'history_read_payload');downloads.push(args.object_key);const f=fixtures.find(f=>f.meta.object_path===args.object_key);return {data:f?Buffer.from(await f.blob.arrayBuffer()).toString('base64'):null,error:null};}};}
test('verified chunks provide earlier context and bounded forward candles',async()=>{
 const jan=fixture('2025-01'),feb=fixture('2025-02',672),c=client([jan,feb]),h=new History(c),catalog=await h.catalog();assert.equal(catalog.length,1);
 const result=await h.load(catalog[0].id,{start:'2025-02-01T00:00',limit:120});assert.equal(result.candles.length,120);assert.equal(result.candles[100].t,feb.rows[0][0]);assert.equal(c.downloads.length,2);assert.equal(result.versions.length,2);assert.equal(result.interval,'1H');
});
test('default window uses latest candles and respects an older end date',async()=>{
 const jan=fixture('2025-01'),feb=fixture('2025-02',672),h=new History(client([jan,feb]));await h.catalog();
 const recent=await h.load('histdata:EURUSD:H1',{limit:120});assert.equal(recent.candles.at(-1).t,feb.rows.at(-1)[0]);
 const historical=await h.load('histdata:EURUSD:H1',{end:'2025-01-10T00:00',limit:120});assert.equal(historical.candles.at(-1).t,Date.parse('2025-01-10T00:00Z')/1000);
});
test('tampered bytes, metadata paths and instruments are rejected',async()=>{
 const f=fixture('2025-01');await assert.rejects(unpack(new Blob(['bad']),f.meta),/size/);
 await assert.rejects(unpack(f.blob,{...f.meta,sha256:'0'.repeat(64)}),/checksum/);
 await assert.rejects(unpack(f.blob,{...f.meta,symbol:'GBPUSD'}),/instrument/);
 assert.throws(()=>validateMeta({...f.meta,object_path:'../secret'}),/object/);
});
test('empty cloud history never substitutes a sample dataset',async()=>{
 const h=new History(client([]));assert.deepEqual(await h.catalog(),[]);await assert.rejects(h.load('histdata:EURUSD:H1'),/uploaded/);
 await assert.rejects(new History(null).catalog(),/Sign in/);
});

test('database RPC errors and missing private payloads do not substitute candles',async()=>{
 const f=fixture('2025-01'),c=client([f]),h=new History(c);await h.catalog();const rpc=c.rpc;c.rpc=async(name,args)=>name==='history_read_payload'?{data:null,error:{message:'denied'}}:rpc(name,args);await assert.rejects(h.load('histdata:EURUSD:H1'),/download/);
 await assert.rejects(new History({rpc:async()=>({error:{message:'offline'}})}).catalog(),/unavailable/);
});
test('immutable chunks are cached and timezone-qualified dates work',async()=>{
 const f=fixture('2025-01'),c=client([f]),h=new History(c);await h.catalog();await h.load('histdata:EURUSD:H1',{limit:120});await h.load('histdata:EURUSD:H1',{limit:120,end:'2025-01-10T00:00:00+00:00'});assert.equal(c.downloads.length,1);assert.equal(c.calls.filter(x=>x.name==='history_catalog').length,1);
});
