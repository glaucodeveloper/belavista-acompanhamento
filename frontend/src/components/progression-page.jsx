import React, { useEffect, useMemo, useRef, useState } from 'react';
import { mountLotMap } from '../map.js';
import lotPlan from '../assets/planta.webp';
import { savePlotPdf } from '../plot-export.js';

const MAP_WIDTH = 2329, MAP_HEIGHT = 2759;
const newArea = () => ({ id: crypto.randomUUID(), name: '', progress: 0, color: '#2878ff', points: [], allocations: [] });
const validColor = color => /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#2878ff';
const itemKey = item => `${item.kind}:${item.id}`;
const polygonArea = points => Math.abs(points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0)) / 2;

function ProgressMap({ areas, draft, drawing, shape, baseMode, onPoint, onStroke, onSelect, onBase }) {
  const host = useRef(null), instance = useRef(null), latest = useRef({});
  latest.current = { areas, draft, drawing, shape, baseMode, onPoint, onStroke, onSelect, onBase };
  useEffect(() => {
    let disposed = false;
    mountLotMap(host.current, {
      onProgressPoint: point => latest.current.onPoint(point),
      onProgressStroke: points => latest.current.onStroke(points),
      onProgressSelect: id => latest.current.onSelect(id),
      onLotSelect: lot => { if (latest.current.baseMode === 'lot') latest.current.onBase('lot', lot); },
      onStreetSelect: street => { if (latest.current.baseMode === 'street') latest.current.onBase('street', street); },
    }).then(map => {
      if (disposed) { map.destroy(); return; }
      instance.current = map;
      host.current?.setAttribute('aria-label', 'Mapa de progressão do loteamento');
      const current = latest.current;
      const preview = current.draft && (current.drawing || !current.areas.some(area => area.id === current.draft.id));
      map.setProgress({ areas: current.areas, draft: preview ? current.draft.points : [], draftRings: preview ? current.draft.rings || [] : [], drawing: current.drawing, shape: current.shape, selectingBase: !!current.baseMode, selectedId: current.draft?.id, draftColor: current.draft?.color });
    }).catch(() => { if (!disposed && host.current) host.current.textContent = 'Não foi possível carregar a planta.'; });
    return () => { disposed = true; instance.current?.destroy(); instance.current = null; };
  }, []);
  useEffect(() => { const preview = draft && (drawing || !areas.some(area => area.id === draft.id)); instance.current?.setProgress({ areas, draft: preview ? draft.points : [], draftRings: preview ? draft.rings || [] : [], drawing, shape, selectingBase: !!baseMode, selectedId: draft?.id, draftColor: draft?.color }); }, [areas, draft, drawing, shape, baseMode]);
  return <div ref={host} className="development-map" aria-label="Mapa de progressão" />;
}

async function exportProgressPdf(areas, format) {
  const { jsPDF } = await import('jspdf');
  const image = new Image(); image.src = lotPlan; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = MAP_WIDTH; canvas.height = MAP_HEIGHT;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Não foi possível preparar a planta.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.drawImage(image, 0, 0, MAP_WIDTH, MAP_HEIGHT);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format, compress: true });
  const width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight();
  const margin = 10, header = 22, legendWidth = Math.min(width * .31, 95), mapWidth = width - legendWidth - margin * 3, mapHeight = height - header - margin * 2;
  const ratio = Math.min(mapWidth / MAP_WIDTH, mapHeight / MAP_HEIGHT), drawWidth = MAP_WIDTH * ratio, drawHeight = MAP_HEIGHT * ratio;
  const left = margin + (mapWidth - drawWidth) / 2, top = header + (mapHeight - drawHeight) / 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('Progressão da obra · Aliança Park', margin, 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(`Áreas: ${areas.length}  ·  Emitido em ${new Date().toLocaleDateString('pt-BR')}`, margin, 18);
  doc.addImage(canvas.toDataURL('image/jpeg', .92), 'JPEG', left, top, drawWidth, drawHeight);
  areas.forEach((area, index) => {
    const points = area.points || []; const rings = area.rings?.length ? area.rings : [points]; if (!rings.some(ring => ring.length >= 3)) return;
    const color = validColor(area.color), rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
    doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: .4, 'stroke-opacity': .9 })); doc.setFillColor(...rgb); doc.setDrawColor(...rgb);
    const path = rings.filter(ring => ring.length >= 3).flatMap(ring => [...ring.map((point, i) => ({ op: i ? 'l' : 'm', c: [left + point[0] * ratio, top + point[1] * ratio] })), { op: 'h', c: [] }]);
    doc.path(path); doc.fillStrokeEvenOdd();
    doc.restoreGraphicsState();
    const center = points.reduce((acc, point) => [acc[0] + point[0] / points.length, acc[1] + point[1] / points.length], [0, 0]);
    doc.setTextColor(20, 25, 35); doc.setFontSize(8); doc.text(String(index + 1), left + center[0] * ratio, top + center[1] * ratio, { align: 'center' });
  });
  const legendX = width - legendWidth - margin; let cursor = header;
  doc.setTextColor(30, 40, 55); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Áreas e materiais', legendX, cursor); cursor += 7;
  for (let index = 0; index < areas.length; index++) {
    const area = areas[index], details = (area.allocations || []).map(item => `${item.name}: ${item.quantity} ${item.unit || ''}`).join('; ') || 'Sem itens vinculados';
    const titleLines = doc.splitTextToSize(`${index + 1}. ${area.name} · ${area.progress}%`, legendWidth - 8);
    const detailLines = doc.splitTextToSize(details, legendWidth - 8);
    const needed = titleLines.length * 4 + detailLines.length * 3.6 + 6;
    if (cursor + needed > height - margin) { doc.addPage(); cursor = 14; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Áreas e materiais · continuação', margin, cursor); cursor += 8; }
    const x = doc.getNumberOfPages() > 1 ? margin : legendX;
    doc.setFillColor(...[1, 3, 5].map(offset => parseInt(validColor(area.color).slice(offset, offset + 2), 16))); doc.rect(x, cursor - 3, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(titleLines, x + 5, cursor); cursor += titleLines.length * 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(detailLines, x + 5, cursor); cursor += detailLines.length * 3.6 + 5;
  }
  return savePlotPdf(doc, `progressao-alianca-park-${format}.pdf`);
}

export function ProgressionPage({ areas, materials, services, onSaveArea }) {
  const [draft, setDraft] = useState(null), [drawing, setDrawing] = useState(false), [shape, setShape] = useState('free'), [baseMode, setBaseMode] = useState(null), [originalVersion, setOriginalVersion] = useState(null);
  const [query, setQuery] = useState(''), [format, setFormat] = useState('a3'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const catalogue = useMemo(() => [...materials.map(item => ({ ...item, kind: 'material' })), ...services.map(item => ({ ...item, kind: 'service' }))], [materials, services]);
  const filtered = catalogue.filter(item => `${item.name || ''} ${item.category || ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const selected = new Map((draft?.allocations || []).map(item => [itemKey(item), item]));
  const edit = id => { const area = areas.find(item => item.id === id); if (!area) return; setDraft(structuredClone(area)); setOriginalVersion(area.updatedAt || null); setDrawing(false); setBaseMode(null); setError(''); };
  const updatePoints = points => setDraft(current => current ? { ...current, points, rings: [], sourceLabel: '' } : current);
  const addPoint = point => setDraft(current => current ? { ...current, points: [...current.points, point], rings: [], sourceLabel: '' } : current);
  const selectBase = (kind, selection) => {
    const rings = kind === 'street' ? selection.rings.filter(ring => ring.length >= 3) : [];
    const points = kind === 'street' ? [...rings].sort((a, b) => polygonArea(b) - polygonArea(a))[0] || [] : selection.points;
    if (!points?.length) { setError('Não foi possível obter o polígono selecionado.'); return; }
    const sourceLabel = kind === 'lot' ? `Lote ${selection.catalogLabel}` : selection.label;
    setDraft(current => current ? { ...current, name: current.name || sourceLabel, sourceLabel, points, rings } : current);
    setBaseMode(null); setDrawing(false); setError('');
  };
  function toggleItem(item) {
    if (!draft) return;
    const key = itemKey(item), allocations = draft.allocations || [];
    setDraft({ ...draft, allocations: selected.has(key) ? allocations.filter(value => itemKey(value) !== key) : [...allocations, { kind: item.kind, id: item.id, name: item.name || 'Sem nome', unit: item.unit || '', quantity: 1 }] });
  }
  async function save() {
    if (!draft?.name.trim()) { setError('Informe um nome para a área.'); return; }
    if (draft.points.length < 3 || polygonArea(draft.points) < 1) { setError('Desenhe uma área com pelo menos três pontos.'); return; }
    if (!/^#[0-9a-f]{6}$/i.test(draft.color || '')) { setError('Informe uma cor no formato #RRGGBB.'); return; }
    const progress = Number(draft.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100 || (draft.allocations || []).some(item => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0)) { setError('Confira o progresso e as quantidades informadas.'); return; }
    setBusy(true); setError('');
    try { await onSaveArea('save', { ...draft, name: draft.name.trim(), progress, color: validColor(draft.color), allocations: (draft.allocations || []).map(item => ({ ...item, quantity: Number(item.quantity) })), updatedAt: new Date().toISOString() }, originalVersion); setDraft(null); setDrawing(false); }
    catch (err) { setError(err.message || 'Não foi possível salvar a área.'); } finally { setBusy(false); }
  }
  async function remove() {
    if (!draft || !window.confirm(`Excluir a área “${draft.name}”?`)) return;
    setBusy(true); setError(''); try { await onSaveArea('delete', draft, originalVersion); setDraft(null); setDrawing(false); }
    catch (err) { setError(err.message || 'Não foi possível excluir a área.'); } finally { setBusy(false); }
  }
  async function exportMap() { setBusy(true); setError(''); setNotice(''); try { const result = await exportProgressPdf(areas, format); if (!result?.canceled) setNotice('Plotagem gerada.'); } catch { setError('Não foi possível gerar o PDF da planta.'); } finally { setBusy(false); } }
  return <div className="progression-page">
    <div className="progression-heading"><div><p className="eyebrow">ACOMPANHAMENTO DA OBRA</p><h2>Progressão no mapa</h2><p>Desenhe áreas na planta e registre o progresso e os itens usados.</p></div><div className="progression-export"><label>Tamanho da plotagem<select aria-label="Tamanho da plotagem" value={format} onChange={event => setFormat(event.target.value)}>{['a4','a3','a2','a1','a0'].map(size => <option key={size} value={size}>{size.toUpperCase()}</option>)}</select></label><button type="button" className="quiet-button" disabled={busy} onClick={exportMap}>Gerar PDF</button></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {notice && <p className="progression-notice" role="status">{notice}</p>}
    <div className="progression-layout"><section className="development-map-panel progression-map-panel"><div className="progression-map-actions"><div><strong>Planta do loteamento</strong><p>{baseMode === 'lot' ? 'Clique em um lote para usar seu polígono.' : baseMode === 'street' ? 'Clique em um trecho de rua para usar seu contorno.' : drawing ? 'Clique e arraste para desenhar a área, ou clique para marcar os pontos.' : 'Selecione uma área existente ou inicie um desenho.'}</p></div><div><button type="button" className="quiet-button" disabled={busy} onClick={() => { setDraft(newArea()); setOriginalVersion(null); setBaseMode(null); setDrawing(true); setError(''); }}>Nova área</button>{draft && <button type="button" className="quiet-button" onClick={() => { setBaseMode(null); setDrawing(value => !value); }}>{drawing ? 'Navegar no mapa' : 'Desenhar área'}</button>}</div></div>
      {draft && <div className="progression-draw-actions" role="group" aria-label="Ferramentas de seleção"><button type="button" className="quiet-button" aria-pressed={drawing && shape === 'free'} onClick={() => { setBaseMode(null); setShape('free'); setDrawing(true); }}>Polígono livre</button><button type="button" className="quiet-button" aria-pressed={drawing && shape === 'rectangle'} onClick={() => { setBaseMode(null); setShape('rectangle'); setDrawing(true); }}>Retângulo</button><button type="button" className="quiet-button" aria-pressed={baseMode === 'lot'} onClick={() => { setDrawing(false); setBaseMode('lot'); }}>Selecionar lote</button><button type="button" className="quiet-button" aria-pressed={baseMode === 'street'} onClick={() => { setDrawing(false); setBaseMode('street'); }}>Selecionar trecho de rua</button></div>}
      <ProgressMap areas={areas} draft={draft} drawing={drawing} shape={shape} baseMode={baseMode} onPoint={addPoint} onStroke={updatePoints} onSelect={edit} onBase={selectBase} />
      {draft && drawing && <div className="progression-draw-actions"><span>{draft.points.length} pontos</span><button type="button" className="quiet-button" disabled={!draft.points.length} onClick={() => updatePoints(draft.points.slice(0, -1))}>Desfazer ponto</button><button type="button" className="quiet-button" disabled={!draft.points.length} onClick={() => updatePoints([])}>Limpar desenho</button><button type="button" className="quiet-button" disabled={draft.points.length < 3} onClick={() => setDrawing(false)}>Concluir desenho</button></div>}
      <div className="progression-saved"><strong>Áreas registradas ({areas.length})</strong>{areas.length ? <div className="progression-area-list">{areas.map(area => <button type="button" key={area.id} aria-pressed={draft?.id === area.id} onClick={() => edit(area.id)}><span style={{ background: validColor(area.color) }} />{area.name}<small>{area.progress}%</small></button>)}</div> : <p>Nenhuma área registrada.</p>}</div>
    </section><aside className="progression-sidebar" aria-label="Materiais e serviços da área">{draft ? <><div className="progression-editor"><h3>Detalhes da área</h3>{draft.sourceLabel && <p>Base selecionada: {draft.sourceLabel}</p>}<label>Nome da área<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Drenagem norte" /></label><div className="progression-editor-grid"><label>Progresso (%)<input type="number" min="0" max="100" step="1" value={draft.progress} onChange={event => setDraft({ ...draft, progress: event.target.value })} /></label><label>Cor da área<input type="color" value={validColor(draft.color)} onChange={event => setDraft({ ...draft, color: event.target.value })} /></label></div><label>Código da cor<input value={draft.color} maxLength={7} placeholder="#2878ff" onChange={event => setDraft({ ...draft, color: event.target.value })} /></label><div className="progression-editor-actions"><button type="button" className="primary-button" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar área'}</button><button type="button" className="quiet-button" disabled={busy} onClick={() => { setDraft(null); setDrawing(false); setBaseMode(null); setError(''); }}>Cancelar</button>{areas.some(area => area.id === draft.id) && <button type="button" className="quiet-button danger-button" disabled={busy} onClick={remove}>Excluir área</button>}</div></div></> : <div className="progression-editor"><h3>Materiais e serviços</h3><p>Selecione ou crie uma área para vincular itens.</p></div>}
      <label className="progression-search">Buscar item<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Material ou serviço" /></label><div className="progression-catalog">{['material','service'].map(kind => <section key={kind}><h4>{kind === 'material' ? 'Materiais' : 'Serviços'}</h4>{filtered.filter(item => item.kind === kind).length ? filtered.filter(item => item.kind === kind).map(item => { const value = selected.get(itemKey(item)); return <div className="progression-item" key={itemKey(item)}><label><input type="checkbox" checked={!!value} disabled={!draft} onChange={() => toggleItem(item)} /><span>{item.name || 'Sem nome'}<small>{item.category || 'Sem categoria'}</small></span></label>{value && <label className="progression-quantity">Quantidade ({value.unit || 'un'})<input aria-label={`Quantidade de ${value.name}`} type="number" min="0" step="0.01" value={value.quantity} onChange={event => setDraft({ ...draft, allocations: draft.allocations.map(entry => itemKey(entry) === itemKey(item) ? { ...entry, quantity: event.target.value } : entry) })} /></label>}</div>; }) : <p>Nenhum item encontrado.</p>}</section>)}</div>
      {draft && (draft.allocations || []).filter(item => !catalogue.some(value => itemKey(value) === itemKey(item))).map(item => <div className="progression-orphan" key={itemKey(item)}>{item.name} · item removido do catálogo <button type="button" onClick={() => setDraft({ ...draft, allocations: draft.allocations.filter(value => itemKey(value) !== itemKey(item)) })}>Remover vínculo</button></div>)}
    </aside></div>
  </div>;
}
