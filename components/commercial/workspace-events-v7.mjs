import { installAtlasCommercialWorkspaceEvents } from "../../dist/frontend/components.js";

/** Compatibility adapter; typed components now own broker and finance bindings. */
export const installCommercialWorkspaceEventsV7 = (ViewLayer, dependencies = {}) =>
  installAtlasCommercialWorkspaceEvents({
    ViewLayer,
    ...dependencies,
    windowRef: dependencies.window ?? globalThis.window,
  });
