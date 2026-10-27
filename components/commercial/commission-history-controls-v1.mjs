import * as componentOwnersTsV1 from "../../dist/frontend/components.js";
import { installCommissionHistoryControlsV1 as installLegacyCommissionHistoryControlsV1 } from "./commission-history-controls-legacy-v1.mjs?v=commission-history-controls-recovery-v1";

/** Prefer the typed commission controls and retain the current implementation for recovery. */
export const installCommissionHistoryControlsV1 = (ViewLayer, dependencies = {}) => {
  const typedInstaller = dependencies.installAtlasCommissionHistoryControlsV1
    || componentOwnersTsV1.installAtlasCommissionHistoryControlsV1;
  if (globalThis.BELAVISTA_USE_LEGACY_COMMISSION_HISTORY_CONTROLS_V1 === true
      || typeof typedInstaller !== "function") {
    return installLegacyCommissionHistoryControlsV1(ViewLayer, dependencies);
  }
  try {
    return typedInstaller(ViewLayer, dependencies);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Typed commission history controls unavailable; using MJS recovery.", error);
    return installLegacyCommissionHistoryControlsV1(ViewLayer, dependencies);
  }
};
