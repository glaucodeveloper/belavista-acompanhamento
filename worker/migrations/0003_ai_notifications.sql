CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'system',
  entity_id TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
