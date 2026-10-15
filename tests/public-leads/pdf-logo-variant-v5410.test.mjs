import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('a abertura pública e o PDF compartilham a variante com vãos internos preservados',()=>{
  const loading=read('public-model-loading-v531.mjs');
  const context=read('public-leads-context-v521.mjs');
  const returnReset=read('public-brand-return-reset-v5346.mjs');
  const pdf=read('tmp/pdfs/build_manual_produto_alianca_park.py');

  for(const source of [loading,returnReset])
  assert.match(source,/alianca-park-logo-full-letter-cutouts-v555\.png/);
  for(const source of [context,returnReset])
  assert.match(source,/alianca-park-logo-mark-transparent-v551\.png\?edited=20260915/);

  assert.match(pdf,/alianca-park-logo-full-v5346\.png/);
});

test('o build público publica o controlador de marca da rolagem',()=>{
  const build=read('scripts/build-public-pages.mjs');
  assert.match(build,/public-brand-return-reset-v5346\.mjs/);
});
