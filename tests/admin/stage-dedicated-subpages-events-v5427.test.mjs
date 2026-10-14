import assert from "node:assert/strict";
import test from "node:test";
import { installStageDedicatedSubpagesEventsV5427 } from "../../components/planning/stage-dedicated-subpages-events-v5427.mjs";

test("dedicated stage subpage binding preserves the base binder and diary navigation", () => {
  const updates = [];
  let baseCalls = 0;
  let delegatedClick;
  let capturePhase;
  const recordsTab = {
    dataset: { stageDetailTab: "diario" },
    textContent: "Diário",
    classList: { toggle() {} },
    closest(selector) {
      return selector === ".stage-v9-dedicated-page" ? dedicatedPage : null;
    },
  };
  const dedicatedPage = {
    querySelectorAll(selector) {
      return selector === "[data-stage-detail-tab]" ? [recordsTab] : [];
    },
    querySelector() {
      return null;
    },
  };
  const ViewLayer = {
    prototype: {
      bind() {
        baseCalls += 1;
        return "base-result";
      },
    },
  };
  const root = {
    dataset: {},
    querySelector() {
      return recordsTab;
    },
    addEventListener(type, handler, capture) {
      if (type === "click") {
        delegatedClick = handler;
        capturePhase = capture;
      }
    },
    contains(element) {
      return element === recordsTab;
    },
  };
  Object.setPrototypeOf(root, ViewLayer.prototype);

  installStageDedicatedSubpagesEventsV5427(ViewLayer, {
    bindBase: ViewLayer.prototype.bind,
    appStore: {
      get: () => ({ selectedStageV9: "", selectedStage: "" }),
      set: (value) => updates.push(value),
    },
    executionModel: { stages: [] },
    demoData: { activities: [] },
  });

  assert.equal(root.bind(), "base-result");
  delegatedClick({
    target: {
      closest: (selector) =>
        selector === "[data-stage-detail-tab]" ? recordsTab : null,
    },
    preventDefault() {},
    stopImmediatePropagation() {},
  });

  assert.equal(baseCalls, 1);
  assert.equal(capturePhase, true);
  assert.equal(root.dataset.stageDedicatedSubpagesBound, "true");
  assert.deepEqual(updates, [
    {
      selectedStageV9: "",
      selectedStage: "",
      view: "records",
      activityDedicated: false,
      stageActivityDedicatedV9: false,
      selectedStageDetailTab: "diario",
      lastAction: "Abriu Registros da etapa",
    },
  ]);
});
