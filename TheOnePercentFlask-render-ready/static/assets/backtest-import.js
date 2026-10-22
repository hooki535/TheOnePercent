/* Bounded local CSV reading. File contents never leave the browser. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./backtest-engine.js'):root.BacktestEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.BacktestImport=api;})(typeof window==='object'?window:globalThis,function(E){
 'use strict';
 const MAX_BYTES=250000000,CHUNK=65536;
 function utc(value){if(!value)return null;const n=Date.parse(value+'Z')/1000;if(!Number.isFinite(n))throw Error('Choose a valid UTC date.');return n;}
 async function read(file,{start='',end='',format='standard',limit=5000,onProgress=()=>{},signal}={}){
  if(!file||typeof file.slice!=='function'||!Number.isFinite(file.size)||file.size>MAX_BYTES)throw Error('Choose a CSV file up to 250 MB.');
  if(!Number.isInteger(limit)||limit<60||limit>10000)throw Error('Choose 60–10,000 candles per window.');
  const begin=utc(start),finish=utc(end);if(begin!==null&&finish!==null&&begin>=finish)throw Error('Start date must precede end date.');
  const contextSize=begin===null?0:Math.min(100,Math.floor(limit/2));
  if(!['standard','histdata'].includes(format))throw Error('Choose a supported CSV format.');
  let header=format==='histdata'?['Date','Open','High','Low','Close']:null,batch=[],before=[],after=[],total=0,first=Infinity,last=-Infinity,previous=null,direction=0;
  let row=[],cell='',quoted=false,quotePending=false,rowSize=0;
  function consumeBatch(){
   if(!batch.length)return;
   const bars=E.parseCSVRecords([header,...batch],1);batch=[];
   const low=bars[0].t,high=bars.at(-1).t;
   if(previous){const d=low>previous.high?1:high<previous.low?-1:0;if(!d||(direction&&d!==direction))throw Error('CSV must be ordered oldest-first or newest-first, without duplicate timestamps.');direction=d;}
   previous={low,high};total+=bars.length;if(total>4000000)throw Error('CSV supports up to 4 million rows.');first=Math.min(first,low);last=Math.max(last,high);
   for(const b of bars){if(finish!==null&&b.t>finish)continue;if(begin!==null&&b.t<begin)before.push(b);else after.push(b);}
   before.sort((a,b)=>a.t-b.t);if(before.length>contextSize)before=before.slice(-contextSize||before.length);
   if(!contextSize)before=[];
   after.sort((a,b)=>a.t-b.t);if(after.length>limit-contextSize)after.length=limit-contextSize;
  }
  function emit(){row.push(cell);cell='';rowSize=0;if(row.some(v=>v.trim())){if(!header){header=row;header[0]=header[0].replace(/^\uFEFF/,'');}else{if(format==='histdata'){const m=row[0].replace(/^\uFEFF/,'').trim().match(/^(\d{4})(\d{2})(\d{2}) (\d{2})(\d{2})(\d{2})$/);if(!m||row.length!==6)throw Error('Choose HistData Generic ASCII M1 with six semicolon-separated fields. Extract the CSV from its ZIP first.');row[0]=m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':'+m[6]+'-05:00';}batch.push(row);}}row=[];if(batch.length>=1000)consumeBatch();}
  function text(value){for(const c of value){if(++rowSize>65536)throw Error('A CSV record exceeds 64 KB.');if(quotePending){quotePending=false;if(c==='"'){cell+='"';continue;}quoted=false;}if(quoted){if(c==='"')quotePending=true;else cell+=c;continue;}if(c==='"')quoted=true;else if(c===(format==='histdata'?';':',')){row.push(cell);cell='';}else if(c==='\n'||c==='\r')emit();else cell+=c;}}
  const decoder=new TextDecoder('utf-8',{fatal:true});
  for(let offset=0;offset<file.size;offset+=CHUNK){if(signal?.aborted)throw Error('Import cancelled.');const chunk=await file.slice(offset,offset+CHUNK).arrayBuffer();text(decoder.decode(chunk,{stream:true}));onProgress(Math.min(100,Math.round((offset+chunk.byteLength)/file.size*100)));}
  text(decoder.decode());if(quoted&&!quotePending)throw Error('Unclosed quoted CSV field.');emit();consumeBatch();if(!header||!total)throw Error('The CSV has no OHLC rows.');
  const candles=E.validateBars([...before,...after]);
  if(begin!==null&&(before.length<30||after.length<2))throw Error('Choose a start date with at least 30 earlier candles and two candles remaining in the file.');
  const gaps=candles.slice(1,101).map((b,i)=>b.t-candles[i].t).sort((a,b)=>a-b),step=gaps[Math.floor(gaps.length/2)];
  const interval=({60:'1m',180:'3m',300:'5m',900:'15m',1800:'30m',2700:'45m',3600:'1H',7200:'2H',14400:'4H',86400:'1D',604800:'1W'})[step]||'CSV';
  return {candles,total,first,last,interval,truncated:total>candles.length,cursor:begin===null?undefined:before.length-1};
 }
 return {read,MAX_BYTES};
});
