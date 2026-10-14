import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.BELAVISTA_ROOT || process.cwd());
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const config = read('components/map/scene-presentation-config-v1.mjs');
const navigation = read('components/map/scene-navigation-v1.mjs');
const surfacePolicy = read('components/map/scene-surface-policy-v1.mjs');
const georeference = read('components/map/georeference.mjs');
const pdfPipeline = read('components/map/admin-pdf-masterplan-pipeline-v1.mjs');
const dwgGeoreference = read('components/map/public-dwg-georeference-v1.mjs');
const terrain = read('components/map/public-terrain-environment-v1.mjs');

test('mapa administrativo conserva câmera de topo e o intervalo completo de inclinação', () => {
  assert.match(config, /MIN_SCENE_TILT\s*=\s*0/);
  assert.match(config, /MAX_SCENE_TILT\s*=\s*72/);
  assert.match(config, /SCENE_TILT_ADJUST_LIMIT\s*=\s*72/);
  assert.match(surfacePolicy, /isPublicCameraPreset\(\)[\s\S]*?this\.isAdminPublicMapV1\(\)/);
  assert.match(navigation, /Math\.max\(0\.5,\s*Math\.min\(89\.5,\s*90\s*-\s*tilt\)\)/);
  assert.match(navigation, /clampSceneTilt\(value\)[\s\S]*?Math\.max\(bounds\.min,\s*Math\.min\(bounds\.max/);
});

test('zoom out mantém a inclinação independente do fator de zoom', () => {
  assert.match(config, /SCENE_TILT_ZOOM_OUT_FACTOR\s*=\s*1/);
  assert.match(navigation, /sceneTiltZoomPolicy\s*=\s*["']independente do zoom · zoom out preserva inclinação["']/);
  assert.match(navigation, /max:\s*Math\.min\(MAX_SCENE_TILT,\s*MAX_SCENE_TILT\s*\*\s*tiltZoomFactor\)/);
  assert.doesNotMatch(navigation, /const coverageMax\s*=\s*coverage\s*>=\s*3\.2/);
});

test('o perímetro verde sintético fica invisível e as clareiras seguem o DWG', () => {
  assert.match(terrain, /ring\.visible\s*=\s*false/);
  assert.match(terrain, /publicGreenMeshRemoved\s*:\s*true/);
  assert.match(terrain, /6 DWG-aligned green clearings · rectangular perimeter disabled/);
});

test('a prancha mantém frame próprio e a superfície administrativa usa uma única referência aérea', () => {
  assert.match(georeference, /PDF_MASTERPLAN_UNDERLAY_ASSET\s*=\s*["']\/assets\/public\/alianca-park-masterplan-static-v535-no-photo\.webp["']/);
  assert.match(georeference, /PDF_MASTERPLAN_PAGE_SIZE_V1\s*=\s*\{\s*width:\s*1800,\s*height:\s*2098\s*\}/);
  assert.match(georeference, /PDF_MASTERPLAN_SITE_FRAME_V1\s*=\s*\{\s*left:\s*0\.1,\s*top:\s*0\.045,\s*right:\s*0\.935,\s*bottom:\s*0\.945/);
  assert.match(georeference, /PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1\s*=\s*0\.018/);
  assert.match(pdfPipeline, /source:\s*ADMIN_REFERENCE_AERIAL_ASSET_V1/);
  assert.match(pdfPipeline, /single surface · contain · no duplicate PDF\/image plane/);
  assert.match(pdfPipeline, /single reference aerial · semantic objects only/);
  assert.match(pdfPipeline, /syncAdminPdfMasterplanUnderlayV1\(\)/);
  assert.match(pdfPipeline, /this\.adminPdfMasterplan3DGroupV1\s*=\s*group/);
  assert.doesNotMatch(pdfPipeline, /new THREE\.Mesh\(geometry,\s*material\)/);
  assert.ok(fs.existsSync(path.join(root, 'assets/public/alianca-park-masterplan-static-v535-no-photo.webp')));
});

test('elementos semânticos usam geometria GLB nativa, sem extrusão visual de lotes ou ruas', () => {
  assert.match(georeference, /PDF_MASTERPLAN_3D_LAYER_VERSION\s*=\s*["']pdf-derived-elements-v1["']/);
  for (const contract of [
    'classifyPdfElementKindV1', 'pdfLotNumberV1', 'findPdfLotIntegrationV1',
    'pdfElementImageAnchorV1', 'projectPdfElementGeometryV1',
    'BelavistaPdfVehicleExtrusions', 'pdf-lot-integration-ready',
    'native semantic GLB meshes + reference aerial vehicle crops',
    'native semantic mesh reuse · projected duplicates disabled',
    'only trees + structures + cars · no lot/street visual extrusion',
    'lotNumber + pdfLotIntegrationKey + pdfImageAnchor',
  ]) assert.ok(pdfPipeline.includes(contract), `missing semantic map contract: ${contract}`);
  assert.doesNotMatch(pdfPipeline, /buildPdfRasterExtrusionModelV1/);
  assert.match(pdfPipeline, /bindPdfMapTextureToMasterplanV1/);
});

test('rotação do mapa administrativo é distinta da rotação legada do modelo público', () => {
  assert.match(config, /MODEL_EXTRA_Y_ROTATION_DEG\s*=\s*180/);
  assert.match(config, /ADMIN_FIXED_MAP_ROTATION_DEG\s*=\s*180/);
  assert.match(config, /ADMIN_PDF_DISPLAY_Y_ROTATION_DEG\s*=\s*0/);
  assert.match(dwgGeoreference, /makeRotationY\(extraRotationRad\)/);
  assert.match(dwgGeoreference, /const adminPdfDisplay\s*=\s*this\.hasAttribute\("data-admin-shared-public-map"\)/);
  assert.match(dwgGeoreference, /extraRotationYDeg:\s*extraRotationDeg/);
  assert.match(dwgGeoreference, /similarity-2d · escala horizontal uniforme · proporção do PDF preservada/);
  assert.match(dwgGeoreference, /const horizontalScale\s*=\s*Math\.hypot\(cosScale,\s*sinScale\)/);
  assert.match(dwgGeoreference, /this\.dataset\.publicModelOrientation\s*=\s*adminPdfDisplay/);
});

test('projeção do dashboard preserva o plano X/Z do GLB no frame georreferenciado', () => {
  assert.match(dwgGeoreference, /const orientationMatrix\s*=\s*adminPdfDisplay[\s\S]{0,100}new THREE\.Matrix4\(\)/);
  assert.match(dwgGeoreference, /const sourcePlaneY\s*=\s*adminPdfDisplay\s*\?\s*Number\(orientedLocal\.z\)\s*:\s*-Number\(orientedLocal\.z\)/);
  assert.match(dwgGeoreference, /source-xz-frame\|flipX-1\|y\+\$\{extraRotationDeg\}deg\|north=loading-reference/);
  assert.match(dwgGeoreference, /O export do GLB usa X\/Z como plano da implantação/);
});
