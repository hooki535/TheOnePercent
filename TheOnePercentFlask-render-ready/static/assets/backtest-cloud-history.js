/* Read-only Supabase history. RLS decides which sources/chunks are available. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./backtest-engine.js'):root.BacktestEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.BacktestCloudHistory=api;})(typeof window==='object'?window:globalThis,function(E){
 'use strict';
 const FRAMES={M1:'1m',H1:'1H',D1:'1D'},MAX_BYTES=50000000,MAX_JSON=16000000;
 function utc(value){if(!value)return null;const n=Date.parse(/(Z|[+-]\d\d:\d\d)$/.test(value)?value:value+'Z')/1000;if(!Number.isFinite(n))throw Error('Choose a valid UTC date.');return n;}
 function validateMeta(r){
  if(!/^[a-z0-9_-]+$/.test(r.provider)||!/^[A-Z0-9]{3,20}$/.test(r.symbol)||!FRAMES[r.timeframe]||!/^\d{4}-\d{2}-01$/.test(r.month)||!/[0-9a-f]{64}$/.test(r.sha256)||r.sha256.length!==64)throw Error('Invalid cloud history metadata.');
  if(r.object_path!==`${r.provider}/${r.symbol}/${r.timeframe}/${r.month.slice(0,7)}/${r.sha256}.json.gz`||!Number.isInteger(r.bytes)||r.bytes<1||r.bytes>MAX_BYTES||!Number.isInteger(r.candle_count)||r.candle_count<1||r.candle_count>50000)throw Error('Invalid cloud history object.');
  if(!Number.isFinite(Date.parse(r.first_utc))||!Number.isFinite(Date.parse(r.last_utc))||Date.parse(r.last_utc)<Date.parse(r.first_utc))throw Error('Invalid cloud history dates.');
  return r;
 }
 async function unpack(blob,meta){
  if(blob.size!==meta.bytes)throw Error('Cloud file size does not match its catalog.');
  const raw=await blob.arrayBuffer(),hash=[...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',raw))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==meta.sha256)throw Error('Cloud history checksum failed.');
  if(typeof DecompressionStream==='undefined')throw Error('This browser cannot read compressed history. Use a current browser.');
  const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_JSON)throw Error('Cloud history expands beyond the safe size limit.');parts.push(value);}}finally{await reader.cancel();}
  const data=JSON.parse(await new Blob(parts).text());
  if(data.schema!==1||data.provider!==meta.provider||data.symbol!==meta.symbol||data.timeframe!==meta.timeframe||data.timezone!=='UTC'||data.price_side!=='bid'||!Array.isArray(data.candles)||data.candles.length!==meta.candle_count||JSON.stringify(data.columns)!=='["time","open","high","low","close"]')throw Error('Unexpected cloud history format or instrument.');
  let previous=-1;const rows=data.candles.map(row=>{if(!Array.isArray(row)||row.length!==5||!Number.isInteger(row[0])||row[0]<=previous)throw Error('Cloud candles are not ordered.');previous=row[0];return {t:row[0],o:Number(row[1]),h:Number(row[2]),l:Number(row[3]),c:Number(row[4])};});
  const bars=E.validateBars(rows,1);
  if(bars[0].t!==Date.parse(meta.first_utc)/1000||bars.at(-1).t!==Date.parse(meta.last_utc)/1000)throw Error('Cloud candle dates do not match their catalog.');
  return bars;
 }
 class History {
  constructor(client){this.client=client;this.archives=[];this.cache=new Map();}
  async catalog(){
   if(!this.client?.rpc)throw Error('Sign in to access cloud history.');
   const {data,error}=await this.client.rpc('history_catalog');
   if(error)throw Error('Cloud history is unavailable. Your saved sessions are unchanged.');
   if(!Array.isArray(data)||data.length>1000)throw Error('Invalid cloud catalog.');
   this.archives=data.map(r=>{if(!/^[a-z0-9_-]+$/.test(r.provider)||!/^[A-Z0-9]{3,20}$/.test(r.symbol)||!FRAMES[r.timeframe]||!Number.isFinite(Date.parse(r.first_utc))||!Number.isFinite(Date.parse(r.last_utc))||Date.parse(r.first_utc)>Date.parse(r.last_utc)||!Number.isInteger(r.candle_count)||r.candle_count<1)throw Error('Invalid cloud catalog.');return {id:[r.provider,r.symbol,r.timeframe].join(':'),provider:r.provider,symbol:r.symbol,timeframe:r.timeframe,interval:FRAMES[r.timeframe],first:r.first_utc,last:r.last_utc,candleCount:r.candle_count};});
   return this.archives.slice().sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.interval.localeCompare(b.interval));
  }
  async chunk(meta){
   if(this.cache.has(meta.object_path))return this.cache.get(meta.object_path);
   const {data,error}=await this.client.rpc('history_read_payload',{object_key:meta.object_path});
   if(error||typeof data!=='string'||data.length>Math.ceil(MAX_BYTES/3)*4+1000000)throw Error('Could not download cloud history. Sign in and retry when connected.');
   const base64=data.replace(/\s/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)||base64.length!==Math.ceil(meta.bytes/3)*4)throw Error('Invalid cloud history payload.');
   const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const bars=await unpack(new Blob([bytes]),meta);
   if(this.cache.size>=16)this.cache.delete(this.cache.keys().next().value);this.cache.set(meta.object_path,bars);return bars;
  }
  async load(id,{start='',end='',limit=5000}={}){
   if(!Number.isInteger(limit)||limit<60||limit>10000)throw Error('Choose 60–10,000 candles.');
   const begin=utc(start),finish=utc(end);if(begin!==null&&finish!==null&&begin>=finish)throw Error('Start date must precede end date.');
   const archive=this.archives.find(x=>x.id===id);if(!archive)throw Error('Choose an uploaded cloud archive.');
   const {data,error}=await this.client.rpc('history_months',{source_provider:archive.provider,source_symbol:archive.symbol,source_timeframe:archive.timeframe});
   if(error||!Array.isArray(data))throw Error('Could not read cloud history dates. Retry when connected.');
   const parts=data.map(validateMeta).filter(r=>{if([r.provider,r.symbol,r.timeframe].join(':')!==id)throw Error('Unexpected cloud history instrument.');return finish===null||Date.parse(r.first_utc)/1000<=finish;}).sort((a,b)=>a.month.localeCompare(b.month));
   if(!parts.length)throw Error('Choose an uploaded cloud archive.');
   if(begin!==null&&(begin<Date.parse(parts[0].first_utc)/1000||begin>Date.parse(parts.at(-1).last_utc)/1000))throw Error('Choose a start date within the displayed cloud coverage.');
   let from=0;if(begin!==null){from=parts.findIndex(r=>Date.parse(r.last_utc)/1000>=begin);let count=0;while(from>0&&count<100)count+=parts[--from].candle_count;}else{let count=0;from=parts.length;while(from>0&&count<limit)count+=parts[--from].candle_count;}
   let before=[],after=[],previous=-1;const used=[];
   for(const meta of parts.slice(from)){
    if(finish!==null&&Date.parse(meta.first_utc)/1000>finish)break;
    const bars=await this.chunk(meta);used.push({path:meta.object_path,sha256:meta.sha256});
    for(const bar of bars){if(bar.t<=previous)throw Error('Cloud archives contain overlapping candles.');previous=bar.t;if(finish!==null&&bar.t>finish)continue;if(begin!==null&&bar.t<begin){before.push(bar);if(before.length>100)before.shift();}else if(begin===null||after.length<limit)after.push(bar);}
    if(begin!==null&&after.length>=limit-before.length)break;
   }
   const candles=begin===null?after.slice(-limit):[...before,...after].slice(0,limit);
   if(candles.length<60)throw Error('At least 60 candles are needed inside the selected cloud range.');
   return {candles:E.validateBars(candles),symbol:parts[0].symbol,interval:FRAMES[parts[0].timeframe],source:'Cloud archive · '+parts[0].provider+' · BID · UTC',versions:used};
  }
 }
 return {History,unpack,validateMeta};
});
