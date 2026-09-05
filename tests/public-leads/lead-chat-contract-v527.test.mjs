import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('rota pública encaminha o estado completo da conversa',()=>{
  const source=read('worker/src/routes.js');
  assert.match(source,/runPublicLeadConversation/);
  assert.match(source,/session:payload\.session\|\|\{\}/);
  assert.match(source,/selectedLot:payload\.selectedLot\|\|null/);
  assert.match(source,/event:payload\.event\|\|null/);
});

test('rota aceita eventos de cadastro sem mensagem textual',()=>{
  const source=read('worker/src/routes.js');
  assert.match(source,/!String\(payload\.message\|\|''\)\.trim\(\)&&!payload\.event/);
});

test('cliente preserva a resposta para continuar cadastro e reserva',()=>{
  const source=read('public-lead-form.mjs');
  assert.match(source,/let result=null/);
  assert.match(source,/result=await sendConversation/);
  assert.match(source,/return result/);
});
