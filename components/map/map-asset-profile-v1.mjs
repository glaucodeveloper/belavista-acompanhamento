/** Select map rasters sized for the current mobile viewport. */
export const MAP_MOBILE_ASSETS_V1 = Object.freeze({
  satellite: "/assets/public/dwg-satellite-treated-mobile-v1.webp",
  masterplan: "/assets/public/alianca-park-masterplan-lot-overlay-mobile-v1.webp",
  publicMasterplan: "/assets/public/alianca-park-masterplan-lot-overlay-public-v1.webp",
});

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
  isPublicLeadsPage = false,
  browser = globalThis,
} = {}) => {
  const mobile = isMapMobileAssetProfileV1(browser);
  if (isPublicLeadsPage)
    return mobile ? MAP_MOBILE_ASSETS_V1.masterplan : MAP_MOBILE_ASSETS_V1.publicMasterplan;
  return mobile ? MAP_MOBILE_ASSETS_V1.masterplan : artworkUrl;
};
