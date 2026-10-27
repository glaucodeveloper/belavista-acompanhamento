import { runtimeRouteV1 } from "../shared/routing.mjs";
import * as atlasComponentsTsV1 from "../../dist/frontend/components.js";
import * as atlasProgramTsV1 from "../../dist/frontend/program.js";
import * as legacyGeoreferenceV1 from "./georeference-legacy-v1.mjs?v=georeference-recovery-v1";

let bindings = null;
try {
  const createBindings = atlasComponentsTsV1.createAtlasMapGeoreferenceBindingsV1;
  if (typeof createBindings === "function" && typeof atlasProgramTsV1.projectAdminMapGeoreferenceConfigV1 === "function") {
    bindings = createBindings({
      configuration: atlasProgramTsV1.projectAdminMapGeoreferenceConfigV1(),
      runtimeRouteV1,
      ports: {
        publicMapPolygonCentroid: atlasProgramTsV1.publicMapPolygonCentroid,
        projectPublicCanonicalLotTrace: atlasProgramTsV1.projectPublicCanonicalLotTrace,
        projectPublicAdminUtmToUv: atlasProgramTsV1.projectPublicAdminUtmToUv,
        loadAdminDwgGeoreference: atlasProgramTsV1.loadAdminDwgGeoreferenceV1,
        applyAdminReferenceAerialImageTrace: atlasProgramTsV1.applyAdminReferenceAerialImageTraceV1,
        applyAdminReferenceAerialResidualWarp: atlasProgramTsV1.applyAdminReferenceAerialResidualWarpV2,
        pointInsideAdminReferenceAerialQuad: atlasProgramTsV1.pointInsideAdminReferenceAerialQuadV1,
        buildAdminReferenceAerialRasterMaskModel: atlasComponentsTsV1.buildAdminReferenceAerialRasterMaskModelV1,
        appendAdminReferenceAerialCurbPath: atlasComponentsTsV1.appendAdminReferenceAerialCurbPathV1,
        createAdminReferenceAerialBezierCurbGuides: atlasComponentsTsV1.createAdminReferenceAerialBezierCurbGuidesV1,
        createAdminReferenceAerialRoadPlaneGeometry: atlasComponentsTsV1.createAdminReferenceAerialRoadPlaneGeometryV1,
        createAdminReferenceAerialNativeRoadGeometry: atlasComponentsTsV1.createAdminReferenceAerialNativeRoadGeometryV1,
        warpAdminGlbToFixedAerial: atlasComponentsTsV1.warpAdminGlbToFixedAerialV1,
      },
    });
  }
} catch (error) {
  globalThis.console?.warn?.("[Aliança Park] TypeScript georeference bindings unavailable; keeping MJS recovery.", error);
}

const value = (name) => bindings?.[name] ?? legacyGeoreferenceV1[name];

export const DWG_GEOREFERENCE_URL = value("DWG_GEOREFERENCE_URL");
export const PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1 = value("PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1");
export const polygonCentroidV1 = value("polygonCentroidV1");
export const projectCanonicalLotTraceToMasterplanOverlayUvV1 = value("projectCanonicalLotTraceToMasterplanOverlayUvV1");
export const ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1 = value("ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1");
export const ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 = value("ADMIN_MASTERPLAN_SATELLITE_FRAME_V1");
export const INVALID_MASTERPLAN_LOT_IDS_V1 = value("INVALID_MASTERPLAN_LOT_IDS_V1");
export const MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1 = value("MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1");
export const MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1 = value("MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1");
export const MASTERPLAN_COMMON_AREA_LABEL_V1 = value("MASTERPLAN_COMMON_AREA_LABEL_V1");
export const ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1 = value("ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1");
export const ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1 = value("ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1");
export const ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2 = value("ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2");
export const PDF_LOT_LABELS_URL_V1 = value("PDF_LOT_LABELS_URL_V1");
export const PDF_LOT_GREEN_MAPPING_URL_V1 = value("PDF_LOT_GREEN_MAPPING_URL_V1");
export const CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1 = value("CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1");
export const ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1 = value("ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1");
export const ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1 = value("ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1");
export const buildAdminReferenceAerialRasterMaskModelV1 = value("buildAdminReferenceAerialRasterMaskModelV1");
export const loadAdminDwgGeoreferenceV1 = value("loadAdminDwgGeoreferenceV1");
export const appendAdminReferenceAerialCurbPathV1 = value("appendAdminReferenceAerialCurbPathV1");
export const createAdminReferenceAerialBezierCurbGuidesV1 = value("createAdminReferenceAerialBezierCurbGuidesV1");
export const createAdminReferenceAerialRoadPlaneGeometryV1 = value("createAdminReferenceAerialRoadPlaneGeometryV1");
export const createAdminReferenceAerialNativeRoadGeometryV1 = value("createAdminReferenceAerialNativeRoadGeometryV1");
export const warpAdminGlbToFixedAerialV1 = value("warpAdminGlbToFixedAerialV1");
export const PDF_MASTERPLAN_MODEL_TEXTURE_VERSION = value("PDF_MASTERPLAN_MODEL_TEXTURE_VERSION");
export const PDF_MODEL_TEXTURE_BRIGHTNESS = value("PDF_MODEL_TEXTURE_BRIGHTNESS");
export const ADMIN_REFERENCE_AERIAL_ASSET_V1 = value("ADMIN_REFERENCE_AERIAL_ASSET_V1");
export const ADMIN_AERIAL_ZOOM_TILE_ROOT_V1 = value("ADMIN_AERIAL_ZOOM_TILE_ROOT_V1");
export const ADMIN_AERIAL_ZOOM_TILE_GRID_V1 = value("ADMIN_AERIAL_ZOOM_TILE_GRID_V1");
export const ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1 = value("ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1");
export const ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2 = value("ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2");
export const ADMIN_AERIAL_TILE_SWAP_RATIO_V2 = value("ADMIN_AERIAL_TILE_SWAP_RATIO_V2");
export const ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1 = value("ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1");
export const ADMIN_REFERENCE_AERIAL_VERSION_V1 = value("ADMIN_REFERENCE_AERIAL_VERSION_V1");
export const ADMIN_SEMANTIC_3D_LAYER_VERSION_V1 = value("ADMIN_SEMANTIC_3D_LAYER_VERSION_V1");
export const ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1 = value("ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1");
export const ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1 = value("ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1");
export const ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1 = value("ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1");
export const ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2 = value("ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2");
export const ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2 = value("ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2");
export const ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1 = value("ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1");
export const ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1 = value("ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1");
export const PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1 = value("PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1");
export const PDF_MASTERPLAN_PAGE_SIZE_V1 = value("PDF_MASTERPLAN_PAGE_SIZE_V1");
export const PDF_MASTERPLAN_SITE_FRAME_V1 = value("PDF_MASTERPLAN_SITE_FRAME_V1");
export const PDF_MASTERPLAN_VEHICLE_ANCHORS_V1 = value("PDF_MASTERPLAN_VEHICLE_ANCHORS_V1");
