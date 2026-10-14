import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSatelliteLotProjectionV1 } from "../../components/map/satellite-lot-projection-v1.mjs";

const readAsset = async (name) => JSON.parse(await readFile(new URL(`../../assets/data/${name}`, import.meta.url), "utf8"));
const polygonCentroid = (polygon) => polygon.reduce(
  (center, point) => ({ x: center.x + Number(point[0]) / polygon.length, y: center.y + Number(point[1]) / polygon.length }),
  { x: 0, y: 0 },
);
const projectCanonicalTrace = (point, imageSize) => ({ u: point.x / imageSize[0], v: point.y / imageSize[1] });
const projectionFor = ({ trace, masterplan, labels, mapping, hasMasterplanOverlay }) =>
  createSatelliteLotProjectionV1({
    trace,
    imageSize: trace.imageSize,
    lots: trace.lots,
    masterplanPolygonAsset: masterplan,
    pdfLotLabelsAsset: labels,
    pdfLotGreenMappingAsset: mapping,
    hasMasterplanOverlay,
    invalidLotIds: new Set(),
    geometryRepairLotIds: new Set(),
    commonAreaSourceIds: [],
    polygonCentroid,
    projectCanonicalTrace,
  });

test("projection uses the reviewed production PDF mapping and canonical lot trace", async () => {
  const [trace, masterplan, labels, mapping] = await Promise.all([
    readAsset("aerial-lot-trace-v1.json"),
    readAsset("masterplan-lot-polygons-v2.json"),
    readAsset("pdf-lot-labels-v1.json"),
    readAsset("pdf-lot-green-mapping-v1.json"),
  ]);
  const projection = projectionFor({ trace, masterplan, labels, mapping, hasMasterplanOverlay: true });
  const validMappedLots = mapping.mappings.filter((item) =>
    Array.isArray(masterplan.lots[item.greenPolygonId]) && masterplan.lots[item.greenPolygonId].length >= 3,
  );

  assert.equal(projection.usesNativeMasterplanPolygons, true);
  assert.equal(projection.usesGreenLotMapping, true);
  assert.equal(projection.usesCanonicalTraceMarkers, true);
  assert.equal(projection.hasOfficialPdfLabels, true);
  assert.equal(projection.canonicalTraceMarkerByLot.size, trace.lotCount);
  assert.equal(projection.projectedLots.length, validMappedLots.length);
  assert.ok(Number.isFinite(projection.projectedBounds.minU));
  assert.ok(Number.isFinite(projection.projectedBounds.maxV));
  assert.deepEqual(
    projection.masterplanMarkerPosition(0.5, 0.5, { left: 0.1, top: 0.2, width: 0.5, height: 0.6, rotation: 0 }),
    { u: 0.35, v: 0.5 },
  );
});

test("projection retains the official-label fallback when no masterplan overlay exists", async () => {
  const [trace, labels] = await Promise.all([
    readAsset("aerial-lot-trace-v1.json"),
    readAsset("pdf-lot-labels-v1.json"),
  ]);
  const projection = projectionFor({ trace, masterplan: null, labels, mapping: null, hasMasterplanOverlay: false });
  const validOfficialLots = labels.labels.filter((label) =>
    Array.isArray(trace.lots[label.lotId]) && trace.lots[label.lotId].length >= 3,
  );

  assert.equal(projection.usesNativeMasterplanPolygons, false);
  assert.equal(projection.usesGreenLotMapping, false);
  assert.equal(projection.hasOfficialPdfLabels, true);
  assert.equal(projection.projectedLots.length, validOfficialLots.length);
  assert.ok(projection.projectedLots.every(({ projected }) => projected.every((point) =>
    Number.isFinite(point.u) && Number.isFinite(point.v),
  )));
});

test("MapScene delegates satellite geometry projection to its map-domain module", async () => {
  const [source, overlay] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/map/satellite-lot-plan-overlay-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /import \{ createSatelliteLotProjectionV1 \} from "\.\/components\/map\/satellite-lot-projection-v1\.mjs\?/);
  assert.match(source, /import \{ installSatelliteLotPlanOverlayV1 \} from "\.\/components\/map\/satellite-lot-plan-overlay-v1\.mjs\?/);
  const installAt = source.indexOf("installSatelliteLotPlanOverlayV1(MapScene"),
    defineAt = source.indexOf('customElements.define("map-scene", MapScene)');
  assert.match(source, /installSatelliteLotPlanOverlayV1\(MapScene, \{[\s\S]{0,500}createSatelliteLotProjectionV1,[\s\S]{0,1200}\}\);/);
  assert.ok(installAt >= 0 && defineAt > installAt);
  assert.match(overlay, /MapScene\.prototype\.installSatelliteLotPlanOverlayV1 = async function/);
  assert.match(overlay, /masterplanMarkerPosition,[\s\S]{0,150}createSatelliteLotProjectionV1\(/);
  assert.match(overlay, /const masterplanFrame = \(\(\) =>/);
  assert.match(overlay, /layer\.dataset\.pdfLotEnumerationV1 =/);
  assert.match(overlay, /layer\.dataset\.canonicalLotTraceOverlayV1 =/);
  assert.doesNotMatch(overlay, /const projectedLots = projectedSourceLots\.flatMap/);
});
