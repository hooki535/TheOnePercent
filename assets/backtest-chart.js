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
  let previous=-1,sessionId=null,visible=0,lines=[],current=null,tool='cursor',first=null,selected=null,drag=null,frame=null,hover=null,magnet=false,hidden=false,suppressClick=false,lastMA=false;
  const histories=new Map();
  const snapshot=()=>JSON.stringify({annotations:current?.annotations||[],drawings:current?.drawings||[]});
  function remember(value=snapshot()){if(!current)return;const key=current.id+':'+current.symbol;const h=histories.get(key)||[];if(h.at(-1)!==value)h.push(value);if(h.length>30)h.shift();histories.set(key,h);}
  function changed(){callbacks.onChange?.();repaint();}
  function valid(a){if(!a.points.every(p=>p.p>0&&Number.isFinite(p.p)&&Number.isFinite(p.i)))return false;return a.type==='long'?a.points[1].p<a.points[0].p&&a.target>a.points[0].p:a.type==='short'?a.target<a.points[0].p&&a.points[1].p>a.points[0].p:true;}
  const doc=host.ownerDocument,ns='http://www.w3.org/2000/svg',svg=doc?doc.createElementNS(ns,'svg'):null;
  if(svg){svg.classList.add('bt-drawing-layer');svg.setAttribute('aria-label','Chart drawing layer');host.appendChild(svg);}
  const observer=svg&&typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(repaint);}):null;observer?.observe(host);
  const ts=chart.timeScale(),mapped=b=>({time:b.t,open:b.o,high:b.h,low:b.l,close:b.c});
  const average=(s,i)=>{let sum=0;for(let j=i-19;j<=i;j++)sum+=s.candles[j].c;return {time:s.candles[i].t,value:sum/20};};
  function element(type,attrs,parent=svg){const node=doc.createElementNS(ns,type);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);parent.appendChild(node);return node;}
  function point(p){return {x:ts.logicalToCoordinate(p.i),y:candles.priceToCoordinate(p.p)};}
  function text(x,y,label,fill,parent){const node=element('text',{x,y,fill,'font-size':10,'font-family':'system-ui','pointer-events':'none'},parent);node.textContent=label;}
  function drawAnnotation(a,isLive=false){
   const p=point(a.points[0]),q=point(a.points[1]);if([p.x,p.y,q.x,q.y].some(v=>v==null||!Number.isFinite(v)))return;
   const group=element('g',{'data-annotation':isLive?'':a.id,'class':isLive?'bt-live-position':'bt-annotation'}),stroke=a.color||color('accent'),line=(x1,y1,x2,y2,c=stroke,dash='')=>element('line',{x1,y1,x2,y2,stroke:c,'stroke-width':selected===a.id?Math.max(2.5,a.width||2):a.width||2,'stroke-dasharray':dash,'pointer-events':isLive?'none':'stroke'},group);
   if(['trend','ray','extended','arrow'].includes(a.type)){
    let x1=p.x,y1=p.y,x2=q.x,y2=q.y;const slope=Math.abs(q.x-p.x)>1?(q.y-p.y)/(q.x-p.x):0;
    if(a.type==='ray'&&Math.abs(q.x-p.x)>1){x2=q.x>=p.x?host.clientWidth-65:0;y2=p.y+slope*(x2-p.x);}
    if(a.type==='extended'&&Math.abs(q.x-p.x)>1){x1=0;y1=p.y-slope*p.x;x2=host.clientWidth-65;y2=p.y+slope*(x2-p.x);}
    line(x1,y1,x2,y2);
    if(a.type==='arrow'){const angle=Math.atan2(q.y-p.y,q.x-p.x),r=10;line(q.x,q.y,q.x-r*Math.cos(angle-.5),q.y-r*Math.sin(angle-.5));line(q.x,q.y,q.x-r*Math.cos(angle+.5),q.y-r*Math.sin(angle+.5));}
   }
   else if(a.type==='horizontal')line(0,p.y,host.clientWidth-65,p.y);
   else if(a.type==='vertical')line(p.x,0,p.x,chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30);
   else if(a.type==='ellipse')element('ellipse',{cx:(p.x+q.x)/2,cy:(p.y+q.y)/2,rx:Math.max(1,Math.abs(p.x-q.x)/2),ry:Math.max(1,Math.abs(p.y-q.y)/2),fill:stroke+'18',stroke,'stroke-width':a.width||2,'pointer-events':'all'},group);
   else if(a.type==='text'){text(p.x,p.y,a.text||'Note',stroke,group);line(p.x,p.y+5,q.x,q.y);}
   else if(a.type==='measure'){element('rect',{x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.max(1,Math.abs(p.x-q.x)),height:Math.max(1,Math.abs(p.y-q.y)),fill:stroke+'18',stroke,'stroke-dasharray':'4 3','pointer-events':'all'},group);text(Math.min(p.x,q.x)+5,Math.min(p.y,q.y)-8,(a.points[1].p-a.points[0].p).toFixed(5)+' ('+((a.points[1].p/a.points[0].p-1)*100).toFixed(2)+'%) · '+Math.round(Math.abs(a.points[1].i-a.points[0].i))+' bars',stroke,group);}
   else if(a.type==='rectangle')element('rect',{x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.max(1,Math.abs(q.x-p.x)),height:Math.max(1,Math.abs(q.y-p.y)),fill:stroke+'18',stroke,'stroke-width':a.width||2,'pointer-events':'all'},group);
   else if(a.type==='fib'){for(const ratio of [0,.236,.382,.5,.618,.786,1]){const y=q.y+(p.y-q.y)*ratio;line(p.x,y,q.x,y,stroke,'4 3');text(Math.min(p.x,q.x)+4,y-4,ratio.toFixed(3)+' · '+(a.points[1].p+(a.points[0].p-a.points[1].p)*ratio).toFixed(5),stroke,group);}}
   else if(a.type==='long'||a.type==='short'){
    const entry=a.points[0].p,stop=a.points[1].p,target=entry+(a.type==='long'?1:-1)*Math.abs(entry-stop)*2,ty=candles.priceToCoordinate(a.target||target),left=Math.min(p.x,q.x),width=Math.max(25,Math.abs(q.x-p.x));if(ty==null)return;
    element('rect',{x:left,y:Math.min(p.y,ty),width,height:Math.max(1,Math.abs(p.y-ty)),fill:'#32cf9130',stroke:'#32cf9150','pointer-events':isLive?'none':'all'},group);
    element('rect',{x:left,y:Math.min(p.y,q.y),width,height:Math.max(1,Math.abs(p.y-q.y)),fill:'#ef535033',stroke:'#ef535050','pointer-events':isLive?'none':'all'},group);
    line(left,p.y,left+width,p.y,'#a4b1c8','4 3');text(left+5,ty-5,'Target '+(a.target||target).toFixed(5)+' · R/R '+(Math.abs((a.target||target)-entry)/Math.abs(entry-stop)).toFixed(2),'#45d5a2',group);text(left+5,q.y+13,'SL '+stop.toFixed(5),'#ff7484',group);
   }
   if(!isLive){
    function select(e){if(tool!=='cursor')return;e.stopPropagation();selected=a.id;callbacks.onSelect?.(a);repaint();}
    group.onclick=select;
    group.onpointerdown=e=>{if(tool!=='cursor')return;const start=readPoint(e);if(!start)return;select(e);if(a.locked)return;drag={a,start,old:JSON.parse(JSON.stringify(a)),before:snapshot(),changed:false};svg.style.pointerEvents='all';svg.setPointerCapture(e.pointerId);e.preventDefault();};
    if(selected===a.id&&!a.locked){
      const anchors=a.points.map((v,i)=>({point:v,index:i}));
      if(a.type==='long'||a.type==='short')anchors.push({point:{i:a.points[1].i,p:a.target||a.points[0].p+(a.type==='long'?1:-1)*2*Math.abs(a.points[0].p-a.points[1].p)},index:'target'});
      anchors.forEach(({point:v,index:i})=>{const pos=point(v);if(pos.x==null||pos.y==null)return;const handle=element('circle',{cx:pos.x,cy:pos.y,r:5,fill:'#15171c',stroke:'#4385ff','stroke-width':2,'data-handle':i,'pointer-events':'all'},group);handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();drag={a,i,old:JSON.parse(JSON.stringify(a)),before:snapshot(),changed:false};svg.style.pointerEvents='all';svg.setPointerCapture(e.pointerId);};});
    }
   }
  }
  function repaint(){
   if(!svg||!current)return;svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+host.clientWidth+' '+host.clientHeight);svg.style.pointerEvents=tool==='cursor'?'none':'all';
   if(!hidden)for(const a of current.annotations||[])drawAnnotation(a);
   const p=current.position||current.pending;if(p){const entry=p.entry||current.candles[current.cursor].c,i=Math.max(0,current.candles.findIndex(b=>b.t>=(p.entryTime||p.submittedAt)));drawAnnotation({type:p.side==='long'?'long':'short',points:[{i,p:entry},{i:Math.max(current.cursor+8,i+8),p:p.stop}],target:p.target},true);}
   if(first&&hover)drawAnnotation({type:tool,points:[first,hover],color:color('accent'),target:['long','short'].includes(tool)?first.p+(tool==='long'?1:-1)*2*Math.abs(first.p-hover.p):undefined},true);
   if(first){const pos=point(first);if(pos.x!=null&&pos.y!=null)element('circle',{cx:pos.x,cy:pos.y,r:5,fill:color('accent'),'pointer-events':'none'});}
  }
  function readPoint(event){if(!current)return null;const rect=svg.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,mainHeight=chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30;if(x<0||x>host.clientWidth-65||y<25||y>mainHeight-5)return null;const i=ts.coordinateToLogical(x),p=candles.coordinateToPrice(y);if(!Number.isFinite(i)||!Number.isFinite(p)||p<=0)return null;let result={i:Math.max(0,Math.min(current.cursor+100,i)),p};if(magnet){const index=Math.max(0,Math.min(current.cursor,Math.round(i))),bar=current.candles[index];result={i:index,p:[bar.o,bar.h,bar.l,bar.c].reduce((best,v)=>Math.abs(v-p)<Math.abs(best-p)?v:best,bar.o)};}return result;}
  if(svg){
   svg.onpointermove=e=>{
    const p=readPoint(e);if(!p)return;
    if(!drag){if(first){hover=p;repaint();}return;}
    const candidate=JSON.parse(JSON.stringify(drag.old));
    if(drag.i==='target')candidate.target=p.p;
    else if(Number.isInteger(drag.i))candidate.points[drag.i]=p;
    else{const di=p.i-drag.start.i,dp=p.p-drag.start.p;candidate.points=candidate.points.map(v=>({i:v.i+di,p:v.p+dp}));if(candidate.target)candidate.target+=dp;}
    if(!valid(candidate))return;if(!drag.changed)remember(drag.before);drag.changed=true;Object.assign(drag.a,candidate);repaint();svg.style.pointerEvents='all';
   };
   svg.onpointerup=e=>{if(!drag)return;const edited=drag.changed;drag=null;suppressClick=edited;try{svg.releasePointerCapture(e.pointerId);}catch(_){}if(edited)callbacks.onChange?.();repaint();};
   svg.onclick=e=>{if(suppressClick){suppressClick=false;return;}if(drag)return;if(tool==='cursor'){if(e.target===svg){selected=null;callbacks.onSelect?.(null);repaint();}return;}const p=readPoint(e);if(!p)return;if(!first){first=p;hover=null;repaint();return;}const points=[first,p];first=null;hover=null;
    if(tool==='long'||tool==='short'){const distance=Math.abs(points[0].p-points[1].p);points[1].p=points[0].p+(tool==='long'?-1:1)*distance;if(points[1].p<=0||points[0].p+(tool==='long'?2:-2)*distance<=0){repaint();return;}}
    const a={id:'draw-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),type:tool,points,color:color('accent'),width:2};if(tool==='long'||tool==='short')a.target=points[0].p+(tool==='long'?1:-1)*2*Math.abs(points[0].p-points[1].p);if(tool==='text')a.text='Note';if((current.annotations||[]).length>=60)return;remember();current.annotations??=[];current.annotations.push(a);selected=a.id;tool='cursor';callbacks.onChange?.();callbacks.onDrawing?.(a);callbacks.onSelect?.(a);repaint();};
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
    current=s;lastMA=showMA;const changed=previous!==s.cursor||sessionId!==s.id+':'+s.symbol;
    if(changed){const precision=s.candles[s.cursor].c<20?5:s.candles[s.cursor].c<1000?3:2;candles.applyOptions({priceFormat:{type:'price',precision,minMove:10**-precision}});
     if(sessionId===s.id+':'+s.symbol&&s.cursor===previous+1){candles.update(mapped(s.candles[s.cursor]));if(s.cursor>=19)ma.update(average(s,s.cursor));}else{candles.setData(s.candles.slice(0,s.cursor+1).map(mapped));ma.setData(s.candles.slice(19,s.cursor+1).map((_,i)=>average(s,i+19)));}
    }
    ma.applyOptions({visible:showMA||(s.indicators||[]).includes('SMA20')});updateStudies(s);
    for(const line of lines)candles.removePriceLine(line);lines=[];
    const level=(value,title,c)=>lines.push(candles.createPriceLine({price:value,color:c,lineWidth:1,lineStyle:L.LineStyle.Dashed,axisLabelVisible:true,title}));
    for(const value of (hidden?[]:s.drawings))level(value,'Level',color('accent'));
    const p=s.position||s.pending;if(p){if(p.entry)level(p.entry,s.position?'Entry':'Queued',color('muted'));level(p.stop,'SL',color('down'));level(p.target,'TP',color('up'));}
    if(changed||visible!==barsVisible)ts.setVisibleLogicalRange({from:Math.max(-.5,s.cursor-barsVisible+1),to:s.cursor+8});
    if(markers){const rows=s.trades.filter(t=>!t.symbol||t.symbol===s.symbol).flatMap(t=>[{time:t.entryTime,position:t.side==='long'?'belowBar':'aboveBar',color:'#4385ff',shape:t.side==='long'?'arrowUp':'arrowDown',text:t.side==='long'?'Buy':'Sell'},{time:t.exitTime,position:'aboveBar',color:t.pnl>=0?'#45d5a2':'#ff7484',shape:'circle',text:t.pnl>=0?'Win':'Loss'}]);if(s.position)rows.push({time:s.position.entryTime,position:'belowBar',color:'#4385ff',shape:'arrowUp',text:s.position.side==='long'?'Buy':'Sell'});markers.setMarkers(rows.sort((a,b)=>a.time-b.time));}
    previous=s.cursor;sessionId=s.id+':'+s.symbol;visible=barsVisible;onCrosshair(s.candles[s.cursor]);repaint();
   },
   tool(value){tool=value;first=null;hover=null;selected=null;suppressClick=false;callbacks.onSelect?.(null);repaint();},
   magnet(){magnet=!magnet;return magnet;},
   hide(){hidden=!hidden;if(current)this.render(current,lastMA,visible);return hidden;},
   updateSelected(changes){const a=current?.annotations?.find(a=>a.id===selected);if(!a)return false;remember();if(/^#[0-9a-f]{6}$/i.test(changes.color))a.color=changes.color;if([1,2,3,4].includes(changes.width))a.width=changes.width;if(typeof changes.locked==='boolean')a.locked=changes.locked;if(typeof changes.text==='string')a.text=changes.text.slice(0,200);changed();callbacks.onSelect?.(a);return true;},
   selected(){return current?.annotations?.find(a=>a.id===selected)||null;},
   clear(){if(!current)return;remember();current.annotations=[];current.drawings=[];selected=null;callbacks.onSelect?.(null);changed();},
   deleteSelected(){if(!selected||!current)return false;remember();current.annotations=current.annotations.filter(a=>a.id!==selected);selected=null;callbacks.onSelect?.(null);changed();return true;},
   undo(){if(!current)return;const h=histories.get(current.id+':'+current.symbol);if(h?.length){const previous=JSON.parse(h.pop());current.annotations=previous.annotations;current.drawings=previous.drawings;selected=null;callbacks.onSelect?.(null);changed();}},
   fit(){ts.fitContent();},
   async image(){const canvas=chart.takeScreenshot();if(svg){const data=new XMLSerializer().serializeToString(svg),url=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'})),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}}return canvas.toDataURL('image/png');},
   destroy(){observer?.disconnect();if(frame)cancelAnimationFrame(frame);markers?.detach();chart.remove();}
  };
 };
})();
