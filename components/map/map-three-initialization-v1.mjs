import { installAtlasMapThreeInitializationV1 } from "../../dist/frontend/components.js";

/** Compatibility edge; the TypeScript component owns the complete map lifecycle. */
export const installMapThreeInitializationV1 = (MapScene, {
  MAP_CAMERA_VIEW,
  MAP_GEOREFERENCE_FALLBACK,
  SCENE_MAP_Z,
  SCENE_MODEL_BASE_Z,
  TILT_DRAG_SENSITIVITY,
  ZOOM_DRAG_SENSITIVITY,
  appStore,
  solarStateForHour,
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("MapScene initialization requires MapScene.prototype.");
  if (!documentRef?.createElement) throw new TypeError("MapScene initialization requires document.createElement().");
  if (!windowRef) throw new TypeError("MapScene initialization requires the browser window.");
  for (const [name, value] of Object.entries({
    MAP_CAMERA_VIEW,
    MAP_GEOREFERENCE_FALLBACK,
    SCENE_MAP_Z,
    SCENE_MODEL_BASE_Z,
    TILT_DRAG_SENSITIVITY,
    ZOOM_DRAG_SENSITIVITY,
    appStore,
    solarStateForHour,
  })) if (value === undefined) throw new TypeError(`MapScene initialization requires ${name}.`);

  return installAtlasMapThreeInitializationV1(MapScene, {
    mapCameraView: MAP_CAMERA_VIEW,
    mapGeoreferenceFallback: MAP_GEOREFERENCE_FALLBACK,
    sceneMapZ: SCENE_MAP_Z,
    sceneModelBaseZ: SCENE_MODEL_BASE_Z,
    tiltDragSensitivity: TILT_DRAG_SENSITIVITY,
    zoomDragSensitivity: ZOOM_DRAG_SENSITIVITY,
    appStore,
    solarStateForHour,
    importThree: () => import("three"),
    importGltfLoader: () => import("three/addons/loaders/GLTFLoader.js"),
    documentRef,
    windowRef,
    locationRef: globalThis.location,
    consoleRef: globalThis.console,
  });
};
