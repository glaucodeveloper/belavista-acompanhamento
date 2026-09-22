import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('cena pública remove a malha verde sintética e preserva o satélite',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/applySunnyPublicScene/);
  assert.match(source,/kind==='terrain-ring'/);
  assert.match(source,/kind==='extruded-terrain'/);
  assert.match(source,/publicGreenMeshPolicy='satellite terrain only/);
  assert.match(source,/publicGreenMeshRemoved=true/);
});

test('cena pública usa fallback claro e iluminação ensolarada',()=>{
  const source=read('public-leads-context-v521.mjs');
  const style=read('public-leads.css');
  assert.match(source,/SUNNY_SCENE_VERSION='v5\.4\.7'/);
  assert.match(source,/publicSunnyLighting='sunny-day/);
  assert.match(source,/AliançaParkPublicSun/);
  assert.match(source,/linear-gradient\(180deg,#a9cfdd 0%,#d9d7bd 52%,#a28f6d 100%\)/);
  assert.match(style,/filter:none/);
  assert.doesNotMatch(style,/background-image:.*alianca-park-grass-hires/);
});

test('árvores 3D recebem candidatos espaçados das copas na imagem aérea',()=>{
  const components=read('components.js');
  const html=read('public-leads.html');
  assert.match(components,/candidatos de copa/);
  assert.match(components,/const size=128/);
  assert.match(components,/canopyContrast/);
  assert.match(components,/crownSpacing=\.055/);
  assert.match(components,/sampledTerrainPoints\.length>=120/);
  assert.match(components,/source:'satellite-vegetation-candidate'/);
  assert.match(components,/publicSatelliteTreeScan/);
  assert.match(components,/publicSatelliteTreeCount/);
  assert.match(components,/coordinateSource:'DWG-aligned satellite image'/);
  assert.match(html,/public-leads\.js\?v=public-satellite-trees-v5376/);
});
