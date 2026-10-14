import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const roadGeometry=read('components/map/admin-road-geometry-v1.mjs');

test('ruas nativas são recortadas pela face superior em blocos físicos',()=>{
  const source=read('components.js')+'\n'+roadGeometry;
  assert.match(source,/createNativeRoadPaverMesh\(THREE,\s*source,\s*streetNo\)/);
  assert.match(source,/Math\.abs\(ny\)\s*\/\s*normalLength\s*>=\s*0\.72/);
  assert.match(source,/const rasterize\s*=\s*\(tileSize\)\s*=>/);
  assert.match(source,/streetPaverCount:\s*cells\.length/);
  assert.match(source,/paverParts,\s*paverPartById/);
  assert.match(source,/const globalRoadAngle\s*=\s*roadPlanarAngleV1/);
  assert.match(source,/roadAngleAt\s*=\s*\(x,\s*z\)\s*=>/);
  assert.match(source,/cells\.push\(\{\s*column,\s*row,\s*x:\s*centerX,\s*z:\s*centerZ,\s*angle\s*\}\)/);
  assert.match(source,/quaternion\.setFromAxisAngle\(upAxis,cell\.angle\+Math\.PI\/4\)/);
  assert.match(source,/streetAlignment:\s*"eixo local da via \+ 45deg de assentamento"/);
  assert.match(source,/ROAD_HALF_LOT_SLICE_WORLD_V1 = 5/);
  assert.match(source,/streetSliceDividers: true/);
  assert.match(source,/streetSliceOrientation: "transversal ao eixo local da rua"/);
  assert.match(source,/publicRoadCoverage = "todas as faces superiores das ruas preenchidas"/);
  assert.match(source,/source\.raycast\s*=\s*\(\)\s*=>\s*\{\}/);
  assert.doesNotMatch(source,/if\(nativeSources\.length\)\{[\s\S]*?return nativeSources;/);
});

test('paver individual permanece selecionável em pintura e status',()=>{
  const source=read('components/map/model-picking-v1.mjs');
  const operationalMap=read('components/map/operational-record-map-v1.mjs');
  assert.match(source,/streetPaverPartAt\(mesh,\s*instanceId\)/);
  assert.match(source,/Number\.isInteger\(hit\.instanceId\)/);
  assert.match(operationalMap,/const root\s*=\s*this\.sceneStage\s*\|\|\s*this\.modelGroup/);
  assert.match(operationalMap,/applyStreetPaverInstanceColors\(selected,\s*color\)/);
  assert.match(operationalMap,/setStreetPaverInstanceColor\(part,/);
  assert.match(read('activity-map-layer.mjs'),/applyStreetPaverInstanceStatusMap/);
});

test('editor e registros usam o mapa inteiro do próprio painel',()=>{
  const editorCss=read('activity-map-editor.css');
  const recordsCss=read('public-records.css');
  assert.match(editorCss,/activity-map-editor-shell \.activity-map-canvas>map-scene/);
  assert.match(editorCss,/canvas\.three-overlay/);
  assert.match(editorCss,/width:100%!important;height:100%!important/);
  assert.match(recordsCss,/map-capture-panel>\.mobile-map-scene/);
  assert.match(read('admin-workers.html'),/activity-map-editor\.css(?:\?v=[^"']*)?/);
  assert.match(read('public-records.html'),/public-records\.css(?:\?v=[^"']*)?/);
});
