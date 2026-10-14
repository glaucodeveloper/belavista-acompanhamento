import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertMapRasterSurfaceDependenciesV1,
  installMapRasterSurfaceV1,
} from "../../components/map/raster-surface-v1.mjs";

const config = () => ({
  DWG_SATELLITE_MOSAIC_TILES: 9,
  DWG_SATELLITE_MOSAIC_TILE_SIZE: 256,
  DWG_SATELLITE_MOSAIC_TILE_X0: 102215,
  DWG_SATELLITE_MOSAIC_TILE_Y0: 140616,
  DWG_SATELLITE_MOSAIC_ZOOM: 18,
  MAP_RASTER_MAX: 1024,
  MAP_TILE_OVERSCAN: 0,
  SCENE_MAP_Z: 3,
});
const createImageHarness = () => {
  const images = [];
  class Image {
    constructor() { images.push(this); this.style = {}; }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  return { Image, images };
};
const tileSources = {
  satellite: [{ id: "satellite-esri", url: (zoom, x, y) => `/tiles/${zoom}/${x}/${y}` }],
  generated: [{ id: "generated-hd", url: () => "/assets/treated.png" }],
};
const dependencies = (overrides = {}) => ({
  config: config(),
  mapTileSources: tileSources,
  browser: { Image: class Image {} },
  logger: { warn() {} },
  ...overrides,
});

test("map raster surface validates the complete browser, source and geometry contract", () => {
  const ports = dependencies();
  assert.equal(assertMapRasterSurfaceDependenciesV1(ports), ports);
  const incomplete = config();
  delete incomplete.MAP_TILE_OVERSCAN;
  assert.throws(() => assertMapRasterSurfaceDependenciesV1({ ...ports, config: incomplete }), /config\.MAP_TILE_OVERSCAN/);
  assert.throws(() => assertMapRasterSurfaceDependenciesV1({ ...ports, browser: {} }), /browser\.Image/);
});

test("raster methods install on the existing MapScene prototype", () => {
  class MapScene {}
  installMapRasterSurfaceV1(MapScene, dependencies());
  for (const method of [
    "refreshMapSurface", "applyMapRasterCentering", "refreshOsmRaster",
    "commitMapSurfaceTexture", "projectPublicStaticPointV1",
  ]) assert.equal(typeof MapScene.prototype[method], "function", method);
});

test("public static base avoids rebuilding a second raster surface", () => {
  class MapScene {}
  installMapRasterSurfaceV1(MapScene, dependencies());
  const scene = Object.assign(Object.create(MapScene.prototype), {
    dataset: {},
    mapSurface: { visible: true },
    matches: () => true,
    hasAttribute: () => false,
  });
  scene.refreshMapSurface({ center: [0, 0], zoom: 18 }, 640, 480);
  assert.equal(scene.mapSurface.visible, false);
  assert.equal(scene.dataset.mapTexture, "public-static-base");
  assert.equal(scene.dataset.mapRasterMode, "public-static-base + live-glb");
  assert.equal(scene.dataset.mapSurfaceBuilds, "0");
});

test("raster centering preserves generated-map anchoring and Web Mercator tile offsets", () => {
  class MapScene {}
  installMapRasterSurfaceV1(MapScene, dependencies());
  const positions = [];
  const scene = Object.assign(Object.create(MapScene.prototype), {
    dataset: {},
    mapSurface: { position: { set: (...args) => positions.push(args) } },
    mapTileMode: "generated",
  });
  scene.applyMapRasterCentering(100, 80);
  assert.deepEqual(positions.pop(), [0, 0, 3]);
  assert.match(scene.dataset.mapRasterCenterOffset, /treated satellite mosaic/);

  scene.mapTileMode = "satellite";
  scene.mapRasterPixelOffset = { x: 20, y: -10, width: 200, height: 100 };
  scene.applyMapRasterCentering(100, 80);
  assert.deepEqual(positions.pop(), [10, 8, 3]);
});

test("tile raster loads the full visible tile grid and commits only after all tiles arrive", () => {
  class MapScene {}
  const imageHarness = createImageHarness();
  installMapRasterSurfaceV1(MapScene, dependencies({ browser: { Image: imageHarness.Image } }));
  const draws = [];
  const context = {
    clearRect() {}, drawImage: (...args) => draws.push(args), fillRect() {},
    getImageData: () => ({ data: [1, 2, 3, 255] }),
  };
  const canvas = {
    width: 0, height: 0,
    getContext: () => context,
  };
  const commits = [];
  const renders = [];
  const scene = Object.assign(Object.create(MapScene.prototype), {
    dataset: {},
    mapSurface: { visible: true },
    mapSurfaceCanvas: canvas,
    mapSurfaceTexture: { needsUpdate: false },
    mapTileMode: "satellite",
    renderer: { render: (...args) => renders.push(args) },
    scene: {}, camera: {},
    commitMapSurfaceTexture: (...args) => commits.push(args),
  });

  scene.refreshMapSurface({ center: [0, 0], zoom: 18 }, 640, 480);
  assert.equal(imageHarness.images.length, 16);
  assert.equal(scene.dataset.mapTextureTiles, "0/16");
  for (const image of imageHarness.images) {
    assert.match(image.src, /^\/tiles\/18\//);
    image.onload();
  }
  assert.equal(draws.length, 16);
  assert.equal(commits.length, 1);
  assert.equal(scene.dataset.mapTextureTiles, "16/16");
  assert.equal(scene.dataset.mapSurfacePixel, "1,2,3,255");
  assert.equal(scene.mapSurfaceTexture.needsUpdate, true);
  assert.equal(renders.length, 16);
});

test("static point projection centers matching coordinates and safely handles invalid input", () => {
  class MapScene {}
  installMapRasterSurfaceV1(MapScene, dependencies());
  const scene = Object.assign(Object.create(MapScene.prototype), {
    _publicGeoTheme: { zoom: 18 },
    sceneSurfaceDimensions: { width: 800, height: 600 },
    mapSurfaceCanvas: { width: 1600, height: 1200 },
  });
  assert.deepEqual(scene.projectPublicStaticPointV1(-13, -39, { lat: -13, lng: -39 }, 400, 300), { x: 200, y: 150 });
  assert.deepEqual(scene.projectPublicStaticPointV1(NaN, -39, { lat: -13, lng: -39 }, 400, 300), { x: 200, y: 150 });
});

test("components.js composes injected raster ports and retains runtime call sites", async () => {
  const source = [
    ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    await readFile(new URL("../../components/map/map-scene-sync-v1.mjs", import.meta.url), "utf8"),
  ].join("\n");
  const module = await readFile(new URL("../../components/map/raster-surface-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installMapRasterSurfaceV1\(MapScene,\s*\{\s*config:\s*\{[\s\S]*?mapTileSources,\s*browser:\s*\{ Image \},\s*logger:/);
  for (const method of ["refreshMapSurface", "applyMapRasterCentering", "refreshOsmRaster", "commitMapSurfaceTexture", "projectPublicStaticPointV1"])
    assert.doesNotMatch(source, new RegExp(`^  ${method}\\(`, "m"));
  assert.match(source, /this\.refreshMapSurface\(/);
  assert.match(source, /this\.projectPublicStaticPointV1\(/);
  assert.match(module, /this\.commitMapSurfaceTexture\(/);
});
