// MapScene feature composition; behavior stays in the focused map modules.
import { MASTERPLAN_PDF_ARTWORK_V3, masterplanPdfImageRectV3 } from "../../masterplan-pdf-artwork-v3.mjs?v=ts-admin-masterplan-artwork-v1";
import { renderMapPdfLegends, ensureMapPdfLegendStyles } from "../../map-pdf-legends-v1.mjs?v=1";
import { esc, ico, notify } from "../shared/dom.mjs";
import { mapMasterplanArtworkSourceV1 } from "./map-asset-profile-v1.mjs?v=pdf-map-assets-v3&ts-map-asset-profile-owner-v1";
import { runtimeRouteV1 } from "../shared/routing.mjs";
import { createCompactMapCoordinatorV1 } from "./compact-map-coordinator-v1.mjs?v=ts-compact-map-coordinator-owner-v1";
import { createScenePresentationConfigV1 } from "./scene-presentation-config-v1.mjs?v=ts-scene-presentation-config-v1&ts-map-coordinate-policy-v1";
import { createMapTileSourceCatalogV1 } from "./map-tile-source-catalog-v1.mjs?v=ts-map-tile-source-catalog-owner-v1";
import { installAdminMapSyncDevtoolsV1 } from "./admin-map-sync-devtools-v1.mjs?v=admin-map-sync-devtools-v1";
import { createMapAssistantContextActionsV1 } from "./map-assistant-context-actions-v1.mjs?v=ts-map-assistant-context-actions-owner-v1";
import mapSelectionOptionsData from "../../frontend/src/data/map-selection-options.json" with { type: "json" };
import {
  installAtlasMapSceneRuntimeCompositionV1,
  resolveAtlasDashboardMapHighlightRuleV1,
  projectAtlasDashboardMapLotStatusV1,
  projectAtlasDashboardMapHighlightColorV1,
  projectAtlasMapSceneContextPresentationV1,
  projectAtlasMapContextStageNameV1,
  projectAtlasAdminPdfMasterplanPageFrameV1,
  projectAtlasAdminReferenceAerialFrameV1,
  projectAtlasAdminPdfElementKindV1,
  projectAtlasAdminPdfLotNumberV1,
  projectAtlasAdminPdfLotIntegrationV1,
  projectAtlasAdminPdfElementImageAnchorV1,
  isAtlasMapGeoPointValidV1,
} from "../../dist/frontend/program.js";
import * as atlasMapComponentsTsV1 from "../../dist/frontend/components.js";
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
  ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1,
  ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1,
  ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2,
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
} from "./georeference.mjs?v=admin-map-georeference-v2-map-projection-json&pdf-yellow-circles-v4&ts-map-projection-math-v1&ts-admin-map-georeference-config-v1&ts-admin-dwg-georeference-loader-v1";
import {
  MAP_GEOREFERENCE_FALLBACK,
  localClockHourForGeo,
  solarWindowForGeo,
  solarHourLabel,
  solarStateForHour,
} from "./solar-lighting.mjs?v=ts-solar-lighting-v1";
import { createSatelliteLotProjectionV1 } from "./satellite-lot-projection-v1.mjs?v=ts-public-satellite-lot-projection-owner-v1";
import { installAdminMasterplanAdjustmentLegacyV1 as installAdminMasterplanAdjustmentV1 } from "./admin-masterplan-adjustment-v1.mjs?v=admin-masterplan-adjustment-v8-ts-devtools-owner&ts-map-pure-admin-map-fallbacks-v1";
import { installAdminPdfMasterplanPipelineV1 } from "./admin-pdf-masterplan-pipeline-legacy-v1.mjs?v=admin-pdf-masterplan-pipeline-recovery-v1";
import { installAtlasMapModelPicking, installAtlasMapLotSelectionUi, installAtlasMapSelection, installAtlasMapSceneControls, installAtlasMapTileModeController, installAtlasStaticSatelliteGestures, installAtlasPublicTerrainEnvironmentV1 } from "../../dist/frontend/components.js";
import { ROAD_HALF_LOT_SLICE_WORLD_V1, roadPlanarAngleV1 } from "./road-geometry-math-v1.mjs?v=road-geometry-math-v1";
import {
  blendStageOverlayColorV1,
  normalizeStageOverlayKeysV1,
  stageOverlayColors,
  stageOverlayKey,
  stageOverlayLabelV1,
  stageOverlayLabels,
} from "./stage-overlays.mjs?v=ts-stage-overlay-catalog-owner-v1";
import {
  appStore,
  demoData,
  viewThemes,
  activityCatalog,
} from "../../state.js?v=system-metrics-v1-20260919&ts-state-catalogs-program-owner-v1&ts-runtime-state-bootstrap-owner-v1";

const loadGlbWithClientCacheV14 = atlasMapComponentsTsV1.loadAtlasMapGlbWithClientCacheV1;
if (typeof loadGlbWithClientCacheV14 !== "function") {
  throw new TypeError("Map asset composition requires its TypeScript GLB cache.");
}

export function installMapSceneCompositionV1(MapScene, dependencies) {
  const {
    dashboardFilterForModeV1,
    dashboardModeKeyV1,
    REPASSE_PRICE_CATALOG = [],
  } = dependencies;
  const validGeoPoint = isAtlasMapGeoPointValidV1;
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
  const { DEFAULT_SCENE_ZOOM, INITIAL_SCENE_ZOOM, MIN_SCENE_ZOOM, MAX_SCENE_ZOOM, MIN_SCENE_TILT, MAX_SCENE_TILT, SCENE_TILT_ADJUST_LIMIT, SCENE_TILT_ANIMATION_DURATION_MS, SCENE_TILT_ZOOM_OUT_FACTOR, TILT_DRAG_SENSITIVITY, ZOOM_DRAG_SENSITIVITY, DEFAULT_TILT_BOOST, DASHBOARD_TILT_BOOST, SCENE_SURFACE_SCALE, PUBLIC_SATELLITE_VERTICAL_COVERAGE, MODEL_FIT_RATIO, MODEL_PUBLIC_FIT_RATIO, MODEL_VERTICAL_EXAGGERATION, PUBLIC_SOCIAL_GREEN_LIFT_V1, SCENE_MAP_Z, SCENE_MODEL_BASE_Z, SCENE_VIEWPORT_COVERAGE, SCENE_PAN_SAFETY, SCENE_PUBLIC_PAN_SAFETY, ADMIN_GEO_MODEL_FINE_ROTATION_DEG, ADMIN_GEO_MODEL_FINE_SHIFT_X, ADMIN_GEO_MODEL_FINE_SHIFT_Y, DASHBOARD_PAN_SAFETY, MAP_TILE_OVERSCAN, MAP_RASTER_MAX, MAP_SCENE_STATE_VERSION, STAGE_FILTER_TRANSITION_MS, MAP_CAMERA_VIEW, DASHBOARD_INITIAL_SCENE_ZOOM, ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM, ADMIN_REFERENCE_AERIAL_VIEW_VERSION, DASHBOARD_PAN_BOUNDING_SCREEN_RATIO, GENERATED_AERIAL_ASSET, GENERATED_AERIAL_VERSION, DWG_SATELLITE_MOSAIC_ZOOM, DWG_SATELLITE_MOSAIC_TILE_SIZE, DWG_SATELLITE_MOSAIC_TILE_X0, DWG_SATELLITE_MOSAIC_TILE_Y0, DWG_SATELLITE_MOSAIC_TILES, DWG_PLAN_HEADING_RAD, DWG_PLAN_HEADING_DEG, PUBLIC_MODEL_NORTH_ROTATION_DEG, PUBLIC_MODEL_NORTH_ROTATION_RAD, MODEL_EXTRA_Y_ROTATION_DEG, MODEL_EXTRA_Y_ROTATION_RAD, ADMIN_FIXED_MAP_ROTATION_DEG, ADMIN_FIXED_MAP_ROTATION_RAD, ADMIN_PDF_DISPLAY_Y_ROTATION_DEG, ADMIN_PDF_DISPLAY_Y_ROTATION_RAD, ADMIN_MODEL_CALIBRATION_DEFAULTS_V1, ADMIN_MODEL_CALIBRATION_V1, ADMIN_MODEL_CALIBRATION_INITIAL_V1, ADMIN_STANDALONE_MODEL_TURN_DEG_V1, ADMIN_STANDALONE_MODEL_STREET_DROP_V1, ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1, ADMIN_STANDALONE_BASE_TILT_DEG_V1, ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10, ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10, ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12, ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12, ADMIN_STANDALONE_MODEL_ALIGNMENT_V1, sceneTiltBoostForView, readAdminModelCalibrationV1 } = scenePresentationConfigV1;
  installAdminMapSyncDevtoolsV1({
    calibration: ADMIN_MODEL_CALIBRATION_V1,
    initialCalibration: ADMIN_MODEL_CALIBRATION_INITIAL_V1,
    host: globalThis,
  });
  const mapTileSources = createMapTileSourceCatalogV1({
    runtimeRouteV1,
    generatedAerialAsset: GENERATED_AERIAL_ASSET,
    generatedAerialVersion: GENERATED_AERIAL_VERSION,
  });
  const progressNatureOptions = mapSelectionOptionsData.progressNatureOptions;
  const mapAssistantContextActionsV1 = createMapAssistantContextActionsV1({
    host: globalThis,
    documentRef: globalThis.document,
    commonAreaLabel: MASTERPLAN_COMMON_AREA_LABEL_V1,
    loadWorkerContextChat: () =>
      import("../../worker-context-chat.mjs?v=worker-chat-lot-development-v1&ts-settings-ai-agenda-v1&ts-worker-context-chat-inference-v1&ts-worker-chat-observation-controller-v1&ts-worker-chat-submit-orchestration-v1&ts-worker-chat-voice-program-v1&ts-worker-chat-response-persistence-v1&ts-worker-chat-record-review-v1&ts-worker-chat-map-context-ts-owner-v1&ts-worker-chat-tab-state-ts-owner-v1&ts-worker-chat-attachment-renderer-owner-v1&ts-worker-chat-record-drawer-owner-v1&ts-worker-chat-quick-actions-owner-v1&ts-worker-chat-record-saved-event-owner-v1&ts-worker-chat-pending-state-owner-v1&ts-worker-chat-attachment-removal-owner-v1&worker-chat-visual-clarification-ts-owner-v1&ts-chat-component-controller-v1&ts-chat-component-actions-v1&ts-chat-component-shell-mount-v1&ts-chat-composer-state-component-v1&ts-chat-conversation-state-component-v1"),
  });
  const {
    prepareAssistantLotStatusPromptV1,
    prepareAssistantMapAreaPromptV1,
  } = mapAssistantContextActionsV1;

  const foundationComposition = {
    scene: MapScene,
    config: scenePresentationConfigV1,
    appStore,
    demoData,
    viewThemes,
    compactMapMirrors,
    setSharedMapScene,
    stageOverlayKey,
    stageOverlayLabels,
    validGeoPoint,
    georeference: {
      url: DWG_GEOREFERENCE_URL,
      fallback: MAP_GEOREFERENCE_FALLBACK,
    },
    aerialFrame: {
      geoQuad: ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1,
      siteFrameV1: ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1,
      siteFrameV2: ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2,
    },
    solar: {
      localClockHourForGeo,
      solarHourLabel,
      solarStateForHour,
      solarWindowForGeo,
    },
    services: { esc, ico, notify },
    environment: {
      CustomEvent,
      console,
      document,
      Image,
      getComputedStyle,
      globalRef: globalThis,
      leaflet: globalThis.L,
      performance,
      ResizeObserver: window.ResizeObserver,
      window,
    },
    owners: {
      referenceAerialFrame: {
        typed: atlasMapComponentsTsV1.installAtlasMapSceneAerialFrame,
      },
      startupReadiness: {
        typed: atlasMapComponentsTsV1.installAtlasMapSceneStartupReadiness,
      },
      cleanup: {
        typed: atlasMapComponentsTsV1.installAtlasMapSceneCleanup,
      },
      connection: {
        typed: atlasMapComponentsTsV1.installAtlasMapSceneConnection,
      },
      leaflet: {
        typed: atlasMapComponentsTsV1.installAtlasLeafletMapScene,
      },
      dwgGeoreference: {
        typed: atlasMapComponentsTsV1.installAtlasMapDwgGeoreferenceControllerV1,
      },
      geometryOverlays: {
        typed: atlasMapComponentsTsV1.installAtlasMapSceneGeometryOverlays,
      },
      loadingScreen: {
        typed: atlasMapComponentsTsV1.installAtlasMapLoadingScreen,
      },
      surfacePolicy: {
        typed: atlasMapComponentsTsV1.installAtlasMapSceneSurfacePolicy,
      },
      publicLotStatus: {
        typed: atlasMapComponentsTsV1.installAtlasPublicLotStatusController,
      },
      solarLighting: {
        typed: atlasMapComponentsTsV1.installAtlasMapSolarLighting,
      },
    },
  };
  const interactionComposition = {
    scene: MapScene,
    config: scenePresentationConfigV1,
    appStore,
    demoData,
    activityCatalog,
    viewThemes,
    progressNatureOptions,
    compactMapMirrors,
    getSharedMapScene,
    syncCompactMapMirrors,
    publishMapPreview,
    stageOverlayKey,
    stageOverlayLabels,
    stageOverlayColors,
    normalizeStageOverlayKeysV1,
    blendStageOverlayColorV1,
    stageOverlayLabelV1,
    ensureMapPdfLegendStyles,
    renderMapPdfLegends,
    esc,
    ico,
    notify,
    masterplanSatelliteFrame: ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
    environment: {
      performance,
      window,
      document,
      getComputedStyle,
      setTimeout: window.setTimeout.bind(window),
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      FormData,
    },
    owners: {
      navigation: atlasMapComponentsTsV1.installAtlasMapSceneNavigationV1,
      tilt: atlasMapComponentsTsV1.installAtlasMapSceneTiltController,
      contextLifecycle: atlasMapComponentsTsV1.installAtlasMapSceneContextLifecycle,
      zoomPolicy: atlasMapComponentsTsV1.installAtlasMapSceneZoomPolicy,
      statePersistence: atlasMapComponentsTsV1.installAtlasMapSceneViewPersistence,
      cameraFraming: atlasMapComponentsTsV1.installAtlasMapSceneCameraFraming,
      pdfInterface: atlasMapComponentsTsV1.installAtlasMapPdfInterfaceV1,
      sceneControls: installAtlasMapSceneControls,
      tileMode: installAtlasMapTileModeController,
      staticSatelliteGestures: installAtlasStaticSatelliteGestures,
      compactMapRenderer: atlasMapComponentsTsV1.installAtlasCompactMapRendererV1,
      compactMap: atlasMapComponentsTsV1.installAtlasCompactMapV1,
      modelPicking: installAtlasMapModelPicking,
      lotSelectionUi: installAtlasMapLotSelectionUi,
      selection: installAtlasMapSelection,
    },
  };
  const assetComposition = {
    scene: MapScene,
    config: scenePresentationConfigV1,
    appStore,
    demoData,
    activityCatalog,
    viewThemes,
    mapTileSources,
    mapGeoreferenceFallback: MAP_GEOREFERENCE_FALLBACK,
    compactMapMirrors,
    getSharedMapScene,
    publishMapPreview,
    syncCompactMapMirrors,
    dashboardModeKeyV1,
    dashboardFilterForModeV1: (...args) => dashboardFilterForModeV1(...args),
    assets: {
      ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2,
      ADMIN_AERIAL_TILE_SWAP_RATIO_V2,
      ADMIN_AERIAL_ZOOM_TILE_GRID_V1,
      ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1,
      ADMIN_AERIAL_ZOOM_TILE_ROOT_V1,
      ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2,
      ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
      ADMIN_REFERENCE_AERIAL_ASSET_V1,
      ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1,
      ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1,
      ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1,
      ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1,
      ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1,
      ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
      ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1,
      ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1,
      ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
      ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
      ADMIN_REFERENCE_AERIAL_VERSION_V1,
      ADMIN_SEMANTIC_3D_LAYER_VERSION_V1,
      CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1,
      DWG_GEOREFERENCE_URL,
      INVALID_MASTERPLAN_LOT_IDS_V1,
      MASTERPLAN_COMMON_AREA_LABEL_V1,
      MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1,
      MASTERPLAN_PDF_ARTWORK_V3,
      MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1,
      PDF_LOT_GREEN_MAPPING_URL_V1,
      PDF_LOT_LABELS_URL_V1,
      PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1,
      PDF_MASTERPLAN_MODEL_TEXTURE_VERSION,
      PDF_MASTERPLAN_PAGE_SIZE_V1,
      PDF_MASTERPLAN_SITE_FRAME_V1,
      PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1,
      PDF_MASTERPLAN_VEHICLE_ANCHORS_V1,
      PDF_MODEL_TEXTURE_BRIGHTNESS,
      REPASSE_PRICE_CATALOG,
      ROAD_HALF_LOT_SLICE_WORLD_V1,
    },
    helpers: {
      appendAdminReferenceAerialCurbPathV1,
      blendStageOverlayColorV1,
      buildAdminReferenceAerialRasterMaskModelV1,
      createAdminReferenceAerialBezierCurbGuidesV1,
      createAdminReferenceAerialNativeRoadGeometryV1,
      createAdminReferenceAerialRoadPlaneGeometryV1,
      createSatelliteLotProjectionV1,
      loadAdminDwgGeoreferenceV1,
      loadGlbWithClientCacheV14,
      masterplanPdfImageRectV3,
      mapMasterplanArtworkSourceV1,
      normalizeStageOverlayKeysV1,
      notify,
      polygonCentroidV1,
      prepareAssistantLotStatusPromptV1,
      prepareAssistantMapAreaPromptV1,
      projectAtlasDashboardMapHighlightColorV1,
      projectAtlasDashboardMapLotStatusV1,
      projectAtlasAdminPdfMasterplanPageFrameV1,
      projectAtlasAdminReferenceAerialFrameV1,
      projectAtlasAdminPdfElementKindV1,
      projectAtlasAdminPdfLotNumberV1,
      projectAtlasAdminPdfLotIntegrationV1,
      projectAtlasAdminPdfElementImageAnchorV1,
      projectAtlasMapContextStageNameV1,
      projectAtlasMapSceneContextPresentationV1,
      projectCanonicalLotTraceToMasterplanOverlayUvV1,
      resolveAtlasDashboardMapHighlightRuleV1,
      roadPlanarAngleV1,
      runtimeRouteV1,
      solarStateForHour,
      stageOverlayLabelV1,
      warpAdminGlbToFixedAerialV1,
      esc,
      ico,
      importThree: () => import("three"),
      importGltfLoader: () => import("three/addons/loaders/GLTFLoader.js"),
    },
    environment: {
      Date,
      FormData,
      Image,
      ResizeObserver,
      console,
      document,
      getComputedStyle,
      globalRef: globalThis,
      leaflet: globalThis.L,
      localStorage,
      performance,
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      setTimeout: window.setTimeout.bind(window),
      window,
    },
    owners: {
      operationalRecordMap: { typed: atlasMapComponentsTsV1.installAtlasOperationalRecordMapV1 },
      adminStandaloneCamera: { typed: atlasMapComponentsTsV1.installAtlasAdminStandaloneCameraV1 },
      publicTerrain: { typed: installAtlasPublicTerrainEnvironmentV1 },
      surfaceMaterials: { typed: atlasMapComponentsTsV1.installAtlasSurfaceMaterialsV1 },
      publicModelPresentation: { typed: atlasMapComponentsTsV1.installAtlasPublicModelPresentationV1 },
      adminModelCalibration: { typed: atlasMapComponentsTsV1.installAtlasAdminModelCalibrationV1 },
      adminRoadGeometry: { typed: atlasMapComponentsTsV1.installAtlasAdminRoadGeometryV1 },
      publicRoadSurfacePolicy: { typed: atlasMapComponentsTsV1.installAtlasPublicRoadSurfacePolicyV1 },
      publicDwgGeoreference: { typed: atlasMapComponentsTsV1.installAtlasPublicDwgGeoreferenceV1 },
      rasterSurface: { typed: atlasMapComponentsTsV1.installAtlasMapRasterSurfaceV1 },
      sceneSync: { typed: atlasMapComponentsTsV1.installAtlasMapSceneSyncV1 },
      contextExtensions: {
        typed: (_scene, dependencies) => atlasMapComponentsTsV1.installAtlasMapSceneContextExtensionsV1(dependencies),
      },
      dashboardHighlight: {
        typed: atlasMapComponentsTsV1.installAtlasMapDashboardModeHighlightV1,
      },
      stageOverlay: {
        typed: atlasMapComponentsTsV1.installAtlasMapStageOverlayControllerV1,
      },
      contextPresentation: {
        typed: atlasMapComponentsTsV1.installAtlasMapSceneContextPresentationV1,
      },
      adminStandaloneStartup: { typed: atlasMapComponentsTsV1.installAtlasAdminStandaloneStartupV1 },
      satelliteLotPlanOverlay: { typed: atlasMapComponentsTsV1.installAtlasSatelliteLotPlanOverlayV1 },
      adminStandaloneAerial: { typed: atlasMapComponentsTsV1.installAtlasAdminStandaloneAerialV1 },
      adminReferenceAerialScene: { typed: atlasMapComponentsTsV1.installAtlasAdminReferenceAerialSceneV1 },
      threeInitialization: {
        typed: atlasMapComponentsTsV1.installAtlasMapThreeInitializationV1,
      },
      adminMasterplanAdjustment: {
        typed: atlasMapComponentsTsV1.installAtlasAdminMasterplanAdjustmentV1,
        legacy: installAdminMasterplanAdjustmentV1,
      },
      adminMasterplanOverlay: {
        typed: atlasMapComponentsTsV1.installAtlasAdminMasterplanOverlayV1,
      },
      modelGpuEnrichment: {
        typed: atlasMapComponentsTsV1.installAtlasMapMasterplanGpuEnrichmentV1,
      },
      pdfMasterplanPipeline: {
        typed: atlasMapComponentsTsV1.installAtlasAdminPdfMasterplanPipelineV1,
        legacy: installAdminPdfMasterplanPipelineV1,
      },
    },
  };
  installAtlasMapSceneRuntimeCompositionV1({
    foundation: foundationComposition,
    interaction: interactionComposition,
    assets: assetComposition,
  });
  return {
    prepareAssistantLotStatusPromptV1,
    prepareAssistantMapAreaPromptV1,
  };
}
