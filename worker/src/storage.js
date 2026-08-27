const now=()=>new Date().toISOString();

function required(binding,name){
  if(!binding)throw new Error(`${name} não configurado no Worker.`);
  return binding;
}

function text(value,fallback=''){
  return String(value??fallback).trim();
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
  const aiProvider=env.WORKERS_AI_MODEL?'workers-ai+nvidia':env.NVIDIA_NIM_API_KEY?'nvidia-nim':'deterministic';
  return {
    origin,
    apiBase:origin,
    ai:{
      provider:aiProvider,
      model:env.WORKERS_AI_MODEL||env.NVIDIA_NIM_MODEL||'deterministic',
      supportsVision:Boolean(env.NVIDIA_NIM_API_KEY),
      explainMode:'?explain=1'
    }
  };
}

export async function listRecords(env){
  return all(env,`SELECT id,project_id AS projectId,stage_name AS etapa,activity_name AS atividade,record_date AS data,record_time AS hora,responsible_name AS responsavel,details AS detalhes,status,evidence_url AS evidenceUri,created_at AS createdAt,updated_at AS updatedAt FROM records ORDER BY record_date DESC,record_time DESC,created_at DESC`);
}

export async function insertRecord(env,input={}){
  const id=text(input.id)||createId('REG');
  const createdAt=now();
  await run(env,`INSERT INTO records (id,project_id,stage_name,activity_name,record_date,record_time,responsible_name,details,status,evidence_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    createdAt,
    createdAt
  );
  return first(env,`SELECT id,project_id AS projectId,stage_name AS etapa,activity_name AS atividade,record_date AS data,record_time AS hora,responsible_name AS responsavel,details AS detalhes,status,evidence_url AS evidenceUri,created_at AS createdAt,updated_at AS updatedAt FROM records WHERE id=?`,id);
}

export async function updateRecord(env,id,input={}){
  const current=await first(env,`SELECT * FROM records WHERE id=?`,id);
  if(!current)throw new Error('Registro não encontrado.');
  const updatedAt=now();
  await run(env,`UPDATE records SET project_id=?,stage_name=?,activity_name=?,record_date=?,record_time=?,responsible_name=?,details=?,status=?,evidence_url=?,updated_at=? WHERE id=?`,
    text(input.projectId,current.project_id),
    text(input.etapa||input.stage,current.stage_name),
    text(input.atividade||input.activity,current.activity_name),
    text(input.data||input.recordDate,current.record_date),
    text(input.hora||input.recordTime,current.record_time),
    text(input.responsavel||input.responsible,current.responsible_name),
    text(input.detalhes||input.details,current.details),
    text(input.status,current.status),
    text(input.evidenceUri||input.evidenceUrl,current.evidence_url),
    updatedAt,
    id
  );
  return first(env,`SELECT id,project_id AS projectId,stage_name AS etapa,activity_name AS atividade,record_date AS data,record_time AS hora,responsible_name AS responsavel,details AS detalhes,status,evidence_url AS evidenceUri,created_at AS createdAt,updated_at AS updatedAt FROM records WHERE id=?`,id);
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

export async function listNotifications(env){
  return all(env,`SELECT id,category,severity,title,message,entity_type AS entityType,entity_id AS entityId,metadata_json AS metadata,created_at AS createdAt FROM notifications ORDER BY created_at DESC LIMIT 50`);
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
    listStageAgendaItems(env),
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
