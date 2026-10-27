/** Select map rasters sized for the current mobile viewport. */
import mapAssetProfileData from "../../frontend/src/data/map-asset-profile.json" with { type: "json" };

export const MAP_MOBILE_ASSETS_V1 = Object.freeze({ ...mapAssetProfileData });

export const isMapMobileAssetProfileV1 = (browser = globalThis) => {
  const nativeCapacitor = browser.Capacitor;
  if (nativeCapacitor?.isNativePlatform?.()) return true;
  if (nativeCapacitor?.getPlatform?.() === "android" || nativeCapacitor?.getPlatform?.() === "ios") return true;
  if (browser.matchMedia?.("(max-width: 900px)").matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(browser.navigator?.userAgent || "");
};

export const mapStaticCaptureSourceV1 = (element, {
  generatedAsset,
  browser = globalThis,
} = {}) => {
  if (isMapMobileAssetProfileV1(browser))
    return element?.getAttribute("data-mobile-static-capture") || MAP_MOBILE_ASSETS_V1.satellite;
  return element?.getAttribute("data-public-static-capture") || generatedAsset;
};

export const mapMasterplanArtworkSourceV1 = ({
  artworkUrl,
  detailZoom = false,
  browser = globalThis,
} = {}) => {
  const mobile = isMapMobileAssetProfileV1(browser);
  // Begin with a smaller image on mobile, then promote it to the same original
  // PDF raster used by desktop when the viewer enters detail zoom.
  if (detailZoom) return MAP_MOBILE_ASSETS_V1.publicMasterplan || artworkUrl;
  return mobile ? MAP_MOBILE_ASSETS_V1.masterplan : MAP_MOBILE_ASSETS_V1.publicMasterplan || artworkUrl;
};
