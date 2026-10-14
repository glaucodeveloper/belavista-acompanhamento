import {
  ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1,
  ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1,
  ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2,
} from "./georeference.mjs?v=admin-map-georeference-v1";

/** Supplies the canonical aerial map frame shared by scene and masterplan services. */
export const installAdminReferenceAerialFrameV1 = (MapScene) => {
  MapScene.prototype.isAdminReferenceAerialV1 = function () {
    return Boolean(
      this.hasAttribute("data-admin-shared-public-map") &&
      this.adminReferenceAerialTextureV1?.image,
    );
  };

  MapScene.prototype.adminReferenceAerialFrameV1 = function () {
    if (
      !this._adminStandaloneWrapperV5370?.userData?.adminReferenceAerialGeoWarp
    ) {
      const frame = {
        ...ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1,
        ...ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2,
      };
      const siteWidth = Math.max(0.01, frame.right - frame.left),
        siteDepth = Math.max(0.01, frame.bottom - frame.top);
      return {
        ...frame,
        siteWidth,
        siteDepth,
        siteCenterU: (frame.left + frame.right) / 2,
        siteCenterV: (frame.top + frame.bottom) / 2,
        frame: "legacy user supplied aerial site window",
      };
    }
    // Envelope from the real UTM corners projected into the fixed aerial reference.
    const corners = Object.values(ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1),
      left = Math.min(...corners.map((point) => Number(point.u))),
      top = Math.min(...corners.map((point) => Number(point.v))),
      right = Math.max(...corners.map((point) => Number(point.u))),
      bottom = Math.max(...corners.map((point) => Number(point.v))),
      siteWidth = Math.max(0.01, right - left),
      siteDepth = Math.max(0.01, bottom - top);
    return {
      left,
      top,
      right,
      bottom,
      siteWidth,
      siteDepth,
      siteCenterU: (left + right) / 2,
      siteCenterV: (top + bottom) / 2,
      corners: ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1,
      frame: "DWG EPSG:31984 four-corner projection · fixed aerial homography",
    };
  };
  return MapScene;
};
