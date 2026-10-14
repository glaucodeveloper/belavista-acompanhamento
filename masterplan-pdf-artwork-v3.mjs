// Registration measured against the previous raster (132 SIFT inliers).
// Keep its calibrated coordinate system: the new PDF crop extends beyond
// that canvas rather than shrinking/moving parcels to fit a new rectangle.
export const MASTERPLAN_PDF_ARTWORK_V3 = Object.freeze({
  url: '/assets/public/alianca-park-masterplan-lot-overlay-v3.webp',
  legacyWidth: 2886,
  legacyHeight: 3468,
  sourceScale: 0.512,
  sourceOffsetX: -426.5,
  sourceOffsetY: -242,
  crop: Object.freeze({ left: 800, top: 400, width: 5840, height: 7360 }),
});

export function masterplanPdfImageRectV3(width, height) {
  const a = MASTERPLAN_PDF_ARTWORK_V3;
  const scale = Math.min(width / a.legacyWidth, height / a.legacyHeight);
  return {
    left: (width - a.legacyWidth * scale) / 2 + (a.crop.left * a.sourceScale + a.sourceOffsetX) * scale,
    top: (height - a.legacyHeight * scale) / 2 + (a.crop.top * a.sourceScale + a.sourceOffsetY) * scale,
    width: a.crop.width * a.sourceScale * scale,
    height: a.crop.height * a.sourceScale * scale,
  };
}
