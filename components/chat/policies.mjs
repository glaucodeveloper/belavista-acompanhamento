import * as atlasAiChatPolicyProgramV1 from "../../dist/frontend/program.js";
import * as legacyAiChatPoliciesV1 from "./policies-legacy-v1.mjs?v=ai-chat-policies-recovery-v1";

const useLegacy = globalThis.BELAVISTA_USE_LEGACY_AI_CHAT_POLICIES_V1 === true;
const resolvePolicy = (typedName, legacyName) => !useLegacy && typeof atlasAiChatPolicyProgramV1[typedName] === "string"
  ? atlasAiChatPolicyProgramV1[typedName]
  : legacyAiChatPoliciesV1[legacyName];

export const CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1 = resolvePolicy("CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1", "CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1");
export const CHAT_VISUAL_ALLOCATION_POLICY_V1 = resolvePolicy("CHAT_VISUAL_ALLOCATION_POLICY_V1", "CHAT_VISUAL_ALLOCATION_POLICY_V1");
