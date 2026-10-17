import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicLeadWhatsappContact } from '../../worker/src/public-lead-ai.js';

test('Atlas mantém o número informado no campo operacional de WhatsApp', async () => {
  const settings = await readFile(new URL('../../components/commercial/operational-settings-workspace-v1.mjs', import.meta.url), 'utf8');
  const atlasSettings = await readFile(new URL('../../components/commercial/settings-commercial-workspace-v1.mjs', import.meta.url), 'utf8');
  const server = await readFile(new URL('../../server.mjs', import.meta.url), 'utf8');
  const repositorySettings = JSON.parse(await readFile(new URL('../../data/operational/public-lead-contact.json', import.meta.url), 'utf8'));
  assert.match(settings, /name="whatsappNumber"[^>]*value="\$\{esc\(saved\.whatsappNumber \|\| "74991220997"\)\}"/);
  assert.match(atlasSettings, /data-public-lead-contact-form/);
  assert.match(atlasSettings, /api\/settings\/public-lead-contact/);
  assert.match(atlasSettings, /Salvo no repositório/);
  assert.match(server, /api\/settings\/public-lead-contact/);
  assert.equal(repositorySettings.whatsappNumber, '74991220997');
});

test('lead gera handoff WhatsApp com destino e mensagem preparada, sem envio automático', () => {
  const contact = publicLeadWhatsappContact(
    '55 (74) 99122-0997',
    { lead: { name: 'Ana' }, selectedLot: { label: 'Lote 12' } },
    'Olá, Ana! Vamos conversar sobre o Lote 12.'
  );
  assert.deepEqual(contact, {
    confirmRequired: true,
    channel: 'whatsapp-web',
    phone: '5574991220997',
    message: 'Olá, Ana! Vamos conversar sobre o Lote 12.'
  });
  assert.equal(publicLeadWhatsappContact('74991220997', {}, 'mensagem').phone, '5574991220997');
  assert.equal(publicLeadWhatsappContact('', {}, 'mensagem'), null);
});

test('Worker lê e atualiza o destino no JSON do repositório, sem banco/local ou variável de ambiente', async () => {
  const source = await readFile(new URL('../../worker/src/public-lead-ai.js', import.meta.url), 'utf8');
  const routes = await readFile(new URL('../../worker/src/routes.js', import.meta.url), 'utf8');
  assert.match(source, /readRepositoryJson\(env,'data\/operational\/public-lead-contact\.json'\)/);
  assert.match(routes, /writeRepositoryJson\(env,path,settings/);
  assert.doesNotMatch(source, /getPublicLeadContactSettings/);
});
