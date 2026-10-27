import * as atlasComponentsTsV1 from "../../dist/frontend/components.js";
import {
  installBelavistaFinalUiV5362 as installLegacyFinalUiEventsV5362,
} from "./final-ui-events-legacy-v5362.mjs?v=final-ui-events-recovery-v1";

/** Bind final-workspace controls through components.ts when the compiled owner exists. */
export const installBelavistaFinalUiV5362 = (input = {}) => {
  const installTyped = atlasComponentsTsV1.installAtlasFinalWorkspaceEventsV1;
  if (typeof installTyped === "function") {
    return installTyped({
      globalRef: input.globalRef,
      ViewLayer: input.ViewLayer,
      window: input.window,
    });
  }
  return installLegacyFinalUiEventsV5362(input);
};
