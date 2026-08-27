CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  stage_name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planejado',
  created_at TEXT NOT NULL
);
