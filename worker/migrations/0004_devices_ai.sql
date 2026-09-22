CREATE TABLE IF NOT EXISTS device_registrations (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  installation_id TEXT NOT NULL,
  fcm_token TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'web',
  permission TEXT NOT NULL DEFAULT 'default',
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  UNIQUE(uid, installation_id)
);
