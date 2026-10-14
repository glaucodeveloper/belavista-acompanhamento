import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ADMIN_REFERENCE_AERIAL_ASSET_V1,
  ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1,
  PDF_MASTERPLAN_PAGE_SIZE_V1,
  polygonCentroidV1,
} from "../../components/map/georeference.mjs";
import * as georeference from "../../components/map/georeference.mjs";

test("georeference module preserves its map calibration data and pure geometry helpers", async () => {
  const components = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    moduleSource = await readFile(new URL("../../components/map/georeference.mjs", import.meta.url), "utf8");

  assert.equal(ADMIN_REFERENCE_AERIAL_ASSET_V1, "/assets/public/alianca-park-aerial-realistic-preview-v2.jpg");
  assert.deepEqual(PDF_MASTERPLAN_PAGE_SIZE_V1, { width: 1800, height: 2098 });
  assert.ok(ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1.nw.u > 0);
  assert.deepEqual(
    polygonCentroidV1([[0, 0], [4, 0], [4, 2], [0, 2]]),
    { x: 2, y: 1 },
  );
  assert.match(components, /from "\.\/components\/map\/georeference\.mjs\?v=admin-map-georeference-v1"/);
  const imports = components.match(/^import \{([^;]*?)\} from "\.\/components\/map\/georeference\.mjs\?v=admin-map-georeference-v1";/m);
  assert.ok(imports);
  for (const name of imports[1].split(",").map((item) => item.trim()).filter(Boolean))
    assert.ok(name in georeference, `export ausente no módulo: ${name}`);
  assert.doesNotMatch(components, /^const ADMIN_REFERENCE_AERIAL_ASSET_V1\s*=/m);
  assert.match(moduleSource, /^export const ADMIN_REFERENCE_AERIAL_ASSET_V1\s*=/m);
});
