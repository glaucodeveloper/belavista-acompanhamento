import { createAppSidebar } from "./app-sidebar.mjs?v=atlas-zip-sidebar-v3";
import { createAppTopbar } from "./app-topbar.mjs?v=atlas-notification-inbox-v3";

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
  ico,
  esc,
  notify,
  customElements: customElementsRef = globalThis.customElements,
} = {}) => {
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
  });
  if (!customElementsRef.get("app-sidebar"))
    customElementsRef.define("app-sidebar", AppSidebar);

  const AppTopbar = createAppTopbar({
    appStore,
    spreadsheetSchema,
    normalizeOperationalRole,
    isLimitedOperationalActor,
    actorCanOpenView,
    ico,
    esc,
    notify,
  });
  if (!customElementsRef.get("app-topbar"))
    customElementsRef.define("app-topbar", AppTopbar);

  return Object.freeze({ AppSidebar, AppTopbar });
};
