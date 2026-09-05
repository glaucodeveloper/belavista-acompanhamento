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

test('marca do atendimento usa o símbolo oficial e cache bust da identidade',()=>{
  assert.match(context,/const BRAND_MARK=runtimeUrlV1\('\/assets\/public\/alianca-park-logo-mark-transparent-v551\.png'\)/);
  assert.match(context,/public-chat-v52-mark/);
  assert.match(html,/theme-color" content="#070b16"/);
  assert.match(html,/public-leads\.css\?v=brand-v5\.5\.28/);
  assert.match(html,/public-leads-context-v521\.mjs\?v=public-sales-map-v5\.5\.8-brand-mark/);
});

test('assets oficiais da marca permanecem publicados',()=>{
  for(const asset of ['alianca-park-logo-full-v5346.png','alianca-park-logo-mark-v5346.png'])
    assert.equal(fs.existsSync(path.join(root,'assets/public',asset)),true,asset);
});
