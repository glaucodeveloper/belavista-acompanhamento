import { installProductWorkspacesV5356 } from "./product-workspaces-v5356.mjs";

/** Preserve the deferred global installer consumed by the admin extension boot. */
export const registerProductWorkspacesV5356 = (dependencies = {}) => {
  const globalRef = dependencies.globalRef || globalThis;
  globalRef.installBelavistaProductWorkspacesV5356 = () =>
    installProductWorkspacesV5356({ ...dependencies, globalRef });
  return globalRef.installBelavistaProductWorkspacesV5356;
};
