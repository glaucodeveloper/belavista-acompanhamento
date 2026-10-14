import assert from "node:assert/strict";
import test from "node:test";
import { installMaterialsWorkspaceV1 } from "../../components/records/materials-workspace-v1.mjs";

test("materials workspace installs its full page and binding extensions on the view layer", () => {
  class ViewLayer {
    materials() { return "base materials"; }
    bind() { return "base bind"; }
  }

  const dependencies = {
    appStore: { get: () => ({ view: "materials" }), set() {}, update() {} },
    controlCenterMaterialRowsV1: () => [],
    controlCenterPublishV1() {},
    controlCenterRecordChangeV1: () => ({ id: "change" }),
    esc: (value) => String(value ?? ""),
    executionModel: { stages: [] },
    ico: () => "",
    normalizeActivityRouteTextV1: (value) => String(value ?? "").toLowerCase(),
    notify() {},
    stageProfileSettingsFor: () => ({}),
    stageV9FlowPackets: () => [],
  };

  installMaterialsWorkspaceV1(ViewLayer, dependencies);

  assert.notEqual(ViewLayer.prototype.materials.name, "materials");
  assert.notEqual(ViewLayer.prototype.bind.name, "bind");
});
