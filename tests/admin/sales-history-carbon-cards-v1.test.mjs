import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("histórico preserva os dados comerciais em cards Atlas sem grid Carbon", () => {
  const components = read("components/index.mjs");
  const registration = read("components/commercial/commercial-history-registration-v1.mjs");
  const salesHistory = read("components/commercial/sales-history-page-v1.mjs");
  const styles = read("styles.css");
  const atlasStyles = read("atlas-operational-design-v1.css");

  assert.match(components, /installCommercialHistoryRegistrationV1\(\{/);
  assert.match(registration, /ViewLayer\.prototype\["sales-history"\] = createSalesHistoryPageV1/);
  assert.match(salesHistory, /class="sales-history-card"/);
  assert.match(salesHistory, /class="sales-history-card-summary"/);
  assert.match(salesHistory, /class="sales-history-card-details"/);
  assert.match(salesHistory, /data-history-open=/);
  assert.match(salesHistory, /sales-history-report-grid/);
  assert.match(salesHistory, /sales-history-search-toolbar/);
  assert.match(registration, /installCommercialHistoryPageEventsV1\(ViewLayer/);
  assert.match(salesHistory, /data-history-edit-deal/);
  assert.doesNotMatch(styles, /SALES_HISTORY_CARBON_CARDS_V1/);
  assert.doesNotMatch(styles, /\.sales-history-page \.sales-history-list>\.sales-history-card\{[^}]*background:#262626/);
  assert.match(styles, /\.sales-history-page \.sales-history-list>\.sales-history-card\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(atlasStyles, /view-layer\[data-view="sales-history"\] \.sales-history-summary > article/);
  assert.match(atlasStyles, /view-layer\[data-view="sales-history"\] \.sales-history-list > \.sales-history-card\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/);
});
