import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=(fs.readFileSync(path.resolve('components/map/map-scene-composition-v1.mjs'), 'utf8') + (fs.readFileSync(path.join(root, 'components/map/map-scene-composition-v1.mjs'), 'utf8') + fs.readFileSync(path.join(root, 'components.js'), 'utf8')));
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('Alt mais arraste ativa seleção de progresso no mapa principal e compartilhado',()=>{
  const bindings=components.match(/const\s+altSelection\s*=\s*event\.altKey\s*&&\s*event\.button\s*===\s*0;/g)||[];
  assert.equal(bindings.length,2);
  assert.equal((components.match(/if\s*\(\s*altSelection\s*&&\s*!this\.recordPaintMode\s*&&\s*this\.mapSelectionMode\s*!==\s*"progress"\s*\)\s*this\.setMapSelectionMode\("progress"\)/g)||[]).length,2);
  assert.match(components,/Alt \+ clique \/ arraste<\/b><span>selecionar progresso/);
});

test('Alt + arraste deixa a moldura do retângulo visível sobre o mapa',()=>{
  assert.match(styles,/map-scene \.map-selection-rectangle\{position:absolute;z-index:27;display:block!important/);
  assert.match(styles,/pointer-events:none/);
});
