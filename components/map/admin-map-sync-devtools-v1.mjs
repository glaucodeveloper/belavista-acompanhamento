/** Expose the existing live model-calibration controls to browser devtools. */
export const installAdminMapSyncDevtoolsV1 = ({
  calibration,
  initialCalibration,
  host = globalThis,
} = {}) => {
  const snapshot = () => ({
    rotation: { ...calibration.rotation },
    shift: { ...calibration.shift },
    scale: calibration.scale,
  });
  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.max(min, Math.min(max, number))
      : fallback;
  };
  const findMap = () =>
    host.document?.querySelector?.(
      "map-scene[data-admin-shared-public-map],map-scene",
    );
  const sync = () => {
    const map = findMap();
    if (map?.syncThree) map.syncThree();
    map?.renderer?.render?.(map.scene, map.camera);
    return {
      mapFound: Boolean(map),
      modelReady: map?.dataset?.modelReady === "true",
      calibration: snapshot(),
    };
  };
  const api = host.__BELAVISTA_MAP_SYNC__ || {};
  api.get = snapshot;
  api.sync = sync;
  api.set = (values = {}) => {
    const rotation = values.rotation || {};
    const shift = values.shift || {};
    if (
      values.modelRotate != null ||
      values.rotation != null ||
      values.rotationZ != null
    )
      calibration.rotation.z = clamp(
        values.modelRotate ?? values.rotationZ ?? rotation.z,
        -180,
        180,
        calibration.rotation.z,
      );
    ["x", "y"].forEach((axis) => {
      const direct = values[`rotation${axis.toUpperCase()}`];
      if (rotation[axis] != null || direct != null)
        calibration.rotation[axis] = clamp(
          rotation[axis] ?? direct,
          -45,
          45,
          calibration.rotation[axis],
        );
    });
    ["x", "y", "z"].forEach((axis) => {
      const direct = values[`shift${axis.toUpperCase()}`];
      if (shift[axis] != null || direct != null)
        calibration.shift[axis] = clamp(
          shift[axis] ?? direct,
          axis === "z" ? -100 : -500,
          axis === "z" ? 100 : 500,
          calibration.shift[axis],
        );
    });
    if (values.scale != null || values.modelScale != null)
      calibration.scale = clamp(
        values.scale ?? values.modelScale,
        0.5,
        1.5,
        calibration.scale,
      );
    return sync();
  };
  api.reset = () => {
    calibration.rotation = { ...initialCalibration.rotation };
    calibration.shift = { ...initialCalibration.shift };
    calibration.scale = initialCalibration.scale;
    return sync();
  };
  api.help =
    "__BELAVISTA_MAP_SYNC__.set({rotation:{z:5}}); __BELAVISTA_MAP_SYNC__.set({shift:{x:-4,y:3}}); __BELAVISTA_MAP_SYNC__.get(); __BELAVISTA_MAP_SYNC__.reset();";
  host.__BELAVISTA_MAP_SYNC__ = api;
  host.belavistaMapSync = api;
  return api;
};
