import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import developmentSeedData from './data/development-seed.json' with {type:'json'};
import stageDestinationsCatalogData from './frontend/src/data/stage-destinations.json' with {type:'json'};
import {REPASSE_PRICE_CATALOG} from './repasse-price-catalog.mjs';

const normalizedLotKey=value=>{const raw=String(value||'').trim().toLocaleUpperCase('pt-BR').replace(/\s+/g,'');const match=raw.match(/^([A-Z]+)-?(\d+)$/);return match?`${match[1]}-${Number(match[2])}`:raw;};
const priceCatalogLot=value=>REPASSE_PRICE_CATALOG.find(item=>normalizedLotKey(item.label)===normalizedLotKey(value))||null;

const appRoot=fileURLToPath(new URL('.',import.meta.url));
const applicationProjectId=developmentSeedData.project.id;
const dataRoot=process.env.BELAVISTA_DATA_ROOT||join(appRoot,'data');
const dbPath=process.env.BELAVISTA_DB||join(dataRoot,'belavista.sqlite');
const receiptsRoot=process.env.BELAVISTA_RECEIPTS_ROOT||join(dataRoot,'receipts');
const salesRoot=process.env.BELAVISTA_SALES_ROOT||join(dataRoot,'sales');
const outsourcingRoot=process.env.BELAVISTA_OUTSOURCING_ROOT||join(dataRoot,'outsourcing');
const cashFlowAttachmentsRoot=process.env.BELAVISTA_CASH_ATTACHMENTS_ROOT||join(dataRoot,'cash-attachments');
const workbenchAttachmentsRoot=process.env.BELAVISTA_WORKBENCH_ATTACHMENTS_ROOT||join(dataRoot,'workbench-attachments');
const serviceRequestFilesRoot=process.env.BELAVISTA_SERVICE_REQUEST_FILES_ROOT||join(dataRoot,'service-request-files');
mkdirSync(dirname(dbPath),{recursive:true});
mkdirSync(receiptsRoot,{recursive:true});
mkdirSync(salesRoot,{recursive:true});
mkdirSync(outsourcingRoot,{recursive:true});
mkdirSync(cashFlowAttachmentsRoot,{recursive:true});
mkdirSync(workbenchAttachmentsRoot,{recursive:true});
mkdirSync(serviceRequestFilesRoot,{recursive:true});

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
    lot_key TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER NOT NULL DEFAULT 0,
    sale_id TEXT NOT NULL DEFAULT '',
    broker_name TEXT NOT NULL DEFAULT '',
    repasse_reason_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cash_flow_attachments (
    id TEXT PRIMARY KEY,
    cash_flow_id TEXT NOT NULL REFERENCES cash_flow_entries(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
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
  CREATE TABLE IF NOT EXISTS repasse_broker_rules (
    broker_name TEXT NOT NULL COLLATE NOCASE,
    lot_key TEXT NOT NULL,
    commission_percent REAL,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    updated_at TEXT NOT NULL,
    PRIMARY KEY(broker_name,lot_key)
  );
  CREATE TABLE IF NOT EXISTS broker_profiles (
    broker_key TEXT PRIMARY KEY,
    broker_name TEXT NOT NULL,
    creci TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lot_development_profiles (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK(kind IN ('lot','common-area')),
    lot_key TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    quadra TEXT NOT NULL DEFAULT '',
    area REAL,
    value_cents INTEGER,
    status TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS lot_development_profiles_lot_key
    ON lot_development_profiles(lot_key) WHERE kind='lot';
  CREATE TABLE IF NOT EXISTS project_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    issuer TEXT NOT NULL DEFAULT '',
    document_date TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    source_material_id TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_content BLOB NOT NULL,
    properties_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS project_document_columns (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS repasse_sale_plans (
    sale_id TEXT PRIMARY KEY REFERENCES commercial_sales(id) ON DELETE CASCADE,
    contract_price_cents INTEGER NOT NULL CHECK(contract_price_cents > 0),
    annual_interest_percent REAL,
    monthly_installments INTEGER NOT NULL DEFAULT 0 CHECK(monthly_installments >= 0),
    semiannual_installments INTEGER NOT NULL DEFAULT 0 CHECK(semiannual_installments >= 0),
    semiannual_principal_percent REAL NOT NULL DEFAULT 0 CHECK(semiannual_principal_percent BETWEEN 0 AND 100),
    monthly_first_due_date TEXT,
    semiannual_first_due_date TEXT,
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
  CREATE TABLE IF NOT EXISTS agenda_events (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK(source_type IN ('manual','record','activity')),
    source_id TEXT,
    title TEXT NOT NULL,
    stage_key TEXT NOT NULL DEFAULT '',
    stage_name TEXT NOT NULL DEFAULT '',
    activity_id TEXT NOT NULL DEFAULT '',
    activity_name TEXT NOT NULL DEFAULT '',
    owner TEXT NOT NULL DEFAULT '',
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration_hours REAL NOT NULL DEFAULT 1,
    span_days INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Planejado',
    related_from TEXT NOT NULL DEFAULT '',
    user_edited INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE(source_type,source_id)
  );
  CREATE INDEX IF NOT EXISTS idx_agenda_events_date ON agenda_events(event_date,start_time);
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
  CREATE TABLE IF NOT EXISTS service_requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    domain TEXT NOT NULL,
    stage_key TEXT NOT NULL DEFAULT '',
    activity_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'triage',
    requested_by TEXT NOT NULL,
    requested_by_uid TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS service_request_files (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_service_request_files_request ON service_request_files(request_id,created_at);
  CREATE INDEX IF NOT EXISTS idx_workbench_diary_activity ON workbench_diary(stage_key,activity_id,record_date DESC);
  CREATE INDEX IF NOT EXISTS idx_workbench_attachments_stage ON workbench_attachments(stage_key,activity_id,created_at DESC);
`);
try { db.exec(`ALTER TABLE service_requests ADD COLUMN requested_by_uid TEXT NOT NULL DEFAULT ''`); } catch {}

try { db.exec(`ALTER TABLE records ADD COLUMN map_area TEXT`); } catch {}
try { db.exec(`ALTER TABLE records ADD COLUMN properties_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE stage_workbench_state ADD COLUMN activity_locations_json TEXT NOT NULL DEFAULT '{}'`); } catch {}
try { db.exec(`ALTER TABLE stage_workbench_state ADD COLUMN input_sessions_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE stage_workbench_state ADD COLUMN calendar_date TEXT`); } catch {}
for(const [name,type] of [
  ['lot_key',"TEXT NOT NULL DEFAULT ''"],
  ['fiscal_document_type','TEXT'],['fiscal_document_number','TEXT'],
  ['fiscal_issuer','TEXT'],['fiscal_issue_date','TEXT'],
  ['fiscal_status',"TEXT NOT NULL DEFAULT 'pendente'"],
])try{db.exec(`ALTER TABLE cash_flow_entries ADD COLUMN ${name} ${type}`);}catch{}
db.exec(`CREATE INDEX IF NOT EXISTS idx_cash_flow_lot_key ON cash_flow_entries(lot_key,entry_date DESC)`);

// The agenda is a persisted projection of actual records and dated activities.
// User edits win over subsequent source updates; deleting a source removes its card.
db.exec(`
  CREATE TRIGGER IF NOT EXISTS agenda_record_insert AFTER INSERT ON records BEGIN
    INSERT INTO agenda_events(id,source_type,source_id,title,stage_key,stage_name,activity_id,activity_name,owner,event_date,start_time,status,updated_at)
    VALUES('agenda-record-'||NEW.id,'record',NEW.id,
      COALESCE(NULLIF(substr(NEW.details,1,instr(NEW.details||char(10),char(10))-1),''),'Registro da obra'),
      COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),
      COALESCE(NEW.activity_id,''),COALESCE((SELECT name FROM activities WHERE id=NEW.activity_id),''),
      NEW.responsible_name,NEW.record_date,NEW.record_time,NEW.status,datetime('now'));
  END;
  CREATE TRIGGER IF NOT EXISTS agenda_record_update AFTER UPDATE ON records BEGIN
    UPDATE agenda_events SET
      title=COALESCE(NULLIF(substr(NEW.details,1,instr(NEW.details||char(10),char(10))-1),''),'Registro da obra'),
      stage_key=COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),
      stage_name=COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),
      activity_id=COALESCE(NEW.activity_id,''),activity_name=COALESCE((SELECT name FROM activities WHERE id=NEW.activity_id),''),
      owner=NEW.responsible_name,event_date=NEW.record_date,start_time=NEW.record_time,status=NEW.status,updated_at=datetime('now')
    WHERE source_type='record' AND source_id=NEW.id AND user_edited=0 AND hidden=0;
  END;
  CREATE TRIGGER IF NOT EXISTS agenda_record_delete AFTER DELETE ON records BEGIN
    DELETE FROM agenda_events WHERE source_type='record' AND source_id=OLD.id;
  END;
  CREATE TRIGGER IF NOT EXISTS agenda_activity_insert AFTER INSERT ON activities
  WHEN NEW.planned_start IS NOT NULL AND NEW.planned_start<>'' BEGIN
    INSERT INTO agenda_events(id,source_type,source_id,title,stage_key,stage_name,activity_id,activity_name,owner,event_date,start_time,span_days,status,updated_at)
    VALUES('agenda-activity-'||NEW.id,'activity',NEW.id,NEW.name,
      COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),
      NEW.id,NEW.name,COALESCE((SELECT name FROM collaborators WHERE id=NEW.owner_id),''),
      substr(NEW.planned_start,1,10),COALESCE(NULLIF(substr(NEW.planned_start,12,5),''),'08:00'),
      MAX(1,CAST(julianday(substr(COALESCE(NEW.planned_end,NEW.planned_start),1,10))-julianday(substr(NEW.planned_start,1,10))+1 AS INTEGER)),
      NEW.status,datetime('now'));
  END;
  CREATE TRIGGER IF NOT EXISTS agenda_activity_update AFTER UPDATE ON activities BEGIN
    UPDATE agenda_events SET title=NEW.name,
      stage_key=COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),stage_name=COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),
      activity_name=NEW.name,owner=COALESCE((SELECT name FROM collaborators WHERE id=NEW.owner_id),''),
      event_date=substr(NEW.planned_start,1,10),start_time=COALESCE(NULLIF(substr(NEW.planned_start,12,5),''),'08:00'),
      span_days=MAX(1,CAST(julianday(substr(COALESCE(NEW.planned_end,NEW.planned_start),1,10))-julianday(substr(NEW.planned_start,1,10))+1 AS INTEGER)),
      status=NEW.status,updated_at=datetime('now')
    WHERE source_type='activity' AND source_id=NEW.id AND user_edited=0 AND hidden=0 AND NEW.planned_start IS NOT NULL AND NEW.planned_start<>'';
    INSERT OR IGNORE INTO agenda_events(id,source_type,source_id,title,stage_key,stage_name,activity_id,activity_name,owner,event_date,start_time,span_days,status,updated_at)
    SELECT 'agenda-activity-'||NEW.id,'activity',NEW.id,NEW.name,
      COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),COALESCE((SELECT name FROM stages WHERE id=NEW.stage_id),''),
      NEW.id,NEW.name,COALESCE((SELECT name FROM collaborators WHERE id=NEW.owner_id),''),
      substr(NEW.planned_start,1,10),COALESCE(NULLIF(substr(NEW.planned_start,12,5),''),'08:00'),
      MAX(1,CAST(julianday(substr(COALESCE(NEW.planned_end,NEW.planned_start),1,10))-julianday(substr(NEW.planned_start,1,10))+1 AS INTEGER)),
      NEW.status,datetime('now') WHERE NEW.planned_start IS NOT NULL AND NEW.planned_start<>'';
    DELETE FROM agenda_events WHERE source_type='activity' AND source_id=NEW.id AND user_edited=0
      AND (NEW.planned_start IS NULL OR NEW.planned_start='');
  END;
  CREATE TRIGGER IF NOT EXISTS agenda_activity_delete AFTER DELETE ON activities BEGIN
    DELETE FROM agenda_events WHERE source_type='activity' AND source_id=OLD.id;
  END;
  INSERT OR IGNORE INTO agenda_events(id,source_type,source_id,title,stage_key,stage_name,activity_id,activity_name,owner,event_date,start_time,status,updated_at)
    SELECT 'agenda-record-'||r.id,'record',r.id,
      COALESCE(NULLIF(substr(r.details,1,instr(r.details||char(10),char(10))-1),''),'Registro da obra'),
      COALESCE(s.name,''),COALESCE(s.name,''),COALESCE(r.activity_id,''),COALESCE(a.name,''),
      r.responsible_name,r.record_date,r.record_time,r.status,datetime('now')
    FROM records r LEFT JOIN stages s ON s.id=r.stage_id LEFT JOIN activities a ON a.id=r.activity_id;
  INSERT OR IGNORE INTO agenda_events(id,source_type,source_id,title,stage_key,stage_name,activity_id,activity_name,owner,event_date,start_time,span_days,status,updated_at)
    SELECT 'agenda-activity-'||a.id,'activity',a.id,a.name,COALESCE(s.name,''),COALESCE(s.name,''),a.id,a.name,
      COALESCE(c.name,''),substr(a.planned_start,1,10),COALESCE(NULLIF(substr(a.planned_start,12,5),''),'08:00'),
      MAX(1,CAST(julianday(substr(COALESCE(a.planned_end,a.planned_start),1,10))-julianday(substr(a.planned_start,1,10))+1 AS INTEGER)),
      a.status,datetime('now')
    FROM activities a LEFT JOIN stages s ON s.id=a.stage_id LEFT JOIN collaborators c ON c.id=a.owner_id
    WHERE a.planned_start IS NOT NULL AND a.planned_start<>'';
`);

const cashFlowColumns = new Set(db.prepare(`PRAGMA table_info(cash_flow_entries)`).all().map((column) => column.name));
for (const [name, definition] of [
  ["sale_id", "TEXT NOT NULL DEFAULT ''"],
  ["broker_name", "TEXT NOT NULL DEFAULT ''"],
  ["repasse_reason_id", "TEXT NOT NULL DEFAULT ''"],
]) if (!cashFlowColumns.has(name)) db.exec(`ALTER TABLE cash_flow_entries ADD COLUMN ${name} ${definition}`);
db.exec(`CREATE INDEX IF NOT EXISTS cash_flow_repasse_sale_idx ON cash_flow_entries(sale_id,entry_date,created_at)`);
db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(4,?)`).run(new Date().toISOString());
db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(5,?)`).run(new Date().toISOString());
const materialColumns = new Set(db.prepare(`PRAGMA table_info(materials)`).all().map((column) => column.name));
for (const [name, definition] of [
  ["stage_id", "INTEGER REFERENCES stages(id) ON DELETE SET NULL"],
  ["activity_name", "TEXT NOT NULL DEFAULT ''"],
  ["scope", "TEXT NOT NULL DEFAULT ''"],
  ["updated_at", "TEXT NOT NULL DEFAULT ''"],
]) if (!materialColumns.has(name)) db.exec(`ALTER TABLE materials ADD COLUMN ${name} ${definition}`);
db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(6,?)`).run(new Date().toISOString());
const materialPropertyColumns = new Set(db.prepare(`PRAGMA table_info(materials)`).all().map((column) => column.name));
if (!materialPropertyColumns.has("properties_json")) db.exec(`ALTER TABLE materials ADD COLUMN properties_json TEXT NOT NULL DEFAULT '{}'`);
db.exec(`CREATE TABLE IF NOT EXISTS material_custom_columns(id TEXT PRIMARY KEY,label TEXT NOT NULL UNIQUE,position INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`);
db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(7,?)`).run(new Date().toISOString());
db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(8,?)`).run(new Date().toISOString());
db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(9,?)`).run(new Date().toISOString());
db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(3,?)`).run(new Date().toISOString());
const now=()=>new Date().toISOString();
const stageDestinations=Array.isArray(stageDestinationsCatalogData.destinations)?stageDestinationsCatalogData.destinations:[];
const officeStageDestination=stageDestinations.find(item=>item?.key==='office'&&item?.name==='Escritório');
function ensureOfficeStageDestinationV1(){
  if(!officeStageDestination||!db.prepare(`SELECT 1 FROM projects WHERE id=?`).get(applicationProjectId))return null;
  let stage=db.prepare(`SELECT id,name FROM stages WHERE project_id=? AND lower(name)=lower(?)`).get(applicationProjectId,officeStageDestination.name);
  if(!stage){
    const id=Number(db.prepare(`SELECT COALESCE(MAX(id),0)+1 AS id FROM stages`).get()?.id||1);
    db.prepare(`INSERT INTO stages(id,project_id,name,status,progress,week,owner) VALUES(?,?,?,?,?,?,?)`).run(id,applicationProjectId,officeStageDestination.name,'planejado',0,'Apoio administrativo','Equipe administrativa');
    stage={id,name:officeStageDestination.name};
  }
  const activityName='Nota / atividade administrativa';
  const activityExists=db.prepare(`SELECT 1 FROM activities WHERE stage_id=? AND lower(name)=lower(?)`).get(stage.id,activityName);
  if(!activityExists){
    const activityId=`activity-office-${stage.id}-admin-note`;
    db.prepare(`INSERT OR IGNORE INTO activities(id,name,stage_id,category,status,progress,owner_id) VALUES(?,?,?,?,?,?,?)`)
      .run(activityId,activityName,stage.id,'Administrativa','planejado',0,null);
  }
  return stage;
}
ensureOfficeStageDestinationV1();
const hasOperationalRows=()=>db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'schema_migrations'
`).all().some(({name})=>db.prepare(`SELECT 1 FROM "${String(name).replaceAll('"','""')}" LIMIT 1`).get());

export function initializeDevelopmentSeed(){
  if(process.env.NODE_ENV!=='development')return {status:'skipped',reason:'not-development'};
  if(hasOperationalRows())return {status:'skipped',reason:'database-not-clean'};
  db.exec('BEGIN IMMEDIATE');
  try{
const projectId=developmentSeedData.project.id;
for(const [id,label,description,share] of developmentSeedData.commissionReasons){
  db.prepare(`INSERT OR IGNORE INTO commission_reasons(id,label,description,share_percent,active,updated_at) VALUES(?,?,?,?,1,?)`).run(id,label,description,share,now());
}
const seed=()=>{
  const timestamp=now();
  const project=developmentSeedData.project;
  db.prepare(`INSERT OR IGNORE INTO projects(id,name,city,phase,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(project.id,project.name,project.city,project.phase,timestamp,timestamp);
  db.prepare(`INSERT OR IGNORE INTO project_state(project_id,operational_state_cleared,updated_at) VALUES(?,?,?)`).run(projectId,0,timestamp);
  const insertStage=db.prepare(`INSERT OR IGNORE INTO stages(id,project_id,name,status,progress,week,owner) VALUES(?,?,?,?,?,?,?)`);
  for(const row of developmentSeedData.stages)insertStage.run(row[0],projectId,...row.slice(1));
  for(const row of developmentSeedData.cashFlow)db.prepare(`INSERT OR IGNORE INTO cash_flow_entries(id,entry_date,kind,category,stage,description,amount_cents,created_at) VALUES(?,?,?,?,?,?,?,?)`).run(...row,timestamp);
  for(const row of developmentSeedData.materials)db.prepare(`INSERT OR IGNORE INTO materials(id,name,unit,planned_quantity,received_quantity,used_quantity,status) VALUES(?,?,?,?,?,?,?)`).run(...row);
  for(const row of developmentSeedData.purchases)db.prepare(`INSERT OR IGNORE INTO purchases(id,supplier,description,stage_id,value_cents,status,expected_date,delay) VALUES(?,?,?,?,?,?,?,?)`).run(...row);
  for(const row of developmentSeedData.collaborators){
  const insertPerson=db.prepare(`INSERT OR IGNORE INTO collaborators(id,name,role,specialty,phone) VALUES(?,?,?,?,?)`);
    insertPerson.run(...row);
  }
  const cleared=Boolean(db.prepare(`SELECT operational_state_cleared AS cleared FROM project_state WHERE project_id=?`).get(projectId)?.cleared);
  if(cleared){
    db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(1,timestamp);
    db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(2,timestamp);
    return;
  }
  const insertActivity=db.prepare(`INSERT OR IGNORE INTO activities(id,name,stage_id,category,status,progress,owner_id) VALUES(?,?,?,?,?,?,?)`);
  for(const row of developmentSeedData.activities)insertActivity.run(...row);
  const insertRelation=db.prepare(`INSERT OR IGNORE INTO activity_relations(from_activity_id,to_activity_id,label) VALUES(?,?,?)`);
  for(const row of developmentSeedData.activityRelations)insertRelation.run(...row);
  const record=db.prepare(`SELECT id FROM records WHERE id=?`).get('REG-001');
  if(!record){const [id,recordDate,recordTime,stageId,activityId,responsibleId,responsibleName,details,status]=developmentSeedData.record;db.prepare(`INSERT INTO records(id,project_id,stage_id,activity_id,record_date,record_time,responsible_id,responsible_name,details,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,projectId,stageId,activityId,recordDate,recordTime,responsibleId,responsibleName,details,status,timestamp,timestamp);}
  db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(1,timestamp);
  db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)`).run(2,timestamp);
};
seed();
    ensureOfficeStageDestinationV1();
    db.exec('COMMIT');
    return {status:'seeded',reason:'clean-development-database'};
  }catch(error){
    db.exec('ROLLBACK');
    throw error;
  }
}

const recordSelect=`SELECT r.id,r.project_id AS projectId,r.stage_id AS stageId,r.activity_id AS activityId,
  p.name AS obra,s.name AS etapa,a.name AS atividade,r.record_date AS data,r.record_time AS hora,
  r.responsible_id AS responsibleId,r.responsible_name AS responsavel,r.details AS detalhes,
  r.status,r.evidence_uri AS evidenceUri,r.map_area AS mapArea,r.properties_json AS propertiesJson,r.created_at AS createdAt,r.updated_at AS updatedAt
  FROM records r JOIN projects p ON p.id=r.project_id LEFT JOIN stages s ON s.id=r.stage_id
  LEFT JOIN activities a ON a.id=r.activity_id`;

const resolveIds=db.prepare(`SELECT p.id AS projectId,s.id AS stageId,a.id AS activityId,c.id AS responsibleId
  FROM projects p LEFT JOIN stages s ON s.project_id=p.id AND lower(s.name)=lower(?)
  LEFT JOIN activities a ON a.stage_id=s.id AND lower(a.name)=lower(?)
  LEFT JOIN collaborators c ON lower(c.name)=lower(?) WHERE lower(p.name)=lower(?) LIMIT 1`);
const audit=db.prepare(`INSERT INTO audit_events(entity,entity_id,action,payload_json,created_at) VALUES(?,?,?,?,?)`);
const asText=(value,fallback='')=>String(value??fallback).trim();
const serializeMapArea=(value,fallback='')=>{
  if(value===undefined||value===null||value==='')return fallback||null;
  if(typeof value==='string')return value.trim()||fallback||null;
  try{return JSON.stringify(value);}catch{return fallback||null;}
};
const serializeRecordProperties=(value,fallback='[]')=>{
  if(value===undefined)return typeof fallback==='string'?fallback:JSON.stringify(fallback||[]);
  let parsed=value;
  if(typeof value==='string'){try{parsed=JSON.parse(value);}catch{parsed=[];}}
  if(!Array.isArray(parsed))parsed=[];
  const clean=parsed.slice(0,40).map((item,index)=>({id:asText(item?.id,`property-${index+1}`).slice(0,80),label:asText(item?.label,'Propriedade sem nome').slice(0,120),type:['text','number','date','select','boolean','map_area'].includes(item?.type)?item.type:'text',value:item?.type==='map_area'&&item?.value&&typeof item.value==='object'?item.value:asText(item?.value).slice(0,2000),options:Array.isArray(item?.options)?item.options.map(option=>asText(option).slice(0,120)).filter(Boolean).slice(0,30):[]}));
  return JSON.stringify(clean);
};
const parseRecordRow=row=>{if(!row)return row;let properties=[];try{properties=JSON.parse(row.propertiesJson||'[]');}catch{}const materialName=properties.find(item=>item.id==='material_name')?.value,recordedActivity=properties.find(item=>item.id==='recorded_activity')?.value;return {...row,atividade:recordedActivity|| (materialName?`Atualização de material: ${materialName}`:row.atividade),properties};};
const slug=(value,fallback='item')=>String(value??fallback).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||fallback;
const numeric=(value,fallback=0)=>{const normalized=String(value??'').replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,'');const amount=Number(normalized);return Number.isFinite(amount)?amount:fallback;};
const toRecordInput=(input,existing={})=>{
  const obra=asText(input.obra,existing.obra||'Aliança Park');
  const etapa=asText(input.etapa,existing.etapa||'Drenagem Pluvial');
  const atividade=asText(input.atividade,existing.atividade||'Drenagem Pluvial');
  const responsavel=asText(input.responsavel,existing.responsavel||'A definir');
  const ids=resolveIds.get(etapa,atividade,responsavel,obra)||{};
  const activityProvided=Object.hasOwn(input,'atividade');
  const activityId=ids.activityId||(activityProvided?null:existing.activityId||null);
  const sourceProperties=input.properties??existing.propertiesJson??existing.properties??[];
  let properties=[];
  try{properties=Array.isArray(sourceProperties)?sourceProperties:JSON.parse(sourceProperties||'[]');}catch{}
  properties=properties.filter(item=>item?.id!=='recorded_activity');
  if(atividade&&!activityId)properties.unshift({id:'recorded_activity',label:'Atividade informada',type:'text',value:atividade});
  const partIds=(Array.isArray(input.partIds)?input.partIds:String(input.partIds||'').split(',')).map(value=>asText(value)).filter(Boolean).slice(0,500);
  const mapAreaInput=input.mapArea|| (partIds.length?{partIds}:existing.mapArea||'');
  const mapArea=serializeMapArea(mapAreaInput,existing.mapArea||'');
  // Depois de limpar o estado operacional, as atividades ainda podem estar
  // vazias. Registros gerais continuam válidos: a relação activity_id fica
  // nula até que a atividade seja criada, em vez de apontar para um ID órfão.
  const generalEvent=asText(input.etapa).toLocaleLowerCase('pt-BR')==='geral';
  return {projectId:ids.projectId||projectId,stageId:generalEvent?null:ids.stageId||existing.stageId||2,activityId:generalEvent?null:activityId,responsibleId:ids.responsibleId||existing.responsibleId||null,obra,etapa,atividade,responsavel,data:asText(input.data,existing.data||new Date().toISOString().slice(0,10)),hora:asText(input.hora,existing.hora||'08:30'),detalhes:asText(input.detalhes,existing.detalhes||''),status:asText(input.status,existing.status||'Pendente'),evidenceUri:asText(input.evidenceUri,existing.evidenceUri||'')||null,mapArea,propertiesJson:serializeRecordProperties(properties)};
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
for(const [column,definition] of [['notes',"TEXT NOT NULL DEFAULT ''"],['material_ids_json',"TEXT NOT NULL DEFAULT '[]'"],['agenda_metadata_json',"TEXT NOT NULL DEFAULT '{}'"]])
  try{db.exec(`ALTER TABLE agenda_events ADD COLUMN ${column} ${definition}`);}catch(error){if(!/duplicate column name/i.test(error.message))throw error;}
const agendaSelect=`SELECT id,source_type AS sourceType,source_id AS sourceId,title,stage_key AS stageKey,
  stage_name AS stageName,activity_id AS activityId,activity_name AS activityName,owner,
  event_date AS date,start_time AS start,duration_hours AS durationHours,span_days AS spanDays,
  status,related_from AS relatedFrom,notes,material_ids_json AS materialIdsJson,
  agenda_metadata_json AS agendaMetadataJson,user_edited AS userEdited,hidden,updated_at AS updatedAt FROM agenda_events`;
export function listAgendaEvents(){
  return db.prepare(`${agendaSelect} WHERE hidden=0 ORDER BY event_date,start_time,id`).all()
    .map(({hidden,userEdited,materialIdsJson,agendaMetadataJson,...event})=>{
      let metadata={};
      try{metadata=JSON.parse(agendaMetadataJson||'{}');}catch{}
      return {...event,...(metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata:{}),materialIds:JSON.parse(materialIdsJson||'[]'),userEdited:Boolean(userEdited)};
    });
}
function normalizeAgendaMetadata(input){
  const list=value=>Array.isArray(value)?value.map(item=>asText(item).trim().slice(0,240)).filter(Boolean).slice(0,100):String(value||'').split(/\r?\n/).map(item=>item.trim().slice(0,240)).filter(Boolean).slice(0,100);
  const mapAreas=Array.isArray(input?.mapAreas)?input.mapAreas.map(value=>{
    const area=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const partId=asText(area.partId).trim().slice(0,160);
    if(!partId)return null;
    return {partId,label:asText(area.label||partId).trim().slice(0,240),kind:asText(area.kind||'other').trim().slice(0,40)};
  }).filter(Boolean).slice(0,500):[];
  const offset=Number(input?.notificationOffsetMinutes??30);
  return {
    requirements:list(input?.requirements),materials:list(input?.materials),
    mapAreas,
    customStatus:asText(input?.customStatus).slice(0,120),
    cancellationReason:asText(input?.cancellationReason).slice(0,1000),
    cancelledAt:asText(input?.cancelledAt).slice(0,40),
    cancellationConfirmed:input?.cancellationConfirmed===true,
    notificationOffsetMinutes:Number.isFinite(offset)?Math.max(0,Math.min(1440,Math.round(offset))):30,
  };
}
export function saveAgendaSnapshot(events){
  if(!Array.isArray(events)||events.length>10000)throw Object.assign(new Error('Lista da agenda inválida.'),{statusCode:400});
  const normalized=events.map(input=>{
    const id=asText(input?.id).slice(0,160),title=asText(input?.title).slice(0,240),date=asText(input?.date),start=asText(input?.start,'08:00');
    const durationHours=Number(input?.durationHours??1),spanDays=Number(input?.spanDays??1);
    if(!/^[a-zA-Z0-9_-]+$/.test(id)||!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T00:00:00Z`))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!Number.isFinite(durationHours)||durationHours<0.5||durationHours>24||!Number.isInteger(spanDays)||spanDays<1||spanDays>366)
      throw Object.assign(new Error('Compromisso inválido: título, data, horário e duração são obrigatórios.'),{statusCode:400});
    return {id,title,stageKey:asText(input.stageKey).slice(0,160),stageName:asText(input.stageName).slice(0,160),activityId:asText(input.activityId).slice(0,160),activityName:asText(input.activityName).slice(0,240),owner:asText(input.owner).slice(0,160),date,start,durationHours,spanDays,status:asText(input.status,'Planejado').slice(0,80),relatedFrom:asText(input.relatedFrom).slice(0,160),notes:asText(input.notes).slice(0,2000),materialIdsJson:JSON.stringify(Array.isArray(input.materialIds)?input.materialIds.map(value=>asText(value).slice(0,160)).slice(0,100):[]),agendaMetadataJson:JSON.stringify(normalizeAgendaMetadata(input))};
  });
  if(new Set(normalized.map(item=>item.id)).size!==normalized.length)throw Object.assign(new Error('IDs duplicados na agenda.'),{statusCode:400});
  const current=db.prepare(`${agendaSelect}`).all(),byId=new Map(current.map(item=>[item.id,item])),inputById=new Map(events.map(input=>[asText(input?.id).slice(0,160),input]));
  db.exec('BEGIN IMMEDIATE');
  try{
    for(const item of normalized){
      const previous=byId.get(item.id);
      if(previous){
        let previousMetadata={},nextMetadata=JSON.parse(item.agendaMetadataJson||'{}');
        try{previousMetadata=JSON.parse(previous.agendaMetadataJson||'{}');}catch{}
        const raw=inputById.get(item.id)||{};
        for(const key of ['requirements','materials','mapAreas','customStatus','cancellationReason','cancelledAt','cancellationConfirmed','notificationOffsetMinutes'])
          if(!Object.prototype.hasOwnProperty.call(raw,key)&&Object.prototype.hasOwnProperty.call(previousMetadata,key))nextMetadata[key]=previousMetadata[key];
        item.agendaMetadataJson=JSON.stringify(nextMetadata);
        if(!previous.hidden&&Object.entries(item).every(([key,value])=>previous[key]===value))continue;
        db.prepare(`UPDATE agenda_events SET title=?,stage_key=?,stage_name=?,activity_id=?,activity_name=?,owner=?,event_date=?,start_time=?,duration_hours=?,span_days=?,status=?,related_from=?,notes=?,material_ids_json=?,agenda_metadata_json=?,user_edited=1,hidden=0,updated_at=? WHERE id=?`)
          .run(item.title,item.stageKey,item.stageName,item.activityId,item.activityName,item.owner,item.date,item.start,item.durationHours,item.spanDays,item.status,item.relatedFrom,item.notes,item.materialIdsJson,item.agendaMetadataJson,now(),item.id);
        audit.run('agenda_events',item.id,'updated',JSON.stringify(item),now());
      }else{
        db.prepare(`INSERT INTO agenda_events(id,source_type,title,stage_key,stage_name,activity_id,activity_name,owner,event_date,start_time,duration_hours,span_days,status,related_from,notes,material_ids_json,agenda_metadata_json,user_edited,updated_at) VALUES(?,'manual',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`)
          .run(item.id,item.title,item.stageKey,item.stageName,item.activityId,item.activityName,item.owner,item.date,item.start,item.durationHours,item.spanDays,item.status,item.relatedFrom,item.notes,item.materialIdsJson,item.agendaMetadataJson,now());
        audit.run('agenda_events',item.id,'created',JSON.stringify(item),now());
      }
    }
    const selected=new Set(normalized.map(item=>item.id));
    for(const previous of current){
      if(previous.hidden||selected.has(previous.id))continue;
      if(previous.sourceType==='manual')db.prepare(`DELETE FROM agenda_events WHERE id=?`).run(previous.id);
      else db.prepare(`UPDATE agenda_events SET hidden=1,user_edited=1,updated_at=? WHERE id=?`).run(now(),previous.id);
      audit.run('agenda_events',previous.id,'deleted','{}',now());
    }
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return listAgendaEvents();
}
export function listCollaborators(){
  return db.prepare(`SELECT id,name,role,specialty,phone,active FROM collaborators ORDER BY active DESC,name`).all().map(row=>({...row,active:Boolean(row.active)}));
}
export function listMaterials(){
  return db.prepare(`SELECT m.id,m.name,m.unit,m.planned_quantity AS plannedQuantity,m.received_quantity AS receivedQuantity,m.used_quantity AS usedQuantity,m.status,m.stage_id AS stageId,s.name AS stageName,m.activity_name AS activityName,m.scope,m.updated_at AS updatedAt,m.properties_json AS propertiesJson FROM materials m LEFT JOIN stages s ON s.id=m.stage_id ORDER BY m.name`).all().map(({propertiesJson,...material})=>({...material,properties:safeJson(propertiesJson,{})}));
}
export function listMaterialCustomColumns(){return db.prepare(`SELECT id,label,position,created_at AS createdAt,updated_at AS updatedAt FROM material_custom_columns ORDER BY position,label`).all();}
export function saveMaterialCustomColumn(input={}){
  const label=asText(input.label).trim().slice(0,50),id=asText(input.id,`material-property-${Date.now().toString(36)}`).slice(0,100);
  if(!label)throw Object.assign(new Error('Informe o nome da coluna.'),{statusCode:400});
  const timestamp=now(),position=Number.isInteger(Number(input.position))?Number(input.position):listMaterialCustomColumns().length;
  db.prepare(`INSERT INTO material_custom_columns(id,label,position,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,position=excluded.position,updated_at=excluded.updated_at`).run(id,label,position,timestamp,timestamp);
  audit.run('material_custom_columns',id,'saved',JSON.stringify({label,position}),timestamp);
  return listMaterialCustomColumns().find(column=>column.id===id);
}
export function deleteMaterialCustomColumn(id){
  const column=db.prepare(`SELECT id,label FROM material_custom_columns WHERE id=?`).get(asText(id));if(!column)return false;
  const timestamp=now();db.exec('BEGIN');
  try{
    const rows=db.prepare(`SELECT id,properties_json AS propertiesJson FROM materials`).all();
    const update=db.prepare(`UPDATE materials SET properties_json=?,updated_at=? WHERE id=?`);
    for(const row of rows){const properties=safeJson(row.propertiesJson,{});if(Object.hasOwn(properties,column.id)){delete properties[column.id];update.run(JSON.stringify(properties),timestamp,row.id);}}
    db.prepare(`DELETE FROM material_custom_columns WHERE id=?`).run(column.id);
    audit.run('material_custom_columns',column.id,'deleted',JSON.stringify({label:column.label}),timestamp);db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return true;
}
const materialProperties=value=>{
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{},result={};
  for(const [key,item] of Object.entries(source).slice(0,100)){
    const normalized=asText(key).slice(0,100);if(normalized)result[normalized]=asText(item).slice(0,500);
  }
  return result;
};
const materialQuantity=(value,fallback=0)=>{
  if(value===undefined||value===null||value==='')return fallback;
  const parsed=Number(String(value).trim().replace(',','.'));
  return Number.isFinite(parsed)&&parsed>=0?parsed:NaN;
};
export function createMaterial(input={}){
  const id=asText(input.id,`MAT-${Date.now().toString(36).toUpperCase()}`).slice(0,100),
    name=asText(input.name).slice(0,160),unit=asText(input.unit,'un').slice(0,40),
    planned=materialQuantity(input.plannedQuantity),received=materialQuantity(input.receivedQuantity),
    used=materialQuantity(input.usedQuantity),status=asText(input.status,'Planejado').slice(0,60),
    stageId=input.stageId==null||input.stageId===''?null:Number(input.stageId),activityName=asText(input.activityName).slice(0,160),scope=asText(input.scope).slice(0,2000),properties=materialProperties(input.properties);
  if(!name)throw Object.assign(new Error('Informe o nome do material.'),{statusCode:400});
  if(![planned,received,used].every(Number.isFinite))throw Object.assign(new Error('Informe quantidades numéricas não negativas.'),{statusCode:400});
  if(stageId!==null&&(!Number.isInteger(stageId)||!db.prepare(`SELECT 1 FROM stages WHERE id=?`).get(stageId)))throw Object.assign(new Error('Selecione uma etapa existente.'),{statusCode:400});
  const timestamp=now();
  db.exec('BEGIN');
  try{
    db.prepare(`INSERT INTO materials(id,name,unit,planned_quantity,received_quantity,used_quantity,status,stage_id,activity_name,scope,updated_at,properties_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,name,unit,planned,received,used,status,stageId,activityName,scope,timestamp,JSON.stringify(properties));
    audit.run('materials',id,'created',JSON.stringify({name,unit,plannedQuantity:planned,receivedQuantity:received,usedQuantity:used,status,stageId,activityName,scope,properties}),timestamp);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return listMaterials().find(item=>item.id===id);
}
export function updateMaterial(id,input={}){
  const currentRow=db.prepare(`SELECT id,name,unit,planned_quantity AS plannedQuantity,received_quantity AS receivedQuantity,used_quantity AS usedQuantity,status,stage_id AS stageId,activity_name AS activityName,scope,properties_json AS propertiesJson FROM materials WHERE id=?`).get(asText(id));
  const current=currentRow&&({...currentRow,properties:safeJson(currentRow.propertiesJson,{})});
  if(!current)return null;
  const next={name:asText(input.name,current.name).slice(0,160),unit:asText(input.unit,current.unit).slice(0,40),
    planned:materialQuantity(input.plannedQuantity,current.plannedQuantity),received:materialQuantity(input.receivedQuantity,current.receivedQuantity),
    used:materialQuantity(input.usedQuantity,current.usedQuantity),status:asText(input.status,current.status).slice(0,60),
    stageId:input.stageId===undefined?current.stageId:(input.stageId==null||input.stageId===''?null:Number(input.stageId)),
    activityName:asText(input.activityName,current.activityName).slice(0,160),scope:asText(input.scope,current.scope).slice(0,2000),properties:input.properties===undefined?current.properties:materialProperties(input.properties)};
  if(!next.name)throw Object.assign(new Error('Informe o nome do material.'),{statusCode:400});
  if(![next.planned,next.received,next.used].every(Number.isFinite))throw Object.assign(new Error('Informe quantidades numéricas não negativas.'),{statusCode:400});
  if(next.stageId!==null&&(!Number.isInteger(next.stageId)||!db.prepare(`SELECT 1 FROM stages WHERE id=?`).get(next.stageId)))throw Object.assign(new Error('Selecione uma etapa existente.'),{statusCode:400});
  const timestamp=now();
  db.exec('BEGIN');
  try{
    db.prepare(`UPDATE materials SET name=?,unit=?,planned_quantity=?,received_quantity=?,used_quantity=?,status=?,stage_id=?,activity_name=?,scope=?,updated_at=?,properties_json=? WHERE id=?`).run(next.name,next.unit,next.planned,next.received,next.used,next.status,next.stageId,next.activityName,next.scope,timestamp,JSON.stringify(next.properties),asText(id));
    audit.run('materials',asText(id),'updated',JSON.stringify({before:current,after:{name:next.name,unit:next.unit,plannedQuantity:next.planned,receivedQuantity:next.received,usedQuantity:next.used,status:next.status,stageId:next.stageId,activityName:next.activityName,scope:next.scope,properties:next.properties}}),timestamp);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return listMaterials().find(item=>item.id===asText(id));
}
export function deleteMaterial(id){
  const current=db.prepare(`SELECT id,name FROM materials WHERE id=?`).get(asText(id));
  if(!current)return false;
  const timestamp=now();
  db.exec('BEGIN');
  try{
    db.prepare(`DELETE FROM materials WHERE id=?`).run(asText(id));
    audit.run('materials',asText(id),'deleted',JSON.stringify({name:current.name}),timestamp);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return true;
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
const brokerProfileKey=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
const brokerProfileSelect=`SELECT broker_key AS id,broker_name AS name,creci,phone,email,notes,created_at AS createdAt,updated_at AS updatedAt FROM broker_profiles`;
export function listBrokerProfiles(){return db.prepare(`${brokerProfileSelect} ORDER BY broker_name COLLATE NOCASE`).all();}
export function getBrokerProfile(name){return db.prepare(`${brokerProfileSelect} WHERE broker_key=?`).get(brokerProfileKey(name))||null;}
export function saveBrokerProfile(name,input={}){
  const brokerName=String(name||'').trim().replace(/\s+/g,' '),key=brokerProfileKey(brokerName);
  if(!brokerName||brokerName.length>160)throw Object.assign(new Error('Nome do corretor inválido.'),{statusCode:400});
  const fields={creci:String(input.creci||'').trim(),phone:String(input.phone||'').trim(),email:String(input.email||'').trim(),notes:String(input.notes||'').trim()};
  if(fields.creci.length>80||fields.phone.length>40||fields.email.length>254||fields.notes.length>4000)throw Object.assign(new Error('Um ou mais campos excedem o tamanho permitido.'),{statusCode:400});
  if(fields.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))throw Object.assign(new Error('E-mail inválido.'),{statusCode:400});
  const timestamp=now(),existing=getBrokerProfile(brokerName);
  db.prepare(`INSERT INTO broker_profiles(broker_key,broker_name,creci,phone,email,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(broker_key) DO UPDATE SET broker_name=excluded.broker_name,creci=excluded.creci,phone=excluded.phone,email=excluded.email,notes=excluded.notes,updated_at=excluded.updated_at`).run(key,brokerName,fields.creci,fields.phone,fields.email,fields.notes,existing?.createdAt||timestamp,timestamp);
  audit.run('broker_profiles',key,existing?'updated':'created',JSON.stringify({name:brokerName,...fields}),timestamp);
  return getBrokerProfile(brokerName);
}
export function deleteBrokerProfile(name){const key=brokerProfileKey(name),existing=getBrokerProfile(name);if(!existing)return false;db.prepare(`DELETE FROM broker_profiles WHERE broker_key=?`).run(key);audit.run('broker_profiles',key,'deleted',JSON.stringify({name:existing.name}),now());return true;}
const lotDevelopmentProfileSelect=`SELECT id,kind,lot_key AS lotKey,title,quadra,area,value_cents AS valueCents,status,description,created_at AS createdAt,updated_at AS updatedAt FROM lot_development_profiles`;
const lotDevelopmentProfileKey=value=>normalizedLotKey(value);
export function listLotDevelopmentProfiles(){
  const overrides=db.prepare(`${lotDevelopmentProfileSelect}`).all(),overrideByLot=new Map(overrides.filter(row=>row.kind==='lot').map(row=>[lotDevelopmentProfileKey(row.lotKey),row]));
  const latestSaleByLot=new Map();
  for(const sale of listCommercialSales().sort((left,right)=>String(right.updatedAt||right.createdAt).localeCompare(String(left.updatedAt||left.createdAt)))){
    const key=lotDevelopmentProfileKey(sale.lot);if(!key||latestSaleByLot.has(key))continue;
    latestSaleByLot.set(key,sale);
  }
  const lots=REPASSE_PRICE_CATALOG.filter(item=>Number(item?.lot)>0).map(item=>{
    const label=String(item.label||`${item.quadra}-${item.lot}`),saved=overrideByLot.get(lotDevelopmentProfileKey(label)),sale=latestSaleByLot.get(lotDevelopmentProfileKey(label));
    const status=sale?String(sale.status||'Em negociação'):'Disponível';
    return {id:`lot:${label}`,kind:'lot',title:String(saved?.title||`Lote ${label}`),lotLabel:label,quadra:String(item.quadra||''),area:Number(item.area)||0,value:Number(item.price)||0,status,description:String(saved?.description||''),source:'Tabela oficial de preços',customized:Boolean(saved),inferredAt:saved?.updatedAt||null,createdAt:saved?.createdAt||null,updatedAt:saved?.updatedAt||null};
  });
  const commonAreas=overrides.filter(row=>row.kind==='common-area').map(row=>({id:row.id,kind:row.kind,title:row.title,lotLabel:'',quadra:row.quadra,area:Number(row.area)||0,value:Number(row.valueCents||0)/100,status:row.status,description:row.description,source:'Cadastro persistido',customized:true,inferredAt:null,createdAt:row.createdAt,updatedAt:row.updatedAt}));
  return [...lots,...commonAreas];
}
export function saveLotDevelopmentProfile(input={}){
  const kind=input.kind==='common-area'?'common-area':'lot',requestedId=String(input.id||'').trim(),requestedLot=String(input.lotLabel||input.lot||'').trim();
  const catalogLot=kind==='lot'?REPASSE_PRICE_CATALOG.find(item=>lotDevelopmentProfileKey(item.label)===lotDevelopmentProfileKey(requestedLot)):null;
  if(kind==='lot'&&!catalogLot)throw Object.assign(new Error('Lote não encontrado na tabela oficial de preços.'),{statusCode:404});
  if(kind==='lot'&&input.id&&String(input.id)!==`lot:${catalogLot.label}`)throw Object.assign(new Error('O identificador não corresponde ao lote informado.'),{statusCode:400});
  const id=kind==='lot'?`lot:${catalogLot.label}`:(requestedId&&requestedId.startsWith('common:')?requestedId:`common:${crypto.randomUUID()}`);
  const existing=db.prepare(`${lotDevelopmentProfileSelect} WHERE id=?`).get(id),title=String(input.title||existing?.title||(catalogLot?`Lote ${catalogLot.label}`:'')).trim().slice(0,120);
  if(!title)throw Object.assign(new Error('Informe o nome do perfil.'),{statusCode:400});
  const description=String(input.description??existing?.description??'').trim().slice(0,2000),timestamp=now();
  const quadra=kind==='lot'?String(catalogLot.quadra||''):String(input.quadra??existing?.quadra??'').trim().slice(0,120);
  const area=kind==='lot'?Number(catalogLot.area)||0:Math.max(0,Number(input.area??existing?.area)||0);
  const valueCents=kind==='lot'?Math.round((Number(catalogLot.price)||0)*100):Math.max(0,Math.round((Number(input.value??((existing?.valueCents||0)/100))||0)*100));
  const status=kind==='lot'?String((listCommercialSales().find(sale=>lotDevelopmentProfileKey(sale.lot)===lotDevelopmentProfileKey(catalogLot.label))?.status)||'Disponível'):String(input.status??existing?.status??'Em planejamento').trim().slice(0,80);
  db.prepare(`INSERT INTO lot_development_profiles(id,kind,lot_key,title,quadra,area,value_cents,status,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,quadra=excluded.quadra,area=excluded.area,value_cents=excluded.value_cents,status=excluded.status,description=excluded.description,updated_at=excluded.updated_at`).run(id,kind,kind==='lot'?catalogLot.label:'',title,quadra,area,valueCents,status,description,existing?.createdAt||timestamp,timestamp);
  audit.run('lot_development_profiles',id,existing?'updated':'created',JSON.stringify({kind,lotKey:kind==='lot'?catalogLot.label:'',title,status,description}),timestamp);
  return listLotDevelopmentProfiles().find(profile=>profile.id===id)||null;
}
export function deleteLotDevelopmentProfile(id){
  const key=String(id||''),existing=db.prepare(`${lotDevelopmentProfileSelect} WHERE id=?`).get(key);
  if(!existing)return false;
  db.prepare(`DELETE FROM lot_development_profiles WHERE id=?`).run(key);
  audit.run('lot_development_profiles',key,'deleted',JSON.stringify({kind:existing.kind,lotKey:existing.lotKey}),now());
  return true;
}
const projectDocumentColumns=()=>db.prepare(`SELECT id,label,position,created_at AS createdAt FROM project_document_columns ORDER BY position,id`).all();
const projectDocumentSelect=`SELECT id,title,category,code,issuer,document_date AS documentDate,description,source_material_id AS sourceMaterialId,file_name AS fileName,file_type AS fileType,length(file_content) AS fileSize,properties_json AS propertiesJson,created_at AS createdAt,updated_at AS updatedAt FROM project_documents`;
const projectDocumentRow=row=>row?(({propertiesJson,...record})=>({...record,properties:JSON.parse(propertiesJson||'{}')}))(row):null;
export function listProjectDocuments(){return {documents:db.prepare(`${projectDocumentSelect} ORDER BY updated_at DESC,id`).all().map(projectDocumentRow),columns:projectDocumentColumns()};}
export function getProjectDocumentFile(id){const file=db.prepare(`SELECT file_name AS fileName,file_type AS fileType,file_content AS content FROM project_documents WHERE id=?`).get(String(id||''));return file?.content?.length?file:null;}
export function saveProjectDocument(input={}){
  const fail=message=>{throw Object.assign(new Error(message),{statusCode:400});};
  const id=String(input.id||'').trim()||`doc-${crypto.randomUUID()}`;
  const existing=db.prepare(`${projectDocumentSelect} WHERE id=?`).get(id);
  const title=String(input.title||'').trim(),category=String(input.category||'').trim();
  if(!title||title.length>140||!category||category.length>80)fail('Título e categoria válidos são obrigatórios.');
  const code=String(input.code||'').trim(),issuer=String(input.issuer||'').trim(),documentDate=String(input.documentDate||'').trim(),description=String(input.description||'').trim(),sourceMaterialId=String(input.sourceMaterialId||'').trim();
  if(code.length>60||issuer.length>100||description.length>800||sourceMaterialId.length>100||documentDate&&!/^\d{4}-\d{2}-\d{2}$/.test(documentDate))fail('Campos do documento inválidos.');
  const configured=new Set(projectDocumentColumns().map(column=>column.id));
  const properties={};
  if(input.properties&&typeof input.properties==='object'&&!Array.isArray(input.properties))for(const [key,value] of Object.entries(input.properties)){
    if(!configured.has(key)||String(value).length>500)fail('Propriedade documental inválida.');
    properties[key]=String(value).trim();
  }
  const encoded=String(input.dataUrl||'');
  let content=null,fileName='',fileType='';
  if(encoded){
    const match=encoded.match(/^data:([^;,]*);base64,([A-Za-z0-9+/=]+)$/);
    if(!match)fail('Arquivo em base64 inválido.');
    content=Buffer.from(match[2],'base64');
    fileName=String(input.fileName||'').trim();
    if(!content.length||content.length>25*1024*1024||fileName.length>180||!/\.(pdf|docx?|xlsx?|dwg|dxf|png|jpe?g|webp)$/i.test(fileName))fail('Arquivo incompatível ou maior que 25 MB.');
    const extension=fileName.split('.').at(-1).toLowerCase();
    fileType=({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',dwg:'application/octet-stream',dxf:'application/octet-stream'})[extension]||'application/octet-stream';
  }
  const timestamp=now();
  db.prepare(`INSERT INTO project_documents(id,title,category,code,issuer,document_date,description,source_material_id,file_name,file_type,file_content,properties_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,code=excluded.code,issuer=excluded.issuer,document_date=excluded.document_date,description=excluded.description,source_material_id=excluded.source_material_id,file_name=excluded.file_name,file_type=excluded.file_type,file_content=excluded.file_content,properties_json=excluded.properties_json,updated_at=excluded.updated_at`).run(id,title,category,code,issuer,documentDate,description,sourceMaterialId,content?fileName:existing?.fileName||'',content?fileType:existing?.fileType||'',content||getProjectDocumentFile(id)?.content||Buffer.alloc(0),JSON.stringify(properties),existing?.createdAt||timestamp,timestamp);
  audit.run('project_documents',id,existing?'updated':'created',JSON.stringify({title,category,fileName:content?fileName:existing?.fileName||''}),timestamp);
  return projectDocumentRow(db.prepare(`${projectDocumentSelect} WHERE id=?`).get(id));
}
export function deleteProjectDocument(id){const key=String(id||''),existing=db.prepare(`${projectDocumentSelect} WHERE id=?`).get(key);if(!existing)return false;if(['doc-proj-exec','doc-proj-licenses','doc-presentation-v3'].includes(key)||existing.sourceMaterialId)throw Object.assign(new Error('Este documento de referência não pode ser excluído.'),{statusCode:403});db.prepare(`DELETE FROM project_documents WHERE id=?`).run(key);audit.run('project_documents',key,'deleted',JSON.stringify({title:existing.title}),now());return true;}
export function createProjectDocumentColumn(input={}){
  const label=String(input.label||'').trim();if(!label||label.length>50)throw Object.assign(new Error('Nome da propriedade inválido.'),{statusCode:400});
  if(projectDocumentColumns().some(column=>column.label.toLocaleLowerCase('pt-BR')===label.toLocaleLowerCase('pt-BR')))throw Object.assign(new Error('Essa propriedade já existe.'),{statusCode:409});
  const id=`custom-${crypto.randomUUID()}`,timestamp=now(),position=Number(db.prepare(`SELECT COALESCE(MAX(position),-1)+1 AS position FROM project_document_columns`).get().position);
  db.prepare(`INSERT INTO project_document_columns(id,label,position,created_at) VALUES(?,?,?,?)`).run(id,label,position,timestamp);
  audit.run('project_document_columns',id,'created',JSON.stringify({label}),timestamp);return projectDocumentColumns().find(column=>column.id===id);
}
export function deleteProjectDocumentColumn(id){
  const key=String(id||''),column=projectDocumentColumns().find(row=>row.id===key);if(!column)return false;
  db.exec('BEGIN');try{
    for(const row of db.prepare(`SELECT id,properties_json AS propertiesJson FROM project_documents`).all()){
      const properties=JSON.parse(row.propertiesJson||'{}');if(!(key in properties))continue;delete properties[key];db.prepare(`UPDATE project_documents SET properties_json=?,updated_at=? WHERE id=?`).run(JSON.stringify(properties),now(),row.id);
    }
    db.prepare(`DELETE FROM project_document_columns WHERE id=?`).run(key);db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  audit.run('project_document_columns',key,'deleted',JSON.stringify({label:column.label}),now());return true;
}
const safeSaleName=(name='arquivo')=>String(name||'arquivo').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'arquivo';
const saleMimeExt=mime=>({'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[mime]||'');
const saleFileRows=saleId=>db.prepare(`SELECT id,sale_id AS saleId,kind,file_name AS fileName,mime_type AS mimeType,created_at AS createdAt FROM commercial_sale_files WHERE sale_id=? ORDER BY created_at`).all(saleId).map(row=>({...row,fileUrl:`/api/commercial-sales/${encodeURIComponent(saleId)}/files/${encodeURIComponent(row.id)}`}));
export function listCommercialSales(){return db.prepare(`${saleSelect} ORDER BY created_at DESC`).all().map(row=>({...row,files:saleFileRows(row.id)}));}
export function createCommercialSale(input={}){
  const id=asText(input.id)||`VEN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,timestamp=now();
  const files=Array.isArray(input.files)?input.files:[];
  if(files.length>8)throw Object.assign(new Error('No máximo 8 anexos por venda.'),{statusCode:400});
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
  const status=asText(input.status,current.status),notes=asText(input.notes,current.notes),timestamp=now(),files=Array.isArray(input.files)?input.files:[];
  if(files.length>8)throw Object.assign(new Error('No máximo 8 anexos por atualização.'),{statusCode:400});
  const createdPaths=[];
  db.exec('BEGIN');
  try{
    db.prepare(`UPDATE commercial_sales SET status=?,notes=?,updated_at=? WHERE id=?`).run(status,notes,timestamp,asText(id));
    let totalBytes=0;
    for(let index=0;index<files.length;index++){
      const file=files[index]||{},dataUrl=String(file.dataUrl||''),match=dataUrl.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if(!match)throw new Error('Anexos devem ser PDF, JPG, PNG ou WEBP.');
      const bytes=Buffer.from(match[2],'base64'); totalBytes+=bytes.length;
      if(!bytes.length)throw new Error('Arquivo comercial vazio.');
      if(bytes.length>12_000_000||totalBytes>30_000_000)throw new Error('Anexos da venda excedem o limite permitido.');
      const mimeType=match[1],requested=safeSaleName(file.fileName||`arquivo-${index+1}`),ext=saleMimeExt(mimeType),fileName=requested.toLowerCase().endsWith(ext)?requested:`${requested}${ext}`;
      const fileId=`ARQ-${Date.now().toString(36).toUpperCase()}-${index}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,storagePath=join(salesRoot,`${id}-${fileId}-${fileName}`);
      writeFileSync(storagePath,bytes,{flag:'wx'});createdPaths.push(storagePath);
      db.prepare(`INSERT INTO commercial_sale_files(id,sale_id,kind,file_name,mime_type,storage_path,created_at) VALUES(?,?,?,?,?,?,?)`).run(fileId,asText(id),asText(file.kind,'attachment'),fileName,mimeType,storagePath,timestamp);
    }
    audit.run('commercial_sales',asText(id),'updated',JSON.stringify({status,documentValidation:Boolean(input.documentValidation),files:files.length}),timestamp);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');for(const filePath of createdPaths)try{unlinkSync(filePath)}catch{}throw error;}
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


const safeCashAttachmentName=(name='anexo-caixa')=>String(name||'anexo-caixa').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'anexo-caixa';
const cashAttachmentMimeExt={'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
const parseCashAttachment=(input={})=>{
  const attachment=input?.attachment&&typeof input.attachment==='object'?input.attachment:null;
  if(!attachment?.dataUrl)return null;
  const match=String(attachment.dataUrl).match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match)throw Object.assign(new Error('Anexo deve ser PDF, JPG, PNG ou WEBP.'),{statusCode:400});
  const bytes=Buffer.from(match[2],'base64');
  if(!bytes.length||bytes.length>12_000_000)throw Object.assign(new Error('Anexo inválido ou maior que 12 MB.'),{statusCode:400});
  return {bytes,mimeType:match[1],fileName:safeCashAttachmentName(attachment.fileName||'anexo-caixa'),ext:cashAttachmentMimeExt[match[1]]||''};
};
export function listCashFlowEntries(){
  const rows=db.prepare(`SELECT id,entry_date AS date,kind,lot_key AS lotKey,category,stage,description,amount_cents AS amountCents,sale_id AS saleId,broker_name AS brokerName,repasse_reason_id AS repasseReasonId,fiscal_document_type AS fiscalDocumentType,fiscal_document_number AS fiscalDocumentNumber,fiscal_issuer AS fiscalIssuer,fiscal_issue_date AS fiscalIssueDate,fiscal_status AS fiscalStatus,created_at AS createdAt FROM cash_flow_entries ORDER BY entry_date DESC,created_at DESC`).all();
  return rows.map(row=>{
    const attachments=db.prepare(`SELECT id,file_name AS fileName,mime_type AS mimeType,created_at AS createdAt FROM cash_flow_attachments WHERE cash_flow_id=? ORDER BY created_at DESC`).all(row.id)
      .map(file=>({...file,fileUrl:'/api/cash-flow/'+encodeURIComponent(row.id)+'/attachments/'+encodeURIComponent(file.id)+'/file'}));
    return {...row,attachments,...(attachments[0]?{attachment:attachments[0]}:{})};
  });
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
  let lotKey=asText(input.lotKey).trim();
  let stageName=asText(input.stage).trim();
  const saleId=asText(input.saleId).trim(),brokerName=asText(input.brokerName).trim(),repasseReasonId=asText(input.repasseReasonId).trim();
  const catalogLot=priceCatalogLot(lotKey);
  if(lotKey&&(!catalogLot||kind!=='entrada'))throw Object.assign(new Error('A entrada deve estar vinculada a um lote válido da tabela de preços.'),{statusCode:400});
  if(catalogLot)lotKey=catalogLot.label;
  if(saleId){
    const sale=db.prepare(`SELECT id,lot,broker FROM commercial_sales WHERE id=?`).get(saleId);
    if(kind!=='entrada'||!sale)throw Object.assign(new Error('O repasse exige uma venda persistida e uma entrada de caixa.'),{statusCode:400});
    if(normalizedLotKey(sale.lot)!==normalizedLotKey(lotKey))throw Object.assign(new Error('O lote da entrada não corresponde ao lote da venda selecionada.'),{statusCode:400});
    if(!brokerName)throw Object.assign(new Error('Selecione o corretor responsável pelo repasse.'),{statusCode:400});
    if(String(sale.broker||'').trim()&&String(sale.broker).trim().toLocaleLowerCase('pt-BR')!==brokerName.toLocaleLowerCase('pt-BR'))throw Object.assign(new Error('O corretor da entrada difere do corretor registrado na venda.'),{statusCode:400});
    const rule=db.prepare(`SELECT active FROM repasse_broker_rules WHERE broker_name=? COLLATE NOCASE AND lot_key=? COLLATE NOCASE`).get(brokerName,lotKey);
    if(!rule||!rule.active)throw Object.assign(new Error('Configure uma regra ativa de comissão para o corretor antes de registrar o repasse.'),{statusCode:400});
    const reason=db.prepare(`SELECT active FROM commission_reasons WHERE id=?`).get(repasseReasonId);
    if(!reason||!reason.active)throw Object.assign(new Error('Selecione uma razão de repasse ativa.'),{statusCode:400});
    stageName=stageName||officeStageDestination?.name||'';
    const stage=db.prepare(`SELECT name FROM stages WHERE project_id=? AND lower(name)=lower(?)`).get(applicationProjectId,stageName);
    if(!stage)throw Object.assign(new Error('Selecione uma etapa de destino cadastrada para o repasse.'),{statusCode:400});
    stageName=stage.name;
  }
  if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw Object.assign(new Error('Informe um valor de caixa maior que zero.'),{statusCode:400});
  const attachment=parseCashAttachment(input);
  const fiscalStatus=['pendente','em_conferencia','conferido','nao_aplicavel'].includes(input.fiscalStatus)?input.fiscalStatus:'pendente';
  const fiscalDocumentType=asText(input.fiscalDocumentType);
  const fiscalDocumentNumber=asText(input.fiscalDocumentNumber);
  const fiscalIssuer=asText(input.fiscalIssuer);
  const fiscalIssueDate=asText(input.fiscalIssueDate);
  if(fiscalStatus==='conferido'&&(!fiscalDocumentType||!fiscalDocumentNumber||!fiscalIssuer||!fiscalIssueDate||!attachment))throw Object.assign(new Error('Conferência fiscal exige tipo, número, emitente, data e documento anexado.'),{statusCode:400});
  db.prepare(`INSERT INTO cash_flow_entries(id,entry_date,kind,lot_key,category,stage,description,amount_cents,sale_id,broker_name,repasse_reason_id,fiscal_document_type,fiscal_document_number,fiscal_issuer,fiscal_issue_date,fiscal_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,asText(input.date,new Date().toISOString().slice(0,10)),kind,lotKey,asText(input.category),stageName,asText(input.description),amountCents,saleId,brokerName,repasseReasonId,fiscalDocumentType,fiscalDocumentNumber,fiscalIssuer,fiscalIssueDate,fiscalStatus,timestamp);
  if(attachment){
    const ext=attachment.ext,base=attachment.fileName.toLowerCase().endsWith(ext)?attachment.fileName:`${attachment.fileName}${ext}`,storagePath=join(cashFlowAttachmentsRoot,`${id}-${base}`),attachmentId=`CXA-${Date.now().toString(36).toUpperCase()}`;
    try{
      writeFileSync(storagePath,attachment.bytes,{flag:'wx'});
      db.prepare(`INSERT INTO cash_flow_attachments(id,cash_flow_id,file_name,mime_type,storage_path,created_at) VALUES(?,?,?,?,?,?)`).run(attachmentId,id,base,attachment.mimeType,storagePath,timestamp);
    }catch(error){
      try{if(existsSync(storagePath))unlinkSync(storagePath);}catch{}
      db.prepare(`DELETE FROM cash_flow_entries WHERE id=?`).run(id);
      throw error;
    }
  }
  audit.run('cash_flow_entries',id,'created',JSON.stringify({kind,lotKey,amountCents,stage:stageName,fiscalStatus,fiscalDocumentType,fiscalDocumentNumber}),timestamp);
  return listCashFlowEntries().find(row=>row.id===id);
}
export function updateRepasseEntryV1(id,input={}){
  const entryId=asText(id),current=db.prepare(`SELECT id,sale_id AS saleId,stage FROM cash_flow_entries WHERE id=? AND sale_id<>''`).get(entryId);
  if(!current)throw Object.assign(new Error('Entrada de repasse não encontrada.'),{statusCode:404});
  const sale=db.prepare(`SELECT id,lot,broker FROM commercial_sales WHERE id=?`).get(current.saleId);
  const lot=priceCatalogLot(input.lotKey),brokerName=asText(input.brokerName).trim(),reasonId=asText(input.repasseReasonId).trim(),amountCents=Math.round(Number(input.amountCents)||0),date=asText(input.date);
  if(!sale||!lot||normalizedLotKey(lot.label)!==normalizedLotKey(sale.lot)||normalizedLotKey(input.lotKey)!==normalizedLotKey(sale.lot))throw Object.assign(new Error('O lote não corresponde à venda selecionada.'),{statusCode:400});
  if(!brokerName||String(sale.broker||'').trim().toLocaleLowerCase('pt-BR')!==brokerName.toLocaleLowerCase('pt-BR'))throw Object.assign(new Error('O corretor não corresponde ao registrado na venda.'),{statusCode:400});
  const rule=db.prepare(`SELECT active FROM repasse_broker_rules WHERE broker_name=? COLLATE NOCASE AND lot_key=? COLLATE NOCASE`).get(brokerName,lot.label);
  const reason=db.prepare(`SELECT active FROM commission_reasons WHERE id=?`).get(reasonId);
  if(!rule?.active)throw Object.assign(new Error('Configure uma regra ativa de comissão para este corretor e lote.'),{statusCode:400});
  if(!reason?.active)throw Object.assign(new Error('Selecione uma razão de repasse ativa.'),{statusCode:400});
  if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw Object.assign(new Error('Informe um valor recebido maior que zero.'),{statusCode:400});
  const parsedDate=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(`${date}T12:00:00Z`):null;
  if(!parsedDate||Number.isNaN(parsedDate.valueOf())||parsedDate.toISOString().slice(0,10)!==date)throw Object.assign(new Error('Informe uma data de recebimento válida.'),{statusCode:400});
  const requestedStage=asText(input.stage,current.stage||officeStageDestination?.name||'').trim();
  const destinationStage=db.prepare(`SELECT name FROM stages WHERE project_id=? AND lower(name)=lower(?)`).get(applicationProjectId,requestedStage);
  if(!destinationStage)throw Object.assign(new Error('Selecione uma etapa de destino cadastrada para o repasse.'),{statusCode:400});
  const timestamp=now();
  db.prepare(`UPDATE cash_flow_entries SET entry_date=?,lot_key=?,stage=?,category='Repasse',description=?,amount_cents=?,broker_name=?,repasse_reason_id=? WHERE id=?`).run(date,lot.label,destinationStage.name,asText(input.description),amountCents,brokerName,reasonId,entryId);
  audit.run('cash_flow_entries',entryId,'repasse-updated',JSON.stringify({saleId:sale.id,lotKey:lot.label,stage:destinationStage.name,brokerName,repasseReasonId:reasonId,amountCents}),timestamp);
  return listCashFlowEntries().find(row=>row.id===entryId);
}
export function deleteRepasseEntryV1(id){
  const entryId=asText(id),files=db.prepare(`SELECT storage_path AS storagePath FROM cash_flow_attachments WHERE cash_flow_id=?`).all(entryId),row=db.prepare(`SELECT id FROM cash_flow_entries WHERE id=? AND sale_id<>''`).get(entryId);
  if(!row)return false;
  db.prepare(`DELETE FROM cash_flow_attachments WHERE cash_flow_id=?`).run(entryId);
  db.prepare(`DELETE FROM cash_flow_entries WHERE id=?`).run(entryId);
  for(const file of files)try{if(existsSync(file.storagePath))unlinkSync(file.storagePath);}catch{}
  audit.run('cash_flow_entries',entryId,'repasse-deleted','{}',now());
  return true;
}
export function addCashFlowAttachment(id,input={}){
  const cashFlowId=asText(id);
  if(!db.prepare(`SELECT id FROM cash_flow_entries WHERE id=?`).get(cashFlowId))throw Object.assign(new Error('Lançamento de caixa não encontrado.'),{statusCode:404});
  const attachment=parseCashAttachment(input);
  if(!attachment)throw Object.assign(new Error('Selecione um PDF ou imagem para anexar.'),{statusCode:400});
  const attachmentId=`CXA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const base=attachment.fileName.toLowerCase().endsWith(attachment.ext)?attachment.fileName:`${attachment.fileName}${attachment.ext}`;
  const storagePath=join(cashFlowAttachmentsRoot,`${cashFlowId}-${attachmentId}-${base}`);
  writeFileSync(storagePath,attachment.bytes,{flag:'wx'});
  try{
    db.prepare(`INSERT INTO cash_flow_attachments(id,cash_flow_id,file_name,mime_type,storage_path,created_at) VALUES(?,?,?,?,?,?)`).run(attachmentId,cashFlowId,base,attachment.mimeType,storagePath,now());
  }catch(error){try{unlinkSync(storagePath)}catch{}throw error}
  audit.run('cash_flow_attachments',attachmentId,'created',JSON.stringify({cashFlowId,fileName:base}),now());
  return listCashFlowEntries().find(row=>row.id===cashFlowId);
}
export function getCashFlowAttachment(id,attachmentId=''){
  const row=attachmentId
    ? db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,storage_path AS storagePath FROM cash_flow_attachments WHERE cash_flow_id=? AND id=?`).get(asText(id),asText(attachmentId))
    : db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,storage_path AS storagePath FROM cash_flow_attachments WHERE cash_flow_id=? ORDER BY created_at DESC LIMIT 1`).get(asText(id));
  return row&&existsSync(row.storagePath)?row:null;
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
const repassePlanSelect=`SELECT sale_id AS saleId,contract_price_cents AS contractPriceCents,annual_interest_percent AS annualInterestPercent,monthly_installments AS monthlyInstallments,semiannual_installments AS semiannualInstallments,semiannual_principal_percent AS semiannualPrincipalPercent,monthly_first_due_date AS monthlyFirstDueDate,semiannual_first_due_date AS semiannualFirstDueDate,updated_at AS updatedAt FROM repasse_sale_plans`;
export function listRepasseOperationsV1(){
  const entries=listCashFlowEntries(),sales=listCommercialSales(),brokerRules=db.prepare(`SELECT broker_name AS brokerName,lot_key AS lotKey,commission_percent AS commissionPercent,active,updated_at AS updatedAt FROM repasse_broker_rules ORDER BY broker_name COLLATE NOCASE,lot_key COLLATE NOCASE`).all().map(row=>({...row,active:Boolean(row.active)})),plans=db.prepare(`${repassePlanSelect} ORDER BY sale_id`).all();
  return {sales:sales.map(sale=>({...sale,tablePrice:priceCatalogLot(sale.lot),plan:plans.find(plan=>plan.saleId===sale.id)||null,brokerRule:brokerRules.find(rule=>rule.brokerName.toLocaleLowerCase('pt-BR')===String(sale.broker||'').toLocaleLowerCase('pt-BR')&&normalizedLotKey(rule.lotKey)===normalizedLotKey(sale.lot))||null,receipts:entries.filter(entry=>entry.saleId===sale.id&&entry.kind==='entrada')})),entries:entries.filter(entry=>entry.saleId),brokerRules,reasons:listCommissionReasons(),stages:listStagesAdmin().map(stage=>({id:stage.id,name:stage.name}))};
}
export function saveRepasseBrokerRuleV1(input={}){
  const brokerName=asText(input.brokerName).trim(),lotKey=asText(input.lotKey).trim(),commissionPercent=Number(input.commissionPercent);
  if(!brokerName||brokerName.length>160)throw Object.assign(new Error('Selecione um corretor cadastrado nas vendas.'),{statusCode:400});
  const catalogLot=priceCatalogLot(lotKey);
  if(!lotKey||!catalogLot)throw Object.assign(new Error('Selecione um lote válido da tabela de preços.'),{statusCode:400});
  if(!Number.isFinite(commissionPercent)||commissionPercent<0||commissionPercent>100)throw Object.assign(new Error('A comissão do corretor deve estar entre 0 e 100%.'),{statusCode:400});
  if(!listCommercialSales().some(sale=>String(sale.broker||'').toLocaleLowerCase('pt-BR')===brokerName.toLocaleLowerCase('pt-BR')&&normalizedLotKey(sale.lot)===normalizedLotKey(catalogLot.label)))throw Object.assign(new Error('O vínculo entre corretor e lote não existe em uma venda persistida.'),{statusCode:404});
  const timestamp=now();
  db.prepare(`INSERT INTO repasse_broker_rules(broker_name,lot_key,commission_percent,active,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(broker_name,lot_key) DO UPDATE SET commission_percent=excluded.commission_percent,active=1,updated_at=excluded.updated_at`).run(brokerName,catalogLot.label,commissionPercent,timestamp);
  audit.run('repasse_broker_rules',`${brokerName}:${catalogLot.label}`,'upserted',JSON.stringify({commissionPercent}),timestamp);
  return db.prepare(`SELECT broker_name AS brokerName,lot_key AS lotKey,commission_percent AS commissionPercent,active,updated_at AS updatedAt FROM repasse_broker_rules WHERE broker_name=? COLLATE NOCASE AND lot_key=? COLLATE NOCASE`).get(brokerName,catalogLot.label);
}
export function deleteRepasseBrokerRuleV1(brokerName,lotKey){
  const broker=asText(brokerName).trim(),lot=priceCatalogLot(lotKey);
  if(!lot)return false;
  const result=db.prepare(`DELETE FROM repasse_broker_rules WHERE broker_name=? COLLATE NOCASE AND lot_key=? COLLATE NOCASE`).run(broker,lot.label);
  if(result.changes)audit.run('repasse_broker_rules',`${broker}:${lot.label}`,'deleted','{}',now());
  return result.changes>0;
}
export function saveRepasseSalePlanV1(saleId,input={}){
  const sale=db.prepare(`SELECT id,lot,value_cents AS valueCents FROM commercial_sales WHERE id=?`).get(asText(saleId));
  if(!sale)throw Object.assign(new Error('Venda persistida não encontrada.'),{statusCode:404});
  const tableLot=priceCatalogLot(sale.lot);
  const contractPriceCents=Math.round(Number(input.contractPriceCents)||0),annualInterestPercent=Number(input.annualInterestPercent),monthlyInstallments=Math.floor(Number(input.monthlyInstallments)||0),semiannualInstallments=Math.floor(Number(input.semiannualInstallments)||0),semiannualPrincipalPercent=Number(input.semiannualPrincipalPercent)||0,monthlyFirstDueDate=asText(input.monthlyFirstDueDate),semiannualFirstDueDate=asText(input.semiannualFirstDueDate);
  if(!tableLot)throw Object.assign(new Error('A venda não corresponde a um lote do quadro de preços.'),{statusCode:400});
  if(!Number.isSafeInteger(contractPriceCents)||contractPriceCents<=0)throw Object.assign(new Error('Informe o valor contratual em centavos.'),{statusCode:400});
  if(!Number.isFinite(annualInterestPercent)||annualInterestPercent<0||annualInterestPercent>100)throw Object.assign(new Error('Informe uma taxa anual de juros entre 0 e 100%.'),{statusCode:400});
  if(monthlyInstallments<0||monthlyInstallments>600||semiannualInstallments<0||semiannualInstallments>100||monthlyInstallments+semiannualInstallments===0)throw Object.assign(new Error('Configure ao menos uma parcela mensal ou semestral.'),{statusCode:400});
  if(semiannualPrincipalPercent<0||semiannualPrincipalPercent>100||(semiannualInstallments===0&&semiannualPrincipalPercent!==0)||(semiannualInstallments>0&&semiannualPrincipalPercent===0)||(monthlyInstallments===0&&semiannualPrincipalPercent!==100)||(monthlyInstallments>0&&semiannualInstallments>0&&(semiannualPrincipalPercent===100||semiannualPrincipalPercent===0)))throw Object.assign(new Error('A divisão do principal entre parcelas mensais e semestrais não é válida.'),{statusCode:400});
  const validPlanDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(`${value}T12:00:00Z`);return !Number.isNaN(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value&&value>=new Date().toISOString().slice(0,10);};
  if(monthlyInstallments>0&&!validPlanDate(monthlyFirstDueDate))throw Object.assign(new Error('Informe o primeiro vencimento mensal atual ou futuro.'),{statusCode:400});
  if(semiannualInstallments>0&&!validPlanDate(semiannualFirstDueDate))throw Object.assign(new Error('Informe o primeiro vencimento semestral atual ou futuro.'),{statusCode:400});
  const timestamp=now();
  db.prepare(`INSERT INTO repasse_sale_plans(sale_id,contract_price_cents,annual_interest_percent,monthly_installments,semiannual_installments,semiannual_principal_percent,monthly_first_due_date,semiannual_first_due_date,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(sale_id) DO UPDATE SET contract_price_cents=excluded.contract_price_cents,annual_interest_percent=excluded.annual_interest_percent,monthly_installments=excluded.monthly_installments,semiannual_installments=excluded.semiannual_installments,semiannual_principal_percent=excluded.semiannual_principal_percent,monthly_first_due_date=excluded.monthly_first_due_date,semiannual_first_due_date=excluded.semiannual_first_due_date,updated_at=excluded.updated_at`).run(sale.id,contractPriceCents,annualInterestPercent,monthlyInstallments,semiannualInstallments,semiannualPrincipalPercent,monthlyFirstDueDate||null,semiannualFirstDueDate||null,timestamp);
  audit.run('repasse_sale_plans',sale.id,'upserted',JSON.stringify({contractPriceCents,annualInterestPercent,monthlyInstallments,semiannualInstallments,semiannualPrincipalPercent}),timestamp);
  return db.prepare(`${repassePlanSelect} WHERE sale_id=?`).get(sale.id);
}
export function deleteRepasseSalePlanV1(saleId){
  const id=asText(saleId),result=db.prepare(`DELETE FROM repasse_sale_plans WHERE sale_id=?`).run(id);
  if(result.changes)audit.run('repasse_sale_plans',id,'deleted','{}',now());
  return result.changes>0;
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

export function listRecords(){return db.prepare(`${recordSelect} ORDER BY r.record_date DESC,r.record_time DESC,r.created_at DESC`).all().map(parseRecordRow);}
const serviceRequestSelect=`SELECT id,title,description,domain,stage_key AS stageKey,activity_id AS activityId,status,requested_by AS requestedBy,requested_by_uid AS requestedByUid,created_at AS createdAt,updated_at AS updatedAt FROM service_requests`;
const serviceRequestFiles=id=>db.prepare(`SELECT id,file_name AS fileName,mime_type AS mimeType,created_at AS createdAt FROM service_request_files WHERE request_id=? ORDER BY created_at,id`).all(id).map(file=>({...file,fileUrl:`/api/service-requests/${encodeURIComponent(id)}/files/${encodeURIComponent(file.id)}`}));
export function listServiceRequests(actor){const scoped=actor&&!['owner','admin','developer'].includes(actor.role);return (scoped?db.prepare(`${serviceRequestSelect} WHERE requested_by_uid=? ORDER BY created_at DESC`).all(actor.uid):db.prepare(`${serviceRequestSelect} ORDER BY created_at DESC`).all()).map(row=>({...row,files:serviceRequestFiles(row.id)}));}
export function getServiceRequest(id){const row=db.prepare(`${serviceRequestSelect} WHERE id=?`).get(id);return row?{...row,files:serviceRequestFiles(id)}:null;}
const serviceFileName=name=>String(name||'arquivo').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'arquivo';
export function addServiceRequestFiles(requestId,files=[]){
  if(!getServiceRequest(requestId))throw Object.assign(new Error('Solicitação não encontrada.'),{statusCode:404});
  if(!Array.isArray(files)||files.length>5)throw Object.assign(new Error('Anexe no máximo cinco arquivos por envio.'),{statusCode:400});
  const prepared=files.map(input=>{
    const fileName=serviceFileName(input.fileName),dataUrl=String(input.dataUrl||'');
    const match=dataUrl.match(/^data:([\w.+/-]+);base64,([A-Za-z0-9+/=]+)$/);
    const ext=fileName.toLowerCase().split('.').pop();
    const mimeType=match?.[1]||'';
    const valid=['image/png','image/jpeg','image/webp','application/pdf'].includes(mimeType)||(['dwg','dxf'].includes(ext)&&['application/octet-stream','application/acad','image/vnd.dwg','application/dxf'].includes(mimeType));
    const bytes=match?Buffer.from(match[2],'base64'):Buffer.alloc(0);
    if(!valid||!bytes.length||bytes.length>10_000_000)throw Object.assign(new Error('Arquivo inválido: use imagem, PDF, DWG ou DXF com até 10 MB.'),{statusCode:400});
    return {fileName,mimeType,bytes};
  });
  const created=[];
  try{
    for(const input of prepared){
      const id=`SRF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,storagePath=join(serviceRequestFilesRoot,`${id}-${input.fileName}`),timestamp=now();
      writeFileSync(storagePath,input.bytes,{flag:'wx'});
      created.push({id,storagePath});
      db.prepare(`INSERT INTO service_request_files(id,request_id,file_name,mime_type,storage_path,created_at) VALUES(?,?,?,?,?,?)`).run(id,requestId,input.fileName,input.mimeType,storagePath,timestamp);
    }
  }catch(error){for(const item of created){db.prepare(`DELETE FROM service_request_files WHERE id=?`).run(item.id);try{unlinkSync(item.storagePath)}catch{}}throw error;}
  db.prepare(`UPDATE service_requests SET updated_at=? WHERE id=?`).run(now(),requestId);
  return getServiceRequest(requestId);
}
export function createServiceRequest(input={},actor={}){
  const title=asText(input.title).slice(0,140),description=asText(input.description).slice(0,4000);
  if(title.length<4||description.length<4)throw Object.assign(new Error('Informe o serviço solicitado e sua descrição.'),{statusCode:400});
  const domain=asText(input.domain,'geral').slice(0,60),id=`SR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,timestamp=now();
  db.prepare(`INSERT INTO service_requests(id,title,description,domain,stage_key,activity_id,status,requested_by,requested_by_uid,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,title,description,domain,asText(input.stageKey).slice(0,80),asText(input.activityId).slice(0,80),'triage',asText(actor.name,'Usuário'),asText(actor.uid),timestamp,timestamp);
  try { if(input.files?.length)addServiceRequestFiles(id,input.files); }
  catch(error){db.prepare(`DELETE FROM service_requests WHERE id=?`).run(id);throw error;}
  audit.run('service_requests',id,'created',JSON.stringify({title,domain,stageKey:asText(input.stageKey),activityId:asText(input.activityId),fileCount:input.files?.length||0}),timestamp);
  return getServiceRequest(id);
}
export function updateServiceRequest(id,input={}){
  if(!getServiceRequest(id))return null;
  const status=String(input.status||'');
  if(!['triage','planned','in_progress','waiting_files','completed','cancelled'].includes(status))throw Object.assign(new Error('Estado da solicitação inválido.'),{statusCode:400});
  db.prepare(`UPDATE service_requests SET status=?,updated_at=? WHERE id=?`).run(status,now(),id);
  audit.run('service_requests',id,'status_changed',JSON.stringify({status}),now());
  return getServiceRequest(id);
}
export function getServiceRequestFile(requestId,fileId){const row=db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,storage_path AS storagePath FROM service_request_files WHERE request_id=? AND id=?`).get(requestId,fileId);return row&&existsSync(row.storagePath)?row:null;}
export function getRecord(id){return parseRecordRow(db.prepare(`${recordSelect} WHERE r.id=?`).get(id));}
export function createRecord(input){
  const value=toRecordInput(input),id=asText(input.id)||`REG-${String(Date.now()).slice(-8)}`,timestamp=now();
  db.prepare(`INSERT INTO records(id,project_id,stage_id,activity_id,record_date,record_time,responsible_id,responsible_name,details,status,evidence_uri,map_area,properties_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,value.projectId,value.stageId,value.activityId,value.data,value.hora,value.responsibleId,value.responsavel,value.detalhes,value.status,value.evidenceUri,value.mapArea,value.propertiesJson,timestamp,timestamp);
  if(input?.source==='chat-visual'){
    const material=input.allocationTarget==='material', name=asText(input.atividade||input.activityName||input.materialName),
      planned=new Date();
    planned.setDate(planned.getDate()+1);
    while(planned.getDay()===0||planned.getDay()===6)planned.setDate(planned.getDate()+1);
    const date=planned.toISOString().slice(0,10);
    const occupied=new Set(db.prepare(`SELECT start_time FROM agenda_events WHERE event_date=? AND hidden=0`).all(date).map(row=>row.start_time));
    const start=Array.from({length:18},(_,index)=>`${String(8+Math.floor(index/2)).padStart(2,'0')}:${index%2?'30':'00'}`).find(time=>!occupied.has(time))||'08:00';
    const materialName=asText(input.properties?.find(property=>property.id==='allocation_material')?.value||input.materialName);
    db.prepare(`UPDATE agenda_events SET title=?,stage_key=?,stage_name=?,activity_id=?,activity_name=?,event_date=?,start_time=?,status='Pendente',notes=?,material_ids_json=?,updated_at=? WHERE source_type='record' AND source_id=? AND user_edited=0`).run(
      material?`Revisar material: ${materialName||name}`:`Planejar serviço: ${name}`,asText(input.stageKey||input.etapa),asText(input.etapa),asText(input.activityId),name,date,start,
      asText(input.detalhes).slice(0,2000),JSON.stringify(materialName?[materialName]:[]),timestamp,id);
  }
  audit.run('records',id,'created',JSON.stringify(value),timestamp); return getRecord(id);
}
export function createMaterialTransition(input={}){
  const materialId=asText(input.materialId).slice(0,100),name=asText(input.name).slice(0,120);
  const stageName=asText(input.stageName),unit=asText(input.unit,'un.').slice(0,20),stageId=input.stageId==null||input.stageId===''?null:Number(input.stageId),activityName=asText(input.activityName).slice(0,160);
  const before=input.before||{},after=input.after||{};
  const quantity=Number(after.quantity),previousQuantity=before.quantity==null?null:Number(before.quantity);
  if(!materialId||!name||!stageName||!Number.isFinite(quantity)||quantity<0||!Number.isFinite(previousQuantity??0))throw Object.assign(new Error('Material, etapa e quantidades válidas são obrigatórios.'),{statusCode:400});
  if(stageId!==null&&(!Number.isInteger(stageId)||!db.prepare(`SELECT 1 FROM stages WHERE id=?`).get(stageId)))throw Object.assign(new Error('Etapa operacional inexistente.'),{statusCode:400});
  const description=asText(after.description).slice(0,4000),previousDescription=asText(before.description).slice(0,4000);
  if(!description)throw Object.assign(new Error('Descreva a mudança do material.'),{statusCode:400});
  const documentList=Array.isArray(input.documents)?input.documents.slice(0,3):[];
  const stamp=now(),number=asText(input.materialNumber,materialId).slice(0,80),status=asText(after.status,'Planejado').slice(0,60);
  const property=(id,label,type,value)=>({id,label,type,value:String(value??'')});
  const properties=[property('material_transition','Transição de material','text','true'),property('material_id','ID do material','text',materialId),property('material_name','Material','text',name),property('material_number','Número associado','text',number),property('before_quantity','Quantidade anterior','number',previousQuantity??''),property('before_unit','Unidade anterior','text',before.unit||unit),property('before_description','Descrição anterior','text',previousDescription),property('before_status','Estado anterior','text',before.status||''),property('before_date','Data do estado anterior','date',before.updatedAt?.slice(0,10)||''),property('after_quantity','Nova quantidade','number',quantity),property('after_unit','Nova unidade','text',unit),property('after_description','Nova descrição','text',description),property('after_status','Novo estado','text',status),property('document_ids','Comprovantes associados','text',JSON.stringify(documentList.map(item=>item.id))),property('transition_date','Data da transição','date',stamp.slice(0,10))];
  db.exec('BEGIN');
  try{
    const record=createRecord({id:`REG-MAT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,obra:'Aliança Park',etapa:stageName,atividade:`Material: ${name}`,responsavel:asText(input.responsible,'Equipe de suprimentos'),data:stamp.slice(0,10),hora:stamp.slice(11,16),detalhes:`Material ${number} · ${name}\n${previousQuantity??'—'} ${before.unit||unit} → ${quantity} ${unit}\nAntes: ${previousDescription||'Sem descrição'}\nDepois: ${description}\nComprovantes: ${documentList.map(item=>item.fileName).join(', ')||'nenhum'}`,status:'Pendente',evidenceUri:documentList[0]?.fileUrl||null,properties});
    const dbStatus=/atenç/i.test(status)?'atencao':/crític/i.test(status)?'critico':'bom';
    db.prepare(`INSERT INTO materials(id,name,unit,planned_quantity,received_quantity,used_quantity,status,stage_id,activity_name,scope,updated_at) VALUES(?,?,?,?,0,0,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,unit=excluded.unit,planned_quantity=excluded.planned_quantity,status=excluded.status,stage_id=excluded.stage_id,activity_name=excluded.activity_name,scope=excluded.scope,updated_at=excluded.updated_at`).run(materialId,name,unit,quantity,dbStatus,stageId,activityName,description,stamp);
    audit.run('materials',materialId,'transition',JSON.stringify({recordId:record.id,before,after:{quantity,unit,status,description},documentIds:documentList.map(item=>item.id)}),stamp);
    db.exec('COMMIT');
    return {record,material:{id:materialId,name,quantity,unit,status,description,stageId,activityName,updatedAt:stamp},documents:documentList};
  }catch(error){db.exec('ROLLBACK');throw error;}
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
  db.prepare(`UPDATE records SET project_id=?,stage_id=?,activity_id=?,record_date=?,record_time=?,responsible_id=?,responsible_name=?,details=?,status=?,evidence_uri=?,map_area=?,properties_json=?,updated_at=? WHERE id=?`).run(value.projectId,value.stageId,value.activityId,value.data,value.hora,value.responsibleId,value.responsavel,value.detalhes,value.status,value.evidenceUri,value.mapArea,value.propertiesJson,timestamp,id);
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
const stageInputError=message=>{const error=new Error(message);error.statusCode=400;return error;};

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
  const materials=db.prepare(`SELECT id,name,unit,planned_quantity AS plannedQuantity,received_quantity AS receivedQuantity,used_quantity AS usedQuantity,status,stage_id AS stageId,activity_name AS activityName,scope,updated_at AS updatedAt FROM materials WHERE stage_id=? ORDER BY name`).all(s.id);
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
    organizationRequest:safeJson(aiConfig.execution_profile_json,{}).aiOrganization?.request||'',
    organizationContext:safeJson(aiConfig.execution_profile_json,{}).aiOrganization?.context||'',
    updatedAt:aiConfig.updated_at
  }:null;
  const purchaseTotal=purchases.reduce((a,p)=>a+(Number(p.valueCents)||0),0);
  const cashIn=cashEntries.filter(e=>e.kind==='entrada').reduce((a,e)=>a+(Number(e.amountCents)||0),0);
  const cashOut=cashEntries.filter(e=>e.kind==='saida').reduce((a,e)=>a+(Number(e.amountCents)||0),0);
  return {...s,activities,purchases,materials,records,cashEntries,receipts,outsourcing,relations,aiConfig:ai,summary:{activitiesCount:activities.length,purchasesCount:purchases.length,purchaseTotalCents:purchaseTotal,recordsCount:records.length,cashInCents:cashIn,cashOutCents:cashOut,receiptsCount:receipts.length,outsourcingCount:outsourcing.length}};
}

export function updateStageAdmin(stageId,input={}){
  const current=db.prepare(`SELECT * FROM stages WHERE id=?`).get(stageId);if(!current)return null;
  const name=String(input.name??current.name).trim(),owner=String(input.owner??current.owner??'').trim();
  if(!name)throw stageInputError('Informe o nome da etapa.');
  const duplicate=db.prepare(`SELECT id FROM stages WHERE project_id=? AND lower(name)=lower(?) AND id<>?`).get(current.project_id,name,stageId);
  if(duplicate)throw stageInputError('Já existe uma etapa com este nome.');
  const status=String(input.status??current.status).trim();if(!status)throw stageInputError('Informe o estado da etapa.');
  const rawProgress=Number(input.progress??current.progress);if(!Number.isFinite(rawProgress)||rawProgress<0||rawProgress>100)throw stageInputError('O avanço deve estar entre 0 e 100%.');
  const progress=Math.round(rawProgress);
  const week=String(input.week??current.week??'').trim();
  db.prepare(`UPDATE stages SET name=?,owner=?,status=?,progress=?,week=? WHERE id=?`).run(name,owner,status,progress,week,stageId);
  audit.run('stages',String(stageId),'updated',JSON.stringify({name,owner,status,progress,week}),now());
  return getStageAdmin(stageId);
}

export function createStageAdmin(input={}){
  const name=String(input.name||'').trim();
  if(!name)throw stageInputError('Informe o nome da etapa.');
  const owner=String(input.owner||'').trim(),status=String(input.status||'planejado').trim()||'planejado';
  const rawProgress=Number(input.progress??0);if(!Number.isFinite(rawProgress)||rawProgress<0||rawProgress>100)throw stageInputError('O avanço deve estar entre 0 e 100%.');
  const progress=Math.round(rawProgress),week=String(input.week||'').trim();
  const existing=db.prepare(`SELECT id FROM stages WHERE project_id=? AND lower(name)=lower(?)`).get(applicationProjectId,name);
  if(existing)throw stageInputError('Já existe uma etapa com este nome.');
  const nextId=Number(db.prepare(`SELECT COALESCE(MAX(id),0)+1 AS id FROM stages`).get()?.id||1);
  db.prepare(`INSERT INTO stages(id,project_id,name,status,progress,week,owner) VALUES(?,?,?,?,?,?,?)`).run(nextId,applicationProjectId,name,status,progress,week,owner);
  audit.run('stages',String(nextId),'created',JSON.stringify({name,owner,status,progress,week}),now());
  return getStageAdmin(nextId);
}

export function deleteStageAdmin(stageId){
  const stage=db.prepare(`SELECT id,name FROM stages WHERE id=?`).get(stageId);if(!stage)return false;
  const stageKeys=[String(stage.name||'').trim().toLocaleLowerCase('pt-BR'),String(stage.id)].filter(Boolean);
  const keyPlaceholders=stageKeys.map(()=>'?').join(',');
  const linked={
    activities:Number(db.prepare(`SELECT COUNT(*) AS total FROM activities WHERE stage_id=?`).get(stageId)?.total||0),
    records:Number(db.prepare(`SELECT COUNT(*) AS total FROM records WHERE stage_id=?`).get(stageId)?.total||0),
    purchases:Number(db.prepare(`SELECT COUNT(*) AS total FROM purchases WHERE stage_id=?`).get(stageId)?.total||0),
    materials:Number(db.prepare(`SELECT COUNT(*) AS total FROM materials WHERE stage_id=?`).get(stageId)?.total||0),
    agendaEvents:Number(db.prepare(`SELECT COUNT(*) AS total FROM agenda_events WHERE lower(stage_name)=lower(?)`).get(stage.name)?.total||0),
    workbenchDiary:Number(db.prepare(`SELECT COUNT(*) AS total FROM workbench_diary WHERE lower(stage_key) IN (${keyPlaceholders})`).get(...stageKeys)?.total||0),
    workbenchAttachments:Number(db.prepare(`SELECT COUNT(*) AS total FROM workbench_attachments WHERE lower(stage_key) IN (${keyPlaceholders})`).get(...stageKeys)?.total||0),
    workbenchState:Number(db.prepare(`SELECT COUNT(*) AS total FROM stage_workbench_state WHERE lower(stage_key) IN (${keyPlaceholders})`).get(...stageKeys)?.total||0),
    serviceRequests:Number(db.prepare(`SELECT COUNT(*) AS total FROM service_requests WHERE lower(stage_key) IN (${keyPlaceholders})`).get(...stageKeys)?.total||0),
    cashEntries:Number(db.prepare(`SELECT COUNT(*) AS total FROM cash_flow_entries WHERE lower(stage)=lower(?)`).get(stage.name)?.total||0),
    receipts:Number(db.prepare(`SELECT COUNT(*) AS total FROM purchase_receipts WHERE lower(stage)=lower(?)`).get(stage.name)?.total||0),
    outsourcing:Number(db.prepare(`SELECT COUNT(*) AS total FROM outsourcing_receipts WHERE lower(stage)=lower(?)`).get(stage.name)?.total||0),
  };
  const dependencies=Object.entries(linked).filter(([,count])=>count>0).map(([key,count])=>`${key}: ${count}`);
  if(dependencies.length){const error=new Error(`A etapa não pode ser removida enquanto houver dados vinculados (${dependencies.join(', ')}).`);error.statusCode=409;throw error;}
  db.prepare(`DELETE FROM stages WHERE id=?`).run(stageId);
  audit.run('stages',String(stageId),'deleted',JSON.stringify({name:stage.name}),now());
  return true;
}

export function saveStageActivitiesAdmin(stageId,items=[]){
  const stage=db.prepare(`SELECT id FROM stages WHERE id=?`).get(stageId);if(!stage)return null;
  const list=Array.isArray(items)?items:[];
  const saved=[];
  for(const [index,input] of list.entries()){
    const name=String(input?.name||'').trim();if(!name)continue;
    const id=String(input?.id||`activity-stage-${stageId}-${Date.now()}-${index}`);
    const category=String(input?.category||'Execução').trim()||'Execução';
    const status=String(input?.status||'planejado').trim()||'planejado';
    const progress=Math.max(0,Math.min(100,Number(input?.progress)||0));
    const ownerId=String(input?.ownerId||'').trim()||null;
    const plannedStart=String(input?.plannedStart||'').trim()||null,plannedEnd=String(input?.plannedEnd||'').trim()||null;
    const properties=typeof input?.properties==='object'&&input.properties?JSON.stringify(input.properties):'{}';
    const exists=db.prepare(`SELECT id FROM activities WHERE id=?`).get(id);
    if(exists)db.prepare(`UPDATE activities SET stage_id=?,category=?,name=?,status=?,progress=?,owner_id=?,planned_start=?,planned_end=?,properties_json=? WHERE id=?`).run(stageId,category,name,status,progress,ownerId,plannedStart,plannedEnd,properties,id);
    else db.prepare(`INSERT INTO activities(id,stage_id,category,name,status,progress,owner_id,planned_start,planned_end,properties_json) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id,stageId,category,name,status,progress,ownerId,plannedStart,plannedEnd,properties);
    saved.push(id);
  }
  audit.run('activities',String(stageId),'saved',JSON.stringify({count:saved.length}),now());
  return getStageAdmin(stageId);
}

export function getActivityAdmin(id){
  return listActivities().find(item=>item.id===String(id))||null;
}
const activityAdminInput=(input={},previous={})=>{
  const stageId=Number(input.stageId??previous.stageId);
  if(!Number.isInteger(stageId)||!db.prepare(`SELECT id FROM stages WHERE id=?`).get(stageId))
    throw Object.assign(new Error('Selecione uma etapa cadastrada.'),{statusCode:400});
  const name=asText(input.name,previous.name).slice(0,200),category=asText(input.category,previous.category||'Execução').slice(0,100);
  if(!name||!category)throw Object.assign(new Error('Nome e categoria da atividade são obrigatórios.'),{statusCode:400});
  const progress=Number(input.progress??previous.progress??0);
  if(!Number.isFinite(progress)||progress<0||progress>100)throw Object.assign(new Error('Progresso deve estar entre 0 e 100.'),{statusCode:400});
  const plannedStart=asText(input.plannedStart,previous.plannedStart||'')||null,plannedEnd=asText(input.plannedEnd,previous.plannedEnd||'')||null;
  if([plannedStart,plannedEnd].some(value=>value&&!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(value))||plannedStart&&plannedEnd&&plannedEnd<plannedStart)
    throw Object.assign(new Error('Datas planejadas inválidas.'),{statusCode:400});
  const ownerId=asText(input.ownerId,previous.ownerId||'')||null;
  if(ownerId&&!db.prepare(`SELECT id FROM collaborators WHERE id=?`).get(ownerId))
    throw Object.assign(new Error('Responsável não encontrado.'),{statusCode:400});
  return {stageId,name,category,status:asText(input.status,previous.status||'planejado').slice(0,80),progress,ownerId,plannedStart,plannedEnd};
};
export function createActivityAdmin(input={}){
  const value=activityAdminInput(input),id=`ACT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  db.prepare(`INSERT INTO activities(id,stage_id,category,name,status,progress,owner_id,planned_start,planned_end) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(id,value.stageId,value.category,value.name,value.status,value.progress,value.ownerId,value.plannedStart,value.plannedEnd);
  audit.run('activities',id,'created',JSON.stringify(value),now());
  return getActivityAdmin(id);
}
export function updateActivityAdmin(id,input={}){
  const previous=getActivityAdmin(id);if(!previous)return null;
  if(previous.properties?.source==='automation')throw Object.assign(new Error('Atividade gerada pelo planejamento: ajuste a origem operacional.'),{statusCode:409});
  const value=activityAdminInput(input,previous);
  db.prepare(`UPDATE activities SET stage_id=?,category=?,name=?,status=?,progress=?,owner_id=?,planned_start=?,planned_end=? WHERE id=?`)
    .run(value.stageId,value.category,value.name,value.status,value.progress,value.ownerId,value.plannedStart,value.plannedEnd,id);
  audit.run('activities',id,'updated',JSON.stringify(value),now());
  return getActivityAdmin(id);
}
export function deleteActivityAdmin(id){
  const previous=getActivityAdmin(id);if(!previous)return false;
  if(previous.properties?.source==='automation')throw Object.assign(new Error('Atividade gerada pelo planejamento: ajuste a origem operacional.'),{statusCode:409});
  db.prepare(`DELETE FROM activities WHERE id=?`).run(id);
  audit.run('activities',id,'deleted','{}',now());
  return true;
}

export function saveStageAiConfig(stageId,input={}){
  const exists=db.prepare(`SELECT id FROM stages WHERE id=?`).get(stageId);
  if(!exists)return null;
  const timestamp=now();
  const requirements=JSON.stringify(Array.isArray(input.requirements)?input.requirements:[]);
  const conditions=JSON.stringify(Array.isArray(input.conditions)?input.conditions:[]);
  const executionProfile=JSON.stringify({...input.executionProfile||{},aiOrganization:{request:String(input.organizationRequest||input.executionProfile?.aiOrganization?.request||'').trim(),context:String(input.organizationContext||input.executionProfile?.aiOrganization?.context||'').trim()}});
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
