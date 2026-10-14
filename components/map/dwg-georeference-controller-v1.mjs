/** Installs DWG-derived GPS markers, lot metadata, and georeference loading. */
export const installDwgGeoreferenceControllerV1 = (
  MapScene,
  {
    url,
    fallback,
    appStore,
    localClockHourForGeo,
    validGeoPoint,
    fetchFn = (...args) => globalThis.fetch(...args),
    logger = console,
  } = {},
) => {
  if (!url || !appStore?.get || typeof localClockHourForGeo !== "function" || typeof validGeoPoint !== "function")
    throw new TypeError("DWG georeference requires its URL, app store, solar clock, and coordinate validator.");

  MapScene.prototype.setGpsMarkers = function (THREE, points = []) {
    if (!this.markerGroup) return;
    this.markerGroup.clear();
    const geometry = this.gpsMarkerGeometry || new THREE.CircleGeometry(8, 32);
    points
      .filter((point) => validGeoPoint({ lat: point.lat, lng: point.lng }))
      .forEach((point, index) => {
        const material = new THREE.MeshBasicMaterial({
          color:
            this.gpsMarkerColors?.[index % this.gpsMarkerColors.length] ||
            0x2fe6ae,
          transparent: true,
          opacity: 0.92,
          depthTest: false,
          depthWrite: false,
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.userData = {
          latlng: [Number(point.lat), Number(point.lng)],
          gpsId: point.id || `gps-${index + 1}`,
          gpsLabel: point.label || "Ponto GPS",
          utmEast: point.utmEast,
          utmNorth: point.utmNorth,
        };
        marker.scale.setScalar(point.id === "site-center" ? 1.22 : 1);
        this.markerGroup.add(marker);
      });
    this.dataset.gpsMarkers = String(this.markerGroup.children.length);
    this.dataset.gpsSource = "DWG · SIRGAS 2000 / UTM 24S · EPSG:31984";
    this.syncThree();
  };

  MapScene.prototype.applyDwgLotMetadata = function () {
    const lots = this.dwgGeo?.lots;
    if (!Array.isArray(lots) || !this.lotStatusBadges?.length) return;
    const byObject = new Map(lots.map((item) => [String(item.glbObject), item]));
    this.lotStatusBadges.forEach((badge) => {
      const lot = byObject.get(
        String(badge.userData?.glbObject || badge.userData?.lotObject || ""),
      );
      if (!lot) return;
      badge.userData.gps = {
        lat: lot.lat,
        lng: lot.lng,
        utmEast: lot.utmEast,
        utmNorth: lot.utmNorth,
        areaM2: lot.areaM2,
        alignmentErrorM: lot.alignmentErrorM,
      };
    });
    this.dataset.dwgLotGpsAttached = String(lots.length);
  };

  MapScene.prototype.loadDwgGeoreference = async function (THREE) {
    try {
      const response = await fetchFn(url, { cache: "no-store" });
      if (!response.ok)
        throw new Error(`DWG georeference HTTP ${response.status}`);
      const geo = await response.json();
      if (!geo?.crs?.epsg || !Array.isArray(geo.controlPoints))
        throw new Error("Manifesto DWG sem CRS ou pontos de controle");
      if (Array.isArray(geo.lots) && Array.isArray(geo.lotFields)) {
        geo.lots = geo.lots.map((row) =>
          Array.isArray(row)
            ? Object.fromEntries(
                geo.lotFields.map((field, index) => [field, row[index]]),
              )
            : row,
        );
      }
      this.dwgGeo = geo;
      const solarPoint =
          geo.controlPoints.find((item) => item.id === "site-center") ||
          geo.drawingBounds?.center ||
          fallback,
        stored = appStore.get(),
        manual =
          stored.solarHourMode === "manual" &&
          Number.isFinite(Number(stored.solarHour)),
        clockHour = localClockHourForGeo(solarPoint);
      this.setSolarHour(
        manual ? Number(stored.solarHour) : clockHour,
        false,
        false,
      );
      this.dataset.solarInitialMode = manual ? "manual" : "clock";
      this.dataset.solarClockHour = clockHour.toFixed(2);
      this.setGpsMarkers(THREE, geo.controlPoints);
      this.dataset.dwgCrs = `EPSG:${geo.crs.epsg}`;
      this.dataset.dwgLotCount = String(geo.lots?.length || 0);
      this.dataset.dwgAlignmentError = `mediana ${geo.alignment?.medianErrorM ?? "—"} m · P90 ${geo.alignment?.p90ErrorM ?? "—"} m`;
      if (this.masterplanModel) {
        this.masterplanModel.userData.dwgGeoreferenced = true;
        this.masterplanModel.userData.dwgCrs = geo.crs.epsg;
        this.masterplanModel.userData.dwgAlignment = geo.alignment;
      }
      this.applyDwgLotMetadata();
      this.dataset.dwgGeoreference = "ready";
      this.dataset.dwgSyncState = `model:${this.masterplanModel ? "1" : "0"}|parts:${this.modelParts?.lots?.length || 0}|gpu:${this._modelGpuReady ? "1" : "0"}`;
      // O DWG pode terminar antes ou depois do GLB. Reexecutar o sync quando
      // os dois lados estiverem prontos garante que a transformação afim não
      // fique presa no fallback de envelope da primeira abertura.
      if (this.masterplanModel && this._modelGpuReady) this.syncThree();
    } catch (error) {
      this.dataset.dwgGeoreference = "fallback";
      this.dataset.dwgGeoreferenceError = String(error?.message || error);
      logger.warn(
        "Georreferência DWG indisponível; usando o ponto central de fallback.",
        error,
      );
    }
  };

  return MapScene;
};
