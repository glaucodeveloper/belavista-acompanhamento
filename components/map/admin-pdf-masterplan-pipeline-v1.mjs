import * as atlasAdminPdfComponentsTsV1 from "../../dist/frontend/components.js";
import { installAdminPdfMasterplanPipelineV1 as installAdminPdfMasterplanPipelineLegacyV1 } from "./admin-pdf-masterplan-pipeline-legacy-v1.mjs?v=admin-pdf-masterplan-pipeline-recovery-v1";

/** Compatibility adapter; components.ts owns the active PDF/GLB pipeline. */
export const installAdminPdfMasterplanPipelineV1 = (MapScene, input = {}) => {
  const typedOwner = atlasAdminPdfComponentsTsV1.installAtlasAdminPdfMasterplanPipelineV1;
  if (typeof typedOwner === "function") return typedOwner(MapScene, input);
  return installAdminPdfMasterplanPipelineLegacyV1(MapScene, input);
};
