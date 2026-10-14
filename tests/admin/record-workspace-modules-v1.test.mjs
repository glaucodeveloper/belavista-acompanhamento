import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { installControlRecordDrawerV2 } from "../../components/records/control-record-drawer-v2.mjs";
import { installMaterialTransitionV1 } from "../../components/records/material-transition-v1.mjs";

test("record workspace modules install their original view, material, and render hooks", () => {
  class ViewLayer {
    render() { return "render"; }
    materials() { return "materials"; }
    bind() { return "bind"; }
    querySelector() { return null; }
  }
  const dependencies = {
    apiFetch: async () => ({ ok: true, json: async () => ({}) }),
    appStore: { get: () => ({ view: "other" }), set() {}, update() {} },
    controlCenterMaterialRowsV1: () => [],
    controlCenterPublishV1() {},
    controlCenterRecordChangeV1: () => ({ id: "change" }),
    esc: (value) => String(value ?? ""),
    ico: () => "",
    notify() {},
    operationalHeaders: () => ({}),
  };

  installControlRecordDrawerV2(ViewLayer, dependencies);
  installMaterialTransitionV1(ViewLayer, dependencies);

  assert.notEqual(ViewLayer.prototype.render.name, "render");
  assert.notEqual(ViewLayer.prototype.materials.name, "materials");
  assert.notEqual(ViewLayer.prototype.bind.name, "bind");
  assert.equal(new ViewLayer().render(), "render");
  assert.equal(new ViewLayer().materials(), "materials");
  assert.equal(new ViewLayer().bind(), "bind");
});

test("control record accordion composition is owned by its record module", async () => {
  const selectors = [],
    state = { view: "control" };
  class ViewLayer {
    style = { removeProperty() {} };
    render() { return "control-render"; }
    querySelector(selector) { selectors.push(selector); return null; }
  }
  installControlRecordDrawerV2(ViewLayer, {
    appStore: { get: () => state },
    ico: () => "",
    documentRef: { createElement() { throw new Error("no accordion host expected"); } },
  });
  assert.equal(new ViewLayer().render(), "control-render");
  assert.ok(selectors.includes(".control-general-event"));
  assert.ok(selectors.includes("[data-control-stage-inline-record]"));
  assert.ok(selectors.includes(".control-center-page"));

  const [source, registration] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/records/records-workspace-registration-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installRecordsWorkspaceRegistrationV1\(\{[\s\S]*documentRef:globalThis\.document/);
  assert.match(registration, /controlRecordDrawerInstallerV1\(ViewLayer, \{[\s\S]*documentRef,[\s\S]*DateCtor/);
  assert.doesNotMatch(source, /renderBeforeControlRecordAccordionsV1/);
  assert.doesNotMatch(source, /control-inline-record-when-v1/);
});
