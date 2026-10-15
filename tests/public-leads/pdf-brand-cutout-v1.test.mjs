import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('leads usa a camada de marca transparente derivada do PDF',()=>{
  const html=read('public-leads.html');
  const module=read('public-pdf-brand-v1.mjs');
  const css=read('public-leads.css');
  assert.match(html,/public-pdf-brand-v1\.mjs\?v=pdf-logo-letter-counters-v554/);
  assert.match(html,/public-leads\.css\?v=public-pdf-logo-cutout-v2-transparent-v552-20260915/);
  assert.match(module,/alianca-park-masterplan-static-v535-no-photo\.webp/);
  assert.match(module,/alianca-park-logo-full-cutouts-v554\.png/);
  assert.match(module,/textura verde removida · logo \+ nome preservados/);
  assert.match(css,/public-pdf-brand-layer/);
  assert.match(css,/data-public-scroll-section="map"/);
});
