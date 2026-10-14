/** Coordinates the persistent MapScene and its visible compact mirrors. */
export const createCompactMapCoordinatorV1 = (dependencies = {}) => {
  const { requestAnimationFrame: requestFrame } = dependencies;
  if (typeof requestFrame !== "function")
    throw new TypeError("Compact map coordinator requires requestAnimationFrame().");

  let sharedMapScene = null;
  let compactMirrorFrame = 0;
  const compactMapMirrors = new Set();

  const syncCompactMapMirrors = () => {
    if (!sharedMapScene?._modelGpuReady) return;
    if (compactMirrorFrame) return;

    const queue = [...compactMapMirrors].filter(
      (mirror) => mirror._compactVisible,
    );

    const step = () => {
      const mirror = queue.shift();
      if (mirror) mirror.renderSharedMap?.();

      if (queue.length) {
        compactMirrorFrame = requestFrame(step);
      } else {
        compactMirrorFrame = 0;
      }
    };

    compactMirrorFrame = requestFrame(step);
  };

  return {
    compactMapMirrors,
    getSharedMapScene: () => sharedMapScene,
    publishMapPreview: () => syncCompactMapMirrors(),
    setSharedMapScene(scene) {
      sharedMapScene = scene;
    },
    syncCompactMapMirrors,
  };
};
