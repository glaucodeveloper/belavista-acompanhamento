import test from "node:test";
import assert from "node:assert/strict";
import {
  MAP_MOBILE_ASSETS_V1,
  isMapMobileAssetProfileV1,
  mapMasterplanArtworkSourceV1,
  mapStaticCaptureSourceV1,
} from "../../components/map/map-asset-profile-v1.mjs";

const browser = ({ width = 1280, userAgent = "Desktop", native = false } = {}) => ({
  matchMedia: () => ({ matches: width <= 900 }),
  navigator: { userAgent },
  Capacitor: {
    isNativePlatform: () => native,
    getPlatform: () => native ? "android" : "web",
  },
});

test("mobile map profile selects reduced rasters; desktop retains source artwork", () => {
  const mobile = browser({ width: 412, userAgent: "Android Mobile" });
  const desktop = browser();
  const element = {
    getAttribute: (name) => name === "data-public-static-capture" ? "/custom/full-resolution.png" : null,
  };

  assert.equal(isMapMobileAssetProfileV1(mobile), true);
  assert.equal(isMapMobileAssetProfileV1(desktop), false);
  assert.equal(mapStaticCaptureSourceV1(element, { generatedAsset: "/generated.png", browser: mobile }), MAP_MOBILE_ASSETS_V1.satellite);
  assert.equal(mapStaticCaptureSourceV1(element, { generatedAsset: "/generated.png", browser: desktop }), "/custom/full-resolution.png");
  assert.equal(mapMasterplanArtworkSourceV1({ artworkUrl: "/full-overlay.webp", browser: mobile }), MAP_MOBILE_ASSETS_V1.masterplan);
  assert.equal(mapMasterplanArtworkSourceV1({ artworkUrl: "/full-overlay.webp", browser: desktop }), "/full-overlay.webp");
});

test("native Capacitor selects mobile rasters even when its viewport is wide", () => {
  const native = browser({ width: 1100, native: true });
  assert.equal(isMapMobileAssetProfileV1(native), true);
  assert.equal(mapStaticCaptureSourceV1(null, { generatedAsset: "/generated.png", browser: native }), MAP_MOBILE_ASSETS_V1.satellite);
});

test("public leads map uses its established desktop overlay and reduced mobile derivative", () => {
  assert.equal(
    mapMasterplanArtworkSourceV1({ artworkUrl: "/full-overlay.webp", isPublicLeadsPage: true, browser: browser({ width: 412, userAgent: "Android Mobile" }) }),
    MAP_MOBILE_ASSETS_V1.masterplan,
  );
  assert.equal(
    mapMasterplanArtworkSourceV1({ artworkUrl: "/full-overlay.webp", isPublicLeadsPage: true, browser: browser() }),
    MAP_MOBILE_ASSETS_V1.publicMasterplan,
  );
});
