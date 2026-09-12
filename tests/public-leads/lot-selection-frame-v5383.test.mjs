import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const css=fs.readFileSync(path.join(root,'public-leads.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public-leads.html'),'utf8');

test('seleção de lote não usa moldura amarela no card público',()=>{
  assert.match(css,/body\.public-leads-page \.public-selected-lot\{[\s\S]*?border:0!important;/);
  assert.match(html,/public-leads\.css\?v=public-lot-selection-frame-v5383/);
});
