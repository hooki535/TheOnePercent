/* Position collections are additive to the existing workspace snapshot. */
const PositionPlanModel=(()=>{
  const clone=x=>JSON.parse(JSON.stringify(x));let serial=0;
  const id=()=>`position-${Date.now()}-${++serial}-${Math.random().toString(36).slice(2,7)}`;
  function valid(p){return !!p&&(!p.side||['long','short'].includes(p.side))&&typeof p.key==='string'&&typeof p.sym==='string'&&[p.entry,p.stop,p.target].every(Number.isFinite)&&(p.side==='short'||(!p.side&&p.stop>p.entry)?p.stop>p.entry&&p.target<p.entry:p.stop<p.entry&&p.target>p.entry)&&(!Number.isFinite(p.startBar)||!Number.isFinite(p.endBar)||p.endBar>p.startBar);}
  function name(p){return String(p.name||((p.side|| (p.stop>p.entry?'short':'long'))==='short'?'Short position':'Long position')).slice(0,80);}
  function normalise(snapshot){
    const source=Array.isArray(snapshot.positions)?snapshot.positions:snapshot.pos?[snapshot.pos]:[];
    const seen=new Set(),positions=source.map(p=>{if(!valid(p))throw Error('A saved position has invalid prices or chart coordinates.');const next=clone(p);next.id=typeof next.id==='string'&&next.id&&!seen.has(next.id)?next.id:id();seen.add(next.id);next.side=next.side||(next.stop>next.entry?'short':'long');next.name=name(next);delete next.calc;return next;});
    const requested=snapshot.activePositionId!==undefined?snapshot.activePositionId:snapshot.pos?.id||positions[0]?.id;
    const activePositionId=positions.some(p=>p.id===requested)?requested:null;
    return {positions,activePositionId,pos:positions.find(p=>p.id===activePositionId)||null,posSelected:snapshot.posSelected!==false&&!!activePositionId};
  }
  function duplicate(p,offset=6){const next=clone(p);next.id=id();next.name=(name(p).slice(0,75)+' copy').slice(0,80);delete next.calc;next.locked=false;next.hidden=false;if(Number.isFinite(next.startBar))next.startBar+=offset;if(Number.isFinite(next.endBar))next.endBar+=offset;return next;}
  return {clone,id,valid,name,normalise,duplicate};
})();
const PositionPlans=(()=>{
  function all(){return state.positions||(state.positions=[]);}
  function forChart(key){return all().filter(p=>p.key===key);}
  function find(id){return all().find(p=>p.id===id);}
  function select(id,handles=true){const p=find(id);state.pos=p||null;state.activePositionId=p?.id||null;state.posSelected=!!p&&handles;if(p){state.selObj=null;state.risk.side=p.side;}return p;}
  function add(p){if(!PositionPlanModel.valid(p))throw Error('Invalid position geometry.');p.id=PositionPlanModel.id();const base=PositionPlanModel.name(p);let name=base,n=2;while(forChart(p.key).some(x=>x.name===name))name=base.slice(0,74)+' '+n++;p.name=name;all().push(p);select(p.id);return p;}
  function remove(id){const p=find(id);state.positions=all().filter(x=>x.id!==id);if(state.activePositionId===id)select(forChart(p?.key).at(-1)?.id);return p;}
  function duplicate(id){const p=find(id);if(!p)return null;const next=PositionPlanModel.duplicate(p);all().push(next);select(next.id);return next;}
  function restore(snapshot){Object.assign(state,PositionPlanModel.normalise(snapshot));}
  function focusChart(key){if(state.pos?.key!==key)select(forChart(key).at(-1)?.id,false);}
  return {all,forChart,find,select,add,remove,duplicate,restore,focusChart};
})();
