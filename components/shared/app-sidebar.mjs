import { createAtlasSidebarElement as createAtlasSidebarElementTsV1 } from "../../dist/frontend/components.js";

/** Bind application services to the TypeScript-owned sidebar custom element. */
export const createAppSidebar = (options = {}) => createAtlasSidebarElementTsV1({
  appStore: options.appStore,
  reportCatalog: options.reportCatalog,
  getWorkerAssistant: () => globalThis.belavistaWorkerAssistant,
  notify: options.notify,
  esc: options.esc,
  ico: options.ico,
  document: options.document || globalThis.document,
  window: options.window || globalThis.window,
});
