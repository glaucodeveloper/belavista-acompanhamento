import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  PROPOSAL_VISION_PROMPT,
  normalizeProposalVisionDraft,
  parseProposalVisionPayload,
} from "../../proposal-vision.mjs";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("contrato da inferência visual está ligado ao formulário e ao endpoint NVIDIA", () => {
  const components = read("components.js");
  const contracts = read("components/commercial/contracts-page-v1.mjs");
  const server = read("server.mjs");
  const firebase = read("firebase.mjs");

  assert.match(components, /installCommercialDirectoryContractsRegistrationV1\(\{/);
  assert.match(contracts, /\/api\/ai\/vision-reasoning/);
  assert.match(contracts, /readProposalImageAsDataUrl/);
  assert.match(contracts, /parseProposalVisionPayload/);
  assert.match(contracts, /inference: form\._proposalInference/);
  assert.match(server, /return \{\.\.\.parsed,\.\.\.toolEnvelope/);
  assert.match(firebase, /inference:input\.inference/);
  for (const field of ["client", "lot", "value", "payment"]) {
    assert.match(PROPOSAL_VISION_PROMPT, new RegExp(`"${field}"`));
  }
});

test("normaliza proposta retornada pela resposta estruturada", () => {
  const draft = parseProposalVisionPayload({
    proposal: {
      client: "Maria de Souza",
      lot: "Lote 12",
      value: "R$ 185.000,00",
      payment: "Entrada + 24 parcelas",
      confidence: 1.4,
    },
  });

  assert.deepEqual(draft, {
    client: "Maria de Souza",
    lot: "Lote 12",
    value: "R$ 185.000,00",
    payment: "Entrada + 24 parcelas",
    quadra: "",
    lotArea: "",
    seller: "",
    confidence: 1,
  });
});

test("aceita JSON encapsulado em texto e não inventa campos ausentes", () => {
  const draft = parseProposalVisionPayload({
    text: JSON.stringify({
      proposal: {
        cliente: "João Silva",
        lote: "QD-04 LT-08",
        valor: "R$ 210.000,00",
        condicao: "Financiamento direto",
        confidence: 0.72,
      },
    }),
  });

  assert.equal(draft.client, "João Silva");
  assert.equal(draft.lot, "QD-04 LT-08");
  assert.equal(draft.value, "R$ 210.000,00");
  assert.equal(draft.payment, "Financiamento direto");
  assert.equal(draft.seller, "");
  assert.equal(draft.confidence, 0.72);
  assert.equal(normalizeProposalVisionDraft({}), null);
});
