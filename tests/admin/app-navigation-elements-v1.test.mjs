import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAppNavigationElementsV1, dashboardModeKeyV1 } from "../../components/shared/app-navigation-elements-v1.mjs";

test("application navigation composes and registers the same sidebar and topbar elements", () => {
  const priorHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = class HTMLElement {};
  const definitions = new Map();
  const registry = {
    get: (name) => definitions.get(name),
    define: (name, constructor) => definitions.set(name, constructor),
  };
  const appStore = { get: () => ({ view: "map" }), set() {}, subscribe() {} };
  const normalizeOperationalRole = (role) => role;
  const elements = createAppNavigationElementsV1({
    appStore,
    normalizeOperationalRole,
    isForemanUser: () => false,
    navigationItemsForActor: () => [],
    FOREMAN_EXTENSION_VIEWS: [],
    reportCatalog: [],
    spreadsheetSchema: {},
    ico: () => "",
    esc: (value) => String(value ?? ""),
    notify() {},
    customElements: registry,
  });

  try {
    assert.equal(registry.get("app-sidebar"), elements.AppSidebar);
    assert.equal(registry.get("app-topbar"), elements.AppTopbar);
    assert.equal(Object.getPrototypeOf(elements.AppSidebar.prototype), globalThis.HTMLElement.prototype);
    assert.equal(Object.getPrototypeOf(elements.AppTopbar.prototype), globalThis.HTMLElement.prototype);
    assert.deepEqual([...definitions.keys()], ["app-sidebar", "app-topbar"]);
    assert.equal(dashboardModeKeyV1(), "tracking");
    assert.equal(Object.isFrozen(elements), true);
  } finally {
    if (priorHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = priorHTMLElement;
  }
});

test("components.js delegates navigation composition while retaining named exports", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    registration = await readFile(new URL("../../components/shared/application-elements-registration-v1.mjs", import.meta.url), "utf8");

  assert.match(source, /registerApplicationElementsV1\(\{/);
  assert.match(source, /export const \{ AppSidebar, AppTopbar, ViewLayer \} = applicationElementsV1/);
  assert.match(registration, /createAppNavigationElementsV1/);
  assert.match(registration, /customElements: customElementsRef/);
  assert.doesNotMatch(source, /export const AppSidebar = createAppSidebar/);
  assert.doesNotMatch(source, /customElements\.define\("app-sidebar"/);
  assert.doesNotMatch(source, /customElements\.define\("app-topbar"/);
});
