import { createCsvDownloaderV1 as createCsvDownloaderLegacyV1 } from "./csv-download-legacy-v1.mjs?v=csv-download-recovery-v1";

/** MJS compatibility bridge; the active application injects the program owner. */
export const createCsvDownloaderV1 = (dependencies = {}) => {
  const { createAtlasCsvDownloaderV1, ...browserServices } = dependencies;
  if (typeof createAtlasCsvDownloaderV1 === "function")
    return createAtlasCsvDownloaderV1(browserServices);
  return createCsvDownloaderLegacyV1(browserServices);
};
