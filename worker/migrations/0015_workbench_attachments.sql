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
  file_size INTEGER NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS workbench_attachments_stage_activity_created
  ON workbench_attachments(stage_key, activity_id, created_at DESC);
CREATE TABLE IF NOT EXISTS workbench_attachment_chunks (
  attachment_id TEXT NOT NULL REFERENCES workbench_attachments(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content BLOB NOT NULL,
  PRIMARY KEY(attachment_id, chunk_index)
);
