/* Analytics of Store.compute results. R curves are journal-date sequences, never account equity. */
window.JournalAnalytics = (() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = value => typeof value === 'string' ? value.trim() : '';
  const key = value => text(value) || 'Not recorded';
  const formatR = value => Number.isFinite(value) ? `${value>0?'+':value<0?'−':''}${Math.abs(value).toFixed(2)}R` : 'Unavailable';
  const tone = value => value>0?'positive':value<0?'negative':'';
  function stats(rows) {
    const closed=rows.filter(row=>!row.c.open), eligible=closed.filter(row=>Number.isFinite(row.c.r));
    const sum=eligible.reduce((n,row)=>n+row.c.r,0), wins=eligible.filter(row=>row.c.r>0).length;
    const profit=eligible.reduce((n,row)=>n+Math.max(0,row.c.r),0),loss=-eligible.reduce((n,row)=>n+Math.min(0,row.c.r),0);
    const missing=closed.length-eligible.length;
    return {closed:closed.length,open:rows.length-closed.length,eligible:eligible.length,missing,
      average:eligible.length?sum/eligible.length:null, winRate:eligible.length?wins/eligible.length*100:null,
      total:closed.length&&!missing?sum:null, profitFactor:!missing&&loss>0?profit/loss:null,
      noLosses:!missing&&eligible.length>0&&loss===0&&profit>0};
  }
  function build(rows, field='setup') {
    const summary=stats(rows), groups=new Map();
    rows.forEach(row=>{const k=key(row.t[field]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);});
    const breakdown=Array.from(groups,([label,list])=>({label,...stats(list),count:list.length})).sort((a,b)=>(b.average??-Infinity)-(a.average??-Infinity)||a.label.localeCompare(b.label));
    const closed=rows.filter(row=>!row.c.open), invalidDates=closed.filter(row=>!window.JournalCalendar.parse(row.t.date)).length;
    const ordered=closed.slice().sort((a,b)=>String(a.t.date||'').localeCompare(String(b.t.date||''))||String(a.t.id).localeCompare(String(b.t.id)));
    const curveAvailable=summary.closed>0 && !summary.missing && !invalidDates;
    let sum=0,peak=0,maxDrawdown=0;
    const series=curveAvailable?ordered.map(({t,c})=>{sum+=c.r;peak=Math.max(peak,sum);const drawdown=sum-peak;maxDrawdown=Math.min(maxDrawdown,drawdown);return {id:t.id,date:String(t.date),symbol:t.symbol,r:c.r,value:sum,drawdown};}):[];
    const knownStop=rows.filter(row=>typeof row.t.stopHonoured==='boolean');
    const habits=[
      {label:'Stop honoured',n:knownStop.filter(row=>row.t.stopHonoured).length,total:knownStop.length,missing:rows.length-knownStop.length},
      {label:'Plan recorded',n:rows.filter(row=>text(row.t.plan)).length,total:rows.length,missing:0},
      {label:'Review recorded',n:rows.filter(row=>text(row.t.review)||text(row.t.whatWentWell)||text(row.t.nextTime)).length,total:rows.length,missing:0}
    ];
    return {...summary,groups:breakdown,series,curveAvailable,invalidDates,maxDrawdown:curveAvailable?maxDrawdown:null,habits,
      noPlan:rows.filter(row=>!text(row.t.plan)).length,count:rows.length};
  }
  function chart(series,property,label,id) {
    if(!series.length)return '<div class="analytics-chart-empty">No complete sequence available.</div>';
    const values=[0,...series.map(point=>point[property])],low=Math.min(...values),high=Math.max(...values),span=high-low||1;
    const width=property==='drawdown'?440:760, right=width-24;
    const x=i=>48+i/(values.length-1)*(right-48), y=value=>190-(value-low)/span*160;
    const points=values.map((value,i)=>`${x(i).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
    const baseline=y(0), every=Math.max(1,Math.ceil(series.length/60));
    const grid=[low,low+(high-low)/2,high].filter((v,i,arr)=>arr.indexOf(v)===i);
    return `<svg class="analytics-chart" viewBox="0 0 ${width} 220" role="img" aria-labelledby="${id}"><title id="${id}">${label} in journal-date order. Use the chart values table to review individual trades.</title>${grid.map(v=>`<line class="analytics-gridline" x1="48" x2="${right}" y1="${y(v)}" y2="${y(v)}"/><text class="analytics-axis" x="40" y="${y(v)+4}" text-anchor="end">${v.toFixed(1)}R</text>`).join('')}<polygon class="analytics-area" points="48,${baseline} ${points} ${right},${baseline}"/><polyline class="analytics-line" points="${points}"/>${series.filter((p,i)=>i%every===0||i===series.length-1).map(p=>{const i=series.indexOf(p)+1;return `<a href="#trade-review" data-analytics-trade="${esc(p.id)}" aria-label="Review ${esc(p.symbol)} on ${esc(p.date.slice(0,10))}, ${formatR(p[property])}"><circle class="analytics-dot" cx="${x(i)}" cy="${y(p[property])}" r="4"><title>${esc(p.symbol)} · ${esc(p.date.slice(0,10))} · ${formatR(p[property])}</title></circle></a>`;}).join('')}<text class="analytics-axis" x="48" y="216">${esc(series[0].date.slice(0,10))}</text><text class="analytics-axis" x="${right}" y="216" text-anchor="end">${esc(series.at(-1).date.slice(0,10))}</text></svg>`;
  }
  function render(model,field='setup') {
    const metric=(label,value,note,cls='')=>`<article class="analytics-metric"><span>${label}</span><strong class="${cls}">${value}</strong><small>${note}</small></article>`;
    const labels={setup:'Setup',session:'Session',market:'Market',emotion:'Emotion'};
    const curveReason=!model.closed?'Close a trade to start the sequence.':model.missing?`${model.missing} closed trade(s) have unavailable R. Review them before drawing a complete sequence.`:`${model.invalidDates} closed trade(s) have invalid journal dates. Correct the dates to order this sequence.`;
    return `<div class="analytics-metrics">${metric('Average R',formatR(model.average),`${model.eligible} eligible closed trade(s)`,tone(model.average))}${metric('Win rate (R)',model.winRate===null?'—':model.winRate.toFixed(1)+'%',`Positive R / eligible closed · breakevens included`)}${metric('Profit factor (R)',model.noLosses?'No losing R':model.profitFactor===null?'Unavailable':model.profitFactor.toFixed(2),model.missing?'Incomplete R coverage':'Sum of positive R / absolute negative R')}${metric('Closed trades',String(model.closed),`${model.eligible} valid R · ${model.missing} unavailable · ${model.open} open`)}</div>
    <div class="analytics-disclosure"><span>Money totals unavailable</span>Compatible trade currency units are not recorded. R uses the recorded stop, not an immutable initial-risk snapshot.</div>
    <div class="analytics-chart-grid"><section class="analytics-panel"><header><div><h3>Cumulative R</h3><p>Closed trades in journal-date order · starts at 0R</p></div><strong class="analytics-chart-total ${tone(model.total)}">${formatR(model.total)}</strong></header>${model.curveAvailable?chart(model.series,'value','Cumulative R','cumulative-r-title'):`<div class="analytics-chart-empty"><strong>Sequence unavailable</strong><p>${curveReason}</p></div>`}</section>
    <section class="analytics-panel"><header><div><h3>Drawdown in R</h3><p>Largest decline from a running R peak</p></div><strong class="analytics-chart-total ${tone(model.maxDrawdown)}">${formatR(model.maxDrawdown)}</strong></header>${model.curveAvailable?chart(model.series,'drawdown','Drawdown in R','drawdown-r-title'):`<div class="analytics-chart-empty"><strong>Drawdown unavailable</strong><p>${curveReason}</p></div>`}</section></div>
    <div class="analytics-lower-grid"><section class="analytics-panel"><header><div><h3>Performance breakdown</h3><p>Compare the recorded context, then open its trades.</p></div></header><div class="analytics-group-controls" role="group" aria-label="Compare performance by">${Object.entries(labels).map(([v,label])=>`<button type="button" data-analytics-group="${v}" aria-pressed="${v===field}">${label}</button>`).join('')}</div><div class="analytics-table-scroll"><table class="analytics-breakdown"><thead><tr><th>${labels[field]}</th><th>Closed / valid R</th><th>Avg R</th><th>Win % (R)</th><th>Total R</th><th>Review</th></tr></thead><tbody>${model.groups.map((g,i)=>`<tr><th scope="row">${esc(g.label)}</th><td>${g.closed} / ${g.eligible}</td><td class="${tone(g.average)}">${formatR(g.average)}</td><td>${g.winRate===null?'—':g.winRate.toFixed(1)+'%'}</td><td class="${tone(g.total)}">${formatR(g.total)}</td><td><button type="button" class="analytics-text-button" data-analytics-row="${i}" aria-label="View ${esc(g.label)} trades">View →</button></td></tr>`).join('')||'<tr><td colspan="6" class="analytics-empty-cell">No trades match the current filters.</td></tr>'}</tbody></table></div><p class="analytics-caption">Averages use valid closed-trade R. Total R requires complete coverage. Small samples can vary widely.</p></section>
    <section class="analytics-panel"><header><div><h3>Execution habits</h3><p>Recorded journal fields · current filtered trades</p></div></header><div class="analytics-habits">${model.habits.map(h=>`<div><div class="analytics-habit-label"><span>${h.label}</span><strong>${h.total?(h.n/h.total*100).toFixed(0)+'%':'—'}</strong></div><div class="analytics-bar"><i style="width:${h.total?h.n/h.total*100:0}%"></i></div><small>${h.n} / ${h.total} recorded${h.missing?' · '+h.missing+' missing':''}</small></div>`).join('')}</div><p class="analytics-caption">Self-reported fields. Missing stop answers are excluded from that percentage.</p></section></div>
    <section class="analytics-panel analytics-next"><header><div><h3>What to review next</h3><p>Open the records behind these questions.</p></div></header><button type="button" data-analytics-action="sessions"><span>Compare your trading sessions</span><span>Session breakdown →</span></button><button type="button" data-analytics-action="no-plan" ${model.noPlan?'':'disabled'}><span>Trades without a recorded plan</span><span>${model.noPlan} trade(s) →</span></button><button type="button" data-analytics-action="missing-r" ${model.missing?'':'disabled'}><span>Closed trades with unavailable R</span><span>${model.missing} trade(s) →</span></button></section>
    <details class="analytics-values"><summary>Chart values and trade review</summary><div class="analytics-table-scroll"><table><thead><tr><th>Journal date</th><th>Symbol</th><th>Trade R</th><th>Cumulative R</th><th>Drawdown</th><th>Review</th></tr></thead><tbody>${model.series.slice(-20).map(p=>`<tr><td>${esc(p.date.slice(0,10))}</td><td>${esc(p.symbol)}</td><td>${formatR(p.r)}</td><td>${formatR(p.value)}</td><td>${formatR(p.drawdown)}</td><td><button type="button" class="analytics-text-button" data-analytics-trade="${esc(p.id)}">Review trade</button></td></tr>`).join('')||'<tr><td colspan="6">No complete sequence available.</td></tr>'}</tbody></table></div><p class="analytics-caption">Latest 20 chart values. Use Trade history to see all records. Journal dates are used because close timestamps are absent; same-date ties use stored IDs. This is an R sequence, not account equity or a return percentage.</p></details>`;
  }
  function matches(row,selection) {
    if(!selection)return true;
    if(selection.kind==='group')return key(row.t[selection.field])===selection.value;
    if(selection.kind==='no-plan')return !text(row.t.plan);
    if(selection.kind==='missing-r')return !row.c.open&&!Number.isFinite(row.c.r);
    return true;
  }
  return {build,render,matches};
})();
