import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('markers numerados dos leads usam a geometria real dos lotes',()=>{
  const source=read('activity-map-layer.mjs');
  assert.match(source,/import \{appStore,demoData\} from '\.\/state\.js'/);
  assert.match(source,/function lotNumber\(value\)/);
  assert.match(source,/AliançaPark_LeadNumberMarkers/);
  assert.match(source,/map\.physicalMapParts\?\.\(\)\|\|\[\]/);
  assert.match(source,/new THREE\.Box3\(\)\.setFromObject\(part\)/);
  assert.match(source,/host\.worldToLocal\(world\.clone\(\)\)/);
});

test('o marker conserva contagem e lote, seguindo o canvas 3D sem bloquear seleção',()=>{
  const source=read('activity-map-layer.mjs');
  assert.match(source,/sprite\.userData=\{leadLotNumber:group\.number,leadLotLabel:group\.label,leadCount:group\.count/);
  assert.match(source,/sprite\.raycast=\(\)=>\{\}/);
  assert.match(source,/group\.selected\?'#24a148':'#0f62fe'/);
});

test('markers são recalculados quando o modelo, câmera ou leads mudam',()=>{
  const source=read('activity-map-layer.mjs');
  assert.match(source,/data-scene-pan/);
  assert.match(source,/data-scene-zoom/);
  assert.match(source,/data-scene-rotation/);
  assert.match(source,/data-scene-tilt/);
  assert.match(source,/appStore\.subscribe\?\.\(\(\)=>updateLeadMarkers\(\)\)/);
  assert.match(source,/leadNumberMarkers/);
});
