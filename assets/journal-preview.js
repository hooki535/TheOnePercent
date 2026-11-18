/* Example records live only in memory. This page never reads or writes account trades. */
(() => {
  const now=new Date(),prefix=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-`;
  const at=day=>prefix+String(Math.min(day,now.getDate())).padStart(2,'0')+'T10:00';
  const base={market:'Forex',entry:100,stop:99,target:102,size:1,contractValue:1,fees:0,account:'Design preview',session:'London',tags:[],plan:'Example plan for interface review',review:'Example note. Preview changes reset when this page reloads.'};
  let rows=[
    {...base,id:'preview-eur-loss',date:at(17),symbol:'EURUSD',side:'Short',stop:101,target:98,setup:'Range',emotion:'Impatient',exits:[{price:101,size:1}]},
    {...base,id:'preview-gbp-open',date:at(17),symbol:'GBPJPY',side:'Long',setup:'Pullback',emotion:'Calm',exits:[]},
    {...base,id:'preview-gold-open',date:at(17),symbol:'XAUUSD',side:'Short',stop:101,target:98,setup:'Reversal',emotion:'',exits:[]},
    {...base,id:'preview-yen-win',date:at(16),symbol:'USDJPY',side:'Long',setup:'Trend continuation',emotion:'Calm',exits:[{price:102,size:1}]},
    {...base,id:'preview-gbp-loss',date:at(11),symbol:'GBPJPY',side:'Short',stop:101,target:98,setup:'Reversal',emotion:'',exits:[{price:101,size:1}]},
    {...base,id:'preview-eur-win',date:at(10),symbol:'EURUSD',side:'Long',setup:'Breakout',emotion:'Calm',exits:[{price:102,size:1}]},
  ];
  const singletons={settings:{guardrailsOn:false,maxDailyLossPct:0,maxTradesPerDay:0,coolOffAfterLosses:0}};
  Store.useDriver({name:'journal-example-memory',list:kind=>kind==='trades'?rows:[],get:kind=>singletons[kind]||{},
    put(kind,record){if(kind==='trades'){const i=rows.findIndex(x=>x.id===record.id);if(i<0)rows.push(record);else rows[i]=record;}return record;},
    patch(kind,patch){singletons[kind]={...(singletons[kind]||{}),...patch};return singletons[kind];},
    remove(kind,id){const before=rows.length;if(kind==='trades')rows=rows.filter(x=>x.id!==id);return rows.length!==before;},
    clear(kind){if(kind==='trades')rows=[];else delete singletons[kind];}
  });
})();
