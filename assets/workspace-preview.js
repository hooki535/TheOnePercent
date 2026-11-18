/* Isolated example driver for design QA. Never reads or writes account records. */
(() => {
 const lists=new Map(),objects=new Map([['settings',{balance:1000,currency:'USD',riskPct:1,accountName:'Design preview'}]]);
 Store.useDriver({name:'workspace-example-memory',list:kind=>lists.get(kind)||[],get:kind=>objects.get(kind)||{},
 put(kind,record){const rows=lists.get(kind)||[];const i=rows.findIndex(x=>x.id===record.id);if(i<0)rows.push(record);else rows[i]=record;lists.set(kind,rows);return record;},
 patch(kind,patch){const next={...(objects.get(kind)||{}),...patch};objects.set(kind,next);return next;},
 remove(kind,id){const rows=lists.get(kind)||[];lists.set(kind,rows.filter(x=>x.id!==id));return rows.length!==(lists.get(kind)||[]).length;},
 clear(kind){lists.delete(kind);objects.delete(kind);}
 });
})();
