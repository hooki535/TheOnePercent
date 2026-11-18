/* Explicit example feed for visual QA only. No database or account records are read. */
(() => {
 const objects={settings:{accountName:'Design preview',chartsWatch:['EURUSD','XAUUSD','BTCUSD','GBPJPY']}},lists={};
 Store.useDriver({name:'markets-example-memory',get:kind=>objects[kind]||{},list:kind=>lists[kind]||[],patch(kind,patch){objects[kind]={...(objects[kind]||{}),...patch};return objects[kind];},put(kind,record){const rows=lists[kind]||[];const i=rows.findIndex(t=>t.id===record.id);if(i<0)rows.push(record);else rows[i]=record;lists[kind]=rows;return record;},remove(kind,id){lists[kind]=(lists[kind]||[]).filter(t=>t.id!==id);},clear(kind){delete objects[kind];delete lists[kind];}});
 const sample={EURUSD:[1.085,.0024],GBPUSD:[1.2748,.0018],USDJPY:[153.42,-.0032],AUDUSD:[.6528,-.0015],EURGBP:[.8511,.0006],GBPJPY:[195.58,-.0021],USDCAD:[1.3972,.0012],XAUUSD:[2340.5,.0046],BTCUSD:[67250,-.0037],US500:[5208.4,.0029]};
 const catalog=Instruments.INSTRUMENTS.map(i=>({...i,digits:i.dp}));
 catalog.push({...catalog.find(i=>i.symbol==='BTCUSD'),symbol:'BTCUSDT',name:'Bitcoin / Tether',quote:'USDT'});sample.BTCUSDT=[67250,-.0037];
 const history={};Object.entries(sample).forEach(([symbol,[last,change]])=>{const open=last/(1+change);history[symbol]=Array.from({length:32},(_,n)=>{const o=open+(last-open)*n/32,c=open+(last-open)*(n+1)/32+(n===31?0:Math.sin(n*1.3)*Math.abs(last-open)*.09);return {t:Date.UTC(2026,10,17,8,n*15),o,h:Math.max(o,c)*1.0001,l:Math.min(o,c)*.9999,c,v:0};});});
 window.Feed={list:()=>catalog,symbol:s=>catalog.find(i=>i.symbol===s)||null,history:s=>history[s]||[],historicalSource:()=> 'Example candles · Not database quotes',isDemoMode:()=>false,subscribe(fn){queueMicrotask(fn);return ()=>{};},retryHistory(){},setDemoMode(){}};
 window.ChartHistory={catalog:()=>Promise.resolve([]),status:s=>({state:history[s]?'ready':'error',message:'Example data'})};
})();
