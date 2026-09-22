import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('ruas nativas são recortadas pela face superior em blocos físicos',()=>{
  const source=read('components.js');
  assert.match(source,/createNativeRoadPaverMesh\(THREE,source,streetNo\)/);
  assert.match(source,/Math\.abs\(ny\)\/normalLength<\.72/);
  assert.match(source,/const rasterize=\(tileSize\)=>/);
  assert.match(source,/streetPaverCount:cells\.length/);
  assert.match(source,/paverParts,paverPartById/);
  assert.match(source,/const globalRoadAngle=roadPlanarAngleV1/);
  assert.match(source,/roadAngleAt=\(x,z\)=>/);
  assert.match(source,/cells\.push\(\{column,row,x:centerX,z:centerZ,angle\}\)/);
  assert.match(source,/quaternion\.setFromAxisAngle\(upAxis,cell\.angle\+Math\.PI\/4\)/);
  assert.match(source,/streetAlignment:'eixo local da via \+ 45deg de assentamento'/);
  assert.match(source,/source\.raycast=\(\)=>\{\}/);
  assert.doesNotMatch(source,/if\(nativeSources\.length\)\{[\s\S]*?return nativeSources;/);
});

test('paver individual permanece selecionável em pintura e status',()=>{
  const source=read('components.js');
  assert.match(source,/streetPaverPartAt\(mesh,instanceId\)/);
  assert.match(source,/Number\.isInteger\(hit\.instanceId\)/);
  assert.match(source,/const root=this\.sceneStage\|\|this\.modelGroup/);
  assert.match(source,/applyStreetPaverInstanceColors\(selected,color\)/);
  assert.match(source,/setStreetPaverInstanceColor\(source/);
  assert.match(read('activity-map-layer.mjs'),/applyStreetPaverInstanceStatusMap/);
});

test('editor e registros usam o mapa inteiro do próprio painel',()=>{
  const editorCss=read('activity-map-editor.css');
  const recordsCss=read('public-records.css');
  assert.match(editorCss,/activity-map-editor-shell \.activity-map-canvas>map-scene/);
  assert.match(editorCss,/canvas\.three-overlay/);
  assert.match(editorCss,/width:100%!important;height:100%!important/);
  assert.match(recordsCss,/map-capture-panel>\.mobile-map-scene/);
  assert.match(read('admin-workers.html'),/activity-map-editor\.css\?v=street-paver-map-layout-v5378/);
  assert.match(read('public-records.html'),/public-records\.css\?v=street-paver-map-layout-v5378/);
});
