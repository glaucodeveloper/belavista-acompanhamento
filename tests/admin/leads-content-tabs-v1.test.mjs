import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const leadsRegistration = fs.readFileSync(path.join(root, "components/commercial/leads-directory-registration-v1.mjs"), "utf8");
const leadsModule = fs.readFileSync(path.join(root, "components/commercial/leads-directory-v1.mjs"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("Leads separa triagem comercial de postagens e comentários do Instagram", () => {
  assert.match(components, /installLeadsDirectoryRegistrationV1\(\{/);
  assert.match(leadsRegistration, /installAdminLeadsDirectoryV1\(ViewLayer/);
  assert.match(leadsModule, /leadContentTab/);
  assert.match(leadsModule, /data-lead-content-tab="leads"/);
  assert.match(leadsModule, /data-lead-content-tab="instagram"/);
  assert.match(leadsModule, /Postagens e comentários/);
  assert.match(leadsModule, /activeContentTab === "instagram"/);
  assert.match(leadsModule, /data-instagram-feed-retry/);
  assert.match(leadsModule, /data-instagram-comment-draft/);
  assert.match(leadsModule, /admin-leads-admin-map-panel-v1/);
  assert.match(leadsModule, /Modelo 3D do loteamento/);
  assert.match(styles, /ADMIN_MAP_IN_LEADS_V1/);
  assert.match(styles, /admin-leads-content-tabs-v1/);
});
