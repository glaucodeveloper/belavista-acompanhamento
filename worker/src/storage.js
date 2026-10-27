const now=()=>new Date().toISOString();

function required(binding,name){
  if(!binding)throw new Error(`${name} não configurado no Worker.`);
  return binding;
}

function text(value,fallback=''){
  return String(value??fallback).trim();
}

function mapAreaValue(input={}){
  const value=input.mapArea|| (Array.isArray(input.partIds)&&input.partIds.length?{partIds:input.partIds}:null);
  if(!value)return '';
  if(typeof value==='string')return value.trim();
  try{return JSON.stringify(value);}catch{return '';}
}

function recordPropertiesValue(input={},fallback='[]'){
  if(input.properties===undefined)return text(fallback,'[]');
  let value=input.properties;
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{value=[];}}
  if(!Array.isArray(value))value=[];
  return JSON.stringify(value.slice(0,40));
}

function hydrateRecord(row){
  if(!row)return row;
  let properties=[];
  try{properties=JSON.parse(row.propertiesJson||'[]');}catch{}
  return {...row,properties};
}

function int(value,fallback=0){
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.round(parsed):fallback;
}

function real(value,fallback=0){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:fallback;
}

async function all(env,sql,...params){
  const db=required(env.BELAVISTA_DB,'BELAVISTA_DB');
  return (await db.prepare(sql).bind(...params).all()).results||[];
}

async function first(env,sql,...params){
  const db=required(env.BELAVISTA_DB,'BELAVISTA_DB');
  return await db.prepare(sql).bind(...params).first();
}

async function run(env,sql,...params){
  const db=required(env.BELAVISTA_DB,'BELAVISTA_DB');
  return db.prepare(sql).bind(...params).run();
}

function createId(prefix){
  const stamp=Date.now().toString(36).toUpperCase();
  const random=Math.random().toString(36).slice(2,8).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

export function getApiRuntime(env,origin){
  const nvidiaConfigured=Boolean(env.NVIDIA_API_KEY||env.NVIDIA_NIM_API_KEY);
  const aiProvider=nvidiaConfigured?'nvidia-api':env.WORKERS_AI_MODEL?'workers-ai':'deterministic';
  return {
    origin,
    apiBase:origin,
    ai:{
      provider:aiProvider,
      model:nvidiaConfigured?(env.NVIDIA_MODEL||env.NVIDIA_NIM_MODEL||'google/diffusiongemma-26b-a4b-it'):(env.WORKERS_AI_MODEL||'deterministic'),
      visionModel:env.NVIDIA_VISION_MODEL||env.NVIDIA_VLM_MODEL||'meta/llama-3.2-90b-vision-instruct',
      reasoningVisionModel:env.NVIDIA_REASONING_VISION_MODEL||env.NVIDIA_REASONING_VLM_MODEL||'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      reasoningVisionEndpoint:env.NVIDIA_REASONING_API_URL||env.NVIDIA_API_URL||env.NVIDIA_NIM_API_URL||'https://integrate.api.nvidia.com/v1/chat/completions',
      attachmentStorage:(env.BELAVISTA_MEDIA||env.BELAVISTA_UPLOADS)?'cloudflare-r2':'not-configured',
      supportsVision:nvidiaConfigured,
      supportsImageReasoning:nvidiaConfigured,
      explainMode:'?explain=1'
    }
  };
}

export async function listRecords(env){
  return (await all(env,`SELECT id,project_id AS projectId,stage_name AS etapa,activity_name AS atividade,record_date AS data,record_time AS hora,responsible_name AS responsavel,details AS detalhes,status,evidence_url AS evidenceUri,map_area AS mapArea,properties_json AS propertiesJson,created_at AS createdAt,updated_at AS updatedAt FROM records ORDER BY record_date DESC,record_time DESC,created_at DESC`)).map(hydrateRecord);
}

export async function insertRecord(env,input={}){
  const id=text(input.id)||createId('REG');
  const createdAt=now();
  await run(env,`INSERT INTO records (id,project_id,stage_name,activity_name,record_date,record_time,responsible_name,details,status,evidence_url,map_area,properties_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    text(input.projectId,'belavista'),
    text(input.etapa||input.stage,'Drenagem Pluvial'),
    text(input.atividade||input.activity,'Executar rede de drenagem'),
    text(input.data,input.recordDate||createdAt.slice(0,10)),
    text(input.hora,input.recordTime||createdAt.slice(11,16)),
    text(input.responsavel||input.responsible,'A definir'),
    text(input.detalhes||input.details,''),
    text(input.status,'Pendente'),
    text(input.evidenceUri||input.evidenceUrl,''),
    mapAreaValue(input),
    recordPropertiesValue(input),
    createdAt,
    createdAt
  );
  return hydrateRecord(await first(env,`SELECT id,project_id AS projectId,stage_name AS etapa,activity_name AS atividade,record_date AS data,record_time AS hora,responsible_name AS responsavel,details AS detalhes,status,evidence_url AS evidenceUri,map_area AS mapArea,properties_json AS propertiesJson,created_at AS createdAt,updated_at AS updatedAt FROM records WHERE id=?`,id));
}

export async function updateRecord(env,id,input={}){
  const current=await first(env,`SELECT * FROM records WHERE id=?`,id);
  if(!current)throw new Error('Registro não encontrado.');
  const updatedAt=now();
  await run(env,`UPDATE records SET project_id=?,stage_name=?,activity_name=?,record_date=?,record_time=?,responsible_name=?,details=?,status=?,evidence_url=?,map_area=?,properties_json=?,updated_at=? WHERE id=?`,
    text(input.projectId,current.project_id),
    text(input.etapa||input.stage,current.stage_name),
    text(input.atividade||input.activity,current.activity_name),
    text(input.data||input.recordDate,current.record_date),
    text(input.hora||input.recordTime,current.record_time),
    text(input.responsavel||input.responsible,current.responsible_name),
    text(input.detalhes||input.details,current.details),
    text(input.status,current.status),
    text(input.evidenceUri||input.evidenceUrl,current.evidence_url),
    mapAreaValue(input)||text(current.map_area),
    recordPropertiesValue(input,current.properties_json),
    updatedAt,
    id
  );
  return hydrateRecord(await first(env,`SELECT id,project_id AS projectId,stage_name AS etapa,activity_name AS atividade,record_date AS data,record_time AS hora,responsible_name AS responsavel,details AS detalhes,status,evidence_url AS evidenceUri,map_area AS mapArea,properties_json AS propertiesJson,created_at AS createdAt,updated_at AS updatedAt FROM records WHERE id=?`,id));
}

export async function deleteRecord(env,id){
  const current=await first(env,`SELECT id FROM records WHERE id=?`,id);
  if(!current)return false;
  const result=await run(env,`DELETE FROM records WHERE id=?`,id);
  return Boolean(result.success);
}

export async function listCashFlowEntries(env){
  return all(env,`SELECT id,kind,stage_name AS stage,date,category,description,amount_cents AS amountCents,created_at AS createdAt FROM cash_flow_entries ORDER BY date DESC,created_at DESC`);
}

export async function insertCashFlowEntry(env,input={}){
  const id=text(input.id)||createId('CASH');
  const createdAt=now();
  await run(env,`INSERT INTO cash_flow_entries (id,kind,stage_name,date,category,description,amount_cents,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    id,
    text(input.kind,'saida'),
    text(input.stage,'Geral'),
    text(input.date,createdAt.slice(0,10)),
    text(input.category,'Operação'),
    text(input.description,''),
    int(input.amountCents||input.amount,0),
    createdAt
  );
  return first(env,`SELECT id,kind,stage_name AS stage,date,category,description,amount_cents AS amountCents,created_at AS createdAt FROM cash_flow_entries WHERE id=?`,id);
}

export async function listBudgetLines(env){
  return all(env,`SELECT id,stage_name AS stage,description,quantity,unit,unit_cost_cents AS unitCostCents,total_cost_cents AS totalCostCents,status,created_at AS createdAt FROM budget_lines ORDER BY created_at DESC`);
}

export async function insertBudgetLine(env,input={}){
  const id=text(input.id)||createId('BUD');
  const quantity=real(input.quantity,0);
  const unitCostCents=int(input.unitCostCents||input.unitCost,0);
  const totalCostCents=int(input.totalCostCents,Math.round(quantity*unitCostCents));
  const createdAt=now();
  await run(env,`INSERT INTO budget_lines (id,stage_name,description,quantity,unit,unit_cost_cents,total_cost_cents,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    id,
    text(input.stage,'Geral'),
    text(input.description,'Linha orçamentária'),
    quantity,
    text(input.unit,'un'),
    unitCostCents,
    totalCostCents,
    text(input.status,'planejado'),
    createdAt
  );
  return first(env,`SELECT id,stage_name AS stage,description,quantity,unit,unit_cost_cents AS unitCostCents,total_cost_cents AS totalCostCents,status,created_at AS createdAt FROM budget_lines WHERE id=?`,id);
}

export async function listStageAgendaItems(env){
  return all(env,`SELECT id,stage_name AS stage,title,date,time,owner,relation,status,created_at AS createdAt FROM stage_agenda_items ORDER BY date DESC,time DESC,created_at DESC`);
}

export async function insertStageAgendaItem(env,input={}){
  const id=text(input.id)||createId('AGD');
  const createdAt=now();
  await run(env,`INSERT INTO stage_agenda_items (id,stage_name,title,date,time,owner,relation,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    id,
    text(input.stage,'Geral'),
    text(input.title,'Novo afazer'),
    text(input.date,createdAt.slice(0,10)),
    text(input.time,'08:00'),
    text(input.owner,'A definir'),
    text(input.relation,'operacional'),
    text(input.status,'planejado'),
    createdAt
  );
  return first(env,`SELECT id,stage_name AS stage,title,date,time,owner,relation,status,created_at AS createdAt FROM stage_agenda_items WHERE id=?`,id);
}

const agendaSelect=`SELECT id,source_type AS sourceType,source_id AS sourceId,title,
  stage_key AS stageKey,stage_name AS stageName,activity_id AS activityId,
  activity_name AS activityName,owner,event_date AS date,start_time AS start,
  duration_hours AS durationHours,span_days AS spanDays,status,
  related_from AS relatedFrom,notes,material_ids_json AS materialIdsJson,
  agenda_metadata_json AS agendaMetadataJson,user_edited AS userEdited,hidden,updated_at AS updatedAt FROM agenda_events`;

function agendaEvent(row){
  let materialIds=[];
  let metadata={};
  try{materialIds=JSON.parse(row.materialIdsJson||'[]');}catch{}
  try{metadata=JSON.parse(row.agendaMetadataJson||'{}');}catch{}
  const {materialIdsJson,agendaMetadataJson,hidden,userEdited,...rest}=row;
  return {...rest,...(metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata:{}),materialIds:Array.isArray(materialIds)?materialIds:[],userEdited:Boolean(userEdited)};
}

export async function listAgendaEvents(env){
  return (await all(env,`${agendaSelect} WHERE hidden=0 ORDER BY event_date,start_time,id`)).map(agendaEvent);
}

function normalizeAgendaMetadata(input){
  const list=value=>Array.isArray(value)?value.map(item=>text(item).trim().slice(0,240)).filter(Boolean).slice(0,100):String(value||'').split(/\r?\n/).map(item=>item.trim().slice(0,240)).filter(Boolean).slice(0,100);
  const offset=Number(input?.notificationOffsetMinutes??30);
  return {
    requirements:list(input?.requirements),materials:list(input?.materials),
    customStatus:text(input?.customStatus).slice(0,120),
    cancellationReason:text(input?.cancellationReason).slice(0,1000),
    cancelledAt:text(input?.cancelledAt).slice(0,40),
    cancellationConfirmed:input?.cancellationConfirmed===true,
    notificationOffsetMinutes:Number.isFinite(offset)?Math.max(0,Math.min(1440,Math.round(offset))):30,
  };
}

function normalizeAgendaEvent(input){
  const id=text(input?.id).slice(0,160);
  const title=text(input?.title).slice(0,240);
  const date=text(input?.date);
  const start=text(input?.start,'08:00');
  const durationHours=Number(input?.durationHours??1);
  const spanDays=Number(input?.spanDays??1);
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)
    &&!Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    &&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
  if(!/^[a-zA-Z0-9_-]+$/.test(id)||!title||!validDate
      ||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)
      ||!Number.isFinite(durationHours)||durationHours<0.5||durationHours>24
      ||!Number.isInteger(spanDays)||spanDays<1||spanDays>366){
    throw Object.assign(new Error('Compromisso inválido: título, data, horário e duração são obrigatórios.'),{statusCode:400});
  }
  return {
    id,title,stageKey:text(input.stageKey).slice(0,160),stageName:text(input.stageName).slice(0,160),
    activityId:text(input.activityId).slice(0,160),activityName:text(input.activityName).slice(0,240),
    owner:text(input.owner).slice(0,160),date,start,durationHours,spanDays,
    status:text(input.status,'Planejado').slice(0,80),relatedFrom:text(input.relatedFrom).slice(0,160),
    notes:text(input.notes).slice(0,2000),
    materialIdsJson:JSON.stringify(Array.isArray(input.materialIds)
      ?input.materialIds.map(value=>text(value).slice(0,160)).slice(0,100):[]),
    agendaMetadataJson:JSON.stringify(normalizeAgendaMetadata(input))
  };
}

export async function saveAgendaSnapshot(env,events){
  if(!Array.isArray(events)||events.length>10000){
    throw Object.assign(new Error('Lista da agenda inválida.'),{statusCode:400});
  }
  const normalized=events.map(normalizeAgendaEvent);
  if(new Set(normalized.map(item=>item.id)).size!==normalized.length){
    throw Object.assign(new Error('IDs duplicados na agenda.'),{statusCode:400});
  }
  const db=required(env.BELAVISTA_DB,'BELAVISTA_DB');
  const current=await all(env,agendaSelect);
  const byId=new Map(current.map(row=>[row.id,row]));
  const inputById=new Map(events.map(input=>[text(input?.id).slice(0,160),input]));
  const selected=new Set(normalized.map(item=>item.id));
  const statements=[];
  for(const item of normalized){
    const previous=byId.get(item.id);
    if(previous){
      let previousMetadata={},nextMetadata=JSON.parse(item.agendaMetadataJson||'{}');
      try{previousMetadata=JSON.parse(previous.agendaMetadataJson||'{}');}catch{}
      const raw=inputById.get(item.id)||{};
      for(const key of ['requirements','materials','customStatus','cancellationReason','cancelledAt','cancellationConfirmed','notificationOffsetMinutes']){
        if(!Object.prototype.hasOwnProperty.call(raw,key)&&Object.prototype.hasOwnProperty.call(previousMetadata,key))nextMetadata[key]=previousMetadata[key];
      }
      item.agendaMetadataJson=JSON.stringify(nextMetadata);
      if(!previous.hidden&&Object.entries(item).every(([key,value])=>previous[key]===value))continue;
      statements.push(db.prepare(`UPDATE agenda_events SET title=?,stage_key=?,stage_name=?,
        activity_id=?,activity_name=?,owner=?,event_date=?,start_time=?,duration_hours=?,
        span_days=?,status=?,related_from=?,notes=?,material_ids_json=?,agenda_metadata_json=?,user_edited=1,
        hidden=0,updated_at=? WHERE id=?`).bind(
        item.title,item.stageKey,item.stageName,item.activityId,item.activityName,item.owner,
        item.date,item.start,item.durationHours,item.spanDays,item.status,item.relatedFrom,
        item.notes,item.materialIdsJson,item.agendaMetadataJson,now(),item.id));
    }else{
      statements.push(db.prepare(`INSERT INTO agenda_events(id,source_type,title,stage_key,stage_name,
        activity_id,activity_name,owner,event_date,start_time,duration_hours,span_days,status,
        related_from,notes,material_ids_json,agenda_metadata_json,user_edited,updated_at)
        VALUES(?,'manual',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`).bind(
        item.id,item.title,item.stageKey,item.stageName,item.activityId,item.activityName,
        item.owner,item.date,item.start,item.durationHours,item.spanDays,item.status,
        item.relatedFrom,item.notes,item.materialIdsJson,item.agendaMetadataJson,now()));
    }
  }
  for(const previous of current){
    if(previous.hidden||selected.has(previous.id))continue;
    if(previous.sourceType==='manual'){
      statements.push(db.prepare('DELETE FROM agenda_events WHERE id=?').bind(previous.id));
    }else{
      statements.push(db.prepare(`UPDATE agenda_events SET hidden=1,user_edited=1,updated_at=? WHERE id=?`).bind(now(),previous.id));
    }
  }
  if(statements.length)await db.batch(statements);
  return listAgendaEvents(env);
}

export async function listNotifications(env){
  const rows=await all(env,`SELECT id,category,severity,title,message,entity_type AS entityType,entity_id AS entityId,metadata_json AS metadata,created_at AS createdAt FROM notifications ORDER BY created_at DESC LIMIT 50`);
  return rows.map(row=>{
    try{return {...row,metadata:JSON.parse(row.metadata||'{}')};}catch{return {...row,metadata:{}};}
  });
}

export async function insertNotification(env,input={}){
  const id=text(input.id)||createId('NTF');
  const createdAt=now();
  await run(env,`INSERT OR REPLACE INTO notifications (id,category,severity,title,message,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    id,
    text(input.category,'operational'),
    text(input.severity,'info'),
    text(input.title,'Notificação operacional'),
    text(input.message,''),
    text(input.entityType,'system'),
    text(input.entityId,''),
    JSON.stringify(input.metadata||{}),
    createdAt
  );
  return id;
}

export async function getOperationalSnapshot(env){
  const [records,cash,budget,agenda,notifications]=await Promise.all([
    listRecords(env),
    listCashFlowEntries(env),
    listBudgetLines(env),
    listAgendaEvents(env),
    listNotifications(env)
  ]);
  return {
    recordsCount:records.length,
    agendaCount:agenda.length,
    notificationsCount:notifications.length,
    budgetSummary:{
      plannedCents:budget.reduce((sum,item)=>sum+int(item.totalCostCents),0),
      realizedCents:cash.filter(item=>item.kind==='saida').reduce((sum,item)=>sum+int(item.amountCents),0),
      entriesCents:cash.filter(item=>item.kind==='entrada').reduce((sum,item)=>sum+int(item.amountCents),0)
    },
    latestRecord:records[0]||null,
    criticalStages:buildStageFlags(records,budget,cash)
  };
}

export async function listProjects(env){
  return all(env,`SELECT id,name,priority,reserve_cents AS reserveCents,status,created_at AS createdAt,updated_at AS updatedAt FROM projects ORDER BY priority DESC,name`);
}

export async function insertProject(env,input={}){
  const id=text(input.id)||createId('PRJ');
  const createdAt=now();
  await run(env,`INSERT INTO projects (id,name,priority,reserve_cents,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
    id,text(input.name,'Nova obra'),int(input.priority,3),int(input.reserveCents,0),text(input.status,'active'),createdAt,createdAt);
  return first(env,`SELECT id,name,priority,reserve_cents AS reserveCents,status,created_at AS createdAt,updated_at AS updatedAt FROM projects WHERE id=?`,id);
}

export async function listActivities(env){
  return all(env,`SELECT id,project_id AS projectId,stage_name AS stageName,title,planned_start AS plannedStart,planned_end AS plannedEnd,owner,priority,critical,status,decision_status AS decisionStatus,created_at AS createdAt,updated_at AS updatedAt FROM activities ORDER BY planned_end,priority DESC`);
}

export async function insertActivity(env,input={}){
  const id=text(input.id)||createId('ACT');
  const createdAt=now();
  await run(env,`INSERT INTO activities (id,project_id,stage_name,title,planned_start,planned_end,owner,priority,critical,status,decision_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,text(input.projectId,'belavista'),text(input.stageName||input.stage,'Geral'),text(input.title,'Nova atividade'),text(input.plannedStart,''),text(input.plannedEnd,''),text(input.owner,'A definir'),int(input.priority,3),input.critical?1:0,text(input.status,'planned'),text(input.decisionStatus,'pending'),createdAt,createdAt);
  return first(env,`SELECT id,project_id AS projectId,stage_name AS stageName,title,planned_start AS plannedStart,planned_end AS plannedEnd,owner,priority,critical,status,decision_status AS decisionStatus,created_at AS createdAt,updated_at AS updatedAt FROM activities WHERE id=?`,id);
}

export async function updateActivityDecision(env,id,decisionStatus){
  await run(env,`UPDATE activities SET decision_status=?,updated_at=? WHERE id=?`,text(decisionStatus,'pending'),now(),id);
}

export async function listActivityDependencies(env){
  return all(env,`SELECT activity_id AS activityId,depends_on_activity_id AS dependsOnActivityId FROM activity_dependencies`);
}

export async function insertActivityDependency(env,input={}){
  await run(env,`INSERT OR IGNORE INTO activity_dependencies (activity_id,depends_on_activity_id) VALUES (?,?)`,text(input.activityId),text(input.dependsOnActivityId));
  return {activityId:text(input.activityId),dependsOnActivityId:text(input.dependsOnActivityId)};
}

export async function listMaterialRequirements(env){
  return all(env,`SELECT id,project_id AS projectId,activity_id AS activityId,stage_name AS stageName,material_name AS materialName,quantity,unit,unit_cost_cents AS unitCostCents,needed_by AS neededBy,lead_time_days AS leadTimeDays,status,created_at AS createdAt,updated_at AS updatedAt FROM material_requirements ORDER BY needed_by,created_at`);
}

export async function insertMaterialRequirement(env,input={}){
  const id=text(input.id)||createId('REQ');
  const createdAt=now();
  await run(env,`INSERT INTO material_requirements (id,project_id,activity_id,stage_name,material_name,quantity,unit,unit_cost_cents,needed_by,lead_time_days,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,text(input.projectId,'belavista'),text(input.activityId),text(input.stageName||input.stage,'Geral'),text(input.materialName||input.name),real(input.quantity),text(input.unit,'un'),int(input.unitCostCents),text(input.neededBy,createdAt.slice(0,10)),int(input.leadTimeDays),text(input.status,'planned'),createdAt,createdAt);
  return first(env,`SELECT id,project_id AS projectId,activity_id AS activityId,stage_name AS stageName,material_name AS materialName,quantity,unit,unit_cost_cents AS unitCostCents,needed_by AS neededBy,lead_time_days AS leadTimeDays,status,created_at AS createdAt,updated_at AS updatedAt FROM material_requirements WHERE id=?`,id);
}

export async function listInventoryMovements(env){
  return all(env,`SELECT id,project_id AS projectId,material_name AS materialName,unit,kind,quantity,occurred_at AS occurredAt,source_type AS sourceType,source_id AS sourceId,notes,created_at AS createdAt FROM inventory_movements ORDER BY occurred_at DESC,created_at DESC`);
}

export async function insertInventoryMovement(env,input={}){
  const id=text(input.id)||createId('INV');
  const createdAt=now();
  await run(env,`INSERT OR IGNORE INTO inventory_movements (id,project_id,material_name,unit,kind,quantity,occurred_at,source_type,source_id,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id,text(input.projectId,'belavista'),text(input.materialName||input.name),text(input.unit,'un'),text(input.kind,'entrada'),real(input.quantity),text(input.occurredAt,createdAt),text(input.sourceType,''),text(input.sourceId,''),text(input.notes,''),createdAt);
  return first(env,`SELECT id,project_id AS projectId,material_name AS materialName,unit,kind,quantity,occurred_at AS occurredAt,source_type AS sourceType,source_id AS sourceId,notes,created_at AS createdAt FROM inventory_movements WHERE id=?`,id);
}

export async function listCashForecasts(env){
  return all(env,`SELECT id,project_id AS projectId,kind,date,amount_cents AS amountCents,confidence,status,description,created_at AS createdAt FROM cash_forecasts ORDER BY date,created_at`);
}

export async function insertCashForecast(env,input={}){
  const id=text(input.id)||createId('FCST');
  const createdAt=now();
  await run(env,`INSERT INTO cash_forecasts (id,project_id,kind,date,amount_cents,confidence,status,description,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    id,text(input.projectId,''),text(input.kind,'entrada'),text(input.date,createdAt.slice(0,10)),int(input.amountCents),real(input.confidence,1),text(input.status,'expected'),text(input.description,''),createdAt);
  return first(env,`SELECT id,project_id AS projectId,kind,date,amount_cents AS amountCents,confidence,status,description,created_at AS createdAt FROM cash_forecasts WHERE id=?`,id);
}

export async function listPurchaseRequests(env){
  return all(env,`SELECT id,project_id AS projectId,activity_id AS activityId,requirement_id AS requirementId,material_name AS materialName,quantity,unit,unit_cost_cents AS unitCostCents,total_cost_cents AS totalCostCents,needed_by AS neededBy,status,rationale,decision_run_id AS decisionRunId,created_at AS createdAt,updated_at AS updatedAt FROM purchase_requests ORDER BY needed_by,created_at DESC`);
}

export async function upsertPurchaseRequest(env,input={}){
  const id=text(input.id)||`BUY-${text(input.requirementId)}`;
  const current=await first(env,`SELECT status,created_at FROM purchase_requests WHERE id=?`,id);
  if(current&&!['suggested','partial','paused_cash'].includes(current.status))return first(env,`SELECT id,project_id AS projectId,activity_id AS activityId,requirement_id AS requirementId,material_name AS materialName,quantity,unit,unit_cost_cents AS unitCostCents,total_cost_cents AS totalCostCents,needed_by AS neededBy,status,rationale,decision_run_id AS decisionRunId,created_at AS createdAt,updated_at AS updatedAt FROM purchase_requests WHERE id=?`,id);
  const updatedAt=now();
  await run(env,`INSERT INTO purchase_requests (id,project_id,activity_id,requirement_id,material_name,quantity,unit,unit_cost_cents,total_cost_cents,needed_by,status,rationale,decision_run_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity,total_cost_cents=excluded.total_cost_cents,needed_by=excluded.needed_by,status=excluded.status,rationale=excluded.rationale,decision_run_id=excluded.decision_run_id,updated_at=excluded.updated_at`,
    id,text(input.projectId),text(input.activityId),text(input.requirementId),text(input.materialName),real(input.quantity),text(input.unit,'un'),int(input.unitCostCents),int(input.totalCostCents),text(input.neededBy,updatedAt.slice(0,10)),text(input.status,'suggested'),text(input.rationale,''),text(input.decisionRunId,''),current?.created_at||updatedAt,updatedAt);
  return first(env,`SELECT id,project_id AS projectId,activity_id AS activityId,requirement_id AS requirementId,material_name AS materialName,quantity,unit,unit_cost_cents AS unitCostCents,total_cost_cents AS totalCostCents,needed_by AS neededBy,status,rationale,decision_run_id AS decisionRunId,created_at AS createdAt,updated_at AS updatedAt FROM purchase_requests WHERE id=?`,id);
}

export async function updatePurchaseRequestStatus(env,id,status){
  const current=await first(env,`SELECT id FROM purchase_requests WHERE id=?`,id);
  if(!current)return null;
  await run(env,`UPDATE purchase_requests SET status=?,updated_at=? WHERE id=?`,text(status),now(),id);
  return first(env,`SELECT id,project_id AS projectId,activity_id AS activityId,requirement_id AS requirementId,material_name AS materialName,quantity,unit,unit_cost_cents AS unitCostCents,total_cost_cents AS totalCostCents,needed_by AS neededBy,status,rationale,decision_run_id AS decisionRunId,created_at AS createdAt,updated_at AS updatedAt FROM purchase_requests WHERE id=?`,id);
}

export async function upsertStageAgendaItem(env,input={}){
  const id=text(input.id)||createId('AGD');
  const createdAt=now();
  await run(env,`INSERT INTO stage_agenda_items (id,stage_name,title,date,time,owner,relation,status,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET stage_name=excluded.stage_name,title=excluded.title,date=excluded.date,time=excluded.time,owner=excluded.owner,relation=excluded.relation,status=excluded.status`,
    id,text(input.stage,'Geral'),text(input.title,'Novo afazer'),text(input.date,createdAt.slice(0,10)),text(input.time,'08:00'),text(input.owner,'A definir'),text(input.relation,'operational'),text(input.status,'planejado'),createdAt);
  return id;
}

export async function insertDecisionRun(env,input={}){
  const id=text(input.id)||createId('PLAN');
  const createdAt=now();
  await run(env,`INSERT INTO decision_runs (id,trigger,cash_state,available_cents,reserve_cents,material_need_cents,allocated_cents,plan_json,ai_explanation_json,ai_provider,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id,text(input.trigger,'manual'),text(input.cashState,'red'),int(input.availableCents),int(input.reserveCents),int(input.materialNeedCents),int(input.allocatedCents),JSON.stringify(input.plan||{}),JSON.stringify(input.aiExplanation||{}),text(input.aiProvider,'deterministic'),createdAt);
  return {id,createdAt};
}

export async function getLatestDecisionRun(env){
  const row=await first(env,`SELECT id,trigger,cash_state AS cashState,available_cents AS availableCents,reserve_cents AS reserveCents,material_need_cents AS materialNeedCents,allocated_cents AS allocatedCents,plan_json AS plan,ai_explanation_json AS aiExplanation,ai_provider AS aiProvider,created_at AS createdAt FROM decision_runs ORDER BY created_at DESC LIMIT 1`);
  if(!row)return null;
  return {...row,plan:JSON.parse(row.plan||'{}'),aiExplanation:JSON.parse(row.aiExplanation||'{}')};
}

export async function insertEvidenceDigest(env,input={}){
  const id=text(input.id)||createId('EVD');
  const createdAt=now();
  await run(env,`INSERT INTO evidence_digests (id,kind,entity_id,media_key,status,digest_json,provider,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    id,text(input.kind),text(input.entityId,''),text(input.mediaKey,''),text(input.status,'review_required'),JSON.stringify(input.digest||{}),text(input.provider,'deterministic'),createdAt);
  return {id,createdAt,status:text(input.status,'review_required')};
}

export async function getPlanningState(env){
  const [projects,activities,dependencies,materialRequirements,inventoryMovements,cashForecasts,cashEntries,purchaseRequests]=await Promise.all([
    listProjects(env),listActivities(env),listActivityDependencies(env),listMaterialRequirements(env),listInventoryMovements(env),listCashForecasts(env),listCashFlowEntries(env),listPurchaseRequests(env)
  ]);
  return {projects,activities,dependencies,materialRequirements,inventoryMovements,cashForecasts,cashEntries,purchaseRequests};
}

function buildStageFlags(records,budget,cash){
  const stages=new Map();
  for(const item of [...records,...budget,...cash]){
    const name=text(item.etapa||item.stage,'Geral');
    if(!stages.has(name))stages.set(name,{stage:name,records:0,budgetCents:0,spentCents:0,status:'normal'});
    const row=stages.get(name);
    if(item.etapa||item.stage)row.records+=item.id?.startsWith('REG')?1:0;
    if(item.totalCostCents)row.budgetCents+=int(item.totalCostCents);
    if(item.amountCents&&item.kind==='saida')row.spentCents+=int(item.amountCents);
    if(row.spentCents>row.budgetCents&&row.budgetCents>0)row.status='attention';
  }
  return [...stages.values()];
}
