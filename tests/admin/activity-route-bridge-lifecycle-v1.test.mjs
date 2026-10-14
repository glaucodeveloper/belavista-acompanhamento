import test from "node:test";
import assert from "node:assert/strict";
import { installActivityRouteBridgeLifecycleV1 } from "../../components/planning/activity-route-bridge-lifecycle-v1.mjs";

test("activity route bridge covers both ViewLayer binds and roots already in the document", () => {
  const installed = [], queued = [];
  const root = {
    addEventListener(type, listener, options) {
      installed.push({ target: this, type, listener, options });
    },
  };
  class ViewLayer {
    bind() { return "bound"; }
    addEventListener(type, listener, options) {
      installed.push({ target: this, type, listener, options });
    }
  }

  const wrappedBind = installActivityRouteBridgeLifecycleV1({
    ViewLayer,
    workbenchActivityRouteV1: () => "/admin/workers/activity",
    documentRef: { querySelectorAll: (selector) => {
      assert.equal(selector, "view-layer");
      return [root];
    } },
    queueMicrotaskFn: (callback) => queued.push(callback),
  });

  const rendered = Object.assign(Object.create(ViewLayer.prototype), {
    addEventListener: ViewLayer.prototype.addEventListener,
  });
  assert.equal(rendered.bind(), "bound");
  assert.equal(ViewLayer.prototype.bind, wrappedBind);
  assert.equal(installed.length, 1);
  assert.equal(installed[0].target, rendered);
  assert.equal(queued.length, 1);

  queued[0]();
  assert.equal(installed.length, 2);
  assert.equal(installed[1].target, root);
});
