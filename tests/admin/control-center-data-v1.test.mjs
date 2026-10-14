import test from "node:test";
import assert from "node:assert/strict";
import { createControlCenterDataV1 } from "../../components/planning/control-center-data-v1.mjs";

const createHarness = () => {
  let state = { currentActor: { name: "Operador" } };
  const events = [],
    appStore = {
      get: () => state,
      update: (updater) => { state = updater(state); },
    },
    services = createControlCenterDataV1({
      appStore,
      formatBRL: (value) => `R$ ${value.toFixed(2)}`,
      publishOperationalEvent: async (event) => { events.push(event); },
      esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
      ico: (name) => `<i data-icon="${name}"></i>`,
      Date: class extends Date {
        static now() { return 1_700_000_000_000; }
      },
    });
  return { services, events, read: () => state };
};

test("Control Center material projection keeps assistant provenance, record evidence and overrides", () => {
  const { services } = createHarness();
  const projected = services.controlCenterMaterialRowsV1({
    records: [{ id: "REC-1", attachments: [{ fileName: "nota.pdf" }], properties: [{ id: "from-record" }] }],
    controlMaterialOverrides: { "MAT-1": { quantity: 12 }, "MAT-DELETED": { deleted: true } },
    materialCatalogAdditions: [
      { id: "MAT-1", sourceRecordId: "REC-1", name: "Tubos", source: "chat-visual", stageKey: "water", quantity: 2 },
      { id: "MAT-DELETED", name: "Excluir", source: "chat-visual" },
      { id: "MAT-OTHER", name: "Ignorar", source: "manual" },
      { id: "MAT-OCR", name: "Concreto", properties: { allocation_source: "OCR operacional" } },
    ],
  });

  assert.deepEqual(projected.map((item) => item.id), ["MAT-1", "MAT-OCR"]);
  assert.equal(projected[0].quantity, 12);
  assert.deepEqual(projected[0].attachments, [{ fileName: "nota.pdf" }]);
  assert.deepEqual(projected[0].properties, [{ id: "from-record" }]);
  assert.equal(services.isAssistantVisualAdditionV1({ properties: { allocation_source: "leitura visual" } }), true);
  assert.equal(services.isAssistantVisualAdditionV1({ source: "manual" }), false);
});

test("Control Center finance projection preserves its source ordering and money formatting", () => {
  const { services } = createHarness();
  const rows = Array.from({ length: 12 }, (_, index) => ({ id: `cash-${index}` }));
  assert.deepEqual(services.controlCenterFinanceRowsV1({ cashFlowLocal: rows }).map((row) => row.id), rows.slice(0, 10).map((row) => row.id));
  assert.equal(services.controlCenterFinanceRowsV1({})[0].id, "DEMO-CAIXA-01");
  assert.equal(services.controlCenterMoneyV1({ amount: "12.5" }), "R$ 12.50");
});

test("Control Center records local changes and forwards operational events with actor and project", async () => {
  const { services, events, read } = createHarness();
  const entry = services.controlCenterRecordChangeV1("Material atualizado", "Tubos · quantidade 12", { id: "MAT-1" });
  assert.equal(entry.id, "CTRL-LOYW3V28");
  assert.equal(entry.actor, "Operador");
  assert.equal(read().controlChangeLog[0], entry);
  assert.equal(read().lastAction, "Central ouviu: Material atualizado");

  await services.controlCenterPublishV1("material.updated", "material", "MAT-1", { quantity: 12 });
  assert.deepEqual(events[0], {
    actor: { name: "Operador" }, type: "material.updated", entity: "material", entityId: "MAT-1",
    payload: { quantity: 12, projectId: "project-alianca-park" },
  });
});

test("Control Center material accordion renders grouped real rows and escapes source text", () => {
  const { services } = createHarness();
  const html = services.controlCenterMaterialsAccordionMarkupV1(
    [{ id: "MAT<1", stageKey: "water", name: "Tubo & conexão", activityName: "Rede <água>", quantity: 5, unit: "m", status: "Planejado" }],
    [{ key: "water", name: "Drenagem <e água>" }],
  );
  assert.match(html, /ETAPA · water/);
  assert.match(html, /Drenagem &lt;e água>/);
  assert.match(html, /Tubo &amp; conexão/);
  assert.match(html, /data-control-material-id="MAT&lt;1"/);
  assert.match(services.controlCenterMaterialsAccordionMarkupV1([], []), /Nenhum material ou equipamento/);
});

test("Control Center data factory rejects missing application services", () => {
  assert.throws(() => createControlCenterDataV1(), /appStore\.get\(\) and appStore\.update\(\)/);
  assert.throws(() => createControlCenterDataV1({
    appStore: { get() {}, update() {} },
  }), /requires formatBRL\(\)/);
});
