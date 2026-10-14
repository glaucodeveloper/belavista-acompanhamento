import { createServiceEventAdmin } from "../events/service-event-admin.mjs?v=service-event-admin-v4";

/** Owns sidebar chrome actions independently from navigation and route rendering. */
export const createSidebarChromeControllerV1 = ({ appStore, notify } = {}) => {
  if (!appStore?.get || !appStore?.set)
    throw new TypeError("Sidebar chrome requires the application store.");

  let eventAdmin = null;
  return Object.freeze({
    connect(root) {
      eventAdmin?.dispose();
      eventAdmin = createServiceEventAdmin({
        root,
        service: "sidebar-chrome",
        routes: [
          {
            eventType: "click",
            selector: "#adminTrigger",
            action: "toggle-admin-menu",
            handler: () =>
              appStore.set({
                adminMenu: !appStore.get().adminMenu,
                lastAction: "Abriu menu do administrador",
              }),
          },
          {
            eventType: "click",
            selector: ".admin-menu button",
            action: "admin-menu-command",
            handler: ({ target }) => runAdminMenuCommand(target, appStore, notify),
          },
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
  if (/encerrar/i.test(label)) {
    appStore.set({ adminMenu: false, lastAction: "Encerrando sessão" });
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
  appStore.set({
    view: "settings",
    adminMenu: false,
    lastAction: `Abriu ${label}`,
  });
};
