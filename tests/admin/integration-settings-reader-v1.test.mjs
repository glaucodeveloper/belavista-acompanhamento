import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  INTEGRATION_SETTINGS_KEY,
  createIntegrationSettingsReaderV1,
} from "../../components/shared/integration-settings-reader-v1.mjs";

test("integration settings reader uses the original key and lazy injected storage", () => {
  const values = new Map([["belavista.integrations.v1", JSON.stringify({ stageProfiles: { drainage: ["pipe"] } })]]);
  const storageCalls = [];
  const readIntegrationSettings = createIntegrationSettingsReaderV1({
    getStorage: () => ({
      getItem(key) { storageCalls.push(key); return values.get(key) ?? null; },
    }),
  });

  assert.equal(INTEGRATION_SETTINGS_KEY, "belavista.integrations.v1");
  assert.deepEqual(storageCalls, []);
  assert.deepEqual(readIntegrationSettings(), { stageProfiles: { drainage: ["pipe"] } });
  assert.deepEqual(storageCalls, [INTEGRATION_SETTINGS_KEY]);
});

test("integration settings reader preserves empty and malformed-storage recovery", () => {
  assert.deepEqual(createIntegrationSettingsReaderV1({
    getStorage: () => ({ getItem: () => null }),
  })(), {});
  assert.deepEqual(createIntegrationSettingsReaderV1({
    getStorage: () => ({ getItem: () => "not-json" }),
  })(), {});
  assert.deepEqual(createIntegrationSettingsReaderV1({
    getStorage: () => { throw new Error("storage unavailable"); },
  })(), {});
});

test("components.js delegates integration settings reads but retains the shared storage key", async () => {
  const [source, settings] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/commercial/operational-settings-workspace-v1.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(source, /import \{ INTEGRATION_SETTINGS_KEY, createIntegrationSettingsReaderV1 \} from "\.\/components\/shared\/integration-settings-reader-v1\.mjs\?v=integration-settings-reader-v1"/);
  assert.match(source, /const readIntegrationSettings = createIntegrationSettingsReaderV1\(\{\s*getStorage: \(\) => globalThis\.localStorage,/);
  assert.match(source, /installOperationalSettingsWorkspaceV1\(ViewLayer/);
  assert.match(settings, /storage\.setItem\(integrationSettingsKey/);
  assert.doesNotMatch(source, /const INTEGRATION_SETTINGS_KEY = "belavista\.integrations\.v1"/);
});
