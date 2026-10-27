import { createAppSidebar } from "./app-sidebar.mjs?v=atlas-zip-sidebar-v11-ts-sidebar-direct-adapter";
import { createAppTopbar } from "./app-topbar.mjs?v=atlas-notification-inbox-v7-ts-only-adapter&ts-topbar-notification-domain-v1&ts-topbar-ts-only-adapter-v1";
import { registerAtlasNavigationElementsV1 as registerAtlasNavigationElementsTsV1 } from "../../dist/frontend/program.js";

// The administrative surface stays in tracking mode across navigation and map filters.
export const dashboardModeKeyV1 = () => "tracking";

/** Compose and register the application's two shared navigation elements. */
export const createAppNavigationElementsV1 = ({
  appStore,
  normalizeOperationalRole,
  isForemanUser,
  isLimitedOperationalActor,
  actorCanOpenView,
  navigationItemsForActor,
  FOREMAN_EXTENSION_VIEWS,
  reportCatalog,
  spreadsheetSchema,
  apiFetch,
  ico,
  esc,
  notify,
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
  globalObject = globalThis,
  customElements: customElementsRef = globalThis.customElements,
} = {}) => {
  try {
    const registered = registerAtlasNavigationElementsTsV1({
      appStore,
      reportCatalog,
      apiFetch,
      ico,
      esc,
      notify,
      document: documentRef,
      window: windowRef,
      customElements: customElementsRef,
      globalObject,
    });
    if (registered) return registered;
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] composição TS da sidebar/topbar indisponível; usando adapters MJS.", error);
  }

  const AppSidebar = createAppSidebar({
    appStore,
    normalizeOperationalRole,
    isForemanUser,
    dashboardModeKeyV1,
    navigationItemsForActor,
    FOREMAN_EXTENSION_VIEWS,
    reportCatalog,
    ico,
    esc,
    notify,
    document: documentRef,
    window: windowRef,
  });
  if (!customElementsRef.get("app-sidebar"))
    customElementsRef.define("app-sidebar", AppSidebar);

  const AppTopbar = createAppTopbar({
    appStore,
    spreadsheetSchema,
    normalizeOperationalRole,
    isLimitedOperationalActor,
    actorCanOpenView,
    apiFetch,
    ico,
    esc,
    notify,
    document: documentRef,
    window: windowRef,
  });
  if (!customElementsRef.get("app-topbar"))
    customElementsRef.define("app-topbar", AppTopbar);

  return Object.freeze({ AppSidebar, AppTopbar });
};
