const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
function setup(trades = []) {
  const data = new Map([['onepercent:trades', JSON.stringify(trades)]]);
  const events = {};
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      dataset: {}, innerHTML: '', textContent: '', hidden: false, value: 'all', checked: false,
      clientWidth: 600, style: {}, listeners: {}, attributes: {},
      addEventListener(k, f) { this.listeners[k] = f; },
      setAttribute(k,v) { this.attributes[k] = v; }, focus() {},
      getContext: () => ({ setTransform() {}, clearRect() {} }),
    });
    return elements.get(id);
  }
  const tabs = ['overview','r','drawdown'].map(k => { const e = element('#tab-'+k);e.dataset.performance=k;return e; });
  const checks = [0,1,2].map(n => element('check-'+n));
  const window = {devicePixelRatio:1,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}, addEventListener:(k,fn)=>{events[k]=fn;}, dispatchEvent() {}};
  const document = {body:{dataset:{}}, querySelector:element,getElementById:id=>element('#'+id),querySelectorAll:s=>s==='[data-performance]'?tabs:s==='[data-session-check]'?checks:[]};
  const context = {window,document,console,CustomEvent:function(){},Date,Intl,Math,JSON,Map,Set,Number,String,Object,Array,parseFloat,setTimeout,clearTimeout,getComputedStyle:()=>({getPropertyValue:()=>''})};
  vm.createContext(context);
  vm.runInContext(source('assets/store.js'),context);
  context.Store = window.Store;
  context.Shell = window.Shell = {profile:()=>null,quotes:[]};
  context.HomeIcons = {ui:()=>''};context.Theme = {toggle(){}};
  vm.runInContext(source('assets/dashboard.js'), context);
  return {element,tabs,checks,events,context,data};
}
function trade(extra={}) { return {id:'a',date:new Date().toISOString(),symbol:'GBPJPY',side:'Long',entry:100,stop:90,target:120,size:1,fees:0,account:'A',exits:[],...extra}; }
test('dashboard boots with no trades and keeps tabs and checklist independent of filters', () => {
  const x=setup();
  assert.match(x.element('#recent-body').innerHTML,/No trades match/);
  x.tabs[1].listeners.click();
  assert.equal(x.element('#view-r').hidden,false);
  assert.equal(x.element('#view-overview').hidden,true);
  let prevented=false;
  x.tabs[1].listeners.keydown({key:'ArrowRight',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(x.element('#view-drawdown').hidden,false);
  x.checks[0].checked=true;x.checks[0].listeners.change();
  assert.equal(x.element('#checklist-count').textContent,'1 / 3');
  x.element('#f-range').listeners.change({target:{value:'7'}});
  assert.equal(x.checks[0].checked,true);
  x.element('#reset-checklist').listeners.click();
  assert.equal(x.element('#checklist-count').textContent,'0 / 3');
});
test('account filter preserves old open exposure while filtering recent entries by period', () => {
  const x=setup([trade({date:'2020-01-01'}),trade({id:'b',account:'B'})]);
  x.element('#f-account').listeners.change({target:{value:'A'}});
  assert.match(x.element('#account-summary').innerHTML,/Open journal positions[\s\S]*?>1</);
  assert.match(x.element('#recent-body').innerHTML,/No trades match/);
  x.element('#f-range').listeners.change({target:{value:'all'}});
  assert.match(x.element('#recent-body').innerHTML,/GBPJPY/);
  assert.match(x.element('#recent-body').innerHTML,/Open/);
});
test('removed account is reconciled before rendering refreshed figures', () => {
  const x=setup([trade(),trade({id:'b',account:'B'})]);
  x.element('#f-account').listeners.change({target:{value:'A'}});
  x.data.set('onepercent:trades',JSON.stringify([trade({id:'b',account:'B'})]));
  x.events.storechange();
  assert.equal(x.element('#f-account').value,'all');
  assert.match(x.element('#account-summary').innerHTML,/Open journal positions[\s\S]*?>1</);
});
test('design preview has an empty read-only driver and cannot load or mutate account trades', () => {
  const x=setup([trade()]);
  vm.runInContext(source('assets/dashboard-preview.js'),x.context);
  assert.equal(x.context.Store.trades.list().length,0);
  assert.throws(()=>x.context.Store.trades.save(trade()),/Read-only/);
  assert.equal(JSON.parse(x.data.get('onepercent:trades')).length,1);
  const html=source('pages/dashboard-preview.html');
  assert.doesNotMatch(html,/assets\/cloud.js/);
  assert.match(html,/No account data loaded/);
  assert.match(source('pages/dashboard.html'),/assets\/cloud.js/);
});
