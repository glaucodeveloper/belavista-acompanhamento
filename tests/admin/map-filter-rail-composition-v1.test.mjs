import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const composition = read("components/map/map-filter-rail-composition-v1.mjs");
const mapApplication = read("components/map/map-application-registration-v1.mjs");
const application = read("components.js");
const elements = read("components/shared/application-elements-registration-v1.mjs");

test("map filter rail composition owns catalog, registration, and fallback setup", () => {
  assert.match(composition, /createDashboardFilterCatalogV1\(/);
  assert.match(composition, /createMapFilterRail\(/);
  assert.match(composition, /customElementsRef\.define\("map-filter-rail", MapFilterRail\)/);
  assert.match(composition, /catalog\.installProgressSummaryFallbackV1\(appStore\)/);
  assert.match(composition, /return Object\.freeze\(\{ \.\.\.catalog, MapFilterRail \}\)/);
});

test("application injects map dependencies and exports the composed custom element", () => {
  assert.match(application, /registerApplicationElementsV1\(\{/);
  assert.match(application, /mapDependencies:\s*\{[\s\S]*?demoData,[\s\S]*?appStore,[\s\S]*?dashboardModes,/);
  assert.match(mapApplication, /installMapFilterRail\(\{/);
  assert.match(mapApplication, /createMapSceneElement\(\{/);
  assert.match(application, /export \{ MapFilterRail \}/);
  assert.match(elements, /installMapApplicationRegistrationV1/);
  assert.doesNotMatch(application, /installMapFilterRailCompositionV1|createMapSceneElementV1|createDashboardFilterCatalogV1|createMapFilterRail/);
});
