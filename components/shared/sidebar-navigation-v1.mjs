import { createSidebarRouteControllerV1 } from "./sidebar-route-controller-v1.mjs?v=sidebar-route-controller-v2";
import {
  SIDEBAR_MODE_ITEMS_V1,
  SIDEBAR_MODE_LABELS_V1,
} from "./sidebar-navigation-catalog-v1.mjs?v=sidebar-navigation-catalog-v1";
import { renderSidebarNavigationV1 } from "./sidebar-navigation-render-v1.mjs?v=sidebar-navigation-render-v2";

/** Builds the primary and role-aware secondary navigation markup. */
export const createSidebarNavigationV1 = ({
  appStore,
  normalizeOperationalRole,
  isForemanUser,
  isLimitedOperationalActor = (actor = {}) =>
    isForemanUser?.(actor) || ["sales", "commercial", "broker", "corretor"].includes(String(actor.role || "").toLocaleLowerCase("pt-BR")),
  dashboardModeKeyV1,
  navigationItemsForActor,
  FOREMAN_EXTENSION_VIEWS,
  reportCatalog,
  ico,
  esc,
  notify,
  document: documentRef = globalThis.document,
} = {}) => {
  if (!appStore?.get || !appStore?.set || typeof navigationItemsForActor !== "function")
    throw new TypeError("Sidebar navigation requires the application store and actor navigation policy.");

  const routeController = createSidebarRouteControllerV1({
    appStore,
    reportCatalog,
    notify,
    document: documentRef,
  });

  return Object.freeze({
    connect(root, { closeMobileNavigation = () => {} } = {}) {
      routeController.connect(root, { closeMobileNavigation });
    },
    disconnect() {
      routeController.disconnect();
    },
    render(state = appStore.get()) {
      const actor = state.currentActor || { name: "Warley", label: "Dono" },
        normalizedRole = normalizeOperationalRole(actor.role || "owner"),
        foremanSurface = isLimitedOperationalActor(actor),
        brokerOnly = ["sales", "commercial", "broker", "corretor"].includes(actor.role),
        mode = dashboardModeKeyV1(state.dashboardMode),
        items = navigationItemsForActor(actor, brokerOnly && mode !== "social"
          ? [["map", "house", "Mapa"]]
          : SIDEBAR_MODE_ITEMS_V1[mode]),
        reportFamilies = [...new Set(reportCatalog.map((report) => report.family))],
        rendered = renderSidebarNavigationV1({
          items,
          state,
          foremanSurface,
          FOREMAN_EXTENSION_VIEWS,
          reportFamilies,
          ico,
          esc,
        });
      return Object.freeze({
        normalizedRole,
        foremanSurface,
        modeLabel: SIDEBAR_MODE_LABELS_V1[mode],
        ...rendered,
      });
    },
  });
};
