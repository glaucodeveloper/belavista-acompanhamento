import * as componentOwnersTsV1 from "../../dist/frontend/components.js";
import { installStagesMapRuntimeGuardV1 as installLegacyStagesMapRuntimeGuardV1 } from "./stages-map-runtime-guard-legacy-v1.mjs?v=stages-map-runtime-guard-recovery-v1";

/** Prefer the typed stage-map DOM guard; preserve the previous binder for recovery. */
export const installStagesMapRuntimeGuardV1 = (ViewLayer, dependencies = {}) => {
  const typedInstaller = dependencies.installAtlasStagesMapRuntimeGuardV1
    || componentOwnersTsV1.installAtlasStagesMapRuntimeGuardV1;
  if (globalThis.BELAVISTA_USE_LEGACY_STAGES_MAP_GUARD_V1 === true
      || typeof typedInstaller !== "function") {
    return installLegacyStagesMapRuntimeGuardV1(ViewLayer, dependencies);
  }
  try {
    return typedInstaller(ViewLayer, dependencies);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Typed stage-map guard unavailable; using MJS recovery.", error);
    return installLegacyStagesMapRuntimeGuardV1(ViewLayer, dependencies);
  }
};
