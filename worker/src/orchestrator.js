const DAY_MS=86_400_000;
const OPEN_PURCHASE_STATUSES=new Set(['suggested','approved','ordered']);

const cents=value=>Number.isFinite(Number(value))?Math.round(Number(value)):0;
const quantity=value=>Number.isFinite(Number(value))?Number(value):0;
const dateValue=value=>{
  const parsed=Date.parse(`${String(value||'').slice(0,10)}T12:00:00Z`);
  return Number.isFinite(parsed)?parsed:Date.now();
};
const roundQuantity=value=>Math.round(Math.max(0,value)*1000)/1000;
const materialKey=(projectId,name,unit)=>`${projectId}::${String(name).trim().toLowerCase()}::${String(unit||'un').trim().toLowerCase()}`;

function inventoryBalances(movements=[]){
  const balances=new Map();
  for(const movement of movements){
    const key=materialKey(movement.projectId,movement.materialName,movement.unit);
    const direction=['saida','reserva','consumo'].includes(String(movement.kind).toLowerCase())?-1:1;
    balances.set(key,(balances.get(key)||0)+(direction*quantity(movement.quantity)));
  }
  return balances;
}

function pendingQuantities(requests=[]){
  const pending=new Map();
  for(const request of requests){
    if(!OPEN_PURCHASE_STATUSES.has(String(request.status).toLowerCase()))continue;
    pending.set(request.requirementId,(pending.get(request.requirementId)||0)+quantity(request.quantity));
  }
  return pending;
}

function dependencyStatus(activity,activitiesById,dependencies=[]){
  const required=dependencies.filter(item=>item.activityId===activity?.id);
  const blockedBy=required
    .map(item=>activitiesById.get(item.dependsOnActivityId))
    .filter(item=>item&&String(item.status).toLowerCase()!=='completed')
    .map(item=>item.id);
  return {ready:blockedBy.length===0,blockedBy};
}

function priorityScore({project,activity,requirement,today}){
  const daysUntilNeed=Math.floor((dateValue(requirement.neededBy)-today)/DAY_MS);
  const urgency=Math.max(0,60-Math.max(-15,daysUntilNeed));
  return cents(project?.priority||3)*20+cents(activity?.priority||3)*15+(activity?.critical?100:0)+urgency;
}

export function buildMaterialPlan(data={},options={}){
  const today=dateValue(options.today||new Date().toISOString().slice(0,10));
  const horizonDays=Math.max(1,cents(options.horizonDays||45));
  const horizon=today+(horizonDays*DAY_MS);
  const projects=(data.projects||[]).filter(item=>String(item.status||'active')==='active');
  const activities=data.activities||[];
  const activitiesById=new Map(activities.map(item=>[item.id,item]));
  const projectsById=new Map(projects.map(item=>[item.id,item]));
  const inventory=inventoryBalances(data.inventoryMovements);
  const pending=pendingQuantities(data.purchaseRequests);
  const realizedIncome=(data.cashEntries||[]).filter(item=>item.kind==='entrada').reduce((sum,item)=>sum+cents(item.amountCents),0);
  const realizedOutflow=(data.cashEntries||[]).filter(item=>item.kind==='saida').reduce((sum,item)=>sum+cents(item.amountCents),0);
  const projectedNet=(data.cashForecasts||[])
    .filter(item=>String(item.status||'expected')==='expected'&&dateValue(item.date)<=horizon)
    .reduce((sum,item)=>sum+(item.kind==='entrada'?1:-1)*Math.round(cents(item.amountCents)*Number(item.confidence??1)),0);
  const committedPurchases=(data.purchaseRequests||[])
    .filter(item=>['approved','ordered'].includes(String(item.status).toLowerCase()))
    .reduce((sum,item)=>sum+cents(item.totalCostCents),0);
  const availableCents=realizedIncome-realizedOutflow+projectedNet-committedPurchases;
  const reserveCents=projects.reduce((sum,item)=>sum+cents(item.reserveCents),0);
  let spendableCents=Math.max(0,availableCents-reserveCents);

  const candidates=(data.materialRequirements||[])
    .filter(item=>String(item.status||'planned')!=='cancelled'&&dateValue(item.neededBy)<=horizon)
    .map(requirement=>{
      const activity=activitiesById.get(requirement.activityId);
      const project=projectsById.get(requirement.projectId);
      const stock=inventory.get(materialKey(requirement.projectId,requirement.materialName,requirement.unit))||0;
      const ordered=pending.get(requirement.id)||0;
      const missingQuantity=roundQuantity(quantity(requirement.quantity)-stock-ordered);
      const dependency=dependencyStatus(activity,activitiesById,data.dependencies);
      return {
        requirement,
        activity,
        project,
        stockQuantity:roundQuantity(stock),
        pendingQuantity:roundQuantity(ordered),
        missingQuantity,
        missingCostCents:cents(missingQuantity*cents(requirement.unitCostCents)),
        dependency,
        score:priorityScore({project,activity,requirement,today})
      };
    })
    .sort((a,b)=>b.score-a.score||dateValue(a.requirement.neededBy)-dateValue(b.requirement.neededBy));

  const materialNeedCents=candidates.reduce((sum,item)=>sum+item.missingCostCents,0);
  const coverage=materialNeedCents===0?1:spendableCents/materialNeedCents;
  const cashState=materialNeedCents<=spendableCents?'green':spendableCents>0&&coverage>=0.5?'yellow':'red';
  const decisions=[];
  let allocatedCents=0;

  for(const candidate of candidates){
    const {requirement,activity,project,missingQuantity,missingCostCents,dependency}=candidate;
    if(missingQuantity<=0){
      decisions.push({...candidate,action:dependency.ready?'activity_ready':'blocked_dependency',purchaseQuantity:0,allocatedCents:0});
      continue;
    }

    const unitCost=Math.max(0,cents(requirement.unitCostCents));
    let purchaseQuantity=0;
    if(unitCost>0&&spendableCents>=unitCost){
      purchaseQuantity=roundQuantity(Math.min(missingQuantity,Math.floor(spendableCents/unitCost*1000)/1000));
    }
    const allocation=cents(purchaseQuantity*unitCost);
    spendableCents=Math.max(0,spendableCents-allocation);
    allocatedCents+=allocation;
    const action=purchaseQuantity>=missingQuantity
      ? (dependency.ready?'purchase_suggested':'purchase_ahead_of_dependency')
      : purchaseQuantity>0?'purchase_partial':'blocked_cash';
    decisions.push({...candidate,action,purchaseQuantity,allocatedCents:allocation,activityId:activity?.id||'',projectId:project?.id||requirement.projectId});
  }

  return {
    cashState,
    horizonDays,
    availableCents,
    reserveCents,
    spendableCents:Math.max(0,availableCents-reserveCents),
    materialNeedCents,
    allocatedCents,
    coverage:Number(Math.min(1,Math.max(0,coverage)).toFixed(4)),
    decisions
  };
}

export function decisionMessage(decision){
  const material=decision.requirement.materialName;
  const activity=decision.activity?.title||decision.requirement.stageName;
  if(decision.action==='activity_ready')return `${activity}: ${material} já possui cobertura em estoque.`;
  if(decision.action==='blocked_dependency')return `${activity}: material disponível, mas há atividade predecessora pendente.`;
  if(decision.action==='purchase_suggested')return `${activity}: sugerir compra de ${decision.purchaseQuantity} ${decision.requirement.unit} de ${material}.`;
  if(decision.action==='purchase_ahead_of_dependency')return `${activity}: sugerir compra antecipada de ${material}; execução aguarda predecessora.`;
  if(decision.action==='purchase_partial')return `${activity}: caixa cobre apenas ${decision.purchaseQuantity} ${decision.requirement.unit} de ${material}.`;
  return `${activity}: compra de ${material} bloqueada por insuficiência de caixa.`;
}
