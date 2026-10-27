import { createServiceEventAdmin } from "../events/service-event-admin.mjs?v=service-event-admin-v4";
import { createSidebarAdminMenuCommand as createSidebarAdminMenuCommandTsV1 } from "../../dist/frontend/program.js";
import { createSidebarChromeEventRoutes as createSidebarChromeEventRoutesTsV1 } from "../../dist/frontend/components.js";
import { createAtlasSidebarChromeControllerV1 as createAtlasSidebarChromeControllerTsV1 } from "../../dist/frontend/program.js";

/** Legacy recovery when the TypeScript program bundle is unavailable. */
const createSidebarChromeControllerLegacyV1 = ({ appStore, notify } = {}) => {
  if (!appStore?.get || !appStore?.set)
    throw new TypeError("Sidebar chrome requires the application store.");

  let eventAdmin = null;
  return Object.freeze({
    connect(root) {
      eventAdmin?.dispose();
      eventAdmin = createServiceEventAdmin({
        root,
        service: "sidebar-chrome",
        routes: createSidebarChromeEventRoutesTsV1?.({
          toggleAdminMenu: () =>
              appStore.set({
                adminMenu: !appStore.get().adminMenu,
                lastAction: "Abriu menu do administrador",
              }),
          runAdminMenuCommand: target => runAdminMenuCommand(target, appStore, notify),
        }) || [
          { eventType: "click", selector: "#adminTrigger", action: "toggle-admin-menu", handler: () => appStore.set({ adminMenu: !appStore.get().adminMenu, lastAction: "Abriu menu do administrador" }) },
          { eventType: "click", selector: ".admin-menu button", action: "admin-menu-command", handler: ({ target }) => runAdminMenuCommand(target, appStore, notify) },
        ],
      });
    },
    disconnect() {
      eventAdmin?.dispose();
      eventAdmin = null;
    },
  });
};

const runAdminMenuCommand = async (button, appStore, notify) => {
  const label = button.textContent.trim();
  const command = createSidebarAdminMenuCommandTsV1?.(label) || {
    patch: /encerrar/i.test(label)
      ? { adminMenu: false, lastAction: "Encerrando sessão" }
      : { view: "settings", adminMenu: false, lastAction: `Abriu ${label}` },
    signOut: /encerrar/i.test(label),
  };
  if (command.signOut) {
    appStore.set(command.patch);
    if (typeof globalThis.BELAVISTA_ADMIN_SIGN_OUT === "function") {
      await globalThis.BELAVISTA_ADMIN_SIGN_OUT();
    } else {
      notify(
        "A sessão autenticada não está disponível neste ambiente.",
        "warning",
      );
    }
    return;
  }
  appStore.set(command.patch);
};

/** TypeScript owns sidebar chrome; preserve the prior implementation as recovery. */
export const createSidebarChromeControllerV1 = (input = {}) =>
  typeof createAtlasSidebarChromeControllerTsV1 === "function"
    ? createAtlasSidebarChromeControllerTsV1(input)
    : createSidebarChromeControllerLegacyV1(input);
