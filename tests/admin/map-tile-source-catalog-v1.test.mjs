import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createMapTileSourceCatalogV1 } from "../../components/map/map-tile-source-catalog-v1.mjs";

test("map tile catalog retains satellite, OSM, and generated raster URL contracts", () => {
  const routeCalls = [];
  const catalog = createMapTileSourceCatalogV1({
    runtimeRouteV1: (...args) => { routeCalls.push(args); return `/runtime${args[0]}?${args[1]}`; },
    generatedAerialAsset: "/assets/public/dwg-satellite-treated-v5411.png",
    generatedAerialVersion: "dwg-satellite-treated-v5411",
  });

  assert.deepEqual(catalog.satellite.map(({ id, url }) => [id, url(18, 102215, 140616)]), [
    ["satellite", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/140616/102215"],
    ["satellite-alt", "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/140616/102215"],
  ]);
  assert.deepEqual(catalog.osm.map(({ id, url }) => [id, url(12, 2048, 1365)]), [
    ["osm", "https://tile.openstreetmap.org/12/2048/1365.png"],
    ["osm-de", "https://tile.openstreetmap.de/12/2048/1365.png"],
  ]);
  assert.equal(catalog.generated[0].id, "dwg-satellite-treated-v5411");
  assert.equal(catalog.generated[0].url(), "/runtime/assets/public/dwg-satellite-treated-v5411.png?v=dwg-satellite-treated-v5411");
  assert.deepEqual(routeCalls, [[
    "/assets/public/dwg-satellite-treated-v5411.png",
    "v=dwg-satellite-treated-v5411",
  ]]);
});

test("components.js injects the runtime URL builder and aerial asset metadata", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));

  assert.match(source, /import \{ createMapTileSourceCatalogV1 \} from "\.\/components\/map\/map-tile-source-catalog-v1\.mjs\?v=map-tile-source-catalog-v1"/);
  assert.match(source, /const mapTileSources = createMapTileSourceCatalogV1\(\{\s*runtimeRouteV1,\s*generatedAerialAsset: GENERATED_AERIAL_ASSET,\s*generatedAerialVersion: GENERATED_AERIAL_VERSION,/);
  assert.doesNotMatch(source, /const mapTileSources = \{/);
});
