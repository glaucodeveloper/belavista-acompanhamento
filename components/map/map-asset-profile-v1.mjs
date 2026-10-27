import * as atlasMapComponentsTsV1 from "../../dist/frontend/components.js";
import * as legacyMapAssetProfileV1 from "./map-asset-profile-legacy-v1.mjs?v=map-asset-profile-recovery-v1";

/** Keep the mobile raster catalog and viewport policy under the TypeScript component owner. */
export const MAP_MOBILE_ASSETS_V1 = atlasMapComponentsTsV1.MAP_MOBILE_ASSETS_V1
  || legacyMapAssetProfileV1.MAP_MOBILE_ASSETS_V1;

export const isMapMobileAssetProfileV1 = (browser = globalThis) =>
  typeof atlasMapComponentsTsV1.isMapMobileAssetProfileV1 === "function"
    ? atlasMapComponentsTsV1.isMapMobileAssetProfileV1(browser)
    : legacyMapAssetProfileV1.isMapMobileAssetProfileV1(browser);

export const mapStaticCaptureSourceV1 = (element, options = {}) =>
  typeof atlasMapComponentsTsV1.mapStaticCaptureSourceV1 === "function"
    ? atlasMapComponentsTsV1.mapStaticCaptureSourceV1(element, options)
    : legacyMapAssetProfileV1.mapStaticCaptureSourceV1(element, options);

export const mapMasterplanArtworkSourceV1 = options =>
  typeof atlasMapComponentsTsV1.mapMasterplanArtworkSourceV1 === "function"
    ? atlasMapComponentsTsV1.mapMasterplanArtworkSourceV1(options)
    : legacyMapAssetProfileV1.mapMasterplanArtworkSourceV1(options);
