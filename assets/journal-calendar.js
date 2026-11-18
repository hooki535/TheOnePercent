/* Journal-date calendar model. Store.compute remains the source of trade results. */
window.JournalCalendar = (() => {
  'use strict';
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function parse(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(String(value || ''));
    if (!match) return null;
    const [y,m,d] = match.slice(1).map(Number);
    const date = new Date(y,m-1,d,12);
    return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d ? date : null;
  }
  function inRange(value, range, now = new Date()) {
    const date = parse(value);
    if (!date) return range === 'all';
    const k = key(date), today = key(now);
    if (range === 'all') return true;
    if (range === 'month') return k >= key(new Date(now.getFullYear(),now.getMonth(),1)) && k <= today;
    if (range === 'lastMonth') return k >= key(new Date(now.getFullYear(),now.getMonth()-1,1)) && k < key(new Date(now.getFullYear(),now.getMonth(),1));
    if (range === 'quarter') return k >= key(new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1)) && k <= today;
    const days = Number(range);
    if (!Number.isFinite(days) || days < 0) return false;
    const start = new Date(now.getFullYear(),now.getMonth(),now.getDate()-days);
    return k >= key(start) && k <= today;
  }
  function summarize(rows) {
    let closed=0,open=0,eligible=0,sum=0;
    const emotions = new Map();
    rows.forEach(({t,c}) => {
      if (c.open) open++;
      else { closed++; if(Number.isFinite(c.r)){eligible++;sum+=c.r;} }
      const emotion = typeof t.emotion==='string' ? t.emotion.trim() : '';
      if (emotion) emotions.set(emotion,(emotions.get(emotion)||0)+1);
    });
    const tagged = Array.from(emotions.values()).reduce((a,b)=>a+b,0);
    return {count:rows.length,closed,open,eligible,missing:closed-eligible,r:eligible && eligible===closed ? sum : null,
      tagged,untagged:rows.length-tagged,emotions:Array.from(emotions,([name,n])=>({name,n})).sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name))};
  }
  function month(rows, date) {
    const year=date.getFullYear(),m=date.getMonth();
    const first=new Date(year,m,1,12), last=new Date(year,m+1,0,12);
    const offset=(first.getDay()+6)%7;
    const n=Math.ceil((offset+last.getDate())/7)*7;
    const byDay=new Map();
    rows.forEach(row=>{const d=parse(row.t.date);if(!d)return;const k=key(d);if(!byDay.has(k))byDay.set(k,[]);byDay.get(k).push(row);});
    const cells=Array.from({length:n},(_,i)=>{
      const d=new Date(year,m,1-offset+i,12),k=key(d),items=byDay.get(k)||[];
      return {key:k,date:d,day:d.getDate(),inMonth:d.getMonth()===m,rows:items,...summarize(items)};
    });
    const monthRows=rows.filter(row=>{const d=parse(row.t.date);return d&&d.getFullYear()===year&&d.getMonth()===m;});
    const weeks=[];
    for(let i=0;i<cells.length;i+=7){const active=cells.slice(i,i+7).filter(c=>c.inMonth);weeks.push({start:active[0].key,end:active[active.length-1].key,...summarize(active.flatMap(c=>c.rows))});}
    return {cells,weeks,...summarize(monthRows)};
  }
  return {key,parse,inRange,summarize,month};
})();
