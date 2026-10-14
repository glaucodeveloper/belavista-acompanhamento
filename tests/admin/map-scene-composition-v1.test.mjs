import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const source = (relativePath) => fs.readFileSync(new URL(relativePath, root), "utf8");

test("MapScene composition preserves installer order and registers only afterward", () => {
  const composition = source("components/map/map-scene-composition-v1.mjs");
  const registration = source("components/map/map-scene-registration-v1.mjs");
  const mapApplication = source("components/map/map-application-registration-v1.mjs");
  const application = source("components/shared/application-elements-registration-v1.mjs");
  const installers = [
    "installMapSceneStartupReadinessV1(MapScene",
    "installMapSceneCleanupV1(MapScene",
    "installMapSceneConnectionV1(MapScene",
    "installLeafletMapSceneV1(MapScene",
    "installMapLoadingScreenV1(MapScene",
    "installMapSceneSyncV1(MapScene",
    "installAdminStandaloneStartupV5370(MapScene",
    "installAdminPdfMasterplanPipelineV1(MapScene",
  ].map((name) => composition.indexOf(name));

  assert.ok(installers.every((position) => position >= 0));
  assert.deepEqual(installers, [...installers].sort((a, b) => a - b));
  assert.match(registration, /composeMapSceneV1\(MapScene,\s*\{/);
  assert.match(mapApplication, /createMapSceneElementV1/);
  assert.ok(application.indexOf("registerMap({") <
    application.indexOf('customElementsRef.define("map-scene", MapScene);'));
  assert.doesNotMatch(application, /installMapSceneConnectionV1\(MapScene/);
});

test("MapScene composition imports resolve from the map architecture directory", () => {
  const moduleUrl = new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url);
  const composition = fs.readFileSync(moduleUrl, "utf8");
  const imports = [...composition.matchAll(/(?:from\s+|import\s+)["']([^"']+)["']/gs)];

  assert.ok(imports.length >= 40);
  for (const [, specifier] of imports)
    assert.ok(fs.existsSync(fileURLToPath(new URL(specifier, moduleUrl))), specifier);
});
