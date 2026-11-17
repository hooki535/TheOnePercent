/* Local vector icons: one 24px grid for controls; separate coloured asset marks. */
window.HomeIcons = (() => {
  'use strict';
  const uiShapes = {
    layers:'<path d="m12 3 10 6-10 6L2 9l10-6ZM2 13l10 6 10-6M2 17l10 6 10-6"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/>',
    menu:'<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    search:'<circle cx="10.75" cy="10.75" r="6.75"/><path d="m16 16 4.5 4.5"/>',
    moon:'<path d="M20.2 14.4A8.6 8.6 0 0 1 9.6 3.8a8.6 8.6 0 1 0 10.6 10.6Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
    chevron:'<path d="m7 9.5 5 5 5-5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    expand:'<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
    more:'<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
    external:'<path d="M14 3h7v7m0-7L10 14M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    bookmark:'<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4Z"/>',
    watchlist:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M10 7h7M10 12h7M10 17h7"/><circle cx="6.5" cy="7" r=".7" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12" r=".7" fill="currentColor" stroke="none"/><circle cx="6.5" cy="17" r=".7" fill="currentColor" stroke="none"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M7 14h2M13 14h2M7 18h2"/>',
    news:'<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="4" height="4" rx=".3"/><path d="M14 7h3M14 11h3M7 15h10M7 18h7"/>',
    book:'<path d="M12 5.5C9 3.6 5.7 3.4 2.5 4.5v15c3.2-1.1 6.5-.9 9.5 1 3-1.9 6.3-2.1 9.5-1v-15c-3.2-1.1-6.5-.9-9.5 1ZM12 5.5v15"/>',
    users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21v-2a6.5 6.5 0 0 1 13 0v2M16 4.7a3.5 3.5 0 0 1 0 6.6M18.5 15a6.5 6.5 0 0 1 3 5.5v.5"/>',
    settings:'<path d="m9.8 3-.5 2a7 7 0 0 0-1.5.9L5.9 5.3 3.8 8.9l1.5 1.4a7 7 0 0 0 0 1.8l-1.5 1.4 2.1 3.6 1.9-.6a7 7 0 0 0 1.5.9l.5 2h4.4l.5-2a7 7 0 0 0 1.5-.9l1.9.6 2.1-3.6-1.5-1.4a7 7 0 0 0 0-1.8l1.5-1.4-2.1-3.6-1.9.6a7 7 0 0 0-1.5-.9l-.5-2H9.8Z" transform="translate(0 1)"/><circle cx="12" cy="12" r="3"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
    chart:'<path d="M3 3v18h18M7 15l4-5 4 3 6-8"/><path d="M16 5h5v5"/>',
    bank:'<path d="m3 8 9-5 9 5H3ZM3 21h18M5 18h14M6 11v7M12 11v7M18 11v7"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/>'
  };
  function ui(name){return `<svg class="ui-icon" data-ui-icon="${uiShapes[name]?name:'grid'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${uiShapes[name]||uiShapes.grid}</svg>`}
  const union='<path d="M0 0h24v24H0Z" fill="#17326d"/><path d="m-2 0 28 24M-2 24 26 0" stroke="#fff" stroke-width="5"/><path d="m-2 0 28 24M-2 24 26 0" stroke="#d82d42" stroke-width="2"/><path d="M12 0v24M0 12h24" stroke="#fff" stroke-width="8"/><path d="M12 0v24M0 12h24" stroke="#d82d42" stroke-width="4"/>';
  const flags={
    EUR:'<path fill="#1748a6" d="M0 0h24v24H0Z"/>'+Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<circle cx="${(12+6.5*Math.sin(a)).toFixed(2)}" cy="${(12-6.5*Math.cos(a)).toFixed(2)}" r=".75" fill="#ffda44"/>`}).join(''),
    USD:'<path fill="#fff" d="M0 0h24v24H0Z"/>'+Array.from({length:7},(_,i)=>`<path fill="#d83b4c" d="M0 ${i*3.5}h24v1.75H0Z"/>`).join('')+'<path fill="#203b80" d="M0 0h11v13H0Z"/><path d="M2 3h7M2 6h7M2 9h7" stroke="#fff" stroke-width=".9" stroke-dasharray="1 1.4"/>',
    GBP:union,
    JPY:'<path fill="#fff" d="M0 0h24v24H0Z"/><circle cx="12" cy="12" r="6" fill="#c92d43"/>',
    CHF:'<path fill="#d62837" d="M0 0h24v24H0Z"/><path fill="#fff" d="M9 5h6v4h4v6h-4v4H9v-4H5V9h4Z"/>',
    CAD:'<path fill="#fff" d="M0 0h24v24H0Z"/><path fill="#dc3345" d="M0 0h5v24H0ZM19 0h5v24h-5Z M12 5l1.3 4 2-1-.4 3 2.7.6-2.2 2.4.6 1.3-3.3-.5V19h-1.4v-4.2L8 15.3l.6-1.3-2.2-2.4 2.7-.6-.4-3 2 1Z"/>',
    AUD:'<path fill="#183572" d="M0 0h24v24H0Z"/><g transform="scale(.5)">'+union+'</g><path d="m16 5 .8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2Z M17 14l.8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2Z" fill="#fff"/>',
    NZD:'<path fill="#183572" d="M0 0h24v24H0Z"/><g transform="scale(.5)">'+union+'</g><circle cx="17" cy="7" r="1.5" fill="#eb4554" stroke="#fff" stroke-width=".6"/><circle cx="18" cy="16" r="1.5" fill="#eb4554" stroke="#fff" stroke-width=".6"/>',
    CNY:'<path fill="#df2e36" d="M0 0h24v24H0Z"/><path d="m7 4 1 3 3 .2-2.4 1.8.8 3L7 10.3l-2.5 1.7.9-3L3 7.2 6 7Z" fill="#ffda44"/>',
    DEU:'<path fill="#151821" d="M0 0h24v8H0Z"/><path fill="#d83b43" d="M0 8h24v8H0Z"/><path fill="#f4ca4b" d="M0 16h24v8H0Z"/>',
    FRA:'<path fill="#2657a7" d="M0 0h8v24H0Z"/><path fill="#fff" d="M8 0h8v24H8Z"/><path fill="#e74252" d="M16 0h8v24h-8Z"/>'
  };
  function flag(code){return `<span class="currency-flag"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${flags[code]||flags.USD}</svg></span>`}
  const indexColors={US500:'#c8113b',NAS100:'#2261d8',US30:'#169fd4'};
  function mark(sym){
    if(/^(EUR|GBP|USD|AUD|NZD|CHF|CAD|JPY)[A-Z]{3}$/.test(sym)){const a=sym.slice(0,3),b=sym.slice(3);if(flags[a]&&flags[b])return `<span class="currency-pair">${flag(a)}${flag(b)}</span>`}
    const country={JP225:'JPY',SHCOMP:'CNY',UK100:'GBP',DE40:'DEU',CAC40:'FRA'}[sym];if(country)return flag(country);
    if(sym.startsWith('BTC'))return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#f7931a"/><path d="M9 5v14M12 5v2M12 17v2M7 7h6a3 3 0 0 1 0 6H9m0-1h4a3 3 0 0 1 0 6H7" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    if(sym.startsWith('ETH'))return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#eeeaff"/><path d="m12 3-6 9 6 3 6-3Z" fill="#7968c7"/><path d="m12 3 6 9-6 3Z" fill="#b0a4e6"/><path d="m6 14 6 7 6-7-6 3Z" fill="#7968c7"/></svg>';
    if(sym.startsWith('SOL'))return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#171c2b"/><path d="m7 6-3 3h13l3-3Z" fill="#65e7ba"/><path d="m4 10 3 3h13l-3-3Z" fill="#b69cfc"/><path d="m7 14-3 3h13l3-3Z" fill="#65e7ba"/></svg>';
    if(sym.startsWith('XAU')||sym.startsWith('XAG')||sym==='GC1!'){const silver=sym.startsWith('XAG');return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${silver?'#e8edf3':'#fff2cd'}"/><path d="m5 12 3-5h8l3 5-1 5H6Z" fill="${silver?'#a6b4c5':'#e9b52d'}"/><path d="M5 12h14l-1 5H6Z" fill="${silver?'#8397af':'#cc9213'}"/><path d="m8 7-3 5h6l1-5Z" fill="${silver?'#d3dce6':'#ffdb71'}"/></svg>`}
    const text={US500:'500',NAS100:'100',US30:'30','NQ1!':'NQ','ES1!':'ES'}[sym]||sym.replace(/[^A-Z]/g,'').slice(0,2);
    const color=indexColors[sym]||({NVDA:'#397b47',AMD:'#2d615b',AAPL:'#263449',MSFT:'#3166b4',TSLA:'#cb3548',AMZN:'#a76c17'}[sym])||'#536581';
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${color}"/><text x="12" y="12.5" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${text.length>2?8:9}" font-weight="600">${text}</text></svg>`;
  }
  return {ui,mark};
})();
