import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, MoreHorizontal, MoveRight, Package, BriefcaseBusiness } from 'lucide-react';
import { TreeProvider, TreeView, TreeNode, TreeNodeTrigger, TreeExpander, TreeIcon, TreeLabel, TreeNodeContent } from './kibo-ui/tree.jsx';
import '../stages-page.css';

const statusLabels = { planejado: 'Planejada', andamento: 'Em andamento', concluido: 'Concluída', bloqueado: 'Bloqueada' };
const uid = () => crypto.randomUUID();

function collectItems(stage, materials = [], services = []) {
  const materialRows = [
    ...(stage.materials || []).map(material => ({ ...material, activityName: material.activityName || 'Etapa', stageId: stage.id, activityId: null, sourceType: null, movable: false })),
    ...(stage.activities || []).flatMap(activity => (activity.materials || []).map(material => ({ ...material, activityName: activity.title, stageId: stage.id, activityId: activity.id, sourceType: null, movable: false }))),
  ].map(material => ({
    id: material.id,
    kind: 'Material',
    name: material.name,
    activity: material.activityName,
    detail: `${Number(material.quantity || material.plannedQuantity || 0).toLocaleString('pt-BR')} ${material.unit || 'un'}`,
    status: material.status || 'planejado',
  }));
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
    detail: `${Number(item.quantity || 1).toLocaleString('pt-BR')} ${item.unit || 'un'} · ${Number(item.total ?? item.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${item.source ? ` · ${item.source}` : ''}`,
    stageId: item.stageId,
    activityId: item.activityId,
    activityName: item.activityName,
    source: item.source,
    movable: Boolean(item.id && (item.source === 'OCR' || item.sourceType)),
  }));
  return [...materialRows, ...expenseRows];
}

export function StagesPage({ stages = [], materials = [], services = [], onSave, onSaveRecords }) {
  const [selectedId, setSelectedId] = useState(stages[0]?.id || '');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [itemDraft, setItemDraft] = useState(null);
  const selected = stages.find(stage => stage.id === selectedId) || stages[0] || null;
  const items = useMemo(() => selected ? collectItems(selected, materials, services) : [], [selected, materials, services]);

  useEffect(() => {
    if (!stages.some(stage => stage.id === selectedId)) setSelectedId(stages[0]?.id || '');
  }, [stages, selectedId]);

  function startNew() {
    setError(''); setNotice('');
    setEditing({ id: uid(), name: '', description: '', status: 'planejado', progress: 0, owner: '', activities: [], materials: [] });
  }

  function startEdit() {
    if (!selected) return;
    setError(''); setNotice(''); setEditing({ ...selected, activities: (selected.activities || []).map(activity => ({ ...activity, properties: Array.isArray(activity.properties) ? activity.properties.map(property => ({ ...property, id: property.id || uid() })) : [] })) });
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
    const normalized = { ...editing, name: editing.name.trim(), description: editing.description.trim(), activities };
    const next = isNew ? [...stages, normalized] : stages.map(stage => stage.id === editing.id ? normalized : stage);
    try { await onSave(next); setSelectedId(editing.id); setEditing(null); setNotice(isNew ? 'Etapa criada.' : 'Etapa atualizada.'); }
    catch (saveError) { setError(saveError.message || 'Não foi possível salvar a etapa.'); }
    finally { setBusy(false); }
  }

  async function deleteStage() {
    if (!selected || !window.confirm(`Excluir a etapa “${selected.name}” e os itens que vieram com ela?`)) return;
    setBusy(true); setError(''); setNotice('');
    try { const next = stages.filter(stage => stage.id !== selected.id); await onSave(next); setSelectedId(next[0]?.id || ''); setNotice('Etapa excluída.'); }
    catch (saveError) { setError(saveError.message || 'Não foi possível excluir a etapa.'); }
    finally { setBusy(false); }
  }

  function startMove(item) {
    setActiveMenu(null); setError(''); setNotice(''); setMovingItem(item);
    setMoveTarget({ stageId: item.stageId, activityId: item.activityId || null });
  }

  function startEditItem(item) {
    setActiveMenu(null); setError(''); setNotice('');
    const row = (item.sourceType === 'materials' ? materials : services).find(entry => entry.id === item.id);
    if (!row) { setError('O item não foi encontrado para edição.'); return; }
    setEditingItem({ ...item, row });
    setItemDraft({
      name: row.name || row.description || '',
      description: row.description || '',
      quantity: String(row.quantity ?? 1),
      unit: row.unit || 'un',
      unitPrice: String(row.unitPrice ?? (Number(row.total ?? row.amount ?? 0) / Math.max(1, Number(row.quantity ?? 1)))),
      total: String(row.total ?? row.amount ?? 0),
      supplier: row.supplier || '',
      invoiceNumber: row.invoiceNumber || '',
      date: row.date || '',
    });
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
      const rows = editingItem.sourceType === 'materials' ? materials : services;
      const updated = rows.map(row => row.id !== editingItem.id ? row : ({
        ...row,
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
      }));
      await onSaveRecords(editingItem.sourceType, updated);
      setEditingItem(null); setItemDraft(null);
      setNotice(`Detalhes de “${itemDraft.name.trim()}” atualizados.`);
    } catch (saveError) { setError(saveError.message || 'Não foi possível salvar os detalhes do item.'); }
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
    <div className="stage-tree-record"><TreeNodeTrigger><TreeExpander /><TreeIcon icon={item.kind === 'Material' ? <Package size={15} /> : <BriefcaseBusiness size={15} />} /><TreeLabel><span className="stage-tree-record-copy"><strong>{item.name}</strong><small>{item.detail}</small></span></TreeLabel><span className={`stage-item-kind ${item.kind === 'Material' ? 'is-material' : ''}`}>{item.kind}</span>{item.status && <span className={`stage-status stage-status-${item.status}`}>{statusLabels[item.status] || item.status}</span>}</TreeNodeTrigger>
      {item.movable && <div className="stage-item-menu"><button type="button" className="stage-item-menu-trigger" aria-label={`Ações para ${item.name}`} aria-haspopup="menu" aria-expanded={activeMenu === item.id} onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}><MoreHorizontal size={17} /></button>{activeMenu === item.id && <div className="stage-item-menu-popover" role="menu"><button type="button" role="menuitem" onClick={() => startEditItem(item)}><Pencil size={14} /> Editar detalhes do item</button><button type="button" role="menuitem" onClick={() => startMove(item)}><MoveRight size={14} /> Mover para etapa ou atividade</button></div>}</div>}
    </div>
  </TreeNode>;

  return <div className="stages-page">
    <div className="stages-intro"><div><p className="eyebrow">PLANEJAMENTO DA OBRA</p><h2>Etapas</h2><p>Descrição, andamento e itens previstos por frente de trabalho.</p></div><button type="button" className="primary-button" onClick={startNew}><Plus size={15} /> Adicionar etapa</button></div>
    <nav className="stage-tabs" role="tablist" aria-label="Navegação por etapa">
      {stages.map((stage, index) => <button type="button" role="tab" aria-selected={stage.id === selected?.id} aria-controls="stage-panel" id={`stage-tab-${stage.id}`} key={stage.id} onClick={() => { setSelectedId(stage.id); setEditing(null); setNotice(''); setError(''); }}><small>{String(index + 1).padStart(2, '0')}</small>{stage.name}</button>)}
      {!stages.length && <span>Nenhuma etapa cadastrada.</span>}
    </nav>
    {notice && <p className="stage-notice" role="status">{notice}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {editing && <form className="stage-edit-card" onSubmit={saveStage}>
      <div className="stage-edit-heading"><div><p className="eyebrow">{stages.some(stage => stage.id === editing.id) ? 'EDITAR ETAPA' : 'NOVA ETAPA'}</p><h3>Dados da etapa</h3></div><button type="button" className="icon-button" aria-label="Fechar formulário" onClick={() => setEditing(null)}><X size={16} /></button></div>
      <div className="stage-edit-grid"><label>Nome<input autoFocus value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} placeholder="Ex.: Rede de Água" /></label><label>Status<select value={editing.status || 'planejado'} onChange={event => setEditing({ ...editing, status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Responsável<input value={editing.owner || ''} onChange={event => setEditing({ ...editing, owner: event.target.value })} placeholder="Equipe ou responsável" /></label><label>Avanço (%)<input type="number" min="0" max="100" value={editing.progress ?? 0} onChange={event => setEditing({ ...editing, progress: Number(event.target.value) })} /></label><label className="stage-description-field">Descrição<textarea rows="3" value={editing.description || ''} onChange={event => setEditing({ ...editing, description: event.target.value })} placeholder="Descreva o objetivo e o escopo desta etapa." /></label></div>
      <section className="stage-activities-editor" aria-labelledby="stage-activities-title"><header><div><p className="eyebrow">CLASSIFICAÇÃO DE NOTAS</p><h4 id="stage-activities-title">Atividades</h4><p>As atividades organizam materiais e serviços e ajudam a inferência a classificar anexos.</p></div><button type="button" className="quiet-button" onClick={addActivity}><Plus size={14} /> Adicionar atividade</button></header>
        {(editing.activities || []).length ? <div className="stage-activity-edit-list">{editing.activities.map((activity, index) => <article className="stage-activity-edit-card" key={activity.id}><div className="stage-activity-edit-heading"><strong>Atividade {String(index + 1).padStart(2, '0')}</strong><button type="button" className="icon-button subtle" aria-label={`Remover atividade ${activity.title || index + 1}`} onClick={() => removeActivity(activity.id)}><Trash2 size={14} /></button></div><div className="stage-activity-fields"><label>Nome da atividade<input value={activity.title || ''} onChange={event => updateActivity(activity.id, { title: event.target.value })} placeholder="Ex.: Instalação de tubulação" /></label><label>Prazo (dias)<input type="number" min="0" value={activity.durationDays ?? 0} onChange={event => updateActivity(activity.id, { durationDays: Number(event.target.value) })} /></label><label>Status<select value={activity.status || 'planejado'} onChange={event => updateActivity(activity.id, { status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Avanço (%)<input type="number" min="0" max="100" value={activity.progress ?? 0} onChange={event => updateActivity(activity.id, { progress: Number(event.target.value) })} /></label><label className="stage-activity-description">Descrição<textarea rows="2" value={activity.description || ''} onChange={event => updateActivity(activity.id, { description: event.target.value })} placeholder="Descreva o serviço e os materiais associados." /></label></div><div className="stage-activity-properties"><div className="stage-activity-properties-heading"><div><strong>Descrições adicionais</strong><small>Adicione pares de rótulo e valor para orientar o cadastro e a inferência.</small></div><button type="button" className="quiet-button" onClick={() => addActivityProperty(activity.id)}><Plus size={13} /> Adicionar campo</button></div>{(activity.properties || []).map((property, propertyIndex) => <div className="stage-activity-property-row" key={property.id || propertyIndex}><label>Rótulo<input value={property.label || ''} onChange={event => updateActivityProperty(activity.id, property.id, { label: event.target.value })} placeholder="Ex.: Tipo de serviço" /></label><label>Valor<input value={property.value || ''} onChange={event => updateActivityProperty(activity.id, property.id, { value: event.target.value })} placeholder="Ex.: Rede de água potável" /></label><button type="button" className="icon-button subtle" aria-label={`Remover campo ${property.label || propertyIndex + 1}`} onClick={() => removeActivityProperty(activity.id, property.id)}><X size={14} /></button></div>)}</div></article>)}</div> : <p className="stage-activities-empty">Nenhuma atividade. Adicione atividades para organizar materiais e serviços por categoria.</p>}
      </section>
      <div className="stage-edit-actions"><button type="button" className="quiet-button" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}><Check size={15} /> {busy ? 'Salvando…' : 'Salvar etapa'}</button></div>
    </form>}
    {selected && !editing ? <section className="stage-detail" id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${selected.id}`}>
      <article className="stage-summary-card"><div className="stage-summary-copy"><div className="stage-summary-kicker"><span>ETAPA {String(stages.findIndex(stage => stage.id === selected.id) + 1).padStart(2, '0')}</span><span className={`stage-status stage-status-${selected.status || 'planejado'}`}>{statusLabels[selected.status] || selected.status || 'Planejada'}</span></div><h3>{selected.name}</h3><p>{selected.description || 'Esta etapa ainda não possui descrição.'}</p><div className="stage-summary-meta"><span>{selected.owner ? `Responsável: ${selected.owner}` : 'Responsável não definido'}</span><span>{Number(selected.progress || 0)}% concluído</span></div><div className="stage-progress-track"><i style={{ width: `${Math.min(100, Math.max(0, Number(selected.progress || 0)))}%` }} /></div></div><div className="stage-summary-actions"><button type="button" className="quiet-button" onClick={startEdit}><Pencil size={14} /> Editar</button><button type="button" className="quiet-button danger-button" disabled={busy} onClick={deleteStage}><Trash2 size={14} /> Excluir</button></div></article>
      <section className="stage-items-card"><header><div><p className="eyebrow">CONTEÚDO DA ETAPA</p><h3>Materiais e serviços</h3><p>Itens previstos e despesas reconhecidas, com a atividade como categoria de alocação.</p></div><span className="stage-item-count">{items.length} itens</span></header>
        {items.length ? <TreeProvider defaultExpandedIds={[`stage:${selected.id}`, ...(selected.activities || []).map(activity => `activity:${activity.id}`)]} selectable={false} showLines showIcons indent={19}><TreeView role="tree" aria-label={`Materiais e serviços de ${selected.name}`}><TreeNode nodeId={`stage:${selected.id}`} role="treeitem" aria-expanded="true" aria-level="1"><TreeNodeTrigger><TreeExpander hasChildren /><TreeIcon hasChildren /><TreeLabel><span className="stage-tree-group-label"><strong>{selected.name}</strong><small>{items.length} materiais e serviços</small></span></TreeLabel></TreeNodeTrigger><TreeNodeContent hasChildren className="stage-tree-children" role="group">{items.filter(item => !item.activityId).map((item, index, rows) => itemNode(item, 1, index === rows.length - 1))}{(selected.activities || []).map((activity, activityIndex, activities) => { const activityItems = items.filter(item => item.activityId === activity.id); const nodeId = `activity:${activity.id}`; return <TreeNode nodeId={nodeId} level={1} isLast={activityIndex === activities.length - 1} key={nodeId} role="treeitem" aria-expanded={activityItems.length > 0} aria-level="2"><TreeNodeTrigger><TreeExpander hasChildren={activityItems.length > 0} /><TreeIcon hasChildren={activityItems.length > 0} /><TreeLabel><span className="stage-tree-group-label"><strong>{activity.title}</strong><small>{activityItems.length} {activityItems.length === 1 ? 'item' : 'itens'}</small></span></TreeLabel></TreeNodeTrigger><TreeNodeContent hasChildren={activityItems.length > 0} className="stage-tree-children" role="group">{activityItems.map((item, index, rows) => itemNode(item, 2, index === rows.length - 1))}</TreeNodeContent></TreeNode>; })}</TreeNodeContent></TreeNode></TreeView></TreeProvider> : <div className="stage-items-empty"><strong>Sem itens vinculados</strong><span>Esta etapa ainda não tem materiais ou serviços reconhecidos.</span></div>}
      </section>
    </section> : !editing && <div className="stage-empty"><strong>Comece pelo cadastro de uma etapa</strong><span>As etapas importadas do projeto arquivado aparecem aqui depois da sincronização.</span></div>}
    {movingItem && <div className="stage-move-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setMovingItem(null); setMoveTarget(null); } }}><section className="stage-move-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-move-title"><header><div><p className="eyebrow">REALOCAR ITEM</p><h3 id="stage-move-title">Mover material ou serviço</h3><p><strong>{movingItem.name}</strong> · atualmente em {movingItem.stageId ? (stages.find(stage => stage.id === movingItem.stageId)?.name || 'Etapa removida') : 'Sem etapa'}</p></div><button type="button" className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => { setMovingItem(null); setMoveTarget(null); }}><X size={16} /></button></header><div className="stage-move-tree"><TreeProvider defaultExpandedIds={stages.map(stage => `destination-stage:${stage.id}`)} selectedIds={moveTarget ? [moveTarget.activityId ? `destination-activity:${moveTarget.activityId}` : `destination-stage:${moveTarget.stageId}`] : []} onSelectionChange={selectMoveDestination} showLines showIcons indent={19}><TreeView aria-label="Selecione uma etapa ou atividade">{stages.map(stage => { const nodeId = `destination-stage:${stage.id}`; const activities = stage.activities || []; return <TreeNode nodeId={nodeId} level={0} key={nodeId} role="treeitem" aria-expanded={activities.length > 0}><TreeNodeTrigger><TreeExpander hasChildren={activities.length > 0} /><TreeIcon hasChildren={activities.length > 0} /><TreeLabel><span className="stage-tree-group-label"><strong>{stage.name}</strong><small>{stage.description || 'Mover para a etapa'}</small></span></TreeLabel></TreeNodeTrigger><TreeNodeContent hasChildren={activities.length > 0} className="stage-tree-children">{activities.map((activity, index) => { const activityNodeId = `destination-activity:${activity.id}`; return <TreeNode nodeId={activityNodeId} level={1} isLast={index === activities.length - 1} key={activityNodeId} role="treeitem"><TreeNodeTrigger><TreeExpander /><TreeIcon /><TreeLabel><span className="stage-tree-group-label"><strong>{activity.title}</strong>{activity.description && <small>{activity.description}</small>}</span></TreeLabel></TreeNodeTrigger></TreeNode>; })}</TreeNodeContent></TreeNode>; })}</TreeView></TreeProvider></div>{error && <p className="error-message" role="alert">{error}</p>}<footer><button type="button" className="quiet-button" disabled={busy} onClick={() => { setMovingItem(null); setMoveTarget(null); }}>Cancelar</button><button type="button" className="primary-button" disabled={busy || !moveTarget || (moveTarget.stageId === movingItem.stageId && (moveTarget.activityId || null) === (movingItem.activityId || null))} onClick={saveMove}><MoveRight size={15} /> {busy ? 'Movendo…' : 'Mover item'}</button></footer></section></div>}
    {editingItem && itemDraft && <div className="stage-move-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setEditingItem(null); setItemDraft(null); } }}><form className="stage-item-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-item-edit-title" onSubmit={saveItemDetails}><header><div><p className="eyebrow">DETALHES DA NOTA</p><h3 id="stage-item-edit-title">Editar {editingItem.kind.toLowerCase()}</h3><p>Atualize os dados reconhecidos na nota. O total acompanha quantidade e valor unitário.</p></div><button type="button" className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => { setEditingItem(null); setItemDraft(null); }}><X size={16} /></button></header><div className="stage-item-edit-fields"><label>Item<input autoFocus value={itemDraft.name} onChange={event => updateItemDraft('name', event.target.value)} required /></label><label className="stage-item-edit-description">Descrição<textarea rows="2" value={itemDraft.description} onChange={event => updateItemDraft('description', event.target.value)} /></label><label>Quantidade<input type="number" min="0.001" step="any" value={itemDraft.quantity} onChange={event => updateItemDraft('quantity', event.target.value)} required /></label><label>Unidade<input value={itemDraft.unit} onChange={event => updateItemDraft('unit', event.target.value)} placeholder="un" /></label><label>Valor unitário (R$)<input type="number" min="0" step="0.01" value={itemDraft.unitPrice} onChange={event => updateItemDraft('unitPrice', event.target.value)} required /></label><label>Total (R$)<input type="number" min="0" step="0.01" value={itemDraft.total} onChange={event => updateItemDraft('total', event.target.value)} required /></label><label>Fornecedor<input value={itemDraft.supplier} onChange={event => updateItemDraft('supplier', event.target.value)} /></label><label>Número da nota<input value={itemDraft.invoiceNumber} onChange={event => updateItemDraft('invoiceNumber', event.target.value)} /></label><label>Data<input type="date" value={itemDraft.date} onChange={event => updateItemDraft('date', event.target.value)} /></label></div>{error && <p className="error-message" role="alert">{error}</p>}<footer><button type="button" className="quiet-button" disabled={busy} onClick={() => { setEditingItem(null); setItemDraft(null); }}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}><Check size={15} /> {busy ? 'Salvando…' : 'Salvar detalhes'}</button></footer></form></div>}
  </div>;
}
