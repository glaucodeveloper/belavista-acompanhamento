import * as atlasPrimitiveComponentsV1 from "../../dist/frontend/components.js";
import { registerPrimitiveElementsV1 as registerLegacyPrimitiveElementsV1 } from "./primitive-elements-registration-legacy-v1.mjs?v=primitive-elements-recovery-v1";

/** Keep the existing MJS registration API while preferring the TypeScript owner. */
export const registerPrimitiveElementsV1 = ({ customElementsRef = globalThis.customElements } = {}) => {
  const registerTyped = atlasPrimitiveComponentsV1.registerAtlasPrimitiveElementsV1;
  if (globalThis.BELAVISTA_USE_LEGACY_PRIMITIVE_ELEMENTS_V1 !== true && typeof registerTyped === "function")
    return registerTyped(customElementsRef);
  return registerLegacyPrimitiveElementsV1({ customElementsRef });
};
