import { installAtlasFinanceApplicationCompositionV1 } from "../../dist/frontend/program.js";

/** Keep the TS finance composition connected to the remaining MJS recovery ports. */
export const installFinanceApplicationCompositionV1 = async (dependencies = {}) => {
  const {
    globalRef = globalThis,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    confirmRef = globalThis.confirm,
    EventCtor = globalThis.Event,
    FormDataCtor = globalThis.FormData,
  } = dependencies;
  return installAtlasFinanceApplicationCompositionV1({
    ...dependencies,
    globalRef,
    documentRef,
    windowRef,
    confirmRef,
    EventCtor,
    FormDataCtor,
    legacyControlCenterDataFactoryV1: async recoveryDependencies => {
      const { createControlCenterDataV1 } = await import("../planning/control-center-data-v1.mjs?v=control-center-data-lazy-recovery-v1");
      return createControlCenterDataV1(recoveryDependencies);
    },
    installStagePlanningExtensionsV1: async (view, recoveryDependencies) => {
      const { installStagePlanningExtensionsV1: installLegacy } = await import("../planning/stage-planning-extensions-v1.mjs?v=stage-planning-extensions-lazy-recovery-v1");
      return installLegacy(view, recoveryDependencies);
    },
  });
};
