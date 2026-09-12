import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const appRoot=fileURLToPath(new URL('.',import.meta.url));
const dataRoot=process.env.BELAVISTA_DATA_ROOT||join(appRoot,'data');
const dbPath=process.env.BELAVISTA_DB||join(dataRoot,'belavista.sqlite');
const receiptsRoot=process.env.BELAVISTA_RECEIPTS_ROOT||join(dataRoot,'receipts');
const salesRoot=process.env.BELAVISTA_SALES_ROOT||join(dataRoot,'sales');
const outsourcingRoot=process.env.BELAVISTA_OUTSOURCING_ROOT||join(dataRoot,'outsourcing');
const workbenchAttachmentsRoot=process.env.BELAVISTA_WORKBENCH_ATTACHMENTS_ROOT||join(dataRoot,'workbench-attachments');
mkdirSync(dirname(dbPath),{recursive:true});
mkdirSync(receiptsRoot,{recursive:true});
mkdirSync(salesRoot,{recursive:true});
mkdirSync(outsourcingRoot,{recursive:true});
mkdirSync(workbenchAttachmentsRoot,{recursive:true});

export const db=new DatabaseSync(dbPath);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    phase TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planejado',
    progress INTEGER NOT NULL DEFAULT 0,
    week TEXT,
    owner TEXT,
    UNIQUE(project_id,name)
  );
  CREATE TABLE IF NOT EXISTS collaborators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    specialty TEXT,
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    progress INTEGER NOT NULL DEFAULT 0,
    owner_id TEXT REFERENCES collaborators(id) ON DELETE SET NULL,
    planned_start TEXT,
    planned_end TEXT,
    properties_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    planned_quantity REAL NOT NULL DEFAULT 0,
    received_quantity REAL NOT NULL DEFAULT 0,
    used_quantity REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'bom'
  );
  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    supplier TEXT NOT NULL,
    description TEXT NOT NULL,
    stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
    value_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendente',
    expected_date TEXT,
    delay TEXT
  );
  CREATE TABLE IF NOT EXISTS purchase_receipts (
    id TEXT PRIMARY KEY,
    purchase_id TEXT,
    supplier TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER NOT NULL DEFAULT 0,
    document_number TEXT,
    issue_date TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS commercial_sales (
    id TEXT PRIMARY KEY,
    lot TEXT NOT NULL DEFAULT '',
    client TEXT NOT NULL DEFAULT '',
    client_phone TEXT NOT NULL DEFAULT '',
    broker TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Reserva',
    value_cents INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS commercial_sale_files (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES commercial_sales(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'attachment',
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cash_flow_entries (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('entrada','saida')),
    category TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS commission_reasons (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    share_percent REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS outsourcing_receipts (
    id TEXT PRIMARY KEY,
    contractor TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT '',
    service TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER NOT NULL DEFAULT 0,
    issue_date TEXT,
    document_number TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lot TEXT,
    objective TEXT,
    budget TEXT,
    status TEXT,
    phone TEXT,
    email TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lead_messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
    channel TEXT NOT NULL DEFAULT 'internal',
    body TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Atendimento',
    created_at TEXT NOT NULL,
    FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON lead_messages(lead_id,created_at);
  CREATE TABLE IF NOT EXISTS desktop_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS instagram_contacts (
    instagram_user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL DEFAULT '',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_instagram_contacts_lead ON instagram_contacts(lead_id);
  CREATE TABLE IF NOT EXISTS instagram_message_receipts (
    external_message_id TEXT PRIMARY KEY,
    instagram_user_id TEXT NOT NULL REFERENCES instagram_contacts(instagram_user_id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    lead_message_id TEXT NOT NULL REFERENCES lead_messages(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
    received_at TEXT NOT NULL,
    raw_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_instagram_receipts_lead ON instagram_message_receipts(lead_id,received_at);
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
    activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,
    record_date TEXT NOT NULL,
    record_time TEXT NOT NULL,
    responsible_id TEXT REFERENCES collaborators(id) ON DELETE SET NULL,
    responsible_name TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pendente',
    evidence_uri TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    to_activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'depende de',
    UNIQUE(from_activity_id,to_activity_id)
  );
  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS project_state (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    operational_state_cleared INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_records_project_date ON records(project_id,record_date DESC,record_time DESC);
  CREATE INDEX IF NOT EXISTS idx_records_activity ON records(activity_id);
  CREATE INDEX IF NOT EXISTS idx_activities_stage ON activities(stage_id);
  CREATE INDEX IF NOT EXISTS idx_purchase_receipts_date ON purchase_receipts(issue_date DESC,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_purchase_receipts_purchase ON purchase_receipts(purchase_id);
  CREATE INDEX IF NOT EXISTS idx_commercial_sales_created ON commercial_sales(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_commercial_sales_broker ON commercial_sales(broker);
  CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON cash_flow_entries(entry_date DESC,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_outsourcing_date ON outsourcing_receipts(issue_date DESC,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_commercial_sale_files_sale ON commercial_sale_files(sale_id);
  CREATE TABLE IF NOT EXISTS stage_ai_config (
    stage_id INTEGER PRIMARY KEY REFERENCES stages(id) ON DELETE CASCADE,
    ai_requirements_json TEXT NOT NULL DEFAULT '[]',
    ai_conditions_json TEXT NOT NULL DEFAULT '[]',
    execution_profile_json TEXT NOT NULL DEFAULT '{}',
    notification_targets_json TEXT NOT NULL DEFAULT '{}',
    procurement_focus_json TEXT NOT NULL DEFAULT '[]',
    evidence_focus_json TEXT NOT NULL DEFAULT '[]',
    request_hints_json TEXT NOT NULL DEFAULT '[]',
    typical_description TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS stage_workbench_state (
    stage_key TEXT PRIMARY KEY,
    layout_json TEXT NOT NULL DEFAULT '{}',
    links_json TEXT NOT NULL DEFAULT '[]',
    activity_locations_json TEXT NOT NULL DEFAULT '{}',
    input_sessions_json TEXT NOT NULL DEFAULT '[]',
    calendar_date TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS workbench_diary (
    id TEXT PRIMARY KEY,
    stage_key TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    record_date TEXT NOT NULL,
    responsible TEXT NOT NULL,
    production REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'registrado',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS workbench_attachments (
    id TEXT PRIMARY KEY,
    stage_key TEXT NOT NULL,
    activity_id TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'evidence',
    title TEXT NOT NULL,
    issuer TEXT NOT NULL DEFAULT '',
    document_date TEXT,
    expires_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_workbench_diary_activity ON workbench_diary(stage_key,activity_id,record_date DESC);
  CREATE INDEX IF NOT EXISTS idx_workbench_attachments_stage ON workbench_attachments(stage_key,activity_id,created_at DESC);
`);

try { db.exec(`ALTER TABLE records ADD COLUMN map_area TEXT`); } catch {}
try { db.exec(`ALTER TABLE stage_workbench_state ADD COLUMN activity_locations_json TEXT NOT NULL DEFAULT '{}'`); } catch {}
try { db.exec(`ALTER TABLE stage_workbench_state ADD COLUMN input_sessions_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE stage_workbench_state ADD COLUMN calendar_date TEXT`); } catch {}

const now=()=>new Date().toISOString();
const commissionReasonSeed=[
  ['signal','Sinal','Comissão vinculada ao recebimento do sinal/entrada.',40],
  ['intermediate','Parcela intermediária','Comissão vinculada a parcela intermediária prevista no plano.',30],
  ['monthly','Mensal','Comissão distribuída nas parcelas mensais recebidas.',30]
];
for(const [id,label,description,share] of commissionReasonSeed){
  db.prepare(`INSERT OR IGNORE INTO commission_reasons(id,label,description,share_percent,active,updated_at) VALUES(?,?,?,?,1,?)`).run(id,label,description,share,now());
}
const cashFlowSeedRows=[
  ['CX-001','2026-08-01','entrada','Vendas','Geral','Recebimentos comerciais',31200000],
  ['CX-002','2026-08-05','saida','Obra','Drenagem Pluvial','Medição e materiais de drenagem',11800000],
  ['CX-003','2026-08-10','saida','Obra','Rede de Água','Reserva de materiais hidráulicos',8200000],
  ['CX-004','2026-08-18','saida','Obra','Rede Elétrica','Sinal de postes e cabos',6400000]
];
for(const row of cashFlowSeedRows)db.prepare(`INSERT OR IGNORE INTO cash_flow_entries(id,entry_date,kind,category,stage,description,amount_cents,created_at) VALUES(?,?,?,?,?,?,?,?)`).run(...row,now());
const materialSeedRows=[
  ['mat-earth-dump','Caçambas','viagem',1365,920,860,'bom'],
  ['mat-drain-pipes','Manilhas Ø600/800/1000 mm','m',800,540,430,'atencao'],
  ['mat-drain-inlets','Bocas de lobo','un',49,32,18,'atencao'],
  ['mat-water-pead','Tubos PEAD','m',2980,1480,900,'atencao'],
  ['mat-water-cavaletes','Cavaletes','un',298,122,64,'critico'],
  ['mat-water-ramais','Ramais','un',298,88,40,'critico'],
  ['mat-curb-precast','Meio-fio pré-moldado','m',8000,2400,1100,'atencao'],
  ['mat-pave-stones','Paralelepípedo','un',1512000,420000,120000,'critico'],
  ['mat-elec-poles','Postes','un',120,48,16,'atencao'],
  ['mat-elec-cables','Cabos elétricos','m',3600,1100,1250,'atencao']
];
for(const row of materialSeedRows)db.prepare(`INSERT OR IGNORE INTO materials(id,name,unit,planned_quantity,received_quantity,used_quantity,status) VALUES(?,?,?,?,?,?,?)`).run(...row);

const projectId='project-alianca-park';
const seed=()=>{
  const timestamp=now();
  db.prepare(`INSERT OR IGNORE INTO projects(id,name,city,phase,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(projectId,'Aliança Park','Senador Canedo, GO','Fase 01',timestamp,timestamp);
  db.prepare(`INSERT OR IGNORE INTO project_state(project_id,operational_state_cleared,updated_at) VALUES(?,?,?)`).run(projectId,0,timestamp);
  const stages=[
    [7,'Projeto executivo','andamento',72,'Prioridade','Engenharia / Projetos'],
    [1,'Terraplanagem','andamento',68,'Frente 01','Equipe Terraplanagem'],
    [2,'Drenagem Pluvial','andamento',42,'Frente 02','Carlos Mendes'],
    [4,'Rede de Água','planejado',12,'Antes da pavimentação','João Pereira'],
    [8,'Meio-fio','planejado',0,'Infraestrutura final','Equipe Infra'],
    [5,'Rede Elétrica','prioridade',8,'Prioridade entre as frentes finais','Mariana Silva'],
    [3,'Pavimentação','planejado',0,'Última etapa após redes','Mariana Lopes'],
    [6,'Sinalização','planejado',0,'Pós-pavimentação','Equipe Infra']
  ];
  const insertStage=db.prepare(`INSERT OR IGNORE INTO stages(id,project_id,name,status,progress,week,owner) VALUES(?,?,?,?,?,?,?)`);
  for(const row of stages)insertStage.run(row[0],projectId,...row.slice(1));
  const purchaseSeedRows=[
    ['PE-2025-041','EletricSul Materiais','Poste de concreto 11m',5,4875000,'Atrasado','2026-08-24','8 dias'],
    ['PE-2025-040','HidroTubos Ltda','Tubo PEAD Ø600mm',4,3286000,'Atrasado','2026-08-22','5 dias'],
    ['PE-2025-039','ConcretaMix','Concreto FCK 25MPa (30m³)',3,2865000,'Em andamento','2026-08-30','—'],
    ['PE-2025-038','Luz & Cia','Cabo de alumínio 16mm',5,1542000,'Em andamento','2026-08-31','—'],
    ['PE-2025-042','Artefatos Goiás','Meio-fio pré-moldado',8,1960000,'Pendente','2026-09-03','—']
  ];
  for(const row of purchaseSeedRows)db.prepare(`INSERT OR IGNORE INTO purchases(id,supplier,description,stage_id,value_cents,status,expected_date,delay) VALUES(?,?,?,?,?,?,?,?)`).run(...row);
  const people=[
    ['collab-mariana','Mariana Silva','Engenharia Civil','Rede Elétrica',''],
    ['collab-joao','João Pereira','Encarregado','Terraplanagem',''],
    ['collab-carlos','Carlos Mendes','Engenharia','Drenagem',''],
    ['collab-paula','Paula Nascimento','Planejamento','Pavimentação','']
  ];
  const insertPerson=db.prepare(`INSERT OR IGNORE INTO collaborators(id,name,role,specialty,phone) VALUES(?,?,?,?,?)`);
  for(const row of people)insertPerson.run(...row);
  const cleared=Boolean(db.prepare(`SELECT operational_state_cleared AS cleared FROM project_state WHERE project_id=?`).get(projectId)?.cleared);
  if(cleared){
    db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(1,timestamp);
    db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(2,timestamp);
    return;
  }
  const activities=[
    ['activity-drenagem','Executar rede de drenagem',2,'Drenagem','andamento',82,'collab-carlos'],
    ['activity-pavimentacao','Executar base e pavimento',3,'Pavimentação','planejado',35,'collab-paula'],
    ['activity-rede-agua','Implantar rede de água',4,'Redes','planejado',20,'collab-joao'],
    ['activity-rede-eletrica','Implantar rede elétrica',5,'Redes','planejado',18,'collab-mariana']
  ];
  const insertActivity=db.prepare(`INSERT OR IGNORE INTO activities(id,name,stage_id,category,status,progress,owner_id) VALUES(?,?,?,?,?,?,?)`);
  for(const row of activities)insertActivity.run(row[0],row[1],row[2],row[3],row[4],row[5],row[6]);
  db.prepare(`INSERT OR IGNORE INTO activity_relations(from_activity_id,to_activity_id,label) VALUES(?,?,?)`).run('activity-pavimentacao','activity-drenagem','libera após');
  db.prepare(`INSERT OR IGNORE INTO activity_relations(from_activity_id,to_activity_id,label) VALUES(?,?,?)`).run('activity-rede-eletrica','activity-pavimentacao','depende de');
  const record=db.prepare(`SELECT id FROM records WHERE id=?`).get('REG-001');
  if(!record)db.prepare(`INSERT INTO records(id,project_id,stage_id,activity_id,record_date,record_time,responsible_id,responsible_name,details,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run('REG-001',projectId,2,'activity-drenagem','2024-06-06','08:30','collab-carlos','Carlos Mendes','Medição da rede principal','Pendente',timestamp,timestamp);
  db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(1,timestamp);
  db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(2,timestamp);
};
seed();

const recordSelect=`SELECT r.id,r.project_id AS projectId,r.stage_id AS stageId,r.activity_id AS activityId,
  p.name AS obra,s.name AS etapa,a.name AS atividade,r.record_date AS data,r.record_time AS hora,
  r.responsible_id AS responsibleId,r.responsible_name AS responsavel,r.details AS detalhes,
  r.status,r.evidence_uri AS evidenceUri,r.map_area AS mapArea,r.created_at AS createdAt,r.updated_at AS updatedAt
  FROM records r JOIN projects p ON p.id=r.project_id LEFT JOIN stages s ON s.id=r.stage_id
  LEFT JOIN activities a ON a.id=r.activity_id`;

const resolveIds=db.prepare(`SELECT p.id AS projectId,s.id AS stageId,a.id AS activityId,c.id AS responsibleId
  FROM projects p LEFT JOIN stages s ON s.project_id=p.id AND lower(s.name)=lower(?)
  LEFT JOIN activities a ON a.stage_id=s.id AND lower(a.name)=lower(?)
  LEFT JOIN collaborators c ON lower(c.name)=lower(?) WHERE lower(p.name)=lower(?) LIMIT 1`);
const fallbackActivityByStage=db.prepare(`SELECT a.id AS activityId
  FROM activities a
  WHERE a.stage_id=? AND (
    lower(a.category) LIKE '%execu%' OR
    lower(a.name) LIKE 'executar %' OR
    lower(a.name) LIKE '%implantar %'
  )
  ORDER BY
    CASE
      WHEN lower(a.category) LIKE '%execu%' THEN 0
      WHEN lower(a.name) LIKE 'executar %' THEN 1
      ELSE 2
    END,
    a.progress DESC,
    a.name
  LIMIT 1`);
const audit=db.prepare(`INSERT INTO audit_events(entity,entity_id,action,payload_json,created_at) VALUES(?,?,?,?,?)`);
const asText=(value,fallback='')=>String(value??fallback).trim();
const slug=(value,fallback='item')=>String(value??fallback).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||fallback;
const numeric=(value,fallback=0)=>{const normalized=String(value??'').replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,'');const amount=Number(normalized);return Number.isFinite(amount)?amount:fallback;};
const toRecordInput=(input,existing={})=>{
  const obra=asText(input.obra,existing.obra||'Aliança Park');
  const etapa=asText(input.etapa,existing.etapa||'Drenagem Pluvial');
  const atividade=asText(input.atividade,existing.atividade||'Drenagem Pluvial');
  const responsavel=asText(input.responsavel,existing.responsavel||'A definir');
  const ids=resolveIds.get(etapa,atividade,responsavel,obra)||{};
  const fallbackActivityId=ids.stageId&&!ids.activityId?fallbackActivityByStage.get(ids.stageId)?.activityId||null:null;
  // Depois de limpar o estado operacional, as atividades ainda podem estar
  // vazias. Registros gerais continuam válidos: a relação activity_id fica
  // nula até que a atividade seja criada, em vez de apontar para um ID órfão.
  return {projectId:ids.projectId||projectId,stageId:ids.stageId||existing.stageId||2,activityId:ids.activityId||fallbackActivityId||existing.activityId||null,responsibleId:ids.responsibleId||existing.responsibleId||null,obra,etapa,atividade,responsavel,data:asText(input.data,existing.data||new Date().toISOString().slice(0,10)),hora:asText(input.hora,existing.hora||'08:30'),detalhes:asText(input.detalhes,existing.detalhes||''),status:asText(input.status,existing.status||'Pendente'),evidenceUri:asText(input.evidenceUri,existing.evidenceUri||'')||null,mapArea:asText(input.mapArea,existing.mapArea||'')||null};
};


const receiptSelect=`SELECT id,purchase_id AS purchaseId,supplier,stage,amount_cents AS amountCents,
  document_number AS documentNumber,issue_date AS issueDate,file_name AS fileName,mime_type AS mimeType,
  notes,created_at AS createdAt FROM purchase_receipts`;
const safeReceiptName=(name='receipt')=>String(name||'receipt').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'receipt';
const receiptMimeExt=mime=>({'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[mime]||'');
export function listPurchaseReceipts(){return db.prepare(`${receiptSelect} ORDER BY COALESCE(issue_date,'') DESC,created_at DESC`).all().map(row=>({...row,fileUrl:`/api/purchase-receipts/${encodeURIComponent(row.id)}/file`}));}
export function listActivities(){
  return db.prepare(`SELECT a.id,a.stage_id AS stageId,a.category,a.name,a.status,a.progress,a.owner_id AS ownerId,a.planned_start AS plannedStart,a.planned_end AS plannedEnd,a.properties_json AS propertiesJson,c.name AS owner,s.name AS stage
    FROM activities a
    LEFT JOIN collaborators c ON c.id=a.owner_id
    LEFT JOIN stages s ON s.id=a.stage_id
    ORDER BY a.stage_id,a.name`).all().map(row=>({...row,properties:JSON.parse(row.propertiesJson||'{}')}));
}
export function listCollaborators(){
  return db.prepare(`SELECT id,name,role,specialty,phone,active FROM collaborators ORDER BY active DESC,name`).all().map(row=>({...row,active:Boolean(row.active)}));
}
export function listMaterials(){
  return db.prepare(`SELECT id,name,unit,planned_quantity AS plannedQuantity,received_quantity AS receivedQuantity,used_quantity AS usedQuantity,status FROM materials ORDER BY name`).all();
}
export function listPurchases(){
  return db.prepare(`SELECT p.id,p.supplier,p.description,s.name AS stage,p.value_cents AS valueCents,p.status,p.expected_date AS expectedDate,p.delay
    FROM purchases p
    LEFT JOIN stages s ON s.id=p.stage_id
    ORDER BY COALESCE(p.expected_date,''),p.id DESC`).all();
}
export function purchaseReceiptSummary(){
  const totals=db.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(amount_cents),0) AS totalCents,COUNT(DISTINCT NULLIF(TRIM(supplier),'')) AS suppliers,SUM(CASE WHEN purchase_id IS NULL OR TRIM(purchase_id)='' THEN 1 ELSE 0 END) AS unlinked FROM purchase_receipts`).get();
  const month=new Date().toISOString().slice(0,7);
  const currentMonthCents=db.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS value FROM purchase_receipts WHERE substr(COALESCE(issue_date,created_at),1,7)=?`).get(month)?.value||0;
  const byStage=db.prepare(`SELECT COALESCE(NULLIF(TRIM(stage),''),'Sem etapa') AS stage,COUNT(*) AS count,COALESCE(SUM(amount_cents),0) AS amountCents FROM purchase_receipts GROUP BY COALESCE(NULLIF(TRIM(stage),''),'Sem etapa') ORDER BY amountCents DESC,count DESC`).all();
  return {...totals,unlinked:Number(totals.unlinked)||0,currentMonthCents,byStage};
}
function materialStatusFromCoverage(received,planned){
  if(planned<=0)return 'bom';
  const ratio=received/Math.max(1,planned);
  return ratio>=0.75?'bom':ratio>=0.45?'atencao':'critico';
}
function applyReceiptMaterial(input={},receiptId,timestamp){
  const materialName=asText(input.materialName||input.material||input.item);
  const stageName=asText(input.stage);
  const quantity=Math.max(0,numeric(input.materialQuantity??input.quantity,0));
  const unit=asText(input.materialUnit||input.unit,'un');
  if(!materialName||!quantity)return null;
  const id=asText(input.materialId)||`mat-${slug(stageName||'geral')}-${slug(materialName)}`;
  const existing=db.prepare(`SELECT id,name,unit,planned_quantity AS plannedQuantity,received_quantity AS receivedQuantity,used_quantity AS usedQuantity,status FROM materials WHERE id=? OR lower(name)=lower(?) LIMIT 1`).get(id,materialName);
  if(existing){
    const planned=Math.max(Number(existing.plannedQuantity)||0, quantity);
    const received=(Number(existing.receivedQuantity)||0)+quantity;
    const nextStatus=materialStatusFromCoverage(received,planned);
    db.prepare(`UPDATE materials SET unit=?,planned_quantity=?,received_quantity=?,status=? WHERE id=?`).run(unit||existing.unit,planned,received,nextStatus,existing.id);
    audit.run('materials',existing.id,'receipt_added',JSON.stringify({receiptId,stage:stageName,quantity,unit,materialName}),timestamp);
    return db.prepare(`SELECT id,name,unit,planned_quantity AS plannedQuantity,received_quantity AS receivedQuantity,used_quantity AS usedQuantity,status FROM materials WHERE id=?`).get(existing.id);
  }
  const planned=Math.max(quantity, Math.round(quantity*1.4));
  const status=materialStatusFromCoverage(quantity,planned);
  db.prepare(`INSERT INTO materials(id,name,unit,planned_quantity,received_quantity,used_quantity,status) VALUES(?,?,?,?,?,?,?)`).run(id,materialName,unit,planned,quantity,0,status);
  audit.run('materials',id,'receipt_added',JSON.stringify({receiptId,stage:stageName,quantity,unit,materialName}),timestamp);
  return db.prepare(`SELECT id,name,unit,planned_quantity AS plannedQuantity,received_quantity AS receivedQuantity,used_quantity AS usedQuantity,status FROM materials WHERE id=?`).get(id);
}
export function createPurchaseReceipt(input={}){
  const dataUrl=String(input.dataUrl||'');
  const match=dataUrl.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match)throw new Error('Recibo deve ser PDF, JPG, PNG ou WEBP.');
  const bytes=Buffer.from(match[2],'base64');
  if(!bytes.length)throw new Error('Arquivo de recibo vazio.');
  if(bytes.length>12_000_000)throw new Error('Recibo excede o limite de 12 MB.');
  const id=asText(input.id)||`REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const mimeType=match[1],requested=safeReceiptName(input.fileName||'receipt'),ext=receiptMimeExt(mimeType),fileName=requested.toLowerCase().endsWith(ext)?requested:`${requested}${ext}`;
  const storageName=`${id}-${fileName}`,storagePath=join(receiptsRoot,storageName),timestamp=now();
  const amountCents=Math.max(0,Math.round(Number(input.amountCents)||0));
  writeFileSync(storagePath,bytes,{flag:'wx'});
  try{
    db.prepare(`INSERT INTO purchase_receipts(id,purchase_id,supplier,stage,amount_cents,document_number,issue_date,file_name,mime_type,storage_path,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id,asText(input.purchaseId)||null,asText(input.supplier),asText(input.stage),amountCents,asText(input.documentNumber)||null,asText(input.issueDate)||null,fileName,mimeType,storagePath,asText(input.notes),timestamp
    );
    const material=applyReceiptMaterial(input,id,timestamp);
    audit.run('purchase_receipts',id,'created',JSON.stringify({purchaseId:asText(input.purchaseId),supplier:asText(input.supplier),stage:asText(input.stage),amountCents,documentNumber:asText(input.documentNumber),issueDate:asText(input.issueDate),fileName,mimeType}),timestamp);
    if(material)audit.run('purchase_receipts',id,'material_propagated',JSON.stringify({materialId:material.id,materialName:material.name,receivedQuantity:material.receivedQuantity}),timestamp);
  }catch(error){try{unlinkSync(storagePath)}catch{} throw error;}
  return listPurchaseReceipts().find(row=>row.id===id);
}
export function getPurchaseReceiptFile(id){
  const row=db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,storage_path AS storagePath FROM purchase_receipts WHERE id=?`).get(id);
  if(!row||!existsSync(row.storagePath))return null;
  return row;
}
export function deletePurchaseReceipt(id){
  const row=db.prepare(`SELECT storage_path AS storagePath FROM purchase_receipts WHERE id=?`).get(id);if(!row)return false;
  db.prepare(`DELETE FROM purchase_receipts WHERE id=?`).run(id);try{if(row.storagePath&&existsSync(row.storagePath))unlinkSync(row.storagePath)}catch{}
  audit.run('purchase_receipts',id,'deleted','{}',now());return true;
}


const saleSelect=`SELECT id,lot,client,client_phone AS clientPhone,broker,status,value_cents AS valueCents,notes,created_at AS createdAt,updated_at AS updatedAt FROM commercial_sales`;
const safeSaleName=(name='arquivo')=>String(name||'arquivo').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'arquivo';
const saleMimeExt=mime=>({'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[mime]||'');
const saleFileRows=saleId=>db.prepare(`SELECT id,sale_id AS saleId,kind,file_name AS fileName,mime_type AS mimeType,created_at AS createdAt FROM commercial_sale_files WHERE sale_id=? ORDER BY created_at`).all(saleId).map(row=>({...row,fileUrl:`/api/commercial-sales/${encodeURIComponent(saleId)}/files/${encodeURIComponent(row.id)}`}));
export function listCommercialSales(){return db.prepare(`${saleSelect} ORDER BY created_at DESC`).all().map(row=>({...row,files:saleFileRows(row.id)}));}
export function createCommercialSale(input={}){
  const id=asText(input.id)||`VEN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,timestamp=now();
  const files=Array.isArray(input.files)?input.files.slice(0,8):[];
  const valueCents=Math.max(0,Math.round(Number(input.valueCents)||0));
  db.exec('BEGIN');
  const createdPaths=[];
  try{
    db.prepare(`INSERT INTO commercial_sales(id,lot,client,client_phone,broker,status,value_cents,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
      id,asText(input.lot),asText(input.client),asText(input.clientPhone),asText(input.broker),asText(input.status,'Reserva'),valueCents,asText(input.notes),timestamp,timestamp
    );
    let totalBytes=0;
    for(let index=0;index<files.length;index++){
      const file=files[index]||{},dataUrl=String(file.dataUrl||''),match=dataUrl.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if(!match)throw new Error('Anexos devem ser PDF, JPG, PNG ou WEBP.');
      const bytes=Buffer.from(match[2],'base64'); totalBytes+=bytes.length;
      if(!bytes.length)throw new Error('Arquivo de venda vazio.');
      if(bytes.length>12_000_000||totalBytes>30_000_000)throw new Error('Anexos da venda excedem o limite permitido.');
      const mimeType=match[1],requested=safeSaleName(file.fileName||`arquivo-${index+1}`),ext=saleMimeExt(mimeType),fileName=requested.toLowerCase().endsWith(ext)?requested:`${requested}${ext}`;
      const fileId=`ARQ-${Date.now().toString(36).toUpperCase()}-${index}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,storagePath=join(salesRoot,`${id}-${fileId}-${fileName}`);
      writeFileSync(storagePath,bytes,{flag:'wx'});createdPaths.push(storagePath);
      db.prepare(`INSERT INTO commercial_sale_files(id,sale_id,kind,file_name,mime_type,storage_path,created_at) VALUES(?,?,?,?,?,?,?)`).run(fileId,id,asText(file.kind,'attachment'),fileName,mimeType,storagePath,timestamp);
    }
    audit.run('commercial_sales',id,'created',JSON.stringify({lot:asText(input.lot),client:asText(input.client),broker:asText(input.broker),status:asText(input.status,'Reserva'),valueCents,files:files.length}),timestamp);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');for(const filePath of createdPaths)try{unlinkSync(filePath)}catch{}throw error;}
  return listCommercialSales().find(row=>row.id===id);
}
export function updateCommercialSale(id,input={}){
  const current=db.prepare(`${saleSelect} WHERE id=?`).get(asText(id));if(!current)return null;
  const status=asText(input.status,current.status),notes=asText(input.notes,current.notes),timestamp=now();
  db.prepare(`UPDATE commercial_sales SET status=?,notes=?,updated_at=? WHERE id=?`).run(status,notes,timestamp,asText(id));
  audit.run('commercial_sales',asText(id),'updated',JSON.stringify({status,documentValidation:Boolean(input.documentValidation)}),timestamp);
  return listCommercialSales().find(row=>row.id===asText(id));
}
export function getCommercialSaleFile(saleId,fileId){
  const row=db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,storage_path AS storagePath FROM commercial_sale_files WHERE sale_id=? AND id=?`).get(saleId,fileId);
  if(!row||!existsSync(row.storagePath))return null;
  return row;
}
export function deleteCommercialSale(id){
  const paths=db.prepare(`SELECT storage_path AS storagePath FROM commercial_sale_files WHERE sale_id=?`).all(id);
  const exists=db.prepare(`SELECT id FROM commercial_sales WHERE id=?`).get(id);if(!exists)return false;
  db.prepare(`DELETE FROM commercial_sales WHERE id=?`).run(id);for(const row of paths)try{if(row.storagePath&&existsSync(row.storagePath))unlinkSync(row.storagePath)}catch{}
  audit.run('commercial_sales',id,'deleted','{}',now());return true;
}


export function listCashFlowEntries(){
  return db.prepare(`SELECT id,entry_date AS date,kind,category,stage,description,amount_cents AS amountCents,created_at AS createdAt FROM cash_flow_entries ORDER BY entry_date DESC,created_at DESC`).all();
}
export function listLeadMessages(leadId){
  return db.prepare(`SELECT id,lead_id AS leadId,direction,channel,body,author,created_at AS createdAt FROM lead_messages WHERE lead_id=? ORDER BY created_at ASC`).all(asText(leadId));
}
export function createLeadMessage(input={}){
  const leadId=asText(input.leadId),body=asText(input.body);if(!leadId||!body)return null;
  const exists=db.prepare(`SELECT id FROM leads WHERE id=?`).get(leadId);if(!exists)return null;
  const id=asText(input.id)||`LM-${Date.now().toString(36).toUpperCase()}`,timestamp=now(),direction=asText(input.direction,'inbound')==='outbound'?'outbound':'inbound';
  db.prepare(`INSERT INTO lead_messages(id,lead_id,direction,channel,body,author,created_at) VALUES(?,?,?,?,?,?,?)`).run(id,leadId,direction,asText(input.channel,'internal'),body,asText(input.author,'Atendimento'),timestamp);
  audit.run('lead_messages',id,'created',JSON.stringify({leadId,direction,channel:asText(input.channel,'internal')}),timestamp);
  return db.prepare(`SELECT id,lead_id AS leadId,direction,channel,body,author,created_at AS createdAt FROM lead_messages WHERE id=?`).get(id);
}
const parseStoredObject=(value,fallback={})=>{try{const parsed=JSON.parse(String(value||''));return parsed&&typeof parsed==='object'?parsed:fallback;}catch{return fallback;}};
const cleanInstagramHandle=(value)=>asText(value).replace(/^@/,'').replace(/[^A-Za-z0-9._]/g,'').slice(0,80);
const selectInstagramLead=`SELECT l.id,l.name,l.lot,l.objective,l.budget,l.status,l.phone,l.email,l.created_at AS createdAt,c.instagram_user_id AS instagramUserId,c.username AS instagramUsername,c.thread_id AS threadId,c.first_seen_at AS firstSeenAt,c.last_seen_at AS lastSeenAt FROM leads l LEFT JOIN instagram_contacts c ON c.lead_id=l.id WHERE l.id=?`;
export function getDesktopSetup(){
  const row=db.prepare(`SELECT value_json AS valueJson,updated_at AS updatedAt FROM desktop_settings WHERE key='desktop.onboarding'`).get();
  if(!row)return {complete:false,owner:{name:'',email:'',role:'owner'},enterprise:{name:'Aliança Park'},instagram:{handle:'',consent:false,integration:'camofox-local',replyMode:'draft-approval'},updatedAt:null};
  return {...parseStoredObject(row.valueJson),updatedAt:row.updatedAt};
}
export function saveDesktopSetup(input={}){
  const ownerName=asText(input.ownerName).slice(0,120),ownerEmail=asText(input.ownerEmail).toLowerCase().slice(0,180),enterpriseName=asText(input.enterpriseName,'Aliança Park').slice(0,120),handle=cleanInstagramHandle(input.instagramHandle);
  if(ownerName.length<2)throw new Error('Informe o nome do responsável inicial.');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail))throw new Error('Informe um e-mail administrativo válido.');
  if(handle.length<2)throw new Error('Informe o @ do Instagram do empreendimento.');
  if(input.instagramConsent!==true)throw new Error('Confirme a autenticação manual da conta do Instagram.');
  const timestamp=now(),setup={complete:true,owner:{name:ownerName,email:ownerEmail,role:'owner'},enterprise:{name:enterpriseName},instagram:{handle,consent:true,integration:'camofox-local',replyMode:'draft-approval'},configuredAt:timestamp};
  db.prepare(`INSERT INTO desktop_settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).run('desktop.onboarding',JSON.stringify(setup),timestamp);
  audit.run('desktop_settings','desktop.onboarding','onboarding.saved',JSON.stringify({ownerEmail,handle}),timestamp);
  return {...setup,updatedAt:timestamp};
}
export function ingestInstagramDirect(input={}){
  const externalMessageId=asText(input.messageId||input.id).slice(0,180),instagramUserId=asText(input.senderId||input.instagramUserId).slice(0,180),body=asText(input.body).slice(0,4000),username=cleanInstagramHandle(input.username),name=asText(input.name||input.displayName).slice(0,160),threadId=asText(input.threadId).slice(0,180),direction=asText(input.direction,'inbound')==='outbound'?'outbound':'inbound';
  if(!externalMessageId||!instagramUserId||!body)throw new Error('Direct inválido: messageId, senderId e body são obrigatórios.');
  const existing=db.prepare(`SELECT lead_id AS leadId,lead_message_id AS messageId FROM instagram_message_receipts WHERE external_message_id=?`).get(externalMessageId);
  if(existing)return {deduplicated:true,lead:db.prepare(selectInstagramLead).get(existing.leadId),message:db.prepare(`SELECT id,lead_id AS leadId,direction,channel,body,author,created_at AS createdAt FROM lead_messages WHERE id=?`).get(existing.messageId)};
  const timestamp=now(),contact=db.prepare(`SELECT lead_id AS leadId FROM instagram_contacts WHERE instagram_user_id=?`).get(instagramUserId);
  let leadId=contact?.leadId;
  if(!leadId){
    leadId=`LEAD-IG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const leadName=name||username||'Novo contato do Instagram';
    db.prepare(`INSERT INTO leads(id,name,lot,objective,budget,status,phone,email,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).run(leadId,leadName,'','Interesse via Instagram Direct','','Novo','','',timestamp);
    db.prepare(`INSERT INTO instagram_contacts(instagram_user_id,username,name,lead_id,thread_id,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,?)`).run(instagramUserId,username,name,leadId,threadId,timestamp,timestamp);
  }else{
    db.prepare(`UPDATE instagram_contacts SET username=?,name=?,thread_id=?,last_seen_at=? WHERE instagram_user_id=?`).run(username,name,threadId,timestamp,instagramUserId);
  }
  const message=createLeadMessage({id:`LM-IG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,leadId,direction,channel:'instagram-direct',body,author:username?`@${username}`:'Instagram'});
  db.prepare(`INSERT INTO instagram_message_receipts(external_message_id,instagram_user_id,lead_id,lead_message_id,direction,received_at,raw_json) VALUES(?,?,?,?,?,?,?)`).run(externalMessageId,instagramUserId,leadId,message.id,direction,timestamp,JSON.stringify({threadId,username,name,body}).slice(0,10000));
  audit.run('instagram_directs',externalMessageId,'ingested',JSON.stringify({leadId,direction,instagramUserId}),timestamp);
  return {deduplicated:false,lead:db.prepare(selectInstagramLead).get(leadId),message};
}
export function getInstagramLeadReport(leadId){
  const lead=db.prepare(selectInstagramLead).get(asText(leadId));if(!lead)return null;
  const messages=listLeadMessages(lead.id),inbound=messages.filter(message=>message.direction==='inbound'),outbound=messages.filter(message=>message.direction==='outbound'),last=messages[messages.length-1]||null;
  return {lead,messages,summary:{channel:'instagram-direct',messageCount:messages.length,inboundCount:inbound.length,outboundCount:outbound.length,lastInteractionAt:last?.createdAt||lead.createdAt,status:lead.status||'Novo',requiresHumanApproval:true}};
}
export function listInstagramLeadReports(limit=50){
  const ids=db.prepare(`SELECT lead_id AS leadId,MAX(received_at) AS lastSeenAt FROM instagram_message_receipts GROUP BY lead_id ORDER BY lastSeenAt DESC LIMIT ?`).all(Math.max(1,Math.min(200,Number(limit)||50)));
  return ids.map(row=>getInstagramLeadReport(row.leadId)).filter(Boolean);
}
export function createCashFlowEntry(input={}){
  const id=asText(input.id)||`CX-${Date.now().toString(36).toUpperCase()}`,timestamp=now(),kind=asText(input.kind,'saida')==='entrada'?'entrada':'saida';
  const amountCents=Math.max(0,Math.round(Number(input.amountCents)||0));
  db.prepare(`INSERT INTO cash_flow_entries(id,entry_date,kind,category,stage,description,amount_cents,created_at) VALUES(?,?,?,?,?,?,?,?)`).run(id,asText(input.date,new Date().toISOString().slice(0,10)),kind,asText(input.category),asText(input.stage),asText(input.description),amountCents,timestamp);
  audit.run('cash_flow_entries',id,'created',JSON.stringify({kind,amountCents,stage:asText(input.stage)}),timestamp);
  return listCashFlowEntries().find(row=>row.id===id);
}
export function cashFlowSummary(){
  const totals=db.prepare(`SELECT COALESCE(SUM(CASE WHEN kind='entrada' THEN amount_cents ELSE 0 END),0) AS entries,COALESCE(SUM(CASE WHEN kind='saida' THEN amount_cents ELSE 0 END),0) AS exits FROM cash_flow_entries`).get();
  return {entriesCents:Number(totals.entries||0),exitsCents:Number(totals.exits||0),balanceCents:Number(totals.entries||0)-Number(totals.exits||0)};
}
export function listCommissionReasons(){return db.prepare(`SELECT id,label,description,share_percent AS sharePercent,active,updated_at AS updatedAt FROM commission_reasons ORDER BY CASE id WHEN 'signal' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'monthly' THEN 3 ELSE 4 END,label`).all().map(row=>({...row,active:Boolean(row.active)}));}
export function updateCommissionReason(id,input={}){
  const current=db.prepare(`SELECT * FROM commission_reasons WHERE id=?`).get(id);if(!current)return null;
  const label=asText(input.label,current.label),description=asText(input.description,current.description),share=Math.max(0,Math.min(100,Number(input.sharePercent??current.share_percent)||0)),active=input.active===undefined?current.active:(input.active?1:0),timestamp=now();
  db.prepare(`UPDATE commission_reasons SET label=?,description=?,share_percent=?,active=?,updated_at=? WHERE id=?`).run(label,description,share,active,timestamp,id);
  audit.run('commission_reasons',id,'updated',JSON.stringify({label,share,active:Boolean(active)}),timestamp);
  return listCommissionReasons().find(row=>row.id===id);
}
const safeOutsourcingName=(name='comprovante')=>String(name||'comprovante').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'comprovante';
export function listOutsourcingReceipts(){return db.prepare(`SELECT id,contractor,stage,service,amount_cents AS amountCents,issue_date AS issueDate,document_number AS documentNumber,file_name AS fileName,mime_type AS mimeType,notes,created_at AS createdAt FROM outsourcing_receipts ORDER BY COALESCE(issue_date,created_at) DESC`).all().map(row=>({...row,fileUrl:`/api/outsourcing-receipts/${encodeURIComponent(row.id)}/file`}));}
export function createOutsourcingReceipt(input={}){
  const id=asText(input.id)||`TER-${Date.now().toString(36).toUpperCase()}`,timestamp=now(),dataUrl=String(input.dataUrl||''),match=dataUrl.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match)throw Object.assign(new Error('Comprovante deve ser PDF, JPG, PNG ou WEBP.'),{statusCode:400});
  const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>12_000_000)throw Object.assign(new Error('Comprovante inválido ou maior que 12 MB.'),{statusCode:400});
  const mimeType=match[1],ext=({'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[mimeType]||''),base=safeOutsourcingName(input.fileName||`comprovante-${id}`),fileName=base.toLowerCase().endsWith(ext)?base:`${base}${ext}`,storagePath=join(outsourcingRoot,`${id}-${fileName}`);
  writeFileSync(storagePath,bytes,{flag:'wx'});
  db.prepare(`INSERT INTO outsourcing_receipts(id,contractor,stage,service,amount_cents,issue_date,document_number,file_name,mime_type,storage_path,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,asText(input.contractor),asText(input.stage),asText(input.service),Math.max(0,Math.round(Number(input.amountCents)||0)),asText(input.issueDate),asText(input.documentNumber),fileName,mimeType,storagePath,asText(input.notes),timestamp);
  audit.run('outsourcing_receipts',id,'created',JSON.stringify({contractor:asText(input.contractor),stage:asText(input.stage),service:asText(input.service)}),timestamp);
  return listOutsourcingReceipts().find(row=>row.id===id);
}
export function getOutsourcingReceiptFile(id){const row=db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,storage_path AS storagePath FROM outsourcing_receipts WHERE id=?`).get(id);return row&&existsSync(row.storagePath)?row:null;}

export function listRecords(){return db.prepare(`${recordSelect} ORDER BY r.record_date DESC,r.record_time DESC,r.created_at DESC`).all();}
export function getRecord(id){return db.prepare(`${recordSelect} WHERE r.id=?`).get(id);}
export function createRecord(input){
  const value=toRecordInput(input),id=asText(input.id)||`REG-${String(Date.now()).slice(-8)}`,timestamp=now();
  db.prepare(`INSERT INTO records(id,project_id,stage_id,activity_id,record_date,record_time,responsible_id,responsible_name,details,status,evidence_uri,map_area,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,value.projectId,value.stageId,value.activityId,value.data,value.hora,value.responsibleId,value.responsavel,value.detalhes,value.status,value.evidenceUri,value.mapArea,timestamp,timestamp);
  audit.run('records',id,'created',JSON.stringify(value),timestamp); return getRecord(id);
}
export function createFieldConfirmation(input={}){
  const rawServices=Array.isArray(input.services)?input.services:Array.isArray(input.servicos)?input.servicos:[];
  const services=rawServices.map(item=>asText(item)).filter(Boolean).slice(0,12);
  const actor=asText(input.responsavel,'Encarregado de obra');
  const confirmed=Boolean(input.confirmed);
  if(!confirmed)throw Object.assign(new Error('A confirmação do encarregado é obrigatória.'),{statusCode:400});
  if(!services.length)throw Object.assign(new Error('Selecione pelo menos um serviço acompanhado.'),{statusCode:400});
  const record=createRecord({...input,responsavel:actor,status:asText(input.status,'Concluído'),detalhes:[asText(input.detalhes),`Serviços confirmados: ${services.join(', ')}.`,`Confirmação operacional registrada por ${actor}.`].filter(Boolean).join('\n')});
  const propagated=[];
  if(record.activityId){
    const progress=Math.max(0,Math.min(100,Number(input.progresso??input.progress??100)||100));
    db.prepare(`UPDATE activities SET status=?,progress=MAX(progress,?) WHERE id=?`).run(progress>=100?'concluido':'andamento',progress,record.activityId);
    propagated.push({type:'activity',id:record.activityId,message:`Atualizou atividade para ${progress}%`});
    if(record.stageId){
      db.prepare(`UPDATE stages SET status=?,progress=MAX(progress,?) WHERE id=?`).run(progress>=100?'concluida':'execucao',progress,record.stageId);
      propagated.push({type:'stage',id:record.stageId,message:`Atualizou etapa para ${progress}%`});
    }
  }
  const stageName=asText(record.etapa).toLocaleLowerCase('pt-BR');
  if(/água|agua|drenagem/.test(stageName))propagated.push({type:'dependency',message:'IA notificou a checagem de liberação antes da pavimentação.'});
  if(/elétrica|eletrica/.test(stageName))propagated.push({type:'dependency',message:'IA registrou a dependência de ligação e requisitos Coelba.'});
  audit.run('field_confirmations',record.id,'confirmed_and_propagated',JSON.stringify({actor,services,propagated}),now());
  return {record,propagated};
}
export function updateRecord(id,input){
  const current=getRecord(id); if(!current)return null; const value=toRecordInput(input,current),timestamp=now();
  db.prepare(`UPDATE records SET project_id=?,stage_id=?,activity_id=?,record_date=?,record_time=?,responsible_id=?,responsible_name=?,details=?,status=?,evidence_uri=?,map_area=?,updated_at=? WHERE id=?`).run(value.projectId,value.stageId,value.activityId,value.data,value.hora,value.responsibleId,value.responsavel,value.detalhes,value.status,value.evidenceUri,value.mapArea,timestamp,id);
  audit.run('records',id,'updated',JSON.stringify(value),timestamp); return getRecord(id);
}
export function deleteRecord(id){const current=getRecord(id);if(!current)return false;db.prepare(`DELETE FROM records WHERE id=?`).run(id);audit.run('records',id,'deleted','{}',now());return true;}
export function clearOperationalState(){
  const timestamp=now();
  db.exec('BEGIN');
  try {
    db.prepare(`DELETE FROM records WHERE project_id=?`).run(projectId);
    db.exec(`DELETE FROM activity_relations; DELETE FROM activities;`);
    db.exec(`UPDATE materials SET planned_quantity=0,received_quantity=0,used_quantity=0,status='bom';`);
    db.prepare(`UPDATE stages SET status='planejado',progress=0 WHERE project_id=?`).run(projectId);
    db.prepare(`UPDATE project_state SET operational_state_cleared=1,updated_at=? WHERE project_id=?`).run(timestamp,projectId);
    audit.run('project',projectId,'operational_state_cleared',JSON.stringify({activities:true,records:true,materials:'zeroed',stages:'reset'}),timestamp);
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
  return health();
}
export function entitySummary(){
  const entities=['projects','stages','activities','collaborators','materials','purchases','purchase_receipts','commercial_sales','commercial_sale_files','cash_flow_entries','commission_reasons','outsourcing_receipts','leads','records','activity_relations','audit_events','workbench_attachments'];
  return Object.fromEntries(entities.map(name=>[name,db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get().count]));
}
export function health(){return {ok:true,database:'sqlite',path:dbPath,schemaVersion:db.prepare(`SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations`).get().version,entities:entitySummary()};}

export function getStageWorkbenchState(stageKey){
  const key=String(stageKey||'').trim().toLowerCase();
  const row=db.prepare(`SELECT stage_key AS stageKey,layout_json AS layoutJson,links_json AS linksJson,activity_locations_json AS activityLocationsJson,input_sessions_json AS inputSessionsJson,calendar_date AS calendarDate,updated_at AS updatedAt FROM stage_workbench_state WHERE stage_key=?`).get(key);
  return row?{stageKey:key,layout:safeJson(row.layoutJson,{}),links:safeJson(row.linksJson,[]),activityLocations:safeJson(row.activityLocationsJson,{}),inputSessions:safeJson(row.inputSessionsJson,[]),calendarDate:row.calendarDate||null,updatedAt:row.updatedAt}:{stageKey:key,layout:{},links:[],activityLocations:{},inputSessions:[],calendarDate:null,updatedAt:null};
}

export function saveStageWorkbenchState(stageKey,input={}){
  const key=String(stageKey||'').trim().toLowerCase();if(!key)throw Object.assign(new Error('Etapa inválida.'),{statusCode:400});
  const current=getStageWorkbenchState(key),layout=input.layout&&typeof input.layout==='object'?input.layout:current.layout,links=Array.isArray(input.links)?input.links:current.links,activityLocations=input.activityLocations&&typeof input.activityLocations==='object'?input.activityLocations:current.activityLocations,inputSessions=Array.isArray(input.inputSessions)?input.inputSessions:current.inputSessions,calendarDate=typeof input.calendarDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(input.calendarDate)?input.calendarDate:current.calendarDate,timestamp=now();
  db.prepare(`INSERT INTO stage_workbench_state(stage_key,layout_json,links_json,activity_locations_json,input_sessions_json,calendar_date,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(stage_key) DO UPDATE SET layout_json=excluded.layout_json,links_json=excluded.links_json,activity_locations_json=excluded.activity_locations_json,input_sessions_json=excluded.input_sessions_json,calendar_date=excluded.calendar_date,updated_at=excluded.updated_at`).run(key,JSON.stringify(layout),JSON.stringify(links),JSON.stringify(activityLocations),JSON.stringify(inputSessions),calendarDate,timestamp);
  audit.run('stage_workbench',key,'updated',JSON.stringify({layoutNodes:Object.keys(layout).length,links:links.length,locatedActivities:Object.keys(activityLocations).length,inputSessions:inputSessions.length,calendarDate}),timestamp);
  return getStageWorkbenchState(key);
}

export function listWorkbenchActivityLocations(){
  return db.prepare(`SELECT stage_key AS stageKey,activity_locations_json AS activityLocationsJson,updated_at AS updatedAt FROM stage_workbench_state ORDER BY stage_key`).all().flatMap(row=>{
    const locations=safeJson(row.activityLocationsJson,{});
    return Object.entries(locations).map(([activityId,value])=>({stageKey:row.stageKey,activityId,updatedAt:row.updatedAt,...(value&&typeof value==='object'?value:{})}));
  });
}

export function listWorkbenchDiary(stageKey,activityId=''){
  const key=String(stageKey||'').trim().toLowerCase(),activity=String(activityId||'').trim();
  const sql=`SELECT id,stage_key AS stageKey,activity_id AS activityId,record_date AS recordDate,responsible,production,unit,status,notes,created_at AS createdAt FROM workbench_diary WHERE stage_key=?${activity?' AND activity_id=?':''} ORDER BY record_date DESC,created_at DESC`;
  return activity?db.prepare(sql).all(key,activity):db.prepare(sql).all(key);
}

export function createWorkbenchDiary(input={}){
  const stageKey=String(input.stageKey||'').trim().toLowerCase(),activityId=String(input.activityId||'').trim();
  if(!stageKey||!activityId)throw Object.assign(new Error('Etapa e atividade são obrigatórias.'),{statusCode:400});
  const id=`DIA-${Date.now().toString(36).toUpperCase()}`,createdAt=now(),recordDate=String(input.recordDate||createdAt.slice(0,10)),responsible=String(input.responsible||'Responsável não informado').trim(),production=Number(input.production)||0,unit=String(input.unit||'').trim(),status=String(input.status||'registrado').trim(),notes=String(input.notes||'').trim();
  db.prepare(`INSERT INTO workbench_diary(id,stage_key,activity_id,record_date,responsible,production,unit,status,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id,stageKey,activityId,recordDate,responsible,production,unit,status,notes,createdAt);
  audit.run('workbench_diary',id,'created',JSON.stringify({stageKey,activityId,production,unit,status}),createdAt);
  return listWorkbenchDiary(stageKey,activityId).find(item=>item.id===id);
}

const workbenchAttachmentSelect=`SELECT id,stage_key AS stageKey,activity_id AS activityId,kind,title,issuer,document_date AS documentDate,expires_at AS expiresAt,notes,file_name AS fileName,mime_type AS mimeType,created_by AS createdBy,created_at AS createdAt FROM workbench_attachments`;

export function listWorkbenchAttachments(stageKey,activityId=''){
  const key=String(stageKey||'').trim().toLowerCase(),activity=String(activityId||'').trim();
  const sql=`${workbenchAttachmentSelect} WHERE stage_key=?${activity?' AND activity_id=?':''} ORDER BY created_at DESC`;
  const rows=activity?db.prepare(sql).all(key,activity):db.prepare(sql).all(key);
  return rows.map(row=>({...row,fileUrl:`/api/workbench/diary?resource=attachment-file&id=${encodeURIComponent(row.id)}`}));
}

export function createWorkbenchAttachment(input={}){
  const stageKey=String(input.stageKey||'').trim().toLowerCase(),activityId=String(input.activityId||'').trim(),kind=String(input.kind||'evidence').trim();
  if(!stageKey)throw Object.assign(new Error('Etapa obrigatória.'),{statusCode:400});
  const match=String(input.dataUrl||'').match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
  if(!match)throw Object.assign(new Error('Arquivo inválido ou não informado.'),{statusCode:400});
  const mimeType=match[1],allowed=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
  if(!allowed.has(mimeType))throw Object.assign(new Error('Use PDF, JPG, PNG ou WebP.'),{statusCode:400});
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length>6*1024*1024)throw Object.assign(new Error('O arquivo deve ter no máximo 6 MB.'),{statusCode:413});
  const id=`ANX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,createdAt=now();
  const requested=safeReceiptName(input.fileName||`anexo-${id}`),ext=receiptMimeExt(mimeType),fileName=requested.toLowerCase().endsWith(ext)?requested:`${requested}${ext}`,storagePath=join(workbenchAttachmentsRoot,`${id}-${fileName}`);
  writeFileSync(storagePath,bytes);
  db.prepare(`INSERT INTO workbench_attachments(id,stage_key,activity_id,kind,title,issuer,document_date,expires_at,notes,file_name,mime_type,storage_path,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,stageKey,activityId,kind,String(input.title||fileName).trim(),String(input.issuer||'').trim(),String(input.documentDate||'').trim(),String(input.expiresAt||'').trim(),String(input.notes||'').trim(),fileName,mimeType,storagePath,String(input.createdBy||'').trim(),createdAt);
  audit.run('workbench_attachments',id,'created',JSON.stringify({stageKey,activityId,kind,title:String(input.title||fileName),fileName}),createdAt);
  return listWorkbenchAttachments(stageKey,activityId).find(item=>item.id===id);
}

export function getWorkbenchAttachmentFile(id){
  const row=db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,storage_path AS storagePath FROM workbench_attachments WHERE id=?`).get(id);
  return row&&existsSync(row.storagePath)?row:null;
}

export function deleteWorkbenchAttachment(id){
  const row=db.prepare(`SELECT storage_path AS storagePath FROM workbench_attachments WHERE id=?`).get(id);if(!row)return false;
  db.prepare(`DELETE FROM workbench_attachments WHERE id=?`).run(id);try{if(row.storagePath&&existsSync(row.storagePath))unlinkSync(row.storagePath)}catch{}
  audit.run('workbench_attachments',id,'deleted','{}',now());return true;
}

/* ── Stage Administration ──────────────────────────────────────── */

const safeJson=(text,fallback)=>{try{return JSON.parse(text||JSON.stringify(fallback));}catch{return fallback;}};

export function listStagesAdmin(){
  const stages=db.prepare(`SELECT s.id,s.project_id AS projectId,s.name,s.status,s.progress,s.week,s.owner FROM stages s ORDER BY s.id`).all();
  return stages.map(s=>{
    const activities=db.prepare(`SELECT id,name,category,status,progress,owner_id AS ownerId,planned_start AS plannedStart,planned_end AS plannedEnd FROM activities WHERE stage_id=? ORDER BY name`).all(s.id);
    const purchases=db.prepare(`SELECT id,supplier,description,value_cents AS valueCents,status,expected_date AS expectedDate,delay FROM purchases WHERE stage_id=? ORDER BY expected_date DESC`).all(s.id);
    const aiConfig=db.prepare(`SELECT * FROM stage_ai_config WHERE stage_id=?`).get(s.id);
    return {...s,activities,purchases,hasAiConfig:Boolean(aiConfig)};
  });
}

export function getStageAdmin(stageId){
  const s=db.prepare(`SELECT s.id,s.project_id AS projectId,s.name,s.status,s.progress,s.week,s.owner FROM stages s WHERE s.id=?`).get(stageId);
  if(!s)return null;
  const activities=db.prepare(`SELECT id,name,category,status,progress,owner_id AS ownerId,planned_start AS plannedStart,planned_end AS plannedEnd,properties_json AS propertiesJson FROM activities WHERE stage_id=? ORDER BY name`).all(s.id);
  const purchases=db.prepare(`SELECT id,supplier,description,value_cents AS valueCents,status,expected_date AS expectedDate,delay FROM purchases WHERE stage_id=? ORDER BY expected_date DESC`).all(s.id);
  const materialAuditRows=db.prepare(`SELECT entity_id AS entityId,payload_json AS payloadJson FROM audit_events WHERE entity='materials' ORDER BY created_at DESC`).all();
  const materialIds=new Set(materialAuditRows.filter(row=>String(safeJson(row.payloadJson,{}).stage||'').trim().toLocaleLowerCase('pt-BR')===String(s.name||'').trim().toLocaleLowerCase('pt-BR')).map(row=>String(row.entityId)));
  const materials=db.prepare(`SELECT id,name,unit,planned_quantity AS plannedQuantity,received_quantity AS receivedQuantity,used_quantity AS usedQuantity,status FROM materials ORDER BY name`).all().filter(item=>materialIds.has(String(item.id)));
  const records=db.prepare(`SELECT r.id,r.record_date AS data,r.record_time AS hora,r.responsible_name AS responsavel,r.details AS detalhes,r.status,s2.name AS etapa FROM records r LEFT JOIN stages s2 ON s2.id=r.stage_id WHERE r.stage_id=? ORDER BY r.record_date DESC,r.record_time DESC`).all(s.id);
  const cashEntries=db.prepare(`SELECT id,entry_date AS date,kind,category,stage,description,amount_cents AS amountCents FROM cash_flow_entries WHERE lower(stage)=lower(?) ORDER BY entry_date DESC`).all(s.name);
  const receipts=db.prepare(`SELECT id,supplier,amount_cents AS amountCents,issue_date AS issueDate,document_number AS documentNumber,file_name AS fileName,notes FROM purchase_receipts WHERE lower(stage)=lower(?) ORDER BY created_at DESC`).all(s.name);
  const outsourcing=db.prepare(`SELECT id,contractor,service,amount_cents AS amountCents,issue_date AS issueDate,document_number AS documentNumber,notes FROM outsourcing_receipts WHERE lower(stage)=lower(?) ORDER BY created_at DESC`).all(s.name);
  const relations=db.prepare(`SELECT ar.id,ar.from_activity_id AS fromId,ar.to_activity_id AS toId,ar.label,a1.name AS fromName,a2.name AS toName FROM activity_relations ar LEFT JOIN activities a1 ON a1.id=ar.from_activity_id LEFT JOIN activities a2 ON a2.id=ar.to_activity_id WHERE a1.stage_id=? OR a2.stage_id=?`).all(s.id,s.id);
  const aiConfig=db.prepare(`SELECT * FROM stage_ai_config WHERE stage_id=?`).get(s.id);
  const ai=aiConfig?{
    requirements:safeJson(aiConfig.ai_requirements_json,[]),
    conditions:safeJson(aiConfig.ai_conditions_json,[]),
    executionProfile:safeJson(aiConfig.execution_profile_json,{}),
    notificationTargets:safeJson(aiConfig.notification_targets_json,{}),
    procurementFocus:safeJson(aiConfig.procurement_focus_json,[]),
    evidenceFocus:safeJson(aiConfig.evidence_focus_json,[]),
    requestHints:safeJson(aiConfig.request_hints_json,[]),
    typicalDescription:aiConfig.typical_description||'',
    updatedAt:aiConfig.updated_at
  }:null;
  const purchaseTotal=purchases.reduce((a,p)=>a+(Number(p.valueCents)||0),0);
  const cashIn=cashEntries.filter(e=>e.kind==='entrada').reduce((a,e)=>a+(Number(e.amountCents)||0),0);
  const cashOut=cashEntries.filter(e=>e.kind==='saida').reduce((a,e)=>a+(Number(e.amountCents)||0),0);
  return {...s,activities,purchases,materials,records,cashEntries,receipts,outsourcing,relations,aiConfig:ai,summary:{activitiesCount:activities.length,purchasesCount:purchases.length,purchaseTotalCents:purchaseTotal,recordsCount:records.length,cashInCents:cashIn,cashOutCents:cashOut,receiptsCount:receipts.length,outsourcingCount:outsourcing.length}};
}

export function updateStageAdmin(stageId,input={}){
  const current=db.prepare(`SELECT * FROM stages WHERE id=?`).get(stageId);if(!current)return null;
  const name=String(input.name||current.name).trim(),owner=String(input.owner||current.owner||'').trim();
  const status=String(input.status||current.status).trim(),progress=Math.max(0,Math.min(100,Number(input.progress??current.progress)||0));
  const week=String(input.week??current.week??'').trim();
  db.prepare(`UPDATE stages SET name=?,owner=?,status=?,progress=?,week=? WHERE id=?`).run(name,owner,status,progress,week,stageId);
  audit.run('stages',String(stageId),'updated',JSON.stringify({name,owner,status,progress,week}),now());
  return getStageAdmin(stageId);
}

export function saveStageAiConfig(stageId,input={}){
  const exists=db.prepare(`SELECT id FROM stages WHERE id=?`).get(stageId);
  if(!exists)return null;
  const timestamp=now();
  const requirements=JSON.stringify(Array.isArray(input.requirements)?input.requirements:[]);
  const conditions=JSON.stringify(Array.isArray(input.conditions)?input.conditions:[]);
  const executionProfile=JSON.stringify(input.executionProfile||{});
  const notificationTargets=JSON.stringify(input.notificationTargets||{});
  const procurementFocus=JSON.stringify(Array.isArray(input.procurementFocus)?input.procurementFocus:[]);
  const evidenceFocus=JSON.stringify(Array.isArray(input.evidenceFocus)?input.evidenceFocus:[]);
  const requestHints=JSON.stringify(Array.isArray(input.requestHints)?input.requestHints:[]);
  const typicalDescription=String(input.typicalDescription||'').trim();
  db.prepare(`INSERT INTO stage_ai_config(stage_id,ai_requirements_json,ai_conditions_json,execution_profile_json,notification_targets_json,procurement_focus_json,evidence_focus_json,request_hints_json,typical_description,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(stage_id) DO UPDATE SET ai_requirements_json=excluded.ai_requirements_json,ai_conditions_json=excluded.ai_conditions_json,execution_profile_json=excluded.execution_profile_json,notification_targets_json=excluded.notification_targets_json,procurement_focus_json=excluded.procurement_focus_json,evidence_focus_json=excluded.evidence_focus_json,request_hints_json=excluded.request_hints_json,typical_description=excluded.typical_description,updated_at=excluded.updated_at`).run(stageId,requirements,conditions,executionProfile,notificationTargets,procurementFocus,evidenceFocus,requestHints,typicalDescription,timestamp);
  audit.run('stage_ai_config',String(stageId),'saved',JSON.stringify({requirements:safeJson(requirements,[]).length,conditions:safeJson(conditions,[]).length}),timestamp);
  return getStageAdmin(stageId);
}

export function getStageReport(stageId){
  const stage=getStageAdmin(stageId);
  if(!stage)return null;
  const directEvents=db.prepare(`SELECT id,entity,entity_id AS entityId,action,payload_json AS payloadJson,created_at AS createdAt
    FROM audit_events WHERE
      (entity='stages' AND entity_id=?) OR
      (entity='stage_ai_config' AND entity_id=?) OR
      (entity='activities' AND entity_id IN (SELECT id FROM activities WHERE stage_id=?)) OR
      (entity='purchases' AND entity_id IN (SELECT id FROM purchases WHERE stage_id=?)) OR
      (entity='purchase_receipts' AND entity_id IN (SELECT id FROM purchase_receipts WHERE lower(stage)=lower(?))) OR
      (entity='outsourcing_receipts' AND entity_id IN (SELECT id FROM outsourcing_receipts WHERE lower(stage)=lower(?))) OR
      (entity='records' AND entity_id IN (SELECT id FROM records WHERE stage_id=?))
    ORDER BY created_at DESC LIMIT 240`).all(String(stageId),String(stageId),stageId,stageId,stage.name,stage.name,stageId);
  const materialEvents=db.prepare(`SELECT id,entity,entity_id AS entityId,action,payload_json AS payloadJson,created_at AS createdAt FROM audit_events WHERE entity='materials' ORDER BY created_at DESC LIMIT 240`).all()
    .filter(event=>String(safeJson(event.payloadJson,{}).stage||'').trim().toLocaleLowerCase('pt-BR')===String(stage.name||'').trim().toLocaleLowerCase('pt-BR'));
  const auditEvents=[...directEvents,...materialEvents]
    .map(event=>({...event,payload:safeJson(event.payloadJson,{})}))
    .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0,240);
  const situation={
    activities:{total:stage.activities.length,completed:stage.activities.filter(item=>/conclu/i.test(item.status)).length,averageProgress:stage.activities.length?Math.round(stage.activities.reduce((sum,item)=>sum+(Number(item.progress)||0),0)/stage.activities.length):0},
    purchases:{total:stage.purchases.length,valueCents:stage.summary.purchaseTotalCents,late:stage.purchases.filter(item=>item.delay&&item.delay!=='—').length},
    materials:{total:stage.materials.length,critical:stage.materials.filter(item=>/critic/i.test(item.status)).length,planned:stage.materials.reduce((sum,item)=>sum+(Number(item.plannedQuantity)||0),0),received:stage.materials.reduce((sum,item)=>sum+(Number(item.receivedQuantity)||0),0),used:stage.materials.reduce((sum,item)=>sum+(Number(item.usedQuantity)||0),0)},
    services:{total:stage.outsourcing.length,valueCents:stage.outsourcing.reduce((sum,item)=>sum+(Number(item.amountCents)||0),0)},
    evidence:{records:stage.records.length,receipts:stage.receipts.length},
    cash:{inCents:stage.summary.cashInCents,outCents:stage.summary.cashOutCents,balanceCents:stage.summary.cashInCents-stage.summary.cashOutCents}
  };
  return {...stage,auditEvents,situation};
}
