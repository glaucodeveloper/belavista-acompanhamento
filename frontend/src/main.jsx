import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal, createRoot } from 'react-dom/client';
import { mountLotMap } from './map.js';
import { createSyncClient } from './sync.js';
import priceCatalog from './assets/tabela-precos.json';
import { AssistantChatbox } from './components/assistant-chatbox.jsx';
import { AgendaPage } from './components/agenda-page.jsx';
import { FileSpreadsheet, FileText, Printer, Plus, X, Trash2, Sun, Moon, EllipsisVertical, MessageCircle } from 'lucide-react';
import { exportReportCsv, exportReportPdf } from './report-exports.js';
import { TreeProvider, TreeView, TreeNode, TreeNodeTrigger, TreeNodeContent, TreeLabel } from './components/kibo-tree.jsx';
import { StagesPage } from './components/stages-page.jsx';
import aliancaLogo from './assets/alianca-park-logo-mark.png';
import lotPlan from './assets/planta.webp';
import mapLotIndex from './assets/mapeamento.json';
import archivedStageData from './data/archived-stage-seed.json';

const WORKER = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';
export const sync = createSyncClient({ workerUrl: WORKER, getToken: () => sessionStorage.getItem('alianca-session-token') });
const pages = [
  { id: 'map', label: 'Loteamento', icon: '⌖', title: 'Loteamento' },
  { id: 'materials', label: 'Materiais', icon: '▦', title: 'Materiais' },
  { id: 'stages', label: 'Etapas', icon: '⚒', title: 'Etapas' },
  { id: 'transfers', label: 'Repasses', icon: '⇄', title: 'Repasses' },
  { id: 'agenda', label: 'Agenda', icon: '▦', title: 'Agenda de obra' },
];
const configs = {
  lots: { singular: 'lote', noun: 'Lotes', description: 'Situação comercial, valores oficiais e recebimentos por lote.', fields: [['label', 'Lote', 'text', true], ['quadra', 'Quadra', 'text', true], ['area', 'Área (m²)', 'number', true], ['price', 'Preço oficial', 'currency', true], ['contractPrice', 'Valor contratado', 'currency', false], ['received', 'Entradas recebidas', 'currency', false], ['status', 'Situação', 'select', true]], columns: [['label', 'Lote'], ['quadra', 'Quadra'], ['area', 'Área'], ['price', 'Preço oficial'], ['contractPrice', 'Contratado'], ['received', 'Recebido'], ['status', 'Situação']] },
  materials: { singular: 'material', noun: 'Materiais', description: 'Organize itens de compra e consumo por categoria.', fields: [['name', 'Material', 'text', true], ['category', 'Categoria', 'text', true], ['unit', 'Unidade', 'text', true], ['quantity', 'Quantidade', 'number', true], ['unitPrice', 'Preço unitário', 'currency', true]], columns: [['name', 'Material'], ['category', 'Categoria'], ['unit', 'Unidade'], ['quantity', 'Quantidade'], ['unitPrice', 'Preço unitário'], ['total', 'Total']] },
  services: { singular: 'serviço', noun: 'Serviços', description: 'Mantenha os serviços e seus valores de referência.', fields: [['name', 'Serviço', 'text', true], ['category', 'Categoria', 'text', true], ['unit', 'Unidade de medição', 'text', true], ['quantity', 'Quantidade', 'number', true], ['unitPrice', 'Valor unitário', 'currency', true]], columns: [['name', 'Serviço'], ['category', 'Categoria'], ['unit', 'Unidade'], ['quantity', 'Quantidade'], ['unitPrice', 'Valor unitário'], ['total', 'Total']] },
  transfers: { singular: 'entrada', noun: 'Repasses', description: 'Comissões calculadas sobre entradas registradas. O cálculo não executa pagamento.', fields: [['broker', 'Corretor', 'text', true], ['lotLabel', 'Lote', 'text', true], ['reason', 'Tipo da entrada', 'select', true], ['date', 'Data', 'date', true], ['amount', 'Entrada recebida', 'currency', true], ['commissionPercent', 'Comissão do corretor (%)', 'number', true]], columns: [['broker', 'Corretor'], ['lotLabel', 'Lote'], ['reason', 'Entrada'], ['date', 'Data'], ['amount', 'Entrada recebida'], ['commissionPercent', 'Comissão (%)'], ['commission', 'Comissão calculada'], ['warley', 'Warley'], ['partner', 'Parceiro']] },
};
const REPASSE_REASONS = [
  { id: 'signal', label: 'Sinal', sharePercent: 40, warleyPercent: 50, partnerPercent: 50 },
  { id: 'intermediate', label: 'Parcela intermediária', sharePercent: 30, warleyPercent: 50, partnerPercent: 50 },
  { id: 'monthly', label: 'Mensal', sharePercent: 30, warleyPercent: 70, partnerPercent: 30 },
];
const emptyData = () => ({ lots: [], materials: [], services: [], transfers: [], agenda: [], stages: [] });
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const valueOf = (row, key, kind) => kind === 'currency' || key === 'amount' || key === 'unitPrice' || key === 'total' ? money(key === 'total' ? row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0) : row[key]) : key === 'area' ? `${Number(row[key] || 0).toLocaleString('pt-BR')} m²` : key === 'date' && row[key] ? new Date(`${row[key]}T12:00:00`).toLocaleDateString('pt-BR') : row[key] || '—';
const legacyLotLabels = new Map([['QF-198', 'QF-189'], ['QG-340', 'QG-240'], ['QG-341', 'QG-241'], ['QG-342', 'QG-242']]);
const priceCatalogByLabel = new Map(priceCatalog.map(lot => [lot.label, lot]));

function reconcileLotCatalog(savedLots) {
  const source = Array.isArray(savedLots) ? savedLots : [];
  const byLabel = new Map();
  let qf186Count = 0;
  for (const row of source) {
    let label = String(row?.id || row?.label || '');
    if (!priceCatalogByLabel.has(label) && row?.label) label = String(row.label);
    if (label === 'QF-186') {
      qf186Count += 1;
      if (qf186Count > 1) label = 'QF-187';
    } else label = legacyLotLabels.get(label) || label;
    if (!priceCatalogByLabel.has(label) || byLabel.has(label)) continue;
    byLabel.set(label, row);
  }
  const lots = priceCatalog.map(official => {
    const saved = byLabel.get(official.label);
    return {
      ...(saved || {}), ...official, id: official.label,
      status: saved?.status ?? 'Disponível',
      contractPrice: saved?.contractPrice ?? '',
      received: saved?.received ?? '',
    };
  });
  const fields = ['id', 'label', 'lot', 'quadra', 'area', 'price'];
  const signature = rows => JSON.stringify(rows.map(row => fields.map(field => row?.[field] ?? null)));
  return { lots, changed: signature(source) !== signature(lots) };
}

function MapView({ onLotSelect, className = '', selectionMode = false, selectedLotIds = [], onSelectionChange, selectionColors = {} }) {
  const ref = useRef(null);
  const mapId = useId();
  const mapRef = useRef(null), callbacksRef = useRef({});
  callbacksRef.current = { onLotSelect, onSelectionChange };
  useEffect(() => {
    let disposed = false;
    mountLotMap(ref.current, { selectionMode, selectedLotIds, selectionColors, onLotSelect: lot => callbacksRef.current.onLotSelect?.(lot), onSelectionChange: (ids, lot) => callbacksRef.current.onSelectionChange?.(ids, lot) })
      .then(value => { if (disposed) value?.destroy(); else { mapRef.current = value; } })
      .catch(error => { if (!disposed) ref.current.textContent = error.message; });
    const fitForPrint = () => mapRef.current?.fit();
    window.addEventListener('beforeprint', fitForPrint);
    return () => { disposed = true; window.removeEventListener('beforeprint', fitForPrint); mapRef.current?.destroy(); mapRef.current = null; };
  }, [selectionMode]);
  useEffect(() => { mapRef.current?.setSelectedLotIds(selectedLotIds); }, [selectedLotIds]);
  useEffect(() => { mapRef.current?.setSelectionColors(selectionColors); }, [selectionColors]);
  return <div id={`mapa-${mapId.replaceAll(':', '')}`} className={className} ref={ref} aria-label="Mapa do loteamento" />;
}

function MapPrintModal({ lots, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState('Mapa do loteamento');
  const [subtitle, setSubtitle] = useState('Aliança Park');
  const [legends, setLegends] = useState([{ id: 'selected', label: 'Área selecionada', color: '#2878ff' }]);
  const [areaLegend, setAreaLegend] = useState({});
  const selectedColors = Object.fromEntries(selectedIds.map(id => [id, legends.find(item => item.id === areaLegend[id])?.color || legends[0]?.color || '#2878ff']));
  const onSelectionChange = useCallback(ids => {
    setSelectedIds(ids);
    setAreaLegend(current => Object.fromEntries(ids.map(id => [id, current[id] || legends[0]?.id || 'selected'])));
  }, [legends]);
  useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  function addLegend() { setLegends(items => [...items, { id: crypto.randomUUID(), label: '', color: '#e18b28' }]); }
  function updateLegend(id, patch) { setLegends(items => items.map(item => item.id === id ? { ...item, ...patch } : item)); }
  function removeLegend(id) {
    if (legends.length < 2) return;
    const fallback = legends.find(item => item.id !== id)?.id;
    setLegends(items => items.filter(item => item.id !== id));
    setAreaLegend(current => Object.fromEntries(Object.entries(current).map(([lotId, legendId]) => [lotId, legendId === id ? fallback : legendId])));
  }
  const idsForDisplay = selectedIds.map(id => {
    const mapEntry = mapLotIndex.mappings.find(entry => entry.lotId === id);
    const number = mapEntry?.number;
    const match = lots.find(lot => lot.label === mapEntry?.officialLabel) || null;
    return { id, number, match };
  }).sort((a, b) => String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true }));
  return createPortal(<div className="map-print-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="map-print-modal" role="dialog" aria-modal="true" aria-labelledby="map-print-title">
      <header className="map-print-header"><div><p className="eyebrow">IMPRESSÃO PERSONALIZADA</p><h2 id="map-print-title">Preparar mapa para impressão</h2><p>Selecione lotes no mapa e organize a identificação e a legenda.</p></div><button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}><X size={18} /></button></header>
      <div className="map-print-body">
        <div className="map-print-canvas"><MapView className="map-print-map" selectionMode selectedLotIds={selectedIds} onSelectionChange={onSelectionChange} selectionColors={selectedColors} /></div>
        <aside className="map-print-options">
          <label>Título<input value={title} onChange={event => setTitle(event.target.value)} /></label>
          <label>Identificação<input value={subtitle} onChange={event => setSubtitle(event.target.value)} placeholder="Empreendimento, quadra ou referência" /></label>
          <section className="map-print-legends"><div className="map-print-subheading"><strong>Legenda</strong><button type="button" className="quiet-button" onClick={addLegend}><Plus size={14} /> Adicionar</button></div>
            {legends.map(item => <div className="map-print-legend-edit" key={item.id}><input type="color" aria-label="Cor da legenda" value={item.color} onChange={event => updateLegend(item.id, { color: event.target.value })} /><input aria-label="Texto da legenda" value={item.label} placeholder="Descrição da legenda" onChange={event => updateLegend(item.id, { label: event.target.value })} /><button type="button" className="icon-button subtle" aria-label="Remover legenda" disabled={legends.length < 2} onClick={() => removeLegend(item.id)}><Trash2 size={14} /></button></div>)}
          </section>
          <section className="map-print-selected"><div className="map-print-subheading"><strong>Áreas selecionadas</strong><span>{selectedIds.length}</span></div>
            {!selectedIds.length ? <p className="map-print-empty">Clique nos lotes do mapa para adicioná-los à impressão.</p> : <ul>{idsForDisplay.map(({ id, number, match }) => <li key={id}><span><strong>{match?.label || `Lote ${number}`}</strong><small>{match ? `${match.quadra} · ${Number(match.area).toLocaleString('pt-BR')} m²` : id}</small></span><select aria-label={`Legenda do lote ${number}`} value={areaLegend[id] || legends[0]?.id || ''} onChange={event => setAreaLegend(current => ({ ...current, [id]: event.target.value }))}>{legends.map(item => <option value={item.id} key={item.id}>{item.label || 'Legenda sem nome'}</option>)}</select><button type="button" className="icon-button subtle" aria-label={`Remover lote ${number}`} onClick={() => setSelectedIds(current => current.filter(value => value !== id))}><X size={14} /></button></li>)}</ul>}
          </section>
        </aside>
      </div>
      <footer className="map-print-footer"><span>{selectedIds.length ? `${selectedIds.length} áreas incluídas` : 'Nenhuma área selecionada'}</span><div><button type="button" className="quiet-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" disabled={!selectedIds.length} onClick={() => window.print()}><Printer size={15} /> Imprimir mapa</button></div></footer>
      <article className="map-print-sheet" aria-hidden="true">
        <header><img src={aliancaLogo} alt="" /><div><h1>{title || 'Mapa do loteamento'}</h1><p>{subtitle || 'Aliança Park'} · Emitido em {new Date().toLocaleDateString('pt-BR')}</p></div></header>
        <div className="map-print-sheet-content"><div className="map-print-sheet-map"><MapView className="map-print-map map-print-static" selectionMode selectedLotIds={selectedIds} selectionColors={selectedColors} /></div><aside><h2>Legenda</h2>{legends.filter(item => item.label.trim()).map(item => <div className="map-print-sheet-legend" key={item.id}><i style={{ background: item.color }} />{item.label}</div>)}<h2>Áreas identificadas</h2><ol>{idsForDisplay.map(({ id, number, match }) => <li key={id}><strong>{match?.label || `Lote ${number}`}</strong><span>{match ? `${match.quadra} · ${Number(match.area).toLocaleString('pt-BR')} m²` : id}</span><i style={{ background: legends.find(item => item.id === areaLegend[id])?.color || legends[0]?.color }} /></li>)}</ol></aside></div>
        <footer>Aliança Park · Mapa de referência operacional</footer>
      </article>
    </section>
  </div>, document.body);
}

function LotDevelopmentPage({ lots, onSave }) {
  const [selection, setSelection] = useState(null);
  const [choice, setChoice] = useState('');
  const [entry, setEntry] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), description: '' });
  const [status, setStatus] = useState('Disponível');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [printMapOpen, setPrintMapOpen] = useState(false);
  const groups = Object.groupBy(lots, lot => lot.quadra || 'Sem quadra');
  const candidates = selection ? selection.catalogLabel
    ? lots.filter(lot => lot.label === selection.catalogLabel)
    : lots.filter(lot => Number(lot.lot) === Number(selection.number) || lot.label === selection.lotId)
    : [];
  const selected = candidates.find(lot => lot.id === choice)
    || candidates.find(lot => lot.id === (selection?.catalogLabel || selection?.lotId))
    || (candidates.length === 1 ? candidates[0] : null);
  useEffect(() => { if (selected) setStatus(selected.status || 'Disponível'); }, [selected?.id]);
  const openLot = useCallback(selectionData => { setSelection(selectionData); setChoice(''); setError(''); setEntry({ amount: '', date: new Date().toISOString().slice(0, 10), description: '' }); }, []);
  async function save(event) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError('');
    const amount = Number(entry.amount || 0);
    const history = [...(selected.entryHistory || [])];
    if (amount > 0) history.push({ id: crypto.randomUUID(), amount, date: entry.date, description: entry.description.trim() });
    const next = lots.map(lot => lot.id === selected.id ? { ...lot, status, entryHistory: history, received: Number(selected.received || 0) + amount } : lot);
    try { await onSave('lots', next); setSelection(null); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="development-page">
    <section className="development-map-panel"><div className="section-heading"><div><p className="eyebrow">PLANTA INTERATIVA</p><h2>Mapa do loteamento</h2><p>Toque em um lote para registrar entrada e situação.</p></div><div className="map-heading-actions"><span className="map-hint">Ctrl + roda do mouse para zoom</span><button type="button" className="quiet-button map-print-trigger" onClick={() => setPrintMapOpen(true)}><Printer size={15} /> Imprimir mapa</button></div></div><MapView className="development-map" onLotSelect={openLot} /></section>
    <section className="lot-catalog-panel"><div className="section-heading"><div><p className="eyebrow">CATÁLOGO OFICIAL</p><h2>Lotes por quadra</h2><p>{lots.length} lotes cadastrados · selecione um para abrir a ficha.</p></div><span className="map-hint">Valores oficiais da tabela</span></div>
      {lots.length ? <TreeProvider defaultExpandedIds={Object.keys(groups)}><TreeView>{Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([quadra, items]) => <TreeNode nodeId={quadra} key={quadra}>
        <TreeNodeTrigger hasChildren><TreeLabel>{quadra}<small>{items.length} lotes</small></TreeLabel></TreeNodeTrigger>
        <TreeNodeContent>{items.slice().sort((a, b) => Number(a.lot) - Number(b.lot)).map(lot => <TreeNode nodeId={`${quadra}:${lot.id}`} level={1} key={lot.id}><TreeNodeTrigger onSelect={() => openLot({ number: lot.lot, lotId: lot.id })}><TreeLabel>{lot.label}<small>{Number(lot.area || 0).toLocaleString('pt-BR')} m² · {money(lot.price)}</small></TreeLabel><span className={`lot-status status-${String(lot.status || 'Disponível').toLowerCase().replaceAll(' ', '-')}`}>{lot.status || 'Disponível'}</span></TreeNodeTrigger></TreeNode>)}</TreeNodeContent>
      </TreeNode>)}</TreeView></TreeProvider> : <p className="empty-lots">Nenhum lote no catálogo.</p>}</section>
    {selection && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelection(null); }}><section className="lot-modal" role="dialog" aria-modal="true" aria-labelledby="lot-modal-title"><div className="form-heading"><div><p className="eyebrow">FICHA DO LOTE</p><h2 id="lot-modal-title">{selected?.label || `Lote ${selection.number}`}</h2></div><button type="button" className="quiet-button" onClick={() => setSelection(null)}>Fechar</button></div>
      {candidates.length > 1 && <label className="lot-choice">Escolha a quadra<select value={selected?.id || ''} onChange={event => { setChoice(event.target.value); setStatus(lots.find(lot => lot.id === event.target.value)?.status || 'Disponível'); }}><option value="">Selecione o lote</option>{candidates.map(lot => <option value={lot.id} key={lot.id}>{lot.label} · {lot.quadra}</option>)}</select></label>}
      {selected ? <form onSubmit={save}><div className="lot-facts"><span>Quadra<strong>{selected.quadra}</strong></span><span>Área<strong>{Number(selected.area || 0).toLocaleString('pt-BR')} m²</strong></span><span>Preço oficial<strong>{money(selected.price)}</strong></span><span>Entradas recebidas<strong>{money(selected.received)}</strong></span></div><label>Situação<select value={status} onChange={event => setStatus(event.target.value)}>{['Disponível', 'Reservado', 'Vendido', 'Bloqueado'].map(value => <option key={value}>{value}</option>)}</select></label><div className="entry-fields"><h3>Registrar entrada</h3><label>Valor recebido<input type="number" min="0" step="0.01" value={entry.amount} onChange={event => setEntry({ ...entry, amount: event.target.value })} placeholder="0,00" /></label><div className="form-grid"><label>Data<input type="date" value={entry.date} onChange={event => setEntry({ ...entry, date: event.target.value })} /></label><label>Descrição<input value={entry.description} onChange={event => setEntry({ ...entry, description: event.target.value })} placeholder="Sinal, mensalidade…" /></label></div></div>{error && <p className="error-message" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="quiet-button" onClick={() => setSelection(null)}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar lote'}</button></div></form> : <p className="empty-lots">Há mais de um lote com este número. Escolha a quadra para continuar.</p>}</section></div>}
    {printMapOpen && <MapPrintModal lots={lots} onClose={() => setPrintMapOpen(false)} />}
  </div>;
}

function RepassePage({ rows, lots, onSave, owner }) {
  return <DataPage type="transfers" rows={rows} lots={lots} onSave={onSave} owner={owner} />;
}

function ThemeToggle({ theme, onChange }) {
  const dark = theme === 'dark';
  return <button type="button" className="theme-toggle" aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'} title={dark ? 'Modo claro' : 'Modo escuro'} onClick={() => onChange(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}<span>{dark ? 'Claro' : 'Escuro'}</span>
  </button>;
}

function Login({ onLogin, theme, onThemeChange }) {
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const kind = detectClientKind();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${WORKER}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, client: kind }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');
      sessionStorage.setItem('alianca-session-token', result.token); onLogin(result.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="login-shell"><div className="login-layout">
    <section className="login-visual" aria-label="Aliança Park, gestão de loteamento e obras">
      <div className="login-identity"><img src={aliancaLogo} alt="" /><div><strong>Aliança Park</strong><span>Gestão de loteamento e obras</span></div></div>
      <img className="login-map" src={lotPlan} alt="Planta do loteamento Aliança Park" />
      <div className="login-message"><h2>Do mapa ao andamento da obra.</h2><p>Informações comerciais e operacionais reunidas para a equipe acompanhar o empreendimento.</p></div>
      <span className="login-visual-caption">Aliança Park · Bahia</span>
    </section>
    <section className="login-access" aria-label="Acesso à aplicação">
      <ThemeToggle theme={theme} onChange={onThemeChange} />
      <form className="login-card" onSubmit={submit}>
        <div className="login-mobile-brand"><img src={aliancaLogo} alt="" /><span>Aliança Park</span></div>
        <p className="eyebrow">Acesso à aplicação</p><h1>Entrar</h1><p className="login-copy">Use o usuário e a senha da sua conta.</p>
        <label>Usuário<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required /></label>
        <label>Senha<input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {error && <p className="error-message" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <p className="login-device">Acesso pelo <strong>{kind === 'mobile' ? 'celular' : 'computador'}</strong></p>
      </form>
    </section>
  </div></main>;
}

function detectClientKind() {
  if (navigator.userAgentData?.mobile) return 'mobile';
  const mobileAgent = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
  const touchTablet = navigator.maxTouchPoints > 1 && /iPad|MacIntel/i.test(navigator.platform);
  return mobileAgent || touchTablet ? 'mobile' : 'desktop';
}

function DataPage({ type, rows, lots = [], onSave, owner }) {
  const config = configs[type], [query, setQuery] = useState(''), [editing, setEditing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [editing]);
  const filtered = rows.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(query.toLowerCase())));
  const materialGroups = type === 'materials' ? Object.groupBy(filtered, row => row.category || 'Sem categoria') : null;
  const repasseDetails = row => {
    const reason = REPASSE_REASONS.find(item => item.id === row.reason);
    const commission = roundMoney(Number(row.amount || 0) * Number(row.commissionPercent || 0) / 100 * Number(reason?.sharePercent || 0) / 100);
    const warley = roundMoney(commission * Number(reason?.warleyPercent || 0) / 100);
    return { commission, warley, partner: roundMoney(commission - warley), reason: reason?.label };
  };
  const total = filtered.reduce((sum, row) => sum + (type === 'transfers' ? repasseDetails(row).commission : Number(row.total ?? row.amount ?? row.contractPrice ?? Number(row.quantity || 0) * Number(row.unitPrice || 0))), 0);
  const shownValue = (row, key, kind) => {
    if (type === 'transfers') {
      if (key === 'reason') return REPASSE_REASONS.find(item => item.id === row.reason)?.label || '—';
      if (['commission', 'warley', 'partner'].includes(key)) return money(repasseDetails(row)[key]);
    }
    if (key === 'total') return money(row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0));
    return valueOf(row, key, kind);
  };
  function exportRows(format) {
    const args = { type, rows: filtered, title: config.noun, owner, query, repasseDetails };
    try { if (format === 'csv') exportReportCsv(args); else exportReportPdf(args); }
    catch (err) { setError(`Não foi possível exportar o relatório: ${err.message}`); }
  }
  async function persist(next) { setBusy(true); setError(''); try { await onSave(type, next); setEditing(null); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  function start(row) { setEditing(row ? { ...row } : { id: crypto.randomUUID(), status: 'Pendente' }); }
  return <div className="data-page">
    <div className="page-intro"><div><p className="eyebrow">CONTROLE OPERACIONAL</p><h2>{config.noun}</h2><p>{config.description}</p></div><div className="page-actions"><div className="export-actions"><button className="quiet-button export-button" type="button" onClick={() => exportRows('csv')}><FileSpreadsheet size={15} /> CSV</button><button className="quiet-button export-button" type="button" onClick={() => exportRows('pdf')}><FileText size={15} /> PDF</button></div><button className="primary-button" onClick={() => start(null)}>Adicionar {config.singular}</button></div></div>
    <div className="summary-strip"><div><span>Registros</span><strong>{rows.length}</strong></div><div><span>{type === 'transfers' ? 'Comissão calculada' : 'Valor total'}</span><strong>{money(total)}</strong></div><div><span>Exibindo</span><strong>{filtered.length}</strong></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="table-tools"><label className="search-field"><span>Buscar</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar ${config.singular}`} /></label><span className="data-count">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span></div>
    {type === 'transfers' && <section className="repasse-contract"><div><p className="eyebrow">REGRA CONTRATUAL</p><h3>Destino da comissão por tipo de entrada</h3><p>Comissão = entrada × comissão do corretor × participação do tipo. O percentual do corretor precisa estar cadastrado para o lote e o corretor.</p></div><div className="repasse-rule-list">{REPASSE_REASONS.map(reason => <article key={reason.id}><strong>{reason.label}</strong><span>{reason.sharePercent}% da comissão</span><span>Warley {reason.warleyPercent}%</span><span>Parceiro {reason.partnerPercent}%</span></article>)}</div></section>}
    {editing && <form ref={formRef} className="record-form" onSubmit={event => { event.preventDefault(); const exists = rows.some(row => row.id === editing.id); persist(exists ? rows.map(row => row.id === editing.id ? editing : row) : [...rows, editing]); }}>
      <div className="form-heading"><h3>{rows.some(row => row.id === editing.id) ? `Editar ${config.singular}` : `Novo ${config.singular}`}</h3><button type="button" className="quiet-button" onClick={() => setEditing(null)}>Fechar</button></div>
      <div className="form-grid">{config.fields.map(([key, label, kind, required]) => <label key={key}>{label}{type === 'transfers' && key === 'lotLabel' ? <select required value={editing[key] || ''} onChange={e => setEditing({ ...editing, [key]: e.target.value })}><option value="">Selecione um lote</option>{lots.map(lot => <option value={lot.label} key={lot.id}>{lot.label} · {lot.quadra}</option>)}</select> : kind === 'select' ? <select required={required} value={editing[key] || (type === 'lots' ? 'Disponível' : type === 'transfers' ? REPASSE_REASONS[0].id : 'Pendente')} onChange={e => setEditing({ ...editing, [key]: e.target.value })}>{(type === 'lots' ? ['Disponível', 'Reservado', 'Vendido', 'Bloqueado'] : type === 'transfers' ? REPASSE_REASONS.map(reason => reason.id) : ['Pendente', 'Programado', 'Pago', 'Cancelado']).map(option => <option value={option} key={option}>{type === 'transfers' ? REPASSE_REASONS.find(reason => reason.id === option)?.label : option}</option>)}</select> : <input required={required} type={kind === 'currency' ? 'number' : kind} min={kind === 'number' || kind === 'currency' ? '0' : undefined} max={key === 'commissionPercent' ? '100' : undefined} step={kind === 'currency' || kind === 'number' ? '0.01' : undefined} value={editing[key] ?? ''} onChange={e => setEditing({ ...editing, [key]: e.target.value })} />}</label>)}</div>
      <div className="form-actions"><button type="button" className="quiet-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div>
    </form>}
    {filtered.length ? (materialGroups ? Object.entries(materialGroups).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([category, items]) => <section className="category-group" key={category}><h3>{category}<span>{items.length}</span></h3><div className="table-wrap"><table><thead><tr>{config.columns.filter(([key]) => key !== 'category').map(([, label]) => <th key={label}>{label}</th>)}<th>Ações</th></tr></thead><tbody>{items.map(row => <tr key={row.id}>{config.columns.filter(([key]) => key !== 'category').map(([key, label]) => <td key={label}>{shownValue(row, key, config.fields.find(field => field[0] === key)?.[2])}</td>)}<td className="row-actions"><button className="quiet-button" onClick={() => start(row)}>Editar</button><button className="quiet-button danger-button" onClick={() => persist(rows.filter(item => item.id !== row.id))}>Excluir</button></td></tr>)}</tbody></table></div></section>) : <div className="table-wrap"><table><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}<th>Ações</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}>{config.columns.map(([key, label]) => <td key={label}>{shownValue(row, key, config.fields.find(field => field[0] === key)?.[2])}</td>)}<td className="row-actions"><button className="quiet-button" onClick={() => start(row)}>Editar</button><button className="quiet-button danger-button" onClick={() => persist(rows.filter(item => item.id !== row.id))}>Excluir</button></td></tr>)}</tbody></table></div>) : <div className="table-wrap"><table><tbody><tr><td colSpan={config.columns.length + 1} className="empty-cell"><strong>{rows.length ? 'Nenhum resultado' : `Nenhum ${config.singular} cadastrado`}</strong><span>{rows.length ? 'Tente outro termo de busca.' : `Adicione o primeiro ${config.singular} para começar.`}</span>{!rows.length && <button className="quiet-button" onClick={() => start(null)}>Adicionar {config.singular}</button>}</td></tr></tbody></table></div>}
  </div>;
}

function App() {
  const [user, setUser] = useState(null), [active, setActive] = useState(() => location.hash.match(/^#\/(map|materials|stages|transfers|agenda)$/)?.[1] || 'map');
  const [theme, setTheme] = useState(() => localStorage.getItem('alianca-theme') === 'dark' ? 'dark' : 'light');
  const [section, setSection] = useState('menu');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null), pageContentRef = useRef(null);
  const [data, setData] = useState(emptyData), [revision, setRevision] = useState(null), [syncError, setSyncError] = useState('');
  const dataRef = useRef(data), revisionRef = useRef(revision);
  const page = section === 'assistant' ? { title: 'Assistente' } : pages.find(item => item.id === active) || pages[0];
  async function loadRemoteData() {
    let stored = await sync.read();
    let loaded = { ...emptyData(), ...stored.data };
    const lotCatalog = reconcileLotCatalog(stored.data?.lots);
    loaded.lots = lotCatalog.lots;
    let needsSeed = !Array.isArray(stored.data?.lots) || lotCatalog.changed;
    if (!Array.isArray(stored.data?.stages)) {
      loaded.stages = archivedStageData.stages;
      needsSeed = true;
    }
    if (needsSeed) {
      try { stored = await sync.write(loaded, stored.revision); }
      catch (error) {
        if (error.status !== 409) throw error;
        stored = await sync.read();
        loaded = { ...emptyData(), ...stored.data };
        const latestLots = reconcileLotCatalog(stored.data?.lots);
        loaded.lots = latestLots.lots;
        const latestStagesMissing = !Array.isArray(stored.data?.stages);
        if (latestStagesMissing) loaded.stages = archivedStageData.stages;
        if (latestLots.changed || latestStagesMissing) stored = await sync.write(loaded, stored.revision);
      }
    }
    dataRef.current = loaded; revisionRef.current = stored.revision;
    setData(loaded); setRevision(stored.revision);
  }
  useEffect(() => { const token = sessionStorage.getItem('alianca-session-token'); if (!token) return; fetch(`${WORKER}/api/session`, { headers: { Authorization: `Bearer ${token}` } }).then(async response => { if (!response.ok) throw new Error(); const result = await response.json(); setUser(result.user); await loadRemoteData(); }).catch(() => sessionStorage.removeItem('alianca-session-token')); }, []);
  useEffect(() => { document.title = `${page.title} · Aliança Park`; }, [page.title]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('alianca-theme', theme); }, [theme]);
  useEffect(() => { pageContentRef.current?.scrollTo(0, 0); }, [active, section]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnPointer = event => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const closeOnEscape = event => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', closeOnPointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnPointer); document.removeEventListener('keydown', closeOnEscape); };
  }, [menuOpen]);
  function navigate(id) { setActive(id); setSection('menu'); setMenuOpen(false); history.replaceState(null, '', `#/${id}`); }
  async function saveRecords(type, rows) {
    const next = { ...dataRef.current, [type]: rows };
    const saved = await sync.write(next, revisionRef.current);
    dataRef.current = next; revisionRef.current = saved.revision;
    setData(next); setRevision(saved.revision); setSyncError('');
  }
  async function signOut() { const token = sessionStorage.getItem('alianca-session-token'); try { await fetch(`${WORKER}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } finally { sessionStorage.removeItem('alianca-session-token'); dataRef.current = emptyData(); revisionRef.current = null; setUser(null); setData(emptyData()); setRevision(null); } }
  const allocateClassification = async result => {
    const recognized = result.recognized || {};
    const currentData = dataRef.current;
    if (result.intent === 'stage_activity_evidence') {
      const evidence = result.fieldEvidence || {};
      const stage = (currentData.stages || []).find(row => row.id === evidence.stageId);
      const activity = stage?.activities?.find(row => row.id === evidence.activityId);
      if (!stage || !activity) throw new Error('A atividade de destino não existe mais. Atualize as etapas e tente novamente.');
      const evidenceId = result.evidenceId || crypto.randomUUID();
      if ((activity.fieldEvidence || []).some(item => item.inferenceId === result.inferenceId || item.id === evidenceId)) return;
      if (!result.sourceImage?.data || !result.sourceImage?.mimeType) throw new Error('A imagem original não está disponível para anexar à atividade. Reenvie a foto.');
      const token = sessionStorage.getItem('alianca-session-token');
      const upload = await fetch(`${WORKER}/api/activity-evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, filename: result.filename || 'foto-de-servico', image: result.sourceImage }),
      });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) throw new Error(uploaded.error || 'Não foi possível guardar a foto no repositório privado.');
      const savedEvidence = {
        id: evidenceId,
        inferenceId: result.inferenceId,
        filename: result.filename || uploaded.filename,
        repositoryPath: uploaded.repositoryPath,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        summary: String(evidence.summary || recognized.description || '').trim(),
        userNotes: String(evidence.userNotes || '').trim(),
        location: String(evidence.location || '').trim(),
        observedStatus: evidence.observedStatus || 'unclear',
        activityConfidence: Number(evidence.activityConfidence || 0),
        createdAt: new Date().toISOString(),
      };
      const nextStages = (currentData.stages || []).map(row => row.id !== stage.id ? row : {
        ...row,
        activities: row.activities.map(item => item.id !== activity.id ? item : {
          ...item,
          fieldEvidence: [...(item.fieldEvidence || []), savedEvidence],
        }),
      });
      await saveRecords('stages', nextStages);
      return;
    }
    if (result.category === 'entry_receipt') {
      const target = (currentData.lots || []).find(lot => lot.id === result.allocation?.lotId || String(lot.label || '').toLowerCase() === String(recognized.lotLabel || '').toLowerCase());
      if (!target) throw new Error('Selecione um lote antes de aplicar a entrada.');
      if (result.inferenceId && (target.entryHistory || []).some(entry => entry.inferenceId === result.inferenceId)) return;
      const next = (currentData.lots || []).map(lot => lot.id === target.id ? { ...lot, received: Number(lot.received || 0) + Number(recognized.amount || 0), entryHistory: [...(lot.entryHistory || []), { id: crypto.randomUUID(), inferenceId: result.inferenceId, amount: Number(recognized.amount || 0), date: recognized.date || new Date().toISOString().slice(0, 10), description: recognized.description || recognized.supplier || 'Entrada reconhecida por imagem' }] } : lot);
      await saveRecords('lots', next); return;
    }
    const type = result.category === 'material_expense' ? 'materials' : result.category === 'service_expense' ? 'services' : null;
    if (!type) throw new Error('A categoria ainda precisa ser identificada.');
    if (result.inferenceId && (currentData[type] || []).some(row => row.inferenceId === result.inferenceId)) return;
    const officeRoute = result.allocation?.department === 'Escritório';
    if (!Array.isArray(recognized.items) || !recognized.items.length || recognized.items.some(item => !String(item.description || '').trim())) throw new Error('A descrição dos itens precisa ser identificada automaticamente antes de aplicar a nota. Envie uma imagem mais nítida e completa.');
    const identifiedItems = Array.isArray(recognized.items) ? recognized.items.filter(item => item.description) : [];
    const allItemsPriced = identifiedItems.length && identifiedItems.every(item => item.amount != null || item.unitPrice != null);
    if (identifiedItems.length > 1 && !allItemsPriced) throw new Error('Informe o valor de cada item da nota antes de aplicar a classificação por atividade.');
    const items = allItemsPriced ? identifiedItems : identifiedItems.length === 1 ? [{ ...identifiedItems[0], amount: identifiedItems[0].amount ?? recognized.amount }] : [];
    if (!officeRoute && items.some(item => !item.activityId || !item.stageId)) throw new Error('Escolha uma atividade de etapa para cada item antes de aplicar a nota.');
    const next = [...(currentData[type] || []), ...items.map(item => { const quantity = Number(item.quantity || 1), totalAmount = Number(item.amount ?? (Number(item.unitPrice || 0) * quantity)); return { id: crypto.randomUUID(), inferenceId: result.inferenceId, name: item.description || recognized.description || 'Item reconhecido', category: item.activityName || item.category || (type === 'materials' ? 'Material reconhecido' : 'Serviço reconhecido'), unit: item.unit || 'unidade', quantity, unitPrice: Number(item.unitPrice ?? (totalAmount / quantity)), total: totalAmount, amount: totalAmount, date: recognized.date || new Date().toISOString().slice(0, 10), supplier: recognized.supplier || '', stageId: item.stageId, stageName: item.stageName, activityId: item.activityId, activityName: item.activityName, source: 'OCR', filename: result.filename || '' }; })];
    await saveRecords(type, next);
  };
  if (!user) return <Login theme={theme} onThemeChange={setTheme} onLogin={async account => { setUser(account); try { await loadRemoteData(); } catch (error) { setSyncError(error.message); } }} />;
  return <div className="app-shell has-assistant-toggle"><main className="workspace"><header className="page-header"><div className="page-heading"><div className="page-brand"><img className="mobile-brand-logo" src={aliancaLogo} alt="" /><p className="eyebrow">ALIANÇA PARK</p></div><h1>{page.title}</h1></div><div className="page-header-actions"><span className="sync-state">{syncError || 'Dados sincronizados'}</span><div className="top-menu" ref={menuRef}><button className="top-menu-trigger" type="button" aria-label="Abrir menu" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><EllipsisVertical size={22} aria-hidden="true" /></button>{menuOpen && <div className="top-menu-dropdown" role="menu" aria-label="Menu da aplicação"><span className="top-menu-heading">NAVEGAR</span>{pages.map(item => <button key={item.id} className="top-menu-item" type="button" role="menuitem" aria-current={active === item.id && section === 'menu' ? 'page' : undefined} onClick={() => navigate(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}<div className="top-menu-preferences"><span>Aparência</span><ThemeToggle theme={theme} onChange={setTheme} /></div><button className="top-menu-item top-menu-signout" type="button" role="menuitem" onClick={signOut}>Sair da conta</button></div>}</div></div></header><section ref={pageContentRef} className="page-content" aria-live="polite">{section === 'assistant' ? <AssistantChatbox owner={user.username} lots={data.lots || []} stages={data.stages || []} inferenceReady={revision !== null} onAllocate={allocateClassification} /> : active === 'agenda' ? <AgendaPage events={data.agenda || []} onSave={events => saveRecords('agenda', events)} /> : active === 'map' ? <LotDevelopmentPage lots={data.lots || []} onSave={saveRecords} /> : active === 'stages' ? <StagesPage stages={data.stages || []} materials={data.materials || []} services={data.services || []} onSave={stages => saveRecords('stages', stages)} onSaveRecords={saveRecords} /> : active === 'transfers' ? <RepassePage rows={data.transfers || []} lots={data.lots || []} onSave={saveRecords} owner={user.username} /> : <DataPage type={active} rows={data[active] || []} lots={data.lots || []} onSave={saveRecords} owner={user.username} />}</section></main><button className={`assistant-fab${section === 'assistant' ? ' is-active' : ''}`} type="button" aria-label={section === 'assistant' ? 'Fechar assistente' : 'Abrir assistente'} aria-pressed={section === 'assistant'} onClick={() => setSection(current => current === 'assistant' ? 'menu' : 'assistant')}><MessageCircle size={19} aria-hidden="true" /><span>{section === 'assistant' ? 'Fechar assistente' : 'Assistente'}</span></button></div>;
}

createRoot(document.getElementById('app')).render(<App />);
