import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installRecordOcrDynamicBridgeV21 } from "../../components/records/record-ocr-dynamic-bridge-v21.mjs";

test("OCR bridge publishes the same live ports and bounded stage context for its consumers", () => {
  const appStore = { get() {} }, apiFetch = () => {}, operationalHeaders = () => {},
    executionModel = { stages: [{
      key: "drain", name: "Drenagem", description: "Rede pluvial", production: { unit: "m" },
      executionProfile: { requestHints: ["Caimento"], materialsTable: [{ name: "Tubo PEAD" }] },
      activities: [{ id: "excavate", name: "Abrir vala", description: "Conferir cota" }],
    }] },
    host = {},
    bridge = installRecordOcrDynamicBridgeV21({
      host, apiFetch, operationalHeaders, appStore, executionModel,
      stageProfileSettingsFor: () => ({ evidenceFocus: ["Medição"] }),
    });

  assert.equal(host.__BELAVISTA_RECORD_OCR_BRIDGE_V21, bridge);
  assert.equal(bridge.apiFetch, apiFetch);
  assert.equal(bridge.operationalHeaders, operationalHeaders);
  assert.equal(bridge.appStore, appStore);
  assert.deepEqual(bridge.stages, [{
    key: "drain", name: "Drenagem", description: "Rede pluvial",
    activityHints: ["Caimento", "Medição"],
    activities: [{ id: "excavate", name: "Abrir vala", description: "Conferir cota" }],
    unit: "m", materials: ["Tubo PEAD"],
  }]);
});

test("record composition delegates OCR bridge creation and keeps consumers on the established global contract", async () => {
  const [components, composition, moduleSource, ocrConsumer, chatConsumer] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/records/record-application-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/records/record-ocr-dynamic-bridge-v21.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../record-ocr-dynamic-v21.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../worker-context-chat.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(components, /installRecordApplicationCompositionV1\(\{/);
  assert.match(composition, /installRecordOcrDynamicBridgeV21\(\{/);
  assert.doesNotMatch(components, /installRecordOcrDynamicBridgeV21\(/);
  assert.doesNotMatch(components, /globalThis\.__BELAVISTA_RECORD_OCR_BRIDGE_V21\s*=\s*\{/);
  assert.match(moduleSource, /__BELAVISTA_RECORD_OCR_BRIDGE_V21\s*=/);
  assert.match(ocrConsumer, /globalThis\.__BELAVISTA_RECORD_OCR_BRIDGE_V21/);
  assert.match(chatConsumer, /__BELAVISTA_RECORD_OCR_BRIDGE_V21/);
});
