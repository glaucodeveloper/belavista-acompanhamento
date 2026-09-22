import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=fs.readFileSync(path.join(root,'public-leads-context-v521.mjs'),'utf8');

test('área funcional exclusiva do mapa usa no máximo 150vh',()=>{
  assert.match(source,/BELAVISTA_PUBLIC_FIXED_150VH_SCROLL_V5324/);
  assert.match(source,/min-height:150vh!important/);
  assert.match(source,/height:150vh!important/);
  assert.match(source,/top:150vh!important/);
  assert.doesNotMatch(source,/min-height:200vh!important|height:200vh!important|top:200vh!important/);
});
