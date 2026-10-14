/** Installs MapScene teardown for its compact Three.js mirror resources. */
export const installMapSceneCleanupV1 = (MapScene, dependencies = {}) => {
  const { compactMapMirrors } = dependencies;

  MapScene.prototype.disconnectedCallback = function() {
    this.clearAdminAerialZoomTilesV1?.();
    if (!this.hasAttribute("compact")) return;
    compactMapMirrors.delete(this);
    this._compactResizeObserver?.disconnect();
    this._compactResizeObserver = null;
    this._compactVisibilityObserver?.disconnect();
    this._compactVisibilityObserver = null;
    this._compactVisible = false;
    this._compactStageMaterials?.forEach((material) => material?.dispose?.());
    this._compactStageMaterials?.clear?.();
    this._compactStageMaterials = null;
    this._compactRenderer?.dispose?.();
    this._compactRenderer = null;
    this._compactCamera = null;
    this._persistentMapMounted = false;
  };
};
