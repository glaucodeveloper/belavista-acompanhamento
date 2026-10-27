import stageWorkbenchCatalogData from './frontend/src/data/worker-stage-workbench-catalog.json' with {type:'json'};

export const STAGE_WORKBENCH=stageWorkbenchCatalogData;

export function findWorkbenchStage(key=''){
  const normalized=String(key).trim().toLowerCase();
  return STAGE_WORKBENCH.find(item=>item.key===normalized||item.aliases.includes(normalized))||STAGE_WORKBENCH[0];
}

export function findWorkbenchActivity(stageKey,activityId){
  const selected=findWorkbenchStage(stageKey);
  return {stage:selected,activity:selected.activities.find(item=>item.id===activityId)||selected.activities[0]};
}
