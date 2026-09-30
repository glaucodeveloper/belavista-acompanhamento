import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const css=fs.readFileSync(path.join(root,'public-leads.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public-leads.html'),'utf8');
const context=fs.readFileSync(path.join(root,'public-leads-context-v521.mjs'),'utf8');

test('página pública usa canvas azul-noite para não vazar verde nos vazados do logo',()=>{
  assert.match(css,/BELAVISTA_PUBLIC_ALIANCA_BRAND_V528/);
  assert.match(css,/body\.public-leads-page[^}]*background-color:#070b16/s);
  assert.match(css,/data-public-alianca-brand-v5346\] img\{[^}]*background:transparent/s);
});

test('marca do atendimento usa o mesmo símbolo oficial da capa do PDF',()=>{
  assert.match(context,/const BRAND_MARK=runtimeUrlV1\('\/assets\/public\/alianca-park-logo-mark-transparent-v551\.png\?edited=20260915'\)/);
  assert.match(context,/public-chat-v52-mark/);
  assert.match(html,/theme-color" content="#070b16"/);
  assert.match(html,/public-leads\.css\?v=[^"']+/);
  assert.match(html,/public-leads-context-v521\.mjs\?v=logo-edited-mark-v551/);
});

test('assets oficiais da marca permanecem publicados',()=>{
  for(const asset of ['alianca-park-logo-full-transparent-v552.png','alianca-park-logo-mark-transparent-v551.png'])
    assert.equal(fs.existsSync(path.join(root,'assets/public',asset)),true,asset);
});
