import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=fs.readFileSync(path.join(root,'components.js'),'utf8');

test('ruas permanecem integralmente preenchidas e recebem divisões de meio lote',()=>{
  assert.match(source,/const ROAD_HALF_LOT_SLICE_WORLD_V1 = 5/);
  assert.match(source,/roadSurfacePatchVersion = "integral-asphalt-slices-v14"/);
  assert.match(source,/const pavers = new THREE\.Mesh\(surfaceGeometry, paverMaterial\)/);
  assert.match(source,/color: 0x30363a/);
  assert.match(source,/Math\.abs\(ny\) \/ normalLength < 0\.35/);
  assert.match(source,/streetPaverSurface: "integral-asphalt-all-upward-road-faces"/);
  assert.match(source,/publicRoadCenterlineIgnored: true/);
  assert.match(source,/publicRoadSurfaceMode = "asfalto integral · faces superiores completas · centros ignorados"/);
  assert.match(source,/groundInXY/);
  assert.match(source,/streetGroundPlane: groundInXY \? "xy\/z-up" : "xz\/y-up"/);
  assert.match(source,/if \(groundInXY\) surfacePositions\.push\(x, z, surfaceElevation\)/);
  assert.match(source,/buildAdminStandaloneRoadSurfaceV1\(\{/);
  assert.match(source,/asfalto integral georreferenciado/);
  assert.match(source,/publicRoadSurfaceMode: "asfalto integral opaco por contorno da imagem"/);
  assert.match(source,/ensureAdminStandaloneRoadSurfaceV1\(\)/);
  assert.match(source,/this\.ensureAdminStandaloneRoadSurfaceV1\(\);/);
  assert.match(source,/transparent: false,\s+opacity: 1,\s+depthTest: false/);
  assert.match(source,/streetFilledHorizontalSlices: true/);
  assert.match(source,/color: 0x252a2d/);
  assert.match(source,/opacity: 0\.48/);
  assert.match(source,/faces contíguas sobre asfalto integral contínuo/);
  assert.match(source,/publicRoadSliceCount: filledSliceCount/);
  assert.match(source,/publicRoadFaceTriangleCount: filledFaceTriangleCount/);
  assert.match(source,/vertexColors: true/);
  assert.match(source,/clipAtU\(/);
  assert.match(source,/publicRoadSurfaceState = "ready"/);
  assert.match(source,/streetSliceOrientation: "transversal ao eixo local da rua"/);
  assert.match(source,/streetSliceDividers: true/);
  assert.match(source,/streetSliceThickness: ROAD_HALF_LOT_SLICE_WORLD_V1/);
  assert.match(source,/streetSliceOrientation: "transversal ao eixo local da rua"/);
  assert.match(source,/publicRoadCoverage = "todas as faces superiores das ruas preenchidas"/);
  assert.match(source,/publicRoadHalfLotSlice = tileSize\.toFixed\(2\)/);
});

test('divisórias acompanham a direção local sem substituir o recorte exato',()=>{
  assert.match(source,/cell\.angle \|\| globalRoadAngle/);
  assert.match(source,/\+ Math\.PI \/ 2/);
  assert.match(source,/dividerScale\.set\(Math\.max\(0\.4, cell\.width \* 0\.96\), 0\.018, 0\.1\)/);
  assert.match(source,/overlay\.add\(pavers\)/);
  assert.match(source,/overlay\.add\(dividers\)/);
  assert.match(source,/this\.hasAttribute\("data-admin-shared-public-map"\)/);
  assert.match(source,/this\._streetOperationalGeometryReady = false/);
  assert.match(source,/this\.ensureOperationalStreetGeometry\(\)/);
});

test('a cena administrativa usa uma única classe MapScene com o patch viário',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const records=fs.readFileSync(path.join(root,'records-activity-drill-in-v5377.mjs'),'utf8');
  assert.match(index,/admin-original-bootstrap-v5351\.mjs\?road-integral-asphalt-slices-v14/);
  assert.match(app,/components\.js\?v=instagram-api-live-v25&route=ngrok-route-v1&full-image-3d-environment-v1&foreman-surface-v1&admin-map-static-first-v20-scene-only-168&map-aerial-alignment-v88&stage-context-chrome-v5&road-integral-asphalt-slices-v14/);
  assert.match(records,/components\.js\?v=instagram-api-live-v25&route=ngrok-route-v1&full-image-3d-environment-v1&foreman-surface-v1&admin-map-static-first-v20-scene-only-168&map-aerial-alignment-v88&stage-context-chrome-v5&road-integral-asphalt-slices-v14/);
  assert.doesNotMatch(records,/from '\.\/components-road-integral-/);
});
