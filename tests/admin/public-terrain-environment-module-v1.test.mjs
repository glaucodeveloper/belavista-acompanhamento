import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertPublicTerrainEnvironmentDependenciesV1,
  installPublicTerrainEnvironmentV1,
} from "../../components/map/public-terrain-environment-v1.mjs";

const terrainDependencies = () => ({
  GENERATED_AERIAL_ASSET: "/assets/aerial.png",
  GENERATED_AERIAL_VERSION: "aerial-v1",
  PUBLIC_SOCIAL_GREEN_LIFT_V1: 0.14,
  SCENE_MAP_Z: 0,
  runtimeRouteV1: (path) => path,
  browser: {
    Image: class Image {},
    document: { createElement() {} },
    setTimeout() {},
  },
});

test("public terrain requires explicit config and browser capabilities", () => {
  const dependencies = terrainDependencies();
  assert.equal(assertPublicTerrainEnvironmentDependenciesV1(dependencies), dependencies);
  assert.throws(
    () => assertPublicTerrainEnvironmentDependenciesV1({ ...dependencies, browser: {} }),
    /requires image, document and timer ports/,
  );
});

test("public terrain environment installs the complete delayed terrain and vegetation category", async () => {
  class MapScene {}
  installPublicTerrainEnvironmentV1(MapScene, terrainDependencies());
  for (const method of [
    "ensurePublicTerrainRelief",
    "queueGeneratedTerrainHeightmapV5391",
    "sampleGeneratedTerrainHeightV5391",
    "publicTerrainElevationAtV5391",
    "applyGeneratedTerrainHeightmapV5391",
    "reliftPublicTreesToTerrainV5391",
    "loadPublicTerrainTextureV1",
    "extractPublicVegetationSamplesV1",
    "scanPublicSatelliteContextV1",
    "publicSatelliteSamplePointV1",
    "syncPublicSatelliteVegetationV1",
    "syncPublicTerrainRelief",
    "buildPublicGpsContextEnvironmentV2",
    "schedulePublicEnvironmentLoadingV1",
    "queuePublicVegetationAfterSatelliteV1",
    "addPublicVegetation",
  ]) assert.equal(typeof MapScene.prototype[method], "function", method);

  const scene = Object.assign(new MapScene(), { mapSurface: { position: { z: 0 } } });
  assert.equal(scene.publicTerrainElevationAtV5391(0, 0), 0);
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\n  ensurePublicTerrainRelief\(\) \{/);
  assert.match(source, /installPublicTerrainEnvironmentV1\(MapScene, \{/);
});
