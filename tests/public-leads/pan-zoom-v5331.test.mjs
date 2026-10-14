import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('pan público usa limites dependentes do zoom',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/getScenePanBounds\(\)/);
  assert.match(source,/bounded-world-translation-zoom-aware-v5332/);
  assert.match(source,/publicPanLimit=.*zoom/);
  assert.doesNotMatch(source,/bounded-half-viewport-v5330/);
});

test('pan projetado acompanha zoom sem dividir duas vezes o deslocamento',()=>{
  const components=read('components.js');
  const runtime=read('public-pan-zoom-runtime-v5344.mjs');
  assert.match(components,/Number\(surface\.width\|\|viewportW\)\*scale\/2-visibleWorldHalfW/);
  assert.match(components,/source:'ray-plane-world'/);
  assert.doesNotMatch(components,/\(b\.x-a\.x\)\/scale/);
  assert.match(runtime,/x:current\.x\+rawDx/);
  assert.doesNotMatch(runtime,/x:current\.x\+\(rawDx\/zoom\)/);
});

test('limite do pan acompanha a inclinação real da câmera',()=>{
  const components=read('components.js');
  assert.match(components,/visibleWorldHalfW=viewportW\*tiltSafety\/2/);
  assert.match(components,/visibleWorldHalfH=viewportH\*tiltSafety\/2/);
  assert.match(components,/screenPointOnMapPlane\(x,y\)/);
  assert.match(components,/panBoundsSource='camera-ground-envelope'/);
  assert.match(components,/SCENE_PAN_SAFETY/);
  assert.match(components,/Number\(surface\.width\|\|viewportW\)\*scale\/2-visibleWorldHalfW/);
  assert.match(components,/target=this\.clampScenePan\(requested\.x,requested\.y\)/);
});

test('roda do mouse e Shift/Ctrl + arraste controlam o zoom',()=>{
  const components=read('components.js');
  const has=(pattern)=>assert.ok(pattern.test(components),`components.js deve corresponder a ${pattern}`);
  has(/const zoomSceneAtCursorByCtrlWheel\s*=\s*\(event\)\s*=>\s*\{/);
  has(/if\s*\(event\.defaultPrevented\)\s*return/);
  has(/event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  has(/this\.addEventListener\(\s*"wheel",\s*zoomSceneAtCursorByCtrlWheel,\s*\{\s*capture:\s*true,\s*passive:\s*false/);
  has(/this\.setSceneZoomAt\(nextZoom,\s*event\.clientX,\s*event\.clientY,\s*false\)/);
  has(/this\.dataset\.sceneWheelZoom\s*=\s*event\.ctrlKey\s*\?\s*"ctrl-wheel · cursor-ground · precise"\s*:\s*"wheel · cursor-ground"/);
  has(/setSceneZoomAt\(value,\s*clientX,\s*clientY,\s*animate\s*=\s*false\)/);
  has(/mapZoomAnchor\s*=\s*"cursor-ground · rotation-aware"/);
  has(/this\.queueSceneBoundsCommit\("wheel-zoom"\)/);
  has(/zooming\s*=\s*!selecting\s*&&\s*event\.button\s*===\s*0\s*&&\s*\(event\.shiftKey\s*\|\|\s*event\.ctrlKey\)/);
  has(/event\.shiftKey\s*\?\s*"shift-drag-zoom"\s*:\s*"ctrl-drag-zoom"/);
  has(/this\.sceneManualZoom\s*-\s*dy\s*\*\s*ZOOM_DRAG_SENSITIVITY/);
  has(/event\.deltaY\s*<\s*0\s*\?\s*1\s*:\s*-1\)\s*\*\s*\(event\.ctrlKey\s*\?\s*0\.025\s*:\s*0\.07/);
  assert.match(components,/MIN_SCENE_TILT\s*=\s*0,\s*MAX_SCENE_TILT\s*=\s*72/);
  assert.match(components,/Math\.max\(0\.5,\s*Math\.min\(89\.5,\s*90\s*-\s*tilt\)\)/);
  assert.match(components,/tiltSafety\s*=\s*1\s*\+\s*Math\.sin\(\(tilt\s*\*\s*Math\.PI\)\s*\/\s*180\)\s*\*\s*0\.58/);
  assert.match(components,/sceneTiltBounds\s*=\s*`\$\{bounds\.min\}–\$\{bounds\.max\}deg`/);
  assert.match(components,/publicCameraInteracted\s*!==\s*"true"/);
  assert.doesNotMatch(components,/if\s*\(this\.isPublicCustomerExperience\(\)\)\s*return/);
});

test('a roda aplica zoom sem Ctrl e mantém Ctrl como ajuste fino',()=>{
  const components=read('components.js');
  assert.match(components,/event\.preventDefault\(\);\s*const source\s*=\s*sharedMapScene/);
  assert.doesNotMatch(components,/if\s*\(!event\.ctrlKey\)\s*return;\s*event\.preventDefault\(\);\s*const source = sharedMapScene/);
  assert.match(components,/scrollWheelZoom:\s*false/);
  assert.match(components,/event\.ctrlKey\s*\?\s*0\.025\s*:\s*0\.07/);
  assert.match(components,/this\.addEventListener\(\s*"wheel",\s*zoomSceneAtCursorByCtrlWheel,\s*\{\s*capture:\s*true,\s*passive:\s*false/);
});

test('filtros informacionais entram e saem do modelo 3D com transição',()=>{
  const components=read('components.js');
  const style=read('styles.css');
  assert.match(components,/STAGE_FILTER_TRANSITION_MS=520/);
  assert.match(components,/transitionStageOverlay\(targetKey\)/);
  assert.match(components,/overlayTransitionProgress/);
  assert.match(components,/fromOpacity=entering\?0/);
  assert.match(components,/stageOverlayKey=null/);
  assert.match(style,/data-overlay-transition="entering"/);
  assert.match(style,/transition:color 180ms ease/);
});

test('loader entrega 80% e mantém os 20% finais no modelo',()=>{
  const loader=read('public-model-loading-v531.mjs');
  const style=read('public-model-loading-v531.css');
  assert.match(loader,/LOADER_SHARE=80/);
  assert.doesNotMatch(loader,/LOADER_SHARE=75/);
  assert.match(loader,/Math\.min\(LOADER_SHARE,clamp\(shown\)\)/);
  assert.match(loader,/modelAreaProgress/);
  assert.doesNotMatch(loader,/HARD_RELEASE_MS|MISSING_RUNTIME_RELEASE_MS/);
  assert.doesNotMatch(loader,/Promise\.race|wait\(5000\)/);
  assert.match(loader,/data-model-area-spinner/);
  assert.match(loader,/watchModelArea/);
  assert.match(loader,/close\(info\.state==='ready'\?'ready':'handoff-80'\)/);
  assert.match(loader,/setTimeout\(\(\)=>loader\.remove\(\),260\)/);
  assert.match(style,/public-model-area-spinner__ring/);
  assert.match(style,/loadingLogoPulse/);
  assert.match(style,/var\(--model-area-progress/);
});

test('mapa público usa enquadramento compacto e floresta periférica',()=>{
  const components=read('components.js');
  assert.match(components,/MODEL_PUBLIC_FIT_RATIO=1\.10/);
  assert.match(components,/public-dwg-envelope-z18/);
  assert.match(components,/BelavistaPublicSurroundingForest/);
  assert.match(components,/publicForestTreeCount/);
  assert.match(components,/bounds\.min\.x-offset/);
  assert.match(components,/perimeter forest bands/);
});

test('markers públicos mantêm escala fixa na tela durante o zoom',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/fixedScreenPx/);
  assert.match(source,/fixed-screen-size/);
  assert.match(source,/lot-polygon-centroid/);
  assert.match(source,/plastic-teardrop-pin-3d/);
  assert.match(source,/viewportHeight/);
  assert.match(source,/desiredPixels/);
  assert.match(source,/zoom-independent/);
  assert.match(source,/marker\.scale\.setScalar\(Math\.max\(\.001/);
});

test('markers públicos são ancorados no polígono do lote e conferidos pelo DWG',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/buildPublicLotPolygonIndex/);
  assert.match(source,/publicLotPolygonHull/);
  assert.match(source,/publicLotPolygonCentroid/);
  assert.match(source,/GLB footprint vertices · DWG georeference lot key\/area\/GPS/);
  assert.match(source,/polygonVertexCount/);
  assert.match(source,/dwgAlignmentErrorM/);
  assert.match(source,/publicLotPolygonMapping/);
  assert.doesNotMatch(source,/world\.z=bounds\.max\.z;[\s\S]{0,180}lot-top-center/);
});

test('cada lote canônico recebe um marcador sem amostragem ou limite artificial',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/const lots=publicLotParts\(map\)/);
  assert.match(source,/lots\.forEach\(\(lot,index\)=>/);
  assert.match(source,/marker\.userData=\{[\s\S]*bodyCenter:'lot-polygon-centroid'/);
  assert.match(source,/publicCommercialMarkerMapping=`\$\{group\.children\.length\} markers visíveis \/ \$\{lots\.length\} lotes canônicos/);
  assert.doesNotMatch(source,/fallbackLimit\s*=\s*24/);
  assert.doesNotMatch(source,/group\.children\.length\s*>=\s*42/);
});
