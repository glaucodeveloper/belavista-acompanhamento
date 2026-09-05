CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  progress REAL NOT NULL DEFAULT 0,
  official_progress REAL NOT NULL DEFAULT 0,
  owner TEXT NOT NULL DEFAULT '',
  planned_start TEXT,
  planned_finish TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_dependencies (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL,
  predecessor_stage_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'finish_to_start',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL,
  activity TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  progress REAL NOT NULL DEFAULT 0,
  observed_at TEXT NOT NULL,
  photo_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS field_confirmations (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  official_progress REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO stages (
  id, code, name, status, progress, official_progress, owner,
  planned_start, planned_finish, sort_order, created_at, updated_at
) VALUES
  ('project', 'PRJ', 'Projeto executivo', 'in_progress', 84, 84, 'Engenharia', '2026-08-01', '2026-09-10', 10, datetime('now'), datetime('now')),
  ('earthwork', 'TERRA', 'Terraplanagem', 'in_progress', 62, 58, 'Campo', '2026-08-10', '2026-10-01', 20, datetime('now'), datetime('now')),
  ('drainage', 'DREN', 'Drenagem pluvial', 'planned', 18, 15, 'Infra', '2026-09-01', '2026-10-15', 30, datetime('now'), datetime('now')),
  ('water', 'AGUA', 'Rede de água', 'planned', 8, 5, 'Infra', '2026-09-15', '2026-11-01', 40, datetime('now'), datetime('now'));

