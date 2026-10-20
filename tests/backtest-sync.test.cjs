const test=require('node:test'),assert=require('node:assert/strict'),Sync=require('../assets/backtest-sync.js');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};
function database(){
 const rows=new Map();let fail=false;
 return {rows,set fail(value){fail=value;},client:{from(){let mode='read',row,filters=[];
  const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},maybeSingle(){return execute();},insert(v){mode='insert';row=v;return query;},update(v){mode='update';row=v;return query;},then(ok,bad){return execute().then(ok,bad);}};
  async function execute(){if(fail)return {data:null,error:{code:'NETWORK'}};const user=filters.find(([k])=>k==='user_id')?.[1]||row?.user_id,key=filters.find(([k])=>k==='key')?.[1]||row?.key,id=user+'|'+key,found=rows.get(id);
   if(mode==='read')return {data:found||null,error:null};
   if(mode==='insert'&&found)return {data:null,error:{code:'23505'}};
   if(mode==='update'&&(!found||filters.some(([k,v])=>found[k]!==v)))return {data:[],error:null};
   rows.set(id,{...row});return {data:[{updated_at:row.updated_at}],error:null};}
  return query;}}};
}
function device(db,userId='user-a'){
 let state={schema:1,sessions:[],strategies:[]},status;
 const local=storage(),key='onepercent:backtesting:v1:'+userId;
 const sync=new Sync({client:db.client,userId,key,storage:local,getSnapshot:()=>state,applyRemote:raw=>{if(raw.schema!==1)throw Error('bad');state=raw;local.setItem(key,JSON.stringify(raw));},onStatus:(code,message)=>status={code,message}});
 return {sync,local,key,get state(){return state;},set state(v){state=v;},get status(){return status;},save(){local.setItem(key,JSON.stringify(state));sync.schedule();}};
}
test('account sessions save and resume on a second device without copying guests',async()=>{
 const db=database(),a=device(db);await a.sync.start();a.state.sessions.push({id:'session-1'});a.save();await a.sync.flush();assert.equal(a.status.code,'saved');
 const b=device(db);await b.sync.start();assert.equal(b.state.sessions[0].id,'session-1');
 const other=device(db,'user-b');await other.sync.start();assert.equal(other.state.sessions.length,0);a.sync.stop();b.sync.stop();other.sync.stop();
});
test('concurrent devices cannot silently overwrite newer sessions',async()=>{
 const db=database(),a=device(db);await a.sync.start();a.state.sessions.push({id:'original'});a.save();await a.sync.flush();
 const b=device(db);await b.sync.start();a.state.sessions.push({id:'new-from-a'});a.save();await a.sync.flush();
 b.state.sessions.push({id:'new-from-b'});b.save();await b.sync.flush();assert.equal(b.status.code,'conflict');assert.equal(b.state.sessions.at(-1).id,'new-from-b');
 await b.sync.start({useRemote:true});assert.equal(b.state.sessions.at(-1).id,'new-from-a');a.sync.stop();b.sync.stop();
});
test('offline writes keep local data and retry safely',async()=>{
 const db=database(),a=device(db);await a.sync.start();db.fail=true;a.state.sessions.push({id:'offline'});a.save();await a.sync.flush();assert.equal(a.status.code,'error');assert.ok(a.local.getItem(a.key).includes('offline'));
 db.fail=false;await a.sync.start();assert.equal(a.status.code,'saved');assert.equal(db.rows.size,1);a.sync.stop();
});
test('untracked local and online work produce a conflict instead of data loss',async()=>{
 const db=database(),a=device(db);await a.sync.start();a.state.sessions.push({id:'online'});a.save();await a.sync.flush();
 const b=device(db);b.state.sessions.push({id:'local'});b.local.setItem(b.key,JSON.stringify(b.state));await b.sync.start();assert.equal(b.status.code,'conflict');assert.equal(b.state.sessions[0].id,'local');a.sync.stop();b.sync.stop();
});
test('stopped account adapter cannot upload later work',async()=>{
 const db=database(),a=device(db);await a.sync.start();a.sync.stop();a.state.sessions.push({id:'must-not-upload'});a.save();await a.sync.flush();assert.equal(db.rows.size,0);
});
