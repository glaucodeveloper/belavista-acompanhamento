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

test('Ctrl + roda controla o zoom e Ctrl + arraste mantém a inclinação',()=>{
  const components=read('components.js');
  assert.match(components,/const zoomSceneAtCursorByCtrlWheel=event=>\{/);
  assert.match(components,/if\(!event\.ctrlKey\|\|event\.defaultPrevented\)return;/);
  assert.match(components,/event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  assert.match(components,/this\.addEventListener\('wheel',zoomSceneAtCursorByCtrlWheel,\{capture:true,passive:false\}\)/);
  assert.match(components,/this\.setSceneZoomAt\(nextZoom,event\.clientX,event\.clientY,false\)/);
  assert.match(components,/this\.dataset\.sceneWheelZoom='ctrl-wheel · cursor-ground'/);
  assert.match(components,/setSceneZoomAt\(value,clientX,clientY,animate=false\)/);
  assert.match(components,/mapZoomAnchor='cursor-ground · rotation-aware'/);
  assert.match(components,/this\.queueSceneBoundsCommit\('ctrl-wheel-zoom'\)/);
  assert.doesNotMatch(components,/queueSceneBoundsCommit\('wheel'\)/);
  assert.match(components,/tilting=!selecting&&event\.button===0&&event\.shiftKey/);
  assert.match(components,/else if\(tilting\)this\.setSceneTiltAdjust\(this\.sceneTiltAdjust\+dy\*TILT_DRAG_SENSITIVITY,false\)/);
  assert.match(components,/MIN_SCENE_TILT=0, MAX_SCENE_TILT=72/);
  assert.match(components,/Math\.max\(\.5,Math\.min\(89\.5,90-tilt\)\)/);
  assert.match(components,/tiltSafety=1\+Math\.sin\(tilt\*Math\.PI\/180\)\*\.58/);
  assert.match(components,/sceneTiltBounds=`\$\{bounds\.min\}–\$\{bounds\.max\}deg`/);
  assert.match(components,/publicCameraInteracted!=='true'/);
  assert.doesNotMatch(components,/if\(this\.isPublicCustomerExperience\(\)\)return;/);
});

test('a roda só aplica zoom com Ctrl no mapa principal, compacto e Leaflet',()=>{
  const components=read('components.js');
  assert.match(components,/if\(!event\.ctrlKey\)return;event\.preventDefault\(\);const source=sharedMapScene/);
  assert.match(components,/scrollWheelZoom:false/);
  assert.match(components,/if\(!event\.ctrlKey\|\|event\.defaultPrevented\)return;/);
  assert.match(components,/this\.addEventListener\('wheel',zoomSceneAtCursorByCtrlWheel,\{capture:true,passive:false\}\)/);
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
