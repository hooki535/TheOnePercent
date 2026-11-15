const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/charts-engine.js','utf8');
function render(look){
 const context={state:{type:'candle',look},css:()=> '#777'};
 const method=source.slice(source.indexOf('  drawSeries(c,'),source.indexOf('  drawPriceStudy(c,'));
 vm.runInNewContext(`class Example {${method}};this.paint=Example.prototype.drawSeries;`,context);
 const events=[];const canvas={beginPath(){},moveTo(){},lineTo(){},stroke(){events.push(['wick',this.strokeStyle]);},fillRect(){events.push(['body',this.fillStyle]);},strokeRect(){events.push(['border',this.strokeStyle]);}};
 context.paint.call({plotW:100,x:i=>20+i*10,y:p=>100-p},canvas,[{o:10,h:13,l:9,c:12},{o:12,h:13,l:9,c:10}],0,2,5,'#00aa00','#dd0000',{y:0,h:100});return events;
}
test('candle body, wick and border visibility are independently rendered',()=>{
 assert.equal(render({}).length,6);
 assert.deepEqual(render({candleBodies:false,candleWicks:false}).map(e=>e[0]),['border','border']);
 assert.deepEqual(render({candleBorders:false}).map(e=>e[0]),['wick','body','wick','body']);
 assert.deepEqual(render({candleBodies:false,candleWicks:false,candleBorders:false}),[]);
});
test('wick matching and independent rising/falling colours affect rendered strokes',()=>{
 const custom={wickUp:'#001122',wickDn:'#334455',borderUp:'#667788',borderDn:'#99aabb'};
 assert.deepEqual(render({...custom,wickMatch:false}).filter(e=>e[0]==='wick').map(e=>e[1]),['#001122','#334455']);
 assert.deepEqual(render({...custom,wickMatch:true}).filter(e=>e[0]==='wick').map(e=>e[1]),['#00aa00','#dd0000']);
 assert.deepEqual(render(custom).filter(e=>e[0]==='border').map(e=>e[1]),['#667788','#99aabb']);
});
