import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

test('documento de certificação cobre o corpo cognitivo e a jornada completa', () => {
  const doc = read('docs/system-flow-certification-v2.md');
  for (const term of [
    'normalização + contexto',
    'validação de conflito',
    'propagação para caixa, leads, responsáveis',
    'F0', 'F5', 'F9', 'F13',
    'Instagram/Firebase reais',
    'Critérios de aceite da entrega'
  ]) assert.match(doc, new RegExp(term.replace(/[+]/g, '\\+')));
});

test('contrato operacional expõe ciclo, estado completo e rotas autenticadas', () => {
  const index = read('worker/src/index.js');
  const routes = read('worker/src/routes.js');
  assert.match(index, /\/api\/operational-loop/);
  assert.match(index, /\/instagram\/webhook/);
  assert.match(index, /\/whatsapp\/webhook/);
  assert.match(routes, /\/api\/communications\/status/);
  assert.match(routes, /\/api\/communications\/conversations/);
  assert.match(routes, /\/api\/admin\/cash-flow/);
  assert.match(routes, /\/api\/notifications/);
});

test('variáveis sensíveis do corpo cognitivo estão previstas no env de exemplo', () => {
  const env = read('.env.example');
  for (const key of [
    'NVIDIA_API_KEY', 'FIREBASE_DATABASE_URL', 'FIREBASE_SERVICE_ACCOUNT_JSON',
    'FIREBASE_WEB_PUSH_VAPID_KEY', 'INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_APP_ID',
    'INSTAGRAM_APP_SECRET', 'INSTAGRAM_ACCOUNT_ID', 'INSTAGRAM_VERIFY_TOKEN'
  ]) assert.match(env, new RegExp(`^${key}=`, 'm'));
});

test('fontes de registro, mapa, caixa, agenda e notificações existem', () => {
  for (const file of [
    'records-activity-drill-in-v5377.mjs',
    'persistence.mjs',
    'worker/src/cash-evidence.js',
    'worker/src/budget.js',
    'worker/src/notifications.js',
    'worker/src/planning-service.js',
    'worker/src/operational-loop.js',
    'worker/src/operational-state.js'
  ]) assert.equal(exists(file), true, `${file} deve existir`);
});

test('fluxo de compreensão preserva requisitos, impacto e decisão de agenda', () => {
  const planning = read('production-planning.mjs');
  const stage = read('stage-workbench.mjs');
  const stageComposition = read('components/planning/stage-pages-application-composition-v1.mjs');
  const actionReflection = read('components/planning/ai-action-reflection-v1.mjs');
  assert.match(stage, /requestHints|typicalDescription|evidenceFocus/i);
  assert.match(planning, /agenda|dependency|sector-overlap/i);
  assert.match(stageComposition, /installAiActionReflectionV1/);
  assert.match(actionReflection, /inferScheduleImpact|impacto.*cronograma|aiActionPositionChanges/i);
});

test('entrada de registro tem validação contra duplicação e conflito', () => {
  const records = read('records-activity-drill-in-v5377.mjs');
  assert.match(records, /validateRecordEntryV5377/);
  assert.match(records, /duplicidade|já está vinculada/i);
  assert.match(records, /overlaps/);
});

test('mensagens sociais mantêm canal, conversa e resposta no Worker', () => {
  const social = read('worker/src/social.js');
  const routes = read('worker/src/routes.js');
  assert.match(social, /webhookVerification/);
  assert.match(social, /saveInboundSocialMessages/);
  assert.match(social, /sendSocialMessage/);
  assert.match(routes, /conversationMessages/);
});

test('propagação operacional cobre evidência, dependências, pessoal e notificações', () => {
  const loop = read('worker/src/operational-loop.js');
  const state = read('worker/src/operational-state.js');
  const planning = read('worker/src/planning-service.js');
  const evidence = read('worker/src/cash-evidence.js');
  const notifications = read('worker/src/notifications.js');
  assert.match(loop + evidence, /evidence|evidência/i);
  assert.match(state + planning, /dependency|dependência|blocked|bloque/i);
  assert.match(state + planning, /personnel|pessoal|responsible|encarreg/i);
  assert.match(notifications, /notification|notifica/i);
});

test('bateria existente de inferência e domínio está referenciada', () => {
  for (const file of [
    'tests/inference/01-contract-source.test.mjs',
    'tests/inference/04-cash-and-provision.test.mjs',
    'tests/inference/05-receipts-material-propagation.test.mjs',
    'tests/inference/06-field-diary-continuation.test.mjs',
    'tests/inference/07-stage-unlock-chain.test.mjs',
    'tests/inference/08-personnel-locality.test.mjs',
    'tests/inference/09-event-matrix.test.mjs',
    'tests/inference/10-full-journey.test.mjs',
    'tests/real/mock-domain.test.mjs',
    'tests/real/mock-worker-contract.test.mjs'
  ]) assert.equal(exists(file), true, `${file} deve compor a bateria`);
});

test('integrações reais ficam explicitamente condicionadas a credenciais', () => {
  const doc = read('docs/system-flow-certification-v2.md');
  assert.match(doc, /Instagram/);
  assert.match(doc, /credenciais Meta/);
  assert.match(doc, /Firebase\/RTDB/);
  assert.match(doc, /sessão Firebase válida/);
  assert.match(doc, /NVIDIA\/IA/);
  assert.match(doc, /endpoint\/modelo e segredo/);
  assert.match(doc, /Nunca arquivar tokens/);
});
