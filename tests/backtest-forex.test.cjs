const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../assets/backtest-workspace.js');
const bars=()=>Array.from({length:80},(_,i)=>({t:1700000000+i*3600,o:100,h:101,l:99,c:100}));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('USD-base pairs convert unrealized and actual exit proceeds at their respective prices',()=>{
 const s=E.createSession({startBalance:10000,multiplier:1,fee:0,slippage:0,symbol:'USDJPY',fxMode:'inverse',cursor:29,startBalance:10000,fee:.01},bars());
 E.placeOrder(s,{side:'long',type:'market',quantity:1000,stop:90,target:120});E.step(s);
 near(s.position.riskCash,10000/90+20);
 s.candles[31]={...s.candles[31],o:105,h:111,l:104,c:110};E.step(s);near(E.unrealized(s),10000/110);
 E.requestClose(s);s.candles[32]={...s.candles[32],o:115,h:116,l:114,c:115};E.step(s);
 near(s.trades[0].gross,15000/115);near(s.trades[0].pnl,15000/115-20);near(s.balance,10000+s.trades[0].pnl);
 const restored=E.restore(E.snapshot(s));assert.equal(restored.fxMode,'inverse');near(restored.balance,s.balance);
});
test('USD-base stop gaps use the actual gap conversion and old backups retain fixed accounting',()=>{
 const s=E.createSession({startBalance:10000,multiplier:1,fee:0,slippage:0,symbol:'USDCHF',fxMode:'inverse',cursor:29,startBalance:10000},bars());
 E.placeOrder(s,{side:'long',type:'market',quantity:1000,stop:90,target:120});E.step(s);s.candles[31]={...s.candles[31],o:80,h:85,l:78,c:81};E.step(s);near(s.trades[0].pnl,-20000/80);
 const raw=E.snapshot(E.createSession({startBalance:10000,multiplier:1,fee:0,slippage:0,symbol:'USDJPY',cursor:29},bars()));delete raw.fxMode;assert.equal(E.restore(raw).fxMode,'fixed');
 assert.throws(()=>E.createSession({startBalance:10000,multiplier:1,fee:0,slippage:0,symbol:'EURUSD',fxMode:'inverse'},bars()));
});
test('portfolio saves conversion mode independently for every pair',()=>{
 const s=E.createPortfolio({startBalance:10000,multiplier:1,fee:0,slippage:0},[{symbol:'EURUSD',candles:bars()},{symbol:'USDJPY',fxMode:'inverse',candles:bars()}]);E.selectMarket(s,'USDJPY');
 E.placeOrder(s,{side:'long',type:'market',quantity:100,stop:90,target:120});E.step(s);
 const restored=E.restore(E.snapshot(s));assert.equal(restored.fxMode,'inverse');near(E.cashMultiplier(restored,125),1/125);E.selectMarket(restored,'EURUSD');assert.equal(restored.fxMode,'fixed');
});
test('position targets and drawing style survive saved-session restoration',()=>{
 const s=E.createSession({startBalance:10000,multiplier:1,fee:0,slippage:0,symbol:'EURUSD',cursor:29},bars());s.annotations=[{id:'position',type:'long',points:[{i:25,p:100},{i:35,p:90}],target:135,color:'#123abc',width:4,locked:true,text:'My note'}];
 const a=E.restore(E.snapshot(s)).annotations[0];assert.equal(a.target,135);assert.equal(a.width,4);assert.equal(a.locked,true);assert.equal(a.color,'#123abc');
 assert.equal(E.cleanAnnotations([{type:'script',points:[{i:1,p:1},{i:2,p:2}]}]).length,0);
});
test('seven attributed forex archives have distinct validated prices and match their manifest',()=>{
 const dir=path.join(__dirname,'../assets/backtesting/data'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'forex-archive-manifest.json'))),prices=new Set();
 assert.equal(manifest.license,'CC-BY-SA-4.0');assert.equal(manifest.datasets.length,7);
 for(const d of manifest.datasets){const buffer=fs.readFileSync(path.join(dir,d.file)),rows=E.parseCSV(buffer.toString());assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),d.sha256);assert.equal(rows.length,d.bars);assert.ok(rows.length>1500);assert.equal(new Date(rows[0].t*1000).toISOString().replace('.000Z','Z'),d.start);assert.equal(new Date(rows.at(-1).t*1000).toISOString().replace('.000Z','Z'),d.end);prices.add(JSON.stringify(rows.map(r=>r.c)));}
 assert.equal(prices.size,7);
});
