const test=require('node:test'),assert=require('node:assert/strict'),Suite=require('../assets/backtest-drawing-suite.js'),E=require('../assets/backtest-engine.js'),Studies=require('../assets/backtest-studies.js'),Frames=require('../assets/backtest-frames.js');
const bars=Array.from({length:100},(_,i)=>({t:1700000100+i*60,o:100+i*.1,h:102+i*.1,l:99+i*.1,c:101+i*.1,v:i+1}));
const points=[{i:10,p:101},{i:20,p:104},{i:30,p:102},{i:40,p:106},{i:50,p:103},{i:60,p:108},{i:70,p:105}];
test('every drawing has a valid definition and renders finite original geometry',()=>{
 for(const d of Suite.specs.values()){const n=Math.max(2,d.points||5),a={id:'draw-'+d.id,type:d.id,points:points.slice(0,n),text:'<safe>',anchor:undefined};assert.ok(Suite.validate(a),d.id);const rows=Suite.geometry(a,{map:p=>({x:p.i*8,y:600-p.p*4}),bars,width:1000,height:600});if(rows!==null){assert.ok(rows.length,d.id);for(const row of rows){assert.ok(['line','text','polygon','polyline','rect','path','ellipse'].includes(row.tag));assert.doesNotMatch(JSON.stringify(row),/NaN|Infinity|undefined/,d.id);}}}
});
test('multi-point drawings, freehand and anchored notes survive sanitization',()=>{
 const drawings=[{id:'fork',type:'pitchfork',points:points.slice(0,3)},{id:'brush',type:'brush',points},{id:'note',type:'anchorednote',points:points.slice(0,2),anchor:{x:.3,y:.4},text:'saved note'}];
 const clean=E.cleanAnnotations(drawings);assert.equal(clean.length,3);assert.equal(clean[0].points.length,3);assert.equal(clean[1].points.length,7);assert.deepEqual(clean[2].anchor,{x:.3,y:.4});assert.equal(clean[2].text,'saved note');
 assert.equal(E.cleanAnnotations([{type:'pitchfork',points:points.slice(0,2)},{type:'brush',points:[{i:0,p:NaN},points[0]]},{type:'invalid',points}]).length,0);
});
test('real volume is preserved and summed, never synthesized when missing',()=>{
 const clean=E.validateBars(bars);assert.equal(clean[20].v,21);assert.ok(Suite.available('avwap',clean));assert.ok(!Suite.available('avwap',clean.map(({v,...b})=>b)));
 const s={candles:clean,cursor:19,interval:'1m',viewTimeframe:'5m'},agg=Frames.project(s);assert.equal(agg.bars.reduce((n,b)=>n+b.v,0),210);
 delete clean[1].v;assert.equal(Frames.project(s).bars[0].v,undefined);assert.throws(()=>E.validateBars(bars.map((b,i)=>({...b,v:i===1?-1:b.v}))),/volume/);
});
test('revealed range volume profile and VWAP use actual volumes',()=>{
 const ctx={map:p=>({x:p.i*8,y:600-p.p*4}),bars:bars.slice(0,40),width:1000,height:600};
 for(const type of ['avwap','volumeprofile','regression','barspattern']){const a={type,points:points.slice(0,Math.max(2,Suite.spec(type).points))};const before=Suite.geometry(a,ctx);bars[90].c=1e6;assert.deepEqual(Suite.geometry(a,ctx),before);}
});
test('indicator values and unavailable data are explicit',()=>{
 assert.match(Studies.unavailable('AD',bars.map(({v,...b})=>b)),/volume/);assert.match(Studies.unavailable('ADVDEC',bars),/universe/);assert.match(Studies.unavailable('ASI',bars),/limit/);
 assert.equal(Studies.calculate(bars,'BOP')[0].data[0].value,1/3);assert.equal(Studies.calculate(bars,'AVGPRICE')[0].data[0].value,100.5);
 for(const id of ['HIGHLOW52','AC','AD','ALMA9','AROON14','ADX14','AVGPRICE','AO','BOP','BBP20']){const channels=Studies.calculate(bars,id);assert.ok(channels.length,id);assert.ok(channels.every(c=>c.data.length&&c.data.every(p=>Number.isFinite(p.value))),id);}
 assert.equal(Studies.calculate(bars,'AROON14')[0].data.at(-1).value,100);assert.ok(Math.abs(Studies.calculate(bars,'ADX14')[0].data.at(-1).value-100)<1e-6);
});
test('static and Flask drawing implementations and dependency ordering match',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');for(const file of ['backtest-drawing-suite.js','backtest-studies.js','backtest-engine.js','backtest-chart.js','backtest-tools.js','backtest-frames.js','backtest-workspace.js','backtest-objects.js','backtesting.js','backtesting-tools.css'])assert.ok(fs.readFileSync(path.join(root,'assets',file)).equals(fs.readFileSync(path.join(root,'TheOnePercentFlask-render-ready/static/assets',file))),file);
 for(const file of ['pages/backtesting.html','TheOnePercentFlask-render-ready/templates/pages/backtesting.html']){const html=fs.readFileSync(path.join(root,file),'utf8');assert.ok(html.indexOf('backtest-studies.js')<html.indexOf('backtest-engine.js'));assert.ok(html.indexOf('backtest-drawing-suite.js')<html.indexOf('backtest-engine.js'));if(file.startsWith('TheOnePercent'))assert.ok(html.includes("filename='assets/backtest-drawing-suite.js'"));}
});
