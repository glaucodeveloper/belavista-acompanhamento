import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('area social recebe materiais semanticos antes da classificacao generica',()=>{
  const source=read('components.js');
  assert.match(source,/makeSocialAreaMaterial\(THREE,material,objectName/);
  assert.match(source,/belavistaSocialMaterialVersion:'social-pbr-v552'/);
  assert.match(source,/isSocial\?'other'/);
  assert.match(source,/surface='grass';color=0x397944/);
  assert.match(source,/surface='sand';color=0xd0b982/);
  assert.match(source,/surface='wood';color=0x8c5735/);
  assert.match(source,/surface='roof';color=0xa95738/);
});

test('grama 3D fica vertical, pequena e limitada para preservar desempenho',()=>{
  const source=read('components.js');
  assert.match(source,/new THREE\.ConeGeometry\(\.052,\.38,3,1\)/);
  assert.match(source,/grassGeometry\.rotateX\(Math\.PI\/2\)/);
  assert.match(source,/Math\.min\(840/);
});

test('pagina publica invalida cache dos materiais antigos',()=>{
  assert.match(read('public-leads.js'),/components\.js\?v=(?:social-pbr-v552|assistant-typewriter-v553)/);
  const html=read('public-leads.html');
  assert.match(html,/public-leads\.js\?v=(?:social-pbr-v552|assistant-typewriter-v553)/);
  assert.match(html,/public-leads-map-v50\.mjs\?v=social-pbr-v552/);
});
