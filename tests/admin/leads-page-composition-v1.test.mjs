import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const compositionUrl = new URL(
  "../../components/commercial/leads-page-composition-v1.mjs",
  import.meta.url,
);

test("components.js delegates the historical Leads render composition to commercial", async () => {
  const [composition, page] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(compositionUrl, "utf8"),
  ]);

  assert.match(
    composition,
    /import \{ installLeadsPageCompositionV1 \} from "\.\/components\/commercial\/leads-page-composition-v1\.mjs\?v=leads-operational-crm-v1"/,
  );
  assert.match(
    composition,
    /installLeadsPageCompositionV1\(ViewLayer, \{ appStore, demoData, esc, ico \}\)/,
  );
  assert.doesNotMatch(composition, /const leadsScreenTemplate = ViewLayer\.prototype\.leads/);
  assert.doesNotMatch(composition, /const leadsReferenceTemplate = ViewLayer\.prototype\.leads/);
  assert.equal((page.match(/ViewLayer\.prototype\.leads = function/g) || []).length, 4);
  assert.match(page, /leads-reference-layout/);
  assert.match(page, /data-lead-toolbar-filter="query"/);
});

test("website reservation CRM renderer and validation handler live in the same commercial module", async () => {
  const [root, events, page] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/shared/application-event-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(compositionUrl, "utf8"),
  ]);

  assert.match(
    events,
    /installLeadsOperationalCrmV1\(ViewLayer, \{[\s\S]*?apiFetch,[\s\S]*?operationalHeaders,[\s\S]*?notify,/,
  );
  assert.match(root, /installApplicationEventCompositionV1\(\{/);
  assert.doesNotMatch(events, /const leadsPublicAndMapTemplate = ViewLayer\.prototype\.leads/);
  assert.doesNotMatch(events, /this\.querySelectorAll\("\[data-lead-card\]"\)/);
  assert.match(page, /data-lead-card=/);
  assert.match(page, /\/api\/commercial-sales\//);
  assert.match(page, /loadCommercialReservations\(\)/);
});
