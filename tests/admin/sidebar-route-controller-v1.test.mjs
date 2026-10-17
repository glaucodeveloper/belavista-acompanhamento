import test from "node:test";
import assert from "node:assert/strict";
import { createSidebarRouteControllerV1 } from "../../components/shared/sidebar-route-controller-v1.mjs";

const fixture = (initial = {}) => {
  const state = { ...initial }, listeners = new Map(), notices = [],
    calls = { closeMobile: 0, refreshCashFlow: 0, messageOpen: 0, routeRender: 0, chatCollapsed: [] },
    window = {
      location: { href: "http://localhost:8080/admin?view=map&key=session-key" },
      history: {
        state: { navigation: 1 },
        replaceState(state, _title, url) {
          this.state = state;
          window.location.href = String(url);
        },
      },
    },
    appStore = {
      get: () => state,
      set: (patch) => Object.assign(state, patch),
    },
    root = {
      addEventListener: (type, handler) => listeners.set(type, handler),
      removeEventListener: (type, handler) => {
        if (listeners.get(type) === handler) listeners.delete(type);
      },
      contains: () => true,
    },
    viewLayer = {
      dataset: { view: "map" },
      render() {
        calls.routeRender++;
        this.dataset.view = state.view;
      },
      refreshCashFlow: () => calls.refreshCashFlow++,
    },
    document = {
      querySelector: (selector) => selector === "view-layer"
        ? viewLayer
        : null,
      dispatchEvent: (event) => {
        if (event.type === "belavista:open-communications") calls.messageOpen++;
        return true;
      },
    },
    controller = createSidebarRouteControllerV1({
      appStore,
      reportCatalog: [{ family: "Financeiro", id: "monthly-cash" }],
      document,
      window,
      notify: (...args) => notices.push(args),
      getWorkerAssistant: () => ({ setCollapsed: (value) => calls.chatCollapsed.push(value) }),
    });
  controller.connect(root, { closeMobileNavigation: () => calls.closeMobile++ });
  const click = (dataset, label) => {
    const target = {
      dataset,
      textContent: label,
      closest: (selector) => selector === "[data-view]" ? target : null,
    };
    listeners.get("click")({ target });
  };
  return { calls, click, controller, listeners, notices, state, viewLayer, window };
};

test("agenda and AI actions routes synchronize rendered content and clear dedicated activity context", () => {
  const { calls, click, state, viewLayer, window } = fixture({ activityDedicated: true, selectedActivity: "stage:front", sidebarCollapsed: true });
  click({ view: "agenda" }, "Agenda");
  assert.equal(state.view, "agenda");
  assert.equal(state.activityDedicated, false);
  assert.equal(state.selectedActivity, null);
  assert.equal(state.sidebarCollapsed, false);
  assert.equal(state.lastAction, "Abriu Agenda");
  assert.equal(viewLayer.dataset.view, "agenda");
  assert.equal(calls.routeRender, 1);
  assert.equal(new URL(window.location.href).pathname, "/admin");
  assert.equal(new URL(window.location.href).searchParams.get("view"), "agenda");
  assert.equal(new URL(window.location.href).searchParams.get("key"), "session-key");

  click({ view: "actions" }, "Ações IA");
  assert.equal(state.view, "actions");
  assert.equal(viewLayer.dataset.view, "actions");
  assert.equal(calls.routeRender, 2);
  assert.equal(state.lastAction, "Abriu Ações IA");
  assert.equal(new URL(window.location.href).searchParams.get("view"), "actions");
});

test("the restricted role route controller keeps the allowed records route", () => {
  const { calls, click, state, viewLayer, window } = fixture({
    currentActor: { role: "admin", userType: "foreman" },
  });
  click({ view: "records" }, "Registros");
  assert.equal(state.view, "records");
  assert.equal(state.lastAction, "Abriu Registros");
  assert.equal(viewLayer.dataset.view, "records");
  assert.equal(calls.routeRender, 1);
  assert.equal(new URL(window.location.href).searchParams.get("view"), "records");
});

test("Loteamento navigation minimizes the assistant without affecting other routes", () => {
  const { calls, click, state } = fixture();
  click({ view: "lot-development" }, "Loteamento");
  assert.equal(state.view, "lot-development");
  assert.deepEqual(calls.chatCollapsed, [true]);
  click({ view: "map" }, "Mapa");
  assert.deepEqual(calls.chatCollapsed, [true]);
});

test("route controller retains finance refresh and disposes delegated listeners", () => {
  const { calls, click, controller, listeners, state } = fixture();
  click({ view: "finance" }, "Financeiro");
  assert.equal(state.view, "finance");
  assert.equal(calls.refreshCashFlow, 1);
  assert.equal(calls.closeMobile, 1);
  controller.disconnect();
  assert.equal(listeners.size, 0);
});

test("message navigation opens the communications panel without a floating launcher", () => {
  const { calls, controller, listeners } = fixture();
  const target = { dataset: {}, textContent: "Mensagens" };
  // The delegated event adapter resolves the selector from the target's closest().
  target.closest = (selector) => selector === '[data-sidebar-action="messages"]' ? target : null;
  listeners.get("click")({ target });
  assert.equal(calls.messageOpen, 1);
  assert.equal(calls.closeMobile, 1);
  controller.disconnect();
});
