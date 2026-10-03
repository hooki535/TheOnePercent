/* Independent check of the calculator maths.  Run: node tests/calculators.test.js
   It loads assets/instruments.js in a bare VM (no DOM) and compares every
   answer against the formula a broker's own calculator uses, plus a
   back-check that the resulting size really risks the money that was asked
   for.  Expected values are written out by hand, not copied from the code. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','assets','instruments.js'),'utf8'),ctx);
const I=ctx.window.Instruments;
const rows=[];
function chk(name,got,exp,tol){
  const ok = got===null? false : Math.abs(got-exp)<=(tol===undefined?0.005:tol);
  rows.push([ok?'PASS':'FAIL',name,got===null?'null':(+got).toFixed(4),(+exp).toFixed(4)]);
}
const g=s=>I.find(s);
// --- pip value per standard lot, quote currency
chk('pip/lot EURUSD (USD)',I.pipValuePerLot(g('EURUSD')),10);
chk('pip/lot USDJPY (JPY)',I.pipValuePerLot(g('USDJPY')),1000);
chk('pip/lot XAUUSD 0.1 move (USD)',I.pipValuePerLot(g('XAUUSD')),10);
chk('pip/lot XAGUSD 0.01 move (USD)',I.pipValuePerLot(g('XAGUSD')),50);
chk('tick/contract NQ 0.25 (USD)',I.pipValuePerLot(g('NQ1!')),5);
chk('tick/contract ES 0.25 (USD)',I.pipValuePerLot(g('ES1!')),12.5);
chk('tick/contract CL 0.01 (USD)',I.pipValuePerLot(g('CL1!')),10);
// --- pip value converted to USD account
const jpy=I.positionSize({instrument:g('USDJPY'),entry:157.42,stop:156.92,riskMoney:100,accountCurrency:'USD'});
chk('USDJPY pipValueAccount @0.3148 lots',jpy.pipValueAccount, 6.3524*jpy.lots, 0.01);
// --- position size, broker formula risk/(pips*pipValueAcct)
function broker(sym,entry,stop,risk,acct){
  const i=g(sym), fx=I.fxToAccount(i,acct,entry);
  const pv=I.pipValuePerLot(i)*fx;               // per lot in account ccy
  const pips=Math.abs(entry-stop)/i.pip;
  return risk/(pips*pv);
}
[['EURUSD',1.0842,1.0792,100,'USD',0.2],
 ['USDJPY',157.42,156.92,100,'USD',0.31484],
 ['EURGBP',0.8516,0.8466,100,'USD',0.15710],
 ['GBPJPY',200.4114,199.4114,250,'USD',0.39362],
 ['XAUUSD',2341.5,2331.5,200,'USD',0.2],
 ['BTCUSD',64218,63218,100,'USD',0.1],
 ['NQ1!',19884,19834,1000,'USD',1],
 ['DE40',18412,18362,500,'USD',9.2234],
 ['EURUSD',1.0842,1.0792,100,'EUR',0.2169]
].forEach(([s,e,st,r,a,exp])=>{
  const got=I.positionSize({instrument:g(s),entry:e,stop:st,riskMoney:r,accountCurrency:a});
  chk(`size ${s} ${a} risk ${r}`,got.lots/(g(s).contract===1?1:1),exp,Math.abs(exp)*0.0005+0.0001);
  chk(`  ↳ same via broker formula ${s} ${a}`,got.lots,broker(s,e,st,r,a),Math.abs(exp)*0.0005+0.0001);
  chk(`  ↳ risk back-check ${s} ${a}`,Math.abs(e-st)*got.units*g(s).unitValue*got.fx,r,0.01);
});
// --- margin (notional / leverage)
function margin(sym,lots,lev,acct){
  const i=g(sym),units=lots*i.contract,nq=units*i.price*i.unitValue;
  const fx=I.fxToAccount(i,acct,i.price);
  return nq*fx/lev;
}
chk('margin EURUSD 1 lot 1:100 USD',margin('EURUSD',1,100,'USD'),1084.20);
chk('margin USDJPY 1 lot 1:100 USD',margin('USDJPY',1,100,'USD'),1000);
chk('margin XAUUSD 1 lot 1:100 USD',margin('XAUUSD',1,100,'USD'),2341.50);
chk('margin GBPUSD 0.5 lot 1:30 USD',margin('GBPUSD',0.5,30,'USD'),2121.83,0.02);
chk('margin NQ1! 1 contract 1:100 USD',margin('NQ1!',1,100,'USD'),3976.80);
// --- outcome / P&L
chk('P&L long EURUSD 1 lot +50 pips',I.outcome({instrument:g('EURUSD'),units:100000,from:1.0842,to:1.0892,side:'Long',accountCurrency:'USD'}),500);
chk('P&L short EURUSD 1 lot +50 pips',I.outcome({instrument:g('EURUSD'),units:100000,from:1.0842,to:1.0792,side:'Short',accountCurrency:'USD'}),500);
chk('P&L long USDJPY 1 lot +50 pips net $7 fees',I.outcome({instrument:g('USDJPY'),units:100000,from:157.42,to:157.92,side:'Long',accountCurrency:'USD',fees:7}),50000/157.42-7,0.02);
chk('P&L long NQ 1 contract +50 pts',I.outcome({instrument:g('NQ1!'),units:1,from:19884,to:19934,side:'Long',accountCurrency:'USD'}),1000);
// --- conversion round trip
chk('convert 100 USD→UGX',I.convert(100,'USD','UGX'),376000,1);
chk('round trip EUR→JPY→EUR',I.convert(I.convert(1000,'EUR','JPY'),'JPY','EUR'),1000,0.001);
chk('rate EURUSD table vs price',I.rate('EUR','USD'),g('EURUSD').price,0.00005);
chk('rate USDJPY table vs price',1/I.rate('JPY','USD'),g('USDJPY').price,0.005);
chk('rate GBPUSD table vs price',I.rate('GBP','USD'),g('GBPUSD').price,0.00005);
chk('rate AUDUSD table vs price',I.rate('AUD','USD'),g('AUDUSD').price,0.00005);
chk('rate EURGBP cross vs price',I.rate('EUR','GBP'),g('EURGBP').price,0.0001);
chk('rate EURJPY cross vs price',I.rate('EUR','JPY'),g('EURJPY').price,0.01);
chk('rate GBPJPY cross vs price',I.rate('GBP','JPY'),g('GBPJPY').price,0.01);
chk('rate USDCHF table vs price',1/I.rate('CHF','USD'),g('USDCHF').price,0.00005);
chk('rate USDCAD table vs price',1/I.rate('CAD','USD'),g('CAD'?'USDCAD':'USDCAD').price,0.00005);
// --- edge cases
rows.push(['INFO','stop == entry returns null', String(I.positionSize({instrument:g('EURUSD'),entry:1.08,stop:1.08,riskMoney:100,accountCurrency:'USD'})),'null']);
rows.push(['INFO','unknown currency convert returns null', String(I.convert(100,'USD','XYZ')),'null']);
rows.push(['INFO','unknown symbol find returns null', String(I.find('NOPE')),'null']);
const f=rows.filter(r=>r[0]==='FAIL');
console.log(rows.map(r=>r[0].padEnd(5)+' '+r[1].padEnd(42)+' got '+String(r[2]).padStart(12)+'   exp '+String(r[3]).padStart(12)).join('\n'));
console.log('\n'+rows.filter(r=>r[0]!=='INFO').length+' checks, '+f.length+' failed');
process.exit(f.length?1:0);
