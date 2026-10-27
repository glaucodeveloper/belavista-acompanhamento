import { createSatelliteLotProjectionV1 as createLegacySatelliteLotProjectionV1 } from "./satellite-lot-projection-legacy-v1.mjs?v=ts-public-satellite-lot-projection-recovery-v1";

/** Compatibility adapter; program.ts owns the PDF/DWG lot geometry projection. */
export const createSatelliteLotProjectionV1 = input => {
  const typedOwner = globalThis.belavistaProjectPublicSatelliteLots;
  if (typeof typedOwner === "function") {
    return typedOwner({
      traceLots: input?.trace?.lots || {},
      imageSize: input?.imageSize || [1672, 941],
      fallbackLots: input?.lots || {},
      masterplanPolygonAsset: input?.masterplanPolygonAsset,
      pdfLotLabelsAsset: input?.pdfLotLabelsAsset,
      pdfLotGreenMappingAsset: input?.pdfLotGreenMappingAsset,
      hasMasterplanOverlay: Boolean(input?.hasMasterplanOverlay),
      invalidLotIds: [...(input?.invalidLotIds || [])],
      geometryRepairLotIds: [...(input?.geometryRepairLotIds || [])],
      commonAreaSourceIds: [...(input?.commonAreaSourceIds || [])],
    });
  }
  return createLegacySatelliteLotProjectionV1(input);
};
