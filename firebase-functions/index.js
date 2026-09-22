import {onValueCreated} from 'firebase-functions/v2/database';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {getDatabase} from 'firebase-admin/database';
import {getMessaging} from 'firebase-admin/messaging';
import {initializeApp, getApps} from 'firebase-admin/app';

if (!getApps().length) initializeApp();

const nvidiaKey = defineSecret('NVIDIA_API_KEY');
const REGION = 'southamerica-east1';
const dangerousActions = new Set([
  'request.reserve-approval', 'request.coelba-connection', 'cash.write',
  'commission.reason.updated', 'contract.issue', 'discount.apply'
]);

const now = () => new Date().toISOString();
const text = (value, max = 1200) => String(value ?? '').trim().slice(0, max);

function policyFor(input = {}) {
  const action = text(input.action || input.type, 120);
  const autonomy = text(input.autonomy, 32).toUpperCase();
  const requiresHumanApproval = autonomy === 'CONFIRMAR' || dangerousActions.has(action) ||
    /reserve|caixa|cash|contrato|desconto|coelba/i.test(action);
  return {action, requiresHumanApproval, state: requiresHumanApproval ? 'awaiting_human_confirmation' : 'proposed'};
}

function parseModel(content) {
  try {
    const value = JSON.parse(String(content || '').match(/\{[\s\S]*\}/)?.[0] || '{}');
    return {
      summary: text(value.summary, 700),
      facts: Array.isArray(value.facts) ? value.facts.map(item => text(item, 180)).filter(Boolean).slice(0, 12) : [],
      risk: ['low', 'medium', 'high'].includes(value.risk) ? value.risk : 'medium',
      recommendedAction: text(value.recommendedAction, 180),
      confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0))
    };
  } catch { return null; }
}

async function consultNvidia(event, policy) {
  const apiKey = nvidiaKey.value();
  if (!apiKey) throw new Error('NVIDIA_API_KEY indisponível na Function.');
  const model = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
  const endpoint = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
 const prompt = `Você é o validador operacional do Aliança Park. Analise somente os fatos JSON abaixo. Não execute ações e não dê comandos. Responda SOMENTE JSON com summary, facts (lista), risk (low|medium|high), recommendedAction e confidence (0..1). Ação proposta: ${policy.action}. Exige aprovação humana: ${policy.requiresHumanApproval}. Fatos: ${JSON.stringify(event).slice(0, 10000)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/json', authorization: `Bearer ${apiKey}`},
    body: JSON.stringify({model, messages: [{role: 'system', content: 'Você é um validador de fatos. Nunca aprova nem executa mudanças.'}, {role: 'user', content: prompt}], temperature: 0.1, max_tokens: 500}),
    signal: AbortSignal.timeout(60000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(text(payload?.detail || payload?.message || 'NVIDIA NIM recusou a validação.', 300));
  const decision = parseModel(payload?.choices?.[0]?.message?.content);
  if (!decision) throw new Error('NVIDIA NIM não retornou a decisão estruturada.');
  return {provider: 'nvidia-nim', model, ...decision};
}

async function notifyRoles(database, decisionId, decision, roles = ['owner', 'admin', 'foreman']) {
  const registrations = (await database.ref('operationalDevices').once('value')).val() || {};
  const targets = Object.entries(registrations).filter(([, item]) => item?.enabled !== false && roles.includes(item?.role));
  const message = decision.model?.summary || 'Nova decisão operacional requer sua ciência.';
  await Promise.all(targets.map(async ([id, item]) => {
    const notification = {id: decisionId, type: 'agent.decision', title: 'Decisão da IA aguardando confirmação', message, actionUrl: '/encarregados.html', status: 'unread', createdAt: now()};
    await database.ref(`notifications/${item.uid}/${decisionId}`).set(notification);
    if (item.fcmToken) await getMessaging().send({token: item.fcmToken, notification: {title: notification.title, body: notification.message}, data: {notificationId: decisionId, actionUrl: notification.actionUrl, type: notification.type}}).catch(() => null);
    await database.ref(`operationalDevices/${id}/lastNotifiedAt`).set(now());
  }));
}

export const evaluateBridgeEvent = onValueCreated({ref: '/agentBridgeEvents/{eventId}', region: REGION, secrets: [nvidiaKey]}, async event => {
  const input = event.data.val() || {};
  if (input.source === 'belavista-firebase-agent') return;
  const database = getDatabase();
  const eventId = event.params.eventId;
  const policy = policyFor(input);
  const base = {id: eventId, event: input, policy, createdAt: now(), source: 'belavista-firebase-agent'};
  let model;
  try { model = await consultNvidia(input, policy); }
  catch (error) { model = {provider: 'nvidia-nim', unavailable: true, summary: 'Validação NVIDIA indisponível; mantenha a mudança em revisão humana.', facts: [], risk: 'high', recommendedAction: 'Revisar manualmente', confidence: 0, error: text(error.message, 300)}; }
  const decision = {...base, model, status: policy.requiresHumanApproval || model.unavailable ? 'awaiting_human_confirmation' : 'proposed'};
  await database.ref(`agentDecisions/${eventId}`).set(decision);
  await notifyRoles(database, eventId, decision);
  return decision;
});

export const confirmAgentDecision = onCall({region: REGION}, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticação obrigatória.');
  const role = request.auth.token.role;
  if (!['owner', 'admin', 'foreman'].includes(role)) throw new HttpsError('permission-denied', 'Perfil operacional obrigatório.');
  const id = text(request.data?.decisionId, 180);
  const confirmation = ['approved', 'rejected'].includes(request.data?.confirmation) ? request.data.confirmation : '';
  if (!id || !confirmation) throw new HttpsError('invalid-argument', 'decisionId e confirmação são obrigatórios.');
  const database = getDatabase(), reference = database.ref(`agentDecisions/${id}`), current = (await reference.once('value')).val();
  if (!current) throw new HttpsError('not-found', 'Decisão não encontrada.');
  if (current.status !== 'awaiting_human_confirmation') throw new HttpsError('failed-precondition', 'A decisão já foi tratada.');
  const approval = {status: confirmation, confirmedBy: request.auth.uid, role, notes: text(request.data?.notes, 800), confirmedAt: now()};
  await reference.update({...approval, status: confirmation === 'approved' ? 'approved_for_bridge' : 'rejected'});
  await database.ref(`agentApprovals/${id}`).set({...current, ...approval});
  return {ok: true, id, status: confirmation};
});

export const registerOperationalDevice = onCall({region: REGION}, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticação obrigatória.');
  const role = request.auth.token.role;
  if (!['owner', 'admin', 'foreman'].includes(role)) throw new HttpsError('permission-denied', 'O dispositivo precisa de uma conta com perfil operacional.');
  const installationId = text(request.data?.installationId, 180);
  if (!installationId) throw new HttpsError('invalid-argument', 'installationId é obrigatório.');
  const id = `${request.auth.uid}-${installationId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 180);
  const device = {uid: request.auth.uid, role, installationId, fcmToken: text(request.data?.fcmToken, 4096), platform: text(request.data?.platform || 'twa', 40), enabled: true, updatedAt: now()};
  await getDatabase().ref(`operationalDevices/${id}`).set(device);
  return {ok: true, id, role};
});

export const leadAssistant = onCall({region: REGION, secrets: [nvidiaKey]}, async request => {
  const message = text(request.data?.message, 800);
  if (!message) throw new HttpsError('invalid-argument', 'message é obrigatório.');
  const context = request.data?.context && typeof request.data.context === 'object' ? request.data.context : {};
  const event = {type: 'lead.message.received', channel: 'site', message, objective: text(context.objective, 60), budget: text(context.budget, 80), sun: text(context.sun, 30)};
  const policy = {action: 'extract.lead-facts', requiresHumanApproval: false};
  try {
    const result = await consultNvidia(event, policy);
    return {reply: result.summary || 'Entendi. Conte também sua faixa de valor e preferência de localização.', facts: result.facts, nextField: result.recommendedAction, provider: result.provider};
  } catch (error) {
    // Captação não pode inventar condições comerciais quando a IA estiver fora.
    return {reply: 'Entendi seu interesse. Para indicar lotes compatíveis, conte sua faixa de valor e se prefere alguma orientação solar.', facts: [], nextField: 'budget', provider: 'fallback', unavailable: true};
  }
});
