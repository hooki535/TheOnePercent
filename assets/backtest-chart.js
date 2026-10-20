/* TradingView Lightweight Charts adapter. Only revealed candles enter the chart. */
(() => {
  'use strict';
  window.BacktestChart = function(host, onCrosshair, onLevel) {
    const L=window.LightweightCharts;
    if(!L)throw Error('TradingView chart library could not be loaded. Reload the page.');
    const css=getComputedStyle(document.body), color=n=>css.getPropertyValue('--bt-'+n).trim();
    const chart=L.createChart(host,{autoSize:true,layout:{background:{type:'solid',color:color('card')},textColor:color('muted'),attributionLogo:true},grid:{vertLines:{color:color('line')},horzLines:{color:color('line')}},timeScale:{timeVisible:true,secondsVisible:false,rightOffset:3},rightPriceScale:{borderColor:color('line')},crosshair:{mode:L.CrosshairMode.Normal}});
    const candles=chart.addSeries(L.CandlestickSeries,{upColor:color('up'),downColor:color('down'),borderVisible:false,wickUpColor:color('up'),wickDownColor:color('down')});
    const ma=chart.addSeries(L.LineSeries,{color:'#a390ff',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
    let previous=-1,sessionId=null,visible=0,lines=[],current=null;
    chart.subscribeCrosshairMove(p=>{const b=p.seriesData.get(candles);onCrosshair(b?{t:b.time,o:b.open,h:b.high,l:b.low,c:b.close}:current?.candles[current.cursor]);});
    chart.subscribeClick(p=>{if(!p.point)return;const value=candles.coordinateToPrice(p.point.y);if(Number.isFinite(value)&&value>0)onLevel(value);});
    const mapped=b=>({time:b.t,open:b.o,high:b.h,low:b.l,close:b.c});
    const average=(s,i)=>{let sum=0;for(let j=i-19;j<=i;j++)sum+=s.candles[j].c;return {time:s.candles[i].t,value:sum/20};};
    return {
      render(s,showMA,barsVisible){
        current=s;
        const changed=previous!==s.cursor||sessionId!==s.id;
        if(changed){
          const precision=s.candles[s.cursor].c<20?5:s.candles[s.cursor].c<1000?3:2;
          candles.applyOptions({priceFormat:{type:'price',precision,minMove:10**-precision}});
          if(sessionId===s.id && s.cursor===previous+1){candles.update(mapped(s.candles[s.cursor]));if(s.cursor>=19)ma.update(average(s,s.cursor));}
          else {candles.setData(s.candles.slice(0,s.cursor+1).map(mapped));ma.setData(s.candles.slice(19,s.cursor+1).map((_,i)=>average(s,i+19)));}
        }
        ma.applyOptions({visible:showMA});
        for(const line of lines)candles.removePriceLine(line);lines=[];
        const level=(value,title,c)=>lines.push(candles.createPriceLine({price:value,color:c,lineWidth:1,lineStyle:L.LineStyle.Dashed,axisLabelVisible:true,title}));
        for(const value of s.drawings)level(value,'Level',color('accent'));
        const p=s.position||s.pending;if(p){if(p.entry)level(p.entry,s.position?'Entry':'Queued',color('muted'));level(p.stop,'SL',color('down'));level(p.target,'TP',color('up'));}
        if(changed||visible!==barsVisible)chart.timeScale().setVisibleLogicalRange({from:Math.max(-.5,s.cursor-barsVisible+1),to:s.cursor+3});
        previous=s.cursor;sessionId=s.id;visible=barsVisible;onCrosshair(s.candles[s.cursor]);
      },
      destroy(){chart.remove();}
    };
  };
})();
