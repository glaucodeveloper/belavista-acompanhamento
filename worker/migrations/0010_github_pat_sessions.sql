CREATE TABLE IF NOT EXISTS github_auth_users (
  github_id INTEGER PRIMARY KEY,
  github_login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT '',
  commercial_profile TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS github_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL REFERENCES github_auth_users(github_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_github_auth_sessions_user
  ON github_auth_sessions(github_id,expires_at);
