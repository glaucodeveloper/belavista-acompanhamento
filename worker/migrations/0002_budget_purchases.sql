CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  planned_cents INTEGER NOT NULL DEFAULT 0,
  committed_cents INTEGER NOT NULL DEFAULT 0,
  realized_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL,
  supplier TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL DEFAULT 0,
  receipt_key TEXT NOT NULL DEFAULT '',
  extracted_items_json TEXT NOT NULL DEFAULT '[]',
  ai_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_observations (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  facts_json TEXT NOT NULL DEFAULT '[]',
  candidate_progress REAL NOT NULL DEFAULT 0,
  risks_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

