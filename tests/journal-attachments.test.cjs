const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('quota fallback removes both screenshots while retaining the journal record', () => {
  const data = new Map();
  const window = {localStorage: {
    getItem:k=>data.get(k)||null,
    setItem(k,v){if(v.includes('data:image'))throw Error('quota');data.set(k,v);},
    removeItem:k=>data.delete(k)
  }, dispatchEvent(){}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/store.js'),'utf8'),{window,CustomEvent:function(){},console,Date,Map,Set});
  window.Store.trades.save({id:'t',symbol:'EURUSD',review:'Keep this',shot:'data:image/entry',exitShot:'data:image/exit',exits:[{price:102,size:1,note:'Keep exit note'}]});
  const saved=JSON.parse(data.get('onepercent:trades'))[0];
  assert.equal(saved.review,'Keep this');
  assert.equal(saved.exits[0].note,'Keep exit note');
  assert.equal(saved.shot,undefined);assert.equal(saved.exitShot,undefined);
  assert.equal(window.Store.imagesShed(),true);assert.equal(window.Store.storageBlocked(),false);
});

function uploadHarness(){
  const src=fs.readFileSync(path.join(root,'assets/journal.js'),'utf8');
  const fn=src.slice(src.indexOf('  function loadShot('),src.indexOf('  function saveForm('));
  const readers=[],images=[],messages=[];
  const ctx={attachmentSession:1,attachmentRequests:{entry:0,exit:0},attachmentPending:{entry:false,exit:false},shotData:null,exitShotData:null,
    FileReader:function(){readers.push(this);this.readAsDataURL=()=>{};},
    Image:function(){images.push(this);this.width=640;this.height=360;},
    document:{createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/resized'})},
    toast:m=>messages.push(m),showShot(){}};
  vm.createContext(ctx);vm.runInContext(fn,ctx);
  return {ctx,readers,images,messages,finish(i){readers[i].result='data:image/test';readers[i].onload();images.at(-1).onload();}};
}

test('an attachment finishing after switching trades cannot change the next record',()=>{
  const h=uploadHarness();h.ctx.loadShot({type:'image/png',size:100},'exit');
  assert.equal(h.ctx.attachmentPending.exit,true);
  h.ctx.attachmentSession++;h.ctx.attachmentPending.exit=false;
  h.readers[0].result='old';h.readers[0].onload();
  assert.equal(h.ctx.exitShotData,null);assert.equal(h.images.length,0);
});

test('entry and exit uploads are independent and invalid files leave attachments untouched',()=>{
  const h=uploadHarness();h.ctx.loadShot({type:'image/png',size:100},'entry');h.finish(0);
  assert.equal(h.ctx.shotData,'data:image/resized');assert.equal(h.ctx.attachmentPending.entry,false);
  h.ctx.loadShot({type:'image/png',size:100},'exit');h.finish(1);
  assert.equal(h.ctx.exitShotData,'data:image/resized');assert.equal(h.ctx.attachmentPending.exit,false);
  h.ctx.loadShot({type:'application/pdf',size:100},'entry');
  assert.equal(h.readers.length,2);assert.equal(h.ctx.shotData,'data:image/resized');assert.match(h.messages[0],/image smaller/);
});
