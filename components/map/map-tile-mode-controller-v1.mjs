/** Installs the shared map tile-mode transition on MapScene. */
export const installMapTileModeControllerV1 = (MapScene, dependencies = {}) => {
  const { appStore, notify } = dependencies;

  MapScene.prototype.setMapTileMode = function(mode = "satellite", announce = false) {
    const next = this.isPublicCustomerExperience()
      ? "generated"
      : ["satellite", "osm", "generated"].includes(mode)
        ? mode
        : "satellite";
    const changed = this.mapTileMode !== next;
    this.mapTileMode = next;
    this.dataset.mapTileMode = next;
    this.querySelectorAll("[data-map-tiles]").forEach((button) =>
      button.classList.toggle("active", button.dataset.mapTiles === next),
    );
    if (!changed) return;
    delete this.dataset.mapTileSource;
    if (this._mapSurfaceKey) this._mapSurfaceKey = "";
    if (this._osmRasterKey) this._osmRasterKey = "";
    this._lastRasterSignature = "";
    if (this.modelReady) this.syncThree();
    if (announce) {
      const label =
        next === "satellite"
          ? "Satélite realista"
          : next === "generated"
            ? "Satélite tratado · DWG"
            : "Mapa OSM";
      notify(`${label} ativado na cena compartilhada.`, "success");
      appStore.set({
        mapTileMode: next,
        lastAction: `Alterou base cartográfica para ${label}`,
      });
    }
  };
};
