/* Validated adapter between the supplied settings catalog and replay drawings. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./backtest-settings-schemas.js'):root.BacktestSettingsSchemas,node?require('./backtest-drawing-suite.js'):root.BacktestDrawingSuite);if(node)module.exports=api;else root.BacktestSettingsModel=api;})(typeof window==='object'?window:globalThis,function(Catalog,Suite){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v)),hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v),finite=v=>typeof v==='number'&&Number.isFinite(v),frames=['1m','3m','5m','15m','30m','45m','1H','2H','3H','4H','6H','8H','12H','1D','1W','1M'];
 const aliases={trend:'trendline',info:'infoline',extended:'extendedline',angle:'trendangle',horizontal:'horizontalline',vertical:'verticalline',channel:'parallelchannel',regression:'regressiontrend',flattop:'flattopbottom',disjoint:'disjointchannel',schiff:'schiffpitchfork',insidefork:'insidepitchfork',fib:'fibretracement',fibext:'fibextension',long:'longposition',short:'shortposition',rotatedrect:'rotatedrectangle',flag:'flagmark',avwap:'anchoredvwap',anchorednote:'note',measure:'datepricerange'};
 const line=(key='line',label='Line')=>({type:'line',key,label,toggle:false,def:{on:true,color:'#2962ff',width:1,dash:'solid'}});
 const font=(key='font')=>({type:'font',key,label:'Text style',def:{color:'#d1d4dc',size:12,bold:false,italic:false}});
 function source(id){const d=Suite.spec(id),key=d?.glyph?(d.category==='sticker'?'sticker':d.category==='symbol'?'icon':'emoji'):aliases[id]||id;return Catalog.SCHEMAS[key]||{title:d?.label||'Drawing',style:[line()]};}
 function fields(id){
  const d=Suite.spec(id),s=source(id);if(id==='fib')return s.style;
  if(d?.glyph)return s.style.filter(f=>['size','color'].includes(f.key));
  const allowed=new Set(['line','color']);if(d?.group==='shapes'&&['rectangle','rotatedrect','circle','ellipse','triangle','arc'].includes(id)||d?.group==='notes'||['measure','pricerange','daterange'].includes(id))allowed.add('background');
  if(d?.group==='notes'){['font','text','align','wrap'].forEach(k=>allowed.add(k));}
  if(['long','short'].includes(id)){allowed.add('profit');allowed.add('loss');}
  if(id==='highlighter'){allowed.add('width');allowed.add('opacity');}
  if(id==='brush')allowed.add('capStyle');
  const result=[...s.style,...(s.text||[])].filter(f=>f.key&&allowed.has(f.key));
  if(!result.some(f=>f.key==='line'||f.key==='color')&&id!=='highlighter')result.unshift(line());
  if(d?.group==='notes'&&!result.some(f=>f.type==='font'))result.push(font());
  if(d?.group!=='notes'&&(s.text||[]).length){result.push({type:'text',key:'text',label:'Text',def:''},font('textFont'));}
  return result;
 }
 const extraFib=[-.27,1.414,2.272,2.414,2,3,3.272,3.414,4,4.272,4.414,4.618,4.764];
 function defaults(id){const out={};for(const f of fields(id))if(f.def!==undefined)out[f.key]=copy(f.def);if(id==='fib'){const seen=new Set(out.levels.map(r=>r.v)),colors=['#f23645','#ff9800','#089981','#2962ff','#9c27b0'];extraFib.forEach((v,i)=>{if(!seen.has(v))out.levels.push({v,c:colors[i%colors.length],on:false});});}return out;}
 function number(value,min,max,label){if(value===''||value==null||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max)throw Error(label+' must be between '+min+' and '+max+'.');return Number(value);}
 function color(value,label){if(!hex(value))throw Error('Choose a valid '+label.toLowerCase()+' color.');return value;}
 function levels(rows){if(!Array.isArray(rows)||rows.length<1||rows.length>48)throw Error('Use 1–48 Fibonacci level rows.');const unique=new Map();for(const row of rows){const v=number(row.v,-10,10,'Level'),r={v,c:color(row.c,'level'),on:row.on===true},old=unique.get(v);unique.set(v,old?{...r,on:old.on||r.on}:r);}return [...unique.values()];}
 function clean(id,raw){if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid drawing settings.');const out={};for(const f of fields(id)){if(!Object.hasOwn(raw,f.key))continue;const v=raw[f.key];switch(f.type){
  case 'line':if(!v||typeof v!=='object')throw Error('Invalid line settings.');out[f.key]={on:v.on!==false,color:color(v.color,f.label),width:number(v.width,1,4,'Line width'),dash:['solid','dashed','dotted'].includes(v.dash)?v.dash:'solid'};break;
  case 'fill':if(!v||typeof v!=='object')throw Error('Invalid fill settings.');out[f.key]={on:v.on!==false,color:color(v.color||f.def.color,f.label),opacity:number(v.opacity,0,1,'Opacity')};break;
  case 'font':if(!v||typeof v!=='object')throw Error('Invalid text settings.');out[f.key]={color:color(v.color,'text'),size:number(v.size,8,72,'Font size'),bold:v.bold===true,italic:v.italic===true};break;
  case 'levels':out[f.key]=levels(v);break;
  case 'check':out[f.key]=v===true;break;
  case 'color':out[f.key]=color(v,f.label);break;
  case 'number':out[f.key]=number(v,f.min??-1e8,f.max??1e8,f.label);break;
  case 'select':if(!f.options.includes(v))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=v;break;
  case 'text':out[f.key]=String(v??'').slice(0,200);break;
 }}return out;}
 function saved(id,raw){try{return clean(id,raw);}catch(_){return {};}}
 function fromAnnotation(a){const out=defaults(a.type),existing=saved(a.type,a.settings);for(const key of ['line','levelsLine'])if(out[key])out[key]={...out[key],color:a.color||out[key].color,width:a.width||out[key].width,dash:a.dash||out[key].dash};if(out.color)out.color=a.color||out.color;if(out.text!==undefined)out.text=a.text==='Note'&&Suite.spec(a.type)?.group!=='notes'?'':a.text||'';
  if(a.type==='fib'){const values=a.levels||[0,.236,.382,.5,.618,.786,1],seen=new Set(out.levels.map(r=>r.v));out.levels=out.levels.map(r=>({...r,on:values.includes(r.v),c:a.color||r.c}));for(const v of values)if(!seen.has(v))out.levels.push({v,c:a.color||'#f8c344',on:true});for(const k of ['extendLeft','extendRight'])out[k]=!!a[k];out.showPrices=a.showPrices!==false;}
  if(a.type==='highlighter'){out.width=14;out.opacity=.28;}if(Suite.spec(a.type)?.group==='notes'&&out.font)out.font={...out.font,color:a.color||out.font.color,size:a.type==='text'?10:11};if(Suite.spec(a.type)?.glyph)out.size=Suite.spec(a.type).category==='sticker'?38:26;return {...out,...existing};
 }
 function visibility(raw){if(raw==null)return null;if(!Array.isArray(raw)||raw.length>frames.length||raw.some(k=>!frames.includes(k)))throw Error('Choose valid chart timeframes.');return [...new Set(raw)];}
 function canonical(settings){const line=settings.line||settings.levelsLine,out={};if(line){out.color=line.color;out.width=line.width;out.dash=line.dash;}if(settings.color)out.color=settings.color;if(typeof settings.text==='string')out.text=settings.text;for(const k of ['extendLeft','extendRight','showPrices'])if(typeof settings[k]==='boolean')out[k]=settings[k];return out;}
 function audit(){const issues=[];for(const [id,s] of Object.entries(Catalog.SCHEMAS))for(const f of [...s.style,...(s.inputs||[]),...(s.text||[])])if(f.type==='levels'&&new Set(f.def.map(r=>r.v)).size!==f.def.length)issues.push({id,problem:'Duplicate Fibonacci ratios are normalized by the adapter.'});for(const d of Suite.specs.values()){const labels=source(d.id).pointLabels;if(labels&&d.points>1&&labels.length!==d.points)issues.push({id:d.id,problem:'Coordinates use actual chart anchors instead of the supplied point-label count.'});}return issues;}
 return {fields,source,defaults,clean,saved,fromAnnotation,visibility,canonical,frames,levels,audit};
});
