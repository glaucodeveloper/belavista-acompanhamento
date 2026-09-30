import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const css=fs.readFileSync(path.join(root,'admin-brand-style-v1.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('admin usa a camada visual Aliança Park sem contaminar a página pública',()=>{
  assert.match(html,/body class="admin-shell-page"/);
  assert.match(html,/admin-brand-style-v1\.css\?v=alianza-brand-v11-edited-mark-v551-20260915/);
  assert.match(css,/body\.admin-shell-page\{/);
  assert.match(css,/--admin-gold:#f2b632/);
  assert.match(css,/--admin-lime:#a8d34b/);
});

test('shell administrativo usa o símbolo oficial e estados com contraste',()=>{
  assert.match(css,/\.brand-mark,\r?\nbody\.admin-shell-page \.session-mark/);
  assert.match(css,/alianca-park-logo-mark-transparent-v551\.png\?edited=20260915/);
  assert.match(css,/\.nav-item\.active[\s\S]*border-left-color:var\(--admin-gold\)/);
  assert.match(css,/\.complete-ring\{background:conic-gradient\(var\(--admin-gold\)/);
});
