import {getApps, initializeApp, applicationDefault, cert} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';

let runtimePromise;
async function runtime() {
  if (!process.env.FIREBASE_DATABASE_URL) return null;
  return runtimePromise ||= (async () => {
    if (!getApps().length) {
      const inline = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
      initializeApp({credential: inline ? cert(JSON.parse(inline)) : applicationDefault(), databaseURL: process.env.FIREBASE_DATABASE_URL});
    }
    return getDatabase();
  })();
}

const compact = value => JSON.parse(JSON.stringify(value ?? {}));

// A ponte é somente de saída: a Function avalia o fato e devolve uma decisão
// auditável. Nenhuma escrita remota volta automaticamente para o caixa ou obra.
export async function publishBridgeEvent(event = {}) {
  const database = await runtime().catch(() => null);
  if (!database || !event?.id) return {published: false, reason: 'firebase-unavailable'};
  const payload = compact({
    id: String(event.id), type: String(event.event_type || event.type || ''), entity: String(event.entity || ''),
    entityId: String(event.entity_id || event.entityId || ''), actor: {uid: String(event.actor_uid || event.actor?.uid || 'system'), role: String(event.actor_role || event.actor?.role || 'system')},
    source: String(event.source || 'belavista-local-bridge'), payload: event.payload || {}, occurredAt: event.created_at || event.occurredAt || new Date().toISOString()
  });
  await database.ref(`agentBridgeEvents/${payload.id}`).set(payload);
  return {published: true, id: payload.id};
}
