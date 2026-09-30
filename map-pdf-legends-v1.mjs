const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderMapPdfLegends({map, state, labels, colors}) {
  const keys = map.stageOverlayKeys ?? String(map.dataset.overlayKeys || '').split(',');
  const active = [...new Set(keys)].filter(key=>labels[key]);
  const areas = Array.isArray(state.mapProgressSelection) ? state.mapProgressSelection : [];
  const swatch = color => `<i class="map-pdf-swatch" style="background:${color}"></i>`;
  return `<div class="map-pdf-legend-bar" data-map-pdf-legends aria-label="Legendas dos destaques ativos">${active.map(key=>`<span data-map-pdf-overlay="${esc(key)}">${swatch(`#${Number(colors[key]).toString(16).padStart(6,'0')}`)}${esc(labels[key])}</span>`).join('')}${areas.length ? `<span data-map-pdf-marks>${swatch('#78a9ff')}Áreas selecionadas · ${areas.length}</span>` : ''}${!active.length && !areas.length ? '<span>Nenhum destaque ativo</span>' : ''}</div>`;
}

export function ensureMapPdfLegendStyles() {
  if(document.getElementById('map-pdf-legend-styles-v1')) return;
  const style = document.createElement('style');style.id='map-pdf-legend-styles-v1';
  style.textContent = `
    .map-pdf-interface-toolbar>div:first-child{flex:1}
    .map-pdf-interface-toolbar .map-pdf-legend-bar{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:5px}
    .map-pdf-interface-toolbar .map-pdf-legend-bar span{display:inline-flex;align-items:center;gap:6px;font:11px "IBM Plex Sans",system-ui,sans-serif;color:#f4f4f4;letter-spacing:0}
    .map-pdf-swatch{display:inline-block;width:10px;height:10px;border:1px solid #ffffff80;flex:0 0 10px}
    body.map-pdf-interface-open [data-worker-context-assistant],body.map-pdf-interface-open .admin-message-launch,body.map-pdf-interface-open map-filter-rail,body.map-pdf-interface-open [data-map-3d-loading]{display:none!important}
    @media print{
      @page{size:A4 landscape;margin:0}
      body.map-pdf-interface-open .map-pdf-interface{display:block!important;position:fixed!important;inset:0!important;height:100vh!important}
      .map-pdf-interface-toolbar{display:flex!important;top:3mm!important;left:3mm!important;right:3mm!important;padding:3mm!important;background:#071120ef!important;print-color-adjust:exact;-webkit-print-color-adjust:exact;box-shadow:none!important}
      .map-pdf-interface-toolbar>div:last-child{display:none!important}
      .map-pdf-interface-toolbar strong{font-size:11pt!important}
      .map-pdf-interface-toolbar .map-pdf-legend-bar span{font-size:8pt!important;color:#fff!important}
      .map-pdf-swatch{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    }`;
  document.head.append(style);
}
