import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { mountLotMap } from './map.js';
import { createSyncClient } from './sync.js';
import { credentialStore } from './credential-store.js';
import priceCatalog from './assets/tabela-precos.json';
import { AssistantChatbox } from './components/assistant-chatbox.jsx';
import { LotEntryFields, LotBalanceTable, newLotEntry, materializeLotEntry, resolveLotEntry, defaultLotRules, PeriodNavigator, periodSelection, periodKey, periodLabel, TransferEditor, TransferPeriodSummary, PartnerTransferTable, BalanceTypeTabs } from './components/financial-controls.jsx';
import { AgendaPage } from './components/agenda-page.jsx';
import { FileSpreadsheet, FileText, Printer, Plus, X, Trash2, Sun, Moon, EllipsisVertical, MessageCircle, Package, ArrowLeftRight, Settings, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { exportReportCsv, exportReportPdf, reportColumns } from './report-exports.js';
import { TreeProvider, TreeView, TreeNode, TreeNodeTrigger, TreeNodeContent, TreeLabel } from './components/kibo-tree.jsx';
import { StagesPage } from './components/stages-page.jsx';
import { ProgressionPage } from './components/progression-page.jsx';
import { materialReferenceKey, removeArchivedStageMaterialDefaults, STAGE_ITEM_CHANGE_EVENT } from './material-allocations.js';
import aliancaLogo from './assets/alianca-park-logo-mark.png';
import lotPlan from './assets/planta.webp';
import mapLotIndex from './assets/mapeamento.json';
import archivedStageData from './data/archived-stage-seed.json';

const WORKER = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';
const isDesktopRuntime = () => (location.protocol === 'app:' && location.hostname === 'local') || /Electron\//i.test(navigator.userAgent);
const supportsLocalDev = () => isDesktopRuntime() || Capacitor.getPlatform() === 'android';
const isLocalDev = () => supportsLocalDev() && sessionStorage.getItem('alianca-desktop-dev') === '1';
let restorePromise;
async function restorePatSession() {
  if (!restorePromise) restorePromise = (async () => {
    const pat = await credentialStore.read();
    if (!pat) return null;
    const response = await fetch(`${WORKER}/api/pat-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pat, client: detectClientKind() }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(result.error || 'Não foi possível validar o PAT salvo.'); error.status = response.status; throw error; }
    sessionStorage.setItem('alianca-session-token', result.token);
    return result;
  })().finally(() => { restorePromise = null; });
  return restorePromise;
}
export const sync = createSyncClient({ workerUrl: WORKER, getToken: () => sessionStorage.getItem('alianca-session-token'), refreshSession: async () => (await restorePatSession())?.token, getLocalMode: isLocalDev });
const pages = [
  { id: 'map', label: 'Loteamento', icon: '⌖', title: 'Loteamento' },
  { id: 'stages', label: 'Etapas', icon: '⚒', title: 'Etapas' },
  { id: 'transfers', label: 'Repasses', icon: '⇄', title: 'Repasses' },
  { id: 'agenda', label: 'Agenda', icon: '▦', title: 'Agenda de obra' },
  { id: 'settings', label: 'Configurações', icon: '⚙', title: 'Configurações' },
];
const configs = {
  lots: { singular: 'lote', noun: 'Lotes', description: 'Situação comercial, valores oficiais e recebimentos por lote.', fields: [['label', 'Lote', 'text', true], ['quadra', 'Quadra', 'text', true], ['area', 'Área (m²)', 'number', true], ['price', 'Preço oficial', 'currency', true], ['contractPrice', 'Valor contratado', 'currency', false], ['received', 'Entradas recebidas', 'currency', false], ['status', 'Situação', 'select', true]], columns: [['label', 'Lote'], ['quadra', 'Quadra'], ['area', 'Área'], ['price', 'Preço oficial'], ['contractPrice', 'Contratado'], ['received', 'Recebido'], ['status', 'Situação']] },
  materials: { singular: 'material', noun: 'Materiais', description: 'Organize itens de compra e consumo por categoria.', fields: [['name', 'Material', 'text', true], ['date', 'Data da nota', 'date', false], ['category', 'Categoria', 'text', true], ['unit', 'Unidade', 'text', true], ['quantity', 'Quantidade', 'number', true], ['unitPrice', 'Preço unitário', 'currency', true]], columns: [['name', 'Material'], ['date', 'Data da nota'], ['category', 'Categoria'], ['unit', 'Unidade'], ['quantity', 'Quantidade'], ['unitPrice', 'Preço unitário'], ['total', 'Total']] },
  services: { singular: 'serviço', noun: 'Serviços', description: 'Mantenha os serviços e seus valores de referência.', fields: [['name', 'Serviço', 'text', true], ['date', 'Data', 'date', false], ['category', 'Categoria', 'text', true], ['unit', 'Unidade de medição', 'text', true], ['quantity', 'Quantidade', 'number', true], ['unitPrice', 'Valor unitário', 'currency', true]], columns: [['name', 'Serviço'], ['date', 'Data'], ['category', 'Categoria'], ['unit', 'Unidade'], ['quantity', 'Quantidade'], ['unitPrice', 'Valor unitário'], ['total', 'Total']] },
  transfers: { singular: 'entrada', noun: 'Repasses', description: 'Comissões calculadas sobre entradas registradas. O cálculo não executa pagamento.', fields: [['broker', 'Corretor', 'text', true], ['lotLabel', 'Lote', 'text', true], ['reason', 'Tipo da entrada', 'select', true], ['date', 'Data', 'date', true], ['amount', 'Entrada recebida', 'currency', true], ['commissionPercent', 'Comissão do corretor (%)', 'number', true]], columns: [['broker', 'Corretor'], ['lotLabel', 'Lote'], ['reason', 'Entrada'], ['date', 'Data'], ['amount', 'Entrada recebida'], ['taxAmount', 'Imposto'], ['fixedExpenses', 'Despesas fixas'], ['allocated', 'Distribuído'], ['netTransfer', 'Repasse líquido'], ['commissionPercent', 'Comissão (%)'], ['commission', 'Comissão calculada'], ['warley', 'Warley'], ['partner', 'Parceiro']] },
};
const REPASSE_REASONS = [
  { id: 'signal', label: 'Sinal', sharePercent: 40, warleyPercent: 50, partnerPercent: 50 },
  { id: 'intermediate', label: 'Parcela intermediária', sharePercent: 30, warleyPercent: 50, partnerPercent: 50 },
  { id: 'monthly', label: 'Mensal', sharePercent: 30, warleyPercent: 70, partnerPercent: 30 },
];
const emptyData = () => ({ lots: [], materials: [], services: [], transfers: [], agenda: [], stages: [], progressAreas: [] });
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const valueOf = (row, key, kind) => kind === 'currency' || key === 'amount' || key === 'unitPrice' || key === 'total' ? money(key === 'total' ? row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0) : row[key]) : key === 'area' ? `${Number(row[key] || 0).toLocaleString('pt-BR')} m²` : key === 'date' && row[key] ? new Date(`${row[key]}T12:00:00`).toLocaleDateString('pt-BR') : row[key] || '—';

function MaterialInvoiceTotals({ rows }) {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const invoicesByKey = new Map();
  for (const row of rows) {
    if (!String(row.filename || '').trim()) continue;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(row.date || '')) ? row.date : '';
    const key = `${row.inferenceId || row.filename}:${date}`;
    const invoice = invoicesByKey.get(key) || { key, filename: row.filename, date, lines: 0, total: 0 };
    invoice.lines += 1;
    invoice.total += Number(row.total ?? row.amount ?? Number(row.quantity || 0) * Number(row.unitPrice || 0)) || 0;
    invoicesByKey.set(key, invoice);
  }
  const invoices = [...invoicesByKey.values()];
  const monthLabel = key => {
    if (!key || key === 'undated') return 'Data não informada';
    const [year, month] = key.split('-').map(Number);
    const label = new Date(year, month - 1, 2).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
  };
  const dateLabel = key => key ? new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR') : 'Data não informada';
  const periodsByKey = new Map();
  for (const invoice of invoices) {
    const key = invoice.date ? invoice.date.slice(0, 7) : 'undated';
    const period = periodsByKey.get(key) || { key, invoices: 0, lines: 0, total: 0, notes: [] };
    period.invoices += 1;
    period.lines += invoice.lines;
    period.total += invoice.total;
    period.notes.push(invoice);
    periodsByKey.set(key, period);
  }
  const periods = [...periodsByKey.values()].sort((a, b) => b.key.localeCompare(a.key));
  const activePeriod = selectedPeriod === 'all' ? 'all' : periods.some(period => period.key === selectedPeriod) ? selectedPeriod : periods[0]?.key || 'all';
  const visibleInvoices = activePeriod === 'all' ? invoices : activePeriod === 'undated' ? invoices.filter(invoice => !invoice.date) : invoices.filter(invoice => invoice.date.startsWith(activePeriod));
  const daysByKey = new Map();
  for (const invoice of visibleInvoices) {
    const day = daysByKey.get(invoice.date) || { key: invoice.date, invoices: 0, lines: 0, total: 0 };
    day.invoices += 1;
    day.lines += invoice.lines;
    day.total += invoice.total;
    daysByKey.set(invoice.date, day);
  }
  const days = [...daysByKey.values()].sort((a, b) => b.key.localeCompare(a.key));
  const periodTotal = visibleInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const allTotal = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  return <section className="material-invoice-totals" aria-label="Totais das notas em Materiais">
    <header><div><p className="eyebrow">NOTAS EM MATERIAIS</p><h3>Totais de gastos</h3><p>Agrupados pela data das notas e atualizados com os materiais sincronizados.</p></div><label>Período<select aria-label="Período dos gastos" value={activePeriod} onChange={event => setSelectedPeriod(event.target.value)}><option value="all">Todos os períodos</option>{periods.map(period => <option key={period.key || 'undated'} value={period.key}>{monthLabel(period.key)}</option>)}</select></label></header>
    <div className="material-invoice-metrics"><div><span>{activePeriod !== 'all' ? monthLabel(activePeriod) : 'Todos os períodos'}</span><strong>{money(periodTotal)}</strong></div><div><span>Total geral</span><strong>{money(allTotal)}</strong></div><div><span>Notas</span><strong>{visibleInvoices.length}</strong></div></div>
    {invoices.length ? <div className="material-invoice-tables">
      <section><h4>Por período</h4><div className="table-wrap material-summary-table material-period-table"><table><thead><tr><th>Período</th><th>Notas</th><th>Itens</th><th>Total gasto</th></tr></thead><tbody>{periods.map(period => <tr key={period.key || 'undated'}><td data-label="Período">{monthLabel(period.key)}</td><td data-label="Notas">{period.invoices}</td><td data-label="Itens">{period.lines}</td><td data-label="Total gasto">{money(period.total)}</td></tr>)}</tbody></table></div></section>
      <section><h4>Por data</h4><div className="table-wrap material-summary-table material-date-table"><table><thead><tr><th>Data da nota</th><th>Notas</th><th>Itens</th><th>Total gasto</th></tr></thead><tbody>{days.map(day => <tr key={day.key || 'undated'}><td data-label="Data da nota">{dateLabel(day.key)}</td><td data-label="Notas">{day.invoices}</td><td data-label="Itens">{day.lines}</td><td data-label="Total gasto">{money(day.total)}</td></tr>)}</tbody></table></div></section>
    </div> : <p className="material-invoice-empty">As notas lançadas em Materiais aparecerão aqui, com seus totais por mês e data.</p>}
    <small>Fonte: notas vinculadas aos registros de Materiais · sincronizado com a aplicação.</small>
  </section>;
}
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

function LotDevelopmentPage({ lots, onSave, progression, rules, partners }) {
  const [selection, setSelection] = useState(null);
  const [choice, setChoice] = useState('');
  const [entry, setEntry] = useState(() => newLotEntry(rules, partners));
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
  const openLot = useCallback(selectionData => { setSelection(selectionData); setChoice(''); setError(''); setEntry(newLotEntry(rules, partners)); }, [rules, partners]);
  async function save(event) {
    event.preventDefault(); if (!selected) return;
    setError('');
    let record;
    try { record = materializeLotEntry(entry); } catch (err) { setError(err.message); return; }
    setBusy(true);
    const amount = record?.amount || 0;
    const history = [...(selected.entryHistory || [])];
    if (record) history.push(record);
    const next = lots.map(lot => lot.id === selected.id ? { ...lot, status, entryHistory: history, received: Number(selected.received || 0) + amount } : lot);
    try { await onSave('lots', next); setSelection(null); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function addEntryExamples() {
    if (!isLocalDev() || busy || !lots.length) return;
    const target = lots.find(lot => lot.label === 'QA-1') || lots[0];
    if ((target.entryHistory || []).some(item => item.example === 'entry-distribution-v1')) return;
    setBusy(true); setError('');
    try {
      const examples = [{ amount: '4680', type: 'signal', date: '2026-10-10' }, { amount: '2340', type: 'installment', installment: '1', date: '2026-11-10' }].map(values => ({ ...materializeLotEntry({ ...newLotEntry(), ...values, description: 'Exemplo local — não é lançamento real' }), example: 'entry-distribution-v1' }));
      await onSave('lots', lots.map(lot => lot.id === target.id ? { ...lot, entryHistory: [...(lot.entryHistory || []), ...examples], received: Number(lot.received || 0) + examples.reduce((sum, item) => sum + item.amount, 0) } : lot));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <div className="development-page">
    <section className="development-map-panel"><div className="section-heading"><div><p className="eyebrow">PLANTA INTERATIVA</p><h2>Mapa do loteamento</h2><p>Toque em um lote para registrar entrada e situação.</p></div><div className="map-heading-actions"><span className="map-hint">Ctrl + roda do mouse para zoom</span><button type="button" className="quiet-button map-print-trigger" onClick={() => setPrintMapOpen(true)}><Printer size={15} /> Imprimir mapa</button></div></div><MapView className="development-map" onLotSelect={openLot} /></section>
    <section className="lot-catalog-panel"><div className="section-heading"><div><p className="eyebrow">CATÁLOGO OFICIAL</p><h2>Lotes por quadra</h2><p>{lots.length} lotes cadastrados · selecione um para abrir a ficha.</p></div><span className="map-hint">Valores oficiais da tabela</span></div>
      {lots.length ? <TreeProvider defaultExpandedIds={Object.keys(groups)}><TreeView>{Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([quadra, items]) => <TreeNode nodeId={quadra} key={quadra}>
        <TreeNodeTrigger hasChildren><TreeLabel>{quadra}<small>{items.length} lotes</small></TreeLabel></TreeNodeTrigger>
        <TreeNodeContent>{items.slice().sort((a, b) => Number(a.lot) - Number(b.lot)).map(lot => <TreeNode nodeId={`${quadra}:${lot.id}`} level={1} key={lot.id}><TreeNodeTrigger onSelect={() => openLot({ number: lot.lot, lotId: lot.id })}><TreeLabel>{lot.label}<small>{Number(lot.area || 0).toLocaleString('pt-BR')} m² · {money(lot.price)}</small></TreeLabel><span className={`lot-status status-${String(lot.status || 'Disponível').toLowerCase().replaceAll(' ', '-')}`}>{lot.status || 'Disponível'}</span></TreeNodeTrigger></TreeNode>)}</TreeNodeContent>
      </TreeNode>)}</TreeView></TreeProvider> : <p className="empty-lots">Nenhum lote no catálogo.</p>}</section>
    {isLocalDev() && <div><button type="button" className="quiet-button" disabled={busy} onClick={addEntryExamples}>Adicionar exemplos locais de entradas</button>{error && !selection && <p className="error-message" role="alert">{error}</p>}</div>}
    <LotBalanceTable lots={lots} rules={rules} />
    {selection && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelection(null); }}><section className="lot-modal" role="dialog" aria-modal="true" aria-labelledby="lot-modal-title"><div className="form-heading"><div><p className="eyebrow">FICHA DO LOTE</p><h2 id="lot-modal-title">{selected?.label || `Lote ${selection.number}`}</h2></div><button type="button" className="quiet-button" onClick={() => setSelection(null)}>Fechar</button></div>
      {candidates.length > 1 && <label className="lot-choice">Escolha a quadra<select value={selected?.id || ''} onChange={event => { setChoice(event.target.value); setStatus(lots.find(lot => lot.id === event.target.value)?.status || 'Disponível'); }}><option value="">Selecione o lote</option>{candidates.map(lot => <option value={lot.id} key={lot.id}>{lot.label} · {lot.quadra}</option>)}</select></label>}
      {selected ? <form onSubmit={save}><div className="lot-facts"><span>Quadra<strong>{selected.quadra}</strong></span><span>Área<strong>{Number(selected.area || 0).toLocaleString('pt-BR')} m²</strong></span><span>Preço oficial<strong>{money(selected.price)}</strong></span><span>Entradas recebidas<strong>{money(selected.received)}</strong></span></div><label>Situação<select value={status} onChange={event => setStatus(event.target.value)}>{['Disponível', 'Reservado', 'Vendido', 'Bloqueado'].map(value => <option key={value}>{value}</option>)}</select></label><LotEntryFields entry={entry} onChange={setEntry} />{error && <p className="error-message" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="quiet-button" onClick={() => setSelection(null)}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar lote'}</button></div></form> : <p className="empty-lots">Há mais de um lote com este número. Escolha a quadra para continuar.</p>}</section></div>}
    {printMapOpen && createPortal(<div className="map-print-backdrop" role="presentation"><section className="progression-modal" role="dialog" aria-modal="true" aria-labelledby="progression-modal-title"><header className="progression-modal-header"><div><p className="eyebrow">IMPRESSÃO DO MAPA</p><h2 id="progression-modal-title">Preparar mapa da obra</h2></div><button type="button" className="quiet-button" onClick={() => setPrintMapOpen(false)}>Fechar</button></header><ProgressionPage {...progression} /></section></div>, document.body)}
  </div>;
}

function RepassePage({ rows, lots, onSave, owner, rules }) {
  const lotRules = { ...defaultLotRules, ...(rules?.find(rule => rule.id === 'lot-allocation')?.values || {}) };
  const generated = lots.flatMap(lot => (lot.entryHistory || []).map((originalEntry, index) => { const entry = resolveLotEntry(originalEntry, lotRules); return ({
    id: `lot-entry:${lot.id}:${entry.id || index}`,
    automaticLotEntry: true,
    broker: entry.brokerName || (entry.example ? 'Exemplo local' : 'Não informado'), lotLabel: lot.label,
    reason: entry.type === 'signal' ? 'signal' : entry.type === 'installment' ? 'installment' : '',
    date: entry.date || '', amount: Number(entry.amount || 0),
    taxAmount: Number(entry.distribution?.tax?.amount || 0),
    fixedExpenses: 0, allocatedBroker: Number(entry.distribution?.broker?.amount || 0), allocatedOther: Number(entry.distribution?.stand?.amount || 0) + Number(entry.distribution?.iptu?.amount || 0) + Number(entry.distribution?.office?.amount || 0), partners: entry.partners || [],
  }); }));
  return <DataPage type="transfers" rows={[...rows, ...generated]} lots={lots} onSave={(type, next) => onSave(type, type === 'transfers' ? next.filter(row => !row.automaticLotEntry) : next)} owner={owner} rules={rules} />;
}

function ThemeToggle({ theme, onChange }) {
  const dark = theme === 'dark';
  return <button type="button" className="theme-toggle" aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'} title={dark ? 'Modo claro' : 'Modo escuro'} onClick={() => onChange(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}<span>{dark ? 'Claro' : 'Escuro'}</span>
  </button>;
}

function PartnerSettingsPage({ partners = [], onSave }) {
  const [draft, setDraft] = useState(() => partners.length ? partners.map((item, index) => ({ id: item.id || `partner-${index}`, ...item, percent: item.percent ?? item.part?.input ?? 0 })) : [{ id: crypto.randomUUID(), name: '', percent: 100 }]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function save(event) {
    event.preventDefault();
    const clean = draft.map(item => ({ ...item, name: item.name.trim(), percent: Number(item.percent) })).filter(item => item.name);
    if (!clean.length || clean.some(item => !Number.isFinite(item.percent) || item.percent < 0) || Math.abs(clean.reduce((sum, item) => sum + item.percent, 0) - 100) > .01) { setError('Informe sócios e percentuais que somem 100%.'); return; }
    setBusy(true); setError('');
    try { await onSave(clean); setNotice('Sócios salvos.'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form className="data-page partner-settings" onSubmit={save}><div className="page-intro"><div><p className="eyebrow">PREFERÊNCIAS DO EMPREENDIMENTO</p><h2>Sócios</h2><p>Edite os sócios já usados nas entradas dos lotes e suas participações.</p></div></div><section className="partner-settings-card" aria-label="Sócios registrados"><header><div><strong>Distribuição entre sócios</strong><span>Os percentuais devem somar 100%.</span></div><span className="partner-total">{draft.reduce((sum, item) => sum + (Number(item.percent) || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</span></header>{draft.map((partner, index) => <div className="partner-setting-row" key={partner.id}><label>Nome do sócio<input required value={partner.name} onChange={event => setDraft(items => items.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></label><label>Participação<input required type="number" min="0" max="100" step="0.01" value={partner.percent} onChange={event => setDraft(items => items.map((item, i) => i === index ? { ...item, percent: event.target.value } : item))} /><small>% do saldo após descontos</small></label><button className="quiet-button danger-button" type="button" disabled={draft.length === 1} onClick={() => setDraft(items => items.filter((_, i) => i !== index))}>Remover</button></div>)}<button className="quiet-button partner-add" type="button" onClick={() => setDraft(items => [...items, { id: crypto.randomUUID(), name: '', percent: 0 }])}>+ Adicionar sócio</button>{error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="partner-settings-notice" role="status">{notice}</p>}<div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar sócios'}</button></div></section></form>;
}

function Login({ onLogin, onDev, theme, onThemeChange, restoring, restoreError }) {
  const [pat, setPat] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const kind = detectClientKind();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${WORKER}/api/pat-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pat: pat.trim(), client: kind }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');
      await credentialStore.save(pat.trim());
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
        <p className="eyebrow">Acesso à aplicação</p><h1>Conectar ao Aliança Park</h1><p className="login-copy">Cole um PAT do GitHub com acesso de escrita ao repositório de dados.</p>
        <label>PAT do GitHub<input autoComplete="off" type="password" spellCheck="false" value={pat} onChange={e => setPat(e.target.value)} required /></label>
        <small>A credencial é guardada de forma protegida neste aparelho para manter o acesso.</small>
        {(error || restoreError) && <p className="error-message" role="alert">{error || restoreError}</p>}<button className="primary-button" disabled={busy || restoring}>{restoring ? 'Restaurando acesso…' : busy ? 'Entrando…' : 'Entrar'}</button>
        {supportsLocalDev() && <><button className="quiet-button" type="button" disabled={busy || restoring} onClick={onDev}>Continuar no modo dev</button><small>Dados locais de teste, sem sincronização com a equipe.</small></>}
        <p className="login-device">Acesso pelo <strong>{kind === 'mobile' ? 'celular' : 'computador'}</strong></p>
      </form>
    </section>
  </div></main>;
}

function detectClientKind() {
  if (isDesktopRuntime()) return 'desktop';
  if (navigator.userAgentData?.mobile) return 'mobile';
  const mobileAgent = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
  const touchTablet = navigator.maxTouchPoints > 1 && /iPad|MacIntel/i.test(navigator.platform);
  return mobileAgent || touchTablet ? 'mobile' : 'desktop';
}

function recordGroupKey(row, view) {
  if (view === 'folders') return row.category || 'Sem categoria';
  if (view === 'list') return 'Todos os itens';
  const value = String(row.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Sem data';
  if (view === 'daily') return value;
  if (view === 'monthly') return `${value.slice(0, 7)}-01`;
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return 'Sem data';
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  const year = date.getFullYear(), month = String(date.getMonth() + 1).padStart(2, '0'), day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatRecordGroup(key, view) {
  if (!['daily', 'weekly', 'monthly'].includes(view) || key === 'Sem data') return key;
  const start = new Date(`${key}T12:00:00`);
  if (view === 'monthly') return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const label = start.toLocaleDateString('pt-BR');
  if (view === 'daily') return label;
  const end = new Date(start); end.setDate(end.getDate() + 6);
  return `${label} a ${end.toLocaleDateString('pt-BR')}`;
}

function DataPage({ type, rows, lots = [], onSave, owner, onSwitchType, onOpenStage, rules }) {
  const config = configs[type], [query, setQuery] = useState(''), [editing, setEditing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [recordView, setRecordView] = useState('folders');
  const [pdfOptions, setPdfOptions] = useState(null), [pdfError, setPdfError] = useState('');
  const [periodMode, setPeriodMode] = useState('all'), [selectedPeriod, setSelectedPeriod] = useState(''), [transferType, setTransferType] = useState('all');
  const [ruleDraft, setRuleDraft] = useState(null), [ruleError, setRuleError] = useState('');
  const [lotRuleDraft, setLotRuleDraft] = useState(defaultLotRules);
  const transferRules = REPASSE_REASONS.map(item => ({ ...item, ...(Array.isArray(rules) ? rules.find(rule => rule.id === item.id) : {}) }));
  const formRef = useRef(null);
  useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [editing]);
  const typeRows = type === 'transfers' && transferType !== 'all' ? rows.filter(row => transferType === 'signal' ? row.reason === 'signal' : ['installment', 'intermediate', 'monthly'].includes(row.reason)) : rows;
  const period = periodSelection(typeRows, periodMode, selectedPeriod);
  const filtered = typeRows.filter(row => (type !== 'transfers' || periodMode === 'all' || (period.active && periodKey(row.date, periodMode) === period.active)) && Object.values(row).some(value => String(value).toLowerCase().includes(query.toLowerCase())));
  const materialGroups = ['materials', 'services'].includes(type) ? Object.groupBy(filtered, row => recordGroupKey(row, recordView)) : null;
  const repasseDetails = row => {
    const reason = transferRules.find(item => item.id === row.reason);
    if (row.automaticLotEntry) return { commission: Number(row.allocatedBroker || 0), warley: null, partner: null, taxAmount: Number(row.taxAmount || 0), fixedExpenses: 0, netTransfer: roundMoney(Number(row.amount || 0) - Number(row.taxAmount || 0) - Number(row.allocatedBroker || 0) - Number(row.allocatedOther || 0)), reason: row.reason === 'signal' ? 'Sinal' : row.reason === 'installment' ? 'Parcela' : 'Não classificada' };
    const commission = roundMoney(row.commissionAmount != null ? Number(row.commissionAmount) : Number(row.amount || 0) * Number(row.commissionPercent || 0) / 100 * Number(reason?.sharePercent || 0) / 100);
      const warley = roundMoney(commission * Number(reason?.warleyPercent || 0) / 100);
    return { commission, warley, partner: roundMoney(commission - warley), taxAmount: Number(row.taxAmount || 0), fixedExpenses: Number(row.fixedExpenses || 0), netTransfer: roundMoney(Number(row.amount || 0) - Number(row.taxAmount || 0) - Number(row.fixedExpenses || 0)), reason: reason?.label };
  };
  const total = filtered.reduce((sum, row) => sum + (type === 'transfers' ? repasseDetails(row).commission : Number(row.total ?? row.amount ?? row.contractPrice ?? Number(row.quantity || 0) * Number(row.unitPrice || 0))), 0);
  const shownValue = (row, key, kind) => {
    if (type === 'transfers') {
      if (key === 'reason') return repasseDetails(row).reason || '—';
      if (key === 'commissionPercent' && row.automaticLotEntry) return '—';
      if (key === 'allocated') return money(Number(row.allocatedBroker || 0) + Number(row.allocatedOther || 0));
      if (['commission', 'warley', 'partner', 'taxAmount', 'fixedExpenses', 'netTransfer'].includes(key)) return repasseDetails(row)[key] == null ? '—' : money(repasseDetails(row)[key]);
    }
    if (key === 'total') return money(row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0));
    return valueOf(row, key, kind);
  };
  async function exportRows(format) {
    const args = { type, rows: filtered, title: config.noun, owner, query: [query, type === 'transfers' && periodMode !== 'all' ? periodLabel(period.active, periodMode) : ''].filter(Boolean).join(' · '), repasseDetails };
    try { if (format === 'csv') await exportReportCsv(args); else await exportReportPdf(args); }
    catch (err) { setError(`Não foi possível exportar ${format === 'csv' ? 'a planilha' : 'o PDF'}: ${err.message}`); }
  }
  async function confirmPdf(event) {
    event.preventDefault();
    if (pdfOptions.start && pdfOptions.end && pdfOptions.start > pdfOptions.end) { setPdfError('A data inicial deve ser anterior à data final.'); return; }
    if (!pdfOptions.columns.length) { setPdfError('Selecione pelo menos uma propriedade.'); return; }
    const selectedRows = filtered.filter(row => {
      if (!pdfOptions.start && !pdfOptions.end) return true;
      const date = String(row.date || '');
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && (!pdfOptions.start || date >= pdfOptions.start) && (!pdfOptions.end || date <= pdfOptions.end);
    });
    const dateText = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : 'sem limite';
    try {
      setPdfError('');
      const result = await exportReportPdf({ type, rows: selectedRows, title: config.noun, owner, query: [query, type === 'transfers' && periodMode !== 'all' ? periodLabel(period.active, periodMode) : ''].filter(Boolean).join(' · '), repasseDetails, selectedColumns: pdfOptions.columns, periodDescription: pdfOptions.start || pdfOptions.end ? `${dateText(pdfOptions.start)} a ${dateText(pdfOptions.end)}` : 'Todos os períodos' });
      if (!result?.canceled) setPdfOptions(null);
    } catch (err) { setPdfError(`Não foi possível exportar o PDF: ${err.message}`); }
  }
  async function persist(next) { setBusy(true); setError(''); try { await onSave(type, next); setEditing(null); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function addExamples() {
    if (!isLocalDev() || !['materials', 'services'].includes(type)) return;
    const examples = (type === 'materials'
      ? [['Tubo de drenagem', 'Drenagem', 'un', 12, 85], ['Cimento', 'Pavimentação', 'saco', 30, 35], ['Areia', 'Drenagem', 'm³', 8, 120]]
      : [['Escavação', 'Drenagem', 'm³', 25, 45], ['Instalação de meio-fio', 'Pavimentação', 'm', 60, 28], ['Limpeza do terreno', 'Preparação', 'dia', 2, 450]])
      .map(([name, category, unit, quantity, unitPrice], index) => ({ id: `exemplo-${type}-${index}`, name: `${name} (exemplo)`, category, unit, quantity, unitPrice, date: ['2026-10-12', '2026-11-03', '2026-11-10'][index] }));
    await persist([...rows, ...examples.filter(example => !rows.some(row => row.id === example.id))]);
  }
  function start(row) { setEditing(row ? { ...row } : { id: crypto.randomUUID(), status: 'Pendente' }); }
  return <div className="data-page">
    {['materials', 'services'].includes(type) && <div className="inventory-tabs" role="tablist" aria-label="Materiais e serviços"><button type="button" role="tab" aria-selected={type === 'materials'} onClick={() => onSwitchType('materials')}>Materiais</button><button type="button" role="tab" aria-selected={type === 'services'} onClick={() => onSwitchType('services')}>Serviços</button></div>}
    <div className="page-intro"><div><p className="eyebrow">CONTROLE OPERACIONAL</p><h2>{config.noun}</h2><p>{config.description}</p></div><div className="page-actions">{type === 'transfers' && <button className="quiet-button" type="button" aria-label="Configurar regra contratual" title="Configurar regra contratual" onClick={() => { setRuleError(''); setRuleDraft(transferRules.map(rule => ({ ...rule }))); setLotRuleDraft({ ...defaultLotRules, ...(rules?.find(rule => rule.id === 'lot-allocation')?.values || {}) }); }}><Settings size={18} /></button>}<button className="primary-button" onClick={() => start(null)}>Adicionar {config.singular}</button></div></div>
    <div className="summary-strip"><div><span>Registros</span><strong>{rows.length}</strong></div><div><span>{type === 'transfers' ? 'Comissão calculada' : 'Valor total'}</span><strong>{money(total)}</strong></div><div><span>Exibindo</span><strong>{filtered.length}</strong></div></div>
    {type === 'materials' && <MaterialInvoiceTotals rows={rows} />}
    {error && <p className="error-message" role="alert">{error}</p>}
    {type === 'transfers' && <div className="table-tools transfer-search-top"><label className="search-field"><span>Buscar entrada</span><input value={query} onChange={event => setQuery(event.target.value)} list="transfer-search-options" placeholder="Lote · data" /><datalist id="transfer-search-options">{rows.map(row => <option key={row.id} value={`${row.lotLabel || 'Lote'} · ${row.date ? new Date(`${row.date}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}`} />)}</datalist></label><span className="data-count">{filtered.length} entradas</span></div>}
    <div className="table-tools"><label className="search-field"><span>Buscar</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar ${config.singular}`} /></label><span className="data-count">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span></div>
    {isLocalDev() && materialGroups && <button type="button" className="quiet-button" disabled={busy} onClick={addExamples}>Adicionar exemplos locais</button>}
    {materialGroups && <div className="record-views" role="group" aria-label={`Visualização de ${config.noun}`}><span>Agrupar por</span>{[['folders', 'Categoria'], ['list', 'Lista'], ['daily', 'Dia'], ['weekly', 'Semana'], ['monthly', 'Mês']].map(([id, label]) => <button key={id} type="button" aria-pressed={recordView === id} onClick={() => setRecordView(id)}>{label}</button>)}</div>}
    {type === 'transfers' && ruleDraft && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setRuleDraft(null); }}><form className="record-form transfer-modal contract-settings" role="dialog" aria-modal="true" aria-labelledby="contract-settings-title" onSubmit={async event => { event.preventDefault(); if (ruleDraft.some(rule => ['sharePercent','warleyPercent','partnerPercent'].some(key => !Number.isFinite(Number(rule[key])) || Number(rule[key]) < 0 || Number(rule[key]) > 100) || Math.abs(Number(rule.warleyPercent) + Number(rule.partnerPercent) - 100) > 0.001)) { setRuleError('Informe percentuais entre 0 e 100; Warley e parceiro devem somar 100%.'); return; } if (Object.values(lotRuleDraft).some(value => !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) || Object.values(lotRuleDraft).reduce((sum, value) => sum + Number(value), 0) > 100) { setRuleError('Os descontos do lote devem estar entre 0 e 100% e somar no máximo 100%.'); return; } setBusy(true); setRuleError(''); try { await onSave('repasseRules', [...ruleDraft.map(rule => ({ ...rule, sharePercent: Number(rule.sharePercent), warleyPercent: Number(rule.warleyPercent), partnerPercent: Number(rule.partnerPercent) })), { id: 'lot-allocation', values: Object.fromEntries(Object.entries(lotRuleDraft).map(([key, value]) => [key, Number(value)])) }]); setRuleDraft(null); } catch (err) { setRuleError(err.message); } finally { setBusy(false); } }}><div className="form-heading"><div><p className="eyebrow">CONFIGURAÇÃO</p><h3 id="contract-settings-title">Regra contratual</h3></div><button type="button" className="quiet-button" onClick={() => setRuleDraft(null)} disabled={busy}>Fechar</button></div><p>A configuração de lotes recalcula os valores vinculados à regra. Os percentuais padrão recalculam automaticamente os lançamentos vinculados.</p><h4>Descontos padrão das entradas de lotes</h4><p>Percentuais sobre o valor recebido. Mudanças atualizam entradas vinculadas à regra; valores ajustados na ficha permanecem individuais.</p><div className="contract-rule-grid">{[["tax","Imposto"],["broker","Corretagem"],["office","Escritório"],["stand","Stand"],["iptu","IPTU"]].map(([key,label]) => <label key={key}>{label} (%)<input type="number" min="0" max="100" step="0.001" required value={lotRuleDraft[key]} onChange={event => setLotRuleDraft(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>{ruleError && <p className="error-message" role="alert">{ruleError}</p>}<div className="form-actions"><button type="button" className="quiet-button" onClick={() => setRuleDraft(null)} disabled={busy}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar configuração'}</button></div></form></div>}
    {type === 'transfers' && <BalanceTypeTabs value={transferType} label="Tipo de repasse" onChange={value => { setTransferType(value); setSelectedPeriod(''); }} />}
    {type === 'transfers' && <PeriodNavigator rows={typeRows} mode={periodMode} selected={selectedPeriod} onMode={setPeriodMode} onSelect={setSelectedPeriod} label="Período do repasse" />}
    {type === 'transfers' && <><TransferPeriodSummary rows={filtered} mode={periodMode} /><PartnerTransferTable rows={filtered} /></>}
    {editing && type === 'transfers' && <TransferEditor key={editing.id} row={editing} isNew={!rows.some(row => row.id === editing.id)} lots={lots} reasons={transferRules} busy={busy} error={error} onCancel={() => setEditing(null)} onSubmit={record => persist(rows.some(row => row.id === record.id) ? rows.map(row => row.id === record.id ? record : row) : [...rows, record])} />}
    {editing && type !== 'transfers' && <form ref={formRef} className="record-form" onSubmit={event => { event.preventDefault(); const exists = rows.some(row => row.id === editing.id); persist(exists ? rows.map(row => row.id === editing.id ? editing : row) : [...rows, editing]); }}>
      <div className="form-heading"><h3>{rows.some(row => row.id === editing.id) ? `Editar ${config.singular}` : `Novo ${config.singular}`}</h3><button type="button" className="quiet-button" onClick={() => setEditing(null)}>Fechar</button></div>
      <div className="form-grid">{config.fields.map(([key, label, kind, required]) => <label key={key}>{label}{type === 'transfers' && key === 'lotLabel' ? <select required value={editing[key] || ''} onChange={e => setEditing({ ...editing, [key]: e.target.value })}><option value="">Selecione um lote</option>{lots.map(lot => <option value={lot.label} key={lot.id}>{lot.label} · {lot.quadra}</option>)}</select> : kind === 'select' ? <select required={required} value={editing[key] || (type === 'lots' ? 'Disponível' : type === 'transfers' ? REPASSE_REASONS[0].id : 'Pendente')} onChange={e => setEditing({ ...editing, [key]: e.target.value })}>{(type === 'lots' ? ['Disponível', 'Reservado', 'Vendido', 'Bloqueado'] : type === 'transfers' ? REPASSE_REASONS.map(reason => reason.id) : ['Pendente', 'Programado', 'Pago', 'Cancelado']).map(option => <option value={option} key={option}>{type === 'transfers' ? REPASSE_REASONS.find(reason => reason.id === option)?.label : option}</option>)}</select> : <input required={required} type={kind === 'currency' ? 'number' : kind} min={kind === 'number' || kind === 'currency' ? '0' : undefined} max={key === 'commissionPercent' ? '100' : undefined} step={kind === 'currency' || kind === 'number' ? '0.01' : undefined} value={editing[key] ?? ''} onChange={e => setEditing({ ...editing, [key]: e.target.value })} />}</label>)}</div>
      <div className="form-actions"><button type="button" className="quiet-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div>
    </form>}
    {filtered.length ? (materialGroups ? Object.entries(materialGroups).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([category, items]) => <details className="category-group" key={`${recordView}:${category}`} open><summary>{formatRecordGroup(category, recordView)}<span>{items.length}</span></summary><div className="table-wrap material-table"><table><thead><tr>{config.columns.filter(([key]) => recordView !== 'folders' || key !== 'category').map(([, label]) => <th key={label}>{label}</th>)}<th>Ações</th></tr></thead><tbody>{items.map(row => <React.Fragment key={row.id}><tr>{config.columns.filter(([key]) => recordView !== 'folders' || key !== 'category').map(([key, label]) => <td key={label} data-label={label}>{shownValue(row, key, config.fields.find(field => field[0] === key)?.[2])}</td>)}<td className="row-actions">{row.stageEmbedded ? <button type="button" className="quiet-button" onClick={() => onOpenStage(row.stageId)}>Abrir etapa</button> : row.automaticLotEntry ? <span>Gerado do lote</span> : <><button className="quiet-button" onClick={() => start(row)}>Editar</button><button className="quiet-button danger-button" onClick={() => persist(rows.filter(item => item.id !== row.id))}>Excluir</button></>}</td></tr><tr className="material-detail-row"><td colSpan={config.columns.filter(([key]) => recordView !== 'folders' || key !== 'category').length + 1}><strong>Detalhes</strong><span>{[row.activityName, row.description, row.notes, row.source].filter(Boolean).join(' · ') || 'Sem detalhes adicionais'}</span></td></tr></React.Fragment>)}</tbody></table></div><div className="material-group-total"><span>Total da lista · {items.length} {items.length === 1 ? 'item' : 'itens'}</span><strong>{money(items.reduce((sum, row) => sum + Number(row.total ?? row.amount ?? Number(row.quantity || 0) * Number(row.unitPrice || 0)), 0))}</strong></div></details>) : <div className="table-wrap"><table><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}<th>Ações</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}>{config.columns.map(([key, label]) => <td key={label}>{shownValue(row, key, config.fields.find(field => field[0] === key)?.[2])}</td>)}<td className="row-actions">{row.stageEmbedded ? <button type="button" className="quiet-button" onClick={() => onOpenStage(row.stageId)}>Abrir etapa</button> : row.automaticLotEntry ? <span>Gerado do lote</span> : <><button className="quiet-button" onClick={() => start(row)}>Editar</button><button className="quiet-button danger-button" onClick={() => persist(rows.filter(item => item.id !== row.id))}>Excluir</button></>}</td></tr>)}</tbody></table></div>) : <div className="table-wrap"><table><tbody><tr><td colSpan={config.columns.length + 1} className="empty-cell"><strong>{rows.length ? 'Nenhum resultado' : `Nenhum ${config.singular} cadastrado`}</strong><span>{rows.length ? 'Tente outro termo de busca.' : `Adicione o primeiro ${config.singular} para começar.`}</span>{!rows.length && <button className="quiet-button" onClick={() => start(null)}>Adicionar {config.singular}</button>}</td></tr></tbody></table></div>}
    <footer className="inventory-export-footer"><span>Exportar registros exibidos</span><div className="export-actions"><button className="quiet-button export-button" type="button" onClick={() => exportRows('csv')}><FileSpreadsheet size={15} /> Exportar planilha (CSV)</button><button className="quiet-button export-button" type="button" onClick={() => { setPdfError(''); setPdfOptions({ start: '', end: '', columns: reportColumns(type).filter(([key]) => key !== 'id').map(([key]) => key) }); }}><FileText size={15} /> Exportar PDF</button></div></footer>
    {pdfOptions && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPdfOptions(null); }}><form className="lot-modal pdf-settings" role="dialog" aria-modal="true" aria-labelledby="pdf-settings-title" onSubmit={confirmPdf}><div className="form-heading"><div><p className="eyebrow">RELATÓRIO DE {config.noun.toUpperCase()}</p><h2 id="pdf-settings-title">Configurar PDF</h2></div><button type="button" className="quiet-button" onClick={() => setPdfOptions(null)}>Fechar</button></div><p>O relatório usa os registros e filtros atuais da página. Limite as datas e escolha as propriedades da tabela.</p><div className="pdf-period"><label>Data inicial<input type="date" value={pdfOptions.start} onChange={event => setPdfOptions(current => ({ ...current, start: event.target.value }))} /></label><label>Data final<input type="date" value={pdfOptions.end} onChange={event => setPdfOptions(current => ({ ...current, end: event.target.value }))} /></label></div><small>Sem datas, todos os registros exibidos são incluídos. Ao definir uma data, registros sem data são excluídos.</small><fieldset className="pdf-columns"><legend>Propriedades da tabela</legend>{reportColumns(type).map(([key, label]) => <label key={key}><input type="checkbox" checked={pdfOptions.columns.includes(key)} onChange={event => setPdfOptions(current => ({ ...current, columns: event.target.checked ? [...current.columns, key] : current.columns.filter(value => value !== key) }))} />{label}</label>)}</fieldset>{pdfError && <p className="error-message" role="alert">{pdfError}</p>}<div className="form-actions"><button type="button" className="quiet-button" onClick={() => setPdfOptions(null)}>Cancelar</button><button className="primary-button" type="submit">Gerar PDF</button></div></form></div>, document.body)}
  </div>;
}

function App() {
  const [user, setUser] = useState(null), [active, setActive] = useState(() => location.hash.match(/^#\/(map|materials|services|stages|transfers|agenda|settings)$/)?.[1] || 'map');
  const [restoring, setRestoring] = useState(true), [restoreError, setRestoreError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('alianca-theme') === 'dark' ? 'dark' : 'light');
  const [section, setSection] = useState('menu');
  const [menuOpen, setMenuOpen] = useState(false);
  const [stageMenuOpen, setStageMenuOpen] = useState(false), [requestedStageId, setRequestedStageId] = useState('');
  const menuRef = useRef(null), pageContentRef = useRef(null);
  const [data, setData] = useState(emptyData), [revision, setRevision] = useState(null), [syncError, setSyncError] = useState('');
  const dataRef = useRef(data), revisionRef = useRef(revision);
  const syncWriteCountRef = useRef(0), refreshInFlightRef = useRef(false);
  const stageItemSyncQueueRef = useRef(Promise.resolve());
  const page = pages.find(item => item.id === (['materials', 'services'].includes(active) ? 'stages' : active)) || pages[0];
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
    const cleanedData = removeArchivedStageMaterialDefaults(loaded);
    loaded = cleanedData.data;
    needsSeed ||= cleanedData.changed;
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
        const latestCleanedData = removeArchivedStageMaterialDefaults(loaded);
        loaded = latestCleanedData.data;
        if (latestLots.changed || latestStagesMissing || latestCleanedData.changed) stored = await sync.write(loaded, stored.revision);
      }
    }
    dataRef.current = loaded; revisionRef.current = stored.revision;
    setData(loaded); setRevision(stored.revision);
    return loaded;
  }
  useEffect(() => { let cancelled = false; (async () => {
    try {
      if (isLocalDev()) { setUser({ username: 'Desenvolvedor', role: 'dev' }); await loadRemoteData(); return; }
      let account = null;
      const savedPat = await credentialStore.read();
      const token = sessionStorage.getItem('alianca-session-token');
      if (savedPat) {
        sessionStorage.removeItem('alianca-session-token');
        try { account = (await restorePatSession())?.user || null; }
        catch (error) {
          if (error.status === 401 || error.status === 403) {
            sessionStorage.removeItem('alianca-session-token');
            try { await credentialStore.clear(); } catch {}
          }
          throw error;
        }
      } else if (token) {
        const response = await fetch(`${WORKER}/api/session`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) account = (await response.json()).user;
        else if (response.status !== 401) throw new Error('Não foi possível verificar a sessão. Tente novamente.');
      }
      if (!account && !savedPat) { sessionStorage.removeItem('alianca-session-token'); account = (await restorePatSession())?.user; }
      if (account && !cancelled) { setUser(account); try { await loadRemoteData(); } catch (error) { setSyncError(error.message); } }
    } catch (error) { if (!cancelled) setRestoreError(error.message); }
    finally { if (!cancelled) setRestoring(false); }
  })(); return () => { cancelled = true; }; }, []);
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine || refreshInFlightRef.current || syncWriteCountRef.current || revisionRef.current === null) return;
      refreshInFlightRef.current = true;
      const startingRevision = revisionRef.current;
      try {
        const stored = await sync.read();
        if (cancelled || syncWriteCountRef.current || revisionRef.current !== startingRevision) return;
        if (stored.revision !== startingRevision) {
          const latest = { ...emptyData(), ...stored.data };
          dataRef.current = latest; revisionRef.current = stored.revision;
          setData(latest); setRevision(stored.revision);
        }
        setSyncError('');
      } catch (error) { if (!cancelled) setSyncError(`Falha ao atualizar dados: ${error.message}`); }
      finally { refreshInFlightRef.current = false; }
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user]);
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
  function navigateStage(id) { setRequestedStageId(id); navigate('stages'); }
  async function saveRecords(type, rows) {
    if (revisionRef.current === null) throw new Error('Aguarde o carregamento dos dados antes de salvar.');
    const next = { ...dataRef.current, [type]: rows };
    syncWriteCountRef.current += 1;
    try {
      const saved = await sync.write(next, revisionRef.current);
      dataRef.current = next; revisionRef.current = saved.revision;
      setData(next); setRevision(saved.revision); setSyncError('');
    } finally { syncWriteCountRef.current -= 1; }
  }
  useEffect(() => {
    if (!user) return undefined;
    const handleStageItemChange = event => {
      const change = event.detail || {};
      if (change.kind !== 'Material' || !['stage', 'materials'].includes(change.sourceType) || !change.itemId) return;
      stageItemSyncQueueRef.current = stageItemSyncQueueRef.current.then(async () => {
        let base = dataRef.current;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          let changed = false;
          const agenda = (base.agenda || []).map(appointment => {
            const allocations = appointment.materialAllocations || [];
            const matching = allocation => (allocation.sourceType === change.sourceType && String(allocation.itemId) === String(change.itemId))
              || allocation.key === materialReferenceKey(change.sourceType, change.itemId);
            const nextAllocations = change.action === 'deleted'
              ? allocations.filter(allocation => !matching(allocation))
              : allocations.map(allocation => {
                if (!matching(allocation)) return allocation;
                changed = true;
                const item = change.item || {};
                return {
                  ...allocation,
                  key: allocation.key || materialReferenceKey(change.sourceType, change.itemId),
                  itemId: change.itemId,
                  sourceType: change.sourceType,
                  name: item.name || item.description || allocation.name,
                  unit: item.unit || allocation.unit || 'un',
                  plannedQuantity: Number(item.plannedQuantity ?? item.quantity ?? allocation.plannedQuantity ?? 0),
                  stageId: change.stageId || allocation.stageId,
                  activityId: change.activityId || null,
                  stageName: change.stageName || allocation.stageName,
                  activityName: change.activityName || allocation.activityName,
                };
              });
            if (change.action === 'deleted' && nextAllocations.length !== allocations.length) changed = true;
            return nextAllocations.length === allocations.length && nextAllocations.every((row, index) => row === allocations[index])
              ? appointment
              : { ...appointment, materialAllocations: nextAllocations };
          });
          if (!changed) return;
          const next = { ...base, agenda };
          try {
            const saved = await sync.write(next, revisionRef.current);
            dataRef.current = next; revisionRef.current = saved.revision;
            setData(next); setRevision(saved.revision); setSyncError('');
            return;
          } catch (error) {
            if (error.status !== 409 || attempt > 0) throw error;
            const latest = await sync.read();
            base = { ...emptyData(), ...latest.data };
            dataRef.current = base; revisionRef.current = latest.revision;
            setData(base); setRevision(latest.revision);
          }
        }
      }).catch(error => setSyncError(`Falha ao sincronizar materiais da agenda: ${error.message}`));
    };
    window.addEventListener(STAGE_ITEM_CHANGE_EVENT, handleStageItemChange);
    return () => window.removeEventListener(STAGE_ITEM_CHANGE_EVENT, handleStageItemChange);
  }, [user]);
  async function signOut() { const token = sessionStorage.getItem('alianca-session-token'); try { await credentialStore.clear(); } catch (error) { setSyncError(error.message || 'Não foi possível remover o PAT salvo.'); return; } try { if (token && !isLocalDev()) await fetch(`${WORKER}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch {} finally { sessionStorage.removeItem('alianca-session-token'); sessionStorage.removeItem('alianca-desktop-dev'); dataRef.current = emptyData(); revisionRef.current = null; setUser(null); setData(emptyData()); setRevision(null); setSyncError(''); setRestoreError(''); } }
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
    if (result.source !== 'Seleção manual' && !officeRoute && items.some(item => !item.activityId || !item.stageId)) throw new Error('Escolha uma atividade de etapa para cada item antes de aplicar a nota.');
    const next = [...(currentData[type] || []), ...items.map(item => { const quantity = Number(item.quantity || 1), totalAmount = Number(item.amount ?? (Number(item.unitPrice || 0) * quantity)); return { id: crypto.randomUUID(), inferenceId: result.inferenceId, name: item.description || recognized.description || 'Item reconhecido', category: item.activityName || item.category || (result.source === 'Seleção manual' ? 'Sem atividade' : type === 'materials' ? 'Material reconhecido' : 'Serviço reconhecido'), unit: item.unit || 'unidade', quantity, unitPrice: Number(item.unitPrice ?? (totalAmount / quantity)), total: totalAmount, amount: totalAmount, date: recognized.date || new Date().toISOString().slice(0, 10), supplier: recognized.supplier || '', stageId: item.stageId, stageName: item.stageName, activityId: item.activityId, activityName: item.activityName, source: result.source || 'OCR', filename: result.filename || '' }; })];
    await saveRecords(type, next);
    if (type === 'materials') {
      const refreshed = await loadRemoteData();
      if (!(refreshed.materials || []).some(row => row.inferenceId === result.inferenceId)) {
        throw new Error('O material foi salvo, mas não apareceu na atualização dos dados. Recarregue Materiais antes de tentar novamente.');
      }
    }
  };
  if (!user) return <Login theme={theme} onThemeChange={setTheme} restoring={restoring} restoreError={restoreError} onDev={async () => { sessionStorage.removeItem('alianca-session-token'); sessionStorage.setItem('alianca-desktop-dev', '1'); setUser({ username: 'Desenvolvedor', role: 'dev' }); try { await loadRemoteData(); } catch (error) { setSyncError(error.message); } }} onLogin={async account => { setUser(account); try { await loadRemoteData(); } catch (error) { setSyncError(error.message); } }} />;
  const existingPartners = data.partnerSettings?.length ? data.partnerSettings : (() => { const unique = new Map(); for (const lot of data.lots || []) for (const entry of lot.entryHistory || []) for (const partner of entry.partners || []) { const key = String(partner.name || '').trim().toLocaleLowerCase('pt-BR'); if (key && !unique.has(key)) unique.set(key, { id: partner.id || key, name: partner.name, percent: partner.percent ?? (partner.part?.input ? Number(partner.part.input) : 0) }); } return [...unique.values()]; })();  return <div className={`app-shell has-assistant-toggle ${detectClientKind() === 'desktop' ? 'atlas-desktop' : ''}`}><aside className="atlas-desktop-sidebar" aria-label="Navegação do Atlas"><div className="atlas-desktop-brand"><span className="atlas-desktop-mark">◇</span><div><strong>atlas.</strong><small>ALIANÇA PARK</small></div></div><div className="atlas-desktop-section">EMPREENDIMENTO<strong>Aliança Park</strong></div><nav aria-label="Seções do empreendimento">{pages.map(item => item.id === 'stages' ? <div className="stage-navigation" key={item.id}><div className="stage-navigation-row"><button type="button" className="atlas-desktop-link" aria-current={['materials', 'services', 'stages'].includes(active) && section === 'menu' ? 'page' : undefined} onClick={() => { navigate('materials'); setStageMenuOpen(true); }}><span aria-hidden="true">⚒</span>Etapas</button><button type="button" className="stage-navigation-expand" aria-label="Expandir etapas" aria-expanded={stageMenuOpen} onClick={() => setStageMenuOpen(open => !open)}>{stageMenuOpen ? '▾' : '▸'}</button></div>{stageMenuOpen && <div className="stage-navigation-children"><button type="button" aria-current={['materials','services'].includes(active) ? 'page' : undefined} onClick={() => navigate('materials')}>Todos os itens</button>{(data.stages || []).map(stage => <button type="button" key={stage.id} aria-current={active === 'stages' && requestedStageId === stage.id ? 'page' : undefined} onClick={() => navigateStage(stage.id)}>{stage.name}</button>)}</div>}</div> : <button type="button" key={item.id} className="atlas-desktop-link" aria-current={active === item.id && section === 'menu' ? 'page' : undefined} onClick={() => navigate(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav><div className="atlas-desktop-account"><span className="atlas-desktop-avatar">{String(user.username || 'A').slice(0, 1).toUpperCase()}</span><div><strong>{user.username}</strong><small>Aliança Park</small></div><button type="button" onClick={signOut}>Sair</button></div></aside><main className="workspace"><header className="page-header"><div className="page-heading"><div className="page-brand"><img className="mobile-brand-logo" src={aliancaLogo} alt="" /><p className="eyebrow">ALIANÇA PARK</p></div><h1>{page.title}</h1></div><div className="page-header-actions"><span className="sync-state">{syncError || (revision === null ? 'Carregando dados…' : isLocalDev() ? 'Modo dev · dados locais' : 'Dados sincronizados')}</span><div className="top-menu" ref={menuRef}><button className="top-menu-trigger" type="button" aria-label="Abrir menu" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><EllipsisVertical size={22} aria-hidden="true" /></button>{menuOpen && <div className="top-menu-dropdown" role="menu" aria-label="Menu da aplicação"><span className="top-menu-heading">NAVEGAR</span>{pages.map(item => item.id === 'stages' ? <div key={item.id} className="top-stage-group"><button className="top-menu-item" type="button" role="menuitem" onClick={() => { navigate('materials'); setStageMenuOpen(true); }}><span aria-hidden="true">⚒</span>Etapas · todos os itens</button><button type="button" className="top-stage-toggle" aria-expanded={stageMenuOpen} onClick={() => setStageMenuOpen(open => !open)}>{stageMenuOpen ? 'Ocultar etapas' : 'Mostrar etapas'}</button>{stageMenuOpen && <div className="top-stage-children">{(data.stages || []).map(stage => <button type="button" key={stage.id} onClick={() => navigateStage(stage.id)}>{stage.name}</button>)}</div>}</div> : <button key={item.id} className="top-menu-item" type="button" role="menuitem" aria-current={active === item.id && section === 'menu' ? 'page' : undefined} onClick={() => navigate(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}<div className="top-menu-preferences"><span>Aparência</span><ThemeToggle theme={theme} onChange={setTheme} /></div><button className="top-menu-item top-menu-signout" type="button" role="menuitem" onClick={signOut}>Sair da conta</button></div>}</div></div></header><section ref={pageContentRef} className="page-content" aria-live="polite">{active === 'settings' ? <PartnerSettingsPage partners={existingPartners} onSave={partners => saveRecords('partnerSettings', partners)} /> : active === 'agenda' ? <AgendaPage events={data.agenda || []} stages={data.stages || []} materials={data.materials || []} onSave={events => saveRecords('agenda', events)} /> : active === 'map' ? <LotDevelopmentPage lots={data.lots || []} onSave={saveRecords} partners={existingPartners} rules={{ ...defaultLotRules, ...(data.repasseRules?.find(rule => rule.id === "lot-allocation")?.values || {}) }} progression={{ areas: data.progressAreas || [], materials: data.materials || [], services: data.services || [], onSaveArea: async (action, area, expected) => { const current = dataRef.current.progressAreas || []; const existing = current.find(item => item.id === area.id); if ((existing?.updatedAt || null) !== expected || (!existing && expected !== null)) throw new Error('Esta área foi alterada em outro dispositivo. Reabra para continuar.'); const next = action === 'delete' ? current.filter(item => item.id !== area.id) : existing ? current.map(item => item.id === area.id ? area : item) : [...current, area]; await saveRecords('progressAreas', next); } }} /> : active === 'stages' ? <StagesPage requestedStageId={requestedStageId} stages={data.stages || []} materials={data.materials || []} services={data.services || []} onSave={stages => saveRecords('stages', stages)} onSaveRecords={saveRecords} /> : active === 'transfers' ? <RepassePage rows={data.transfers || []} lots={data.lots || []} onSave={saveRecords} owner={user.username} rules={data.repasseRules} /> : <DataPage key={active} type={active} rows={active === 'materials' ? data.materials || [] : data[active] || []} lots={data.lots || []} onSave={saveRecords} owner={user.username} onSwitchType={navigate} onOpenStage={navigateStage} />}</section><div className="assistant-rail" hidden={section === 'assistant'}><button type="button" className="assistant-rail-toggle" aria-label="Expandir assistente" aria-expanded="false" onClick={() => setSection('assistant')}><PanelRightOpen size={19} /></button></div><aside className="assistant-drawer" data-open={section === 'assistant' ? 'true' : 'false'} aria-hidden={section !== 'assistant'} inert={section !== 'assistant'} aria-label="Assistente de obra"><button type="button" className="assistant-drawer-close" aria-label="Retrair assistente" aria-expanded="true" onClick={() => setSection('menu')}><PanelRightClose size={18} /></button><div className="assistant-pane"><AssistantChatbox owner={user.username} lots={data.lots || []} stages={data.stages || []} inferenceReady={revision !== null} onAllocate={allocateClassification} /></div></aside></main><nav className="bottom-tabs" aria-label="Navegação principal"><button className={section === 'menu' && (active === 'materials' || active === 'services') ? 'bottom-tab is-active' : 'bottom-tab'} type="button" aria-current={section === 'menu' && (active === 'materials' || active === 'services') ? 'page' : undefined} onClick={() => navigate('materials')}><Package size={20} aria-hidden="true" /><span>Etapas</span></button><button className={section === 'menu' && active === 'transfers' ? 'bottom-tab is-active' : 'bottom-tab'} type="button" aria-current={section === 'menu' && active === 'transfers' ? 'page' : undefined} onClick={() => navigate('transfers')}><ArrowLeftRight size={20} aria-hidden="true" /><span>Repasses</span></button><button className={section === 'assistant' ? 'bottom-tab is-active' : 'bottom-tab'} type="button" aria-current={section === 'assistant' ? 'page' : undefined} onClick={() => { setMenuOpen(false); setSection('assistant'); }}><MessageCircle size={20} aria-hidden="true" /><span>Assistente</span></button></nav></div>;
}

createRoot(document.getElementById('app')).render(<App />);
