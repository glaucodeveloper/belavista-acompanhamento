import test from "node:test";
import assert from "node:assert/strict";
import { createAppTopbar } from "../../components/shared/app-topbar.mjs";

test("topbar encaminha sincronização e menu pelo próprio programa de eventos", () => {
  const original = {
      HTMLElement: globalThis.HTMLElement,
      document: globalThis.document,
      window: globalThis.window,
      localStorage: globalThis.localStorage,
    },
    state = {
      currentActor: { name: "Admin", label: "Admin", role: "admin" },
      sessionId: "session-test",
      operationalNotifications: [],
      theme: "dark",
      dashboardMode: "tracking",
      adminMenu: false,
    },
    subscribers = new Set(),
    nativeListeners = new Map(),
    notices = [],
    syncClasses = new Set(),
    menuClasses = new Set(),
    syncButton = {
      classList: {
        add: (name) => syncClasses.add(name),
        remove: (name) => syncClasses.delete(name),
      },
      closest: (selector) =>
        selector === "#syncBtn" ? syncButton : null,
    },
    notificationButton = {
      dataset: {},
      querySelector: () => ({ textContent: "" }),
      closest: (selector) =>
        selector === '[aria-label="Notificações"]'
          ? notificationButton
          : null,
      addEventListener() {},
    },
    menu = {
      classList: {
        toggle: (name) =>
          menuClasses.has(name)
            ? menuClasses.delete(name)
            : menuClasses.add(name),
        remove: (name) => menuClasses.delete(name),
      },
    };

  class HTMLElementStub {
    constructor() {
      this.dataset = {};
    }
    addEventListener(type, listener) {
      nativeListeners.set(type, listener);
    }
    removeEventListener(type, listener) {
      if (nativeListeners.get(type) === listener) nativeListeners.delete(type);
    }
    contains() {
      return true;
    }
    querySelector(selector) {
      if (selector === "#syncBtn") return syncButton;
      if (selector === '[aria-label="Notificações"]') return notificationButton;
      if (selector === ".top-admin-menu") return menu;
      return null;
    }
    querySelectorAll() {
      return [];
    }
    insertAdjacentHTML() {}
  }

  globalThis.HTMLElement = HTMLElementStub;
  globalThis.document = {
    documentElement: { dataset: {} },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  globalThis.window = { lucide: { createIcons() {} } };
  globalThis.localStorage = {
    getItem: () => "[]",
    setItem() {},
  };

  try {
    const appStore = {
        get: () => ({ ...state }),
        set: (next) => Object.assign(state, next),
        subscribe: (listener) => {
          subscribers.add(listener);
          return () => subscribers.delete(listener);
        },
      },
      Topbar = createAppTopbar({
        appStore,
        spreadsheetSchema: { sheets: [] },
        normalizeOperationalRole: (role) => role,
        ico: () => "",
        esc: (value) => String(value),
        notify: (...args) => notices.push(args),
      }),
      topbar = new Topbar();

    topbar.connectedCallback();
    assert.equal(subscribers.size, 1);
    assert.deepEqual([...nativeListeners.keys()], ["click"]);

    nativeListeners.get("click")({ target: syncButton });
    assert.equal(state.lastAction, "Sincronizou dados");
    assert.deepEqual(notices, [["Dados sincronizados localmente.", "success"]]);
    assert.equal(syncClasses.has("spinning"), true);

    const profile = {
      closest: (selector) =>
        selector === ".top-profile" ? profile : null,
    };
    nativeListeners.get("click")({ target: profile });
    assert.equal(state.adminMenu, true);
    assert.equal(state.lastAction, "Alternou menu do administrador");
    assert.equal(menuClasses.has("open"), true);

    topbar.disconnectedCallback();
    assert.equal(subscribers.size, 0);
    assert.equal(nativeListeners.size, 0);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
