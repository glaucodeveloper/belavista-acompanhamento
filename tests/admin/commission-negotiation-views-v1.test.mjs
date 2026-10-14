import test from "node:test";
import assert from "node:assert/strict";
import { createCommissionNegotiationViewsV1 } from "../../components/commercial/commission-negotiation-views-v1.mjs";
import { commissionDeals, commissionProfiles } from "../../components/commercial/commission-catalog-v1.mjs";

const createViews = (state = {}) => createCommissionNegotiationViewsV1({
  appStore: { get: () => state, set() {} },
  commissionDeals,
  commissionProfiles,
  esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
  ico: (name) => `<i data-icon="${name}"></i>`,
  formatBRL: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
  brlToNumber: (value) => Number(String(value || "").replace(/[^\d.]/g, "")) || 0,
  contractStatusClassV1: (value) => String(value || "").toLowerCase().replaceAll(" ", "-"),
  FileReader: class FileReader {},
  Date,
  FormData: class FormData { entries() { return []; } },
  apiFetch: async () => ({ ok: true, json: async () => ({ sales: [] }) }),
  operationalHeaders: (headers) => headers,
  notify() {},
  windowRef: { print() {} },
  logger: { info() {} },
});

test("commission view service preserves catalog-backed negotiation list and detail controls", () => {
  const deal = commissionDeals[0];
  const views = createViews({ selectedCommissionNegotiation: deal.id });
  const list = views.commissionNegotiationsMarkupV1({});
  const detail = views.commissionDealMarkupV1();

  assert.match(list, /class="commission-negotiations-page"/);
  assert.match(list, /data-commission-record-open=/);
  assert.match(list, /ÚLTIMAS TRANSAÇÕES DA NEGOCIAÇÃO/);
  assert.match(detail, /class="commission-deal-form"/);
  assert.match(detail, /data-commission-contract-attachment/);
  assert.match(detail, /data-commission-client-attachments/);
  assert.equal(views.commissionNegotiationDealsV1({}).length, commissionDeals.length);
  assert.equal(views.commissionNegotiationProfileV1(deal.profile)?.id, deal.profile);
  assert.ok(Object.isFrozen(views));
});

test("commission view service validates its injected dependencies", () => {
  assert.throws(() => createCommissionNegotiationViewsV1(), /require appStore.get/);
});
