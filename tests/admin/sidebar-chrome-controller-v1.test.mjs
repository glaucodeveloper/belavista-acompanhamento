import test from "node:test";
import assert from "node:assert/strict";
import { createSidebarChromeControllerV1 } from "../../components/shared/sidebar-chrome-controller-v1.mjs";

const setup = () => {
  const state = { sidebarCollapsed: false, adminMenu: false },
    listeners = new Set(),
    notices = [],
    appStore = {
      get: () => state,
      set: (patch) => Object.assign(state, patch),
    },
    root = {
      classList: { contains: (name) => name === "mobile-open" && Boolean(root.mobileOpen) },
      mobileOpen: true,
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
      contains: () => true,
    },
    controller = createSidebarChromeControllerV1({
      appStore,
      notify: (...args) => notices.push(args),
    });
  controller.connect(root);
  const click = (selector, target = {}) => {
    const eventTarget = {
      ...target,
      closest: (candidate) => candidate === selector ? eventTarget : null,
    };
    for (const listener of [...listeners]) listener({ target: eventTarget });
  };
  return { appStore, click, controller, listeners, notices, root, state };
};

test("sidebar chrome owns account-menu actions and disposes listeners", () => {
  const ctx = setup();
  ctx.click("#adminTrigger");
  assert.equal(ctx.state.adminMenu, true);
  assert.equal(ctx.state.lastAction, "Abriu menu do administrador");

  ctx.click(".admin-menu button", { textContent: "Auditoria da sessão" });
  assert.equal(ctx.state.view, "settings");
  assert.equal(ctx.state.lastAction, "Abriu Auditoria da sessão");

  ctx.controller.disconnect();
  assert.equal(ctx.listeners.size, 0);
});

test("sidebar chrome reports an unavailable authenticated sign-out without fabricating success", () => {
  const ctx = setup();
  const previous = globalThis.BELAVISTA_ADMIN_SIGN_OUT;
  delete globalThis.BELAVISTA_ADMIN_SIGN_OUT;
  try {
    ctx.click(".admin-menu button", { textContent: "Encerrar sessão" });
    assert.equal(ctx.state.adminMenu, false);
    assert.equal(ctx.state.lastAction, "Encerrando sessão");
    assert.deepEqual(ctx.notices, [["A sessão autenticada não está disponível neste ambiente.", "warning"]]);
  } finally {
    if (previous === undefined) delete globalThis.BELAVISTA_ADMIN_SIGN_OUT;
    else globalThis.BELAVISTA_ADMIN_SIGN_OUT = previous;
    ctx.controller.disconnect();
  }
});
