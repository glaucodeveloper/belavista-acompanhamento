CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  record_date TEXT NOT NULL,
  record_time TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pendente',
  evidence_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cash_flow_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_agenda_items (
  id TEXT PRIMARY KEY,
  stage_name TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  owner TEXT,
  relation TEXT,
  status TEXT NOT NULL DEFAULT 'planejado',
  created_at TEXT NOT NULL
);
