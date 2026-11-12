import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, MoreHorizontal, MoveRight, Package, BriefcaseBusiness, FileSpreadsheet, FileDown } from 'lucide-react';
import { TreeProvider, TreeView, TreeNode, TreeNodeTrigger, TreeExpander, TreeIcon, TreeLabel, TreeNodeContent } from './kibo-ui/tree.jsx';
import '../stages-page.css';
import { dispatchStageItemChange } from '../material-allocations.js';
import { exportReportCsv, exportReportPdf } from '../report-exports.js';

const statusLabels = { planejado: 'Planejada', andamento: 'Em andamento', concluido: 'Concluída', bloqueado: 'Bloqueada' };
const stageStatusLabels = { planejado: 'Planejada', concluido: 'Concluída', bloqueado: 'Bloqueada' };
const uid = () => crypto.randomUUID();

function collectItems(stage, materials = [], services = []) {
  const activityIds = new Map((stage.activities || []).map(activity => [activity.id, activity.title]));
  const expenseRows = [
    ...materials.map(item => ({ ...item, kind: 'Material', sourceType: 'materials' })),
    ...services.map(item => ({ ...item, kind: 'Serviço', sourceType: 'services' })),
  ].filter(item => item.stageId === stage.id || activityIds.has(item.activityId)).map(item => ({
    id: item.id,
    kind: item.kind,
    sourceType: item.sourceType,
    name: item.name || item.description || 'Item reconhecido',
    activity: item.activityName || activityIds.get(item.activityId) || stage.name,
    quantity: Number(item.quantity ?? item.plannedQuantity ?? 1),
    total: Number(item.total ?? item.amount ?? Number(item.quantity ?? item.plannedQuantity ?? 1) * Number(item.unitPrice || 0)) || 0,
    detail: `${Number(item.quantity ?? item.plannedQuantity ?? 1).toLocaleString('pt-BR')} ${item.unit || 'un'} · ${Number(item.total ?? item.amount ?? Number(item.quantity ?? item.plannedQuantity ?? 1) * Number(item.unitPrice || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${item.source ? ` · ${item.source}` : ''}`,
    stageId: item.stageId,
    activityId: item.activityId,
    date: item.date || '',
    activityName: item.activityName,
    source: item.source,
    movable: Boolean(item.id && (item.source === 'OCR' || item.sourceType)),
  }));
  return expenseRows;
}

function StageTimeTree({ items, mode, itemNode }) {
  const groups = Object.groupBy(items, item => {
    const date = String(item.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'sem-data';
    return mode === 'months' ? date.slice(0, 7) : date;
  });
  const keys = Object.keys(groups).sort((a, b) => a === 'sem-data' ? 1 : b === 'sem-data' ? -1 : b.localeCompare(a));
  const label = key => {
    if (key === 'sem-data') return 'Data não informada';
    const value = new Date(`${mode === 'months' ? `${key}-01` : key}T12:00:00`);
    if (!Number.isFinite(value.getTime())) return 'Data não informada';
    return value.toLocaleDateString('pt-BR', mode === 'months' ? { month: 'long', year: 'numeric' } : undefined);
  };
  return <TreeProvider key={mode} defaultExpandedIds={keys.map(key => `time:${mode}:${key}`)} selectable={false} showLines showIcons indent={19}><TreeView role="tree" aria-label={mode === 'months' ? 'Itens por mês' : 'Itens por dia'}>{keys.map((key, index) => <TreeNode key={key} nodeId={`time:${mode}:${key}`} level={0} isLast={index === keys.length - 1} role="treeitem" aria-level="1"><TreeNodeTrigger><TreeExpander hasChildren /><TreeIcon hasChildren /><TreeLabel><span className="stage-tree-group-label"><strong>{label(key)}</strong><small>{groups[key].length} {groups[key].length === 1 ? 'item' : 'itens'}</small></span></TreeLabel></TreeNodeTrigger><TreeNodeContent hasChildren className="stage-tree-children" role="group">{groups[key].map((item, itemIndex) => itemNode(item, 1, itemIndex === groups[key].length - 1))}</TreeNodeContent></TreeNode>)}</TreeView></TreeProvider>;
}

const balancePeriodModes = [
  ['semester', 'Semestral'], ['month', 'Mensal'], ['week', 'Semanal'], ['day', 'Diário'],
];

function balancePeriod(dateValue, mode) {
  const value = String(dateValue || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { key: 'undated', label: 'Data não informada' };
  const date = new Date(`${value}T12:00:00`), year = date.getFullYear(), month = date.getMonth() + 1;
  if (mode === 'semester') return { key: `${year}-S${month <= 6 ? 1 : 2}`, label: `${month <= 6 ? '1º' : '2º'} semestre de ${year}` };
  if (mode === 'month') return { key: value.slice(0, 7), label: new Date(`${value.slice(0, 7)}-02T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  if (mode === 'day') return { key: value, label: date.toLocaleDateString('pt-BR') };
  const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const thursday = new Date(monday); thursday.setDate(monday.getDate() + 3);
  const weekYear = thursday.getFullYear();
  const firstThursday = new Date(weekYear, 0, 4, 12); firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  const week = Math.round((thursday - firstThursday) / 604800000) + 1;
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const range = `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}–${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  return { key: `${weekYear}-W${String(week).padStart(2, '0')}`, label: `Semana ${String(week).padStart(2, '0')} · ${range}` };
}

function StagePeriodBalance({ items, stageName }) {
  const [mode, setMode] = useState('semester');
  const periods = useMemo(() => {
    const grouped = new Map();
    for (const item of items) {
      const period = balancePeriod(item.date, mode);
      const row = grouped.get(period.key) || { ...period, materials: 0, services: 0, materialCount: 0, serviceCount: 0 };
      if (item.kind === 'Material') { row.materials += item.total; row.materialCount += 1; }
      else { row.services += item.total; row.serviceCount += 1; }
      grouped.set(period.key, row);
    }
    if (mode === 'month' || mode === 'semester') {
      const dated = items.map(item => String(item.date || '')).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
      const start = dated[0] ? new Date(`${dated[0]}T12:00:00`) : new Date();
      const end = new Date();
      if (dated.length) {
        const latest = new Date(`${dated.at(-1)}T12:00:00`);
        if (latest > end) end.setTime(latest.getTime());
      }
      const firstYear = Math.min(start.getFullYear(), end.getFullYear());
      const cursor = mode === 'month'
        ? new Date(firstYear, 0, 1, 12)
        : new Date(firstYear, 0, 1, 12);
      const final = mode === 'month'
        ? new Date(end.getFullYear(), end.getMonth(), 1, 12)
        : new Date(end.getFullYear(), end.getMonth() < 6 ? 0 : 6, 1, 12);
      while (cursor <= final) {
        const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`;
        const period = balancePeriod(date, mode);
        if (!grouped.has(period.key)) grouped.set(period.key, { ...period, materials: 0, services: 0, materialCount: 0, serviceCount: 0 });
        cursor.setMonth(cursor.getMonth() + (mode === 'month' ? 1 : 6));
      }
    }
    if (items.some(item => !/^\d{4}-\d{2}-\d{2}$/.test(String(item.date || '')))) {
      grouped.set('undated', grouped.get('undated') || { key: 'undated', label: 'Data não informada', materials: 0, services: 0, materialCount: 0, serviceCount: 0 });
    }
    return [...grouped.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [items, mode]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const activePeriod = periods.find(period => period.key === selectedPeriod) || periods[0] || null;
  const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totals = activePeriod ? activePeriod.materials + activePeriod.services : 0;
  return <section className="stage-period-balance" aria-label="Balanço de materiais e serviços por período">
    <header><div><p className="eyebrow">BALANÇO DA ETAPA</p><h3>Totais por período</h3><p>Despesas de materiais e serviços registrados nesta etapa.</p></div></header>
    <div className="stage-period-mode-tabs" role="tablist" aria-label="Agrupar totais por período">{balancePeriodModes.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setSelectedPeriod(''); }}>{label}</button>)}</div>
    {periods.length ? <><div className="stage-period-selectors" role="tablist" aria-label={mode === 'semester' ? 'Selecionar semestre' : mode === 'month' ? 'Selecionar mês' : mode === 'week' ? 'Selecionar semana' : 'Selecionar dia'}>{periods.map(period => <button key={period.key} type="button" role="tab" aria-selected={(activePeriod?.key || '') === period.key} onClick={() => setSelectedPeriod(period.key)}>{period.label}</button>)}</div><div className="table-wrap stage-period-balance-table"><table><thead><tr><th>Categoria</th><th>Registros</th><th>Total do período</th></tr></thead><tbody><tr><td data-label="Categoria">Materiais</td><td data-label="Registros">{activePeriod.materialCount}</td><td data-label="Total do período">{money(activePeriod.materials)}</td></tr><tr><td data-label="Categoria">Serviços</td><td data-label="Registros">{activePeriod.serviceCount}</td><td data-label="Total do período">{money(activePeriod.services)}</td></tr></tbody><tfoot><tr><th>Total</th><th>{activePeriod.materialCount + activePeriod.serviceCount}</th><th>{money(totals)}</th></tr></tfoot></table></div><div className="stage-period-export-actions"><button type="button" className="quiet-button" onClick={() => exportReportCsv({ type: 'materials', rows: items.filter(item => balancePeriod(item.date, mode).key === activePeriod.key), title: `Balanço ${stageName} ${activePeriod.label}`, owner: 'Aliança Park' })}><FileSpreadsheet size={15} /> Exportar planilha (CSV)</button><button type="button" className="quiet-button" onClick={() => exportReportPdf({ type: 'materials', rows: items.filter(item => balancePeriod(item.date, mode).key === activePeriod.key), title: `Balanço ${stageName} ${activePeriod.label}`, owner: 'Aliança Park', periodDescription: activePeriod.label })}><FileDown size={15} /> Exportar PDF</button></div></> : <p className="stage-period-balance-empty">Nenhum material ou serviço com data para este balanço.</p>}
  </section>;
}

export function StagesPage({ stages = [], materials = [], services = [], onSave, onSaveRecords, requestedStageId }) {
  const [selectedId, setSelectedId] = useState(stages[0]?.id || '');
  const [editing, setEditing] = useState(null);
  const [confirmingStageDelete, setConfirmingStageDelete] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [itemDraft, setItemDraft] = useState(null);
  const [confirmingItemDelete, setConfirmingItemDelete] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [stageItemView, setStageItemView] = useState('activities');
  const menuAnchorRef = useRef(null), menuPopupRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const selected = stages.find(stage => stage.id === selectedId) || stages[0] || null;
  const items = useMemo(() => selected ? collectItems(selected, materials, services) : [], [selected, materials, services]);

  useEffect(() => { if (requestedStageId && stages.some(stage => stage.id === requestedStageId)) { setSelectedId(requestedStageId); setEditing(null); setNotice(''); setError(''); } }, [requestedStageId, stages]);

  useEffect(() => {
    if (!stages.some(stage => stage.id === selectedId)) setSelectedId(stages[0]?.id || '');
  }, [stages, selectedId]);

  useLayoutEffect(() => {
    if (!activeMenu) { setMenuPosition(null); return undefined; }
    const positionPopup = () => {
      const anchor = menuAnchorRef.current, popup = menuPopupRef.current;
      if (!anchor || !popup) return;
      const rect = anchor.getBoundingClientRect(), bounds = popup.getBoundingClientRect();
      const margin = 8, gap = 6;
      if (rect.bottom < 0 || rect.top > window.innerHeight) { setActiveMenu(null); return; }
      const below = window.innerHeight - rect.bottom - gap - margin;
      const above = rect.top - gap - margin;
      const placement = below >= bounds.height || below >= above ? 'bottom' : 'top';
      const top = placement === 'top'
        ? Math.max(margin, Math.min(rect.top - bounds.height - gap, window.innerHeight - bounds.height - margin))
        : Math.max(margin, Math.min(rect.bottom + gap, window.innerHeight - bounds.height - margin));
      const left = Math.max(margin, Math.min(rect.right - bounds.width, window.innerWidth - bounds.width - margin));
      setMenuPosition({ top, left, placement });
    };
    positionPopup();
    window.addEventListener('resize', positionPopup);
    window.addEventListener('scroll', positionPopup, true);
    return () => {
      window.removeEventListener('resize', positionPopup);
      window.removeEventListener('scroll', positionPopup, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (!editing) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !busy) {
        setEditing(null); setConfirmingStageDelete(false); setError('');
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [Boolean(editing), busy]);

  function startNew() {
    setError(''); setNotice(''); setConfirmingStageDelete(false);
    setEditing({ id: uid(), name: '', description: '', status: 'planejado', owner: '', activities: [], materials: [] });
  }

  function startEdit() {
    if (!selected) return;
    setError(''); setNotice(''); setConfirmingStageDelete(false); setEditing({ ...selected, activities: (selected.activities || []).map(activity => ({ ...activity, properties: Array.isArray(activity.properties) ? activity.properties.map(property => ({ ...property, id: property.id || uid() })) : [] })) });
  }

  function updateActivity(activityId, changes) {
    setEditing(current => ({ ...current, activities: (current.activities || []).map(activity => activity.id === activityId ? { ...activity, ...changes } : activity) }));
  }

  function addActivity() {
    setEditing(current => ({ ...current, activities: [...(current.activities || []), { id: uid(), title: '', description: '', durationDays: 1, status: 'planejado', progress: 0, properties: [], materials: [] }] }));
  }

  function removeActivity(activityId) {
    const linkedItems = [...materials, ...services].filter(item => item.activityId === activityId);
    if (linkedItems.length) { setError('Esta atividade tem materiais ou serviços vinculados. Mova os itens antes de removê-la.'); return; }
    setEditing(current => ({ ...current, activities: (current.activities || []).filter(activity => activity.id !== activityId) }));
    setError('');
  }

  function updateActivityProperty(activityId, propertyId, changes) {
    const activity = editing.activities.find(item => item.id === activityId);
    const properties = (activity?.properties || []).map(property => property.id === propertyId ? { ...property, ...changes } : property);
    updateActivity(activityId, { properties });
  }

  function addActivityProperty(activityId) {
    const activity = editing.activities.find(item => item.id === activityId);
    updateActivity(activityId, { properties: [...(activity?.properties || []), { id: uid(), label: '', value: '' }] });
  }

  function removeActivityProperty(activityId, propertyId) {
    const activity = editing.activities.find(item => item.id === activityId);
    updateActivity(activityId, { properties: (activity?.properties || []).filter(property => property.id !== propertyId) });
  }

  async function saveStage(event) {
    event.preventDefault();
    if (!editing?.name.trim()) { setError('Informe o nome da etapa.'); return; }
    const activities = (editing.activities || []).map(activity => ({ ...activity, title: String(activity.title || '').trim(), description: String(activity.description || '').trim(), progress: Math.min(100, Math.max(0, Number(activity.progress) || 0)), durationDays: Math.max(0, Number(activity.durationDays) || 0), properties: (activity.properties || []).map(property => ({ ...property, label: String(property.label || '').trim(), value: String(property.value || '').trim() })).filter(property => property.label || property.value) }));
    if (activities.some(activity => !activity.title)) { setError('Informe o nome de todas as atividades ou remova as que ficaram vazias.'); return; }
    setBusy(true); setError(''); setNotice('');
    const isNew = !stages.some(stage => stage.id === editing.id);
    const { progress: _legacyProgress, ...stageFields } = editing;
    const normalized = { ...stageFields, status: editing.status === 'andamento' ? 'planejado' : editing.status, name: editing.name.trim(), description: editing.description.trim(), activities };
    const next = isNew ? [...stages, normalized] : stages.map(stage => stage.id === editing.id ? normalized : stage);
    try { await onSave(next); setSelectedId(editing.id); setEditing(null); setNotice(isNew ? 'Etapa criada.' : 'Etapa atualizada.'); }
    catch (saveError) { setError(saveError.message || 'Não foi possível salvar a etapa.'); }
    finally { setBusy(false); }
  }

  async function deleteStage() {
    if (!editing || !stages.some(stage => stage.id === editing.id)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const next = stages.filter(stage => stage.id !== editing.id);
      await onSave(next);
      setSelectedId(next[0]?.id || ''); setEditing(null); setConfirmingStageDelete(false); setNotice('Etapa excluída.');
    }
    catch (saveError) { setError(saveError.message || 'Não foi possível excluir a etapa.'); }
    finally { setBusy(false); }
  }

  function startMove(item) {
    setActiveMenu(null); setError(''); setNotice(''); setMovingItem(item);
    setMoveTarget({ stageId: item.stageId, activityId: item.activityId || null });
  }

  function startEditItem(item) {
    setActiveMenu(null); setError(''); setNotice('');
    const row = item.sourceType === 'stage' ? item.row : (item.sourceType === 'materials' ? materials : services).find(entry => entry.id === item.id);
    if (!row) { setError('O item não foi encontrado para edição.'); return; }
    setConfirmingItemDelete(false);
    setEditingItem({ ...item, row });
    setItemDraft({
      name: row.name || row.description || '',
      description: row.description || '',
      quantity: String(row.quantity ?? row.plannedQuantity ?? 1),
      unit: row.unit || 'un',
      unitPrice: String(row.unitPrice ?? (Number(row.total ?? row.amount ?? 0) / Math.max(1, Number(row.quantity ?? 1)))),
      total: String(row.total ?? row.amount ?? 0),
      supplier: row.supplier || '',
      invoiceNumber: row.invoiceNumber || '',
      date: row.date || '',
    });
  }

  function startNewMaterial() {
    if (!selected) return;
    setError(''); setNotice(''); setConfirmingItemDelete(false);
    const id = uid();
    setEditingItem({ id, kind: 'Material', sourceType: 'materials', stageId: selected.id, activityId: null, row: { id }, isNew: true });
    setItemDraft({ name: '', description: '', quantity: '1', unit: 'un', unitPrice: '0', total: '0', supplier: '', invoiceNumber: '', date: '' });
  }

  function updateItemDraft(field, value) {
    setItemDraft(current => {
      if (!current) return current;
      const next = { ...current, [field]: value };
      const quantity = Number(field === 'quantity' ? value : current.quantity);
      if (field === 'quantity' || field === 'unitPrice') {
        const price = Number(field === 'unitPrice' ? value : current.unitPrice);
        if (Number.isFinite(quantity) && Number.isFinite(price)) next.total = (quantity * price).toFixed(2);
      } else if (field === 'total') {
        const total = Number(value);
        if (Number.isFinite(quantity) && quantity > 0 && Number.isFinite(total)) next.unitPrice = (total / quantity).toFixed(2);
      }
      return next;
    });
  }

  async function saveItemDetails(event) {
    event.preventDefault();
    if (!editingItem || !itemDraft) return;
    if (!onSaveRecords) { setError('O salvamento dos itens não está disponível.'); return; }
    const quantity = Number(itemDraft.quantity);
    const unitPrice = Number(itemDraft.unitPrice);
    const total = Number(itemDraft.total);
    if (!itemDraft.name.trim()) { setError('Informe a descrição do item.'); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('A quantidade deve ser maior que zero.'); return; }
    if (![unitPrice, total].every(value => Number.isFinite(value) && value >= 0)) { setError('Informe valores válidos para preço e total.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (editingItem.sourceType === 'stage') {
        const updatedItem = {
          ...editingItem.row,
          name: itemDraft.name.trim(),
          description: itemDraft.description.trim(),
          quantity,
          plannedQuantity: quantity,
          unit: itemDraft.unit.trim() || 'un',
          unitPrice,
          total,
          amount: total,
          supplier: itemDraft.supplier.trim(),
          invoiceNumber: itemDraft.invoiceNumber.trim(),
          date: itemDraft.date,
        };
        const updatedStages = stages.map(stage => {
          if (stage.id !== editingItem.stageId) return stage;
          const updateRows = rows => (rows || []).map(row => row.id !== editingItem.id ? row : updatedItem);
          if (editingItem.activityId) return { ...stage, activities: (stage.activities || []).map(activity => activity.id === editingItem.activityId ? { ...activity, materials: updateRows(activity.materials) } : activity) };
          return { ...stage, materials: updateRows(stage.materials) };
        });
        await onSave(updatedStages);
        const stage = stages.find(row => row.id === editingItem.stageId);
        const activity = stage?.activities?.find(row => row.id === editingItem.activityId);
        dispatchStageItemChange({ action: 'updated', kind: editingItem.kind, sourceType: 'stage', itemId: editingItem.id, stageId: editingItem.stageId, activityId: editingItem.activityId || null, stageName: stage?.name, activityName: activity?.title || 'Etapa', item: updatedItem });
        setEditingItem(null); setItemDraft(null);
        setNotice(`“${itemDraft.name.trim()}” atualizado na lista da etapa.`);
        return;
      }
      const rows = editingItem.sourceType === 'materials' ? materials : services;
      const existingRow = { ...editingItem.row, ...(rows.find(row => row.id === editingItem.id) || {}) };
      const targetStage = stages.find(row => row.id === editingItem.stageId);
      const targetActivity = targetStage?.activities?.find(row => row.id === editingItem.activityId);
      if (editingItem.isNew && (!targetStage || (editingItem.activityId && !targetActivity))) throw new Error('A etapa ou atividade selecionada não está mais disponível.');
      const updatedItem = {
        ...existingRow,
        name: itemDraft.name.trim(),
        description: itemDraft.description.trim(),
        quantity,
        unit: itemDraft.unit.trim() || 'un',
        unitPrice,
        total,
        amount: total,
        supplier: itemDraft.supplier.trim(),
        invoiceNumber: itemDraft.invoiceNumber.trim(),
        date: itemDraft.date,
        ...(editingItem.isNew ? { stageId: targetStage.id, stageName: targetStage.name, activityId: targetActivity?.id || null, activityName: targetActivity?.title || null, category: targetActivity?.title || targetStage.name, source: 'Cadastro manual' } : {}),
      };
      const updated = editingItem.isNew ? [...rows, updatedItem] : rows.map(row => row.id !== editingItem.id ? row : updatedItem);
      await onSaveRecords(editingItem.sourceType, updated);
      const stage = stages.find(row => row.id === updatedItem.stageId);
      const activity = stage?.activities?.find(row => row.id === updatedItem.activityId);
      dispatchStageItemChange({ action: 'updated', kind: editingItem.kind, sourceType: editingItem.sourceType, itemId: editingItem.id, stageId: updatedItem.stageId, activityId: updatedItem.activityId || null, stageName: updatedItem.stageName || stage?.name, activityName: updatedItem.activityName || activity?.title, item: updatedItem });
      if (editingItem.isNew) setTreeVersion(version => version + 1);
      setEditingItem(null); setItemDraft(null);
      setNotice(editingItem.isNew ? `“${itemDraft.name.trim()}” adicionado à etapa e a Materiais.` : `Detalhes de “${itemDraft.name.trim()}” atualizados.`);
    } catch (saveError) { setError(saveError.message || 'Não foi possível salvar os detalhes do item.'); }
    finally { setBusy(false); }
  }

  async function deleteItem() {
    if (!editingItem) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (editingItem.sourceType === 'stage') {
        const updatedStages = stages.map(stage => {
          if (stage.id !== editingItem.stageId) return stage;
          if (editingItem.activityId) return { ...stage, activities: (stage.activities || []).map(activity => activity.id === editingItem.activityId ? { ...activity, materials: (activity.materials || []).filter(row => row.id !== editingItem.id) } : activity) };
          return { ...stage, materials: (stage.materials || []).filter(row => row.id !== editingItem.id) };
        });
        await onSave(updatedStages);
      } else {
        if (!onSaveRecords) throw new Error('A exclusão dos itens não está disponível.');
        const rows = editingItem.sourceType === 'materials' ? materials : services;
        await onSaveRecords(editingItem.sourceType, rows.filter(row => row.id !== editingItem.id));
      }
      dispatchStageItemChange({ action: 'deleted', kind: editingItem.kind, sourceType: editingItem.sourceType, itemId: editingItem.id, stageId: editingItem.stageId, activityId: editingItem.activityId || null });
      setEditingItem(null); setItemDraft(null); setConfirmingItemDelete(false);
      setNotice(`“${editingItem.name}” excluído da etapa.`);
    } catch (saveError) { setError(saveError.message || 'Não foi possível excluir o item.'); }
    finally { setBusy(false); }
  }

  async function saveMove() {
    if (!movingItem || !moveTarget) return;
    if (!onSaveRecords) { setError('O salvamento dos itens não está disponível.'); return; }
    const targetStage = stages.find(stage => stage.id === moveTarget.stageId);
    const targetActivity = targetStage?.activities?.find(activity => activity.id === moveTarget.activityId);
    if (!targetStage) { setError('Selecione uma etapa válida.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const rows = movingItem.sourceType === 'materials' ? materials : services;
      const next = rows.map(row => row.id !== movingItem.id ? row : ({
        ...row,
        stageId: targetStage.id,
        stageName: targetStage.name,
        activityId: targetActivity?.id || null,
        activityName: targetActivity?.title || null,
        category: targetActivity?.title || targetStage.name,
      }));
      await onSaveRecords?.(movingItem.sourceType, next);
      const movedItem = next.find(row => row.id === movingItem.id);
      dispatchStageItemChange({ action: 'updated', kind: movingItem.kind, sourceType: movingItem.sourceType, itemId: movingItem.id, stageId: targetStage.id, activityId: targetActivity?.id || null, stageName: targetStage.name, activityName: targetActivity?.title || targetStage.name, item: movedItem });
      setSelectedId(targetStage.id); setMovingItem(null); setMoveTarget(null);
      setNotice(`“${movingItem.name}” movido para ${targetStage.name}${targetActivity ? ` · ${targetActivity.title}` : ''}.`);
    } catch (saveError) { setError(saveError.message || 'Não foi possível mover o item.'); }
    finally { setBusy(false); }
  }

  function selectMoveDestination(ids) {
    const value = ids.at(-1);
    if (!value) { setMoveTarget(null); return; }
    for (const stage of stages) {
      if (value === `destination-stage:${stage.id}`) { setMoveTarget({ stageId: stage.id, activityId: null }); return; }
      const activity = (stage.activities || []).find(item => value === `destination-activity:${item.id}`);
      if (activity) { setMoveTarget({ stageId: stage.id, activityId: activity.id }); return; }
    }
  }

  const itemNode = (item, level, isLast) => <TreeNode nodeId={`record:${item.kind}:${item.id}`} level={level} isLast={isLast} key={`${item.kind}-${item.id}`} role="treeitem" aria-level={level + 1}>
    <div className="stage-tree-record"><TreeNodeTrigger role="button" tabIndex={0} aria-label={`Editar ou excluir ${item.kind.toLowerCase()} ${item.name}`} onClick={event => { event.stopPropagation(); startEditItem(item); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); startEditItem(item); } }}><TreeExpander /><TreeIcon icon={item.kind === 'Material' ? <Package size={15} /> : <BriefcaseBusiness size={15} />} /><TreeLabel><span className="stage-tree-record-copy"><strong>{item.name}</strong><small>{item.detail}</small></span></TreeLabel><span className={`stage-item-kind ${item.kind === 'Material' ? 'is-material' : ''}`}>{item.kind}</span>{item.status && <span className={`stage-status stage-status-${item.status}`}>{statusLabels[item.status] || item.status}</span>}</TreeNodeTrigger>
      {item.movable && <div className="stage-item-menu"><button ref={activeMenu === item.id ? menuAnchorRef : null} type="button" className="stage-item-menu-trigger" aria-label={`Ações para ${item.name}`} aria-haspopup="menu" aria-expanded={activeMenu === item.id} onClick={() => { setMenuPosition(null); setActiveMenu(activeMenu === item.id ? null : item.id); }}><MoreHorizontal size={17} /></button>{activeMenu === item.id && <div ref={menuPopupRef} className="stage-item-menu-popover" role="menu" data-placement={menuPosition?.placement || 'bottom'} style={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : undefined}><button type="button" role="menuitem" onClick={() => startEditItem(item)}><Pencil size={14} /> Editar detalhes do item</button><button type="button" role="menuitem" onClick={() => startMove(item)}><MoveRight size={14} /> Mover para etapa ou atividade</button></div>}</div>}
    </div>
  </TreeNode>;

  return <div className="stages-page">
    <div className="stages-intro"><div><p className="eyebrow">PLANEJAMENTO DA OBRA</p><h2>Etapas</h2><p>Descrição e itens lançados por frente de trabalho.</p></div><button type="button" className="primary-button" onClick={startNew}><Plus size={15} /> Adicionar etapa</button></div>
    {notice && <p className="stage-notice" role="status">{notice}</p>}
    {error && !editing && <p className="error-message" role="alert">{error}</p>}
    {editing && <div className="stage-edit-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setEditing(null); setConfirmingStageDelete(false); setError(''); } }}><form className="stage-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-edit-title" onSubmit={saveStage}>
      <header className="stage-edit-heading"><div><p className="eyebrow">{stages.some(stage => stage.id === editing.id) ? 'EDITAR ETAPA' : 'NOVA ETAPA'}</p><h3 id="stage-edit-title">{stages.some(stage => stage.id === editing.id) ? editing.name || 'Dados da etapa' : 'Nova etapa'}</h3><p>Defina os dados e as atividades desta etapa.</p></div><button type="button" className="icon-button" aria-label="Fechar formulário" disabled={busy} onClick={() => { setEditing(null); setConfirmingStageDelete(false); setError(''); }}><X size={16} /></button></header>
      <div className="stage-edit-scroll"><div className="stage-edit-grid"><label>Nome<input autoFocus value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} placeholder="Ex.: Rede de Água" /></label><label>Status<select value={editing.status === 'andamento' ? 'planejado' : editing.status || 'planejado'} onChange={event => setEditing({ ...editing, status: event.target.value })}>{Object.entries(stageStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Responsável<input value={editing.owner || ''} onChange={event => setEditing({ ...editing, owner: event.target.value })} placeholder="Equipe ou responsável" /></label><label className="stage-description-field">Descrição<textarea rows="3" value={editing.description || ''} onChange={event => setEditing({ ...editing, description: event.target.value })} placeholder="Descreva o objetivo e o escopo desta etapa." /></label></div>
      <section className="stage-activities-editor" aria-labelledby="stage-activities-title"><header><div><p className="eyebrow">CLASSIFICAÇÃO DE NOTAS</p><h4 id="stage-activities-title">Atividades</h4><p>As atividades organizam materiais e serviços e ajudam a inferência a classificar anexos.</p></div><button type="button" className="quiet-button" onClick={addActivity}><Plus size={14} /> Adicionar atividade</button></header>
        {(editing.activities || []).length ? <div className="stage-activity-edit-list">{editing.activities.map((activity, index) => <article className="stage-activity-edit-card" key={activity.id}><div className="stage-activity-edit-heading"><strong>Atividade {String(index + 1).padStart(2, '0')}</strong><button type="button" className="icon-button subtle" aria-label={`Remover atividade ${activity.title || index + 1}`} onClick={() => removeActivity(activity.id)}><Trash2 size={14} /></button></div><div className="stage-activity-fields"><label>Nome da atividade<input value={activity.title || ''} onChange={event => updateActivity(activity.id, { title: event.target.value })} placeholder="Ex.: Instalação de tubulação" /></label><label>Prazo (dias)<input type="number" min="0" value={activity.durationDays ?? 0} onChange={event => updateActivity(activity.id, { durationDays: Number(event.target.value) })} /></label><label>Status<select value={activity.status || 'planejado'} onChange={event => updateActivity(activity.id, { status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Avanço (%)<input type="number" min="0" max="100" value={activity.progress ?? 0} onChange={event => updateActivity(activity.id, { progress: Number(event.target.value) })} /></label><label className="stage-activity-description">Descrição<textarea rows="2" value={activity.description || ''} onChange={event => updateActivity(activity.id, { description: event.target.value })} placeholder="Descreva o serviço e os materiais associados." /></label></div><div className="stage-activity-properties"><div className="stage-activity-properties-heading"><div><strong>Descrições adicionais</strong><small>Adicione pares de rótulo e valor para orientar o cadastro e a inferência.</small></div><button type="button" className="quiet-button" onClick={() => addActivityProperty(activity.id)}><Plus size={13} /> Adicionar campo</button></div>{(activity.properties || []).map((property, propertyIndex) => <div className="stage-activity-property-row" key={property.id || propertyIndex}><label>Rótulo<input value={property.label || ''} onChange={event => updateActivityProperty(activity.id, property.id, { label: event.target.value })} placeholder="Ex.: Tipo de serviço" /></label><label>Valor<input value={property.value || ''} onChange={event => updateActivityProperty(activity.id, property.id, { value: event.target.value })} placeholder="Ex.: Rede de água potável" /></label><button type="button" className="icon-button subtle" aria-label={`Remover campo ${property.label || propertyIndex + 1}`} onClick={() => removeActivityProperty(activity.id, property.id)}><X size={14} /></button></div>)}</div></article>)}</div> : <p className="stage-activities-empty">Nenhuma atividade. Adicione atividades para organizar materiais e serviços por categoria.</p>}
      </section>{error && <p className="error-message" role="alert">{error}</p>}</div>
      <footer className="stage-edit-modal-footer">{confirmingStageDelete && <div className="stage-delete-confirm" role="alert"><strong>Excluir “{editing.name}”?</strong><span>A etapa e suas atividades serão removidas. Esta ação não pode ser desfeita.</span><div><button type="button" className="quiet-button" disabled={busy} onClick={() => setConfirmingStageDelete(false)}>Manter etapa</button><button type="button" className="quiet-button danger-button" disabled={busy} onClick={deleteStage}><Trash2 size={14} /> {busy ? 'Excluindo…' : 'Confirmar exclusão'}</button></div></div>}<div className="stage-edit-actions">{stages.some(stage => stage.id === editing.id) && <button type="button" className="quiet-button danger-button" disabled={busy || confirmingStageDelete} onClick={() => setConfirmingStageDelete(true)}><Trash2 size={14} /> Excluir etapa</button>}<span /><button type="button" className="quiet-button" disabled={busy} onClick={() => { setEditing(null); setConfirmingStageDelete(false); setError(''); }}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}><Check size={15} /> {busy ? 'Salvando…' : 'Salvar etapa'}</button></div></footer>
    </form></div>}
    {selected && !editing ? <section className="stage-detail" id="stage-panel" aria-label={`Etapa ${selected.name}`}>
      <section className="stage-items-card"><header><div><h3>Materiais e serviços</h3><p>{selected.name} · itens lançados e organizados por atividade ou data.</p></div><div className="stage-items-actions"><span className="stage-item-count">{items.length} itens</span><button type="button" className="quiet-button" onClick={startEdit}><Pencil size={14} /> Editar etapa</button><button type="button" className="quiet-button" onClick={startNewMaterial}><Plus size={14} /> Adicionar material</button></div></header>
        <div className="record-views stage-item-views" role="group" aria-label="Organização dos itens da etapa"><span>Organizar por</span>{[['activities', 'Atividades'], ['months', 'Meses'], ['days', 'Dias']].map(([id, label]) => <button key={id} type="button" aria-pressed={stageItemView === id} onClick={() => setStageItemView(id)}>{label}</button>)}</div>
        {items.length ? (stageItemView === 'activities' ? <TreeProvider key={`${selected.id}:${treeVersion}`} defaultExpandedIds={[`stage:${selected.id}`, ...(selected.activities || []).map(activity => `activity:${activity.id}`)]} selectable={false} showLines showIcons indent={19}><TreeView role="tree" aria-label={`Materiais e serviços de ${selected.name}`}><TreeNode nodeId={`stage:${selected.id}`} role="treeitem" aria-expanded="true" aria-level="1"><TreeNodeTrigger><TreeExpander hasChildren /><TreeIcon hasChildren /><TreeLabel><span className="stage-tree-group-label"><strong>{selected.name}</strong><small>{items.length} materiais e serviços</small></span></TreeLabel></TreeNodeTrigger><TreeNodeContent hasChildren className="stage-tree-children" role="group">{items.filter(item => !item.activityId).map((item, index, rows) => itemNode(item, 1, index === rows.length - 1))}{(selected.activities || []).map((activity, activityIndex, activities) => { const activityItems = items.filter(item => item.activityId === activity.id); const nodeId = `activity:${activity.id}`; return <TreeNode nodeId={nodeId} level={1} isLast={activityIndex === activities.length - 1} key={nodeId} role="treeitem" aria-expanded={activityItems.length > 0} aria-level="2"><TreeNodeTrigger><TreeExpander hasChildren={activityItems.length > 0} /><TreeIcon hasChildren={activityItems.length > 0} /><TreeLabel><span className="stage-tree-group-label"><strong>{activity.title}</strong><small>{activityItems.length} {activityItems.length === 1 ? 'item' : 'itens'}</small></span></TreeLabel></TreeNodeTrigger><TreeNodeContent hasChildren={activityItems.length > 0} className="stage-tree-children" role="group">{activityItems.map((item, index, rows) => itemNode(item, 2, index === rows.length - 1))}</TreeNodeContent></TreeNode>; })}</TreeNodeContent></TreeNode></TreeView></TreeProvider> : <StageTimeTree key={`${selected.id}:${treeVersion}:${stageItemView}`} items={items} mode={stageItemView} itemNode={itemNode} />) : <div className="stage-items-empty"><strong>Sem itens vinculados</strong><span>Esta etapa ainda não tem materiais ou serviços reconhecidos.</span></div>}
      </section>
      <StagePeriodBalance items={items} stageName={selected.name} />
      {(selected.activities || []).some(activity => activity.fieldEvidence?.length) && <section className="stage-field-evidence-card"><header><div><p className="eyebrow">REGISTROS DE CAMPO</p><h3>Fotos vinculadas às atividades</h3><p>O assistente guarda a imagem e a vincula à atividade escolhida, sem alterar o avanço da etapa.</p></div></header><div className="stage-field-evidence-list">{(selected.activities || []).flatMap(activity => (activity.fieldEvidence || []).map(evidence => ({ ...evidence, activityTitle: activity.title }))).map(evidence => <article className="stage-field-evidence-item" key={evidence.id}><div><strong>{evidence.activityTitle}</strong><small>{evidence.filename} · {evidence.location || 'Área não informada'}</small></div><p>{evidence.summary || 'Descrição visual não informada.'}</p>{evidence.userNotes && <p>Complemento: {evidence.userNotes}</p>}<small>{evidence.observedStatus === 'completed' ? 'Imagem sugere serviço concluído' : evidence.observedStatus === 'in_progress' ? 'Imagem sugere serviço em execução' : 'Situação não confirmada pela imagem'} · guardada no repositório privado</small></article>)}</div></section>}
    </section> : !editing && <div className="stage-empty"><strong>Comece pelo cadastro de uma etapa</strong><span>As etapas importadas do projeto arquivado aparecem aqui depois da sincronização.</span></div>}
    {editingItem?.isNew && itemDraft && <div className="stage-move-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setEditingItem(null); setItemDraft(null); } }}><form className="stage-item-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-new-material-title" onSubmit={saveItemDetails}>
      <header><div><p className="eyebrow">MATERIAIS DA ETAPA</p><h3 id="stage-new-material-title">Adicionar material</h3><p>O material também aparecerá em Materiais e poderá ser usado na agenda.</p></div><button type="button" className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => { setEditingItem(null); setItemDraft(null); }}><X size={16} /></button></header>
      <div className="stage-item-edit-fields"><label>Material<input autoFocus value={itemDraft.name} onChange={event => updateItemDraft('name', event.target.value)} required /></label><label>Atividade (opcional)<select value={editingItem.activityId || ''} onChange={event => setEditingItem(current => ({ ...current, activityId: event.target.value || null }))}><option value="">Somente etapa</option>{(selected?.activities || []).map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label><label className="stage-item-edit-description">Descrição<textarea rows="2" value={itemDraft.description} onChange={event => updateItemDraft('description', event.target.value)} /></label><label>Quantidade<input type="number" min="0.001" step="any" value={itemDraft.quantity} onChange={event => updateItemDraft('quantity', event.target.value)} required /></label><label>Unidade<input value={itemDraft.unit} onChange={event => updateItemDraft('unit', event.target.value)} required /></label><label>Valor unitário (R$)<input type="number" min="0" step="0.01" value={itemDraft.unitPrice} onChange={event => updateItemDraft('unitPrice', event.target.value)} required /></label><label>Total (R$)<input type="number" min="0" step="0.01" value={itemDraft.total} onChange={event => updateItemDraft('total', event.target.value)} required /></label><label>Fornecedor<input value={itemDraft.supplier} onChange={event => updateItemDraft('supplier', event.target.value)} /></label><label>Data<input type="date" value={itemDraft.date} onChange={event => updateItemDraft('date', event.target.value)} /></label></div>
      {error && <p className="error-message" role="alert">{error}</p>}<footer className="stage-item-edit-footer"><span /><button type="button" className="quiet-button" disabled={busy} onClick={() => { setEditingItem(null); setItemDraft(null); }}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}><Check size={15} /> {busy ? 'Salvando…' : 'Adicionar material'}</button></footer>
    </form></div>}
    {movingItem && <div className="stage-move-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setMovingItem(null); setMoveTarget(null); } }}><section className="stage-move-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-move-title"><header><div><p className="eyebrow">REALOCAR ITEM</p><h3 id="stage-move-title">Mover material ou serviço</h3><p><strong>{movingItem.name}</strong> · atualmente em {movingItem.stageId ? (stages.find(stage => stage.id === movingItem.stageId)?.name || 'Etapa removida') : 'Sem etapa'}</p></div><button type="button" className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => { setMovingItem(null); setMoveTarget(null); }}><X size={16} /></button></header><div className="stage-move-tree"><TreeProvider defaultExpandedIds={stages.map(stage => `destination-stage:${stage.id}`)} selectedIds={moveTarget ? [moveTarget.activityId ? `destination-activity:${moveTarget.activityId}` : `destination-stage:${moveTarget.stageId}`] : []} onSelectionChange={selectMoveDestination} showLines showIcons indent={19}><TreeView aria-label="Selecione uma etapa ou atividade">{stages.map(stage => { const nodeId = `destination-stage:${stage.id}`; const activities = stage.activities || []; return <TreeNode nodeId={nodeId} level={0} key={nodeId} role="treeitem" aria-expanded={activities.length > 0}><TreeNodeTrigger><TreeExpander hasChildren={activities.length > 0} /><TreeIcon hasChildren={activities.length > 0} /><TreeLabel><span className="stage-tree-group-label"><strong>{stage.name}</strong><small>{stage.description || 'Mover para a etapa'}</small></span></TreeLabel></TreeNodeTrigger><TreeNodeContent hasChildren={activities.length > 0} className="stage-tree-children">{activities.map((activity, index) => { const activityNodeId = `destination-activity:${activity.id}`; return <TreeNode nodeId={activityNodeId} level={1} isLast={index === activities.length - 1} key={activityNodeId} role="treeitem"><TreeNodeTrigger><TreeExpander /><TreeIcon /><TreeLabel><span className="stage-tree-group-label"><strong>{activity.title}</strong>{activity.description && <small>{activity.description}</small>}</span></TreeLabel></TreeNodeTrigger></TreeNode>; })}</TreeNodeContent></TreeNode>; })}</TreeView></TreeProvider></div>{error && <p className="error-message" role="alert">{error}</p>}<footer><button type="button" className="quiet-button" disabled={busy} onClick={() => { setMovingItem(null); setMoveTarget(null); }}>Cancelar</button><button type="button" className="primary-button" disabled={busy || !moveTarget || (moveTarget.stageId === movingItem.stageId && (moveTarget.activityId || null) === (movingItem.activityId || null))} onClick={saveMove}><MoveRight size={15} /> {busy ? 'Movendo…' : 'Mover item'}</button></footer></section></div>}
    {editingItem && itemDraft && !editingItem.isNew && <div className="stage-move-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setEditingItem(null); setItemDraft(null); setConfirmingItemDelete(false); } }}><form className="stage-item-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-item-edit-title" onSubmit={saveItemDetails}><header><div><p className="eyebrow">{editingItem.sourceType === 'stage' ? 'CONTEÚDO DA ETAPA' : 'DETALHES DA NOTA'}</p><h3 id="stage-item-edit-title">Editar {editingItem.kind.toLowerCase()}</h3><p>{editingItem.sourceType === 'stage' ? 'Edite ou remova este item previsto na etapa.' : 'Atualize os dados reconhecidos na nota. O total acompanha quantidade e valor unitário.'}</p></div><button type="button" className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => { setEditingItem(null); setItemDraft(null); setConfirmingItemDelete(false); }}><X size={16} /></button></header><div className="stage-item-edit-fields"><label>Item<input autoFocus value={itemDraft.name} onChange={event => updateItemDraft('name', event.target.value)} required /></label><label className="stage-item-edit-description">Descrição<textarea rows="2" value={itemDraft.description} onChange={event => updateItemDraft('description', event.target.value)} /></label><label>Quantidade<input type="number" min="0.001" step="any" value={itemDraft.quantity} onChange={event => updateItemDraft('quantity', event.target.value)} required /></label><label>Unidade<input value={itemDraft.unit} onChange={event => updateItemDraft('unit', event.target.value)} placeholder="un" /></label><label>Valor unitário (R$)<input type="number" min="0" step="0.01" value={itemDraft.unitPrice} onChange={event => updateItemDraft('unitPrice', event.target.value)} required /></label><label>Total (R$)<input type="number" min="0" step="0.01" value={itemDraft.total} onChange={event => updateItemDraft('total', event.target.value)} required /></label><label>Fornecedor<input value={itemDraft.supplier} onChange={event => updateItemDraft('supplier', event.target.value)} /></label><label>Número da nota<input value={itemDraft.invoiceNumber} onChange={event => updateItemDraft('invoiceNumber', event.target.value)} /></label><label>Data<input type="date" value={itemDraft.date} onChange={event => updateItemDraft('date', event.target.value)} /></label></div>{confirmingItemDelete && <div className="stage-item-delete-confirm" role="alert"><strong>Excluir “{editingItem.name}”?</strong><span>Esta alteração será salva nos dados da aplicação.</span><div><button type="button" className="quiet-button" disabled={busy} onClick={() => setConfirmingItemDelete(false)}>Manter item</button><button type="button" className="quiet-button danger-button" disabled={busy} onClick={deleteItem}><Trash2 size={14} /> {busy ? 'Excluindo…' : 'Confirmar exclusão'}</button></div></div>}{error && <p className="error-message" role="alert">{error}</p>}<footer className="stage-item-edit-footer"><button type="button" className="quiet-button danger-button" disabled={busy || confirmingItemDelete} onClick={() => setConfirmingItemDelete(true)}><Trash2 size={14} /> Excluir</button><span /><button type="button" className="quiet-button" disabled={busy} onClick={() => { setEditingItem(null); setItemDraft(null); setConfirmingItemDelete(false); }}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}><Check size={15} /> {busy ? 'Salvando…' : 'Salvar detalhes'}</button></footer></form></div>}
  </div>;
}
