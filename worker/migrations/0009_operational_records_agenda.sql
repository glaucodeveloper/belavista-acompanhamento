CREATE INDEX IF NOT EXISTS idx_records_operational_date
  ON records(record_date DESC, record_time DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS agenda_events (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  stage_key TEXT NOT NULL DEFAULT '',
  stage_name TEXT NOT NULL DEFAULT '',
  activity_id TEXT NOT NULL DEFAULT '',
  activity_name TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '08:00',
  duration_hours REAL NOT NULL DEFAULT 1,
  span_days INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Planejado',
  related_from TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  material_ids_json TEXT NOT NULL DEFAULT '[]',
  user_edited INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agenda_events_visible
  ON agenda_events(hidden, event_date, start_time, id);

CREATE TRIGGER IF NOT EXISTS agenda_record_insert AFTER INSERT ON records BEGIN
  INSERT INTO agenda_events(id, source_type, source_id, title, stage_key, stage_name,
    activity_name, owner, event_date, start_time, status, updated_at)
  VALUES('agenda-record-' || NEW.id, 'record', NEW.id,
    COALESCE(NULLIF(substr(NEW.details, 1, instr(NEW.details || char(10), char(10)) - 1), ''), 'Registro da obra'),
    NEW.stage_name, NEW.stage_name, NEW.activity_name, NEW.responsible_name,
    NEW.record_date, NEW.record_time, NEW.status, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS agenda_record_update AFTER UPDATE ON records BEGIN
  UPDATE agenda_events SET
    title=COALESCE(NULLIF(substr(NEW.details, 1, instr(NEW.details || char(10), char(10)) - 1), ''), 'Registro da obra'),
    stage_key=NEW.stage_name, stage_name=NEW.stage_name,
    activity_name=NEW.activity_name, owner=NEW.responsible_name,
    event_date=NEW.record_date, start_time=NEW.record_time,
    status=NEW.status, updated_at=datetime('now')
  WHERE source_type='record' AND source_id=NEW.id AND user_edited=0 AND hidden=0;
END;

CREATE TRIGGER IF NOT EXISTS agenda_record_delete AFTER DELETE ON records BEGIN
  DELETE FROM agenda_events WHERE source_type='record' AND source_id=OLD.id;
END;

INSERT OR IGNORE INTO agenda_events(id, source_type, source_id, title, stage_key, stage_name,
  activity_name, owner, event_date, start_time, status, updated_at)
SELECT 'agenda-record-' || id, 'record', id,
  COALESCE(NULLIF(substr(details, 1, instr(details || char(10), char(10)) - 1), ''), 'Registro da obra'),
  stage_name, stage_name, activity_name, responsible_name,
  record_date, record_time, status, datetime('now')
FROM records WHERE record_date <> '';
