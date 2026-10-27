import { installAtlasCommercialApplicationCompositionV1 } from "../../dist/frontend/program.js";

/** Keep the MJS shell boundary thin; all commercial composition and bindings live in TypeScript. */
export const installCommercialApplicationCompositionV1 = (dependencies = {}) =>
  installAtlasCommercialApplicationCompositionV1({
    ...dependencies,
    globalRef: dependencies.globalRef || globalThis,
  });
