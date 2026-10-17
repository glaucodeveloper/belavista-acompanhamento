CREATE TABLE IF NOT EXISTS github_foreman_access_roles (
  id TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL REFERENCES github_auth_users(github_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(github_id, name)
);

CREATE INDEX IF NOT EXISTS idx_github_foreman_access_roles_owner
  ON github_foreman_access_roles(github_id, name);

ALTER TABLE github_foreman_access_keys ADD COLUMN role_id TEXT
  REFERENCES github_foreman_access_roles(id) ON DELETE SET NULL;
