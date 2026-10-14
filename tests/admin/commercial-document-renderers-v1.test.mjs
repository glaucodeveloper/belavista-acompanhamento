import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installCommercialDocumentRenderersV1 } from "../../components/commercial/commercial-document-renderers-v1.mjs";

test("shared commercial document renderers install into ViewLayer and preserve proposal/contract output", async () => {
  class ViewLayer {}
  const profile = { id: "broker-1", name: "Aline", role: "Corretora", creci: "123" };
  installCommercialDocumentRenderersV1(ViewLayer, {
    commissionProfiles: [profile],
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
  });
  const view = new ViewLayer();
  const deal = {
    id: "PROP-1", profile: profile.id, client: "Cliente", cpf: "000",
    lot: "Q1-L2", quadra: "Quadra 1, lote 2", value: "R$ 100.000,00",
    payment: "Entrada", rate: "6%", commission: "R$ 6.000,00",
    status: "Proposta", stage: "Em análise", purpose: "Moradia", date: "12/10/2026",
  };

  assert.match(view.commissionProposal(deal), /proposal-page-v5427/);
  assert.match(view.commissionProposal(deal), /PROPOSTA · PROP-1/);
  assert.match(view.commissionContract(deal), /CONTRATO Nº PROP-1/);
  assert.match(view.commissionContract(deal), /Aline/);

  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(root, /installCommercialDocumentRenderersV1\(ViewLayer, \{ commissionProfiles, esc, ico \}\)/);
  const history = await readFile(new URL("../../components/commercial/commission-history-controls-v1.mjs", import.meta.url), "utf8");
  assert.match(history, /const commissionContractWithHistory = ViewLayer\.prototype\.commissionContract/);
  assert.match(root, /installCommissionHistoryControlsV1\(ViewLayer/);
  assert.ok(root.indexOf("installCommercialDocumentRenderersV1(ViewLayer") < root.indexOf("installCommissionHistoryControlsV1(ViewLayer"));
});
