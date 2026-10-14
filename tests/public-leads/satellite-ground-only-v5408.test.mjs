import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const readMapScene=()=>[
  read('components.js'),
  read('components/map/admin-road-geometry-v1.mjs'),
  read('components/map/public-road-surface-policy-v1.mjs'),
  read('components/map/public-terrain-environment-v1.mjs'),
].join('\n');

test('mapa público usa a fotografia aérea como superfície canônica das ruas',()=>{
  const source=readMapScene();
  assert.match(source,/disablePublicSyntheticRoads\(\)/);
  assert.match(source,/publicRoadPolicy\s*=\s*["']satellite-only["']/);
  assert.match(source,/publicRoadOcclusionPolicy\s*=\s*["']satellite-road-base-only["']/);
  assert.match(source,/data\.streetPaver\s*\|\|\s*data\.publicRoadOverlay\s*\|\|\s*data\.publicCurb/);
  assert.match(source,/this\._streetPaverMeshes\s*=\s*\[\]/);
  assert.match(source,/satellite image is the road surface/);
  assert.match(source,/publicRoadTextureRequired\s*=\s*["']false["']/);
});

test('o modo público não constrói fatias, pavers ou meios-fios sobre o satélite',()=>{
  const source=readMapScene();
  assert.match(source,/if\s*\(\s*this\.isPublicMapVisual\(\)\s*\)\s*\{[\s\S]*?generated street geometry disabled/);
  assert.match(source,/this\.dataset\.publicRoadPolicy\s*===\s*["']satellite-only["']\s*\|\|\s*this\.isPublicCustomerExperience\(\)/);
  assert.match(source,/this\.dataset\.publicPaverDiagnostic\s*=\s*["']disabled · no generated roads["']/);
  assert.match(source,/this\.dataset\.publicRoadTextureRotation\s*=\s*["']not-applicable["']/);
});

test('o carregamento público conclui quando a rua é coberta pelo mosaico satélite',()=>{
  const loader=read('public-model-loading-v531.mjs');
  assert.match(loader,/publicRoadTextureRequired==='false'/);
  assert.match(loader,/return \['ready','fallback'\]\.includes/);
});

test('o enquadramento conserva o heading do DWG e não gira o raster para imitar o modelo',()=>{
  const source=read('components.js');
  const publicMap=read('public-leads-map-v50.mjs');
  assert.match(source,/model\.rotation\.set\(Math\.PI\/2,0,DWG_PLAN_HEADING_RAD\)/);
  assert.match(source,/publicModelAlignment='DWG plan heading preserved · guide roads come from aerial image'/);
  assert.match(publicMap,/map\.dataset\.publicModelAlignment='DWG plan heading preserved · guide roads come from aerial image'/);
  assert.match(source,/mapSurface\.position\.set\(0,0,SCENE_MAP_Z\)/);
});

test('a implantação pública preserva a orientação corrigida sobre o ajuste afim do DWG',()=>{
  const source=read('components.js');
  assert.match(source,/const PUBLIC_MODEL_NORTH_ROTATION_DEG=-90/);
  assert.match(source,/const PUBLIC_MODEL_NORTH_ROTATION_RAD=\s*PUBLIC_MODEL_NORTH_ROTATION_DEG\*Math\.PI\/180/);
  assert.match(source,/const PUBLIC_MODEL_HORIZONTAL_FLIP=-1/);
  assert.match(source,/const PUBLIC_MODEL_GUIDE_ROTATION_DEG=-90/);
  assert.match(source,/const PUBLIC_MODEL_ALIGNMENT_OFFSET_WORLD_X=-75/);
  assert.match(source,/const PUBLIC_MODEL_ALIGNMENT_OFFSET_WORLD_Z=-775/);
  assert.match(source,/makeScale\(horizontalFlip,1,1\)\s*\.multiply\(new THREE\.Matrix4\(\)\.makeRotationY\(PUBLIC_MODEL_NORTH_ROTATION_RAD\)\)/);
  assert.match(source,/this\.dataset\.publicModelOrientation=`dwg-affine\|orientation-before-fit\|rotate-left-90deg\|flipX-\$\{horizontalFlip\}\|y\+\$\{extraRotationDeg\}deg\|north=upper-road-exit/);
  assert.match(source,/saída superior = norte · giro à esquerda 90° · flip horizontal/);
});

test('o contexto público marca o chão georreferenciado sem criar controle de asfaltamento',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/georreferenciada pelo DWG é a superfície canônica da rua/);
  assert.match(source,/map\.setPublicPavingView\?\.\('satellite',0\)/);
  assert.match(source,/publicRoadPolicy==='satellite-only'/);
});

test('o satélite público preserva o centro do DWG com o nível de detalhe do enquadramento físico',()=>{
  const components=readMapScene();
  const context=read('public-leads-context-v521.mjs');
  assert.match(context,/const PUBLIC_SATELLITE_DWG_ZOOM=18/);
  assert.match(context,/zoom:PUBLIC_SATELLITE_DWG_ZOOM/);
  assert.match(components,/const requestedZoom=Number\(theme\?\.zoom\)/);
  assert.match(components,/theme=\{\.\.\.this\._publicGeoTheme,zoom:Number\.isFinite\(requestedZoom\)\?requestedZoom/);
  assert.match(components,/mapSurfaceTexture\.generateMipmaps=false/);
  assert.match(components,/ctx\.imageSmoothingQuality='high'/);
  assert.match(components,/rgba\(4,11,22,\.012\)/);
});

test('o modo público remove a textura de paralelepípedo em vez de apenas ocultar a rua',()=>{
  const components=readMapScene();
  const mapModule=read('public-leads-map-v50.mjs');
  const polish=read('public-leads-polish-v49.mjs');
  const html=read('public-leads.html');
  assert.match(components,/disablePublicCobbleTexture\(\)\s*\{/);
  assert.match(components,/this\.publicCobbleTexture\s*=\s*null/);
  assert.match(components,/if\s*\(\s*this\.isPublicMapVisual\(\)\s*\|\|\s*this\.isPublicCustomerExperience\(\)\s*\)\s*return null/);
  assert.match(mapModule,/const publicSatellite=map\.dataset\.publicRoadPolicy==='satellite-only'/);
  assert.match(polish,/map\.disablePublicCobbleTexture\?\.\(\)/);
  assert.match(html,/public-satellite-only-v5409/);
});

test('markers comerciais são remontados após reset da cena e mantêm os status resolvidos',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/__publicCommercialMarkerStatusMapV5330\s*=\s*new Map\(statuses\)/);
  assert.match(source,/function ensurePublicCommercialMarkers\(map\)/);
  assert.match(source,/group\.parent\s*===\s*map\.sceneStage/);
  assert.match(source,/recovered-after-scene-reset/);
  assert.match(source,/if\s*\(\s*group\.parent\s*!==\s*map\.sceneStage\s*\)\s*\{[\s\S]*?ensurePublicCommercialMarkers\(map\)/);
  assert.match(source,/if\s*\(\s*map\.dataset\.publicSatelliteImageOnly\s*!==\s*["']true["']\s*&&\s*!ensurePublicCommercialMarkers\(map\)\s*\)\s*scheduleCommercialMapState\(map\)/);
});
