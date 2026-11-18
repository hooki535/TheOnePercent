const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/journal-review.js'),'utf8'),{window});
const {model,render}=window.JournalReview;
const base={symbol:'XAUUSD',side:'Short',entry:100,stop:101,target:98,size:2,exits:[]};
test('review distinguishes open, partial and fully closed records without realising partial R',()=>{
 assert.equal(model(base,{open:true,r:1}).result,'Not realised');
 const partial=model({...base,exits:[{price:99,size:.5}]},{open:true,r:1});
 assert.equal(partial.status,'Partially closed');assert.equal(partial.remaining,1.5);assert.equal(partial.result,'Not realised');
 const closed=model({...base,exits:[{price:99,size:.5},{price:98,size:1.5}]},{open:false,r:1.75});
 assert.equal(closed.remaining,0);assert.equal(closed.result,'+1.75R');
});
test('invalid recorded exits never produce a closed result badge',()=>{
 for(const exits of [[{price:98,size:3}],[{price:'bad',size:2}],[{price:98,size:-2}]]){
  const m=model({...base,exits},{open:false,r:5});assert.equal(m.status,'Check trade data');assert.equal(m.result,'Unavailable');assert.equal(m.remaining,null);
 }
 assert.equal(model({...base,size:null},{open:false,r:2}).result,'Unavailable');
});
test('review keeps zero prices, legacy notes and missing values distinct',()=>{
 const t={...base,entry:0,target:0,review:'Legacy review',emotion:'',exits:[{price:0,size:2,note:'Exit note'}]};
 const html=render(t,{r:0,plannedRR:0,avgExit:0,riskMoney:1,fees:0,netPL:0});
 assert.match(html,/0.00R/);assert.match(html,/Legacy review/);assert.match(html,/Exit note/);assert.match(html,/Emotion: Not recorded/);assert.match(html,/No entry screenshot/);assert.match(html,/Money P\/L unavailable/);assert.doesNotMatch(html,/data-evidence=/);
});
test('trade text is escaped and entry/exit attachments remain individually expandable',()=>{
 const html=render({...base,shot:'data:image/png;base64,entry',exitShot:'data:image/png;base64,exit',plan:'<script>alert(1)</script>',whatWentWell:'Waited',nextTime:'Document',exits:[]},{open:true,r:null});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/data-evidence="shot"/);assert.match(html,/data-evidence="exitShot"/);assert.match(html,/Waited/);assert.match(html,/Document/);
});
test('CSV retains separate reflection fields, multiline text, and legacy review',()=>{
 const source=fs.readFileSync(path.join(root,'assets/journal.js'),'utf8');
 const csv=source.slice(source.indexOf('  const CSV_COLS ='),source.indexOf('  /* ------------------------------------------------------------ sample data'));
 const saved=[];let output='';
 const t={...base,date:'2026-11-17T10:00',review:'Original review',whatWentWell:'Patient, then decisive\nKept the stop',nextTime:'Capture "both" charts'};
 const ctx={rowsFor:()=>[{t,c:{avgExit:null,closedSize:0},d:0}],dayKey:()=> '2026-11-17',toast(){},document:{createElement:()=>({click(){}})},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Blob:function(parts){output=parts.join('');},Store:{trades:{save:r=>saved.push(r)}},V:{MARKETS:['Forex'],SETUPS:['Reversal'],SESSIONS:['London'],EMOTIONS:['Calm']}};
 vm.createContext(ctx);vm.runInContext(csv+'\nexportCsv();',ctx);ctx.input=output;vm.runInContext('importCsv(input);',ctx);
 assert.equal(saved[0].review,t.review);assert.equal(saved[0].whatWentWell,t.whatWentWell);assert.equal(saved[0].nextTime,t.nextTime);
 vm.runInContext('importCsv("symbol,entry,stop,size,review\\nEURUSD,100,99,1,Legacy note");',ctx);
 assert.equal(saved[1].review,'Legacy note');assert.equal(saved[1].whatWentWell,'');assert.equal(saved[1].nextTime,'');
});
