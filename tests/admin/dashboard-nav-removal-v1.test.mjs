import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');

test('navegação sobreposta do dashboard v5362 fica removida visualmente',async()=>{
  const [ui,admin]=await Promise.all([
    readFile(join(root,'belavista-final-ui-v5362.css'),'utf8'),
    readFile(join(root,'admin-brand-style-v1.css'),'utf8')
  ]);
  assert.match(ui,/\.dashboard-nav-v5362\{display:none!important\}/);
  assert.match(admin,/\.dashboard-nav-v5362\{display:none!important;\}/);
});
