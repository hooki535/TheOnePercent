/* Manual sizing estimates. Existing Instruments math remains shared with the other calculators. */
window.RiskSizing = (()=>{
 'use strict';
 function calculate(I,v){
  const fail=error=>({ok:false,error});
  if(!v.inst)return fail('Choose an instrument.');
  if(![v.entry,v.stop].every(n=>Number.isFinite(n)&&n>0)||v.entry===v.stop)return fail('Enter positive entry and stop prices at different levels.');
  if(v.side==='Long'&&v.stop>=v.entry||v.side==='Short'&&v.stop<=v.entry)return fail('The stop must be below entry for a long position and above entry for a short position.');
  if(v.target!==null&&(!Number.isFinite(v.target)||v.target<=0||v.side==='Long'&&v.target<=v.entry||v.side==='Short'&&v.target>=v.entry))return fail('Place the target on the profitable side of entry, or leave it empty.');
  if(![v.inst.contract,v.inst.pip,v.inst.unitValue,v.step,v.riskMoney,v.fx].every(n=>Number.isFinite(n)&&n>0))return fail('Enter positive risk, contract size, pip size, point value, lot step and conversion rate.');
  if(!Number.isFinite(v.fees)||v.fees<0||v.fees>=v.riskMoney)return fail('Fees must be non-negative and smaller than the risk budget.');
  const fx=v.inst.quote===v.currency?1:v.fx;
  const raw=I.positionSize({instrument:v.inst,entry:v.entry,stop:v.stop,riskMoney:v.riskMoney-v.fees,accountCurrency:v.currency,fxOverride:fx});
  if(!raw)return fail('A position cannot be calculated from these inputs.');
  const lots=Number((Math.floor((raw.lots+1e-12)/v.step)*v.step).toPrecision(12));
  if(!(lots>0))return fail('The risk budget is below one lot step. Reduce the lot step only if your broker supports it.');
  const units=lots*v.inst.contract,riskAtStop=Math.abs(v.entry-v.stop)*units*v.inst.unitValue*fx+v.fees;
  if(!Number.isFinite(riskAtStop)||riskAtStop>v.riskMoney+Math.max(1,v.riskMoney)*1e-9)return fail('Rounded size exceeds the risk budget. Check the lot step.');
  const rr=v.target===null?null:Math.abs(v.target-v.entry)/Math.abs(v.entry-v.stop);
  const reward=v.target===null?null:Math.abs(v.target-v.entry)*units*v.inst.unitValue*fx-v.fees;
  const notionalAccount=units*v.entry*v.inst.unitValue*fx;
  return {ok:true,lots,units,fx,riskAtStop,stopPips:raw.stopPips,rr,reward,netRR:reward===null?null:reward/(riskAtStop-v.fees),pipValueAccount:v.inst.pip*v.inst.unitValue*units*fx,notionalAccount,margin:Number.isFinite(v.lev)&&v.lev>0?notionalAccount/v.lev:null};
 }
 return {calculate};
})();
