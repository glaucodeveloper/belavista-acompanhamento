CREATE TABLE IF NOT EXISTS github_foreman_access_keys (
  id TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL REFERENCES github_auth_users(github_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  permissions_json TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_github_foreman_access_keys_owner
  ON github_foreman_access_keys(github_id,created_at);

ALTER TABLE github_auth_sessions ADD COLUMN delegated_key_id TEXT
  REFERENCES github_foreman_access_keys(id) ON DELETE CASCADE;
