CREATE TABLE IF NOT EXISTS project_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  issuer TEXT NOT NULL DEFAULT '',
  document_date TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  source_material_id TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  properties_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_document_chunks (
  document_id TEXT NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content BLOB NOT NULL,
  PRIMARY KEY(document_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS project_document_columns (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
