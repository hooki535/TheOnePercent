/* Explicit preview fixtures only. Never used as a fallback for real-market mode. */
window.HomeData = (() => {
  'use strict';
  const rows = [
    ['US500','S&P 500','Indices',5243.77,-.40,2,'USD','500'],
    ['NAS100','Nasdaq 100','Indices',18327.45,.57,2,'USD','100'],
    ['US30','Dow Jones','Indices',39742.19,-.12,2,'USD','30'],
    ['JP225','Japan 225','Indices',39541,.42,2,'JPY','🇯🇵'],
    ['SHCOMP','SSE Composite','Indices',3064.49,.61,2,'CNY','🇨🇳'],
    ['UK100','FTSE 100','Indices',8311.37,.33,2,'GBP','🇬🇧'],
    ['DE40','DAX','Indices',19227.32,-.19,2,'EUR','🇩🇪'],
    ['CAC40','CAC 40','Indices',7505.86,-.15,2,'EUR','🇫🇷'],
    ['EURUSD','Euro / U.S. Dollar','Forex',1.08426,.24,5,'USD','🇪🇺'],
    ['GBPUSD','British Pound / U.S. Dollar','Forex',1.27234,.29,5,'USD','🇬🇧'],
    ['GBPJPY','British Pound / Japanese Yen','Forex',188.73,.29,3,'JPY','🇬🇧'],
    ['USDJPY','U.S. Dollar / Japanese Yen','Forex',148.51,-.11,3,'JPY','🇯🇵'],
    ['AUDUSD','Australian Dollar / U.S. Dollar','Forex',.65621,-.11,5,'USD','🇦🇺'],
    ['USDCHF','U.S. Dollar / Swiss Franc','Forex',.88421,.16,5,'CHF','🇨🇭'],
    ['USDCAD','U.S. Dollar / Canadian Dollar','Forex',1.36124,.12,5,'CAD','🇨🇦'],
    ['NZDUSD','New Zealand Dollar / U.S. Dollar','Forex',.60324,-.09,5,'USD','🇳🇿'],
    ['XAUUSD','Gold / U.S. Dollar','Commodities',2023.56,.41,2,'USD','Au'],
    ['XAGUSD','Silver / U.S. Dollar','Commodities',22.97,.38,3,'USD','Ag'],
    ['BTCUSDT','Bitcoin / Tether','Crypto',67482.3,-.37,2,'USDT','₿'],
    ['ETHUSDT','Ethereum / Tether','Crypto',3512.67,.54,2,'USDT','Ξ'],
    ['SOLUSDT','Solana / Tether','Crypto',142.76,2.34,2,'USDT','◎'],
    ['NQ1!','Nasdaq 100 futures','Futures',18411.25,.62,2,'USD','NQ'],
    ['ES1!','S&P 500 futures','Futures',5258.5,-.31,2,'USD','ES'],
    ['GC1!','Gold futures','Futures',2031.4,.45,2,'USD','GC'],
    ['SMCI','Super Micro Computer','Stocks',449.2,7.79,2,'USD','SM'],
    ['PLTR','Palantir Technologies','Stocks',66.14,6.64,2,'USD','P'],
    ['NVDA','NVIDIA Corporation','Stocks',152.89,5.18,2,'USD','N'],
    ['AMD','Advanced Micro Devices','Stocks',177.2,4.72,2,'USD','A'],
    ['CRWD','CrowdStrike Holdings','Stocks',364.18,4.15,2,'USD','C'],
    ['INTC','Intel Corporation','Stocks',21.84,-5.79,2,'USD','I'],
    ['PYPL','PayPal Holdings','Stocks',60.27,-5.06,2,'USD','P'],
    ['NFLX','Netflix','Stocks',686.12,-4.23,2,'USD','N'],
    ['BA','Boeing','Stocks',178.63,-3.48,2,'USD','B'],
    ['DIS','Walt Disney','Stocks',113.9,-2.88,2,'USD','D'],
    ['MSFT','Microsoft Corporation','Stocks',420.56,.94,2,'USD','M'],
    ['AAPL','Apple','Stocks',189.98,1.28,2,'USD','A'],
    ['TSLA','Tesla','Stocks',248.5,-1.73,2,'USD','T'],
    ['AMZN','Amazon','Stocks',179.36,.88,2,'USD','a']
  ];
  const markets=rows.map(([symbol,name,market,price,chgPct,digits,currency,icon])=>({symbol,name,market,price,chgPct,digits,currency,icon}));
  const find=s=>markets.find(m=>m.symbol===s);
  const snapshotTime=Date.UTC(2026,10,13,23,45);
  function seed(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function random(s){let a=seed(s);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  const cache=new Map();
  function series(symbol,range='1D'){
    const key=symbol+'|'+range;if(cache.has(key))return cache.get(key);
    const m=find(symbol);if(!m)return[];
    const days={'1D':1,'1W':7,'1M':30,'3M':90,'1Y':365}[range]||1,n=120,rnd=random(key);
    const pct=range==='1D'?m.chgPct:Math.max(-70,Math.min(150,m.chgPct*Math.sqrt(days)*1.5));
    const first=m.price/(1+pct/100),amp=m.price*.0025*Math.sqrt(days),walk=[];let value=0;
    for(let i=0;i<n;i++){value+=(rnd()-.5)*amp;walk.push(value)}
    const drift=walk[n-1]-walk[0],data=[];
    for(let i=0;i<n;i++){
      const t=i/(n-1),bridge=walk[i]-walk[0]-drift*t;
      const drop=symbol==='US500'&&range==='1D'?(-amp*4*Math.sin(Math.PI*Math.min(1,t*1.9))*(1-t)):0;
      const c=first+(m.price-first)*t+bridge+drop,o=i?data[i-1].c:first,w=Math.abs(c-o)*.4+m.price*.0001;
      data.push({t:snapshotTime-(n-1-i)*(days*86400000/(n-1)),o,h:Math.max(o,c)+w,l:Math.min(o,c)-w,c,v:Math.round(5000+rnd()*23000)});
    }
    data[0].o=first;data[0].c=first;data[n-1].c=m.price;cache.set(key,data);return data;
  }
  function quote(symbol){const m=find(symbol);if(!m)return null;const bars=series(symbol),open=m.price/(1+m.chgPct/100);return {...m,open,chg:m.price-open,high:Math.max(...bars.map(b=>b.h)),low:Math.min(...bars.map(b=>b.l)),time:snapshotTime}}
  const posts=[
    {id:'nasdaq-structure',tag:'Example analysis',title:'Nasdaq: follow the structure',image:'ms-uptrend-gold.webp',alt:'Historical market-structure teaching chart from the Academy',author:'TheOnePercent Academy',intro:'Map the swings, identify the context, then define the conditions for your entry.',body:'Begin with your higher timeframe. Mark the confirmed swing highs and lows, then distinguish a normal pullback from a change in structure. A lower-timeframe setup should be judged against that context rather than treated as a standalone signal.',bullets:['Identify the latest confirmed swing high and low.','Mark the area that would invalidate the current view.','Wait for your defined entry criteria and size the trade before entry.']},
    {id:'gold-support',tag:'Example analysis',title:'Gold: scenarios at support',image:'sd-demand-eurusd.webp',alt:'Supply and demand teaching chart from the Academy',author:'Simon Peter',intro:'Prepare for both acceptance and rejection around an important level.',body:'An important level defines a decision area, not a guaranteed direction. Write down what would confirm acceptance, what would confirm rejection, and where the trade idea would become invalid. These chart thumbnails are Academy teaching examples; they are not current Nasdaq or gold market recommendations.',bullets:['Mark the higher-timeframe area.','Define confirmation for each scenario.','Set invalidation and planned risk before entering.']},
    {id:'session-study',tag:'Example study',title:'Structure and session overlay',image:'dt-sessions-eurusd.webp',alt:'Academy chart illustrating trading sessions',author:'TheOnePercent Academy',intro:'Bring session timing and structural levels into the same research view.',body:'Session timing can help organise observation and review. Combine it with consistent swing identification and record how the same setup behaves under different market conditions. A coloured session region is context, not an entry signal.',bullets:['Choose the session you will study.','Record the structural context before that session opens.','Compare observations in your journal.']},
    {id:'liquidity-study',tag:'Example study',title:'Liquidity and momentum study',image:'liq-eqh-gold.webp',alt:'Academy chart illustrating equal highs and liquidity',author:'TheOnePercent Academy',intro:'Study how price behaves around prior highs, lows and clear liquidity levels.',body:'Use visible highs and lows to organise a testable observation. A sweep alone does not confirm a reversal. Record subsequent structure and execution criteria before considering a trade.',bullets:['Identify a clearly defined prior high or low.','Observe the reaction without assuming its outcome.','Review the follow-through with screenshots.']}
  ];
  const news=[
    {id:'news-dollar',topic:'Forex · Example editorial',title:'The dollar, rate expectations and your trading plan',intro:'A framework for separating macro context from an entry decision.',body:'A macro view can help organise scenarios, but it does not replace a clear execution plan. Track the event, distinguish expectations from the actual release, and write down what would invalidate your thesis. This is a sample editorial for the homepage layout, not a report of a current market event.'},
    {id:'news-gold',topic:'Commodities · Example editorial',title:'Gold at a key level: prepare both scenarios',intro:'Consider acceptance, rejection and the conditions for staying flat.',body:'Support and resistance areas are useful when they lead to conditional decisions. Define the response you need to see and the risk you can accept. This example article demonstrates the research-reading experience; it is not current market news.'},
    {id:'news-review',topic:'Research · Example editorial',title:'What to record after a volatile market session',intro:'Use the Journal to separate execution quality from the final result.',body:'Record the higher-timeframe context, the setup, the planned risk and how you executed it. Add before-and-after chart images when available. This example is educational, with no claim about a specific current trading session.'},
    {id:'news-crypto',topic:'Crypto · Example editorial',title:'Distinguish a pullback from a change of structure',intro:'Apply the same swing rules instead of changing them after a loss.',body:'Consistent definitions make review possible. Choose how a swing is confirmed, how a structure break is recognised and how it changes the next decision. This sample educational editorial is not a current price forecast.'}
  ];
  const events=[{currency:'USD',name:'CPI (YoY)',impact:'High',about:'The Consumer Price Index is commonly used to track changes in consumer prices. This is a sample event card, with no scheduled date, forecast or actual release value attached.'},{currency:'GBP',name:'Bank Rate',impact:'Medium',about:'This sample card represents a central-bank policy-rate event. Impact levels are illustrative and no meeting schedule or decision is connected.'},{currency:'JPY',name:'GDP (QoQ)',impact:'High',about:'This sample card represents a quarterly economic-output release. No release schedule, forecast or actual figure is connected.'}];
  return{markets,find,series,quote,posts,news,events,snapshotTime,seed};
})();
