import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installPlanningPageRegistrationsV1 } from "../../components/planning/planning-page-registrations-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("planning page registration preserves the deferred boot and override order", () => {
  const calls = [],
    ports = {
      globalRef: { Date: class DateRef {}, console: {}, window: {} },
      ViewLayer: class ViewLayerRef {},
      appStore: {},
      demoData: {},
      commissionDeals: [],
      esc: () => "escaped",
      ico: () => "icon",
      notify: () => {},
      runtimeRouteV1: () => {},
      apiFetch: () => {},
      operationalHeaders: () => ({}),
      windowRef: {},
      DateCtor: class DateCtorRef {},
      consoleRef: {},
    };

  installPlanningPageRegistrationsV1({
    ...ports,
    productWorkspacesInstallerV1: (dependencies) => calls.push(["products", dependencies]),
    finalWorkspacesInstallerV1: (dependencies) => calls.push(["final-workspaces", dependencies]),
    stagesLandingInstallerV1: (dependencies) => calls.push(["stages", dependencies]),
    finalUiInstallerV1: (dependencies) => calls.push(["final-ui", dependencies]),
  });

  assert.deepEqual(calls.map(([name]) => name), ["products", "final-workspaces", "stages", "final-ui"]);
  assert.equal(calls[0][1].runtimeRouteV1, ports.runtimeRouteV1);
  assert.equal(calls[1][1].commissionDeals, ports.commissionDeals);
  assert.equal(calls[1][1].DateCtor, ports.DateCtor);
  assert.equal(calls[2][1].consoleRef, ports.consoleRef);
  assert.equal(calls[3][1].window, ports.windowRef);
  for (const [, dependencies] of calls) {
    assert.equal(dependencies.globalRef, ports.globalRef);
    assert.equal(dependencies.ViewLayer, ports.ViewLayer);
    assert.equal(dependencies.appStore, ports.appStore);
  }
});

test("components entry point delegates the ordered page registration group", () => {
  const source = fs.readFileSync(path.join(root, "components.js"), "utf8");
  assert.match(source, /installPlanningPageRegistrationsV1\(\{/);
  for (const installer of [
    "registerProductWorkspacesV5356",
    "installBelavistaFinalWorkspacesBootstrapV5360",
    "registerBelavistaStagesLandingV5361",
    "installBelavistaFinalUiV5362",
  ]) assert.doesNotMatch(source, new RegExp(installer));
});
