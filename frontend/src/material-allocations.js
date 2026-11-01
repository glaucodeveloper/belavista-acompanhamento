export const STAGE_ITEM_CHANGE_EVENT = 'alianca:stage-item-change';

export function materialReferenceKey(sourceType, itemId) {
  return `${sourceType}:${String(itemId)}`;
}

export function collectStageMaterialChoices(stages = [], materials = []) {
  const choices = [];
  const stageById = new Map(stages.map(stage => [stage.id, stage]));
  const activityById = new Map(stages.flatMap(stage => (stage.activities || []).map(activity => [activity.id, { stage, activity }])));
  const add = (item, stage, activity, sourceType) => {
    if (!item?.id || !stage?.id) return;
    choices.push({
      key: materialReferenceKey(sourceType, item.id),
      itemId: item.id,
      sourceType,
      stageId: stage.id,
      activityId: activity?.id || null,
      stageName: stage.name || 'Etapa',
      activityName: activity?.title || item.activityName || 'Etapa',
      name: item.name || item.description || 'Material sem descrição',
      unit: item.unit || 'un',
      plannedQuantity: Number(item.quantity ?? item.plannedQuantity ?? 0),
    });
  };

  for (const stage of stages) {
    for (const item of stage.materials || []) add(item, stage, null, 'stage');
    for (const activity of stage.activities || []) {
      for (const item of activity.materials || []) add(item, stage, activity, 'stage');
    }
  }

  for (const item of materials) {
    const byActivity = activityById.get(item.activityId);
    const stage = stageById.get(item.stageId) || byActivity?.stage;
    const linked = stage ? {
      stage,
      activity: byActivity?.stage.id === stage.id ? byActivity.activity : null,
    } : null;
    if (!linked?.stage) continue;
    const activity = linked.activity || linked.stage.activities?.find(row => row.id === item.activityId) || null;
    add(item, linked.stage, activity, 'materials');
  }

  return choices;
}

export function dispatchStageItemChange(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STAGE_ITEM_CHANGE_EVENT, { detail }));
}
