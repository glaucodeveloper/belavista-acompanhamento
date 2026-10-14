export const installSceneContextLifecycleV1 = (MapScene, { requestAnimationFrame } = {}) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Scene context lifecycle requires the existing MapScene constructor.");
  if (typeof requestAnimationFrame !== "function")
    throw new TypeError("Scene context lifecycle requires requestAnimationFrame().");
  if (typeof MapScene.prototype.setTheme !== "function")
    throw new TypeError("Scene context lifecycle requires MapScene.setTheme().");
  if (MapScene.prototype.setTheme.__sceneContextLifecycleV1) return MapScene;

  const setTheme = MapScene.prototype.setTheme;
  const wrappedSetTheme = function (view) {
    if (this._themeView === view && this._mapSceneThemeGuard === view) return;
    this._mapSceneThemeGuard = view;
    this.setMapContext(view);
    const result = setTheme.call(this, view);
    // Keep the persistent scene centered when the SPA changes the viewport
    // used by records, agenda, activities, and progress pages.
    if (["records", "agenda", "activities", "progress"].includes(view)) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.centerSceneInContext()),
      );
    }
    return result;
  };
  Object.defineProperty(wrappedSetTheme, "__sceneContextLifecycleV1", { value: true });
  MapScene.prototype.setTheme = wrappedSetTheme;
  return MapScene;
};
