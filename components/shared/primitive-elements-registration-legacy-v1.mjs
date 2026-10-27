import { GlassCard, StatPill } from "./primitive-elements-legacy-v1.mjs?v=primitive-elements-recovery-v1";

/** Register shared presentational elements without replacing existing owners. */
export const registerPrimitiveElementsV1 = ({
  customElementsRef = globalThis.customElements,
} = {}) => {
  if (typeof customElementsRef?.get !== "function" ||
      typeof customElementsRef?.define !== "function")
    throw new TypeError("Primitive element registration requires CustomElementRegistry.");
  if (!customElementsRef.get("glass-card"))
    customElementsRef.define("glass-card", GlassCard);
  if (!customElementsRef.get("stat-pill"))
    customElementsRef.define("stat-pill", StatPill);
  return Object.freeze({ GlassCard, StatPill });
};
