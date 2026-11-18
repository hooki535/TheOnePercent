const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),window={};const ctx={window,Date,Intl,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/journal-calendar.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/journal-analytics.js'),'utf8'),ctx);
const A=window.JournalAnalytics;
const row=(id,date,r,extra={},open=false)=>({t:{id,date,symbol:'EURUSD',setup:'Pullback',market:'Forex',session:'London',...extra},c:{r,open}});
test('analytics sorts journal dates, starts at zero and calculates peak-to-trough drawdown in R',()=>{
 const m=A.build([row('c','2026-11-12',2),row('a','2026-11-10',-1),row('b','2026-11-11',-2),row('d','2026-11-13',4)]);
 assert.deepEqual(Array.from(m.series,p=>p.value),[-1,-3,-1,3]);assert.equal(m.maxDrawdown,-3);assert.equal(m.average,.75);assert.equal(m.winRate,50);assert.equal(m.profitFactor,2);
});
test('partial trades never enter realised metrics or curves',()=>{
 const m=A.build([row('a','2026-11-10',2),row('b','2026-11-11',50,{},true)]);
 assert.equal(m.closed,1);assert.equal(m.open,1);assert.equal(m.total,2);assert.equal(m.series.length,1);assert.equal(m.average,2);
});
test('missing closed-trade R blocks totals, profit factor and complete curves but labels eligible averages',()=>{
 const m=A.build([row('a','2026-11-10',2),row('b','2026-11-11',null)]);
 assert.equal(m.eligible,1);assert.equal(m.missing,1);assert.equal(m.average,2);assert.equal(m.total,null);assert.equal(m.maxDrawdown,null);assert.equal(m.profitFactor,null);assert.equal(m.series.length,0);
 assert.match(A.render(m),/1 closed trade\(s\) have unavailable R/);
});
test('an invalid journal date disables ordering without fabricating a date',()=>{
 const m=A.build([row('a','invalid',2)]);assert.equal(m.invalidDates,1);assert.equal(m.curveAvailable,false);assert.equal(m.maxDrawdown,null);assert.equal(m.average,2);
});
test('zero and breakeven results remain valid and no-loss profit factor avoids infinity',()=>{
 const m=A.build([row('a','2026-11-10',0),row('b','2026-11-11',2)]);assert.equal(m.winRate,50);assert.equal(m.maxDrawdown,0);assert.equal(m.noLosses,true);assert.equal(m.profitFactor,null);assert.match(A.render(m),/No losing R/);
 const empty=A.build([]);assert.equal(empty.average,null);assert.equal(empty.winRate,null);assert.equal(empty.total,null);assert.doesNotMatch(A.render(empty),/NaN|Infinity/);
});
test('group coverage includes unavailable and open trades and escapes record labels',()=>{
 const m=A.build([row('a','2026-11-10',2,{setup:'<script>'}),row('b','2026-11-11',null,{setup:'<script>'}),row('c','2026-11-12',null,{setup:''},true)]);
 assert.equal(m.groups.find(g=>g.label==='<script>').missing,1);assert.equal(m.groups.find(g=>g.label==='<script>').total,null);assert.equal(m.groups.find(g=>g.label==='Not recorded').open,1);
 const html=A.render(m);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});
test('habit denominators distinguish missing stop answers and respect separate reflection fields',()=>{
 const m=A.build([row('a','2026-11-10',1,{stopHonoured:true,plan:' plan ',nextTime:'Review'}),row('b','2026-11-11',-1,{stopHonoured:false}),row('c','2026-11-12',0)]);
 assert.equal(m.habits[0].n,1);assert.equal(m.habits[0].total,2);assert.equal(m.habits[0].missing,1);assert.equal(m.habits[1].n,1);assert.equal(m.habits[2].n,1);assert.equal(m.noPlan,2);
});
test('drilldown uses exact group matches and missing-R selection ignores open trades',()=>{
 const a=row('a','2026-11-10',null,{setup:'Pullback',plan:' '});assert.equal(A.matches(a,{kind:'group',field:'setup',value:'Pull'}),false);assert.equal(A.matches(a,{kind:'no-plan'}),true);assert.equal(A.matches(a,{kind:'missing-r'}),true);assert.equal(A.matches({...a,c:{open:true,r:null}},{kind:'missing-r'}),false);
 const before=JSON.stringify(a);A.build([a]);assert.equal(JSON.stringify(a),before);
});
