import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('o HTML público não carrega Leaflet nem provedores de mapas',()=>{
  const html=read('public-leads.html');
  assert.doesNotMatch(html,/leaflet@|unpkg\.com\/leaflet|server\.arcgisonline\.com|tile\.openstreetmap/i);
});

test('a página pública usa a captura local centrada pelo DWG',()=>{
  const components=[(read('components/map/map-scene-composition-v1.mjs') + read('components.js')),read('components/map/map-scene-sync-v1.mjs')].join('\n');
  const context=read('public-leads-context-v521.mjs');
  const build=read('scripts/build-public-pages.mjs');
  const image=path.join(root,'assets/public/dwg-satellite-treated-v5411.png');

  assert.ok(fs.statSync(image).size>10000);
  assert.match(components,/GENERATED_AERIAL_ASSET\s*=\s*["']\/assets\/public\/dwg-satellite-treated-v5411\.png["']/);
  assert.match(components,/static-capture-no-maps/);
  assert.match(components,/projectPublicStaticPointV1/);
  assert.match(context,/const mapMode='generated'/);
  assert.match(context,/assets\/data\/dwg-georeference\.json/);
  assert.match(context,/local captured satellite image · DWG-centred source · no Maps/);
  assert.match(build,/dwg-satellite-treated-v5411\.png/);
});

test('Ctrl + arraste esquerdo mantém zoom sem depender do mapa',()=>{
  const components=(read('components/map/map-scene-composition-v1.mjs') + read('components.js'));
  assert.match(components,/zooming\s*=\s*!selecting\s*&&\s*event\.button\s*===\s*0\s*&&\s*\(event\.shiftKey\s*\|\|\s*event\.ctrlKey\)/);
  assert.match(components,/this\.setSceneZoomAt\(\s*this\.sceneManualZoom\s*-\s*dy\s*\*\s*ZOOM_DRAG_SENSITIVITY/);
});
