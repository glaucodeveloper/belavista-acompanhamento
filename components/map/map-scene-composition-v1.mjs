// MapScene feature composition; behavior stays in the focused map modules.
import { MASTERPLAN_PDF_ARTWORK_V3, masterplanPdfImageRectV3 } from "../../masterplan-pdf-artwork-v3.mjs";
import { REPASSE_PRICE_CATALOG } from "../../repasse-price-catalog.mjs";
import { renderMapPdfLegends, ensureMapPdfLegendStyles } from "../../map-pdf-legends-v1.mjs?v=1";
import { esc, ico, notify } from "../shared/dom.mjs";
import { installAdminReferenceAerialFrameV1 } from "./admin-reference-aerial-frame-v1.mjs?v=admin-reference-aerial-frame-v1";
import { installAdminMasterplanOverlayV1 } from "./admin-masterplan-overlay-v1.mjs?v=admin-masterplan-overlay-v2";
import { installMapSceneStartupReadinessV1 } from "./map-scene-startup-readiness-v1.mjs?v=map-scene-startup-readiness-v1";
import { installMapSceneCleanupV1 } from "./map-scene-cleanup-v1.mjs?v=map-scene-cleanup-v1";
import { installMapSceneConnectionV1 } from "./map-scene-connection-v1.mjs?v=map-scene-connection-v1";
import { installLeafletMapSceneV1 } from "./leaflet-map-scene-v1.mjs?v=leaflet-map-scene-v1";
import { installDwgGeoreferenceControllerV1 } from "./dwg-georeference-controller-v1.mjs?v=dwg-georeference-controller-v1";
import { installSceneGeometryOverlaysV1 } from "./scene-geometry-overlays-v1.mjs?v=scene-geometry-overlays-v1";
import { runtimeRouteV1 } from "../shared/routing.mjs";
import { createCompactMapCoordinatorV1 } from "./compact-map-coordinator-v1.mjs?v=compact-map-coordinator-v1";
import { createScenePresentationConfigV1 } from "./scene-presentation-config-v1.mjs?v=scene-presentation-config-v1";
import { createMapTileSourceCatalogV1 } from "./map-tile-source-catalog-v1.mjs?v=map-tile-source-catalog-v1";
import { installAdminMapSyncDevtoolsV1 } from "./admin-map-sync-devtools-v1.mjs?v=admin-map-sync-devtools-v1";
import { createMapAssistantContextActionsV1 } from "./map-assistant-context-actions-v1.mjs?v=map-assistant-context-actions-v1";
import {
  DWG_GEOREFERENCE_URL,
  PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1,
  polygonCentroidV1,
  projectCanonicalLotTraceToMasterplanOverlayUvV1,
  ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
  INVALID_MASTERPLAN_LOT_IDS_V1,
  MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1,
  MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1,
  MASTERPLAN_COMMON_AREA_LABEL_V1,
  ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1,
  ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1,
  ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2,
  PDF_LOT_LABELS_URL_V1,
  PDF_LOT_GREEN_MAPPING_URL_V1,
  CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1,
  ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1,
  ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1,
  buildAdminReferenceAerialRasterMaskModelV1,
  loadAdminDwgGeoreferenceV1,
  appendAdminReferenceAerialCurbPathV1,
  createAdminReferenceAerialBezierCurbGuidesV1,
  createAdminReferenceAerialRoadPlaneGeometryV1,
  createAdminReferenceAerialNativeRoadGeometryV1,
  warpAdminGlbToFixedAerialV1,
  PDF_MASTERPLAN_MODEL_TEXTURE_VERSION,
  PDF_MODEL_TEXTURE_BRIGHTNESS,
  ADMIN_REFERENCE_AERIAL_ASSET_V1,
  ADMIN_AERIAL_ZOOM_TILE_ROOT_V1,
  ADMIN_AERIAL_ZOOM_TILE_GRID_V1,
  ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1,
  ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2,
  ADMIN_AERIAL_TILE_SWAP_RATIO_V2,
  ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1,
  ADMIN_REFERENCE_AERIAL_VERSION_V1,
  ADMIN_SEMANTIC_3D_LAYER_VERSION_V1,
  ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1,
  ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
  ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
  ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
  ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1,
  PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1,
  PDF_MASTERPLAN_PAGE_SIZE_V1,
  PDF_MASTERPLAN_SITE_FRAME_V1,
  PDF_MASTERPLAN_VEHICLE_ANCHORS_V1,
} from "./georeference.mjs?v=admin-map-georeference-v1&pdf-yellow-circles-v2";
import {
  MAP_GEOREFERENCE_FALLBACK,
  localClockHourForGeo,
  solarWindowForGeo,
  solarHourLabel,
  solarStateForHour,
} from "./solar-lighting.mjs?v=solar-lighting-v1";
import { loadGlbWithClientCacheV14 } from "./model-client-cache.mjs?v=model-client-cache-v14";
import { installMapSolarLightingControllerV1 } from "./solar-lighting-controller-v1.mjs?v=solar-lighting-controller-v1";
import { installMapSceneControlsV1 } from "./map-scene-controls-v1.mjs?v=map-scene-controls-v1";
import { installMapTileModeControllerV1 } from "./map-tile-mode-controller-v1.mjs?v=map-tile-mode-controller-v1";
import { installSceneNavigationV1 } from "./scene-navigation-v1.mjs?v=scene-navigation-v1";
import { createSatelliteLotProjectionV1 } from "./satellite-lot-projection-v1.mjs?v=satellite-lot-projection-v3";
import { installSatelliteLotPlanOverlayV1 } from "./satellite-lot-plan-overlay-v1.mjs?v=satellite-lot-plan-overlay-v6";
import { installAdminStandaloneStartupV5370 } from "./admin-standalone-startup-v5370.mjs?v=admin-standalone-startup-v5370-v2";
import { installAdminStandaloneAerialV5380 } from "./admin-standalone-aerial-v5380.mjs?v=admin-standalone-aerial-v5380-v1";
import { installAdminReferenceAerialSceneV1 } from "./admin-reference-aerial-scene-v1.mjs?v=admin-reference-aerial-scene-v1";
import { installMapThreeInitializationV1 } from "./map-three-initialization-v1.mjs?v=map-three-initialization-v1";
import { installAdminMasterplanAdjustmentV1 } from "./admin-masterplan-adjustment-v1.mjs?v=admin-masterplan-adjustment-v1";
import { installMapModelGpuEnrichmentV5367 } from "./model-gpu-enrichment-v5367.mjs?v=model-gpu-enrichment-v5367-v1";
import { installAdminPdfMasterplanPipelineV1 } from "./admin-pdf-masterplan-pipeline-v1.mjs?v=admin-pdf-masterplan-pipeline-v1";
import { installMapLoadingScreenV1 } from "./map-loading-screen-v1.mjs?v=map-loading-screen-v1";
import { installSceneTiltControllerV1 } from "./scene-tilt-controller-v1.mjs?v=scene-tilt-controller-v1";
import { installSceneContextLifecycleV1 } from "./scene-context-lifecycle-v1.mjs?v=scene-context-lifecycle-v1";
import { installSceneZoomPolicyV1 } from "./scene-zoom-policy-v1.mjs?v=scene-zoom-policy-v1";
import { installSceneStatePersistenceV1 } from "./scene-state-persistence-v1.mjs?v=scene-state-persistence-v1";
import { installCameraFramingV1 } from "./camera-framing-v1.mjs?v=camera-framing-v1";
import { installMapPdfInterfaceV1 } from "./map-pdf-interface-v1.mjs?v=map-pdf-interface-v1";
import { installStaticSatelliteGesturesV1 } from "./static-satellite-gestures-v1.mjs?v=static-satellite-gestures-v1";
import { installCompactMapV1 } from "./compact-map-v1.mjs?v=compact-map-v1";
import { installCompactMapRendererV1 } from "./compact-map-renderer-v1.mjs?v=compact-map-renderer-v1";
import { installStageOverlayControllerV1 } from "./stage-overlay-controller-v1.mjs?v=stage-overlay-controller-v1";
import { installMapSelectionV1 } from "./map-selection-v1.mjs?v=map-selection-v1";
import { installOperationalRecordMapV1 } from "./operational-record-map-v1.mjs?v=operational-record-map-v1";
import { installMapModelPickingV1 } from "./model-picking-v1.mjs?v=map-model-picking-v2";
import { installMapLotSelectionUiV1 } from "./lot-selection-ui-v1.mjs?v=map-lot-selection-ui-v1";
import { installAdminStandaloneCameraV1 } from "./admin-standalone-camera-v1.mjs?v=admin-standalone-camera-v1";
import { installPublicTerrainEnvironmentV1 } from "./public-terrain-environment-v1.mjs?v=public-terrain-environment-v1";
import { installAdminRoadGeometryV1 } from "./admin-road-geometry-v1.mjs?v=admin-road-geometry-v1";
import { ROAD_HALF_LOT_SLICE_WORLD_V1, roadPlanarAngleV1 } from "./road-geometry-math-v1.mjs?v=road-geometry-math-v1";
import { installPublicRoadSurfacePolicyV1 } from "./public-road-surface-policy-v1.mjs?v=public-road-surface-policy-v1";
import { installPublicDwgGeoreferenceV1 } from "./public-dwg-georeference-v1.mjs?v=public-dwg-georeference-v1";
import { installMapRasterSurfaceV1 } from "./raster-surface-v1.mjs?v=map-raster-surface-v1";
import { installMapSceneSyncV1 } from "./map-scene-sync-v1.mjs?v=map-scene-sync-v1";
import { installMapSceneSurfacePolicyV1 } from "./scene-surface-policy-v1.mjs?v=scene-surface-policy-v2";
import { installPublicLotStatusControllerV1 } from "./public-lot-status-controller-v1.mjs?v=public-lot-status-controller-v1";
import { installPublicModelPresentationV1 } from "./public-model-presentation-v1.mjs?v=public-model-presentation-v1";
import { installAdminModelCalibrationV1 } from "./admin-model-calibration-v1.mjs?v=admin-model-calibration-v1";
import { installSurfaceMaterialsV1 } from "./surface-materials-v1.mjs?v=surface-materials-v1";
import {
  blendStageOverlayColorV1,
  normalizeStageOverlayKeysV1,
  stageOverlayColors,
  stageOverlayKey,
  stageOverlayLabelV1,
  stageOverlayLabels,
} from "./stage-overlays.mjs?v=stage-overlays-v1";
import { installMapSceneContextExtensionsV1 } from "./context-overlays.mjs";
import {
  appStore,
  demoData,
  viewThemes,
  activityCatalog,
} from "../../state.js?v=system-metrics-v1-20260919";

export function installMapSceneCompositionV1(MapScene, dependencies) {
  const { dashboardFilterForModeV1, dashboardModeKeyV1 } = dependencies;
  const validGeoPoint = (point) =>
    point &&
    Number.isFinite(Number(point.lat)) &&
    Number.isFinite(Number(point.lng)) &&
    Math.abs(Number(point.lat)) <= 90 &&
    Math.abs(Number(point.lng)) <= 180;
  const compactMapCoordinatorV1 = createCompactMapCoordinatorV1({
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
  });
  const {
    compactMapMirrors,
    getSharedMapScene,
    publishMapPreview,
    setSharedMapScene,
    syncCompactMapMirrors,
  } = compactMapCoordinatorV1;
  const scenePresentationConfigV1 = createScenePresentationConfigV1();
  const { DEFAULT_SCENE_ZOOM, INITIAL_SCENE_ZOOM, MIN_SCENE_ZOOM, MAX_SCENE_ZOOM, MIN_SCENE_TILT, MAX_SCENE_TILT, SCENE_TILT_ADJUST_LIMIT, SCENE_TILT_ZOOM_OUT_FACTOR, TILT_DRAG_SENSITIVITY, ZOOM_DRAG_SENSITIVITY, DEFAULT_TILT_BOOST, DASHBOARD_TILT_BOOST, SCENE_SURFACE_SCALE, PUBLIC_SATELLITE_VERTICAL_COVERAGE, MODEL_FIT_RATIO, MODEL_PUBLIC_FIT_RATIO, MODEL_VERTICAL_EXAGGERATION, PUBLIC_SOCIAL_GREEN_LIFT_V1, SCENE_MAP_Z, SCENE_MODEL_BASE_Z, SCENE_VIEWPORT_COVERAGE, SCENE_PAN_SAFETY, SCENE_PUBLIC_PAN_SAFETY, ADMIN_GEO_MODEL_FINE_ROTATION_DEG, ADMIN_GEO_MODEL_FINE_SHIFT_X, ADMIN_GEO_MODEL_FINE_SHIFT_Y, DASHBOARD_PAN_SAFETY, MAP_TILE_OVERSCAN, MAP_RASTER_MAX, MAP_SCENE_STATE_VERSION, STAGE_FILTER_TRANSITION_MS, MAP_CAMERA_VIEW, DASHBOARD_INITIAL_SCENE_ZOOM, ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM, ADMIN_REFERENCE_AERIAL_VIEW_VERSION, DASHBOARD_PAN_BOUNDING_SCREEN_RATIO, GENERATED_AERIAL_ASSET, GENERATED_AERIAL_VERSION, DWG_SATELLITE_MOSAIC_ZOOM, DWG_SATELLITE_MOSAIC_TILE_SIZE, DWG_SATELLITE_MOSAIC_TILE_X0, DWG_SATELLITE_MOSAIC_TILE_Y0, DWG_SATELLITE_MOSAIC_TILES, DWG_PLAN_HEADING_RAD, DWG_PLAN_HEADING_DEG, PUBLIC_MODEL_NORTH_ROTATION_DEG, PUBLIC_MODEL_NORTH_ROTATION_RAD, MODEL_EXTRA_Y_ROTATION_DEG, MODEL_EXTRA_Y_ROTATION_RAD, ADMIN_FIXED_MAP_ROTATION_DEG, ADMIN_FIXED_MAP_ROTATION_RAD, ADMIN_PDF_DISPLAY_Y_ROTATION_DEG, ADMIN_PDF_DISPLAY_Y_ROTATION_RAD, ADMIN_MODEL_CALIBRATION_DEFAULTS_V1, ADMIN_MODEL_CALIBRATION_V1, ADMIN_MODEL_CALIBRATION_INITIAL_V1, ADMIN_STANDALONE_MODEL_TURN_DEG_V1, ADMIN_STANDALONE_MODEL_STREET_DROP_V1, ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1, ADMIN_STANDALONE_BASE_TILT_DEG_V1, ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10, ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10, ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12, ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12, ADMIN_STANDALONE_MODEL_ALIGNMENT_V1, sceneTiltBoostForView, readAdminModelCalibrationV1 } = scenePresentationConfigV1;
  installAdminMapSyncDevtoolsV1({
    calibration: ADMIN_MODEL_CALIBRATION_V1,
    initialCalibration: ADMIN_MODEL_CALIBRATION_INITIAL_V1,
    host: globalThis,
  });
  const ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP = 1;
  const ADMIN_PDF_DISPLAY_TEXTURE_V_FLIP = true;
  const PUBLIC_MODEL_HORIZONTAL_FLIP = -1;
  const PUBLIC_MODEL_GUIDE_ROTATION_DEG = -90;
  const PUBLIC_MODEL_GUIDE_ROTATION_RAD =
    (PUBLIC_MODEL_GUIDE_ROTATION_DEG * Math.PI) / 180;
  const PUBLIC_MODEL_ALIGNMENT_OFFSET_WORLD_X = -75;
  const PUBLIC_MODEL_ALIGNMENT_OFFSET_WORLD_Z = -775;
  const mapTileSources = createMapTileSourceCatalogV1({
    runtimeRouteV1,
    generatedAerialAsset: GENERATED_AERIAL_ASSET,
    generatedAerialVersion: GENERATED_AERIAL_VERSION,
  });
  const progressNatureOptions = [
    "Terraplanagem",
    "Drenagem",
    "Iluminação pública",
    "Rede de água",
    "Rede elétrica",
    "Pavimentação",
    "Praças / urbanização",
    "Arborização",
    "Segurança",
    "Qualidade / ensaios",
    "Medição físico-financeira",
  ];
  const mapAssistantContextActionsV1 = createMapAssistantContextActionsV1({
    host: globalThis,
    documentRef: globalThis.document,
    commonAreaLabel: MASTERPLAN_COMMON_AREA_LABEL_V1,
    loadWorkerContextChat: () =>
      import("../../worker-context-chat.mjs?v=worker-chat-lot-development-v1"),
  });
  const {
    prepareAssistantLotStatusPromptV1,
    prepareAssistantMapAreaPromptV1,
  } = mapAssistantContextActionsV1;

  installAdminReferenceAerialFrameV1(MapScene);
  installMapSceneStartupReadinessV1(MapScene);
  installMapSceneCleanupV1(MapScene, { compactMapMirrors });
  installMapSceneConnectionV1(MapScene, {
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
    esc,
    ico,
    performanceRef: performance,
    setSharedMapScene,
    stageOverlayKey,
    stageOverlayLabels,
  });
  installLeafletMapSceneV1(MapScene, { viewThemes, mapCameraView: MAP_CAMERA_VIEW, validGeoPoint, appStore });
  installDwgGeoreferenceControllerV1(MapScene, {
    url: DWG_GEOREFERENCE_URL,
    fallback: MAP_GEOREFERENCE_FALLBACK,
    appStore,
    localClockHourForGeo,
    validGeoPoint,
  });
  installSceneGeometryOverlaysV1(MapScene);
  installMapLoadingScreenV1(MapScene, { GENERATED_AERIAL_ASSET, browser: globalThis });
  installMapSceneSurfacePolicyV1(MapScene);
  installPublicLotStatusControllerV1(MapScene);
  installMapSolarLightingControllerV1(MapScene, {
    appStore,
    MAP_GEOREFERENCE_FALLBACK,
    localClockHourForGeo,
    notify,
    solarHourLabel,
    solarStateForHour,
    solarWindowForGeo,
    windowRef: window,
  });
  installSceneNavigationV1(MapScene, {
    config: {
      ADMIN_FIXED_MAP_ROTATION_DEG,
      DASHBOARD_PAN_BOUNDING_SCREEN_RATIO,
      DASHBOARD_PAN_SAFETY,
      DEFAULT_SCENE_ZOOM,
      DEFAULT_TILT_BOOST,
      MAP_CAMERA_VIEW,
      MAX_SCENE_TILT,
      MAX_SCENE_ZOOM,
      MIN_SCENE_TILT,
      MIN_SCENE_ZOOM,
      SCENE_MAP_Z,
      SCENE_PAN_SAFETY,
      SCENE_PUBLIC_PAN_SAFETY,
      SCENE_SURFACE_SCALE,
      SCENE_TILT_ADJUST_LIMIT,
      SCENE_TILT_ZOOM_OUT_FACTOR,
    },
    appStore,
    sceneTiltBoostForView,
    viewThemes,
    browser: {
      performanceNow: () => performance.now(),
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    },
  });
  installSceneTiltControllerV1(MapScene, {
    config: {
      ADMIN_STANDALONE_BASE_TILT_DEG_V1,
      DEFAULT_SCENE_ZOOM,
      MAP_CAMERA_VIEW,
      MAX_SCENE_TILT,
      MIN_SCENE_TILT,
      SCENE_TILT_ADJUST_LIMIT,
    },
    sceneTiltBoostForView,
    viewThemes,
    browser: {
      performanceNow: () => performance.now(),
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
    },
  });
  installSceneContextLifecycleV1(MapScene, {
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
  });
  installSceneZoomPolicyV1(MapScene, { appStore, minSceneZoom: MIN_SCENE_ZOOM });
  installSceneStatePersistenceV1(MapScene, {
    appStore,
    config: {
      MAP_SCENE_STATE_VERSION,
      ADMIN_REFERENCE_AERIAL_VIEW_VERSION,
      ADMIN_FIXED_MAP_ROTATION_DEG,
      INITIAL_SCENE_ZOOM,
    },
    browser: {
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    },
  });
  installCameraFramingV1(MapScene, {
    config: {
      ADMIN_FIXED_MAP_ROTATION_DEG,
      DEFAULT_SCENE_ZOOM,
      MAP_CAMERA_VIEW,
    },
    browser: {
      document,
      window,
      getComputedStyle,
      setTimeout: window.setTimeout.bind(window),
    },
  });
  installMapPdfInterfaceV1(MapScene, {
    appStore,
    ensureMapPdfLegendStyles,
    renderMapPdfLegends,
    stageOverlayLabels,
    stageOverlayColors,
    esc,
    ico,
    notify,
    browser: {
      document,
      window,
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
    },
  });
  installMapSceneControlsV1(MapScene, {
    ADMIN_STANDALONE_BASE_TILT_DEG_V1,
    MAP_CAMERA_VIEW,
    sceneTiltBoostForView,
    viewThemes,
  });
  installMapTileModeControllerV1(MapScene, { appStore, notify });
  installStaticSatelliteGesturesV1(MapScene, {
    ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
  });
  installCompactMapRendererV1(MapScene, {
    blendStageOverlayColorV1,
    getSharedMapScene,
    MODEL_VERTICAL_EXAGGERATION,
    normalizeStageOverlayKeysV1,
    SCENE_MAP_Z,
    stageOverlayKey,
    stageOverlayLabelV1,
  });
  installCompactMapV1(MapScene, {
    compactMapMirrors,
    esc,
    getSharedMapScene,
    IntersectionObserver: window.IntersectionObserver,
    requestAnimationFrame,
    stageOverlayKey,
    stageOverlayLabels,
    syncCompactMapMirrors,
    ZOOM_DRAG_SENSITIVITY,
    ResizeObserver: window.ResizeObserver,
  });
  installStageOverlayControllerV1(MapScene, {
    appStore,
    notify,
    performanceNow: () => performance.now(),
    requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
    setTimeout,
    stageOverlayColors,
    stageOverlayKey,
    stageOverlayLabels,
    STAGE_FILTER_TRANSITION_MS,
  });
  installMapModelPickingV1(MapScene, { appStore });
  installMapLotSelectionUiV1(MapScene, {
    appStore,
    document,
    esc,
    FormData,
    ico,
    notify,
    window,
  });
  installMapSelectionV1(MapScene, {
    activityCatalog,
    appStore,
    demoData,
    document,
    esc,
    FormData,
    ico,
    notify,
    progressNatureOptions,
    stageOverlayColors,
    stageOverlayKey,
    window,
  });
  installOperationalRecordMapV1(MapScene);
  installAdminStandaloneCameraV1(MapScene, {
    ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2,
    ADMIN_AERIAL_TILE_SWAP_RATIO_V2,
    ADMIN_AERIAL_ZOOM_TILE_GRID_V1,
    ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1,
    ADMIN_AERIAL_ZOOM_TILE_ROOT_V1,
    ADMIN_STANDALONE_BASE_TILT_DEG_V1,
    ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11,
    ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11,
    ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10,
    ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10,
    ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12,
    ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12,
    ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11,
    DASHBOARD_PAN_BOUNDING_SCREEN_RATIO,
    MAP_CAMERA_VIEW,
    MAX_SCENE_TILT,
    MAX_SCENE_ZOOM,
    MIN_SCENE_TILT,
    MIN_SCENE_ZOOM,
    SCENE_MAP_Z,
    appStore,
    runtimeRouteV1,
    sceneTiltBoostForView,
    viewThemes,
    browser: {
      Image: window.Image,
      performanceNow: () => performance.now(),
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    },
  });
  installPublicTerrainEnvironmentV1(MapScene, {
    GENERATED_AERIAL_ASSET,
    GENERATED_AERIAL_VERSION,
    PUBLIC_SOCIAL_GREEN_LIFT_V1,
    SCENE_MAP_Z,
    runtimeRouteV1,
    browser: {
      Image: window.Image,
      document,
      setTimeout: window.setTimeout.bind(window),
    },
  });
  installSurfaceMaterialsV1(MapScene);
  installPublicModelPresentationV1(MapScene);
  installAdminModelCalibrationV1(MapScene, {
    getCalibration: () => ADMIN_MODEL_CALIBRATION_V1,
  });
  installAdminRoadGeometryV1(MapScene, {
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1,
    ROAD_HALF_LOT_SLICE_WORLD_V1,
    appendAdminReferenceAerialCurbPathV1,
    createAdminReferenceAerialBezierCurbGuidesV1,
    createAdminReferenceAerialNativeRoadGeometryV1,
    createAdminReferenceAerialRoadPlaneGeometryV1,
    roadPlanarAngleV1,
    browser: {
      fetch: window.fetch.bind(window),
      document,
    },
  });
  installPublicRoadSurfacePolicyV1(MapScene, {
    runtimeRouteV1,
    logger: window.console,
  });
  installPublicDwgGeoreferenceV1(MapScene, {
    config: {
      ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP,
      ADMIN_PDF_DISPLAY_Y_ROTATION_DEG,
      ADMIN_PDF_DISPLAY_Y_ROTATION_RAD,
      MODEL_EXTRA_Y_ROTATION_DEG,
      MODEL_EXTRA_Y_ROTATION_RAD,
      MODEL_VERTICAL_EXAGGERATION,
      PUBLIC_MODEL_HORIZONTAL_FLIP,
      PUBLIC_MODEL_NORTH_ROTATION_DEG,
      PUBLIC_MODEL_NORTH_ROTATION_RAD,
      SCENE_MODEL_BASE_Z,
    },
  });
  installMapRasterSurfaceV1(MapScene, {
    config: {
      DWG_SATELLITE_MOSAIC_TILES,
      DWG_SATELLITE_MOSAIC_TILE_SIZE,
      DWG_SATELLITE_MOSAIC_TILE_X0,
      DWG_SATELLITE_MOSAIC_TILE_Y0,
      DWG_SATELLITE_MOSAIC_ZOOM,
      MAP_RASTER_MAX,
      MAP_TILE_OVERSCAN,
      SCENE_MAP_Z,
    },
    mapTileSources,
    browser: { Image },
    logger: { warn: (...args) => console.warn(...args) },
  });
  installMapSceneSyncV1(MapScene, {
    config: {
      ADMIN_FIXED_MAP_ROTATION_DEG,
      ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP,
      ADMIN_PDF_DISPLAY_Y_ROTATION_DEG,
      ADMIN_PDF_DISPLAY_Y_ROTATION_RAD,
      ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1,
      DWG_PLAN_HEADING_DEG,
      DWG_PLAN_HEADING_RAD,
      DWG_SATELLITE_MOSAIC_ZOOM,
      MAP_CAMERA_VIEW,
      MAP_RASTER_MAX,
      MAP_TILE_OVERSCAN,
      MODEL_EXTRA_Y_ROTATION_DEG,
      MODEL_EXTRA_Y_ROTATION_RAD,
      MODEL_FIT_RATIO,
      MODEL_PUBLIC_FIT_RATIO,
      MODEL_VERTICAL_EXAGGERATION,
      PUBLIC_MODEL_HORIZONTAL_FLIP,
      PUBLIC_MODEL_NORTH_ROTATION_RAD,
      PUBLIC_SATELLITE_VERTICAL_COVERAGE,
      SCENE_MAP_Z,
      SCENE_MODEL_BASE_Z,
      SCENE_SURFACE_SCALE,
    },
    mapGeoreferenceFallback: MAP_GEOREFERENCE_FALLBACK,
    viewThemes,
    leaflet: globalThis.L || {latLng:(lat,lng)=>({lat,lng})},
    syncCompactMapMirrors,
    logger: { warn: (...args) => console.warn(...args) },
  });
  installMapSceneContextExtensionsV1({
    MapScene,
    appStore,
    demoData,
    publishMapPreview,
    normalizeStageOverlayKeysV1,
    blendStageOverlayColorV1,
    dashboardModeKeyV1,
    dashboardFilterForModeV1: (...args) => dashboardFilterForModeV1(...args),
    stageOverlayLabelV1,
    syncCompactMapMirrors,
    notify,
    getSharedMapScene,
  });
  installAdminStandaloneStartupV5370(MapScene, {
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1,
    ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1,
    ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1,
    ADMIN_GEO_MODEL_FINE_ROTATION_DEG,
    ADMIN_GEO_MODEL_FINE_SHIFT_X,
    ADMIN_GEO_MODEL_FINE_SHIFT_Y,
    ADMIN_STANDALONE_MODEL_ALIGNMENT_V1,
    ADMIN_STANDALONE_MODEL_TURN_DEG_V1,
    MAP_GEOREFERENCE_FALLBACK,
    MODEL_EXTRA_Y_ROTATION_RAD,
    MODEL_VERTICAL_EXAGGERATION,
    SCENE_MAP_Z,
    TILT_DRAG_SENSITIVITY,
    ZOOM_DRAG_SENSITIVITY,
    DateRef: Date,
    consoleRef: console,
    localStorageRef: { setItem: (...args) => localStorage.setItem(...args) },
    requestAnimationFrameRef: requestAnimationFrame,
    windowRef: window,
    appStore,
    loadAdminDwgGeoreferenceV1,
    loadGlbWithClientCacheV14,
    runtimeRouteV1,
    solarStateForHour,
    warpAdminGlbToFixedAerialV1,
  });
  installSatelliteLotPlanOverlayV1(MapScene, {
    ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2,
    ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
    ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1,
    CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1,
    DWG_GEOREFERENCE_URL,
    INVALID_MASTERPLAN_LOT_IDS_V1,
    MASTERPLAN_COMMON_AREA_LABEL_V1,
    MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1,
    MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1,
    PDF_LOT_GREEN_MAPPING_URL_V1,
    PDF_LOT_LABELS_URL_V1,
    PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1,
    REPASSE_PRICE_CATALOG,
    appStore,
    createSatelliteLotProjectionV1,
    esc,
    ico,
    polygonCentroidV1,
    prepareAssistantLotStatusPromptV1,
    prepareAssistantMapAreaPromptV1,
    projectCanonicalLotTraceToMasterplanOverlayUvV1,
  });
  installAdminStandaloneAerialV5380(MapScene, {
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1,
    ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
    ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
    ADMIN_REFERENCE_AERIAL_VERSION_V1,
    ADMIN_STANDALONE_MODEL_ALIGNMENT_V1,
    ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1,
    ADMIN_STANDALONE_MODEL_STREET_DROP_V1,
    ADMIN_STANDALONE_MODEL_TURN_DEG_V1,
    MODEL_EXTRA_Y_ROTATION_DEG,
    SCENE_MAP_Z,
    buildAdminReferenceAerialRasterMaskModelV1,
    runtimeRouteV1,
  });
  installAdminReferenceAerialSceneV1(MapScene, {
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1,
    ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1,
    ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
    SCENE_MAP_Z,
    document,
  });
  installMapThreeInitializationV1(MapScene, {
    MAP_CAMERA_VIEW,
    MAP_GEOREFERENCE_FALLBACK,
    SCENE_MAP_Z,
    SCENE_MODEL_BASE_Z,
    TILT_DRAG_SENSITIVITY,
    ZOOM_DRAG_SENSITIVITY,
    appStore,
    solarStateForHour,
    document,
    window,
  });
  installAdminMasterplanAdjustmentV1(MapScene, {
    document,
    getComputedStyle,
    localStorage,
    window,
  });
  installAdminMasterplanOverlayV1(MapScene, {
    artwork: MASTERPLAN_PDF_ARTWORK_V3,
    defaultFrame: ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
    masterplanPdfImageRect: masterplanPdfImageRectV3,
    document,
    localStorage,
    ResizeObserver,
  });
  installMapModelGpuEnrichmentV5367(MapScene, {
    PUBLIC_SOCIAL_GREEN_LIFT_V1,
    appStore,
    publishMapPreview,
    syncCompactMapMirrors,
    browser: globalThis,
  });
  installAdminPdfMasterplanPipelineV1(MapScene, {
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_VERSION_V1,
    ADMIN_SEMANTIC_3D_LAYER_VERSION_V1,
    DWG_PLAN_HEADING_DEG,
    DWG_PLAN_HEADING_RAD,
    MODEL_VERTICAL_EXAGGERATION,
    PDF_MASTERPLAN_MODEL_TEXTURE_VERSION,
    PDF_MASTERPLAN_PAGE_SIZE_V1,
    PDF_MASTERPLAN_SITE_FRAME_V1,
    PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1,
    PDF_MASTERPLAN_VEHICLE_ANCHORS_V1,
    PDF_MODEL_TEXTURE_BRIGHTNESS,
    SCENE_MODEL_BASE_Z,
    loadGlbWithClientCacheV14,
    runtimeRouteV1,
    browser: globalThis,
  });
  return {
    prepareAssistantLotStatusPromptV1,
    prepareAssistantMapAreaPromptV1,
  };
}
