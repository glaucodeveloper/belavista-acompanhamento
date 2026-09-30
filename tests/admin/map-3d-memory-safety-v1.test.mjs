import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.BELAVISTA_ROOT || process.cwd());
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("camada 3D reutiliza geometrias semânticas nativas quando a textura já foi ligada", () => {
  assert.match(components, /options\.cloneGeometry === false/);
  assert.match(components, /currentUv\?\.count === position\.count/);
  assert.match(components, /const geometryReferences = new Map\(\)/);
  assert.match(components, /cloneGeometry: \(geometryReferences\.get\(node\.geometry\) \|\| 0\) > 1/);
  assert.match(components, /if \(node\.userData\?\.pdfMapTextureBound\)/);
  assert.match(components, /projected duplicate buffers/);
});

test("admin mostra a imagem aérea e inicia o GLB depois do primeiro paint", () => {
  assert.match(
    components,
    /if \(this\.hasAttribute\("data-admin-shared-public-map"\)\) return isAdminRoute/,
  );
  assert.match(components, /admin-reference-aerial-realistic-preview-v2/);
  assert.match(components, /admin3dAutostart = "after-static-first-paint"/);
  assert.match(components, /window\.setTimeout\(\(\) => start\(\), 350\)/);
  assert.match(components, /button\.hidden = true/);
  assert.match(components, /button\.hidden = false/);
  assert.match(components, /renderer\.shadowMap\.enabled = false/);
  assert.match(components, /host\.style\.setProperty\("background-image", "none", "important"\)/);
  assert.match(components, /disabled-three-scene-only/);
  assert.match(components, /scene texture only/);
  assert.match(components, /await this\.loadAdminStandaloneSatelliteBaseV5380\(/);
  assert.match(components, /await this\.prepareAdminStandaloneAerialPreviewV5380\(/);
  assert.match(components, /ready-three-terrain-preview/);
  assert.match(components, /preview plane · will be fitted to the GLB site envelope/);
  assert.match(components, /new THREE\.PlaneGeometry\([\s\S]{0,220}ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1/);
  assert.match(components, /new THREE\.MeshBasicMaterial\([\s\S]{0,260}map: texture[\s\S]{0,260}toneMapped: false/);
  assert.match(components, /host\.style\.setProperty\("background-image", "none", "important"\)/);
  assert.match(styles, /map-scene\[data-admin-standalone-boot\]>\.map-host,[\s\S]{0,260}background-image:none!important/);
  assert.match(components, /ready-three-terrain/);
  assert.match(components, /three-scene-texture/);
  assert.match(components, /single Three\.js terrain mesh · aerial image is base and texture/);
  assert.match(components, /three-terrain-texture-active/);
  assert.match(components, /ADMIN_REFERENCE_AERIAL_ASSET_V1,\r?\n\s+`v=\$\{ADMIN_REFERENCE_AERIAL_VERSION_V1\}`/);
  assert.match(components, /_adminStandaloneGroundFootprintV5370/);
  assert.match(components, /surface\.rotation\.set\(0, 0, 0\)/);
  assert.match(components, /shared world XY plane · GLB X\/Z converted to Z-up · aerial texture base/);
  assert.match(components, /bindAdminStandaloneAerialTextureV5380/);
  assert.match(components, /trees \+ vehicles · synthetic houses disabled · flat aerial ground/);
  assert.match(components, /semantic GLB fitted to reference aerial site window · cover-aware/);
  assert.match(components, /const coverScale = Math\.max/);
  assert.match(components, /ADMIN_STANDALONE_MODEL_TURN_DEG_V1\s*=\s*-?\d+(?:\.\d+)?/);
  assert.match(components, /ADMIN_STANDALONE_MODEL_STREET_DROP_V1 = 0/);
  assert.match(components, /ADMIN_STANDALONE_BASE_TILT_DEG_V1 = 37/);
  assert.match(components, /data-scene-tilt-range/);
  assert.match(components, /setAdminStandaloneTiltV5370\(/);
  assert.match(components, /adminStandaloneCurrentFocusPointV5370\(\)/);
  assert.match(components, /current-ground-focus/);
  assert.match(components, /_adminStandaloneFocusPointV5370 = point\.clone\(\)/);
  assert.match(components, /range \+ buttons \+ shift-drag · standalone/);
  assert.match(components, /const controls = this\.querySelector\("\.map-rotation-controls"\)/);
  assert.match(components, /controls\.hidden = !interactiveMapViews\.has\(view\)/);
  assert.match(components, /adminReferenceAerialRoadAlignment/);
  assert.match(components, /const camera = new THREE\.OrthographicCamera\(\s*-?\d+[\s\S]{0,140}0\.1,\s*4000/);
  assert.match(components, /adminStandaloneCameraProjection = "orthographic"/);
  assert.match(components, /camera\.isOrthographicCamera\s*\?/);
  assert.match(components, /camera\.top - camera\.bottom/);
  assert.match(components, /somente GLB/);
  assert.match(components, /blocked-until-explicit-activation/);
  assert.match(components, /_adminStandaloneActivatedV5370/);
  assert.ok(
    components.includes(
      'this.querySelector("[data-map-3d-loading]")?.setAttribute("hidden", "")',
    ),
  );
  assert.match(components, /data-admin-3d-activate-v5370/);
  const bridge = fs.readFileSync(
    path.join(root, "admin-public-map-surface-v5352.mjs"),
    "utf8",
  );
  const status = fs.readFileSync(
    path.join(root, "admin-public-map-3d-status-v5353.mjs"),
    "utf8",
  );
  const publicMap = fs.readFileSync(
    path.join(root, "public-leads-map-v50.mjs"),
    "utf8",
  );
  assert.match(bridge, /static-first-isolated/);
  assert.match(status, /idle-explicit-activation/);
  assert.match(publicMap, /mapInit==='admin-static-first-v5370'/);
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(app, /ADMIN_STATIC_FIRST_MAP_MODULES_V5370/);
  assert.match(app, /static-map-only/);
  assert.match(app, /isolated:true/);
  assert.match(app, /skipped/);
  assert.match(app, /isAdminStaticFirstMapV5370\(\)\&\&ADMIN_STATIC_FIRST_MAP_MODULES_V5370\.has/);
});
