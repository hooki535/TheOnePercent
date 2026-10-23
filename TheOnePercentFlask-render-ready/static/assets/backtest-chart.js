/* TradingView Lightweight Charts with TheOnePercent's saved drawing tools. */
(() => {
 'use strict';
 window.BacktestChart=function(host,onCrosshair,onLevel,callbacks={}){
  const L=window.LightweightCharts,Lab=window.BacktestLab;
  if(!L)throw Error('TradingView chart library could not be loaded. Reload the page.');
  const css=getComputedStyle(document.body),color=n=>css.getPropertyValue('--bt-'+n).trim();
  const chart=L.createChart(host,{autoSize:true,layout:{background:{type:'solid',color:color('card')},textColor:color('muted'),attributionLogo:true,fontSize:11},grid:{vertLines:{color:color('line')},horzLines:{color:color('line')}},timeScale:{timeVisible:true,secondsVisible:false,rightOffset:8},rightPriceScale:{borderColor:color('line')},crosshair:{mode:L.CrosshairMode.Normal}});
  function priceSeries(kind){const types={candles:L.CandlestickSeries,hollow:L.CandlestickSeries,bars:L.BarSeries,line:L.LineSeries,area:L.AreaSeries};return chart.addSeries(types[kind]||L.CandlestickSeries,['line','area'].includes(kind)?{color:color('up'),lineColor:color('up'),lineWidth:2,topColor:'#32cf9135',bottomColor:'#32cf9102'}:{upColor:kind==='hollow'?'transparent':color('up'),downColor:color('down'),borderVisible:kind==='hollow',borderUpColor:color('up'),borderDownColor:color('down'),wickUpColor:color('up'),wickDownColor:color('down')});}
  let renderKind='candles',candles=priceSeries(renderKind);
  const ma=chart.addSeries(L.LineSeries,{color:'#a390ff',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
  const extra=new Map();let markers=L.createSeriesMarkers?L.createSeriesMarkers(candles,[]):null;
  let previous=-1,sessionId=null,visible=0,lines=[],current=null,tool='cursor',first=null,selected=null,drag=null,frame=null,hover=null,magnet=false,hidden=false,suppressClick=false,lastMA=false;
  const Suite=window.BacktestDrawingSuite;
  let pending=[],freehand=null,lastHit=null,lastTap=null;
  let projection=null,keepMode=false;
  let calendarKey='',calendarSegments=[];
  const histories=new Map(),redos=new Map();
  const snapshot=()=>JSON.stringify({annotations:current?.annotations||[],drawings:current?.drawings||[]});
  function remember(value=snapshot()){if(!current)return;const key=current.id+':'+current.symbol;redos.set(key,[]);const h=histories.get(key)||[];if(h.at(-1)!==value)h.push(value);if(h.length>30)h.shift();histories.set(key,h);}
  function changed(){callbacks.onChange?.();repaint();}
  function valid(a){if(!a.points.every(p=>p.p>0&&Number.isFinite(p.p)&&Number.isFinite(p.i)))return false;return a.type==='long'?a.points[1].p<a.points[0].p&&a.target>a.points[0].p:a.type==='short'?a.target<a.points[0].p&&a.points[1].p>a.points[0].p:true;}
  const doc=host.ownerDocument,ns='http://www.w3.org/2000/svg',svg=doc?doc.createElementNS(ns,'svg'):null;
  if(svg){svg.classList.add('bt-drawing-layer');svg.setAttribute('aria-label','Chart drawing layer');host.appendChild(svg);}
  const observer=svg&&typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(repaint);}):null;observer?.observe(host);
  const ts=chart.timeScale(),mapped=b=>({time:b.t,open:b.o,high:b.h,low:b.l,close:b.c});
  const average=(s,i)=>{let sum=0;for(let j=i-19;j<=i;j++)sum+=s.candles[j].c;return {time:s.candles[i].t,value:sum/20};};
  function element(type,attrs,parent=svg){const node=doc.createElementNS(ns,type);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);parent.appendChild(node);return node;}
  function point(p){return {x:ts.logicalToCoordinate(projection?projection.toDisplay(p.i):p.i),y:candles.priceToCoordinate(p.p)};}
  function text(x,y,label,fill,parent){const node=element('text',{x,y,fill,'font-size':10,'font-family':'system-ui','pointer-events':'none'},parent);node.textContent=label;}
  function drawAnnotation(a,isLive=false){
   if(Array.isArray(a.visibility)&&!a.visibility.includes(window.BacktestFrames?.selected(current)||current.interval))return;
   const p=point(a.points[0]),q=point(a.points[1]);if([p.x,p.y,q.x,q.y].some(v=>v==null||!Number.isFinite(v)))return;
   const group=element('g',{'data-annotation':isLive?'':a.id,'class':isLive?'bt-live-position':'bt-annotation','clip-path':'url(#bt-drawing-plot)'}),stroke=a.color||color('accent'),line=(x1,y1,x2,y2,c=stroke,dash=(a.dash==='dashed'?'7 4':a.dash==='dotted'?'2 4':''))=>element('line',{x1,y1,x2,y2,stroke:c,'stroke-width':selected===a.id?Math.max(2.5,a.width||2):a.width||2,'stroke-dasharray':dash,'pointer-events':isLive?'none':'stroke'},group);
   const primitives=Suite.geometry(a,{map:point,bars:current.candles.slice(0,current.cursor+1),width:host.clientWidth-65,height:chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30});
   if(primitives!==null){group.setAttribute('color',stroke);for(const shape of primitives){const node=element(shape.tag,{fill:shape.tag==='text'?stroke:'none',stroke:shape.tag==='text'?'none':stroke,'stroke-width':a.width||2,'stroke-dasharray':a.dash==='dashed'?'7 4':a.dash==='dotted'?'2 4':'','font-family':'system-ui','font-size':11,'pointer-events':isLive?'none':'visiblePainted',...shape.attrs},group);if(shape.text!==undefined)node.textContent=shape.text;}}
   else if(['trend','ray','extended','arrow','info','channel'].includes(a.type)){
    let x1=p.x,y1=p.y,x2=q.x,y2=q.y;const slope=Math.abs(q.x-p.x)>1?(q.y-p.y)/(q.x-p.x):0;
    if(a.type==='ray'&&Math.abs(q.x-p.x)>1){x2=q.x>=p.x?host.clientWidth-65:0;y2=p.y+slope*(x2-p.x);}
    if(a.type==='extended'&&Math.abs(q.x-p.x)>1){x1=0;y1=p.y-slope*p.x;x2=host.clientWidth-65;y2=p.y+slope*(x2-p.x);}
    line(x1,y1,x2,y2);
    if(a.type==='info')text((p.x+q.x)/2,(p.y+q.y)/2-10,((a.points[1].p/a.points[0].p-1)*100).toFixed(2)+'% · '+Math.round(Math.abs(a.points[1].i-a.points[0].i))+' source bars',stroke,group);
    if(a.type==='channel'){const offset=a.offset??Math.max(Math.abs(a.points[1].p-a.points[0].p)*.5,a.points[0].p*.001),dy=candles.priceToCoordinate(a.points[0].p+offset)-p.y;line(p.x,p.y+dy,q.x,q.y+dy);line(p.x,p.y+dy/2,q.x,q.y+dy/2,stroke,'4 4');element('polygon',{points:[p.x+','+p.y,q.x+','+q.y,q.x+','+(q.y+dy),p.x+','+(p.y+dy)].join(' '),fill:stroke+'12','pointer-events':'all'},group);}

    if(a.type==='arrow'){const angle=Math.atan2(q.y-p.y,q.x-p.x),r=10;line(q.x,q.y,q.x-r*Math.cos(angle-.5),q.y-r*Math.sin(angle-.5));line(q.x,q.y,q.x-r*Math.cos(angle+.5),q.y-r*Math.sin(angle+.5));}
   }
   else if(a.type==='horizontalray')line(p.x,p.y,host.clientWidth-65,p.y);
   else if(a.type==='crossline'){line(0,p.y,host.clientWidth-65,p.y);line(p.x,0,p.x,host.clientHeight-30);}
   else if(a.type==='triangle')element('polygon',{points:p.x+','+q.y+' '+((p.x+q.x)/2)+','+p.y+' '+q.x+','+q.y,fill:stroke+'18',stroke,'stroke-width':a.width||2,'stroke-dasharray':a.dash==='dashed'?'7 4':a.dash==='dotted'?'2 4':'','pointer-events':'all'},group);
   else if(a.type==='horizontal')line(0,p.y,host.clientWidth-65,p.y);
   else if(a.type==='vertical')line(p.x,0,p.x,chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30);
   else if(a.type==='ellipse')element('ellipse',{cx:(p.x+q.x)/2,cy:(p.y+q.y)/2,rx:Math.max(1,Math.abs(p.x-q.x)/2),ry:Math.max(1,Math.abs(p.y-q.y)/2),fill:stroke+'18',stroke,'stroke-width':a.width||2,'stroke-dasharray':a.dash==='dashed'?'7 4':a.dash==='dotted'?'2 4':'','pointer-events':'all'},group);
   else if(a.type==='text'){text(p.x,p.y,a.text||'Note',stroke,group);line(p.x,p.y+5,q.x,q.y);}
   else if(['measure','pricerange','daterange'].includes(a.type)){element('rect',{x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.max(1,Math.abs(p.x-q.x)),height:Math.max(1,Math.abs(p.y-q.y)),fill:stroke+'18',stroke,'stroke-dasharray':'4 3','pointer-events':'all'},group);text(Math.min(p.x,q.x)+5,Math.min(p.y,q.y)-8,(a.type==='daterange'?'':(a.points[1].p-a.points[0].p).toFixed(5)+' ('+((a.points[1].p/a.points[0].p-1)*100).toFixed(2)+'%)')+(a.type==='pricerange'?'':' · '+Math.round(Math.abs(a.points[1].i-a.points[0].i))+' source bars'),stroke,group);}
   else if(a.type==='rectangle')element('rect',{x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.max(1,Math.abs(q.x-p.x)),height:Math.max(1,Math.abs(q.y-p.y)),fill:stroke+'18',stroke,'stroke-width':a.width||2,'stroke-dasharray':a.dash==='dashed'?'7 4':a.dash==='dotted'?'2 4':'','pointer-events':'all'},group);
   else if(a.type==='fib'){
    const props=a.settings||{},rows=(props.levels|| (a.levels||[0,.236,.382,.5,.618,.786,1]).map(v=>({v,c:stroke,on:true}))).filter(r=>r.on),style=props.levelsLine||{width:a.width||2,dash:a.dash||'solid'},left=a.extendLeft?0:Math.min(p.x,q.x),right=a.extendRight?host.clientWidth-65:Math.max(p.x,q.x),at=r=>q.y+(p.y-q.y)*(props.reverse?1-r.v:r.v);
    if(props.background?.on){const sorted=[...rows].sort((a,b)=>a.v-b.v);for(let i=1;i<sorted.length;i++){const y1=at(sorted[i-1]),y2=at(sorted[i]);element('rect',{x:left,y:Math.min(y1,y2),width:right-left,height:Math.max(.5,Math.abs(y2-y1)),fill:sorted[i].c,'fill-opacity':props.background.opacity,'pointer-events':isLive?'none':'all'},group);}}
    if(props.trend?.on)element('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:props.trend.color,'stroke-width':props.trend.width,'stroke-dasharray':props.trend.dash==='solid'?'':props.trend.dash==='dotted'?'2 4':'7 4','pointer-events':isLive?'none':'stroke'},group);
    for(const row of rows){const y=at(row),price=a.points[1].p+(a.points[0].p-a.points[1].p)*(props.reverse?1-row.v:row.v);element('line',{x1:left,y1:y,x2:right,y2:y,stroke:row.c,'stroke-width':style.width,'stroke-dasharray':style.dash==='solid'?'':style.dash==='dotted'?'2 4':'7 4','pointer-events':isLive?'none':'stroke','data-fib-level':row.v},group);const showPrice=props.showPrices??a.showPrices!==false,showLevel=props.showLevels!==false,label=[showLevel?String(row.v):'',showPrice?price.toFixed(5):''].filter(Boolean).join(' · ');if(label){const side=props.labelSide||'left',x=side==='right'?right-4:side==='center'?(left+right)/2:left+4,node=element('text',{x,y:y-4,fill:row.c,'font-size':10,'font-family':'system-ui','text-anchor':side==='right'?'end':side==='center'?'middle':'start','pointer-events':'none'},group);node.textContent=label;}}
   }
   else if(a.type==='long'||a.type==='short'){
    const areas=a.settings||{},profit=areas.profit,loss=areas.loss,profitColor=profit?.color||'#32cf91',lossColor=loss?.color||'#ef5350';
    const entry=a.points[0].p,stop=a.points[1].p,target=entry+(a.type==='long'?1:-1)*Math.abs(entry-stop)*2,ty=candles.priceToCoordinate(a.target||target),left=Math.min(p.x,q.x),width=Math.max(25,Math.abs(q.x-p.x));if(ty==null)return;
    element('rect',{x:left,y:Math.min(p.y,ty),width,height:Math.max(1,Math.abs(p.y-ty)),fill:profit?.on===false?'none':profitColor,'fill-opacity':profit?.opacity??.19,stroke:profit?.on===false?'none':profitColor,'stroke-opacity':.35,'data-position-zone':'profit','pointer-events':isLive?'none':'all'},group);
    element('rect',{x:left,y:Math.min(p.y,q.y),width,height:Math.max(1,Math.abs(p.y-q.y)),fill:loss?.on===false?'none':lossColor,'fill-opacity':loss?.opacity??.2,stroke:loss?.on===false?'none':lossColor,'stroke-opacity':.35,'data-position-zone':'loss','pointer-events':isLive?'none':'all'},group);
    line(left,p.y,left+width,p.y,areas.line?.color||'#a4b1c8',areas.line?.dash==='solid'?'':areas.line?.dash==='dotted'?'2 4':'4 3');text(left+5,ty-5,'Target '+(a.target||target).toFixed(5)+' · R/R '+(Math.abs((a.target||target)-entry)/Math.abs(entry-stop)).toFixed(2),'#45d5a2',group);text(left+5,q.y+13,'SL '+stop.toFixed(5),'#ff7484',group);
   }
   const settings=a.settings||{};
   if(a.type!=='fib'){
    if(settings.background)for(const shape of group.querySelectorAll('rect,ellipse,polygon')){shape.setAttribute('fill',settings.background.on?settings.background.color:'none');shape.setAttribute('fill-opacity',settings.background.opacity);}
    if(settings.line?.on===false)for(const shape of group.querySelectorAll(window.BacktestDrawingSuite.spec(a.type)?.group==='notes'?'rect,ellipse,polygon':'[stroke]'))shape.setAttribute('stroke','none');
    const font=settings.font||settings.textFont;if(font)for(const label of group.querySelectorAll('text')){label.setAttribute('fill',font.color);label.setAttribute('font-size',font.size);label.setAttribute('font-weight',font.bold?700:400);label.setAttribute('font-style',font.italic?'italic':'normal');}
    if(settings.text&&window.BacktestDrawingSuite.spec(a.type)?.group!=='notes'){const label=element('text',{x:(p.x+q.x)/2,y:(p.y+q.y)/2-8,fill:font?.color||stroke,'text-anchor':'middle','font-family':'system-ui','font-size':font?.size||12,'font-weight':font?.bold?700:400,'font-style':font?.italic?'italic':'normal','pointer-events':'none'},group);label.textContent=settings.text;}
   }
   if(!isLive){
    function select(e){if(tool!=='cursor')return;e.stopPropagation();selected=a.id;callbacks.onSelect?.(a);repaint();}
    group.onclick=select;
    group.onpointerdown=e=>{if(tool!=='cursor')return;const start=readPoint(e);if(!start)return;select(e);lastHit={id:a.id,x:e.clientX,y:e.clientY,at:Date.now()};if(a.locked)return;drag={a,start,old:JSON.parse(JSON.stringify(a)),before:snapshot(),changed:false};svg.style.pointerEvents='all';svg.setPointerCapture(e.pointerId);e.preventDefault();};
    if(selected===a.id&&!a.locked){
      const anchors=a.points.map((v,i)=>({point:v,index:i}));
      if(a.type==='long'||a.type==='short')anchors.push({point:{i:a.points[1].i,p:a.target||a.points[0].p+(a.type==='long'?1:-1)*2*Math.abs(a.points[0].p-a.points[1].p)},index:'target'});
      if(a.type==='channel')anchors.push({point:{i:a.points[0].i,p:a.points[0].p+(a.offset??Math.max(Math.abs(a.points[1].p-a.points[0].p)*.5,a.points[0].p*.001))},index:'offset'});
      anchors.forEach(({point:v,index:i})=>{const pos=a.anchor?{x:a.anchor.x*(host.clientWidth-65),y:a.anchor.y*(chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30)}:point(v);if(pos.x==null||pos.y==null)return;const handle=element('circle',{cx:pos.x,cy:pos.y,r:5,fill:'#15171c',stroke:'#4385ff','stroke-width':2,'data-handle':i,'pointer-events':'all'},group);handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();drag={a,i,old:JSON.parse(JSON.stringify(a)),before:snapshot(),changed:false};svg.style.pointerEvents='all';svg.setPointerCapture(e.pointerId);};});
    }
   }
  }
  function drawCalendar(){
   const active=current.indicators||[],breaks=active.includes('DAYBREAK'),weekdays=active.includes('WEEKDAYS');if(!breaks&&!weekdays)return;
   const frame=window.BacktestFrames?.selected(current)||current.interval,seconds=window.BacktestFrames?.seconds(frame)||window.BacktestFrames?.base(current);if(seconds>=86400)return;
   const bars=projection?.bars||current.candles.slice(0,current.cursor+1),zone=window.BacktestDesk?.zone?.()||'UTC',key=[current.id,current.symbol,frame,zone,bars.length,bars[0]?.t,bars.at(-1)?.t].join(':');
   if(key!==calendarKey){calendarKey=key;calendarSegments=window.BacktestStudies.daySegments(bars,zone);}
   const width=host.clientWidth-65,height=chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30,group=element('g',{'class':'bt-day-calendar','clip-path':'url(#bt-drawing-plot)','pointer-events':'none','aria-label':'Trading days in '+zone});
   for(const day of calendarSegments){const from=ts.logicalToCoordinate(day.from),to=ts.logicalToCoordinate(day.to);if(from==null||to==null||to<0||from>width)continue;
    if(breaks&&day.boundary&&from>=0&&from<=width)element('line',{x1:from,y1:0,x2:from,y2:height,stroke:'#868993','stroke-opacity':.45,'stroke-width':1,'stroke-dasharray':'3 5','data-day-break':day.date},group);
    const left=Math.max(0,from),right=Math.min(width,to),span=right-left;if(weekdays&&span>=34){const label=element('text',{x:(left+right)/2,y:height-12,fill:'#b2b5be',stroke:'#15171c','stroke-width':3,'paint-order':'stroke','text-anchor':'middle','font-size':10,'font-weight':500,'font-family':'system-ui','letter-spacing':.5,'data-weekday':day.weekday,'data-date':day.date,'aria-label':day.weekday+' '+day.date},group);label.textContent=(span>=86?day.weekday:day.weekday.slice(0,3)).toUpperCase();}
   }
  }
  function repaint(){
   if(!svg||!current)return;svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+host.clientWidth+' '+host.clientHeight);svg.style.pointerEvents=tool==='cursor'?'none':'all';const defs=element('defs',{}),clip=element('clipPath',{id:'bt-drawing-plot'},defs);element('rect',{x:0,y:0,width:Math.max(0,host.clientWidth-65),height:chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30},clip);
   drawCalendar();
   if(!hidden)for(const a of current.annotations||[])if(!a.hidden)drawAnnotation(a);
   const p=current.position||current.pending;if(p){const entry=p.entry||current.candles[current.cursor].c,i=Math.max(0,current.candles.findIndex(b=>b.t>=(p.entryTime||p.submittedAt)));drawAnnotation({type:p.side==='long'?'long':'short',points:[{i,p:entry},{i:Math.max(current.cursor+8,i+8),p:p.stop}],target:p.target},true);}
   if(pending.length){const pts=[...pending,...(hover?[hover]:[])],def=Suite.spec(tool);if(def&&pts.length>=2&&(!def.points||pts.length>=Math.max(2,def.points)))drawAnnotation({type:tool,points:pts,color:color('accent'),target:['long','short'].includes(tool)?pts[0].p+(tool==='long'?1:-1)*2*Math.abs(pts[0].p-pts[1].p):undefined},true);else for(let i=1;i<pts.length;i++){const a=point(pts[i-1]),b=point(pts[i]);element('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:color('accent'),'stroke-dasharray':'4 4','pointer-events':'none'});}for(const v of pending){const p=point(v);element('circle',{cx:p.x,cy:p.y,r:4,fill:'#131722',stroke:color('accent'),'pointer-events':'none'});}}
   if(first){const pos=point(first);if(pos.x!=null&&pos.y!=null)element('circle',{cx:pos.x,cy:pos.y,r:5,fill:color('accent'),'pointer-events':'none'});}
  }
  function readPoint(event){if(!current)return null;const rect=svg.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,mainHeight=chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30;if(x<0||x>host.clientWidth-65||y<25||y>mainHeight-5)return null;const logical=ts.coordinateToLogical(x),i=projection?projection.toBase(logical):logical,p=candles.coordinateToPrice(y);if(!Number.isFinite(i)||!Number.isFinite(p)||p<=0)return null;let result={i:Math.max(0,Math.min(current.cursor+100*Math.max(1,(window.BacktestFrames?.seconds(window.BacktestFrames.selected(current))||60)/(window.BacktestFrames?.base(current)||60)),i)),p};if(magnet){const index=Math.max(0,Math.min(current.cursor,Math.round(i))),bar=current.candles[index];result={i:index,p:[bar.o,bar.h,bar.l,bar.c].reduce((best,v)=>Math.abs(v-p)<Math.abs(best-p)?v:best,bar.o)};}return result;}
  if(svg){
   svg.onpointermove=e=>{
    const p=readPoint(e);if(!p)return;
    if(freehand){const last=pending.at(-1);if(pending.length<400&&(!last||Math.hypot(point(last).x-point(p).x,point(last).y-point(p).y)>3)){pending.push(p);repaint();}return;}
    if(!drag){if(pending.length){hover=p;repaint();}return;}
    const candidate=JSON.parse(JSON.stringify(drag.old));
    if(drag.i==='offset')candidate.offset=p.p-candidate.points[0].p;
    else if(drag.i==='target')candidate.target=p.p;
    else if(Number.isInteger(drag.i))candidate.points[drag.i]=p;
    else{const di=p.i-drag.start.i,dp=p.p-drag.start.p;candidate.points=candidate.points.map(v=>({i:v.i+di,p:v.p+dp}));if(candidate.target)candidate.target+=dp;}
    if(candidate.anchor){const now=point(p),start=drag.start?point(drag.start):point(drag.old.points[drag.i]||drag.old.points[0]),w=host.clientWidth-65,h=chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30;candidate.anchor={x:Math.max(0,Math.min(1,drag.old.anchor.x+(now.x-start.x)/w)),y:Math.max(0,Math.min(1,drag.old.anchor.y+(now.y-start.y)/h))};}
    if(!valid(candidate))return;if(!drag.changed)remember(drag.before);drag.changed=true;Object.assign(drag.a,candidate);repaint();svg.style.pointerEvents='all';
   };
   function commitDrawing(){
    const def=Suite.spec(tool);if(!def||!current||!pending.length)return;
    const points=pending.map(p=>({...p}));if(points.length===1)points.push({...points[0],i:points[0].i+(tool==='text'?8:0)});
    if(!Suite.validate({type:tool,points}))return;
    if((current.annotations||[]).length>=200){callbacks.onError?.('This session has reached 200 drawings. Remove a drawing first.');return;}
    if(!Suite.available(tool,current.candles.slice(0,current.cursor+1))){callbacks.onError?.('This tool requires real volume data in the selected history.');return;}
    if(['long','short'].includes(tool)){const distance=Math.abs(points[0].p-points[1].p);if(!distance)return;points[1].p=points[0].p+(tool==='long'?-1:1)*distance;}
    const a={id:'draw-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),type:tool,points,color:color('accent'),width:tool==='highlighter'?4:1};
    if(['long','short'].includes(tool))a.target=points[0].p+(tool==='long'?1:-1)*2*Math.abs(points[0].p-points[1].p);
    if(def.group==='notes')a.text='Note';if(tool==='fib'&&window.BacktestSettingsModel){a.settings=window.BacktestSettingsModel.defaults('fib');Object.assign(a,window.BacktestSettingsModel.canonical(a.settings));}
    if(['anchoredtext','anchorednote'].includes(tool)){const pos=point(points[0]);a.anchor={x:Math.max(0,Math.min(1,pos.x/(host.clientWidth-65))),y:Math.max(0,Math.min(1,pos.y/(chart.panes?.()[0]?.getHeight?.()||host.clientHeight-30)))};}
    if(!valid(a)){callbacks.onError?.('Choose valid positive prices for this drawing.');pending=[];first=hover=null;repaint();return;}
    remember();current.annotations??=[];current.annotations.push(a);selected=a.id;pending=[];first=hover=null;tool=keepMode&&def.group!=='notes'&&!['long','short'].includes(a.type)?a.type:'cursor';callbacks.onChange?.();callbacks.onDrawing?.(a);callbacks.onSelect?.(a);repaint();
   }
   svg.onpointerdown=e=>{if(!['brush','highlighter'].includes(tool))return;const p=readPoint(e);if(!p)return;pending=[p];first=p;freehand=e.pointerId;svg.setPointerCapture(e.pointerId);e.preventDefault();};
   svg.onpointerup=e=>{if(freehand!==null){freehand=null;try{svg.releasePointerCapture(e.pointerId);}catch(_){}if(pending.length>1)commitDrawing();else{pending=[];first=null;repaint();}suppressClick=true;return;}if(!drag)return;const ended=drag,edited=drag.changed;drag=null;suppressClick=edited;try{svg.releasePointerCapture(e.pointerId);}catch(_){}if(edited)callbacks.onChange?.();repaint();if(!edited&&ended.i===undefined){const now=Date.now(),twice=lastTap&&lastTap.id===ended.a.id&&now-lastTap.at<400&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<5;lastTap={id:ended.a.id,at:now,x:e.clientX,y:e.clientY};if(twice){lastTap=null;callbacks.onSettings?.(ended.a);}}else lastTap=null;};
   svg.onpointercancel=()=>{freehand=null;drag=null;pending=[];first=hover=null;repaint();};
   svg.onclick=e=>{if(suppressClick){suppressClick=false;return;}if(drag||freehand!==null)return;if(tool==='cursor'){if(e.target===svg&&!(lastHit&&Date.now()-lastHit.at<500&&Math.hypot(e.clientX-lastHit.x,e.clientY-lastHit.y)<5)){selected=null;callbacks.onSelect?.(null);repaint();}return;}const p=readPoint(e),def=Suite.spec(tool);if(!p||!def||['brush','highlighter'].includes(tool))return;
    if(e.detail>1&&!def.points)return;pending.push(p);first=pending[0];hover=null;
    if(def.points&&pending.length>=def.points)commitDrawing();else repaint();
   };
   svg.ondblclick=e=>{if(tool==='cursor'){const hit=lastHit&&Date.now()-lastHit.at<500&&Math.hypot(e.clientX-lastHit.x,e.clientY-lastHit.y)<5&&current?.annotations?.find(a=>a.id===lastHit.id);if(hit){e.preventDefault();selected=hit.id;callbacks.onSelect?.(hit);callbacks.onSettings?.(hit);}return;}if(!Suite.spec(tool)?.points&&pending.length>=2){e.preventDefault();commitDrawing();}};
   ts.subscribeVisibleLogicalRangeChange?.(()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(repaint);});
  }
  chart.subscribeCrosshairMove(p=>{const b=p.seriesData.get(candles);onCrosshair((b&&projection?.bars.find(row=>row.t===b.time))||current?.candles[current.cursor]);});
  chart.subscribeClick(p=>{if(!p.point||tool!=='cursor')return;const value=candles.coordinateToPrice(p.point.y);if(Number.isFinite(value)&&value>0)onLevel(value);});
  function updateStudies(s){
   if(!Lab)return;const bars=s.candles.slice(0,s.cursor+1),rows=[];let oscillator=0;
   for(const key of s.indicators||[]){if(['SMA20','DAYBREAK','WEEKDAYS'].includes(key))continue;const definition=window.BacktestStudies.get(key);if(!definition||window.BacktestStudies.unavailable(key,bars))continue;const pane=definition.pane?++oscillator:0;
    let channels=window.BacktestStudies.calculate(bars,key);
    if(!channels.length){const period=Number(key.match(/\d+/)?.[0]||20);channels=key==='BB20'?[{key:'BB Upper',data:Lab.study(bars,'BB',20),color:'#4ba1fa'},{key:'BB Basis',data:Lab.study(bars,'SMA',20),color:'#6b8bb0'},{key:'BB Lower',data:Lab.study(bars,'BBLOW',20),color:'#4ba1fa'}]:[{key,data:Lab.study(bars,key.startsWith('EMA')?'EMA':key.startsWith('RSI')?'RSI':'ATR',period),color:'#b18cff'}];}
    channels.forEach(c=>rows.push({...c,key:key+':'+c.key,pane}));
   }
   const wanted=new Set(rows.map(r=>r.key));for(const [key,series] of extra)if(!wanted.has(key)){chart.removeSeries(series);extra.delete(key);}
   for(const row of rows){if(!extra.has(row.key))extra.set(row.key,chart.addSeries(L.LineSeries,{color:row.color||'#59c5c8',lineWidth:1,priceLineVisible:false,lastValueVisible:true,title:row.key},row.pane));const series=extra.get(row.key);series.moveToPane?.(row.pane);series.setData(row.data);}
  }
  return {
   render(s,showMA,barsVisible){
    const kind=['candles','hollow','bars','line','area'].includes(s.chartType)?s.chartType:'candles';if(kind!==renderKind){markers?.detach?.();chart.removeSeries(candles);lines=[];candles=priceSeries(kind);markers=L.createSeriesMarkers?L.createSeriesMarkers(candles,[]):null;renderKind=kind;}
    current=s;lastMA=showMA;projection=window.BacktestFrames?.project(s)||{bars:s.candles.slice(0,s.cursor+1),toDisplay:i=>i,toBase:i=>i,bucket:t=>t};
    const bars=projection.bars,shown={...s,candles:bars,cursor:bars.length-1},identity=s.id+':'+s.symbol+':'+(s.viewTimeframe||s.interval)+':'+renderKind,changed=previous!==s.cursor||sessionId!==identity;
    const precision=s.candles[s.cursor].c<20?5:s.candles[s.cursor].c<1000?3:2;candles.applyOptions({priceFormat:{type:'price',precision,minMove:10**-precision}});
    candles.setData(bars.map(b=>['line','area'].includes(renderKind)?{time:b.t,value:b.c}:mapped(b)));ma.setData(bars.slice(19).map((_,i)=>average(shown,i+19)));
    ma.applyOptions({visible:showMA||(s.indicators||[]).includes('SMA20')});updateStudies(shown);
    for(const line of lines)candles.removePriceLine(line);lines=[];
    const level=(value,title,c)=>lines.push(candles.createPriceLine({price:value,color:c,lineWidth:1,lineStyle:L.LineStyle.Dashed,axisLabelVisible:true,title}));
    for(const value of (hidden?[]:s.drawings))level(value,'Level',color('accent'));
    const p=s.position||s.pending;if(p){if(p.entry)level(p.entry,s.position?'Entry':'Queued',color('muted'));level(p.stop,'SL',color('down'));level(p.target,'TP',color('up'));}
    if(changed||visible!==barsVisible)ts.setVisibleLogicalRange({from:Math.max(-.5,bars.length-barsVisible),to:bars.length+7});
    if(markers){const rows=s.trades.filter(t=>!t.symbol||t.symbol===s.symbol).flatMap(t=>[{time:projection.bucket(t.entryTime),position:t.side==='long'?'belowBar':'aboveBar',color:'#4385ff',shape:t.side==='long'?'arrowUp':'arrowDown',text:t.side==='long'?'Buy':'Sell'},{time:projection.bucket(t.exitTime),position:'aboveBar',color:t.pnl>=0?'#45d5a2':'#ff7484',shape:'circle',text:t.pnl>=0?'Win':'Loss'}]);if(s.position)rows.push({time:projection.bucket(s.position.entryTime),position:'belowBar',color:'#4385ff',shape:'arrowUp',text:s.position.side==='long'?'Buy':'Sell'});markers.setMarkers(rows.sort((a,b)=>a.time-b.time));}
    previous=s.cursor;sessionId=identity;visible=barsVisible;onCrosshair(bars.at(-1));repaint();
   },
   tool(value){if(value!=='cursor'&&!Suite.available(value,current?.candles.slice(0,current.cursor+1)||[])){callbacks.onError?.('This tool requires real volume data in the selected history.');return false;}tool=value;pending=[];freehand=null;first=null;hover=null;selected=null;suppressClick=false;callbacks.onSelect?.(null);repaint();return true;},
   keep(value){keepMode=!!value;return keepMode;},
   currentTool(){return tool;},
   allLocked(){return !!current?.annotations?.length&&current.annotations.every(a=>a.locked);},
   lockAll(){if(!current?.annotations?.length)return false;const locked=!current.annotations.every(a=>a.locked);remember();current.annotations.forEach(a=>a.locked=locked);changed();callbacks.onSelect?.(this.selected());return locked;},
   magnet(){magnet=!magnet;return magnet;},
   hide(){hidden=!hidden;if(current)this.render(current,lastMA,visible);return hidden;},
   updateSelected(changes){
    const a=current?.annotations?.find(a=>a.id===selected);if(!a)return false;const M=window.BacktestSettingsModel,candidate=JSON.parse(JSON.stringify(a));
    if(changes.settings!==undefined){candidate.settings=M.clean(a.type,changes.settings);Object.assign(candidate,M.canonical(candidate.settings));}
    if(changes.levels!==undefined){candidate.levels=window.BacktestEngine.cleanFibLevels(changes.levels);if(candidate.settings?.levels){const colors=new Map(candidate.settings.levels.map(r=>[r.v,r.c]));candidate.settings.levels=candidate.levels.map(v=>({v,c:colors.get(v)||candidate.color,on:true}));}}
    for(const k of ['extendLeft','extendRight','showPrices'])if(typeof changes[k]==='boolean'){candidate[k]=changes[k];if(candidate.settings)candidate.settings[k]=changes[k];}
    if(/^#[0-9a-f]{6}$/i.test(changes.color)){candidate.color=changes.color;for(const key of ['line','levelsLine'])if(candidate.settings?.[key])candidate.settings[key].color=changes.color;if(candidate.settings?.color)candidate.settings.color=changes.color;if(candidate.settings?.levels)candidate.settings.levels.forEach(r=>r.c=changes.color);}
    if([1,2,3,4].includes(changes.width)){candidate.width=changes.width;for(const key of ['line','levelsLine'])if(candidate.settings?.[key])candidate.settings[key].width=changes.width;}
    if(['solid','dashed','dotted'].includes(changes.dash)){candidate.dash=changes.dash;for(const key of ['line','levelsLine'])if(candidate.settings?.[key])candidate.settings[key].dash=changes.dash;}
    for(const key of ['hidden','locked'])if(typeof changes[key]==='boolean')candidate[key]=changes[key];
    if(typeof changes.text==='string'){candidate.text=changes.text.slice(0,200);if(candidate.settings)candidate.settings.text=candidate.text;}
    if(changes.points!==undefined)candidate.points=changes.points.map(p=>({i:Number(p.i),p:Number(p.p)}));
    for(const key of ['target','offset'])if(changes[key]!==undefined){if(!Number.isFinite(changes[key]))throw Error('Enter a valid '+key+'.');candidate[key]=changes[key];}
    if(changes.anchor!==undefined){if(![changes.anchor.x,changes.anchor.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Anchor positions must be between 0 and 100%.');candidate.anchor={...changes.anchor};}
    if(changes.visibility!==undefined){const value=M.visibility(changes.visibility);if(value===null)delete candidate.visibility;else candidate.visibility=value;}
    const geometryValid=Suite?.validate?Suite.validate(candidate):window.BacktestEngine.cleanAnnotations([candidate]).length===1;
    if(!geometryValid||!valid(candidate))throw Error('Use valid drawing coordinates and position levels.');
    remember();if(!Object.hasOwn(candidate,'visibility'))delete a.visibility;Object.assign(a,candidate);changed();callbacks.onSelect?.(a);return true;
   },
   selected(){return current?.annotations?.find(a=>a.id===selected)||null;},
   clear(){if(!current)return;remember();current.annotations=[];current.drawings=[];selected=null;callbacks.onSelect?.(null);changed();},
   deleteSelected(){if(!selected||!current)return false;remember();current.annotations=current.annotations.filter(a=>a.id!==selected);selected=null;callbacks.onSelect?.(null);changed();return true;},
   undo(){if(!current)return;const h=histories.get(current.id+':'+current.symbol);if(h?.length){const key=current.id+':'+current.symbol,redo=redos.get(key)||[];redo.push(snapshot());redos.set(key,redo);const previous=JSON.parse(h.pop());current.annotations=previous.annotations;current.drawings=previous.drawings;selected=null;callbacks.onSelect?.(null);changed();}},
   redo(){if(!current)return;const key=current.id+':'+current.symbol,r=redos.get(key);if(!r?.length)return;const h=histories.get(key)||[];h.push(snapshot());histories.set(key,h);const next=JSON.parse(r.pop());current.annotations=next.annotations;current.drawings=next.drawings;selected=null;callbacks.onSelect?.(null);changed();},
   selectDrawing(id){const a=current?.annotations?.find(a=>a.id===id);if(!a)return false;selected=id;callbacks.onSelect?.(a);repaint();return true;},
   removeLevel(index){if(!current||!Number.isInteger(index)||index<0||index>=current.drawings.length)return false;remember();current.drawings.splice(index,1);changed();return true;},
   zoom(){const range=ts.getVisibleLogicalRange();if(range){const center=(range.from+range.to)/2,half=(range.to-range.from)/4;ts.setVisibleLogicalRange({from:center-half,to:center+half});}},
   fit(){ts.fitContent();},
   async image(){const canvas=chart.takeScreenshot();if(svg){const data=new XMLSerializer().serializeToString(svg),url=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'})),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}}return canvas.toDataURL('image/png');},
   destroy(){observer?.disconnect();if(frame)cancelAnimationFrame(frame);markers?.detach();chart.remove();}
  };
 };
})();
