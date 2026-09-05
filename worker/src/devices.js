import {first, run} from './db.js';
import {now, text} from './json.js';

function actorFromRequest(request, input = {}) {
  const headers = request.headers;
  const role = text(headers.get('x-belavista-role') || input.role || 'foreman', 40);
  const uid = text(headers.get('x-belavista-user') || input.uid || input.installationId, 120);
  const name = text(headers.get('x-belavista-name') || input.name || 'Dispositivo', 120);
  return {role, uid, name};
}

export async function registerDevice(env, request) {
  const input = await request.json().catch(() => ({}));
  const actor = actorFromRequest(request, input);
  const installationId = text(input.installationId, 160);
  if (!installationId || !actor.uid) throw Object.assign(new Error('Identificador da instalação obrigatório.'), {status: 400});
  const id = `DEV-${actor.uid}-${installationId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 180);
  const timestamp = now();
  await run(env, `
    INSERT INTO device_registrations (
      id, uid, role, name, installation_id, fcm_token, platform, permission, enabled, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(uid, installation_id) DO UPDATE SET
      role = excluded.role,
      name = excluded.name,
      fcm_token = excluded.fcm_token,
      platform = excluded.platform,
      permission = excluded.permission,
      enabled = 1,
      updated_at = excluded.updated_at
  `, [
    id,
    actor.uid,
    actor.role,
    actor.name,
    installationId,
    text(input.fcmToken, 400),
    text(input.platform || 'web', 40),
    text(input.permission || 'default', 40),
    timestamp
  ]);
  const device = await first(env, `
    SELECT id, uid, role, name, installation_id AS installationId,
      fcm_token AS fcmToken, platform, permission, updated_at AS updatedAt
    FROM device_registrations
    WHERE uid = ? AND installation_id = ?
  `, [actor.uid, installationId]);
  return {device};
}
