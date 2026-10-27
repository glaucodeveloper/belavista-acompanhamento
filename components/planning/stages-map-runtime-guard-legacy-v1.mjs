/** Preserve the operational map surface and its stage-panorama controls. */
export const installStagesMapRuntimeGuardV1 = (
  ViewLayer,
  { appStore, documentRef = globalThis.document } = {},
) => {
  const renderWithStagesMapGuard = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderWithStagesMapGuard.apply(this, args);
    const isStages = appStore.get().view === "stages";
    const stagesPanoramaMap = this.querySelector(
      "map-scene[data-dashboard-operational-map]",
    );
    if (isStages && stagesPanoramaMap) {
      stagesPanoramaMap.setAttribute(
        "data-map-context",
        "stages-panorama-progress",
      );
      stagesPanoramaMap.setAttribute("data-stages-panorama-map", "true");
      stagesPanoramaMap.style.setProperty("pointer-events", "none", "important");
      stagesPanoramaMap
        .querySelectorAll(
          ".map-rotation-controls,.map-category-switcher,.map-fit-button,[data-scene-fit]",
        )
        .forEach((control) =>
          control.style.setProperty("pointer-events", "auto", "important"),
        );
    }
    // The stage route now reuses the persistent dashboard map. Its viewport is
    // laid out by stage-map-transition-v1.css; inline !important styles here
    // would hide the map and place the page over it.
    for (const property of ["position", "inset", "z-index", "height", "overflow"])
      this.style.removeProperty(property);
    documentRef.querySelectorAll("main.scene>map-scene").forEach((map) => {
      map.style.removeProperty("display");
      map.style.removeProperty("visibility");
    });
    return result;
  };
  return ViewLayer;
};
