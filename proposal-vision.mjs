import * as proposalProgramTsV1 from "./dist/frontend/program.js";
import * as proposalComponentsTsV1 from "./dist/frontend/components.js";
import * as proposalVisionLegacyV1 from "./proposal-vision-legacy-v1.mjs?v=proposal-vision-recovery-v1";

/** Keep the compatibility API while TypeScript owns proposal-image policy and parsing. */
const useLegacy = globalThis.BELAVISTA_USE_LEGACY_PROPOSAL_VISION_V1 === true;
const useProgram = !useLegacy && typeof proposalProgramTsV1.parseAtlasProposalVisionPayloadV1 === "function";
const useComponents = !useLegacy && typeof proposalComponentsTsV1.readAtlasProposalImageAsDataUrlV1 === "function";

export const PROPOSAL_VISION_MAX_BYTES = useProgram
  ? proposalProgramTsV1.PROPOSAL_VISION_MAX_BYTES_V1
  : proposalVisionLegacyV1.PROPOSAL_VISION_MAX_BYTES;
export const PROPOSAL_VISION_MIME_TYPES = Object.freeze([...(useProgram
  ? proposalProgramTsV1.PROPOSAL_VISION_MIME_TYPES_V1
  : proposalVisionLegacyV1.PROPOSAL_VISION_MIME_TYPES)]);
export const PROPOSAL_VISION_PROMPT = useProgram
  ? proposalProgramTsV1.PROPOSAL_VISION_PROMPT_V1
  : proposalVisionLegacyV1.PROPOSAL_VISION_PROMPT;
export const normalizeProposalVisionDraft = useProgram
  ? proposalProgramTsV1.normalizeAtlasProposalVisionDraftV1
  : proposalVisionLegacyV1.normalizeProposalVisionDraft;
export const parseProposalVisionPayload = useProgram
  ? proposalProgramTsV1.parseAtlasProposalVisionPayloadV1
  : proposalVisionLegacyV1.parseProposalVisionPayload;
export const readProposalImageAsDataUrl = useComponents
  ? proposalComponentsTsV1.readAtlasProposalImageAsDataUrlV1
  : proposalVisionLegacyV1.readProposalImageAsDataUrl;
