import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());

test('retângulo visual da seleção por arraste fica oculto',()=>{
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert.match(css,/map-scene \.map-selection-rectangle\{display:none!important\}/);
  assert.match(fs.readFileSync(path.join(root,'components.js'),'utf8'),/finishMapAreaSelection\(/);
});
