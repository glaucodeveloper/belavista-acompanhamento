import { apiFetch } from "../../api-client.mjs?v=github-pat-gateway-v1";
import { createAtlasTopbarElement as createAtlasTopbarElementTsV1 } from "../../dist/frontend/components.js";
import { createAtlasTopbarOperationalServices as createAtlasTopbarOperationalServicesTsV1, installAtlasTopbarOperationalEventController as installAtlasTopbarOperationalEventControllerTsV1 } from "../../dist/frontend/program.js";

const TOPBAR_OPERATION_CONTROLLERS_V1 = new WeakMap();

/** Compatibility adapter: all topbar markup, interactions, policy, and API orchestration live in TypeScript. */
export const createAppTopbar = ({
  appStore,
  apiFetch: apiFetchFn = apiFetch,
  ico,
  esc,
  notify,
} = {}) => {
  if (typeof createAtlasTopbarElementTsV1 !== "function"
    || typeof createAtlasTopbarOperationalServicesTsV1 !== "function"
    || typeof installAtlasTopbarOperationalEventControllerTsV1 !== "function") {
    throw new Error("O topbar TypeScript não foi carregado. Recompile frontend/src/components.ts e frontend/src/program.ts.");
  }
  const root = globalThis.document;
  if (root && !TOPBAR_OPERATION_CONTROLLERS_V1.has(root)) {
    const bridge = globalThis.aliancaDesktop;
    const desktopEnvironment = bridge?.runtime && bridge?.switchEnvironment
      ? { runtime: () => bridge.runtime(), switchEnvironment: mode => bridge.switchEnvironment(mode) }
      : undefined;
    const services = createAtlasTopbarOperationalServicesTsV1({ appStore, apiFetch: apiFetchFn, desktopEnvironment });
    TOPBAR_OPERATION_CONTROLLERS_V1.set(root, installAtlasTopbarOperationalEventControllerTsV1({ root, services }));
  }
  return createAtlasTopbarElementTsV1({ appStore, ico, esc, notify });
};
