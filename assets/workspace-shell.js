/* Shared navigation for tools, preferences and learning; page features keep their own data APIs. */
(() => {
 const page=document.body.dataset.page;
 if(!['calculators','settings','learn'].includes(page))return;
 const links=[['dashboard.html','Overview','grid','dashboard'],['journal.html','Trading Journal','book','journal'],['journal.html#view-insights','Analytics','chart','analytics'],['calculators.html','Risk tools','shield','calculators'],['charts.html','Chart workspace','layers','charts'],['learn.html','Learning hub','book','learn'],['settings.html','Settings','settings','settings']];
 const side=document.createElement('aside');side.className='workspace-sidebar';side.setAttribute('aria-label','Workspace');
 side.innerHTML='<div class="workspace-eyebrow">WORKSPACE</div><nav>'+links.map(([href,label,icon,key])=>`<a href="${href}" ${page===key?'aria-current="page"':''}>${HomeIcons.ui(icon)}<span>${label}</span></a>`).join('')+'</nav><div class="workspace-sidebar-foot"><span>Learn. Plan. Review.</span><button type="button" id="workspace-theme">'+HomeIcons.ui('moon')+'Switch colour theme</button></div>';
 document.body.insertBefore(side,document.querySelector('main'));
 document.getElementById('workspace-theme').onclick=()=>Theme.toggle();
 if(page==='calculators'){
  const buttons=document.createElement('div');buttons.className='risk-tool-tabs';buttons.setAttribute('role','group');buttons.setAttribute('aria-label','Planning tools');
  buttons.innerHTML='<button type="button" data-risk-calc="ps" aria-pressed="true">'+HomeIcons.ui('layers')+'Position size</button><button type="button" data-risk-calc="rr" aria-pressed="false">'+HomeIcons.ui('chart')+'Risk / Reward</button><button type="button" data-risk-calc="mg" aria-pressed="false">'+HomeIcons.ui('shield')+'Margin estimate</button>';
  document.getElementById('calc-pick').before(buttons);
 }
})();
