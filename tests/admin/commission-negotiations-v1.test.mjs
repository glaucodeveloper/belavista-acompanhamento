import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const commercialApplication = fs.readFileSync(path.join(root, "components/commercial/commercial-application-composition-v1.mjs"), "utf8");
const legacyLots = fs.readFileSync(path.join(root, "components/commercial/legacy-brokers-board-v1.mjs"), "utf8");
const commercialBindings = fs.readFileSync(path.join(root, "components/commercial/commercial-views-bind-v1.mjs"), "utf8");
const lotFeatures = components + commercialApplication + legacyLots + commercialBindings;
const commissionViews = fs.readFileSync(path.join(root, "components/commercial/commission-negotiation-views-v1.mjs"), "utf8");
const brokerProfiles = fs.readFileSync(path.join(root, "components/commercial/brokers-page.mjs"), "utf8");
const brokerProfileRegistration = fs.readFileSync(path.join(root, "components/commercial/broker-profile-registration-v1.mjs"), "utf8");
const commissionPageRenderers = fs.readFileSync(path.join(root, "components/commercial/commission-page-renderers-v1.mjs"), "utf8");
const commercialDirectoryRegistration = fs.readFileSync(path.join(root, "components/commercial/commercial-directory-contracts-registration-v1.mjs"), "utf8");
const commercialEvents = fs.readFileSync(path.join(root, "components/shared/application-event-composition-v1.mjs"), "utf8");
const sidebarRoutes = fs.readFileSync(path.join(root, "components/shared/sidebar-route-controller-v1.mjs"), "utf8");
const applicationRoutes = fs.readFileSync(path.join(root, "components/shared/application-navigation-routes-v1.mjs"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("comissões usam registros horizontais de negociação", () => {
  assert.match(commissionViews, /commission-negotiations-page/);
  assert.match(commissionViews, /data-commission-record-open/);
  assert.match(commissionViews, /ÚLTIMAS TRANSAÇÕES DA NEGOCIAÇÃO/);
  assert.match(commissionViews, /commissionNegotiationTransactionsV1/);
  assert.match(commissionViews, /commission-negotiation-list/);
  assert.match(components, /FINAL_COMMISSION_RENDERER_V1/);
  assert.match(components, /installCommercialApplicationCompositionV1\(/);
  assert.match(commercialApplication, /createCommissionNegotiationViewsV1\(/);
  assert.equal((commissionPageRenderers.match(/ViewLayer\.prototype\.commissions\s*=/g) || []).length, 1);
  assert.equal((commissionPageRenderers.match(/ViewLayer\.prototype\.brokers\s*=/g) || []).length, 1);
  assert.doesNotMatch(components, /commissionsTemplate|commission-entry-form/);
});

test("perfil comercial tem um único renderer ativo no módulo do domínio", () => {
  assert.doesNotMatch(components, /ViewLayer\.prototype\.commissionProfile\s*=\s*function/);
  assert.match(brokerProfiles, /ViewLayer\.prototype\.commissionProfile\s*=\s*function/);
  assert.match(components, /installBrokerProfileRegistrationV1\(\{/);
  assert.match(brokerProfileRegistration, /installBrokerProfilePageV2\(ViewLayer/);
  assert.match(components, /installCommercialDirectoryContractsRegistrationV1\(\{/);
  assert.doesNotMatch(components, /v7-brokers-page|commission-directory-v5426/);
  assert.doesNotMatch(components, /commissionDirectoryBindV5426/);
  assert.doesNotMatch(components, /recordsStageEntryFinalBindV1|commissionDirectoryPage|data-commission-directory-page/);
  assert.match(commercialDirectoryRegistration, /installBrokersPageV1\(ViewLayer/);
  assert.match(components, /installCommissionPageRenderersV1\(ViewLayer/);
  assert.match(commissionPageRenderers, /ViewLayer\.prototype\.commissions = function \(\) \{\s*return commissionNegotiationsMarkupV1/);
  assert.match(commercialEvents, /installCommercialWorkspaceEventsV7\(ViewLayer/);
});

test("negociação detalhada possui formulário e anexos separados", () => {
  assert.match(applicationRoutes, /"commission-deal": "control"/);
  assert.match(applicationRoutes, /"brokers-board"/);
  assert.match(commissionViews, /commission-deal-form/);
  assert.match(commercialApplication, /ViewLayer\.prototype\["commission-deal"\] = negotiation\.commissionDealMarkupV1/);
  assert.match(commissionViews, /data-commission-contract-attachment/);
  assert.match(commissionViews, /data-commission-client-attachments/);
  assert.match(commissionViews, /commissionDealAttachments/);
  assert.match(commissionViews, /data-commission-deal-form/);
  assert.match(commissionViews, /\/api\/commercial-sales/);
  assert.match(commercialBindings, /bindCommissionNegotiationEventsV1\(this\)/);
  assert.doesNotMatch(components, /data-commission-deal-form/);
});

test("página de lotes tem rota, catálogo de preços e controle próprios", () => {
  assert.match(components, /installCommercialApplicationCompositionV1\(/);
  assert.match(commercialApplication, /installLegacyBrokersBoardV1\(ViewLayer/);
  assert.match(legacyLots, /ViewLayer\.prototype\["brokers-board"\]/);
  assert.match(commercialBindings, /data-lot-price-catalog/);
  assert.match(lotFeatures, /REPASSE_PRICE_CATALOG/);
  assert.match(lotFeatures, /Valores por lote/);
  assert.match(lotFeatures, /LOTEAMENTO · VISUALIZAÇÃO E CONTROLE/);
  assert.match(lotFeatures, /data-repasse-config-field/);
  assert.match(lotFeatures, /data-lot-catalog-filter/);
  assert.match(lotFeatures, /data-lot-catalog-quadra/);
  assert.match(lotFeatures, /data-lot-catalog-status/);
  assert.match(lotFeatures, /data-lot-catalog-payment/);
  assert.match(lotFeatures, /data-lot-catalog-seller/);
  assert.match(lotFeatures, /data-lot-catalog-quadra/);
  assert.match(lotFeatures, /data-lot-catalog-status/);
  assert.match(lotFeatures, /data-lot-catalog-payment/);
  assert.match(lotFeatures, /data-lot-catalog-seller/);
  assert.match(lotFeatures, /data-lot-select/);
  assert.match(lotFeatures, /data-lot-catalog-row/);
  assert.match(lotFeatures, /lot-status-modal/);
  assert.match(lotFeatures, /data-lot-status-form/);
  assert.doesNotMatch(components, /lot-status-entry-section/);
  assert.doesNotMatch(components, /Adicionar repasse/);
  assert.doesNotMatch(components, /data-lot-control-repasse/);
  assert.match(lotFeatures, /lotStatuses/);
  assert.match(lotFeatures, /sellerId/);
  assert.match(lotFeatures, /paymentStatus/);
  assert.match(lotFeatures, /paymentAmount/);
  assert.match(lotFeatures, /repassePartnerId/);
  assert.match(styles, /\.brokers-board-page/);
  assert.match(styles, /\.lot-price-catalog-card/);
  assert.match(styles, /\.lot-catalog-action/);
  assert.match(styles, /\.lot-status-dialog/);
  assert.match(styles, /\.lot-status-form-section/);
  assert.match(styles, /\.commission-negotiation-row/);
});

test("rota lotes normaliza o identificador legado e menu não aponta para telas removidas", () => {
  assert.match(app, /resolveApplicationRouteV1/);
  assert.match(applicationRoutes, /lotes:\s*"brokers-board"/);
  assert.doesNotMatch(applicationRoutes, /directViewsV1\.add\('documents'\)/);
  assert.doesNotMatch(applicationRoutes, /directViewsV1\.add\('materials'\)/);
  assert.match(sidebarRoutes, /Área removida da navegação/);
});
