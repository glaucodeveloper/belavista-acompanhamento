import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("root event composition preserves prototype, registration, and installer order", async () => {
  const [components, composition] = await Promise.all([
    read("components.js"),
    read("components/shared/application-event-composition-v1.mjs"),
  ]);
  const calls = [
    "ViewLayer.prototype.bind = function ()",
    "installOperationalIntelligenceEventsV1(ViewLayer, {",
    'customElementsRef.define("view-layer", ViewLayer)',
    "installCommercialWorkspaceEventsV7(ViewLayer, {",
    "installOperationalSettingsWorkspaceV1(ViewLayer, {",
    "installLeadsOperationalCrmV1(ViewLayer, {",
    "ViewLayer.prototype.bindCommercialPagesV7 = function ()",
    "ViewLayer.prototype.brokers = brokersControlV8",
    "installFinancePageV8(ViewLayer, financeWorkspaceV8, appStore)",
  ].map((call) => composition.indexOf(call));

  assert.match(components, /installApplicationEventCompositionV1\(\{/);
  assert.match(components, /\{ operationalSettingsWorkspaceV1 \} = installApplicationEventCompositionV1/);
  assert.ok(calls.every((position) => position >= 0));
  assert.deepEqual(calls, [...calls].sort((left, right) => left - right));
  for (const installer of [
    "installOperationalIntelligenceEventsV1(",
    "installCommercialWorkspaceEventsV7(",
    "installOperationalSettingsWorkspaceV1(",
    "installLeadsOperationalCrmV1(",
    "installFinancePageV8(",
  ]) assert.equal(components.includes(installer), false, `${installer} remains in components.js`);
});

test("root event composition receives the same runtime dependencies and returns settings integration", async () => {
  const [components, composition] = await Promise.all([
    read("components.js"),
    read("components/shared/application-event-composition-v1.mjs"),
  ]);
  for (const dependency of [
    "bindLeadsMapConversationV1", "brokersControlV8", "financeWorkspaceV8",
    "actionsPageV1", "raciPageV1", "raidPageV1", "readIntegrationSettings",
    "registerOperationalDevice", "syncLiveSystemReportV1", "customElementsRef: globalThis.customElements",
  ]) assert.ok(components.includes(dependency), `components.js omits ${dependency}`);
  for (const dependency of [
    "localStorageRef: storage", "commissionProfiles", "document: documentRef",
    "settingsAuditTemplate", "bindControlPageEventsV8.call(this)",
    "operationalSettingsWorkspaceV1",
  ]) assert.ok(composition.includes(dependency), `event composition omits ${dependency}`);
});
