/* Deterministic, offline bar replay. All fills are simulated, never broker orders.
   The cursor identifies the last revealed CLOSED candle. New orders are first
   eligible on the next candle, so its close cannot be used as a known fill. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./backtest-drawing-suite.js') : root.BacktestDrawingSuite, typeof module === 'object' && module.exports ? require('./backtest-studies.js') : root.BacktestStudies, typeof module === 'object' && module.exports ? require('./backtest-settings-model.js') : root.BacktestSettingsModel);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BacktestEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Suite, Studies, Settings) {
  'use strict';
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const id = () => 'bt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  const strategyCopy = s => s && typeof s === 'object' ? {...Object.fromEntries(['name','description','setup','entry','exit','risk'].map(k=>[k,String(s[k] || '').slice(0,2000)])),color:/^#[0-9a-f]{6}$/i.test(s.color)?s.color:'#4385ff',checklist:Array.isArray(s.checklist)?s.checklist.map(x=>String(x).slice(0,200)).filter(Boolean).slice(0,20):[]} : null;
  const tradeKey=t=>[t.symbol || '',t.entryTime,t.exitTime,t.side].join(':');
  function cleanFibLevels(raw){const values=Array.isArray(raw)?raw:typeof raw==='string'?raw.split(',').map(x=>x.trim()):[];if(values.length<2||values.length>20||values.some(x=>x===''||!Number.isFinite(Number(x))||Math.abs(Number(x))>10))throw Error('Use 2–20 comma-separated levels between -10 and 10.');const levels=[...new Set(values.map(Number))].sort((a,b)=>a-b);if(levels.length<2)throw Error('Use at least two distinct levels.');return levels;}
  function savedFibLevels(raw){try{return cleanFibLevels(raw);}catch(_){return [0,.236,.382,.5,.618,.786,1];}}
  function cleanAnnotations(rows){return Array.isArray(rows)?rows.filter(a=>Suite.validate(a)).slice(0,200).map(a=>({id:/^[\w-]{1,100}$/.test(a.id)?a.id:id(),type:a.type,...(a.settings&&typeof a.settings==='object'?{settings:Settings.saved(a.type,a.settings)}:{}),...(Array.isArray(a.visibility)?{visibility:a.visibility.filter(x=>Settings.frames.includes(x)).slice(0,16)}:{}),...(a.type==='fib'?{levels:savedFibLevels(a.levels),extendLeft:!!a.extendLeft,extendRight:!!a.extendRight,showPrices:a.showPrices!==false}:{}),points:a.points.map(p=>({i:p.i,p:p.p})),color:/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#f8c344',width:[1,2,3,4].includes(a.width)?a.width:2,dash:['solid','dashed','dotted'].includes(a.dash)?a.dash:'solid',...(finite(a.offset)?{offset:a.offset}:{}),...(a.anchor&&[a.anchor.x,a.anchor.y].every(n=>finite(n)&&n>=0&&n<=1)?{anchor:{x:a.anchor.x,y:a.anchor.y}}:{}),hidden:!!a.hidden,locked:!!a.locked,text:String(a.text||'Note').slice(0,200),...(finite(a.target)&&a.target>0?{target:a.target}:{})})):[];}
  function cleanChallenge(c){if(!c || typeof c!=='object')return null;const rule={name:String(c.name || 'Practice challenge').slice(0,80),targetPct:Number(c.targetPct),dailyLossPct:Number(c.dailyLossPct),maxLossPct:Number(c.maxLossPct),minDays:Number(c.minDays),trailing:!!c.trailing};if(![rule.targetPct,rule.dailyLossPct,rule.maxLossPct].every(n=>finite(n)&&n>0&&n<=100)||!Number.isInteger(rule.minDays)||rule.minDays<1||rule.minDays>100)throw Error('Invalid practice challenge rules.');return rule;}
  function challengeState(s,marked=unrealized(s)){
    if(!s.challenge)return null;const r=s.challenge;let peak=s.startBalance,day=null,dayBase=s.startBalance,last=s.startBalance,failed=null;
    for(const e of s.equity){const d=new Date(e.t*1000).toISOString().slice(0,10);if(d!==day){day=d;dayBase=last;}peak=Math.max(peak,e.value);const floor=(r.trailing?peak:s.startBalance)-s.startBalance*r.maxLossPct/100;
      if(!failed && e.value<=floor)failed='Maximum loss limit';if(!failed && e.value<=dayBase-s.startBalance*r.dailyLossPct/100)failed='Daily loss limit';last=e.value;}
    const days=new Set([...s.trades.map(t=>t.entryTime),...(s.position?[s.position.entryTime]:[])].map(t=>new Date(t*1000).toISOString().slice(0,10))).size;
    const equity=s.balance+marked,target=s.startBalance*(1+r.targetPct/100),passed=!failed&&!s.position&&!s.pending&&equity>=target&&days>=r.minDays;
    return {status:failed?'failed':passed?'passed':'active',reason:failed||'',days,target,equity,profitPct:(equity/s.startBalance-1)*100,dailyLoss:Math.max(0,dayBase-equity),dailyLimit:s.startBalance*r.dailyLossPct/100,maxFloor:(r.trailing?peak:s.startBalance)-s.startBalance*r.maxLossPct/100};
  }
  function validateBars(bars, minimum = 60) {
    if (!Array.isArray(bars) || bars.length < minimum || bars.length > 10000) throw Error(`Use ${minimum}-10,000 candles.`);
    let previous = -Infinity;
    return bars.map((b, i) => {
      const row = {t: Number(b.t), o: Number(b.o), h: Number(b.h), l: Number(b.l), c: Number(b.c)};
      if (!Object.values(row).every(finite) || row.t <= previous || !Number.isInteger(row.t) || row.t < 0 || row.t > 253402300799 ||
          !(0 < row.l && row.l <= Math.min(row.o, row.c) && Math.max(row.o, row.c) <= row.h)) throw Error(`Invalid or duplicate OHLC row ${i + 1}.`);
      if (b.v !== undefined && b.v !== null && b.v !== '') { if (!Number.isFinite(Number(b.v)) || Number(b.v)<0) throw Error(`Invalid volume row ${i+1}.`); row.v=Number(b.v); }
      previous = row.t;
      return row;
    });
  }
  function csvRows(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { if (quoted && text[i+1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i+1] === '\n') i++;
        row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw Error('Unclosed quoted CSV field.');
    row.push(cell); if (row.some(v => v.trim())) rows.push(row);
    return rows;
  }
  function parseCSV(text) {
    if (text.length > 2500000) throw Error('CSV must be smaller than 2.5 MB.');
    const rows = csvRows(text.replace(/^\uFEFF/, ''));
    return parseCSVRecords(rows);
  }
  function parseCSVRecords(records, minimum = 60) {
    const rows=records.slice();
    if (!rows.length) throw Error('The CSV is empty.');
    const header = rows.shift().map(v => v.trim().toLowerCase());
    const index = names => header.findIndex(v => names.includes(v));
    const columns = [index(['t','time','timestamp','datetime','date']), index(['o','open']), index(['h','high']), index(['l','low']), index(['c','close'])];
    if (columns.some(i => i < 0)) throw Error('CSV needs time/date, open, high, low and close columns.');
    const bars = rows.map((r, i) => {
      const raw = String(r[columns[0]] || '').trim(); let t;
      if (/^\d+(\.\d+)?$/.test(raw)) { const n = Number(raw); t = Math.floor(n > 1e11 ? n/1000 : n); }
      else {
        // Explicit UTC for timezone-free files; never inherit the computer timezone.
        const iso = raw.replace(' ', 'T');
        if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/.test(iso)) throw Error(`Unrecognized timestamp in CSV row ${i+2}. Use ISO dates or Unix time.`);
        const calendar = new Date(iso.slice(0,10)+'T00:00:00Z');
        if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0,10)!==iso.slice(0,10)) throw Error(`Invalid calendar date in CSV row ${i+2}.`);
        t = Date.parse(iso + (/Z$|[+-]\d{2}:?\d{2}$/.test(iso) || !iso.includes('T') ? '' : 'Z')) / 1000;
      }
      const values = columns.slice(1).map(j => r[j] == null || !r[j].trim() ? NaN : Number(r[j]));
      const vi=index(['v','volume','tick_volume','tick volume']);return {t, o:values[0], h:values[1], l:values[2], c:values[3],...(vi>=0&&r[vi]?.trim()?{v:Number(r[vi])}:{})};
    }).sort((a,b) => a.t-b.t);
    return validateBars(bars, minimum);
  }
  function createSession(options, bars) {
    const candles = validateBars(bars);
    const fxMode=options.fxMode===undefined?'fixed':options.fxMode;if(!['fixed','inverse'].includes(fxMode))throw Error('Unsupported USD conversion model.');if(fxMode==='inverse'&&!/^USD[A-Z]{3}$/.test(String(options.symbol||'')))throw Error('Inverse conversion requires a USD-base forex pair.');
    const balance = Number(options.startBalance), multiplier = Number(options.multiplier), fee = Number(options.fee || 0), slippage = Number(options.slippage || 0);
    if (!finite(balance) || balance <= 0 || balance > 1e9 || !finite(multiplier) || multiplier <= 0 || multiplier > 1e9 || !finite(fee) || fee < 0 || !finite(slippage) || slippage < 0) throw Error('Check balance, cash multiplier, fees and slippage.');
    const cursor = Math.max(29, Math.min(candles.length-2, Number.isInteger(options.cursor) ? options.cursor : Math.min(99, Math.max(29,candles.length-31))));
    return {id:id(), name:String(options.name || options.symbol || 'Replay').slice(0,80), symbol:String(options.symbol || 'CUSTOM').slice(0,64), interval:String(options.interval || 'CSV').slice(0,12), source:String(options.source || 'User-imported CSV').slice(0,180), strategyId:String(options.strategyId || ''), strategySnapshot:strategyCopy(options.strategySnapshot), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), startBalance:balance, balance, multiplier, fxMode, chartType:['candles','hollow','bars','line','area'].includes(options.chartType)?options.chartType:'candles', fee, slippage, candles, cursor, initialCursor:cursor, position:null, pending:null, trades:[], equity:[{t:candles[cursor].t, value:balance}], notes:'',description:String(options.description||'').slice(0,2000),challenge:cleanChallenge(options.challenge),annotations:[],reviews:{},indicators:['DAYBREAK','WEEKDAYS'],checklist:[],drawings:[],actions:[],notice:''};
  }
  function placeOrder(s, order, availableEquity) {
    if(s.challenge && challengeState(s).status!=='active')throw Error('This practice challenge has finished. Start a new attempt.');
    if ((Number.isFinite(availableEquity)?availableEquity:s.balance + unrealized(s)) <= 0) throw Error('The simulated account has no positive equity. Start another session.');
    if (s.cursor >= s.candles.length-1) throw Error('Replay finished. Create a new session to trade again.');
    if (s.position || s.pending) throw Error('Close or cancel the current order before placing another.');
    const quantity = Number(order.quantity), stop = Number(order.stop), target = Number(order.target);
    const type = order.type || 'market', side = order.side;
    const entry = type === 'market' ? null : Number(order.entry);
    if (!['long','short'].includes(side) || !['market','limit','stop'].includes(type) || !finite(quantity) || quantity <= 0 || quantity > 1e9 || !finite(stop) || stop <= 0 || !finite(target) || target <= 0 || (type !== 'market' && (!finite(entry) || entry <= 0))) throw Error('Enter a valid side, quantity, stop and target.');
    const reference = entry || s.candles[s.cursor].c;
    if (side === 'long' ? !(stop < reference && reference < target) : !(target < reference && reference < stop)) throw Error('Long orders need stop < entry < target; short orders need target < entry < stop.');
    s.pending = {id:id(), side, type, quantity, stop, target, entry, submittedAt:s.candles[s.cursor].t};
    s.actions.push({cursor:s.cursor, kind:'order', order:{side,type,quantity,stop,target,entry}});
    s.notice = 'Order queued. First eligible on the next candle.';
  }
  function cashMultiplier(s, price=s.candles[s.cursor].c) {
    if(s.fxMode==='inverse'){if(!finite(price)||price<=0)throw Error('Invalid conversion price.');return 1/price;}return s.multiplier;
  }
  function unrealized(s) {
    if (!s.position) return 0;
    const p = s.position, sign = p.side === 'long' ? 1 : -1;
    return sign * (s.candles[s.cursor].c-p.entry)*p.quantity*cashMultiplier(s);
  }
  function closePosition(s, price, time, reason) {
    const p = s.position; if (!p) return;
    const sign = p.side === 'long' ? 1 : -1;
    const exit = Math.max(Number.EPSILON, price-(reason === 'Target' ? 0 : sign*s.slippage));
    const gross = sign*(exit-p.entry)*p.quantity*cashMultiplier(s,exit);
    const exitFee = s.fee*p.quantity;
    const pnl = gross - 2*exitFee;
    s.balance += gross - exitFee; // Entry fee was deducted at fill.
    s.trades.push({...p, exit, exitTime:time, reason, gross, fees:2*exitFee, pnl, r:p.riskCash > 0 ? pnl/p.riskCash : null});
    s.position = null;
  }
  function processBracket(s, bar, allowTarget) {
    const p = s.position; if (!p) return;
    const long = p.side === 'long';
    // Stops gap at the opening price; profitable limits fill at their limit.
    if (long ? bar.o <= p.stop : bar.o >= p.stop) return closePosition(s,bar.o,bar.t,'Stop gap');
    if (allowTarget && (long ? bar.o >= p.target : bar.o <= p.target)) return closePosition(s,p.target,bar.t,'Target');
    const stopped = long ? bar.l <= p.stop : bar.h >= p.stop;
    const targeted = long ? bar.h >= p.target : bar.l <= p.target;
    if (stopped) closePosition(s,p.stop,bar.t,targeted ? 'Stop first (ambiguous bar)' : 'Stop');
    else if (allowTarget && targeted) closePosition(s,p.target,bar.t,'Target');
  }
  function step(s) {
    if (s.cursor >= s.candles.length-1) return false;
    const bar = s.candles[++s.cursor]; s.notice = '';
    if (s.position) {
      if (s.position.closeRequested) {
        processBracket(s,{...bar,h:bar.o,l:bar.o},true);
        if (s.position) closePosition(s,bar.o,bar.t,'Manual close');
      }
      else processBracket(s,bar,true);
    }
    if (s.pending && !s.position) {
      const p = s.pending, long = p.side === 'long'; let fill = null, atOpen = false;
      if (p.type === 'market') { fill = bar.o; atOpen = true; }
      else if (p.type === 'limit') {
        if (long ? bar.o <= p.entry : bar.o >= p.entry) { fill=bar.o; atOpen=true; }
        else if (long ? bar.l <= p.entry : bar.h >= p.entry) fill=p.entry;
      } else {
        if (long ? bar.o >= p.entry : bar.o <= p.entry) { fill=bar.o; atOpen=true; }
        else if (long ? bar.h >= p.entry : bar.l <= p.entry) fill=p.entry;
      }
      if (fill != null) {
        // Limit entries never violate their price limit. Other entries apply adverse slippage.
        if (p.type !== 'limit') fill += (long ? 1 : -1)*s.slippage;
        if (!(fill > 0 && (long ? p.stop < fill && fill < p.target : p.target < fill && fill < p.stop))) {
          s.pending=null; s.notice='Order rejected: the opening gap/slippage crossed the stop or target.';
        } else {
          s.position={...p, entry:fill, entryTime:bar.t, riskCash:Math.abs(fill-p.stop)*p.quantity*cashMultiplier(s,p.stop)+2*s.fee*p.quantity};
          s.pending=null; s.balance -= s.fee*p.quantity;
          // With an intrabar entry, a target touch may have preceded the fill.
          // Do not award it; stops still apply conservatively.
          if (atOpen) processBracket(s,bar,true);
          else {
            const stopped=long ? bar.l <= p.stop : bar.h >= p.stop;
            if (stopped) closePosition(s,p.stop,bar.t,'Stop (entry-bar uncertainty)');
          }
        }
      }
    }
    s.equity.push({t:bar.t,value:s.balance+unrealized(s)});
    s.updatedAt=new Date().toISOString();
    if (s.cursor === s.candles.length-1) s.notice='End of dataset. Open positions remain marked to the final close; no automatic winning exit is assumed.';
    return true;
  }
  function requestClose(s) {
    if (!s.position) throw Error('There is no open position.');
    if (s.cursor === s.candles.length-1) throw Error('No next candle remains. Export the open position or start another session.');
    s.position.closeRequested=true; s.notice='Close queued for the next candle open.';
    s.actions.push({cursor:s.cursor, kind:'close'});
  }
  function cancelOrder(s) {
    if (!s.pending) throw Error('There is no pending order.');
    s.pending=null; s.actions.push({cursor:s.cursor,kind:'cancel'}); s.notice='Pending order cancelled.';
  }
  function snapshot(s) {
    const keys=['id','name','symbol','interval','source','strategyId','strategySnapshot','createdAt','updatedAt','viewTimeframe','chartType','startBalance','multiplier','fxMode','fee','slippage','candles','initialCursor','cursor','actions','notes','drawings','description','challenge','annotations','reviews','indicators','checklist'];
    return Object.fromEntries(keys.map(k=>[k,s[k]]));
  }
  function restore(raw) {
    if (!raw || !Number.isInteger(raw.initialCursor) || !Number.isInteger(raw.cursor) || !Array.isArray(raw.actions) || raw.actions.length > 30000) throw Error('Invalid saved session.');
    if (raw.id && !/^[\w-]{1,100}$/.test(raw.id)) throw Error('Invalid saved session ID.');
    const s=createSession({...raw,cursor:raw.initialCursor},raw.candles);
    if (s.cursor !== raw.initialCursor || raw.cursor < s.cursor || raw.cursor >= s.candles.length) throw Error('Invalid saved replay position.');
    for (const action of raw.actions) {
      if (!Number.isInteger(action.cursor) || action.cursor < s.cursor || action.cursor > raw.cursor) throw Error('Invalid saved action sequence.');
      while (s.cursor < action.cursor) step(s);
      if (action.kind === 'order') placeOrder(s,action.order);
      else if (action.kind === 'close') requestClose(s);
      else if (action.kind === 'cancel') cancelOrder(s);
      else throw Error('Unknown saved action.');
    }
    while (s.cursor < raw.cursor) step(s);
    s.id=String(raw.id || s.id).slice(0,100); s.notes=String(raw.notes || '').slice(0,10000);
    s.createdAt=typeof raw.createdAt === 'string' ? raw.createdAt : s.createdAt;
    s.updatedAt=typeof raw.updatedAt === 'string' ? raw.updatedAt : s.updatedAt;
    s.indicators=Array.isArray(raw.indicators)?raw.indicators.filter(x=>['SMA20','EMA20','EMA50','EMA200','BB20','RSI14','ATR14','HIGHLOW52','AC','AD','ALMA9','AROON14','ADX14','AVGPRICE','AO','BOP','BBP20','DAYBREAK','WEEKDAYS'].includes(x)).slice(0,20):[];
    s.viewTimeframe=typeof raw.viewTimeframe==='string'?raw.viewTimeframe.slice(0,12):undefined;s.annotations=cleanAnnotations(raw.annotations);
    const validKeys=new Set(s.trades.map(tradeKey));s.reviews={};
    if(raw.reviews && typeof raw.reviews==='object')for(const [k,v] of Object.entries(raw.reviews).slice(0,10000))if(validKeys.has(k) && v && typeof v==='object')s.reviews[k]={notes:String(v.notes||'').slice(0,4000),emotion:['confident','calm','neutral','anxious','frustrated'].includes(v.emotion)?v.emotion:'neutral'};
    s.checklist=Array.isArray(raw.checklist)?raw.checklist.filter(x=>Number.isInteger(x)&&x>=0&&x<20).slice(0,20):[];
    s.drawings=Array.isArray(raw.drawings) ? raw.drawings.filter(finite).filter(n=>n>0).slice(0,30) : [];
    return s;
  }
  function metrics(s) {
    const wins=s.trades.filter(t=>t.pnl>0), losses=s.trades.filter(t=>t.pnl<0);
    const grossWin=wins.reduce((n,t)=>n+t.pnl,0), grossLoss=-losses.reduce((n,t)=>n+t.pnl,0);
    let peak=s.startBalance, drawdown=0;
    for (const e of s.equity) { peak=Math.max(peak,e.value); drawdown=Math.max(drawdown,peak>0 ? (peak-e.value)/peak*100 : 0); }
    const realized=s.trades.reduce((n,t)=>n+t.pnl,0);
    const equity=s.balance+unrealized(s);
    return {trades:s.trades.length,wins:wins.length,losses:losses.length,breakeven:s.trades.length-wins.length-losses.length,winRate:s.trades.length ? wins.length/s.trades.length*100 : null,profitFactor:grossLoss>0 ? grossWin/grossLoss : grossWin>0 ? Infinity : null,drawdown,realized,unrealized:unrealized(s),equity,returnPct:(equity/s.startBalance-1)*100,expectancy:s.trades.length ? realized/s.trades.length : null};
  }
  return {id,tradeKey,cashMultiplier,cleanFibLevels,cleanAnnotations,cleanChallenge,challengeState,validateBars,parseCSV,parseCSVRecords,createSession,placeOrder,step,requestClose,cancelOrder,snapshot,restore,unrealized,metrics};
});
