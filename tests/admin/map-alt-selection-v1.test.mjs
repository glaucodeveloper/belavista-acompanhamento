import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('Alt mais arraste ativa seleção de progresso no mapa principal e compartilhado',()=>{
  const bindings=components.match(/const altSelection=event\.altKey&&event\.button===0;/g)||[];
  assert.equal(bindings.length,2);
  assert.equal((components.match(/if\(altSelection&&!this\.recordPaintMode&&this\.mapSelectionMode!=='progress'\)this\.setMapSelectionMode\('progress'\);/g)||[]).length,2);
  assert.match(components,/Alt \+ clique \/ arraste<\/b><span>selecionar progresso/);
});

test('Alt + arraste deixa a moldura do retângulo visível sobre o mapa',()=>{
  assert.match(styles,/map-scene \.map-selection-rectangle\{position:absolute;z-index:27;display:block!important/);
  assert.match(styles,/pointer-events:none/);
});
