CREATE TABLE IF NOT EXISTS agenda_items (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  due_at TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT NOT NULL DEFAULT '/',
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  read_at TEXT
);

INSERT OR IGNORE INTO agenda_items (
  id, stage_id, title, description, responsible, due_at, priority, status, created_at, updated_at
) VALUES
  ('agenda-1', 'earthwork', 'Revisar avanço da terraplanagem', 'Comparar medição oficial com evidências fotográficas.', 'Encarregado', '2026-08-30T15:00:00Z', 'high', 'planned', datetime('now'), datetime('now')),
  ('agenda-2', 'drainage', 'Conferir compra de tubos PEAD', 'Validar itens extraídos do recibo e saldo da etapa.', 'Suprimentos', '2026-09-02T12:00:00Z', 'medium', 'planned', datetime('now'), datetime('now'));

