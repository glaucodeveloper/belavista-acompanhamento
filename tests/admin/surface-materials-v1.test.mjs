import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertSurfaceMaterialsDependenciesV1,
  installSurfaceMaterialsV1,
} from "../../components/map/surface-materials-v1.mjs";

const material = () => {
  const clone = {
    color: { setHex(value) { this.hex = value; } },
    emissive: { setHex(value) { this.hex = value; } },
    userData: { original: true },
    roughness: 0,
    metalness: 0,
  };
  return { source: true, clone: () => ({ ...clone, color: { ...clone.color }, emissive: { ...clone.emissive } }) };
};

test("surface material services install on the existing MapScene prototype", () => {
  class MapScene {}
  assert.equal(assertSurfaceMaterialsDependenciesV1(MapScene), MapScene);
  assert.throws(() => assertSurfaceMaterialsDependenciesV1({}), /MapScene constructor/);
  installSurfaceMaterialsV1(MapScene);
  assert.equal(typeof MapScene.prototype.makeSiteSurfaceMaterial, "function");
  assert.equal(typeof MapScene.prototype.makeSocialAreaMaterial, "function");
});

test("surface material keeps its palette, procedural shader, and social-area classification", () => {
  class MapScene {}
  installSurfaceMaterialsV1(MapScene);
  const scene = new MapScene();
  const source = material();
  const THREE = { DoubleSide: 2 };

  const grass = scene.makeSiteSurfaceMaterial(THREE, source, "grass");
  assert.notEqual(grass, source);
  assert.equal(grass.color.hex, 0x286b37);
  assert.equal(grass.side, THREE.DoubleSide);
  assert.equal(grass.userData.belavistaSurface, "grass");
  const shader = {
    vertexShader: "#include <common>\n#include <begin_vertex>",
    fragmentShader: "#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>",
  };
  grass.onBeforeCompile(shader);
  assert.match(shader.vertexShader, /vBelavistaSurfacePos=position/);
  assert.match(shader.fragmentShader, /float bvNoise/);
  assert.match(shader.fragmentShader, /bvField/);
  assert.match(grass.customProgramCacheKey(), /belavista-site-grass-v9/);

  const social = scene.makeSocialAreaMaterial(THREE, source, "court_b");
  assert.equal(social.color.hex, 0x5c765f);
  assert.equal(social.userData.belavistaSocialSurface, "sport");
  assert.equal(social.userData.belavistaSocialMaterialVersion, "social-pbr-v553");
  const socialGrass = scene.makeSocialAreaMaterial(THREE, source, "jardim");
  assert.equal(socialGrass.polygonOffset, true);
  assert.equal(socialGrass.polygonOffsetFactor, 1);
  assert.equal(socialGrass.polygonOffsetUnits, 1);
});

test("components.js composes surface services for existing public and road methods", async () => {
  const source = [
    await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    await readFile(new URL("../../components/map/public-model-presentation-v1.mjs", import.meta.url), "utf8"),
    await readFile(new URL("../../components/map/admin-road-geometry-v1.mjs", import.meta.url), "utf8"),
  ].join("\n");
  assert.match(source, /installSurfaceMaterialsV1\(MapScene\)/);
  assert.match(source, /this\.makeSiteSurfaceMaterial\(/);
  assert.match(source, /this\.makeSocialAreaMaterial\(/);
  assert.doesNotMatch(source, /^  makeSiteSurfaceMaterial\(THREE, material/m);
  assert.doesNotMatch(source, /^  makeSocialAreaMaterial\(THREE, material/m);
});
