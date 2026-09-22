import {now, text, uid} from './json.js';

export async function all(env, sql, bindings = []) {
  const result = await env.BELAVISTA_DB.prepare(sql).bind(...bindings).all();
  return result.results || [];
}

export async function first(env, sql, bindings = []) {
  const row = await env.BELAVISTA_DB.prepare(sql).bind(...bindings).first();
  return row || null;
}

export async function run(env, sql, bindings = []) {
  return env.BELAVISTA_DB.prepare(sql).bind(...bindings).run();
}

export async function insertNotification(env, input = {}) {
  const id = input.id || uid('ntf');
  await run(env, `
    INSERT INTO notifications (
      id, project_id, recipient_role, type, severity, title, message,
      action_url, entity_type, entity_id, status, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    text(input.projectId || 'belavista-main', 80),
    text(input.recipientRole || 'owner', 40),
    text(input.type || 'operational.notice', 80),
    text(input.severity || 'info', 16),
    text(input.title, 180),
    text(input.message, 1200),
    text(input.actionUrl || '/', 300),
    text(input.entityType || '', 80),
    text(input.entityId || '', 120),
    text(input.status || 'queued', 32),
    JSON.stringify(input.payload || {}),
    now()
  ]);
  return id;
}

