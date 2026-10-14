import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installAdminMasterplanAdjustmentV1 } from "../../components/map/admin-masterplan-adjustment-v1.mjs";

test("masterplan adjustment installer binds the existing method to MapScene", () => {
  class MapScene {}
  installAdminMasterplanAdjustmentV1(MapScene, {
    document: { createElement() {} },
    getComputedStyle() {},
    localStorage: { getItem() {}, setItem() {}, removeItem() {} },
    window: { addEventListener() {}, removeEventListener() {} },
  });
  assert.equal(typeof MapScene.prototype.installAdminMasterplanDevToolsV1, "function");
});

test("map adjustment controls retain their DOM behavior and install before custom element registration", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    module = await readFile(new URL("../../components/map/admin-masterplan-adjustment-v1.mjs", import.meta.url), "utf8"),
    overlay = await readFile(new URL("../../components/map/admin-masterplan-overlay-v1.mjs", import.meta.url), "utf8"),
    installAt = composition.indexOf("installAdminMasterplanAdjustmentV1(MapScene"),
    overlayInstallAt = composition.indexOf("installAdminMasterplanOverlayV1(MapScene"),
    defineAt = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(overlay, /this\.installAdminMasterplanDevToolsV1\(\{ layer, fit, transform, defaultFrame, frameStorageKey, readFrame, sync \}\)/);
  assert.ok(installAt >= 0 && overlayInstallAt > installAt && defineAt > overlayInstallAt);
  assert.doesNotMatch(composition, /^  installAdminMasterplanDevToolsV1\(/m);
  assert.match(module, /data-map-marker-adjust-toggle/);
  assert.match(module, /data-map-frame-adjust-toggle/);
  assert.match(module, /data-map-marker-adjust-reset/);
  assert.match(module, /belavista\.map\.lot-marker-overrides\.v1/);
  assert.match(module, /__aliancaMapDebug/);
});
