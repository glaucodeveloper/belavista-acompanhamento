import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installAdminPdfMasterplanPipelineV1 } from "../../components/map/admin-pdf-masterplan-pipeline-v1.mjs";

const values = {
  ADMIN_REFERENCE_AERIAL_ASSET_V1: "/reference.jpg",
  ADMIN_REFERENCE_AERIAL_VERSION_V1: "test",
  ADMIN_SEMANTIC_3D_LAYER_VERSION_V1: "semantic-v1",
  DWG_PLAN_HEADING_DEG: 0,
  DWG_PLAN_HEADING_RAD: 0,
  MODEL_VERTICAL_EXAGGERATION: 1,
  PDF_MASTERPLAN_MODEL_TEXTURE_VERSION: "pdf-model-v1",
  PDF_MASTERPLAN_PAGE_SIZE_V1: { width: 100, height: 120 },
  PDF_MASTERPLAN_SITE_FRAME_V1: { left: 0, top: 0, right: 1, bottom: 1 },
  PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1: 0,
  PDF_MASTERPLAN_VEHICLE_ANCHORS_V1: [],
  PDF_MODEL_TEXTURE_BRIGHTNESS: 1,
  SCENE_MODEL_BASE_Z: 0,
  loadGlbWithClientCacheV14() {},
  runtimeRouteV1(path) { return path; },
  browser: {
    document: { createElement() {} },
    Image: class Image {},
    CustomEvent: class CustomEvent {},
    performance: { now() { return 0; } },
    console: { warn() {}, error() {} },
  },
};

test("PDF masterplan pipeline installs all 13 connected model methods on MapScene", () => {
  class MapScene {}
  installAdminPdfMasterplanPipelineV1(MapScene, values);
  for (const method of [
    "loadAdminPdfMasterplanUnderlayV1",
    "syncAdminPdfMasterplanUnderlayV1",
    "pdfMasterplanPageFrameV1",
    "adminReferenceAerialProjectionFrameV1",
    "projectPdfElementGeometryV1",
    "bindPdfMapTextureToMasterplanV1",
    "createPdfVehicleExtrusionsV1",
    "classifyPdfElementKindV1",
    "pdfLotNumberV1",
    "findPdfLotIntegrationV1",
    "pdfElementImageAnchorV1",
    "buildPdfMasterplan3DLayerV1",
    "loadMasterplan",
  ]) assert.equal(typeof MapScene.prototype[method], "function", method);
});

test("composition keeps GLB and PDF methods installed before map-scene registration", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    module = await readFile(new URL("../../components/map/admin-pdf-masterplan-pipeline-v1.mjs", import.meta.url), "utf8"),
    installAt = composition.indexOf("installAdminPdfMasterplanPipelineV1(MapScene"),
    defineAt = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(composition, /import \{ installAdminPdfMasterplanPipelineV1 \} from "\.\/admin-pdf-masterplan-pipeline-v1\.mjs\?/);
  assert.ok(installAt >= 0 && defineAt > installAt);
  assert.match(module, /this\.loadAdminPdfMasterplanUnderlayV1\(\)/);
  assert.match(module, /this\.buildPdfMasterplan3DLayerV1\(/);
  assert.match(module, /loadGlbWithClientCacheV14\(/);
  assert.match(module, /this\.stageMasterplanGpuV5367\(/);
  assert.doesNotMatch(composition, /^  loadAdminPdfMasterplanUnderlayV1\(/m);
  assert.doesNotMatch(composition, /^  buildPdfMasterplan3DLayerV1\(/m);
  assert.doesNotMatch(composition, /^  loadMasterplan\(/m);
});
