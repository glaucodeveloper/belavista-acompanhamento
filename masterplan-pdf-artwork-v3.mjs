// Compatibility exports. Artwork constants and crop projection live in the TS program.
import { atlasAdminMasterplanArtworkV3, projectAtlasMasterplanPdfImageRectV3 } from "./dist/frontend/program.js";

export const MASTERPLAN_PDF_ARTWORK_V3 = Object.freeze({
  ...atlasAdminMasterplanArtworkV3,
  crop: Object.freeze({ ...atlasAdminMasterplanArtworkV3.crop }),
});

export function masterplanPdfImageRectV3(width, height) {
  return projectAtlasMasterplanPdfImageRectV3(width, height);
}
