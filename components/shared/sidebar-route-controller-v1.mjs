import { createServiceEventAdmin } from "../events/service-event-admin.mjs?v=service-event-admin-v4";
import { resolveSidebarNavigationTargetV1 } from "./application-navigation-routes-v1.mjs?v=application-navigation-routes-v1";
import { createSidebarNavigationEventRoutesV1 } from "./sidebar-navigation-events-v1.mjs?v=sidebar-navigation-events-v1";

/** Owns sidebar route commands; presentation stays in sidebar-navigation-v1. */
export const createSidebarRouteControllerV1 = ({
  appStore,
  reportCatalog = [],
  notify = () => {},
  getWorkerAssistant = () => globalThis.belavistaWorkerAssistant,
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
} = {}) => {
  if (!appStore?.get || !appStore?.set)
    throw new TypeError("Sidebar routes require the application store.");

  let eventAdmin = null;
  const navigateToView = (button) => {
    const { requestedNext, next } = resolveSidebarNavigationTargetV1(button.dataset.view),
      patch = {
        view: next,
        activityDedicated: false,
        selectedActivity: null,
        sidebarCollapsed: false,
        lastAction: requestedNext === next
          ? `Abriu ${button.textContent.trim()}`
          : "Área removida da navegação; abriu a Central operacional",
      };
    if (next === "contracts" || next === "proposals") {
      patch.proposalFormOpen = false;
      patch.contractEditing = null;
    }
    if (next === "reports" && button.dataset.reportFamily) {
      const family = button.dataset.reportFamily,
        first = reportCatalog.find((report) => report.family === family);
      patch.reportFamily = family;
      patch.reportType = first?.id || "financial-balance";
    }
    appStore.set(patch);
    if (next === "lot-development") getWorkerAssistant()?.setCollapsed?.(true);
    const viewLayer = documentRef?.querySelector("view-layer");
    if (viewLayer?.dataset?.view !== next && typeof viewLayer?.render === "function")
      viewLayer.render();
    const location = windowRef?.location;
    const history = windowRef?.history;
    if (location?.href && history?.replaceState) {
      const url = new URL(location.href);
      url.searchParams.set("view", next);
      history.replaceState(history.state, "", url);
    }
    if (next === "finance") documentRef?.querySelector("view-layer")?.refreshCashFlow?.();
  };

  return Object.freeze({
    connect(root, { closeMobileNavigation = () => {} } = {}) {
      eventAdmin?.dispose();
      eventAdmin = createServiceEventAdmin({
        root,
        service: "sidebar-navigation",
        routes: createSidebarNavigationEventRoutesV1({
          closeMobileNavigation,
          navigate: navigateToView,
          openMessages: () => {
            const launcher = documentRef?.querySelector("[data-admin-message-open]");
            if (launcher) launcher.click();
            else notify("A central de mensagens será carregada ao abrir as extensões.", "info");
          },
        }),
      });
    },
    disconnect() {
      eventAdmin?.dispose();
      eventAdmin = null;
    },
  });
};
