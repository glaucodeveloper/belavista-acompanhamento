import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=relative=>readFile(join(root,relative),'utf8');

test('marca visível do produto usa Aliança Park',async()=>{
  const [index,app,components,state,records,manifest,recordsManifest,library]=await Promise.all([
    read('index.html'),read('app.js'),read('components.js'),read('state.js'),
    read('public-records.html'),read('manifest.webmanifest'),
    read('records-manifest.webmanifest'),read('belavista-ui/index.html')
  ]);

  assert.match(index,/<title>Aliança Park · Acompanhamento com IA<\/title>/);
  assert.match(index,/Inicializando Aliança Park/);
  assert.doesNotMatch(index,/<title>Belavista/);
  assert.match(app,/<strong>Aliança Park<\/strong>/);
  assert.match(app,/Empreendimento Aliança Park/);
  assert.doesNotMatch(app,/<strong>Belavista<\/strong>|Empreendimento Belavista/);
  assert.match(components,/<strong>Aliança Park<\/strong>/);
  assert.match(components,/IA · Aliança Park/);
  assert.match(components,/ALIANÇA PARK LOTEAMENTO/);
  assert.doesNotMatch(components,/>Belavista<|IA · Belavista|BELAVISTA LOTEAMENTO|Belavista Desenvolvimento/);
  assert.match(state,/name: 'Empreendimento Aliança Park'/);
  assert.match(records,/<strong>Aliança Park<\/strong>/);
  assert.match(records,/sistema operacional Aliança Park/);
  assert.match(manifest,/"name": "Aliança Park · Acompanhamento com IA"/);
  assert.match(recordsManifest,/"name": "Aliança Park · Registros de campo"/);
    assert.match(library,/Biblioteca Aliança Park/);
    assert.match(library,/<title>Aliança Park System UI · Catálogo<\/title>/);
});

test('contratos técnicos antigos continuam preservados',async()=>{
  const [index,app,state]=await Promise.all([read('index.html'),read('app.js'),read('state.js')]);
  assert.match(index,/meta name="belavista-api-base"/);
  assert.match(index,/globalThis\.BELAVISTA_API_BASE/);
  assert.match(app,/customElements\.define\('belavista-app'/);
  assert.match(state,/UI_MEMORY_KEY = 'belavista\.ui-memory\.v1'/);
});
