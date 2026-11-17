/* Geographic outlines: World Atlas/Natural Earth. Values: labelled preview fixtures. */
(() => {
  'use strict';
  const svg=document.getElementById('economy-map'),wrap=svg.parentElement,status=document.getElementById('map-status'),tip=document.getElementById('map-tooltip');
  let countries=null,metric='inflation',observer=null;
  const metrics={inflation:{title:'Example inflation view',min:.3,max:8.5,suffix:'%'},growth:{title:'Example GDP growth view',min:-1.5,max:7,suffix:'%'},rates:{title:'Example policy-rate view',min:0,max:12,suffix:'%'}};
  function value(country){const m=metrics[metric];return m.min+(HomeData.seed(String(country.id)+metric)%1000)/999*(m.max-m.min)}
  function label(country){return country.properties?.name||'Country '+country.id}
  function draw(){
    if(!countries||!window.d3)return;
    const w=Math.max(250,svg.clientWidth),h=svg.clientHeight||290,m=metrics[metric];
    d3.select(svg).selectAll('*').remove();svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const collection={type:'FeatureCollection',features:countries};
    const projection=d3.geoNaturalEarth1().fitExtent([[5,6],[w-5,h-6]],collection),path=d3.geoPath(projection);
    const colors=d3.scaleSequential(d3.interpolateYlOrRd).domain([m.min,m.max+2]);
    d3.select(svg).selectAll('path').data(countries).join('path').attr('d',path).attr('fill',d=>colors(value(d))).attr('stroke','var(--bg)').attr('stroke-width',.45).attr('role','button').attr('tabindex',0).attr('aria-label',d=>label(d)+', illustrative '+metric+' '+value(d).toFixed(1)+' percent').on('pointermove',(event,d)=>{
      const rect=wrap.getBoundingClientRect();tip.textContent=label(d)+' · Sample '+value(d).toFixed(1)+'%';tip.hidden=false;tip.style.left=Math.max(0,Math.min(rect.width-tip.offsetWidth,event.clientX-rect.left+9))+'px';tip.style.top=Math.max(0,event.clientY-rect.top-30)+'px';
    }).on('pointerleave',()=>tip.hidden=true).on('click',(event,d)=>showCountry(d)).on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showCountry(d)}});
    document.getElementById('map-title').textContent=m.title;
    document.getElementById('map-scale').innerHTML=`${m.min.toFixed(1)}% <span>${m.max.toFixed(1)}%</span>`;
    svg.setAttribute('aria-label',m.title+'. Country outlines from Natural Earth. All shaded values are illustrative design data.');
  }
  function showCountry(d){window.Homepage?.openContent(label(d),`<p>Example ${metric==='rates'?'policy rate':metric==='growth'?'GDP growth':'inflation'}: <strong>${value(d).toFixed(1)}%</strong>.</p><p>This is an illustrative value for interaction review, not a current statistic. No economic-data provider is connected.</p>`,'Illustrative country detail')}
  async function load(){
    try{
      if(!window.d3||!window.topojson)throw Error('Map library unavailable');
      const response=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
      if(!response.ok)throw Error('Geographic data unavailable');
      const world=await response.json();countries=topojson.feature(world,world.objects.countries).features.filter(f=>f.id!=='010');status.hidden=true;draw();observer=new ResizeObserver(draw);observer.observe(svg);
    }catch{status.textContent='The geographic map could not load. Market content remains available.';}
  }
  document.getElementById('map-metric').onchange=event=>{metric=event.target.value;if(countries)draw()};
  load();window.addEventListener('pagehide',()=>observer?.disconnect(),{once:true});
})();
