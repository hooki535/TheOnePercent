const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('TradingView adapter never receives future candles or future SMA values',()=>{
 const series=[];let removed=false;
 const fakeChart={addSeries(){const s={data:[],setData(d){this.data=d;},update(d){this.data.push(d);},applyOptions(){},createPriceLine(){return {};},removePriceLine(){},coordinateToPrice(){return 1;}};series.push(s);return s;},subscribeCrosshairMove(){},subscribeClick(){},timeScale(){return {setVisibleLogicalRange(){}};},remove(){removed=true;}};
 const context={window:{LightweightCharts:{createChart(){return fakeChart;},CandlestickSeries:{},LineSeries:{},CrosshairMode:{Normal:0},LineStyle:{Dashed:1}}},getComputedStyle:()=>({getPropertyValue:()=> '#111111'}),document:{body:{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/backtest-chart.js'),'utf8'),context);
 const bars=Array.from({length:100},(_,i)=>({t:1700000000+i*60,o:i+1,h:i+2,l:i+.5,c:i+1.5}));
 const s={id:'test',candles:bars,cursor:29,drawings:[]},view=new context.window.BacktestChart({},()=>{},()=>{});
 view.render(s,true,80);assert.equal(series[0].data.length,30);assert.equal(series[1].data.length,11);
 for(const row of series.flatMap(s=>s.data))assert.ok(row.time<=bars[29].t);
 assert.equal(series[1].data.at(-1).value,bars.slice(10,30).reduce((n,b)=>n+b.c,0)/20);
 s.cursor++;view.render(s,true,80);assert.equal(series[0].data.length,31);assert.equal(series[1].data.length,12);
 view.render(s,false,80);assert.equal(series[0].data.length,31);
 s.cursor=50;view.render(s,true,80);assert.equal(series[0].data.length,51);assert.equal(series[1].data.length,32);
 view.destroy();assert.ok(removed);
});
