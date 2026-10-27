import * as atlasPrimitiveComponentsV1 from "../../dist/frontend/components.js";
import * as legacyPrimitiveElementsV1 from "./primitive-elements-legacy-v1.mjs?v=primitive-elements-recovery-v1";

const useLegacy = globalThis.BELAVISTA_USE_LEGACY_PRIMITIVE_ELEMENTS_V1 === true;
export const GlassCard = !useLegacy && typeof atlasPrimitiveComponentsV1.AtlasGlassCardElementV1 === "function"
  ? atlasPrimitiveComponentsV1.AtlasGlassCardElementV1
  : legacyPrimitiveElementsV1.GlassCard;
export const StatPill = !useLegacy && typeof atlasPrimitiveComponentsV1.AtlasStatPillElementV1 === "function"
  ? atlasPrimitiveComponentsV1.AtlasStatPillElementV1
  : legacyPrimitiveElementsV1.StatPill;
