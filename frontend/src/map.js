import priceCatalog from './assets/tabela-precos.json';

const SVG = 'http://www.w3.org/2000/svg';
const WIDTH = 2329, HEIGHT = 2759, ARTWORK_HEIGHT = 2581;
const ADDED_LEFT_MARGIN = 281;
// A planta é o recorte do PDF posicionado no quadro original de 2886 × 3468.
const imagePoint = ([u, v]) => [((u * 2886 + 16.9) / 2990.08) * 2048 + ADDED_LEFT_MARGIN, ((v * 3468 + 37.2) / 3768.32) * ARTWORK_HEIGHT];

function centroid(points) {
  let area = 0, x = 0, y = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
    const cross = ax * by - bx * ay;
    area += cross; x += (ax + bx) * cross; y += (ay + by) * cross;
  }
  if (Math.abs(area) < 1e-12) return points[0];
  return [x / (3 * area), y / (3 * area)];
}

/** Renderiza a planta e informa a seleção de uma área do loteamento. */
export async function mountLotMap(host, { onLotSelect, selectedLotIds = [], focusLotIds = [], selectionMode = false, onSelectionChange, selectionColor = '#2878ff', selectionColors = {} } = {}) {
  const [geometryResponse, mappingResponse] = await Promise.all([
    fetch(new URL('./assets/lotes.json', import.meta.url)),
    fetch(new URL('./assets/mapeamento.json', import.meta.url)),
  ]);
  if (!geometryResponse.ok || !mappingResponse.ok) throw new Error('Não foi possível carregar a planta dos lotes.');
  const geometry = await geometryResponse.json();
  const mapping = await mappingResponse.json();
  const priceByLabel = new Map(priceCatalog.map(lot => [lot.label, lot]));
  const numberCounts = new Map();
  for (const entry of mapping.mappings) numberCounts.set(entry.number, (numberCounts.get(entry.number) || 0) + 1);
  const stage = document.createElement('div');
  stage.className = 'lot-map-stage';
  const image = document.createElement('img');
  image.src = new URL('./assets/planta.webp', import.meta.url).href;
  image.alt = 'Planta do loteamento Aliança Park';
  image.draggable = false;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('aria-label', 'Áreas dos lotes');
  svg.setAttribute('role', 'img');
  for (const entry of mapping.mappings) {
    const points = geometry.lots[entry.greenPolygonId];
    if (!Array.isArray(points) || points.length < 3) continue;
    const officialLot = priceByLabel.get(entry.officialLabel);
    if (!officialLot) throw new Error(`Não há área oficial cadastrada para ${entry.officialLabel || entry.lotId}.`);
    const polygon = document.createElementNS(SVG, 'polygon');
    polygon.dataset.lotId = entry.lotId;
    polygon.dataset.lotNumber = String(entry.number);
    polygon.dataset.catalogLabel = officialLot.label;
    polygon.setAttribute('points', points.map(point => imagePoint(point).join(',')).join(' '));
    polygon.setAttribute('class', 'lot-map-area');
    const title = document.createElementNS(SVG, 'title');
    title.textContent = `${officialLot.label} · ${Number(officialLot.area).toLocaleString('pt-BR')} m²`;
    polygon.append(title);
    const label = document.createElementNS(SVG, 'text');
    const [labelX, labelY] = imagePoint(centroid(points));
    label.setAttribute('x', String(labelX)); label.setAttribute('y', String(labelY));
    label.setAttribute('class', 'lot-map-number');
    label.textContent = String(entry.number).padStart(2, '0');
    const areaLabel = document.createElementNS(SVG, 'text');
    const numberHalfWidth = String(entry.number).length * 4.8;
    areaLabel.setAttribute('x', String(labelX + numberHalfWidth + 3));
    areaLabel.setAttribute('y', String(labelY + 2));
    areaLabel.setAttribute('class', 'lot-map-area-label');
    areaLabel.textContent = `${Number(officialLot.area).toLocaleString('pt-BR')} m²`;
    const blockLabel = numberCounts.get(entry.number) > 1
      ? document.createElementNS(SVG, 'text')
      : null;
    if (blockLabel) {
      blockLabel.setAttribute('x', String(labelX));
      blockLabel.setAttribute('y', String(labelY - 10));
      blockLabel.setAttribute('class', 'lot-map-block-label');
      blockLabel.textContent = officialLot.quadra;
    }
    svg.append(polygon, areaLabel);
    if (blockLabel) svg.append(blockLabel);
    svg.append(label);
  }
  stage.append(image, svg);
  const fitButton = document.createElement('button');
  fitButton.type = 'button';
  fitButton.className = 'map-fit-control';
  fitButton.textContent = 'Enquadrar planta';
  fitButton.setAttribute('aria-label', 'Mostrar a planta inteira');
  fitButton.addEventListener('pointerdown', event => event.stopPropagation());
  svg.querySelectorAll('[data-lot-id]').forEach(area => { area.style.pointerEvents = 'all'; area.style.cursor = 'pointer'; });
  host.classList.add('lot-map'); host.replaceChildren(stage, fitButton);
  host.setAttribute('aria-label', 'Mapa do loteamento. Arraste para mover, use Ctrl e arraste para aproximar ou afastar, ou use dois dedos.');
  let scale = 1, minScale = 1, x = 0, y = 0, gesture = null;
  const pointers = new Map();
  const startTargets = new Map();
  const render = () => { stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; host.dataset.zoom = String(scale); };
  const selected = new Set(selectedLotIds);
  let lotColors = { ...selectionColors };
  host.style.setProperty('--lot-selection-color', selectionColor);
  const paintSelection = () => svg.querySelectorAll('[data-lot-id]').forEach(area => {
    const isSelected = selected.has(area.dataset.lotId);
    area.classList.toggle('is-selected', isSelected);
    if (isSelected) {
      const color = lotColors[area.dataset.lotId] || selectionColor;
      area.style.fill = color; area.style.fillOpacity = '.45'; area.style.stroke = color; area.style.strokeWidth = '3px';
    } else { area.style.removeProperty('fill'); area.style.removeProperty('fill-opacity'); area.style.removeProperty('stroke'); area.style.removeProperty('stroke-width'); }
  });
  const setSelectedLotIds = ids => { selected.clear(); ids.forEach(id => selected.add(String(id))); paintSelection(); };
  const setSelectionColors = colors => { lotColors = { ...colors }; paintSelection(); };
  const position = event => { const rect = host.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const constrain = () => {
    const rect = host.getBoundingClientRect();
    const scaledWidth = WIDTH * scale, scaledHeight = HEIGHT * scale;
    x = scaledWidth <= rect.width ? (rect.width - scaledWidth) / 2 : Math.min(0, Math.max(rect.width - scaledWidth, x));
    y = scaledHeight <= rect.height ? (rect.height - scaledHeight) / 2 : Math.min(0, Math.max(rect.height - scaledHeight, y));
  };
  fitButton.addEventListener('click', event => { event.stopPropagation(); fit(); });
  const resetGesture = () => {
    const values = [...pointers.values()];
    if (values.length >= 2) {
      const [a, b] = values; const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture = { type: 'pinch', center, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale, x, y };
    } else if (values.length === 1) gesture = { type: 'pan', point: values[0], x, y };
    else gesture = null;
  };
  const fit = () => {
    const rect = host.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    minScale = Math.min(rect.width / WIDTH, rect.height / HEIGHT) * 0.95;
    scale = minScale; x = (rect.width - WIDTH * scale) / 2; y = (rect.height - HEIGHT * scale) / 2; render();
  };
  const focusLots = ids => {
    const rect = host.getBoundingClientRect();
    const targets = mapping.mappings.filter(entry => ids.includes(entry.lotId)).flatMap(entry => geometry.lots[entry.greenPolygonId] || []).map(imagePoint);
    if (!targets.length || !rect.width || !rect.height) return;
    const xs = targets.map(point => point[0]), ys = targets.map(point => point[1]);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const boundsWidth = Math.max(1, right - left), boundsHeight = Math.max(1, bottom - top);
    scale = Math.max(minScale, Math.min(minScale * 12, Math.min(rect.width * 0.72 / boundsWidth, rect.height * 0.72 / boundsHeight)));
    x = rect.width / 2 - ((left + right) / 2) * scale;
    y = rect.height / 2 - ((top + bottom) / 2) * scale;
    constrain();
    render();
  };
  host.addEventListener('pointerdown', event => {
    host.setPointerCapture(event.pointerId);
    const point = position(event); pointers.set(event.pointerId, point);
    const area = event.target.closest?.('[data-lot-id]');
    startTargets.set(event.pointerId, area ? { area, point } : null);
    if (pointers.size === 1 && event.ctrlKey) gesture = { type: 'ctrl-zoom', point, scale, x, y };
    else resetGesture();
  });
  host.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, position(event));
    const values = [...pointers.values()];
    if (gesture?.type === 'ctrl-zoom' && values.length === 1) {
      const point = values[0];
      scale = Math.max(minScale, Math.min(minScale * 12, gesture.scale * Math.exp((gesture.point.y - point.y) * 0.008)));
      const ratio = scale / gesture.scale;
      x = gesture.point.x - (gesture.point.x - gesture.x) * ratio;
      y = gesture.point.y - (gesture.point.y - gesture.y) * ratio;
    }
    if (gesture?.type === 'pan' && values.length === 1) { x = gesture.x + values[0].x - gesture.point.x; y = gesture.y + values[0].y - gesture.point.y; }
    if (gesture?.type === 'pinch' && values.length >= 2) {
      const [a, b] = values, center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      scale = Math.max(minScale, Math.min(minScale * 12, gesture.scale * Math.hypot(a.x - b.x, a.y - b.y) / gesture.distance));
      const ratio = scale / gesture.scale;
      x = center.x - (gesture.center.x - gesture.x) * ratio;
      y = center.y - (gesture.center.y - gesture.y) * ratio;
    }
    constrain();
    render();
  });
  const end = event => {
    const point = pointers.get(event.pointerId), target = startTargets.get(event.pointerId);
    if (target && pointers.size === 1 && point && Math.hypot(point.x - target.point.x, point.y - target.point.y) < 8 && target.area.isConnected) {
      const lot = { lotId: target.area.dataset.lotId, number: Number(target.area.dataset.lotNumber), catalogLabel: target.area.dataset.catalogLabel };
      if (selectionMode) {
        selected.has(lot.lotId) ? selected.delete(lot.lotId) : selected.add(lot.lotId);
        paintSelection();
        onSelectionChange?.([...selected], lot);
      } else onLotSelect?.(lot);
    }
    pointers.delete(event.pointerId); startTargets.delete(event.pointerId); resetGesture();
  };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
  host.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault(); const point = position(event), before = scale;
    scale = Math.max(minScale, Math.min(minScale * 12, scale * Math.exp(-event.deltaY * 0.0015)));
    const ratio = scale / before; x = point.x - (point.x - x) * ratio; y = point.y - (point.y - y) * ratio; constrain(); render();
  }, { passive: false });
  const observer = new ResizeObserver(() => { fit(); if (selected.size) focusLots([...selected]); }); observer.observe(host); fit(); paintSelection();
  if (focusLotIds.length) focusLots(focusLotIds);
  return { setSelectedLotIds, setSelectionColors, focusLots, fit, destroy() { observer.disconnect(); host.replaceChildren(); } };
}
