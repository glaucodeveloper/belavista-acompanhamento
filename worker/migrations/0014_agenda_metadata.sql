ALTER TABLE agenda_events
  ADD COLUMN agenda_metadata_json TEXT NOT NULL DEFAULT '{}';
