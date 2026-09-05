import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

const root=join(import.meta.dirname,'../..');
const read=path=>readFile(join(root,path),'utf8');

test('monitoria de workers expõe suíte acionável por categoria',async()=>{
  const html=await read('admin-workers.html');
  for(const marker of ['data-run-suite','data-test-case="input.record"','data-test-case="generation.agenda"','data-test-case="notification.cash"','data-test-case="propagation.calibration"','data-run-single','DRY-RUN · 16 CASOS'])assert.match(html,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${marker} ausente na interface`);
  assert.match(html,/não envia WhatsApp, Firebase Messaging ou mensagens reais/i);
});

test('contrato do endpoint organiza outputs e bloqueia saída externa',async()=>{
  const server=await read('server.mjs');
  for(const event of ['record.created','production.measured','material.incomplete','cash.changed','lead.message.received','lot.reserve.requested','payment.received','month.closed','cash.negative','coelba.deadline-near','calibration.changed','activity.completed'])assert.match(server,new RegExp(event.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${event} ausente no contrato`);
  assert.match(server,/outputs:\{generation:/);
  assert.match(server,/notifications:\{mode:'pseudo-listener',external:'disabled'/);
  assert.match(server,/publishNotifications:false,includeNotifications:false/);
});

test('javascript da monitoria liga botões individuais e suíte completa ao mesmo resultado',async()=>{
  const script=await read('admin-workers.js');
  assert.match(script,/document\.querySelectorAll\('\[data-test-case\]'\)/);
  assert.match(script,/qs\('\[data-run-suite\]'\)\?\.addEventListener/);
  assert.match(script,/caseId\?\{scenario:'single',caseId\}/);
  assert.match(script,/suite-result-summary/);
});
