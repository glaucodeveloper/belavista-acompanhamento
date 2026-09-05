import {loadOperationalConfiguration,readRepositoryJson,writeRepositoryJson,deleteRepositoryFile} from './github-store.js';

const clone=value=>JSON.parse(JSON.stringify(value??null));
const now=()=>new Date().toISOString();
const safeId=value=>{
  const id=String(value||'').trim().replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');
  if(!id||id.length>120)throw new Error('ID de live test inválido.');
  return id;
};
const sessionPath=id=>`data/operational/live-tests/${safeId(id)}.json`;

function emptyState(source={}){
  return {
    projectId:source.projectId||'live-test',
    cashEntries:[],inventoryMovements:[],purchaseRequests:[],fieldReturns:[]
  };
}

function resetStages(config){
  const next=clone(config||{}); next.stageState={};
  for(const stage of next.stages||[]){
    next.stageState[stage.id]={progress:0,completed:false,completedActivities:[],criteria:{}};
    for(const criterion of stage.entryCriteria||[])next.stageState[stage.id].criteria[criterion.id]=false;
  }
  return next;
}

export async function createLiveTestSession(env,{id,scenario='obra-completa',today,stages,personnel,state}={}){
  const runId=safeId(id||`LIVE-${Date.now().toString(36).toUpperCase()}`);
  const existing=await readRepositoryJson(env,sessionPath(runId),{allowMissing:true});
  if(existing.source!=='missing')throw Object.assign(new Error(`Live test ${runId} já existe.`),{statusCode:409});
  const live=await loadOperationalConfiguration(env);
  const session={
    id:runId,scenario:String(scenario||'obra-completa'),createdAt:now(),updatedAt:now(),
    today:String(today||new Date().toISOString().slice(0,10)),
    configuration:{
      stages:stages?clone(stages):resetStages(live.stages.data),
      personnel:personnel?clone(personnel):clone(live.personnel.data)
    },
    state:state?clone(state):emptyState(live.state?.data||{}),
    history:[{at:now(),type:'session.created',message:'Sessão de teste live criada no GitHub pelo Worker.'}]
  };
  const saved=await writeRepositoryJson(env,sessionPath(runId),session,{message:`test(live): iniciar ${runId}`});
  return {...saved,session};
}

export async function readLiveTestSession(env,id){
  const result=await readRepositoryJson(env,sessionPath(id),{allowMissing:false});
  return {...result,session:result.data};
}

export async function saveLiveTestSession(env,session,{sha,message}={}){
  const next={...clone(session),updatedAt:now()};
  const saved=await writeRepositoryJson(env,sessionPath(next.id),next,{sha,message:message||`test(live): avançar ${next.id}`});
  return {...saved,session:next};
}

export async function deleteLiveTestSession(env,id,{sha}={}){
  return deleteRepositoryFile(env,sessionPath(id),{sha,message:`test(live): encerrar ${safeId(id)}`});
}

function stageFor(session,stageId){
  const stage=(session.configuration?.stages?.stages||[]).find(item=>item.id===stageId);
  if(!stage)throw new Error(`Etapa não encontrada no live test: ${stageId}`);
  const all=session.configuration.stages.stageState||(session.configuration.stages.stageState={});
  return {stage,state:all[stageId]||(all[stageId]={progress:0,completed:false,criteria:{},completedActivities:[]})};
}

function cashEntry(event,kind){
  return {id:event.id||`LIVE-CASH-${Date.now().toString(36).toUpperCase()}`,kind,stage:event.stage||'Geral',category:event.category||'Live test',description:event.description||'',amountCents:Math.max(0,Number(event.amountCents)||0),createdAt:now()};
}

export function applyLiveTestEvent(session,input={}){
  const next=clone(session); const event={...clone(input),at:now()};
  next.state ||= emptyState();
  next.state.cashEntries ||= []; next.state.inventoryMovements ||= []; next.state.purchaseRequests ||= []; next.state.fieldReturns ||= [];

  if(event.type==='criteria.batch'){
    for(const item of event.items||[]){
      const {state}=stageFor(next,item.stageId); state.criteria ||= {}; state.criteria[item.criterionId]=item.value!==false;
    }
  }else if(event.type==='criterion.confirmed'||event.type==='criterion.rejected'){
    const {state}=stageFor(next,event.stageId); state.criteria ||= {}; state.criteria[event.criterionId]=event.type==='criterion.confirmed';
  }else if(event.type==='cash.entry'){
    next.state.cashEntries.unshift(cashEntry(event,'entrada'));
  }else if(event.type==='cash.exit'){
    next.state.cashEntries.unshift(cashEntry(event,'saida'));
  }else if(event.type==='purchase.ordered'){
    next.state.purchaseRequests.push({
      id:event.id||`LIVE-BUY-${Date.now().toString(36).toUpperCase()}`,status:'ordered',
      stageId:event.stageId||'',stageName:event.stageName||'',activityId:event.activityId||'',
      materialName:event.materialName,quantity:Number(event.quantity)||0,unit:event.unit||'un',
      unitCostCents:Number(event.unitCostCents)||0,totalCostCents:Number(event.totalCostCents)||0,
      expectedArrival:event.expectedArrival||next.today,createdAt:now()
    });
  }else if(event.type==='purchase.receipt'){
    const purchaseId=event.purchaseId||event.id||`LIVE-BUY-${Date.now().toString(36).toUpperCase()}`;
    const existing=next.state.purchaseRequests.find(item=>item.id===purchaseId);
    if(existing)existing.status='received';
    else next.state.purchaseRequests.push({id:purchaseId,status:'received',materialName:event.materialName,quantity:Number(event.quantity)||0,unit:event.unit||'un',createdAt:now()});
    const inventoryRecorded=next.state.inventoryMovements.some(item=>item.sourceType==='live-test-receipt'&&item.sourceId===purchaseId);
    if(!inventoryRecorded)next.state.inventoryMovements.push({
      id:`INV-${purchaseId}-${Date.now().toString(36).toUpperCase()}`,kind:'entrada',materialName:event.materialName,
      quantity:Number(event.quantity)||0,unit:event.unit||'un',sourceType:'live-test-receipt',sourceId:purchaseId,createdAt:now()
    });
    const total=Math.max(0,Number(event.totalCostCents)||0);
    const cashId=`CASH-${purchaseId}`;
    if(total&&!next.state.cashEntries.some(item=>item.id===cashId))next.state.cashEntries.unshift(cashEntry({...event,id:cashId,amountCents:total,category:'Compra recebida',description:`Recebimento de ${event.quantity} ${event.unit||'un'} de ${event.materialName}`},'saida'));
  }else if(event.type==='work.diary'){
    const {stage,state}=stageFor(next,event.stageId); state.completedActivities ||= [];
    if(event.activityId&&!state.completedActivities.includes(event.activityId))state.completedActivities.push(event.activityId);
    const total=Math.max(1,(stage.activities||[]).length); const completed=state.completedActivities.length;
    state.progress=Math.max(Number(state.progress)||0,Math.min(100,Math.round((completed/total)*100)),Number(event.progressPercent)||0);
    if(completed>=total||event.stageCompleted===true){state.progress=100;state.completed=true;}
    next.state.fieldReturns.push({id:event.id||`DIARY-${Date.now().toString(36).toUpperCase()}`,stageId:event.stageId,activityId:event.activityId||'',responsavel:event.responsavel||'Encarregado live test',notes:event.notes||'',progressPercent:state.progress,createdAt:now()});
  }else if(event.type==='stage.progress'){
    const {state}=stageFor(next,event.stageId); state.progress=Math.max(0,Math.min(100,Number(event.progressPercent)||0)); state.completed=event.completed===true||state.progress>=100;
  }else if(event.type==='time.advance'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(event.date||'')))throw new Error('time.advance exige date YYYY-MM-DD.');
    next.today=event.date;
  }else if(event.type==='personnel.unavailable'){
    const person=(next.configuration?.personnel?.people||[]).find(item=>item.id===event.personId);
    if(!person)throw new Error(`Pessoa não encontrada: ${event.personId}`);
    person.availability ||= {}; person.availability.unavailableDates ||= [];
    for(const date of event.dates||[])if(!person.availability.unavailableDates.includes(date))person.availability.unavailableDates.push(date);
  }else{
    throw new Error(`Evento live test desconhecido: ${event.type}`);
  }

  next.history ||= [];
  next.history.push({at:event.at,type:event.type,message:event.message||'',event});
  return next;
}
