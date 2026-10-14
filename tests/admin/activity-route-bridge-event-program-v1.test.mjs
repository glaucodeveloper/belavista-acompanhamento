import test from "node:test";
import assert from "node:assert/strict";
import { installActivityRouteBridgeV1 } from "../../components/planning/activity-route-bridge.mjs";

test("activity route bridge keeps capture phase and routes through its service generator", () => {
  const listeners = new Map(),
    navigations = [],
    root = {
      addEventListener(type, listener, capture) {
        listeners.set(type, { listener, capture });
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
      contains: () => true,
    },
    bridge = installActivityRouteBridgeV1(root, (activity, stage) =>
      `/activity/${encodeURIComponent(activity)}?stage=${encodeURIComponent(stage)}`,
    ),
    target = {
      dataset: { activityDetail: "Drenagem", stage: "infra" },
      closest: () => null,
      matches: () => false,
    },
    event = {
      type: "click",
      target: { closest: () => target },
      preventDefault() {
        this.prevented = true;
      },
      stopImmediatePropagation() {
        this.stopped = true;
      },
    };

  root.ownerDocument = {
    defaultView: {
      location: {
        assign: (url) => navigations.push(url),
      },
    },
  };
  const originalWindow = globalThis.window;
  globalThis.window = { location: { assign: (url) => navigations.push(url) } };
  try {
    assert.equal(listeners.get("click").capture, true);
    listeners.get("click").listener(event);
    assert.equal(event.prevented, true);
    assert.equal(event.stopped, true);
    assert.deepEqual(navigations, ["/activity/Drenagem?stage=infra"]);
    assert.equal(root.__activityRouteBridgeV1, bridge);
    bridge.dispose();
    assert.equal(listeners.size, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
