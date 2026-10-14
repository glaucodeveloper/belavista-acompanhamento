/** Installs the geographic-map lifecycle retained alongside the 3D surface. */
export const installLeafletMapSceneV1 = (
  MapScene,
  { viewThemes, mapCameraView, validGeoPoint, appStore } = {},
) => {
  if (!viewThemes || !mapCameraView || typeof validGeoPoint !== "function" || !appStore?.set)
    throw new TypeError("Leaflet map scene requires map themes, geographic validation, and the application store.");

  MapScene.prototype.initLeaflet = function () {
    if (this.isPublicCustomerExperience()) {
      this.dataset.leaflet = "disabled-static-capture";
      this.dataset.publicMapProvider = "local-capture";
      this.dataset.publicMapRequests = "0";
      return;
    }
    const host = this.querySelector(".map-host");
    if (!host || this.map) return;
    const initial = viewThemes.assistant;
    const center = globalThis.L.latLng(
      Number(initial.center[0]),
      Number(initial.center[1]),
    );
    if (!validGeoPoint(center)) return;
    this.map = globalThis.L.map(host, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      zoomAnimation: false,
      fadeAnimation: false,
      scrollWheelZoom: false,
      minZoom: 13,
      maxZoom: 22,
    }).setView(center, Number(initial.zoom));
    this.dataset.leaflet = "ready";
    this.dataset.mapNavigation = "free scene · no 3D viewbox";
    // A página pública retorna antes deste ponto e nunca monta Leaflet. O
    // mapa administrativo pode continuar usando seus controles geográficos,
    // mas a captura satélite pública é sempre o raster local no Three.js.
    globalThis.L.control.zoom({ position: "bottomright" }).addTo(this.map);
    this.map.on("moveend zoomend", () => this.syncThree());
    this.map.on("click", (event) => {
      const canvasRect =
          this.querySelector(".three-overlay")?.getBoundingClientRect(),
        hostRect = host.getBoundingClientRect(),
        point = {
          x:
            event.containerPoint.x +
            hostRect.left -
            (canvasRect?.left || hostRect.left),
          y:
            event.containerPoint.y +
            hostRect.top -
            (canvasRect?.top || hostRect.top),
        };
      if (this.pickModelAt(point))
        this._suppressMapToggleUntil = performance.now() + 280;
      else this.clearCurrentMapSelectionV1(true);
    });
    // Resizing the persistent dock is a layout operation, not a geographic
    // navigation. Leaflet invalidateSize can shift its center while the SPA
    // swaps columns, which would invalidate the shared tile key and reload
    // the map. Three.js can resize the already-loaded surface directly.
    const refreshMap = () => {
      if (!this.map || !host) return;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const key = `${width}x${height}`;
      if (this._lastObservedMapSize === key) return;
      this._lastObservedMapSize = key;

      this.map.invalidateSize?.({ pan: false, debounceMoveend: true });
      this.syncThree();
    };
    if (window.ResizeObserver) {
      this._mapResizeObserver = new ResizeObserver((entries) => {
        const rect = entries?.[0]?.contentRect;
        const width = Math.max(
          1,
          Math.round(rect?.width || host.clientWidth || 0),
        );
        const height = Math.max(
          1,
          Math.round(rect?.height || host.clientHeight || 0),
        );
        const key = `${width}x${height}`;
        if (key === this._lastResizeObserverSize) return;
        this._lastResizeObserverSize = key;
        if (this._mapResizeFrame) return;
        this._mapResizeFrame = requestAnimationFrame(() => {
          this._mapResizeFrame = 0;
          refreshMap();
        });
      });
      this._mapResizeObserver.observe(host);
    }
    this.map.whenReady(() => {
      this._mapReady = true;
      const active = viewThemes[mapCameraView] || viewThemes.assistant;
      this.map.setView(
        globalThis.L.latLng(Number(active.center[0]), Number(active.center[1])),
        Number(active.zoom),
        { animate: false },
      );
      appStore.set({ mapReady: true });
      this.setTheme(mapCameraView);
      this.setMapContext(appStore.get().view);
      this._lastObservedMapSize = "";
      requestAnimationFrame(refreshMap);
    });
  };

  return MapScene;
};
