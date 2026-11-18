const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},ctx={window,console};vm.createContext(ctx);for(const name of ['instruments','risk-sizing'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..','assets',name+'.js'),'utf8'),ctx);
const I=window.Instruments,R=window.RiskSizing;
const base={inst:{...I.find('EURUSD')},entry:1.085,stop:1.083,target:1.089,side:'Long',riskMoney:10,fees:0,step:.01,fx:1,currency:'USD',lev:100};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('manual EURUSD example sizes 0.05 lots and includes planned risk/reward',()=>{const r=R.calculate(I,base);assert.equal(r.ok,true);near(r.lots,.05);near(r.units,5000);near(r.riskAtStop,10);near(r.reward,20);near(r.stopPips,20);near(r.rr,2);});
test('fees are inside the risk budget and volume rounds down',()=>{const r=R.calculate(I,{...base,fees:2,riskMoney:11});assert.equal(r.ok,true);near(r.lots,.04);near(r.riskAtStop,10);near(r.reward,14);near(r.netRR,1.75);assert.ok(r.riskAtStop<=11);});
test('manual point multiplier and cross-currency conversion are respected',()=>{const r=R.calculate(I,{...base,inst:{...base.inst,quote:'EUR',contract:100,unitValue:2},entry:100,stop:99,target:102,currency:'USD',fx:1.25,step:.01,riskMoney:25});assert.equal(r.ok,true);near(r.units,10);near(r.riskAtStop,25);near(r.reward,50);});
test('invalid direction, target, specification, rate and budget cannot yield a position',()=>{for(const patch of [{stop:1.086},{target:1.08},{fx:null},{riskMoney:0},{fees:-1},{fees:10},{step:0},{inst:{...base.inst,pip:0}},{inst:{...base.inst,contract:0}}])assert.equal(R.calculate(I,{...base,...patch}).ok,false,JSON.stringify(patch));});
test('below-step sizes are unavailable and same-currency rates cannot inflate the estimate',()=>{assert.equal(R.calculate(I,{...base,riskMoney:1,step:1}).ok,false);const r=R.calculate(I,{...base,fx:100});near(r.fx,1);near(r.lots,.05);});
test('short position uses the opposite level ordering and does not mutate registry facts',()=>{const before=JSON.stringify(I.find('EURUSD'));const r=R.calculate(I,{...base,side:'Short',stop:1.087,target:1.081});assert.equal(r.ok,true);near(r.reward,20);assert.equal(JSON.stringify(I.find('EURUSD')),before);});
test('preview handoff carries converted unit value without writing account drafts',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','assets/calculators.js'),'utf8');
 const fn=source.slice(source.indexOf('  function sendToJournal()'),source.indexOf('  function copySummary()'));
 const v={...base,inst:{...base.inst,quote:'EUR'},fx:1.25,fees:2};const r={units:4000,fx:1.25};
 const context={lastSize:{v,r},settings:()=>({currency:'USD'}),Store:{driver:()=> 'workspace-example-memory',draft:{set(){throw Error('Must not write an account draft');}}},window:{location:{}},encodeURIComponent,JSON,Number};
 vm.createContext(context);vm.runInContext(fn+'\nsendToJournal();',context);
 const url=context.window.location.href;assert.ok(url.startsWith('journal-preview.html#draft='));const draft=JSON.parse(decodeURIComponent(url.split('#draft=')[1]));near(draft.contractValue,1.25);assert.equal(draft.manualSizing.quoteCurrency,'EUR');assert.equal(draft.size,4000);
});
test('workspace previews isolate account data and reset by construction',()=>{
 const data=new Map([['onepercent:settings',JSON.stringify({balance:99999,accountName:'Private account'})]]);
 const win={localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},dispatchEvent(){}};
 const context={window:win,console,Date,Map,Set,CustomEvent:function(){}};vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','assets/store.js'),'utf8'),context);context.Store=win.Store;
 const source=fs.readFileSync(path.join(__dirname,'..','assets/workspace-preview.js'),'utf8');vm.runInContext(source,context);
 assert.equal(win.Store.settings.get().balance,1000);win.Store.settings.patch({balance:2000});assert.equal(win.Store.settings.get().balance,2000);assert.equal(JSON.parse(data.get('onepercent:settings')).balance,99999);vm.runInContext(source,context);assert.equal(win.Store.settings.get().balance,1000);
 for(const page of ['calculators','settings','learn']){const html=fs.readFileSync(path.join(__dirname,'..','pages',page+'-preview.html'),'utf8');assert.doesNotMatch(html,/assets\/cloud.js/);assert.match(html,/assets\/workspace-preview.js/);}
});
