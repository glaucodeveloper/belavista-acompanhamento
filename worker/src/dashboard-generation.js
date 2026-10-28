import {loadOperationalConfiguration} from './github-store.js';
import {getPlanningState,listAgendaEvents} from './storage.js';

const DEFAULT_WORKERS_MODEL='@cf/meta/llama-3.1-8b-instruct-fp8';
const asArray=value=>Array.isArray(value)?value:[];
const text=(value,max=1200)=>String(value??'').trim().slice(0,max);
const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const unwrap=value=>value&&typeof value==='object'&&'data'in value?value.data:value;
const listText=(...groups)=>[...new Set(groups.flatMap(asArray).map(item=>typeof item==='string'?text(item,180):text(item?.label||item?.description,180)).filter(Boolean))];
const listIds=(...groups)=>[...new Set(groups.flatMap(asArray).map(String).filter(Boolean))];

function configuredStages(configuration,state){
  const stageConfig=unwrap(configuration?.stages)||{};
  const stateConfig=unwrap(configuration?.state)||{};
  const catalog=asArray(stageConfig.stages).length?stageConfig:stateConfig;
  const activityState=new Map(asArray(stateConfig.activities).map(activity=>[String(activity.id),activity]));
  const stageState=new Map(asArray(stateConfig.stages).map(stage=>[String(stage.id||stage.key||stage.name),stage]));
  return asArray(catalog.stages).map((stage,index)=>{
    const id=String(stage.id||stage.key||`stage-${index+1}`);
    const currentStage=stageState.get(id)||{};
    const activities=asArray(stage.activities).map((activity,activityIndex)=>{
      const activityId=String(activity.id||`${id}-activity-${activityIndex+1}`);
      const current=activityState.get(activityId)||{};
      return {
        id:activityId,stageId:id,title:text(activity.title||activity.name||activity.activity,180),
        description:text(activity.executionDescription||activity.description||activity.details,700),
        requirements:[...asArray(activity.requirements),...asArray(activity.entryCriteria)].map(item=>typeof item==='string'?text(item,180):text(item?.label||item?.description,180)).filter(Boolean),
        peculiarities:asArray(activity.peculiarities).map(item=>text(item,180)).filter(Boolean),
        evidenceRequirements:[...asArray(activity.evidenceRequirements),...asArray(activity.requiredEvidence)].map(item=>typeof item==='string'?text(item,180):text(item?.label||item?.description,180)).filter(Boolean),
        dependencies:[...asArray(activity.dependsOn),...asArray(activity.dependencies)].map(String),
        durationDays:number(activity.durationDays),durationMinutes:number(activity.durationMinutes),
        status:text(current.status||activity.status||'planejada',80),
        owner:text(current.owner||activity.owner||activity.responsible||'',120),
        materials:asArray(activity.materials||activity.materialRequirements).map(material=>typeof material==='string'
          ?{name:text(material,160),quantity:null,unit:'',materialId:''}
          :{name:text(material?.name||material?.materialName||material?.title,160),quantity:number(material?.quantity),unit:text(material?.unit,40),materialId:text(material?.materialId||material?.id,120)}).filter(material=>material.name)
      };
    });
    return {
      id,name:text(currentStage.name||stage.name||stage.title||stage.key,180),
      description:text(currentStage.executionDescription||currentStage.description||stage.executionDescription||stage.description,900),
      status:text(currentStage.status||stage.status||'planejada',80),
      peculiarities:listText(currentStage.peculiarities,stage.peculiarities),
      requirements:listText(currentStage.requirements,stage.requirements,currentStage.entryCriteria,stage.entryCriteria),
      evidenceRequirements:listText(currentStage.evidenceRequirements,stage.evidenceRequirements,currentStage.requiredEvidence,stage.requiredEvidence),
      dependencies:listIds(currentStage.dependsOn,currentStage.dependencies,stage.dependsOn,stage.dependencies),
      activities
    };
  });
}

function materialPlan(stages,state,planning){
  const requirements=new Map();
  const add=(item,stageId,stageName,activityId,activityName,source)=>{
    const name=text(item?.materialName||item?.name||item?.title,160);
    if(!name)return;
    const unit=text(item?.unit||item?.unitName,40);
    const key=[activityId,normalize(name),normalize(unit)].join('|');
    const candidate={
      key,stageId,stageName,activityId,activityName,name,unit,
      quantity:number(item?.quantity??item?.plannedQuantity),source
    };
    const current=requirements.get(key);
    if(!current||source==='requisito persistido')requirements.set(key,candidate);
  };
  for(const stage of stages)for(const activity of stage.activities)for(const material of activity.materials)
    add(material,stage.id,stage.name,activity.id,activity.title,'modelo da atividade');
  for(const requirement of asArray(planning?.materialRequirements)){
    const stage=stages.find(item=>item.activities.some(activity=>String(activity.id)===String(requirement.activityId)));
    const activity=stage?.activities.find(item=>String(item.id)===String(requirement.activityId));
    add(requirement,stage?.id||'',requirement.stageName||stage?.name||'',requirement.activityId||'',activity?.title||requirement.activityTitle||'', 'requisito persistido');
  }

  const inventory=new Map();
  const balanceKey=(name,unit)=>`${normalize(name)}|${normalize(unit)}`;
  for(const movement of asArray(planning?.inventoryMovements)){
    const key=balanceKey(movement.materialName,movement.unit);
    const direction=['saida','reserva','consumo'].includes(normalize(movement.kind))?-1:1;
    inventory.set(key,(inventory.get(key)||0)+direction*(number(movement.quantity)||0));
  }
  const hasInventoryLedger=asArray(planning?.inventoryMovements).length>0;
  if(!hasInventoryLedger){
    for(const material of asArray(state?.materials)){
      const key=balanceKey(material.name||material.materialName,material.unit);
      const balance=Math.max(0,(number(material.receivedQuantity)||0)-(number(material.usedQuantity)||0));
      inventory.set(key,(inventory.get(key)||0)+balance);
    }
  }
  const ordered=new Map();
  for(const purchase of asArray(planning?.purchaseRequests)){
    if(!['suggested','approved','ordered','partial'].includes(normalize(purchase.status)))continue;
    const key=balanceKey(purchase.materialName,purchase.unit);
    ordered.set(key,(ordered.get(key)||0)+(number(purchase.quantity)||0));
  }
  const groups=new Map();
  for(const item of requirements.values()){
    const key=balanceKey(item.name,item.unit);
    if(!groups.has(key))groups.set(key,{key,name:item.name,unit:item.unit,items:[],plannedQuantity:0,quantityKnown:true});
    const group=groups.get(key);
    group.items.push(item);
    if(item.quantity===null)group.quantityKnown=false;
    else group.plannedQuantity+=Math.max(0,item.quantity);
  }
  return [...groups.values()].map(group=>{
    const stockQuantity=Math.max(0,inventory.get(group.key)||0);
    const orderedQuantity=Math.max(0,ordered.get(group.key)||0);
    const suggestedPurchaseQuantity=group.quantityKnown
      ?Math.max(0,Math.round((group.plannedQuantity-stockQuantity-orderedQuantity)*1000)/1000)
      :null;
    const items=group.items;
    return {
      name:group.name,unit:group.unit,plannedQuantity:group.quantityKnown?Math.round(group.plannedQuantity*1000)/1000:null,
      stockQuantity,orderedQuantity,suggestedPurchaseQuantity,
      activityIds:[...new Set(items.map(item=>item.activityId).filter(Boolean))],
      stageNames:[...new Set(items.map(item=>item.stageName).filter(Boolean))],
      source:[...new Set(items.map(item=>item.source))].join(' · '),
      rationale:''
    };
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

function parseJsonResult(result){
  if(result&&typeof result==='object'&&!Array.isArray(result)){
    const candidate=result.response??result.text??result;
    if(candidate&&typeof candidate==='object'&&!Array.isArray(candidate))return candidate;
    result=candidate;
  }
  const source=String(result||'').trim();
  const candidates=[source,source.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1],source.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean);
  for(const candidate of candidates){try{return JSON.parse(candidate);}catch{}}
  throw Object.assign(new Error('Cloudflare Workers AI não retornou um JSON válido para o plano.'),{statusCode:502});
}

function validIsoDate(value){
  const candidate=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate)&&Number.isFinite(Date.parse(`${candidate}T12:00:00Z`))?candidate:'';
}

export async function generateDashboardPlanWithCloudflareAi(env,{kind='complete'}={}){
  if(!['agenda','materials','complete'].includes(kind))throw Object.assign(new Error('Tipo de geração inválido.'),{statusCode:400});
  if(!env.AI?.run)throw Object.assign(new Error('O binding Cloudflare Workers AI não está disponível.'),{statusCode:503});
  const [configuration,planning,agenda]=await Promise.all([
    loadOperationalConfiguration(env),
    getPlanningState(env).catch(()=>({materialRequirements:[],inventoryMovements:[],purchaseRequests:[],activities:[]})),
    listAgendaEvents(env).catch(()=>[])
  ]);
  const state=unwrap(configuration?.state)||{};
  const stages=configuredStages(configuration,state);
  if(!stages.length)throw Object.assign(new Error('Cadastre etapas e atividades antes de gerar o plano.'),{statusCode:422});
  const materials=materialPlan(stages,state,planning);
  const model=String(env.WORKERS_AI_MODEL||DEFAULT_WORKERS_MODEL);
  const today=new Date().toISOString().slice(0,10);
  const context={
    today,kind,
    project:{id:text(unwrap(configuration?.stages)?.projectId||state.project?.id,120),name:text(state.project?.name||'Aliança Park',160)},
    stages:stages.map(stage=>({...stage,activities:stage.activities.map(({materials:_materials,...activity})=>activity)})),
    currentAgenda:asArray(agenda).slice(0,100).map(item=>({id:item.id,stage:item.stage||item.stageName,title:item.title,date:item.date,time:item.time,status:item.status,relation:item.relation})),
    materialNeeds:materials.map(({key,...item})=>item)
  };
  const focus=kind==='agenda'
    ?'Gere a sequência de agenda, dependências, duração e datas sugeridas para as atividades executáveis.'
    :kind==='materials'
      ?'Revise as necessidades de materiais por etapa e atividade; explique os itens a comprar sem mudar nenhuma quantidade da lista fornecida.'
      :'Gere agenda sugerida e revise as necessidades de compra, sem alterar os fatos do catálogo.';
  const prompt=`Você planeja operações de uma obra pelo catálogo oficial de etapas e atividades.
${focus}
Regras obrigatórias: use IDs existentes; respeite dependências, peculiaridades, requisitos e evidências; não programe atividade concluída; use duração conhecida; não invente responsável, material, quantidade, preço ou estoque; não altere os dados fornecidos. Data é apenas sugestão para revisão humana. Se faltar duração ou pré-condição, deixe a data vazia e explique o bloqueio. Não crie nem grave compromissos ou pedidos.
Responda somente JSON neste formato: {"summary":"resumo curto","schedule":[{"activityId":"id existente","proposedStartDate":"AAAA-MM-DD ou vazio","proposedEndDate":"AAAA-MM-DD ou vazio","owner":"somente responsável existente ou vazio","rationale":"motivo curto"}],"blocked":[{"activityId":"id existente","reason":"pendência concreta"}],"materialRationales":[{"name":"nome exato fornecido","rationale":"motivo curto"}]}
Dados operacionais: ${JSON.stringify(context)}`;
  let raw;
  try{
    raw=await env.AI.run(model,{
      messages:[
        {role:'system',content:'Você é o planejador operacional Aliança Park. Use somente o modelo e fatos fornecidos. Retorne JSON curto em português do Brasil.'},
        {role:'user',content:prompt}
      ],
      max_tokens:3500,temperature:0.1,response_format:{type:'json_object'}
    });
  }catch(error){
    throw Object.assign(new Error(`Cloudflare Workers AI falhou: ${text(error?.message||error,240)}`),{statusCode:502});
  }
  const parsed=parseJsonResult(raw);
  const stageById=new Map(stages.map(stage=>[stage.id,stage]));
  const activityById=new Map(stages.flatMap(stage=>stage.activities.map(activity=>[activity.id,{...activity,stageName:stage.name}])));
  const scheduled=new Set();
  const schedule=asArray(parsed.schedule).flatMap(item=>{
    const id=String(item?.activityId||item?.activity_id||'');
    const activity=activityById.get(id);
    if(!activity||scheduled.has(id)||/^(completed|concluido|concluida|finalizado|finalizada)$/.test(normalize(activity.status)))return [];
    scheduled.add(id);
    const stage=stageById.get(activity.stageId);
    return [{
      activityId:id,stageId:activity.stageId,stageName:stage?.name||activity.stageName,activityName:activity.title,
      proposedStartDate:validIsoDate(item?.proposedStartDate||item?.startDate),
      proposedEndDate:validIsoDate(item?.proposedEndDate||item?.endDate),
      owner:activity.owner&&String(item?.owner||'')===activity.owner?activity.owner:'',
      rationale:text(item?.rationale||item?.reason,400)
    }];
  });
  const blocked=asArray(parsed.blocked).flatMap(item=>{
    const activity=activityById.get(String(item?.activityId||''));
    return activity?[{activityId:activity.id,stageName:activity.stageName,activityName:activity.title,reason:text(item?.reason||item?.rationale,400)}]:[];
  });
  const reasons=new Map(asArray(parsed.materialRationales).map(item=>[normalize(item?.name),text(item?.rationale,400)]));
  const materialOutput=materials.map(item=>({...item,rationale:reasons.get(normalize(item.name))||''}));
  return {
    kind,summary:text(parsed.summary,600)||'Plano preliminar gerado a partir do catálogo operacional.',
    schedule:kind==='materials'?[]:schedule,
    blocked:kind==='materials'?[]:blocked,
    materials:kind==='agenda'?[]:materialOutput,
    generatedAt:new Date().toISOString(),
    persisted:false,
    inference:{provider:'cloudflare-workers-ai',model},
    source:'Catálogo de etapas e atividades + dados operacionais persistidos'
  };
}
