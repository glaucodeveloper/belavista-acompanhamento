const toMinutes=hhmm=>{const [h,m]=String(hhmm).split(':').map(Number);return h*60+m;};
const hhmm=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const dateKey=value=>String(value).slice(0,10);

function materialMap(context){return new Map((context.materials||[]).map(item=>[item.id,item]));}
function evidenceSet(context){return new Set((context.evidence||[]).map(item=>item.id));}
function sectorState(context,stageId,localityId){return (context.stageSectorState||[]).find(item=>item.stageId===stageId&&item.localityId===localityId);}
function stageMap(context){return new Map((context.stages||[]).map(item=>[item.id,item]));}
function roleMatches(person,role){return String(person.role||'').toLowerCase()===String(role||'').toLowerCase();}
function activeLocalPeople(context,localityId){return (context.personnel||[]).filter(p=>p.active!==false&&p.localityId===localityId);}
function teamSkills(team){return new Set(team.flatMap(p=>p.skills||[]).map(s=>String(s).toLowerCase()));}

function gateProblems(context,activity){
  const materials=materialMap(context),evidence=evidenceSet(context),problems=[];
  for(const dep of activity.dependencies||[]){
    const completed=(context.activities||[]).find(a=>a.id===dep)?.status==='completed';
    if(!completed)problems.push({code:'dependency_pending',dependencyId:dep,message:`Dependência ${dep} ainda não concluída.`});
  }
  for(const gate of activity.gates||[]){
    if(gate.kind==='material'){
      const material=materials.get(gate.materialId),stock=Number(material?.stock||0);
      if(stock<Number(gate.minimumQuantity||0))problems.push({code:'material_missing',materialId:gate.materialId,missingQuantity:Number(gate.minimumQuantity||0)-stock,message:`Material ${material?.name||gate.materialId}: estoque ${stock}, mínimo imediato ${gate.minimumQuantity}.`});
    }
    if(gate.kind==='evidence'&&gate.mustExist&&!evidence.has(gate.evidenceId))problems.push({code:'evidence_missing',evidenceId:gate.evidenceId,message:`Evidência ${gate.evidenceId} ainda não registrada.`});
    if(gate.kind==='stage-sector-complete'&&gate.mustBeComplete){
      const state=sectorState(context,gate.stageId,gate.localityId||activity.localityId);
      if(!state?.complete)problems.push({code:'stage_sector_incomplete',stageId:gate.stageId,localityId:gate.localityId||activity.localityId,message:`Etapa ${gate.stageId} ainda não concluída na localidade ${gate.localityId||activity.localityId}.`});
    }
  }
  return problems;
}

function chooseTeam(context,activity){
  const local=activeLocalPeople(context,activity.localityId),team=[],used=new Set(),missingRoles=[];
  for(const role of activity.requiredRoles||[]){
    const person=local.find(p=>!used.has(p.id)&&roleMatches(p,role));
    if(!person){missingRoles.push(role);continue;}
    team.push(person);used.add(person.id);
  }
  const skills=teamSkills(team),missingSkills=(activity.requiredSkills||[]).filter(skill=>!skills.has(String(skill).toLowerCase()));
  return {team,missingRoles,missingSkills};
}

function availabilityWindows(person){return (person.availability||[]).map(w=>({date:w.date,start:toMinutes(w.start),end:toMinutes(w.end)}));}
function occupiedMap(){return new Map();}
function reservationsFor(occupied,personId,date){return occupied.get(`${personId}|${date}`)||[];}
function reserve(occupied,personId,date,start,end){const key=`${personId}|${date}`;const list=occupied.get(key)||[];list.push({start,end});list.sort((a,b)=>a.start-b.start);occupied.set(key,list);}
function freeFor(occupied,personId,date,start,end){return reservationsFor(occupied,personId,date).every(r=>end<=r.start||start>=r.end);}

function findSlot(team,duration,occupied,clock){
  if(!team.length)return null;
  const allDates=[...new Set(team.flatMap(p=>availabilityWindows(p).map(w=>w.date)))].sort();
  const startFloor=toMinutes(clock.workday?.start||'07:00'),endCeil=toMinutes(clock.workday?.end||'17:00');
  for(const date of allDates){
    for(let start=startFloor;start+duration<=endCeil;start+=15){
      const end=start+duration;
      const available=team.every(person=>availabilityWindows(person).some(w=>w.date===date&&start>=w.start&&end<=w.end)&&freeFor(occupied,person.id,date,start,end));
      if(available)return {date,start,end};
    }
  }
  return null;
}

function personSummary(person){return {id:person.id,name:person.name,role:person.role,localityId:person.localityId};}
function responsibleForeman(team){return team.find(p=>/encarregado/i.test(p.role||''));}

function purchaseProposals(context){
  const spendable=Math.max(0,Number(context.cash?.currentCents||0)-Number(context.cash?.committedCents||0)-Number(context.cash?.reserveCents||0));
  let remaining=spendable;
  const proposals=[];
  for(const material of context.materials||[]){
    const target=Number(material.reorderTarget??material.nextCycleNeed??0),stock=Number(material.stock||0);
    const pending=(context.purchases||[]).filter(p=>p.materialId===material.id&&['ordered','approved'].includes(p.status)).reduce((s,p)=>s+Number(p.quantity||0),0);
    const missing=Math.max(0,target-stock-pending);
    if(!missing||!material.unitCostCents)continue;
    const desiredCost=missing*Number(material.unitCostCents),canBuy=Math.min(missing,Math.floor(remaining/Number(material.unitCostCents)));
    const allocated=canBuy*Number(material.unitCostCents);remaining-=allocated;
    proposals.push({materialId:material.id,materialName:material.name,unit:material.unit,missingQuantity:missing,purchaseQuantity:canBuy,costCents:allocated,desiredCostCents:desiredCost,action:canBuy===missing?'purchase_suggested':canBuy>0?'purchase_partial':'blocked_cash'});
  }
  return {spendableCents:spendable,remainingCents:remaining,proposals};
}

export function runReferenceOperationalLoop(context,{persist=false}={}){
  const occupied=occupiedMap(),schedule=[],blocked=[],notifications=[],agenda=[];
  const stages=stageMap(context);
  // Ordem de entrada é preservada; nenhum campo priority participa da ordenação.
  for(const activity of context.activities||[]){
    if(activity.status==='completed')continue;
    const problems=gateProblems(context,activity);
    const {team,missingRoles,missingSkills}=chooseTeam(context,activity);
    if(missingRoles.length||missingSkills.length){
      problems.push({code:'personnel_missing',missingRoles,missingSkills,message:`Pessoal incompatível na própria localidade: funções [${missingRoles.join(', ')}], habilidades [${missingSkills.join(', ')}].`});
    }
    if(problems.length){
      blocked.push({activityId:activity.id,stageId:activity.stageId,stageName:stages.get(activity.stageId)?.name,localityId:activity.localityId,title:activity.title,reasons:problems,priorityIgnored:activity.priority??null});
      continue;
    }
    const slot=findSlot(team,Number(activity.durationMinutes||60),occupied,context.clock||{});
    if(!slot){
      blocked.push({activityId:activity.id,stageId:activity.stageId,stageName:stages.get(activity.stageId)?.name,localityId:activity.localityId,title:activity.title,reasons:[{code:'availability_missing',message:'Não existe janela comum de disponibilidade da equipe local.'}],priorityIgnored:activity.priority??null});
      continue;
    }
    for(const person of team)reserve(occupied,person.id,slot.date,slot.start,slot.end);
    const foreman=responsibleForeman(team);
    const item={activityId:activity.id,stageId:activity.stageId,stageName:stages.get(activity.stageId)?.name,localityId:activity.localityId,title:activity.title,date:slot.date,start:`${slot.date}T${hhmm(slot.start)}:00-03:00`,end:`${slot.date}T${hhmm(slot.end)}:00-03:00`,assigneeIds:team.map(p=>p.id),assignees:team.map(personSummary),foremanId:foreman?.id||null,reasons:[`Quesitos satisfeitos; encaixado pela disponibilidade da equipe em ${activity.localityId}.`],priorityIgnored:activity.priority??null};
    schedule.push(item);agenda.push({...item,status:'planned'});
    if(foreman)notifications.push({id:`ntf-${context.runToken}-${activity.id}`,recipientRole:'foreman',recipientId:foreman.id,localityId:activity.localityId,activityId:activity.id,category:'agenda',title:`${item.stageName}: ${item.title}`,message:`Atividade encaixada em ${slot.date} ${hhmm(slot.start)}-${hhmm(slot.end)}.`});
  }
  const purchasing=purchaseProposals(context);
  for(const proposal of purchasing.proposals){
    notifications.push({id:`ntf-${context.runToken}-purchase-${proposal.materialId}`,recipientRole:'supplies',recipientId:'supplies',category:'purchase',materialId:proposal.materialId,title:`Provisão: ${proposal.materialName}`,message:`${proposal.action}: ${proposal.purchaseQuantity} ${proposal.unit}.`});
  }
  const understanding={provider:'nvidia-api',summary:`${schedule.length} atividades encaixadas; ${blocked.length} bloqueadas; ${purchasing.proposals.length} provisões analisadas.`,rulesApplied:['localidade de obra','quesitos e peculiaridades','dependências','materiais','evidências','disponibilidade de pessoal','caixa e reserva'],managementActions:blocked.slice(0,5).map(i=>`${i.title}: ${i.reasons[0]?.message}`)};
  return {ok:true,mode:persist?'commit':'dry-run',schedule,blocked,agenda,notifications,purchasing,understanding,operationalPlan:{schedule,blocked,agenda,notifications,purchasing,understanding}};
}

export function applyFieldConfirmation(context,confirmation){
  const next=structuredClone(context);
  const activity=next.activities.find(a=>a.id===confirmation.activityId);
  if(activity&&confirmation.confirmed)activity.status='completed';
  for(const ev of confirmation.evidence||[])if(!next.evidence.some(item=>item.id===ev.id))next.evidence.push({...ev,activityId:confirmation.activityId,localityId:confirmation.localityId,createdAt:confirmation.at||next.clock.now});
  if(confirmation.completeStageSector){
    let state=next.stageSectorState.find(s=>s.stageId===confirmation.completeStageSector.stageId&&s.localityId===confirmation.localityId);
    if(!state){state={stageId:confirmation.completeStageSector.stageId,localityId:confirmation.localityId};next.stageSectorState.push(state);}
    state.complete=true;state.progress=100;
  }
  return next;
}

export function commercialSummary(commercial){
  const byBroker=new Map((commercial.brokers||[]).map(b=>[b.id,b]));
  const commissions=(commercial.sales||[]).filter(s=>s.status==='contracted').map(s=>{
    const broker=byBroker.get(s.brokerId),rate=Number(s.commissionRate??broker?.defaultCommissionRate??0);
    return {saleId:s.id,brokerId:s.brokerId,rate,commissionCents:Math.round(Number(s.salePriceCents||0)*rate)};
  });
  return {salesCount:(commercial.sales||[]).length,contractedCents:(commercial.sales||[]).filter(s=>s.status==='contracted').reduce((sum,s)=>sum+Number(s.salePriceCents||0),0),commissionCents:commissions.reduce((s,c)=>s+c.commissionCents,0),commissions};
}
