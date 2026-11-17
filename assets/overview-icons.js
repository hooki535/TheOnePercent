/* Local outline icons keep the review page independent of a CDN. */
(() => {
 const paths = {
 'layout-grid':'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 'chart-no-axes-combined':'M3 20V10 M8 20V6 M13 20v-8 M18 20V3 M2 7l6-4 5 4 7-6',
 'chart-candlestick':'M5 3v18 M3 7h4v8H3z M13 2v20 M11 5h4v9h-4z M21 4v16 M19 10h4v6h-4z',
 'users':'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a6 6 0 0 1 12 0v3 M17 4a4 4 0 0 1 0 7 M18 15a5 5 0 0 1 4 5',
 'book-open':'M12 5v16 M12 5C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 1',
 'briefcase-business':'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',
 'layers':'M2 7l10-5 10 5-10 5z M2 12l10 5 10-5 M2 17l10 5 10-5',
 'notebook-pen':'M5 3h15v18H5z M2 7h6 M2 12h6 M2 17h6 M11 15l6-6 2 2-6 6h-2z',
 'bell':'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
 'settings':'M12 3l3 3 4 1-1 5 1 5-4 1-3 3-3-3-4-1 1-5-1-5 4-1z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
 'sun':'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',
 'moon':'M21 14A9 9 0 0 1 10 3a9 9 0 1 0 11 11',
 'search':'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
 'user':'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a8 8 0 0 1 16 0v2',
 'rotate-ccw':'M3 10a9 9 0 1 1 1 7 M3 3v7h7',
 'maximize':'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6',
 'trending-up':'M3 17l6-6 4 4 8-11 M15 4h6v6',
 'sliders-horizontal':'M3 6h18 M3 12h18 M3 18h18 M7 3v6 M16 9v6 M10 15v6',
 'list-filter':'M3 6h18 M6 12h12 M9 18h6'
 };
 document.querySelectorAll('[data-lucide]').forEach(el=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','20');svg.setAttribute('height','20');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[el.dataset.lucide]||paths['layout-grid']);svg.append(p);el.replaceWith(svg)});
})();
