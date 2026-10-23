/* UTC chart aggregation. Only the revealed source prefix enters a display candle. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BacktestFrames=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const choices=[['1m',60],['3m',180],['5m',300],['15m',900],['30m',1800],['45m',2700],['1H',3600],['2H',7200],['3H',10800],['4H',14400],['6H',21600],['8H',28800],['12H',43200],['1D',86400],['1W',604800],['1M',2678400]];
 function seconds(label){const match=choices.find(([key])=>key.toLowerCase()===String(label).toLowerCase()&&!(key==='1M'&&label==='1m'));return label==='1M'?2678400:match?.[1];}
 function base(s){const value=seconds(s.interval);if(value)return value;const gaps=s.candles.slice(1,100).map((b,i)=>b.t-s.candles[i].t).sort((a,b)=>a-b);return gaps[Math.floor(gaps.length/2)]||60;}
 function available(s,key){const n=seconds(key),b=base(s);return n>=b&&(key==='1M'?(b<=86400&&86400%b===0):n%b===0);}
 function selected(s){return available(s,s.viewTimeframe)?s.viewTimeframe:choices.find(([,n])=>n===base(s))?.[0]||'source';}
 function bucket(t,key){if(key==='1M'){const d=new Date(t*1000);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)/1000;}const n=seconds(key);if(!n)return t;const offset=key==='1W'?345600:0;return Math.floor((t-offset)/n)*n+offset;}
 function project(s,key=selected(s)){
  if(!available(s,key)||seconds(key)===base(s))return {bars:s.candles.slice(0,s.cursor+1),toDisplay:i=>i,toBase:i=>i,bucket:t=>t};
  const bars=[],starts=[];
  for(let i=0;i<=s.cursor;i++){const b=s.candles[i],t=bucket(b.t,key),last=bars.at(-1);if(last?.t===t){last.h=Math.max(last.h,b.h);last.l=Math.min(last.l,b.l);last.c=b.c;if(Number.isFinite(last.v)&&Number.isFinite(b.v))last.v+=b.v;else delete last.v;}else{starts.push(i);bars.push({...b,t});}}
  const ratio=seconds(key)/base(s),last=starts.length-1;
  function toDisplay(i){if(i>=starts[last])return last+(i-starts[last])/ratio;let lo=0,hi=last;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(starts[mid]<=i)lo=mid;else hi=mid-1;}return lo+(i-starts[lo])/(starts[lo+1]-starts[lo]);}
  function toBase(i){const k=Math.floor(i);if(k<0)return starts[0]+i*ratio;if(k>=last)return starts[last]+(i-last)*ratio;return starts[k]+(i-k)*(starts[k+1]-starts[k]);}
  return {bars,toDisplay,toBase,bucket:t=>bucket(t,key)};
 }
 function historyStart(start,interval){if(!start)return '';const t=Date.parse(start+'Z');if(!Number.isFinite(t)||!seconds(interval))throw Error('Choose a valid history start and interval.');return new Date(t).toISOString().slice(0,16);}
 function coverage(s,key=selected(s)){
  function count(frame){let n=0,last;for(let i=0;i<=s.cursor;i++){const t=bucket(s.candles[i].t,frame);if(t!==last){n++;last=t;}}return n;}
  const candles=count(key),candidates=choices.filter(([frame,n])=>available(s,frame)&&n<(seconds(key)||base(s))).reverse();
  const recommended=candles<30?(candidates.find(([frame])=>count(frame)>=30)?.[0]||null):null;
  return {candles,recommended,first:s.candles[0].t,revealed:s.candles[s.cursor].t,last:s.candles.at(-1).t};
 }
 return {choices,seconds,base,available,selected,bucket,project,historyStart,coverage};
});
