import test from "node:test";
import assert from "node:assert/strict";
import { installRepassePageV1 } from "../../components/finance/repasse-page-v1.mjs";

test("repasses liga perfis somente a lotes identificados no catálogo e mantém os dados comerciais persistidos", () => {
  const previousDocument = globalThis.document;
  let clickHandler;
  globalThis.document = { addEventListener(type, handler) { if (type === "click") clickHandler = handler; } };
  try {
    const state = {
        view: "repasses",
        repasseLedgerV1: {
          status: "ready",
          entries: [],
          sales: [
            { id: "sale-1", lot: "QA-1", client: "Cliente A", broker: "Corretora A", status: "Assinado", valueCents: 100000 },
            { id: "sale-2", lot: "qa-1", client: "Cliente B", broker: "Corretora B", status: "Reserva", valueCents: 50000 },
            { id: "sale-3", lot: "Lote fora do catálogo", client: "Cliente C", broker: "Corretor C", status: "Reserva", valueCents: 75000 },
          ],
          reasons: [],
        },
      },
      writes = [],
      appStore = { get: () => state, set: (patch) => { writes.push(patch); Object.assign(state, patch); } },
      ViewLayer = function () {};
    installRepassePageV1(ViewLayer, {
      appStore,
      esc: (value) => String(value ?? ""),
      ico: () => "",
      REPASSE_PRICE_CATALOG: [{ label: "QA-1" }],
    });

    const markup = ViewLayer.prototype.repasses.call({});
    assert.match(markup, /Perfis de lote relacionados/);
    assert.match(markup, /QA-1/);
    assert.match(markup, /2 venda\(s\) registrada\(s\)/);
    assert.match(markup, /Cliente A · Cliente B/);
    assert.match(markup, /Sem correspondência no catálogo/);
    assert.equal((markup.match(/data-repasse-lot-profile=/g) || []).length, 1);

    clickHandler({ target: { closest: () => ({ dataset: { repasseLotProfile: "QA-1" } }) } });
    assert.deepEqual(writes.at(-1), {
      view: "lot-detail",
      selectedLotDetailKey: "QA-1",
      lastAction: "Abriu o perfil de lote QA-1 pelos repasses",
    });
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
