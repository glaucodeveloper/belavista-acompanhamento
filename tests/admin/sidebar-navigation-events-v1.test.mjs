import test from "node:test";
import assert from "node:assert/strict";
import { createSidebarNavigationEventRoutesV1 } from "../../components/shared/sidebar-navigation-events-v1.mjs";

test("sidebar event generator separates messages and route navigation", () => {
  const calls = [],
    routes = createSidebarNavigationEventRoutesV1({
      closeMobileNavigation: () => calls.push("close"),
      openMessages: () => calls.push("messages"),
      navigate: (target) => calls.push(`navigate:${target.dataset.view}`),
    });

  assert.deepEqual(routes.map(({ selector, action }) => [selector, action]), [
    ['[data-sidebar-action="messages"]', "open-messages"],
    ["[data-view]", "navigate"],
  ]);
  routes[0].handler();
  routes[1].handler({ target: { dataset: { view: "agenda" } } });
  routes[1].handler({ target: { dataset: { view: "actions" } } });
  assert.deepEqual(calls, [
    "close", "messages",
    "close", "navigate:agenda",
    "close", "navigate:actions",
  ]);
});
