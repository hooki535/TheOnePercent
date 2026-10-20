const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),legacy=path.join(root,'TheOnePercentFlask-render-ready');
test('static and Flask replay assets match byte for byte',()=>{
 for(const file of ['backtest-engine.js','backtest-chart.js','backtest-lab.js','backtest-workspace.js','backtest-sync.js','cloud.js','market-config.js','vendor/lightweight-charts.standalone.production.js','vendor/lightweight-charts.LICENSE','vendor/lightweight-charts.NOTICE','backtesting.js','backtesting.css','backtesting/tutorial-preview.svg','backtesting/data/EURUSD_1H.csv','backtesting/data/GBPUSD_1D.csv','backtesting/data/BTCUSD_1D.csv'])assert.ok(fs.readFileSync(path.join(root,'assets',file)).equals(fs.readFileSync(path.join(legacy,'static/assets',file))),file);
});
test('both applications expose their correct backtesting route and navigation',()=>{
 const html=fs.readFileSync(path.join(root,'pages/backtesting.html'),'utf8'),template=fs.readFileSync(path.join(legacy,'templates/pages/backtesting.html'),'utf8');
 assert.ok(html.includes('../assets/backtesting.js'));assert.ok(template.includes("window.OP_FLASK = true"));assert.ok(template.includes("filename='assets/backtesting.js'"));
 assert.ok(fs.readFileSync(path.join(root,'assets/shell.js'),'utf8').includes('pages/backtesting.html'));
 assert.ok(fs.readFileSync(path.join(legacy,'static/assets/shell.js'),'utf8').includes('backtesting: "/backtesting"'));
 assert.ok(fs.readFileSync(path.join(legacy,'blueprints/pages.py'),'utf8').includes('@pages.get("/backtesting")'));
});
test('the optional tutorial points to an existing real video rather than a placeholder',()=>{
 for(const file of ['backtesting-summary.mp4','backtesting-poster.jpg','backtesting-transcript.txt'])assert.ok(fs.statSync(path.join(root,'assets/academy/video',file)).size>0);
});
