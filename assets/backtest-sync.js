/* Account-scoped Supabase workspace sync with optimistic concurrency.
   Guest/local MT5 workspaces never use this adapter. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BacktestSync=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  async function timed(request){let timer;try{return await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Sync timed out')),15000);})]);}finally{clearTimeout(timer);}}
  return class BacktestSync {
    constructor({client,userId,key,storage,getSnapshot,applyRemote,onStatus}){
      Object.assign(this,{client,userId,key,storage,getSnapshot,applyRemote,onStatus});
      this.metaKey='op:backtesting:sync:'+userId;this.revision=null;this.dirty=false;this.blocked=true;this.stopped=false;this.saving=false;this.timer=null;this.base=null;
      try{const meta=JSON.parse(storage.getItem(this.metaKey)||'null');if(meta){this.revision=meta.revision;this.dirty=!!meta.dirty;}}catch(_){}
    }
    status(state,message){if(!this.stopped)this.onStatus(state,message);}
    remember(){try{this.storage.setItem(this.metaKey,JSON.stringify({revision:this.revision,dirty:this.dirty}));}catch(_){this.status('error','Sync metadata could not be saved. Export a backup.');}}
    async start({useRemote=false}={}){
      if(this.stopped||this.saving||this.loading)return;
      this.loading=true;
      this.blocked=true;this.status('loading','Checking saved sessions…');
      try{
        const {data,error}=await timed(this.client.from('user_data').select('value,updated_at').eq('user_id',this.userId).eq('key',this.key).maybeSingle());
        if(this.stopped)return;if(error)throw error;
        const local=this.storage.getItem(this.key);
        if(data){
          // Existing unsynced work from another device must never be overwritten silently.
          const conflict=local && local!==data.value && !useRemote &&
            (this.dirty?this.revision!==data.updated_at:!this.revision);
          if(conflict){this.status('conflict','Another device has different saved sessions. Export your backup, then load the online workspace.');return;}
          if(useRemote || !local || !this.dirty){this.applyRemote(JSON.parse(data.value));this.base=data.value;this.dirty=false;}
          this.revision=data.updated_at;
        }else{
          if(this.revision && local && !useRemote){this.status('conflict','Online workspace changed. Export a backup before reloading it.');return;}
          this.revision=null;this.base=JSON.stringify(this.getSnapshot());
          this.dirty=!!local && (this.getSnapshot().sessions.length>0 || this.getSnapshot().strategies.length>0);
        }
        this.blocked=false;this.remember();
        if(this.dirty)await this.flush();else this.status('saved','Account sync ready · resume on another device');
      }catch(_){this.status('error','Online sync unavailable · local copy kept. Retry sync or export a backup.');}
      finally{this.loading=false;}
    }
    schedule(){
      if(this.stopped)return;
      const body=JSON.stringify(this.getSnapshot());
      if(body===this.base&&!this.dirty)return;
      this.dirty=true;this.remember();
      if(this.blocked)return;
      clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),750);this.status('pending','Saved here · waiting to sync');
    }
    async flush(){
      clearTimeout(this.timer);if(this.stopped||this.blocked||this.saving||!this.dirty)return;
      this.saving=true;const body=JSON.stringify(this.getSnapshot());
      this.status('saving','Saving sessions online…');
      try{
        const timestamp=new Date(Math.max(Date.now(),Date.parse(this.revision||0)+1)).toISOString();
        const row={user_id:this.userId,key:this.key,value:body,updated_at:timestamp};
        let result;
        if(this.revision){result=await timed(this.client.from('user_data').update(row).eq('user_id',this.userId).eq('key',this.key).eq('updated_at',this.revision).select('updated_at'));}
        else result=await timed(this.client.from('user_data').insert(row).select('updated_at'));
        if(this.stopped)return;
        if(result.error?.code==='23505'||(!result.error&&!result.data?.length)){
          this.blocked=true;this.status('conflict','Another device saved newer sessions. Export your backup, then load the online workspace.');return;
        }
        if(result.error)throw result.error;
        this.revision=result.data[0].updated_at;this.base=body;
        this.dirty=JSON.stringify(this.getSnapshot())!==body;this.remember();
        this.status(this.dirty?'pending':'saved',this.dirty?'New changes waiting to sync':'Saved online · ready on your other devices');
      }catch(_){this.status('error','Online sync failed · local copy kept. Retry sync or export a backup.');}
      finally{this.saving=false;if(!this.stopped&&!this.blocked&&this.dirty&&this.base===body)this.schedule();}
    }
    stop(){this.stopped=true;clearTimeout(this.timer);}
  };
});
