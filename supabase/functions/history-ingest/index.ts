// Server-only immutable history uploader. No browser credentials or public write policy.
const PROJECT = 'ecnxstqfnjaiibwiwwto';
const URL = `https://${PROJECT}.supabase.co`;
const AUDIENCE = `${URL}/functions/v1/history-ingest`;
const LOCAL_HASH = '__LOCAL_TOKEN_SHA256__'; // Replaced only in the deployment payload.
const LOCAL_EXPIRES = '__LOCAL_TOKEN_EXPIRES__';
const CAPACITY = 300_000_000; // Leave headroom within the free 500 MB database allowance.
class Backoff extends Error { constructor(public seconds: number){super('Storage rate limited; retry after '+seconds+' seconds');} }
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
const digest = async (data: Uint8Array) => hex(await crypto.subtle.digest('SHA-256', data));
const decode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
let jwks: any, jwksAt = 0;
async function authenticate(req: Request) {
 const local = req.headers.get('X-History-Upload-Token');
 if (local && Date.now() < Date.parse(LOCAL_EXPIRES) && await digest(new TextEncoder().encode(local)) === LOCAL_HASH) return 'local-backfill';
 const bearer = req.headers.get('Authorization') || '';
 if (!bearer.startsWith('Bearer ') || bearer.length > 20000) return null;
 try {
  const [head, body, sig, extra] = bearer.slice(7).split('.');
  if (extra || !head || !body || !sig) return null;
  const h = JSON.parse(new TextDecoder().decode(decode(head))), p = JSON.parse(new TextDecoder().decode(decode(body))), now = Date.now()/1000;
  if (h.alg !== 'RS256' || typeof h.kid !== 'string' || p.iss !== 'https://token.actions.githubusercontent.com' || p.aud !== AUDIENCE || !Number.isFinite(p.exp) || p.exp < now || !Number.isFinite(p.iat) || p.iat > now+30 || now-p.iat > 600 || (p.nbf && p.nbf > now+30)) return null;
  const subjects=['repo:hooki535/TheOnePercent:ref:refs/heads/main','repo:hooki535@228179110/TheOnePercent@1367073159:ref:refs/heads/main'];
  if (!subjects.includes(p.sub) || String(p.repository_id)!=='1367073159' || String(p.repository_owner_id)!=='228179110' || p.repository !== 'hooki535/TheOnePercent' || p.ref !== 'refs/heads/main' || p.workflow_ref !== 'hooki535/TheOnePercent/.github/workflows/history-refresh.yml@refs/heads/main' || !['schedule','workflow_dispatch','push'].includes(p.event_name)) return null;
  if (!jwks || Date.now()-jwksAt > 300000 || !jwks.keys.some((k: any) => k.kid === h.kid)) {
   const r = await fetch('https://token.actions.githubusercontent.com/.well-known/jwks');if (!r.ok) return null;jwks = await r.json();jwksAt = Date.now();
  }
  const k = jwks.keys.find((k: any) => k.kid === h.kid && k.kty === 'RSA');if (!k) return null;
  const key = await crypto.subtle.importKey('jwk', k, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(sig), new TextEncoder().encode(head+'.'+body)) ? 'github-actions' : null;
 } catch { return null; }
}
async function limited(stream: ReadableStream<Uint8Array> | null, max: number) {
 if (!stream) throw Error('Missing request body');const reader=stream.getReader(),parts: Uint8Array[]=[];let n=0;
 try { while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>max)throw Error('Payload exceeds limit');parts.push(r.value);} }
 finally {await reader.cancel().catch(()=>{});}
 const result=new Uint8Array(n);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
async function service(path: string, init: RequestInit = {}) {
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw Error('Server credentials unavailable');
 const response=await fetch(URL+path,{...init,headers:{apikey:key,Authorization:'Bearer '+key,...init.headers}});
 if(!response.ok)throw Error('Storage/database request failed: '+response.status);return response;
}
async function usage(){return (await service('/rest/v1/rpc/history_storage_usage',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();}
async function validate(item: any) {
 const m=item.meta;
 if(!m || !['histdata','dukascopy'].includes(m.provider) || !/^[A-Z0-9]{3,20}$/.test(m.symbol) || !['M1','H1','D1'].includes(m.timeframe) || !/^\d{4}-\d{2}-01$/.test(m.month) || !/^[0-9a-f]{64}$/.test(m.sha256))throw Error('Invalid chunk identity');
 const month=m.month.slice(0,7),key=`${m.provider}/${m.symbol}/${m.timeframe}/${month}/${m.sha256}.json.gz`;
 if(m.object_path!==key || typeof item.data!=='string' || item.data.length>1_400_000)throw Error('Invalid object path or size');
 const bytes=decode(item.data);if(bytes.length!==m.bytes || bytes.length===0 || await digest(bytes)!==m.sha256)throw Error('Chunk checksum mismatch');
 const raw=await limited(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),8_000_000),body=JSON.parse(new TextDecoder().decode(raw));
 if(body.schema!==1 || body.provider!==m.provider || body.symbol!==m.symbol || body.timeframe!==m.timeframe || body.timezone!=='UTC' || body.price_side!=='bid' || JSON.stringify(body.columns)!==JSON.stringify(['time','open','high','low','close']) || !Array.isArray(body.candles) || body.candles.length!==m.candle_count || m.candle_count<1 || m.candle_count>50000)throw Error('Chunk metadata mismatch');
 let previous=-1;
 for(const row of body.candles){if(!Array.isArray(row)||row.length!==5)throw Error('Invalid candle');const [t,...values]=row,[o,h,l,c]=values.map(Number);if(!Number.isInteger(t)||t<=previous||new Date(t*1000).toISOString().slice(0,7)!==month||!values.every((v: any)=>typeof v==='string'&&/^\d+(\.\d+)?$/.test(v))||![o,h,l,c].every(Number.isFinite)||!(0<l&&l<=Math.min(o,c)&&Math.max(o,c)<=h))throw Error('Invalid, duplicate or unordered OHLC');previous=t;}
 if(Date.parse(m.first_utc)!==body.candles[0][0]*1000 || Date.parse(m.last_utc)!==previous*1000 || previous*1000>Date.now())throw Error('Invalid candle coverage');
 const meta={provider:m.provider,symbol:m.symbol,timeframe:m.timeframe,month:m.month,sha256:m.sha256,object_path:key,candle_count:m.candle_count,first_utc:m.first_utc,last_utc:m.last_utc,bytes:bytes.length,published:false};return {meta,bytes};
}
Deno.serve(async (req: Request)=>{
 try {
  const actor=await authenticate(req);if(!actor)return reply({error:'Unauthorized'},401);
  const route=new globalThis.URL(req.url).pathname.split('/').at(-1);
  if(req.method==='GET' && route==='status')return reply(await usage());
  if(req.method==='GET' && route==='hashes')return reply(await (await service('/rest/v1/rpc/history_chunk_hashes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json());
  if(req.method==='GET' && route==='inventory'){
   const params=new globalThis.URL(req.url).searchParams,provider=params.get('provider'),symbol=params.get('symbol');
   if(!['histdata','dukascopy'].includes(provider||'') || !/^[A-Z0-9]{3,20}$/.test(symbol||''))return reply({error:'Invalid inventory'},400);
   return reply(await (await service('/rest/v1/rpc/history_inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source_provider:provider,source_symbol:symbol})})).json());
  }
  if(req.method==='POST' && route==='verify'){
   const b=JSON.parse(new TextDecoder().decode(await limited(req.body,20000)));if(!Array.isArray(b.paths)||b.paths.length>8)return reply({error:'Use at most eight objects'},400);
   const result=[];for(const key of b.paths){if(typeof key!=='string'||!/^(histdata|dukascopy)\/[A-Z0-9]{3,20}\/(M1|H1|D1)\/\d{4}-\d{2}\/[0-9a-f]{64}\.json\.gz$/.test(key))throw Error('Invalid verification path');const encoded=await (await service('/rest/v1/rpc/history_read_payload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({object_key:key})})).json();if(typeof encoded!=='string')throw Error('Payload not uploaded');const data=decode(encoded);result.push({path:key,sha256:await digest(data),bytes:data.length});}return reply(result);
  }
  if(req.method==='POST' && route==='run'){
   const b=JSON.parse(new TextDecoder().decode(await limited(req.body,20000)));if(!['histdata','dukascopy'].includes(b.provider)||!['complete','failed','rate_limited'].includes(b.status))return reply({error:'Invalid run'},400);
   await service('/rest/v1/history_update_runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:b.provider,status:b.status,finished_at:new Date().toISOString(),details:{actor,...b.details}})});return reply({recorded:true});
  }
  if(req.method!=='POST'||route!=='batch')return reply({error:'Unknown route'},404);
  const body=JSON.parse(new TextDecoder().decode(await limited(req.body,2_000_000)));if(!Array.isArray(body.chunks)||body.chunks.length<1||body.chunks.length>64)return reply({error:'Use 1–64 chunks'},400);
  const checked=[];for(const item of body.chunks)checked.push(await validate(item));
  const u=await usage();if(Number(u.payload_bytes)+checked.reduce((n,c)=>n+c.bytes.length,0)>CAPACITY || Number(u.database_bytes)>425_000_000)return reply({error:'Free database safety allowance reached'},507);
  // One transaction stores compressed immutable bytes and metadata. Existing versions remain intact.
  await service('/rest/v1/rpc/history_store_batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chunks:body.chunks.map((item: any,i: number)=>({meta:checked[i].meta,data:item.data}))})});
  return reply({stored:checked.length,bytes:checked.reduce((n,c)=>n+c.bytes.length,0),published:false});
 } catch(error){if(error instanceof Backoff)return new Response(JSON.stringify({error:error.message}),{status:429,headers:{'Content-Type':'application/json','Retry-After':String(error.seconds)}});return reply({error:error instanceof Error?error.message:'Upload failed'},400);}
});
