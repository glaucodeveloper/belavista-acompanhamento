CREATE TABLE IF NOT EXISTS social_automation_policies (
  id TEXT PRIMARY KEY,
  policy_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
