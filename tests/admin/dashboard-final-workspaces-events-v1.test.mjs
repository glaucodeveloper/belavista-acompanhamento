import assert from "node:assert/strict";
import test from "node:test";
import { installDashboardFinalWorkspaceEventsV1 } from "../../components/planning/dashboard-final-workspaces-events-v1.mjs";

test("final dashboard workspace binding preserves record navigation and base bind", () => {
  const listeners = new Map();
  const stateUpdates = [];
  let baseCalls = 0;
  let iconRefreshes = 0;
  const recordButton = {
    dataset: { v5360Record: "record-key" },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
  };
  const ViewLayer = {
    prototype: {
      bind() {
        baseCalls += 1;
      },
    },
  };
  const root = {
    querySelector(selector) {
      return selector === "[data-v5360-record-back]" ? null : null;
    },
    querySelectorAll(selector) {
      return selector === "[data-v5360-record]" ? [recordButton] : [];
    },
  };
  Object.setPrototypeOf(root, ViewLayer.prototype);

  installDashboardFinalWorkspaceEventsV1(ViewLayer, {
    appStore: {
      set(value) {
        stateUpdates.push(value);
      },
    },
    demoData: { activities: [] },
    latestDealForV5360: () => null,
    apiFetch: async () => {
      throw new Error("not used by this event");
    },
    operationalHeaders: () => ({}),
    notify() {},
    windowRef: { lucide: { createIcons: () => iconRefreshes++ } },
    DateCtor: Date,
  });

  root.bind();
  listeners.get("click")({ stopPropagation() {} });

  assert.equal(baseCalls, 1);
  assert.equal(iconRefreshes, 1);
  assert.deepEqual(stateUpdates, [
    {
      selectedRecordV5360: "record-key",
      lastAction: "Abriu página dedicada do registro record-key",
    },
  ]);
});
