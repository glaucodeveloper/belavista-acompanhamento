import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const components = [
  (read('components/map/map-scene-composition-v1.mjs') + read('components.js')),
  read('components/map/admin-standalone-aerial-v5380.mjs'),
  read('components/map/admin-reference-aerial-scene-v1.mjs'),
  read('components/map/model-gpu-enrichment-v5367.mjs'),
  read('components/map/admin-pdf-masterplan-pipeline-v1.mjs'),
  read('components/map/admin-standalone-startup-v5370.mjs'),
  read('components/map/satellite-lot-plan-overlay-v1.mjs'),
  read('components/map/scene-presentation-config-v1.mjs'),
  read('components/map/georeference.mjs'),
].join('\n');
const app = read('app.js');

test('modelo de referência contém 298 lotes completos, não 596 círculos', () => {
  const glb = fs.readFileSync(path.join(root, 'assets/model/alianca_park_masterplan_preview.glb'));
  const jsonLength = glb.readUInt32LE(12);
  const scene = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
  const lots = scene.nodes.filter((node) => /^Lote_\d+$/i.test(node.name || ''));
  assert.equal(lots.length, 298);
  assert.equal(new Set(lots.map((node) => node.name)).size, 298);
});

test('startup administrativo fica instalado no MapScene antes da definição do custom element', () => {
  const composition = (read('components/map/map-scene-composition-v1.mjs') + read('components.js')),
    startup = read('components/map/admin-standalone-startup-v5370.mjs'),
    installAt = composition.indexOf('installAdminStandaloneStartupV5370(MapScene'),
    defineAt = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(composition, /import \{ installAdminStandaloneStartupV5370 \} from "\.\/admin-standalone-startup-v5370\.mjs\?/);
  assert.ok(installAt >= 0 && defineAt > installAt);
  assert.match(startup, /this\.startAdminStandalone3DV5370\(\)/);
  assert.match(startup, /MapScene\.prototype\.startAdminStandalone3DV5370 = async function/);
  assert.match(startup, /await import\("three"\)/);
  assert.match(startup, /loadGlbWithClientCacheV14/);
  assert.match(startup, /warpAdminGlbToFixedAerialV1/);
});

test('carregamento e textura da referência aérea são instalados antes do custom element', () => {
  const composition = (read('components/map/map-scene-composition-v1.mjs') + read('components.js')),
    aerial = read('components/map/admin-standalone-aerial-v5380.mjs'),
    installAt = composition.indexOf('installAdminStandaloneAerialV5380(MapScene'),
    defineAt = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(composition, /import \{ installAdminStandaloneAerialV5380 \} from "\.\/admin-standalone-aerial-v5380\.mjs\?/);
  assert.ok(installAt >= 0 && defineAt > installAt);
  for (const method of [
    'prepareAdminStandaloneAerialPreviewV5380',
    'loadAdminStandaloneSatelliteBaseV5380',
    'bindAdminStandaloneAerialTextureV5380',
  ]) {
    assert.match(aerial, new RegExp(`${method}\\(`));
    assert.doesNotMatch(composition, new RegExp(`^\\s{2}(?:async )?${method}\\(`, 'm'));
  }
  assert.match(aerial, /Object\.defineProperty\(MapScene\.prototype, name/);
});

test('plano aéreo e ambiente derivado do raster são delegados ao módulo de cena', () => {
  const composition = (read('components/map/map-scene-composition-v1.mjs') + read('components.js')),
    scene = read('components/map/admin-reference-aerial-scene-v1.mjs'),
    installAt = composition.indexOf('installAdminReferenceAerialSceneV1(MapScene'),
    defineAt = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(composition, /import \{ installAdminReferenceAerialSceneV1 \} from "\.\/admin-reference-aerial-scene-v1\.mjs\?/);
  assert.ok(installAt >= 0 && defineAt > installAt);
  assert.match(scene, /syncAdminReferenceAerialEnvironmentV1\(\)/);
  assert.match(scene, /syncAdminReferenceAerialSurfaceV1\(\)/);
  assert.match(scene, /document: documentRef = globalThis\.document/);
  assert.doesNotMatch(composition, /^  syncAdminReferenceAerialEnvironmentV1\(/m);
  assert.doesNotMatch(composition, /^  syncAdminReferenceAerialSurfaceV1\(/m);
});

test('lotes e ruas usam contornos extraídos da mesma imagem, sem esticar a malha PDF', () => {
  const lots = JSON.parse(read('assets/data/aerial-lot-trace-v1.json'));
  const roads = JSON.parse(read('assets/data/aerial-road-trace-v1.json'));
  assert.equal(lots.lotCount, 298);
  assert.equal(Object.keys(lots.lots).length, 298);
  assert.ok(lots.snappedEdges > 0);
  assert.ok(roads.roads.length > 0);
  assert.deepEqual(roads.imageSize, lots.imageSize);
  for (const road of roads.roads) {
    assert.ok(road.outer.length >= 3);
    for (const point of road.outer) {
      assert.ok(point[0] >= 0 && point[0] < roads.imageSize[0]);
      assert.ok(point[1] >= 0 && point[1] < roads.imageSize[1]);
    }
  }
  assert.match(components, /createAdminReferenceAerialRoadGeometryV1/);
  assert.match(components, /new THREE\.ShapeGeometry\(shapes\)/);
  assert.match(components, /roadTrace && node\.name === "Asfalto_tracado_do_PDF"/);
  assert.match(components, /useTracedPolygon/);
  assert.match(components, /traceWidth = Math\.max\(1, Number\(trace\?\.imageSize\?\.\[0\]\) \|\| imageWidth\)/);
  assert.match(components, /roadWidth = Math\.max\(1, Number\(roadTrace\?\.imageSize\?\.\[0\]\) \|\| traceWidth\)/);
  assert.match(components, /uv\.u = point\[0\] \/ traceWidth/);
  assert.match(components, /THREE, roadTrace, roadWidth, roadHeight, worldWidth, worldHeight/);
});

test('modelo e textura aérea compartilham um plano horizontal no mapa 3D', () => {
  assert.match(
    components,
    /const modelHeadingRad =\s*\n\s*MODEL_EXTRA_Y_ROTATION_RAD \+\s*\n\s*\(ADMIN_STANDALONE_MODEL_TURN_DEG_V1 \* Math\.PI\) \/ 180[\s\S]*?zUpQuaternion = new THREE\.Quaternion\(\)/,
  );
  assert.match(
    components,
    /wrapper\.quaternion\s*\.copy\(headingQuaternion\)\s*\.multiply\(zUpQuaternion\)/,
  );
  assert.match(components, /alignmentEuler = new THREE\.Euler\(/);
  assert.match(components, /\.multiply\(alignmentQuaternion\)/);
  assert.doesNotMatch(components, /wrapper\.rotate[XYZ]\(/);
  assert.match(components, /const groundFocus = new THREE\.Vector3\(/);
  assert.match(components, /camera\.lookAt\(groundFocus\)/);
  assert.match(components, /groundRight = new THREE\.Vector3\(cameraRight\.x, cameraRight\.y, 0\)/);
  assert.match(components, /groundUp = new THREE\.Vector3\(cameraUp\.x, cameraUp\.y, 0\)/);
  assert.doesNotMatch(components, /wrapper\.position\.addScaledVector\(cameraUp/);
  assert.match(components, /screen fit projected to ground XY/);
  assert.match(components, /surface = new THREE\.Object3D\(\)/);
  assert.match(components, /syncAdminReferenceAerialEnvironmentV1\(\) === true/);
  assert.match(components, /surface\.scale\.set\(surfaceWidth, surfaceHeight, 1\)[\s\S]{0,900}wrapper\.position\.x \+= Number\(alignmentTranslation\.x\)/);
  assert.match(components, /const modelHeadingRad =\s*\n\s*MODEL_EXTRA_Y_ROTATION_RAD \+\s*\n\s*\(ADMIN_STANDALONE_MODEL_TURN_DEG_V1 \* Math\.PI\) \/ 180/);
  assert.match(components, /adminReferenceAerialModelRotation[\s\S]{0,180}effective/);
  assert.match(
    components,
    /const footprint = aerialAnchorFitBox\.getSize\(new THREE\.Vector3\(\)\);\s*const groundWidth = Math\.max\(1, Number\(footprint\.x\) \|\| 1\),\s*groundDepth = Math\.max\(1, Number\(footprint\.y\) \|\| 1\)/,
  );
  assert.match(components, /surface\.rotation\.set\(0, 0, 0\)/);
  assert.match(components, /this\.dataset\.adminStandalone3d = "true"/);
  assert.match(components, /canvas\.style\.setProperty\("transform", "none", "important"\)/);
  assert.match(components, /const standaloneAlignment = ADMIN_STANDALONE_MODEL_ALIGNMENT_V1/);
  assert.match(components, /alignmentTranslation = standaloneAlignment\.translation/);
  assert.match(components, /alignmentScale = Math\.max\(/);
  assert.match(
    components,
    /const ADMIN_STANDALONE_MODEL_STREET_DROP_V1 = 0/,
  );
  assert.match(components, /const ADMIN_STANDALONE_MODEL_TURN_DEG_V1 = 168/);
  assert.match(components, /camera\.up\.set\(0, 0, 1\)/);
  assert.match(components, /ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1 = \{ x: -0\.03, y: 0 \}/);
  assert.match(components, /translation:\s*\{\s*x:\s*-?\d+(?:\.\d+)?,\s*y:\s*-?\d+(?:\.\d+)?,\s*z:\s*-?\d+(?:\.\d+)?\s*\}/);
  assert.match(components, /scaleXY: \{ x: 1, y: 1 \}/);
  assert.match(components, /alignmentScaleX = Math\.max\(/);
  assert.match(components, /alignmentScaleY = Math\.max\(/);
  assert.match(components, /ADMIN_GEO_MODEL_FINE_ROTATION_DEG = -?\d+(?:\.\d+)?/);
  assert.match(components, /ADMIN_GEO_MODEL_FINE_SHIFT_X = -?\d+(?:\.\d+)?/);
  assert.match(components, /ADMIN_GEO_MODEL_FINE_SHIFT_Y = -?\d+(?:\.\d+)?/);
  assert.match(
    components,
    /const ADMIN_STANDALONE_MODEL_ALIGNMENT_V1 = \{[\s\S]{0,700}scale: 1,/,
  );
  assert.doesNotMatch(components, /fineTransform\.scale\.set\(/);
  assert.match(components, /AdminFixedAerialFinePivot/);
  assert.match(components, /finePivot\.position\.set\(center\.x, center\.y, 0\)/);
  assert.match(components, /fineTransform\.quaternion\.setFromAxisAngle/);
assert.match(components, /bindAdminStandaloneAerialTextureV5380/);
assert.match(components, /ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1/);
assert.match(components, /node\.userData\.mapArea = \{/);
assert.match(components, /aerialImageBounds/);
  assert.match(components, /new THREE\.Float32BufferAttribute/);
  assert.match(components, /aerial-image UV 0\.\.1 · origin top-left · world XY projected to the same base plane/);
  assert.match(components, /adminReferenceAerialBasePlane/);
  assert.match(components, /terrain\.position\.z = 0/);
  assert.match(components, /adminReferenceAerialModelElevation/);
  assert.match(components, /adminReferenceAerialModelZCorrection/);
  assert.match(components, /adminReferenceAerialWorldZ/);
  assert.match(components, /adminReferenceAerialGroundPlane/);
  assert.match(components, /terrainPosition\.setZ\(index, 0\)/);
  assert.match(components, /adminReferenceAerialViewport/);
  assert.match(components, /for \(let attempt = 0; attempt < 12; attempt\+\+\)/);
  assert.match(components, /wrapper\.position\.addScaledVector\(groundUp, -shiftY\)/);
  assert.doesNotMatch(
    components,
    /rasterTerrain\.position\.z = Number\(surface\.position\.z \|\| SCENE_MAP_Z\) - 0\.52/,
  );
  assert.match(components, /let terrainContactOffset = 0/);
  assert.match(components, /terrainContactOffset = -terrainMaxRawHeight/);
  assert.match(
    components,
    /shared world XY plane · GLB X\/Z converted to Z-up · aerial texture base/,
  );

  const surfaceSection = components.slice(
    components.indexOf('const footprint = aerialAnchorFitBox.getSize'),
    components.indexOf('this.adminReferenceAerialTextureV1 = texture'),
  );
  assert.doesNotMatch(surfaceSection, /surface\.rotation\.copy\(wrapper\.rotation\)/);
assert.match(components, /ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_ENABLED_V1 = false/);
assert.match(components, /native complete lot\/street polygon · aerial image UV/);
assert.match(components, /lotFootprint\s*\? 0\.06\s*:\s*streetFootprint\s*\? 0\.03/);
assert.match(components, /referenceDividerHidden = true/);
assert.match(components, /Asfalto_tracado_do_PDF\|Rua_\\d\+\|Meio_fio_\\d\+/);
assert.match(components, /uv\.setXY\(index, u, 1 - v\)/);
assert.match(components, /map: texture,[\s\S]{0,250}polygonOffset: true/);
assert.match(components, /buildAdminReferenceAerialRasterMaskModelV1/);
assert.match(components, /site quad filtered from aerial pixels/);
assert.match(components, /same aerial image UV used as model texture/);
assert.match(components, /rasterMaskSourceHidden/);
assert.match(app, /installStageHomeRaidAiRecordsCalendarV1\?\.\(\)/);
});
