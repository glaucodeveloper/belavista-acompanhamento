import assert from "node:assert/strict";
import test from "node:test";
import { installActivityCalendarCanvasV1 } from "../../components/planning/activity-calendar-canvas-v1.mjs";
import { installStageContextChromeV1 } from "../../components/planning/stage-context-chrome-v1.mjs";
import { installStageNavigationSurfacesRegistrationV1 } from "../../components/planning/stage-navigation-surfaces-registration-v1.mjs";

test("planning modules install the original stage chrome and activity calendar hooks", () => {
  const priorEnsure = globalThis.__ensureStageContextChromeV1;
  let bindCalls = 0, ensureCalls = 0;
  class ViewLayer {
    render() { return "render"; }
    bind() { bindCalls++; return "bind"; }
    activities() { return "activities"; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
  }
  const appStore = { get: () => ({ view: "outside", stageActivityDedicatedV9: true }) };

  try {
    installStageContextChromeV1(ViewLayer, {
      STAGE_CONTEXT_VIEWS_V1: new Set(["stages"]),
      appStore,
      executionModel: { stages: [] },
      runtimeRouteV1: (path) => path,
      stageContextV1: () => ({}),
      stagePersistentTimelineMarkupV1: () => "",
      stageViewTabs: () => "",
    });
    installActivityCalendarCanvasV1(ViewLayer, {
      appStore,
      esc: (value) => String(value ?? ""),
      executionModel: { stages: [] },
      extensionStage: () => null,
      ico: () => "",
      runtimeRouteV1: (path) => path,
      stageV9FlowPackets: () => [],
      stageV9LiveFor: () => null,
      stageViewTabs: () => "",
    });

    assert.notEqual(ViewLayer.prototype.render.name, "render");
    assert.notEqual(ViewLayer.prototype.activities.name, "activities");
    assert.equal(new ViewLayer().render(), "render");
    assert.equal(new ViewLayer().activities(), "activities");
    assert.equal(typeof globalThis.__ensureStageContextChromeV1, "function");
    const ensure = globalThis.__ensureStageContextChromeV1;
    globalThis.__ensureStageContextChromeV1 = (layer) => { ensureCalls++; ensure(layer); };
    assert.equal(new ViewLayer().bind(), "bind");
    assert.equal(bindCalls, 1);
    assert.equal(ensureCalls, 1);
  } finally {
    if (priorEnsure === undefined) delete globalThis.__ensureStageContextChromeV1;
    else globalThis.__ensureStageContextChromeV1 = priorEnsure;
  }
});

test("stage navigation registration preserves installer order and dependency identity", () => {
  const calls = [],
    stageContextViews = new Set(["stages"]),
    ports = {
      ViewLayer: class ViewLayerRef {},
      appStore: {},
      executionModel: { stages: [] },
      runtimeRouteV1: () => {},
      stageContextV1: () => ({}),
      stagePersistentTimelineMarkupV1: () => "timeline",
      stageViewTabs: () => "tabs",
      isLimitedOperationalActor: () => false,
      esc: String,
      extensionStage: () => null,
      ico: () => "",
      stageV9FlowPackets: () => [],
      stageV9LiveFor: () => null,
      stageContextViews,
    };

  installStageNavigationSurfacesRegistrationV1({
    ...ports,
    contextChromeInstallerV1(ViewLayer, dependencies) {
      calls.push(["chrome", ViewLayer, dependencies]);
    },
    activityCalendarInstallerV1(ViewLayer, dependencies) {
      calls.push(["calendar", ViewLayer, dependencies]);
    },
  });

  assert.deepEqual(calls.map(([name]) => name), ["chrome", "calendar"]);
  assert.ok(calls.every(([, ViewLayer]) => ViewLayer === ports.ViewLayer));
  assert.equal(calls[0][2].STAGE_CONTEXT_VIEWS_V1, stageContextViews);
  assert.equal(calls[0][2].stagePersistentTimelineMarkupV1, ports.stagePersistentTimelineMarkupV1);
  assert.equal(calls[1][2].stageV9FlowPackets, ports.stageV9FlowPackets);
  assert.equal(calls[1][2].stageV9LiveFor, ports.stageV9LiveFor);
});
