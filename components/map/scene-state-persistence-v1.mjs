export const installSceneStatePersistenceV1 = (MapScene, dependencies = {}) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Scene state persistence requires the existing MapScene constructor.");
  for (const method of ["update"])
    if (typeof dependencies.appStore?.[method] !== "function")
      throw new TypeError(`Scene state persistence requires appStore.${method}().`);
  if (!Number.isFinite(dependencies.config?.MAP_SCENE_STATE_VERSION) ||
      !Number.isFinite(dependencies.config?.ADMIN_REFERENCE_AERIAL_VIEW_VERSION) ||
      !Number.isFinite(dependencies.config?.ADMIN_FIXED_MAP_ROTATION_DEG) ||
      !Number.isFinite(dependencies.config?.INITIAL_SCENE_ZOOM))
    throw new TypeError("Scene state persistence requires complete map-state configuration.");
  for (const method of ["setTimeout", "clearTimeout"])
    if (typeof dependencies.browser?.[method] !== "function")
      throw new TypeError(`Scene state persistence requires browser.${method}().`);

  const { appStore, config, browser } = dependencies;
  MapScene.prototype.rememberMapView = function () {
    browser.clearTimeout(this._mapMemoryTimer);
    this._mapMemoryTimer = browser.setTimeout(
      () =>
        appStore.update((s) => ({
          ...s,
          mapView: {
            sceneVersion: config.MAP_SCENE_STATE_VERSION,
            referenceAerialVersion: this.hasAttribute("data-admin-shared-public-map")
              ? config.ADMIN_REFERENCE_AERIAL_VIEW_VERSION
              : undefined,
            rotation: this.hasAttribute("data-admin-shared-public-map")
              ? config.ADMIN_FIXED_MAP_ROTATION_DEG
              : this.sceneManualRotation || 0,
            zoom: this.sceneManualZoom || config.INITIAL_SCENE_ZOOM,
            pan: {
              x: this.sceneManualPan?.x || 0,
              y: this.sceneManualPan?.y || 0,
            },
            tiltAdjust: this.sceneTiltAdjust || 0,
          },
        })),
      120,
    );
  };
  return MapScene;
};
