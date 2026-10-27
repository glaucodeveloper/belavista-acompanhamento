import * as componentOwnersTsV1 from "../../dist/frontend/components.js";
import { installOperationalViewBindV8 as installLegacyOperationalViewBindV8 } from "./operational-view-bind-legacy-v8.mjs?v=operational-view-bind-recovery-v1";

/** Select the typed view binder, keeping the previous implementation as recovery. */
export const installOperationalViewBindV8 = (ViewLayer, dependencies = {}) => {
  const typedInstaller = dependencies.installAtlasOperationalViewBindingsV1
    || componentOwnersTsV1.installAtlasOperationalViewBindingsV1;
  const documentRef = dependencies.documentRef;
  const markOwner = owner => {
    if (documentRef?.documentElement) documentRef.documentElement.dataset.operationalViewBindingOwnerV1 = owner;
  };
  if (globalThis.BELAVISTA_USE_LEGACY_OPERATIONAL_VIEW_BINDINGS_V1 === true || typeof typedInstaller !== "function") {
    markOwner("mjs-fallback");
    return installLegacyOperationalViewBindV8(ViewLayer, dependencies);
  }
  try {
    const result = typedInstaller(ViewLayer, dependencies);
    markOwner("typescript");
    return result;
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Typed operational view bindings unavailable; using MJS recovery.", error);
    markOwner("mjs-fallback");
    return installLegacyOperationalViewBindV8(ViewLayer, dependencies);
  }
};
