import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('loading publico usa campanha visual Aliança Park',()=>{
  const source=read('public-model-loading-v531.mjs');
  assert.match(source,/const VERSION='5\.5\.0'/);
  assert.match(source,/alianca-park-logo-full-transparent-v551\.png/);
  assert.match(source,/Seu lugar para/);
  assert.match(source,/crescer e florescer/);
  assert.match(source,/alianca-park-masterplan-static-v534\.webp/);
  assert.doesNotMatch(source,/CENA 3D|IMPLANTAÇÃO DIGITAL|Modelo 3D|Geometria do empreendimento|public-model-loading__plan/);
});

test('estilo troca spinner Android por emblema e formas organicas',()=>{
  const css=read('public-model-loading-v531.css');
  assert.match(css,/ALIANCA_PARK_MARKETING_LOADING_V550/);
  assert.match(css,/public-model-loading__bloom/);
  assert.match(css,/alianca-park-logo-mark-transparent-v551\.png/);
  assert.doesNotMatch(css,/border-top-color:[^;]+;border-radius:50%/);
});

test('pagina publica usa cachebuster da nova abertura',()=>{
  const html=read('public-leads.html');
  assert.ok((html.match(/logo-transparent-v551/g)||[]).length>=5);
});
