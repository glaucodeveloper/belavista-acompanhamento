import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createViewLayerV1 } from "../../components/shared/view-layer-v1.mjs";

test("ViewLayer factory preserves the original custom-element lifecycle and render entry points", () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = class HTMLElement {};
  try {
    const ViewLayer = createViewLayerV1();
    for (const method of ["connectedCallback", "disconnectedCallback", "render", "bind"])
      assert.equal(typeof ViewLayer.prototype[method], "function", `${method} remains available`);
  } finally {
    if (previousHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = previousHTMLElement;
  }
});

test("components.js delegates render decorators to their owning application modules", async () => {
  const [source, applicationElements, applicationEvents, recordModule, planningModule, lotModule] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/shared/application-elements-registration-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/shared/application-event-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/records/control-record-drawer-v2.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/stages-map-runtime-guard-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/lots/lot-development-page-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /registerApplicationElementsV1\(\{/);
  assert.match(source, /installApplicationEventCompositionV1\(\{/);
  assert.match(applicationElements, /createViewLayerV1/);
  assert.match(applicationElements, /ViewLayer = createViewLayer\(viewLayerDependencies\)/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.render = function/);
  assert.match(recordModule, /ViewLayer\.prototype\.render = function/);
  assert.match(planningModule, /ViewLayer\.prototype\.render = function/);
  assert.match(lotModule, /ViewLayer\.prototype\.render = function/);
  assert.match(applicationEvents, /customElementsRef\.define\("view-layer", ViewLayer\)/);
});
