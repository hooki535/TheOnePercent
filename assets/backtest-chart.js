/* Official TradingView chart with TheOnePercent's saved drawing tools. */
(() => {
 'use strict';
 window.BacktestChart=function(host,onCrosshair,onLevel,callbacks={}){
  const L=window.LightweightCharts,Lab=window.BacktestLab;
  if(!L)throw Error('TradingView chart library could not be loaded. Reload the page.');
  const css=getComputedStyle(document.body),color=n=>css.getPropertyValue('--bt-'+n).trim();
  const chart=L.createChart(host,{autoSize:true,layout:{background:{type:'solid',color:color('card')},textColor:color('muted'),attributionLogo:true,fontSize:11},grid:{vertLines:{color:color('line')},horzLines:{color:color('line')}},timeScale:{timeVisible:true,secondsVisible:false,rightOffset:8},rightPriceScale:{borderColor:color('line')},crosshair:{mode:L.CrosshairMode.Normal}});
  const candles=chart.addSeries(L.CandlestickSeries,{upColor:color('up'),downColor:color('down'),borderVisible:false,wickUpColor:color('up'),wickDownColor:color('down')});
  const ma=chart.addSeries(L.LineSeries,{color:'#a390ff',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
  const extra=new Map(),markers=L.createSeriesMarkers?L.createSeriesMarkers(candles,[]):null;
  let previous=-1,sessionId=null,visible=0,lines=[],current=null,tool='cursor',first=null,selected=null,drag=null,frame=null;
  const doc=host.ownerDocument,ns='http://www.w3.org/2000/svg',svg=doc?doc.createElementNS(ns,'svg'):null;
  if(svg){svg.classList.add('bt-drawing-layer');svg.setAttribute('aria-label','Chart drawing layer');host.appendChild(svg);}
  const ts=chart.timeScale(),mapped=b=>({time:b.t,open:b.o,high:b.h,low:b.l,close:b.c});
  const average=(s,i)=>{let sum=0;for(let j=i-19;j<=i;j++)sum+=s.candles[j].c;return {time:s.candles[i].t,value:sum/20};};
  function element(type,attrs,parent=svg){const node=doc.createElementNS(ns,type);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);parent.appendChild(node);return node;}
  function point(p){return {x:ts.logicalToCoordinate(p.i),y:candles.priceToCoordinate(p.p)};}
  function text(x,y,label,fill,parent){const node=element('text',{x,y,fill,'font-size':10,'font-family':'system-ui','pointer-events':'none'},parent);node.textContent=label;}
  function drawAnnotation(a,isLive=false){
   const p=point(a.points[0]),q=point(a.points[1]);if([p.x,p.y,q.x,q.y].some(v=>v==null||!Number.isFinite(v)))return;
   const group=element('g',{'data-annotation':isLive?'':a.id,'class':isLive?'bt-live-position':'bt-annotation'}),stroke=a.color||color('accent'),line=(x1,y1,x2,y2,c=stroke,dash='')=>element('line',{x1,y1,x2,y2,stroke:c,'stroke-width':selected===a.id?2.5:1.5,'stroke-dasharray':dash,'pointer-events':isLive?'none':'stroke'},group);
   if(a.type==='trend'||a.type==='ray'){let x2=q.x,y2=q.y;if(a.type==='ray'&&Math.abs(q.x-p.x)>1){x2=host.clientWidth-75;y2=p.y+(q.y-p.y)/(q.x-p.x)*(x2-p.x);}line(p.x,p.y,x2,y2);}
   else if(a.type==='rectangle')element('rect',{x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.max(1,Math.abs(q.x-p.x)),height:Math.max(1,Math.abs(q.y-p.y)),fill:stroke+'18',stroke,'stroke-width':1.4,'pointer-events':'all'},group);
   else if(a.type==='fib'){for(const ratio of [0,.236,.382,.5,.618,.786,1]){const y=q.y+(p.y-q.y)*ratio;line(p.x,y,q.x,y,stroke,'4 3');text(Math.min(p.x,q.x)+4,y-4,ratio.toFixed(3)+' · '+(a.points[1].p+(a.points[0].p-a.points[1].p)*ratio).toFixed(5),stroke,group);}}
   else if(a.type==='long'||a.type==='short'){
    const entry=a.points[0].p,stop=a.points[1].p,target=entry+(a.type==='long'?1:-1)*Math.abs(entry-stop)*2,ty=candles.priceToCoordinate(a.target||target),left=Math.min(p.x,q.x),width=Math.max(25,Math.abs(q.x-p.x));if(ty==null)return;
    element('rect',{x:left,y:Math.min(p.y,ty),width,height:Math.max(1,Math.abs(p.y-ty)),fill:'#32cf9130',stroke:'#32cf9150','pointer-events':isLive?'none':'all'},group);
    element('rect',{x:left,y:Math.min(p.y,q.y),width,height:Math.max(1,Math.abs(p.y-q.y)),fill:'#ef535033',stroke:'#ef535050','pointer-events':isLive?'none':'all'},group);
    line(left,p.y,left+width,p.y,'#a4b1c8','4 3');text(left+5,ty-5,'TP '+(a.target||target).toFixed(5),'#45d5a2',group);text(left+5,q.y+13,'SL '+stop.toFixed(5),'#ff7484',group);
   }
   if(!isLive){group.onclick=e=>{if(tool!=='cursor')return;e.stopPropagation();selected=a.id;callbacks.onSelect?.(a);repaint();};if(selected===a.id)a.points.forEach((v,i)=>{const pos=point(v);const handle=element('circle',{cx:pos.x,cy:pos.y,r:5,fill:'#15171c',stroke:'#4385ff','stroke-width':2,'data-handle':i,'pointer-events':'all'},group);handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();drag={a,i};svg.style.pointerEvents='all';svg.setPointerCapture(e.pointerId);};});}
  }
  function repaint(){
   if(!svg||!current)return;svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+host.clientWidth+' '+host.clientHeight);svg.style.pointerEvents=tool==='cursor'?'none':'all';
   for(const a of current.annotations||[])drawAnnotation(a);
   const p=current.position||current.pending;if(p){const entry=p.entry||current.candles[current.cursor].c,i=Math.max(0,current.candles.findIndex(b=>b.t>=(p.entryTime||p.submittedAt)));drawAnnotation({type:p.side==='long'?'long':'short',points:[{i,p:entry},{i:Math.max(current.cursor+8,i+8),p:p.stop}],target:p.target},true);}
   if(first){const pos=point(first);if(pos.x!=null&&pos.y!=null)element('circle',{cx:pos.x,cy:pos.y,r:5,fill:color('accent'),'pointer-events':'none'});}
  }
  function readPoint(event){const rect=svg.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,mainHeight=chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30;if(x<0||x>host.clientWidth-65||y<25||y>mainHeight-5)return null;const i=ts.coordinateToLogical(x),p=candles.coordinateToPrice(y);return Number.isFinite(i)&&Number.isFinite(p)&&p>0?{i:Math.max(0,Math.min(current.cursor+100,i)),p}:null;}
  if(svg){
   svg.onpointermove=e=>{if(!drag)return;const p=readPoint(e);if(p){drag.a.points[drag.i]=p;repaint();svg.style.pointerEvents='all';}};
   svg.onpointerup=e=>{if(!drag)return;drag=null;try{svg.releasePointerCapture(e.pointerId);}catch(_){}callbacks.onChange?.();repaint();};
   svg.onclick=e=>{if(drag||tool==='cursor')return;const p=readPoint(e);if(!p)return;if(!first){first=p;repaint();return;}const points=[first,p];first=null;if(tool==='long'||tool==='short'){const distance=Math.abs(points[0].p-points[1].p);points[1].p=points[0].p+(tool==='long'?-1:1)*distance;if(points[1].p<=0||points[0].p+(tool==='long'?2:-2)*distance<=0){repaint();return;}}
    const a={id:'draw-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),type:tool,points,color:color('accent')};if((current.annotations||[]).length>=60)return;current.annotations??=[];current.annotations.push(a);selected=a.id;tool='cursor';callbacks.onChange?.();callbacks.onDrawing?.(a);repaint();};
   ts.subscribeVisibleLogicalRangeChange?.(()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(repaint);});
  }
  chart.subscribeCrosshairMove(p=>{const b=p.seriesData.get(candles);onCrosshair(b?{t:b.time,o:b.open,h:b.high,l:b.low,c:b.close}:current?.candles[current.cursor]);});
  chart.subscribeClick(p=>{if(!p.point||tool!=='cursor')return;const value=candles.coordinateToPrice(p.point.y);if(Number.isFinite(value)&&value>0)onLevel(value);});
  function updateStudies(s){
   if(!Lab)return;const rows=(s.indicators||[]).filter(k=>k!=='SMA20').flatMap(key=>key==='BB20'?[{key:'BB-UP',type:'BB',period:20,color:'#4ba1fa'},{key:'BB-MID',type:'SMA',period:20,color:'#6b8bb0'},{key:'BB-LOW',type:'BBLOW',period:20,color:'#4ba1fa'}]:[{key,type:key.startsWith('EMA')?'EMA':key.startsWith('RSI')?'RSI':'ATR',period:Number(key.match(/\d+/)?.[0]||20),color:key.startsWith('EMA')?'#ffb74d':key.startsWith('RSI')?'#b18cff':'#59c5c8'}]),wanted=new Set(rows.map(r=>r.key)),bars=s.candles.slice(0,s.cursor+1);
   for(const [key,series] of extra)if(!wanted.has(key)){chart.removeSeries(series);extra.delete(key);}
   for(const row of rows){const pane=row.type==='RSI'||row.type==='ATR'?1:0;if(!extra.has(row.key))extra.set(row.key,chart.addSeries(L.LineSeries,{color:row.color,lineWidth:1,priceLineVisible:false,lastValueVisible:true,title:row.key},pane));extra.get(row.key).setData(Lab.study(bars,row.type,row.period));}
  }
  return {
   render(s,showMA,barsVisible){
    current=s;const changed=previous!==s.cursor||sessionId!==s.id+':'+s.symbol;
    if(changed){const precision=s.candles[s.cursor].c<20?5:s.candles[s.cursor].c<1000?3:2;candles.applyOptions({priceFormat:{type:'price',precision,minMove:10**-precision}});
     if(sessionId===s.id+':'+s.symbol&&s.cursor===previous+1){candles.update(mapped(s.candles[s.cursor]));if(s.cursor>=19)ma.update(average(s,s.cursor));}else{candles.setData(s.candles.slice(0,s.cursor+1).map(mapped));ma.setData(s.candles.slice(19,s.cursor+1).map((_,i)=>average(s,i+19)));}
    }
    ma.applyOptions({visible:showMA||(s.indicators||[]).includes('SMA20')});updateStudies(s);
    for(const line of lines)candles.removePriceLine(line);lines=[];
    const level=(value,title,c)=>lines.push(candles.createPriceLine({price:value,color:c,lineWidth:1,lineStyle:L.LineStyle.Dashed,axisLabelVisible:true,title}));
    for(const value of s.drawings)level(value,'Level',color('accent'));
    const p=s.position||s.pending;if(p){if(p.entry)level(p.entry,s.position?'Entry':'Queued',color('muted'));level(p.stop,'SL',color('down'));level(p.target,'TP',color('up'));}
    if(changed||visible!==barsVisible)ts.setVisibleLogicalRange({from:Math.max(-.5,s.cursor-barsVisible+1),to:s.cursor+8});
    if(markers){const rows=s.trades.filter(t=>!t.symbol||t.symbol===s.symbol).flatMap(t=>[{time:t.entryTime,position:t.side==='long'?'belowBar':'aboveBar',color:'#4385ff',shape:t.side==='long'?'arrowUp':'arrowDown',text:t.side==='long'?'Buy':'Sell'},{time:t.exitTime,position:'aboveBar',color:t.pnl>=0?'#45d5a2':'#ff7484',shape:'circle',text:t.pnl>=0?'Win':'Loss'}]);if(s.position)rows.push({time:s.position.entryTime,position:'belowBar',color:'#4385ff',shape:'arrowUp',text:s.position.side==='long'?'Buy':'Sell'});markers.setMarkers(rows.sort((a,b)=>a.time-b.time));}
    previous=s.cursor;sessionId=s.id+':'+s.symbol;visible=barsVisible;onCrosshair(s.candles[s.cursor]);repaint();
   },
   tool(value){tool=value;first=null;selected=null;repaint();},
   deleteSelected(){if(!selected||!current)return false;current.annotations=current.annotations.filter(a=>a.id!==selected);selected=null;callbacks.onChange?.();repaint();return true;},
   undo(){if(current?.annotations?.length){current.annotations.pop();callbacks.onChange?.();repaint();}},
   fit(){ts.fitContent();},
   async image(){const canvas=chart.takeScreenshot();if(svg){const data=new XMLSerializer().serializeToString(svg),url=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'})),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}}return canvas.toDataURL('image/png');},
   destroy(){if(frame)cancelAnimationFrame(frame);markers?.detach();chart.remove();}
  };
 };
})();
