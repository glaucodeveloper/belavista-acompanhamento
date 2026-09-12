import {
  getPlanningState,
  insertDecisionRun,
  insertNotification,
  upsertPurchaseRequest,
  upsertStageAgendaItem,
  updateActivityDecision
} from './storage.js';
import {buildMaterialPlan,decisionMessage} from './orchestrator.js';
import {explainMaterialPlan} from './nvidia.js';
import {publishPlanningRealtime} from './realtime.js';

const DAY_MS=86_400_000;

function purchaseDate(requirement){
  const needed=Date.parse(`${requirement.neededBy}T12:00:00Z`);
  const date=new Date(needed-(Number(requirement.leadTimeDays||0)*DAY_MS));
  return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):requirement.neededBy;
}

function activityDecision(action){
  if(action==='activity_ready')return 'ready';
  if(action==='blocked_dependency')return 'blocked_dependency';
  if(action==='blocked_pending')return 'blocked_pending';
  if(action==='blocked_pending')return 'blocked_pending';
  if(action==='blocked_cash')return 'blocked_cash';
  if(action==='purchase_partial')return 'partial_material_coverage';
  return 'awaiting_purchase_approval';
}

function severity(action){
  if(action==='blocked_cash')return 'critical';
  if(action==='purchase_partial'||action==='blocked_dependency'||action==='blocked_pending')return 'warning';
  return 'info';
}

function publicDecision(item){
  return {
    requirementId:item.requirement.id,
    projectId:item.requirement.projectId,
    projectName:item.project?.name||item.requirement.projectId,
    activityId:item.requirement.activityId,
    activityTitle:item.activity?.title||item.requirement.stageName,
    stageName:item.requirement.stageName,
    materialName:item.requirement.materialName,
    unit:item.requirement.unit,
    neededBy:item.requirement.neededBy,
    action:item.action,
    priorityScore:item.score,
    stockQuantity:item.stockQuantity,
    pendingQuantity:item.pendingQuantity,
    missingQuantity:item.missingQuantity,
    purchaseQuantity:item.purchaseQuantity,
    missingCostCents:item.missingCostCents,
    allocatedCents:item.allocatedCents,
    blockedBy:item.dependency?.blockedBy||[],
    pending:item.pending?.items||[],
    message:decisionMessage(item)
  };
}

export async function runPlanningCycle(env,{trigger='manual',horizonDays=45,dryRun=false,pending=[],blockers=[],raidItems=[]}={}){
  const state=await getPlanningState(env);
  state.pending=pending;
  state.blockers=blockers;
  state.raidItems=raidItems;
  const computed=buildMaterialPlan(state,{horizonDays});
  const explanation=await explainMaterialPlan(env,computed);
  const plan={...computed,decisions:computed.decisions.map(publicDecision)};
  if(dryRun)return {...plan,explanation,dryRun:true};

  const run=await insertDecisionRun(env,{
    trigger,
    ...computed,
    plan,
    aiExplanation:explanation,
    aiProvider:explanation.provider
  });
  const realtimeNotifications=[];

  for(const item of computed.decisions){
    const requirement=item.requirement;
    const message=decisionMessage(item);
    await updateActivityDecision(env,requirement.activityId,activityDecision(item.action));

    if(item.missingQuantity>0){
      const purchasable=item.purchaseQuantity>0;
      await upsertPurchaseRequest(env,{
        id:`BUY-${requirement.id}`,
        projectId:requirement.projectId,
        activityId:requirement.activityId,
        requirementId:requirement.id,
        materialName:requirement.materialName,
        quantity:purchasable?item.purchaseQuantity:item.missingQuantity,
        unit:requirement.unit,
        unitCostCents:requirement.unitCostCents,
        totalCostCents:purchasable?item.allocatedCents:item.missingCostCents,
        neededBy:requirement.neededBy,
        status:purchasable?(item.action==='purchase_partial'?'partial':'suggested'):'paused_cash',
        rationale:message,
        decisionRunId:run.id
      });
    }

    await upsertStageAgendaItem(env,{
      id:`AGD-MAT-${requirement.id}`,
      stage:requirement.stageName,
      title:message,
      date:purchaseDate(requirement),
      owner:item.activity?.owner||'Suprimentos',
      relation:`material:${requirement.id}`,
      status:item.action.startsWith('blocked')?'attention':'planned'
    });
    const notification={
      id:`NTF-MAT-${requirement.id}`,
      category:'material-planning',
      severity:severity(item.action),
      title:`${requirement.stageName}: ${requirement.materialName}`,
      message,
      entityType:'material-requirement',
      entityId:requirement.id,
      metadata:{decisionRunId:run.id,action:item.action,cashState:computed.cashState,neededBy:requirement.neededBy}
    };
    await insertNotification(env,notification);
    realtimeNotifications.push(notification);
  }

  const realtime=await publishPlanningRealtime(env,{run,plan,explanation,notifications:realtimeNotifications});
  return {...plan,explanation,realtime,decisionRunId:run.id,createdAt:run.createdAt,dryRun:false};
}
