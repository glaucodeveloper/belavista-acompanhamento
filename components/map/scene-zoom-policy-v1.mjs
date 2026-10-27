import * as atlasComponents from "../../dist/frontend/components.js";

export const installSceneZoomPolicyV1 = (MapScene, { appStore, minSceneZoom } = {}) => {
  if (typeof atlasComponents.installAtlasMapSceneZoomPolicy === "function")
    return atlasComponents.installAtlasMapSceneZoomPolicy(MapScene, { appStore, minSceneZoom });

  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Scene zoom policy requires the existing MapScene constructor.");
  if (typeof appStore?.get !== "function")
    throw new TypeError("Scene zoom policy requires appStore.get().");
  if (!Number.isFinite(minSceneZoom))
    throw new TypeError("Scene zoom policy requires a numeric minimum zoom.");
  if (typeof MapScene.prototype.setSceneZoom !== "function")
    throw new TypeError("Scene zoom policy requires MapScene.setSceneZoom().");
  if (MapScene.prototype.setSceneZoom.__sceneZoomPolicyV1) return MapScene;

  const setSceneZoom = MapScene.prototype.setSceneZoom;
  const setSceneZoomWithPolicy = function (value, animate = true) {
    const dashboardFull =
      this.matches?.(
        'map-scene[data-dashboard-operational-map],map-scene[data-persistent-map="true"]',
      ) && appStore.get().view === "assistant";
    return setSceneZoom.call(
      this,
      dashboardFull ? Math.max(minSceneZoom, Number(value) || 0) : value,
      animate,
    );
  };
  Object.defineProperty(setSceneZoomWithPolicy, "__sceneZoomPolicyV1", { value: true });
  MapScene.prototype.setSceneZoom = setSceneZoomWithPolicy;
  return MapScene;
};
