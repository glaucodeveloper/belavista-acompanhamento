import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('chat inicia com boas-vindas comerciais',()=>{
  const form=read('public-lead-form.mjs');
  const context=read('public-leads-context-v521.mjs');
  assert.match(form,/Bem-vindo ao Aliança Park!/);
  assert.match(context,/BEM-VINDO · ATENDIMENTO ALIANÇA PARK/);
});

test('respostas e falhas do assistente usam escrita progressiva',()=>{
  const form=read('public-lead-form.mjs');
  const context=read('public-leads-context-v521.mjs');
  assert.match(form,/function typeAssistantMessage/);
  assert.match(form,/await typeAssistantMessage\(message,assistantText\(result\)\)/);
  assert.match(context,/await animate\(output,reply\)/);
  assert.match(context,/await animate\(output,failure\)/);
});

test('animacao respeita preferencia de movimento reduzido',()=>{
  const form=read('public-lead-form.mjs');
  const css=read('public-leads.css');
  assert.match(form,/prefers-reduced-motion: reduce/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
