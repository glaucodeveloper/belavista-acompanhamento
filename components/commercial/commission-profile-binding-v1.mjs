import * as componentOwnersTsV1 from "../../dist/frontend/components.js";
import { installCommissionProfileBindingV1 as installLegacyCommissionProfileBindingV1 } from "./commission-profile-binding-legacy-v1.mjs?v=commission-profile-binding-recovery-v1";

/** Prefer the typed commission profile interactions; keep MJS as recovery. */
export const installCommissionProfileBindingV1 = (ViewLayer, dependencies = {}) => {
  const typedInstaller = dependencies.installAtlasCommissionProfileBindingV1
    || componentOwnersTsV1.installAtlasCommissionProfileBindingV1;
  if (globalThis.BELAVISTA_USE_LEGACY_COMMISSION_PROFILE_BINDING_V1 === true
      || typeof typedInstaller !== "function") {
    return installLegacyCommissionProfileBindingV1(ViewLayer, dependencies);
  }
  try {
    return typedInstaller(ViewLayer, dependencies);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Typed commission profile binding unavailable; using MJS recovery.", error);
    return installLegacyCommissionProfileBindingV1(ViewLayer, dependencies);
  }
};
