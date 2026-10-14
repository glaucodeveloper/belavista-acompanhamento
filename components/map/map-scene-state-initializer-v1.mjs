/** Restores persisted map navigation and publishes its initial view metadata. */
export const initializeMapSceneStateV1 = (scene, dependencies = {}) => {
  const {
    ADMIN_FIXED_MAP_ROTATION_DEG,
    ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM,
    ADMIN_REFERENCE_AERIAL_VIEW_VERSION,
    DASHBOARD_INITIAL_SCENE_ZOOM,
    INITIAL_SCENE_ZOOM,
    MAP_SCENE_STATE_VERSION,
    MAX_SCENE_ZOOM,
    MIN_SCENE_ZOOM,
    appStore,
    demoData,
    stageOverlayKey,
  } = dependencies;

  const savedMap = appStore.get().mapView || {},
    savedPan = savedMap.pan || {},
    isDashboardScene =
      scene.hasAttribute("data-dashboard-progress-map") ||
      scene.hasAttribute("data-dashboard-operational-map"),
    isAdminPublicMap = scene.isAdminPublicMapV1?.() === true,
    isAdminReferenceAerial = scene.hasAttribute(
      "data-admin-shared-public-map",
    ),
    initialSceneZoom = isDashboardScene
      ? isAdminPublicMap
        ? 1.62
        : isAdminReferenceAerial
        ? ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM
        : DASHBOARD_INITIAL_SCENE_ZOOM
      : INITIAL_SCENE_ZOOM,
    isCurrentSceneState =
      !isAdminPublicMap &&
      Number(savedMap.sceneVersion) === MAP_SCENE_STATE_VERSION &&
      (!isAdminReferenceAerial ||
        Number(savedMap.referenceAerialVersion) ===
          ADMIN_REFERENCE_AERIAL_VIEW_VERSION);

  scene.mapTileMode = scene.isPublicCustomerExperience()
    ? "generated"
    : appStore.get().mapTileMode || "satellite";
  scene.dataset.mapTileMode = scene.mapTileMode;
  scene.sceneManualRotation = isAdminPublicMap
    ? 0
    : isAdminReferenceAerial
    ? ADMIN_FIXED_MAP_ROTATION_DEG
    : isCurrentSceneState
      ? Number(savedMap.rotation) || 0
      : 0;
  scene.sceneManualZoom = isCurrentSceneState
    ? Number(savedMap.zoom) || initialSceneZoom
    : initialSceneZoom;
  scene.sceneManualPan = isCurrentSceneState
    ? { x: Number(savedPan.x) || 0, y: Number(savedPan.y) || 0 }
    : { x: 0, y: 0 };
  scene.sceneTiltAdjust = isCurrentSceneState
    ? Number(savedMap.tiltAdjust) || 0
    : 0;
  scene.sceneUserInteracted =
    isCurrentSceneState &&
    Boolean(
      scene.sceneManualRotation ||
      scene.sceneTiltAdjust ||
      scene.sceneManualPan.x ||
      scene.sceneManualPan.y ||
      scene.sceneManualZoom !== initialSceneZoom,
    );
  scene.initialSceneFocusApplied = scene.sceneUserInteracted;
  scene.stageOverlayKey = stageOverlayKey(
    demoData.activities.find((x) => x.id === appStore.get().selectedStage)?.name,
  );
  scene.dataset.sceneRotation = `${Math.round(scene.sceneManualRotation)}deg`;
  scene.dataset.sceneRotationLock = isAdminReferenceAerial
    ? `${ADMIN_FIXED_MAP_ROTATION_DEG}deg · fixo`
    : "";
  scene.dataset.sceneZoom = `${Math.round(scene.sceneManualZoom * 100)}%`;
  scene.dataset.sceneZoomMin = `${Math.round(MIN_SCENE_ZOOM * 100)}%`;
  scene.dataset.sceneZoomMax = `${Math.round(MAX_SCENE_ZOOM * 100)}%`;
  scene.dataset.scenePan = `${Math.round(scene.sceneManualPan.x)},${Math.round(scene.sceneManualPan.y)}`;
  scene.dataset.scenePanAxis = "x/y compartilhados · z fixo";
  scene.dataset.sceneAnchor = "center";
  scene.dataset.sceneStateVersion = String(MAP_SCENE_STATE_VERSION);
  scene.dataset.adminReferenceAerialViewVersion = isAdminReferenceAerial
    ? String(ADMIN_REFERENCE_AERIAL_VIEW_VERSION)
    : "";
  scene.style.setProperty("--scene-anchor-x", "50%");
  scene.style.setProperty("--scene-anchor-y", "50%");

  return { isAdminPublicMap, isAdminReferenceAerial, isCurrentSceneState, initialSceneZoom };
};
