import test from "node:test";
import assert from "node:assert/strict";
import { createAppSidebar } from "../../components/shared/app-sidebar.mjs";

test("sidebar encaminha navegação pelo serviço de eventos e libera recursos ao desmontar", () => {
  const original = {
      HTMLElement: globalThis.HTMLElement,
      document: globalThis.document,
      window: globalThis.window,
    },
    state = {
      view: "map",
      currentActor: { name: "Operadora", label: "Admin", role: "admin" },
      dashboardMode: "tracking",
    },
    subscribers = new Set(),
    nativeListeners = new Map(),
    nav = { scrollTop: 0, scrollLeft: 0 },
    mobileLabel = { textContent: "Menu" },
    mobileTrigger = {
      setAttribute() {},
      querySelector: () => mobileLabel,
    };

  class HTMLElementStub {
    constructor() {
      this.dataset = {};
      this.classList = {
        contains: () => false,
        toggle() {},
      };
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
      if (selector === ".sidebar nav") return nav;
      if (selector === ".mobile-menu-trigger") return mobileTrigger;
      return null;
    }
    querySelectorAll() {
      return [];
    }
    insertAdjacentHTML() {}
  }

  globalThis.HTMLElement = HTMLElementStub;
  globalThis.document = { querySelector: () => null };
  globalThis.window = { lucide: { createIcons() {} } };

  try {
    const appStore = {
        get: () => ({ ...state }),
        set: (next) => Object.assign(state, next),
        subscribe: (listener) => {
          subscribers.add(listener);
          return () => subscribers.delete(listener);
        },
      },
      Sidebar = createAppSidebar({
        appStore,
        normalizeOperationalRole: (role) => role,
        isForemanUser: () => false,
        dashboardModeKeyV1: (mode) => mode,
        navigationItemsForActor: (_actor, items) => items,
        FOREMAN_EXTENSION_VIEWS: [],
        reportCatalog: [],
        ico: () => "",
        esc: (value) => String(value),
        notify() {},
      }),
      sidebar = new Sidebar();

    sidebar.connectedCallback();
    assert.equal(subscribers.size, 1);
    assert.deepEqual([...nativeListeners.keys()], ["click"]);

    const navButton = {
      dataset: { view: "brokers" },
      textContent: "Corretores",
      closest: (selector) =>
        selector === "[data-view]" ? navButton : null,
    };
    nativeListeners.get("click")({ target: navButton });
    assert.equal(state.view, "brokers");
    assert.equal(state.activityDedicated, false);
    assert.equal(state.selectedActivity, null);
    assert.equal(state.sidebarCollapsed, false);
    assert.equal(state.lastAction, "Abriu Corretores");

    sidebar.disconnectedCallback();
    assert.equal(subscribers.size, 0);
    assert.equal(nativeListeners.size, 0);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
