import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapSceneSurfacePolicyV1 } from "../../components/map/scene-surface-policy-v1.mjs";

const createScene = ({ attributes = [], pathname = "/", insideAdmin = false, mapInit = "" } = {}) => {
  class MapScene {}
  installMapSceneSurfacePolicyV1(MapScene, { locationRef: { pathname } });
  const scene = new MapScene();
  scene.attributes = new Set(attributes);
  scene.dataset = { mapInit };
  scene.hasAttribute = (name) => scene.attributes.has(name);
  scene.closest = (selector) => selector === "belavista-app" && insideAdmin ? {} : null;
  return scene;
};

test("MapScene public/shared surface policy preserves presentation and camera behavior", () => {
  const publicScene = createScene({ attributes: ["data-public-presentation"] });
  assert.equal(publicScene.isPublicMapVisual(), true);
  assert.equal(publicScene.isPublicCustomerExperience(), true);
  assert.equal(publicScene.isPublicCameraPreset(), true);
  publicScene.markAdminCameraInteracted();
  assert.equal(publicScene.dataset.publicCameraInteracted, "true");
  assert.equal(publicScene.isPublicCameraPreset(), false);

  const sharedAdminScene = createScene({
    attributes: ["data-public-map", "data-admin-shared-public-map"],
    pathname: "/admin/",
  });
  assert.equal(sharedAdminScene.isPublicMapVisual(), true);
  assert.equal(sharedAdminScene.isPublicCustomerExperience(), false);
  assert.equal(sharedAdminScene.isAdminStandalone3DV5370(), true);
  sharedAdminScene.markAdminCameraInteracted();
  assert.equal(sharedAdminScene.dataset.adminCameraInteracted, "true");
});

test("MapScene standalone 3D policy keeps the existing route and editor boundaries", () => {
  assert.equal(createScene({ pathname: "/admin/stages" }).isAdminStandalone3DV5370(), true);
  assert.equal(createScene({ pathname: "/leads" }).isAdminStandalone3DV5370(), false);
  assert.equal(createScene({ pathname: "/", insideAdmin: true }).isAdminStandalone3DV5370(), true);
  assert.equal(createScene({
    attributes: ["data-admin-public-map"], pathname: "/admin",
  }).isAdminStandalone3DV5370(), false);
  assert.equal(createScene({
    attributes: ["data-activity-location-editor"], pathname: "/admin",
  }).isAdminStandalone3DV5370(), false);
  assert.equal(createScene({
    attributes: ["data-admin-shared-public-map"],
    pathname: "/leads",
  }).isAdminStandalone3DV5370(), false);
  assert.equal(createScene({
    attributes: ["data-admin-shared-public-map"],
    pathname: "/leads",
    mapInit: "admin-static-first-v5370",
  }).isAdminStandalone3DV5370(), true);
});

test("components.js installs the extracted MapScene policy before registering the element", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  assert.match(source, /import \{ installMapSceneSurfacePolicyV1 \} from ["']\.\/scene-surface-policy-v1\.mjs/);
  assert.match(source, /installMapSceneSurfacePolicyV1\(MapScene\);[\s\S]*?customElements\.define\("map-scene", MapScene\)/);
  for (const method of [
    "isPublicMapVisual",
    "isPublicCustomerExperience",
    "isAdminPublicMapV1",
    "isPublicCameraPreset",
    "markAdminCameraInteracted",
    "isAdminStandalone3DV5370",
  ]) assert.doesNotMatch(source, new RegExp(`^  ${method}\\(`, "m"));
});
