/** Projects reviewed lot/common-area assets into the shared satellite overlay UV space. */
export const createSatelliteLotProjectionV1 = ({
  trace,
  imageSize,
  lots,
  masterplanPolygonAsset,
  pdfLotLabelsAsset,
  pdfLotGreenMappingAsset,
  hasMasterplanOverlay,
  invalidLotIds,
  geometryRepairLotIds,
  commonAreaSourceIds,
  polygonCentroid,
  projectCanonicalTrace,
}) => {
  const masterplanLots = hasMasterplanOverlay &&
    masterplanPolygonAsset?.coordinateSpace === "normalized-uv-top-left" &&
    masterplanPolygonAsset?.lots &&
    typeof masterplanPolygonAsset.lots === "object"
    ? masterplanPolygonAsset.lots
    : null;
  const usesNativeMasterplanPolygons = Boolean(masterplanLots);
  const officialMarkerByLot = new Map(
    pdfLotLabelsAsset?.coordinateSpace === "normalized-pdf-page-top-left" &&
    Array.isArray(pdfLotLabelsAsset?.labels)
      ? pdfLotLabelsAsset.labels
          .filter((label) =>
            label &&
            /^Lote_\d{3}$/.test(String(label.lotId || "")) &&
            Number.isFinite(Number(label.u)) &&
            Number.isFinite(Number(label.v)),
          )
          .map((label) => [String(label.lotId), label])
      : [],
  );
  const greenMappingByLot = new Map(
    pdfLotGreenMappingAsset?.coordinateSpace === "normalized-masterplan-overlay-top-left" &&
    Array.isArray(pdfLotGreenMappingAsset?.mappings)
      ? pdfLotGreenMappingAsset.mappings
          .filter((mapping) =>
            mapping &&
            /^Lote_\d{3}$/.test(String(mapping.lotId || "")) &&
            (!mapping.greenPolygonId || /^Lote_\d{3}$/.test(String(mapping.greenPolygonId))) &&
            Number.isFinite(Number(mapping.u)) &&
            Number.isFinite(Number(mapping.v)),
          )
          .map((mapping) => [String(mapping.lotId), mapping])
      : [],
  );
  const canonicalTraceMarkerByLot = new Map(
    trace?.lots && typeof trace.lots === "object"
      ? Object.entries(trace.lots)
          .filter(([lotId, polygon]) =>
            /^Lote_\d{3}$/.test(String(lotId || "")) &&
            !invalidLotIds.has(String(lotId)) &&
            Array.isArray(polygon) &&
            polygon.length >= 3,
          )
          .map(([lotId, polygon]) => [
            String(lotId),
            projectCanonicalTrace(polygonCentroid(polygon), imageSize),
          ])
          .filter(([, uv]) => uv)
      : [],
  );
  const usesGreenLotMapping = usesNativeMasterplanPolygons && greenMappingByLot.size > 0;
  const usesCanonicalTraceMarkers = usesNativeMasterplanPolygons && canonicalTraceMarkerByLot.size >= 280;
  const hasOfficialPdfLabels = officialMarkerByLot.size > 0;
  const canRepairPdfGeometry = Boolean(trace?.lots) && usesCanonicalTraceMarkers;
  const projectedSourceLots = usesGreenLotMapping
    ? [...greenMappingByLot.entries()].map(([lotId, mapping]) => [
        lotId,
        canRepairPdfGeometry && geometryRepairLotIds.has(lotId)
          ? trace.lots[lotId]
          : masterplanLots[mapping.greenPolygonId],
        mapping,
        canRepairPdfGeometry && geometryRepairLotIds.has(lotId),
      ])
    : Object.entries(masterplanLots || lots).map(([lotId, polygon]) => [lotId, polygon, null, false]);
  const projectedLots = projectedSourceLots.flatMap(([lotId, polygon, greenMapping, usesCanonicalTracePolygon]) => {
    if (usesGreenLotMapping
      ? !greenMapping
      : hasOfficialPdfLabels
      ? !officialMarkerByLot.has(lotId)
      : invalidLotIds.has(lotId)) return [];
    if (!Array.isArray(polygon) || polygon.length < 3) return [];
    const projected = polygon
      .map((point) => usesCanonicalTracePolygon
        ? projectCanonicalTrace({ x: Number(point[0]), y: Number(point[1]) }, imageSize)
        : usesNativeMasterplanPolygons
          ? { u: Number(point[0]), v: Number(point[1]) }
          : { u: Number(point[0]) / imageSize[0], v: Number(point[1]) / imageSize[1] })
      .filter(Boolean)
      .filter((point) => point.u > -0.05 && point.u < 1.05 && point.v > -0.05 && point.v < 1.05);
    return projected.length >= 3 ? [{ lotId, projected, greenMapping }] : [];
  });
  const commonAreaPolygons = hasMasterplanOverlay && masterplanLots
    ? [...commonAreaSourceIds].flatMap((sourceId) => {
        if ([...greenMappingByLot.values()].some((mapping) => mapping.greenPolygonId === sourceId)) return [];
        const polygon = masterplanLots[sourceId];
        if (!Array.isArray(polygon) || polygon.length < 3) return [];
        const projected = polygon
          .map((point) => ({ u: Number(point?.[0]), v: Number(point?.[1]) }))
          .filter((point) => Number.isFinite(point.u) && Number.isFinite(point.v))
          .filter((point) => point.u > -0.05 && point.u < 1.05 && point.v > -0.05 && point.v < 1.05);
        return projected.length >= 3 ? [{ sourceId, projected }] : [];
      })
    : [];
  const projectedBounds = projectedLots.reduce((bounds, item) => {
    for (const point of item.projected) {
      bounds.minU = Math.min(bounds.minU, point.u);
      bounds.maxU = Math.max(bounds.maxU, point.u);
      bounds.minV = Math.min(bounds.minV, point.v);
      bounds.maxV = Math.max(bounds.maxV, point.v);
    }
    return bounds;
  }, { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity });
  const masterplanMarkerPosition = (relativeU, relativeV, frame) => {
    const angle = (Number(frame.rotation || 0) * Math.PI) / 180;
    const localU = Number(relativeU) - 0.5;
    const localV = Number(relativeV) - 0.5;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      u: Number(frame.left) + (0.5 + localU * cos - localV * sin) * Number(frame.width),
      v: Number(frame.top) + (0.5 + localU * sin + localV * cos) * Number(frame.height),
    };
  };
  return Object.freeze({
    masterplanLots,
    usesNativeMasterplanPolygons,
    officialMarkerByLot,
    greenMappingByLot,
    canonicalTraceMarkerByLot,
    usesGreenLotMapping,
    usesCanonicalTraceMarkers,
    hasOfficialPdfLabels,
    canRepairPdfGeometry,
    projectedLots,
    commonAreaPolygons,
    projectedBounds,
    masterplanMarkerPosition,
  });
};
