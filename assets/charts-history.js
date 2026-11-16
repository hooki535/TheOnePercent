/* Read-only adapter for the existing RLS-protected history RPCs.
   No admin key, public archive copy, synthetic fallback or database writes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.ChartHistory = factory(root.Cloud);
})(typeof window !== 'undefined' ? window : globalThis, function createHistory(cloud) {
  'use strict';
  let catalogPromise;
  const monthsCache = new Map(), payloads = new Map(), statuses = new Map();
  const fail = message => { throw new Error(message); };
  async function rpc(name, args) {
    if (!cloud?.client) fail('Market history connection is unavailable. Please retry.');
    if (cloud.ready) await cloud.ready;
    const { data, error } = await cloud.client.rpc(name, args || {});
    if (error) fail('Market history could not be loaded. Please retry.');
    return data;
  }
  async function catalog() {
    if (!catalogPromise) catalogPromise = rpc('history_catalog').then(rows => {
      if (!Array.isArray(rows)) fail('Invalid database history catalog.');
      return rows.filter(r => /^[a-z0-9_-]+$/.test(r.provider) && /^[A-Z0-9]{3,20}$/.test(r.symbol) && ['M1','H1','D1'].includes(r.timeframe));
    }).catch(e => { catalogPromise = null; throw e; });
    return catalogPromise;
  }
  function intervalSpec(iv) {
    const match = /^(\d+)(s|m|H|D|W|M)$/.exec(iv);
    if (!match) fail('Unsupported archive interval.');
    const n = +match[1], u = match[2];
    if (u === 's') fail('The database has no second candles. Choose 1 minute or higher.');
    return { frame: u === 'm' ? 'M1' : u === 'H' ? 'H1' : 'D1', ms: n * ({m:60000,H:3600000,D:86400000,W:604800000,M:2592000000}[u]), n, unit:u };
  }
  function aggregate(bars, iv) {
    const spec = intervalSpec(iv), out = [];
    for (const b of bars) {
      const date = new Date(b.t);
      const t = spec.unit === 'M' ? Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth()/spec.n)*spec.n,1)
        : spec.unit === 'W' ? Math.floor((b.t-345600000)/spec.ms)*spec.ms+345600000 : Math.floor(b.t/spec.ms)*spec.ms;
      let a = out[out.length-1];
      if (!a || a.t !== t) { a = {t,o:b.o,h:b.h,l:b.l,c:b.c,v:0}; out.push(a); }
      else { a.h=Math.max(a.h,b.h); a.l=Math.min(a.l,b.l); a.c=b.c; }
    }
    return out;
  }
  async function decode(meta, encoded) {
    if (typeof encoded !== 'string') fail('These candles are not available for viewing.');
    const raw = Uint8Array.from(atob(encoded.replace(/\s/g,'')), c => c.charCodeAt(0));
    if (raw.length !== Number(meta.bytes) || raw.length > 50000000) fail('Archive size verification failed.');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)), x => x.toString(16).padStart(2,'0')).join('');
    if (hash !== meta.sha256) fail('Archive checksum verification failed.');
    const text = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const body = JSON.parse(text);
    if (body.schema !== 1 || body.provider !== meta.provider || body.symbol !== meta.symbol || body.timeframe !== meta.timeframe || body.timezone !== 'UTC' || !Array.isArray(body.candles) || body.candles.length !== Number(meta.candle_count)) fail('Archive identity verification failed.');
    let prev = -1;
    const bars = body.candles.map(row => {
      const [t,o,h,l,c] = row.map(Number);
      if (![t,o,h,l,c].every(Number.isFinite) || t <= prev || !(0<l && l<=Math.min(o,c) && Math.max(o,c)<=h)) fail('Invalid or unordered archive candle.');
      prev=t; return {t:t*1000,o,h,l,c,v:0};
    });
    if (!bars.length || bars[0].t !== Date.parse(meta.first_utc) || bars.at(-1).t !== Date.parse(meta.last_utc)) fail('Archive coverage verification failed.');
    return bars;
  }
  async function load(sym, iv, limit=620) {
    const key=sym+'|'+iv;
    statuses.set(key,{state:'loading',message:'Loading candles…'});
    try {
      const spec=intervalSpec(iv), rows=await catalog();
      const choices=rows.filter(r=>r.symbol===sym && r.timeframe===spec.frame).sort((a,b)=>Date.parse(b.last_utc)-Date.parse(a.last_utc) || a.provider.localeCompare(b.provider));
      // Higher timeframes can aggregate M1/H1 candles, never split larger bars.
      if (!choices.length && spec.frame !== 'M1') choices.push(...rows.filter(r=>r.symbol===sym && r.timeframe===(spec.frame==='D1'?'H1':'M1')).sort((a,b)=>Date.parse(b.last_utc)-Date.parse(a.last_utc)));
      const source=choices[0];
      if (!source) fail(rows.length ? 'No stored candles for '+sym+' at this interval.' : 'No published market history is available.');
      const identity=source.provider+'|'+sym+'|'+source.timeframe;
      if (!monthsCache.has(identity)) monthsCache.set(identity,rpc('history_months',{source_provider:source.provider,source_symbol:sym,source_timeframe:source.timeframe}));
      let months;
      try { months=await monthsCache.get(identity); } catch(e) { monthsCache.delete(identity); throw e; }
      if (!Array.isArray(months)) fail('Invalid database month catalog.');
      const ordered=months.slice().sort((a,b)=>a.month.localeCompare(b.month));
      const all=new Map(); let result=[];
      // Bounded recent window; monthly rows are never shipped with the website.
      for (const meta of ordered.slice(-12).reverse()) {
        if (meta.symbol!==sym || meta.provider!==source.provider || meta.timeframe!==source.timeframe) fail('Unexpected archive identity.');
        if (!payloads.has(meta.object_path)) payloads.set(meta.object_path,rpc('history_read_payload',{object_key:meta.object_path}).then(encoded=>decode(meta,encoded)).catch(e=>{payloads.delete(meta.object_path);throw e;}));
        const chunk=await payloads.get(meta.object_path);
        // Bound in-memory private chunk cache, retaining promises shared by views.
        if (payloads.size>24) payloads.delete(payloads.keys().next().value);
        chunk.forEach(b=>all.set(b.t,b));
        result=aggregate([...all.values()].sort((a,b)=>a.t-b.t),iv);
        if (result.length>=limit+1) break;
      }
      if (!result.length) fail('No stored candles are available for this selection.');
      // A partial first aggregation bucket has insufficient leading context.
      if (result.length>1 && iv!==({M1:'1m',H1:'1H',D1:'1D'}[source.timeframe])) result.shift();
      const bars=result.slice(-limit), last=Date.parse(source.last_utc);
      const info={state:'ready',source:source.provider,symbol:sym,interval:iv,last,lastLabel:new Date(last).toISOString().slice(0,16).replace('T',' ')+' UTC',message:'Database history · '+source.provider,volumeAvailable:false};
      statuses.set(key,info);
      return {bars,info};
    } catch(e) { statuses.set(key,{state:'error',message:e.message}); throw e; }
  }
  return {catalog,load,decode,aggregate,intervalSpec,status:(sym,iv)=>statuses.get(sym+'|'+iv)||{state:'idle',message:'Database history'}};
});
