import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("comissões usam registros horizontais de negociação", () => {
  assert.match(components, /commission-negotiations-page/);
  assert.match(components, /data-commission-record-open/);
  assert.match(components, /ÚLTIMAS TRANSAÇÕES DA NEGOCIAÇÃO/);
  assert.match(components, /commissionNegotiationTransactionsV1/);
  assert.match(components, /commission-negotiation-list/);
  assert.match(components, /FINAL_COMMISSION_RENDERER_V1/);
});

test("negociação detalhada possui formulário e anexos separados", () => {
  assert.match(app, /commission-deal/);
  assert.match(app, /brokers-board/);
  assert.match(components, /ViewLayer\.prototype\["commission-deal"\]/);
  assert.match(components, /data-commission-contract-attachment/);
  assert.match(components, /data-commission-client-attachments/);
  assert.match(components, /commissionDealAttachments/);
  assert.match(components, /data-commission-deal-form/);
  assert.match(components, /\/api\/commercial-sales/);
});

test("página de lotes tem rota, catálogo de preços e controle próprios", () => {
  assert.match(components, /ViewLayer\.prototype\["brokers-board"\]/);
  assert.match(components, /data-lot-price-catalog/);
  assert.match(components, /REPASSE_PRICE_CATALOG/);
  assert.match(components, /Valores por lote/);
  assert.match(components, /LOTEAMENTO · VISUALIZAÇÃO E CONTROLE/);
  assert.match(components, /data-repasse-config-field/);
  assert.match(components, /data-lot-catalog-filter/);
  assert.match(components, /data-lot-catalog-quadra/);
  assert.match(components, /data-lot-catalog-status/);
  assert.match(components, /data-lot-catalog-payment/);
  assert.match(components, /data-lot-catalog-seller/);
  assert.match(components, /data-lot-catalog-quadra/);
  assert.match(components, /data-lot-catalog-status/);
  assert.match(components, /data-lot-catalog-payment/);
  assert.match(components, /data-lot-catalog-seller/);
  assert.match(components, /data-lot-select/);
  assert.match(components, /data-lot-catalog-row/);
  assert.match(components, /lot-status-modal/);
  assert.match(components, /data-lot-status-form/);
  assert.match(components, /lotStatuses/);
  assert.match(components, /sellerId/);
  assert.match(components, /paymentStatus/);
  assert.match(components, /paymentAmount/);
  assert.match(components, /repassePartnerId/);
  assert.match(styles, /\.brokers-board-page/);
  assert.match(styles, /\.lot-price-catalog-card/);
  assert.match(styles, /\.lot-catalog-action/);
  assert.match(styles, /\.lot-status-dialog/);
  assert.match(styles, /\.lot-status-form-section/);
  assert.match(styles, /\.commission-negotiation-row/);
});

test("rota lotes normaliza o identificador legado e menu não aponta para telas removidas", () => {
  assert.match(app, /viewAliasesV1/);
  assert.match(app, /lotes:'brokers-board'/);
  assert.doesNotMatch(app, /directViewsV1\.add\('documents'\)/);
  assert.doesNotMatch(app, /directViewsV1\.add\('materials'\)/);
  assert.match(components, /Área removida da navegação/);
});

test("rota lotes normaliza o identificador legado e menu não aponta para telas removidas", () => {
  assert.match(app, /viewAliasesV1/);
  assert.match(app, /lotes:'brokers-board'/);
  assert.doesNotMatch(app, /directViewsV1\.add\('documents'\)/);
  assert.doesNotMatch(app, /directViewsV1\.add\('materials'\)/);
  assert.match(components, /Área removida da navegação/);
});
