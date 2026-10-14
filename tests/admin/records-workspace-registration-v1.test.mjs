import assert from "node:assert/strict";
import test from "node:test";
import { installRecordsWorkspaceRegistrationV1 } from "../../components/records/records-workspace-registration-v1.mjs";

test("records workspace composes materials, database, drawer and transition in source order", () => {
  class ViewLayer {}
  const appStore = { get() { return {}; } };
  const documentRef = {}, DateCtor = class DateRef {};
  const ports = {
    ViewLayer,
    appStore,
    controlCenterMaterialRowsV1() {},
    controlCenterPublishV1() {},
    controlCenterRecordChangeV1() {},
    esc() {},
    executionModel: {},
    ico() {},
    normalizeActivityRouteTextV1() {},
    notify() {},
    stageProfileSettingsFor() {},
    stageV9FlowPackets() {},
    apiFetch() {},
    operationalHeaders() {},
    documentRef,
    DateCtor,
  };
  const calls = [];
  const installer = (name) => (...args) => calls.push({ name, args });

  assert.equal(installRecordsWorkspaceRegistrationV1({
    ...ports,
    materialsWorkspaceInstallerV1: installer("materials"),
    materialsDatabaseInstallerV1: installer("database"),
    controlRecordDrawerInstallerV1: installer("drawer"),
    materialTransitionInstallerV1: installer("transition"),
  }), ViewLayer);
  assert.deepEqual(calls.map(({ name }) => name), ["materials", "database", "drawer", "transition"]);
  assert.equal(calls[0].args[0], ViewLayer);
  assert.deepEqual(calls[0].args[1], {
    appStore: ports.appStore,
    controlCenterMaterialRowsV1: ports.controlCenterMaterialRowsV1,
    controlCenterPublishV1: ports.controlCenterPublishV1,
    controlCenterRecordChangeV1: ports.controlCenterRecordChangeV1,
    esc: ports.esc,
    executionModel: ports.executionModel,
    ico: ports.ico,
    normalizeActivityRouteTextV1: ports.normalizeActivityRouteTextV1,
    notify: ports.notify,
    stageProfileSettingsFor: ports.stageProfileSettingsFor,
    stageV9FlowPackets: ports.stageV9FlowPackets,
  });
  assert.deepEqual(calls[1].args, [ViewLayer]);
  assert.deepEqual(calls[2].args[1], { appStore, ico: ports.ico, documentRef, DateCtor });
  assert.deepEqual(calls[3].args[1], {
    apiFetch: ports.apiFetch,
    appStore,
    controlCenterMaterialRowsV1: ports.controlCenterMaterialRowsV1,
    controlCenterPublishV1: ports.controlCenterPublishV1,
    controlCenterRecordChangeV1: ports.controlCenterRecordChangeV1,
    esc: ports.esc,
    notify: ports.notify,
    operationalHeaders: ports.operationalHeaders,
  });
});
