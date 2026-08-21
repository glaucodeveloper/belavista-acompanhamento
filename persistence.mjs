import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const appRoot=fileURLToPath(new URL('.',import.meta.url));
const dataRoot=process.env.BELAVISTA_DATA_ROOT||join(appRoot,'data');
const dbPath=process.env.BELAVISTA_DB||join(dataRoot,'belavista.sqlite');
mkdirSync(dirname(dbPath),{recursive:true});

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
  CREATE INDEX IF NOT EXISTS idx_records_project_date ON records(project_id,record_date DESC,record_time DESC);
  CREATE INDEX IF NOT EXISTS idx_records_activity ON records(activity_id);
  CREATE INDEX IF NOT EXISTS idx_activities_stage ON activities(stage_id);
`);

const now=()=>new Date().toISOString();
const projectId='project-alianca-park';
const seed=()=>{
  const timestamp=now();
  db.prepare(`INSERT OR IGNORE INTO projects(id,name,city,phase,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(projectId,'Aliança Park','Senador Canedo, GO','Fase 01',timestamp,timestamp);
  const stages=[
    [1,'Terraplanagem','concluido',100,'Sem 23','Equipe Terraplanagem'],
    [2,'Drenagem Pluvial','andamento',82,'Sem 24','Carlos Mendes'],
    [3,'Pavimentação','planejado',35,'Sem 25','Mariana Lopes'],
    [4,'Rede de Água','planejado',20,'Sem 26','João Pereira'],
    [5,'Rede Elétrica','planejado',18,'Sem 27','Mariana Silva'],
    [6,'Sinalização','planejado',5,'Sem 28','Equipe Infra']
  ];
  const insertStage=db.prepare(`INSERT OR IGNORE INTO stages(id,project_id,name,status,progress,week,owner) VALUES(?,?,?,?,?,?,?)`);
  for(const row of stages)insertStage.run(row[0],projectId,...row.slice(1));
  const people=[
    ['collab-mariana','Mariana Silva','Engenharia Civil','Rede Elétrica',''],
    ['collab-joao','João Pereira','Encarregado','Terraplanagem',''],
    ['collab-carlos','Carlos Mendes','Engenharia','Drenagem',''],
    ['collab-paula','Paula Nascimento','Planejamento','Pavimentação','']
  ];
  const insertPerson=db.prepare(`INSERT OR IGNORE INTO collaborators(id,name,role,specialty,phone) VALUES(?,?,?,?,?)`);
  for(const row of people)insertPerson.run(...row);
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
};
seed();

const recordSelect=`SELECT r.id,r.project_id AS projectId,r.stage_id AS stageId,r.activity_id AS activityId,
  p.name AS obra,s.name AS etapa,a.name AS atividade,r.record_date AS data,r.record_time AS hora,
  r.responsible_id AS responsibleId,r.responsible_name AS responsavel,r.details AS detalhes,
  r.status,r.evidence_uri AS evidenceUri,r.created_at AS createdAt,r.updated_at AS updatedAt
  FROM records r JOIN projects p ON p.id=r.project_id LEFT JOIN stages s ON s.id=r.stage_id
  LEFT JOIN activities a ON a.id=r.activity_id`;

const resolveIds=db.prepare(`SELECT p.id AS projectId,s.id AS stageId,a.id AS activityId,c.id AS responsibleId
  FROM projects p LEFT JOIN stages s ON s.project_id=p.id AND lower(s.name)=lower(?)
  LEFT JOIN activities a ON a.stage_id=s.id
  LEFT JOIN collaborators c ON lower(c.name)=lower(?) WHERE lower(p.name)=lower(?) LIMIT 1`);
const audit=db.prepare(`INSERT INTO audit_events(entity,entity_id,action,payload_json,created_at) VALUES(?,?,?,?,?)`);
const asText=(value,fallback='')=>String(value??fallback).trim();
const toRecordInput=(input,existing={})=>{
  const obra=asText(input.obra,existing.obra||'Aliança Park');
  const atividade=asText(input.atividade,existing.atividade||'Drenagem Pluvial');
  const responsavel=asText(input.responsavel,existing.responsavel||'A definir');
  const ids=resolveIds.get(atividade,responsavel,obra)||{};
  return {projectId:ids.projectId||projectId,stageId:ids.stageId||existing.stageId||2,activityId:ids.activityId||existing.activityId||'activity-drenagem',responsibleId:ids.responsibleId||existing.responsibleId||null,obra,atividade,responsavel,data:asText(input.data,existing.data||new Date().toISOString().slice(0,10)),hora:asText(input.hora,existing.hora||'08:30'),detalhes:asText(input.detalhes,existing.detalhes||''),status:asText(input.status,existing.status||'Pendente'),evidenceUri:asText(input.evidenceUri,existing.evidenceUri||'')||null};
};

export function listRecords(){return db.prepare(`${recordSelect} ORDER BY r.record_date DESC,r.record_time DESC,r.created_at DESC`).all();}
export function getRecord(id){return db.prepare(`${recordSelect} WHERE r.id=?`).get(id);}
export function createRecord(input){
  const value=toRecordInput(input),id=asText(input.id)||`REG-${String(Date.now()).slice(-8)}`,timestamp=now();
  db.prepare(`INSERT INTO records(id,project_id,stage_id,activity_id,record_date,record_time,responsible_id,responsible_name,details,status,evidence_uri,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,value.projectId,value.stageId,value.activityId,value.data,value.hora,value.responsibleId,value.responsavel,value.detalhes,value.status,value.evidenceUri,timestamp,timestamp);
  audit.run('records',id,'created',JSON.stringify(value),timestamp); return getRecord(id);
}
export function updateRecord(id,input){
  const current=getRecord(id); if(!current)return null; const value=toRecordInput(input,current),timestamp=now();
  db.prepare(`UPDATE records SET project_id=?,stage_id=?,activity_id=?,record_date=?,record_time=?,responsible_id=?,responsible_name=?,details=?,status=?,evidence_uri=?,updated_at=? WHERE id=?`).run(value.projectId,value.stageId,value.activityId,value.data,value.hora,value.responsibleId,value.responsavel,value.detalhes,value.status,value.evidenceUri,timestamp,id);
  audit.run('records',id,'updated',JSON.stringify(value),timestamp); return getRecord(id);
}
export function deleteRecord(id){const current=getRecord(id);if(!current)return false;db.prepare(`DELETE FROM records WHERE id=?`).run(id);audit.run('records',id,'deleted','{}',now());return true;}
export function entitySummary(){
  const entities=['projects','stages','activities','collaborators','materials','purchases','leads','records','activity_relations','audit_events'];
  return Object.fromEntries(entities.map(name=>[name,db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get().count]));
}
export function health(){return {ok:true,database:'sqlite',path:dbPath,schemaVersion:db.prepare(`SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations`).get().version,entities:entitySummary()};}
