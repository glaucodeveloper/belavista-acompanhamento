export const STAGE_ITEM_CHANGE_EVENT = 'alianca:stage-item-change';

const archivedStageMaterialIds = new Set([
  'drenagem-assentar-material-1', 'drenagem-assentar-material-2', 'drenagem-compactar-material-1',
  'agua-rede-principal-material-1', 'agua-rede-principal-material-2', 'agua-ramais-material-1', 'agua-ramais-material-2',
  'eletrica-postes-material-1', 'eletrica-cabos-material-1', 'eletrica-cabos-material-2',
  'pav-base-material-1', 'pav-assentar-material-1', 'pav-assentar-material-2',
  'praca-implantar-material-1', 'arbor-plantio-material-1',
]);

export function materialReferenceKey(sourceType, itemId) {
  return `${sourceType}:${String(itemId)}`;
}

export function removeArchivedStageMaterialDefaults(data = {}) {
  let changed = false;
  const keepExistingItems = rows => (rows || []).filter(item => {
    if (!archivedStageMaterialIds.has(String(item?.id || ''))) return true;
    changed = true;
    return false;
  });
  const stages = (data.stages || []).map(stage => ({
    ...stage,
    materials: keepExistingItems(stage.materials),
    activities: (stage.activities || []).map(activity => ({ ...activity, materials: keepExistingItems(activity.materials) })),
  }));
  const materials = keepExistingItems(data.materials);
  const agenda = (data.agenda || []).map(event => ({
    ...event,
    materialAllocations: (event.materialAllocations || []).filter(allocation => {
      const itemId = String(allocation?.itemId || allocation?.key || '').replace(/^(?:stage|materials):/, '');
      if (!archivedStageMaterialIds.has(itemId)) return true;
      changed = true;
      return false;
    }),
  }));
  const progressAreas = (data.progressAreas || []).map(area => ({
    ...area,
    allocations: (area.allocations || []).filter(allocation => {
      if (allocation?.kind !== 'material' || !archivedStageMaterialIds.has(String(allocation.id || ''))) return true;
      changed = true;
      return false;
    }),
  }));
  return { data: { ...data, stages, materials, agenda, progressAreas }, changed };
}

export function collectStageMaterialChoices(stages = [], materials = []) {
  const choices = [];
  const stageById = new Map(stages.map(stage => [stage.id, stage]));
  const activityById = new Map(stages.flatMap(stage => (stage.activities || []).map(activity => [activity.id, { stage, activity }])));
  const add = (item, stage, activity, sourceType) => {
    if (!item?.id) return;
    choices.push({
      key: materialReferenceKey(sourceType, item.id),
      itemId: item.id,
      sourceType,
      stageId: stage?.id || item.stageId || null,
      activityId: activity?.id || item.activityId || null,
      stageName: stage?.name || item.stageName || 'Sem etapa',
      activityName: activity?.title || item.activityName || 'Sem atividade',
      name: item.name || item.description || 'Material sem descrição',
      unit: item.unit || 'un',
      plannedQuantity: Number(item.quantity ?? item.plannedQuantity ?? 0),
    });
  };

  for (const item of materials) {
    if (archivedStageMaterialIds.has(String(item?.id || ''))) continue;
    const byActivity = activityById.get(item.activityId);
    const stage = stageById.get(item.stageId) || byActivity?.stage;
    const activity = stage && byActivity?.stage.id === stage.id
      ? byActivity.activity
      : stage?.activities?.find(row => row.id === item.activityId) || null;
    add(item, stage, activity, 'materials');
  }

  return choices;
}

export function dispatchStageItemChange(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STAGE_ITEM_CHANGE_EVENT, { detail }));
}
