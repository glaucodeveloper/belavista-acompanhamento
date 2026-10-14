import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createLotDetailPageV1 } from "../../components/lots/lot-detail-page-v1.mjs";

const createPage = (state = {}, overrides = {}) => {
  const appStore = { get: () => state },
    page = createLotDetailPageV1({
      REPASSE_PRICE_CATALOG: [{ label: "A-01", lot: 1, quadra: "A", area: 250, price: 120000 }],
      commissionProfiles: [{ id: "seller-1", name: "Vendedora" }],
      appStore,
      esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
      formatBRL: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
      ico: (name) => `<i data-icon="${name}"></i>`,
      ...overrides,
    });
  return { appStore, page };
};

test("lot detail page renders the selected lot, commercial fields, payment plan, documents, and derived history", () => {
  const { page } = createPage({
    selectedLotDetailKey: "A-01",
    lotStatuses: { "A-01": { status: "Reservado", client: "Cliente <um>", payment: { status: "Parcial", amount: 3000 }, updatedAt: "2026-10-10T12:00:00Z" } },
    lotPaymentPlans: { "A-01": [{ id: "p1", description: "Entrada", amount: 3000, status: "Pago" }] },
    lotDocuments: { "A-01": [{ id: "d1", title: "Contrato", kind: "PDF", url: "/contrato.pdf" }] },
    lotHistory: { "A-01": [{ id: "h1", at: "2026-10-09T12:00:00Z", type: "Reserva", detail: "Registrada" }] },
    repasseEntries: [{ id: "e1", lot: "A-01", gross: 3000, description: "Entrada", date: "2026-10-11T12:00:00Z" }],
  });
  const html = page.render();
  for (const expected of [
    'data-lot-detail-page data-lot-key="A-01"',
    "Dados e controle comercial",
    "Cliente &lt;um&gt;",
    "Plano de pagamento",
    "data-lot-plan-edit=\"p1\"",
    "Documentos associados",
    "Abrir no GitHub",
    "Entrada registrada",
    "Controle comercial atualizado",
  ]) assert.ok(html.includes(expected), `missing ${expected}`);
});

test("lot detail exports use the persisted controls and preserve the existing workbook shape", () => {
  const actions = [],
    host = {
      Date,
      Blob: class { constructor(parts, options) { this.parts = parts; this.options = options; } },
      URL: { createObjectURL: (blob) => { actions.push(["blob", blob]); return "blob:lot-report"; }, revokeObjectURL: (url) => actions.push(["revoke", url]) },
      document: { createElement: () => ({ click() { actions.push(["download", this.href, this.download]); } }) },
      setTimeout: (fn) => { actions.push(["timer"]); fn(); },
    },
    { page } = createPage({ lotStatuses: { "A-01": { status: "Vendido", payment: { status: "Pago" }, sellerName: "Vendedora", client: "Cliente" } } }, { host }),
    exportedLot = page.lotExportRowV1({ label: "A-01", quadra: "A", area: 250, price: 120000 });
  assert.deepEqual(exportedLot, {
    label: "A-01", quadra: "A", area: 250, price: 120000,
    status: "Vendido", paymentStatus: "Pago", sellerName: "Vendedora", client: "Cliente", note: "",
  });
  page.downloadBrandedLotExcelV1({ lots: [exportedLot], title: "Ficha <A-01>" });
  const blob = actions.find(([kind]) => kind === "blob")[1];
  const workbook = blob.parts.join("");
  assert.equal(blob.options.type, "application/vnd.ms-excel;charset=utf-8");
  assert.match(workbook, /Ficha &lt;A-01&gt;/);
  assert.match(workbook, /VALOR À VISTA/);
  assert.match(workbook, /Vendedora/);
  assert.deepEqual(actions.filter(([kind]) => ["download", "revoke"].includes(kind)).map(([kind]) => kind), ["download", "revoke"]);
});

test("components.js installs the extracted lot detail page and reuses its export ports", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/commercial/commercial-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installCommercialApplicationCompositionV1\(/);
  assert.match(composition, /createLotDetailPageV1\(\{/);
  assert.match(composition, /ViewLayer\.prototype\["lot-detail"\] = lotDetailPageV1\.render/);
  assert.match(composition, /downloadBrandedLotExcelV1: lotDetailPageV1\.downloadBrandedLotExcelV1/);
  assert.match(composition, /lotExportRowV1: lotDetailPageV1\.lotExportRowV1/);
  assert.doesNotMatch(source, /const lotDetailStateV1 =/);
});
