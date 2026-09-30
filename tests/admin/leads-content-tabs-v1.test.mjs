import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("Leads separa triagem comercial de postagens e comentários do Instagram", () => {
  assert.match(components, /leadContentTab/);
  assert.match(components, /data-lead-content-tab="leads"/);
  assert.match(components, /data-lead-content-tab="instagram"/);
  assert.match(components, /Postagens e comentários/);
  assert.match(components, /activeContentTab === "instagram"/);
  assert.match(components, /data-instagram-feed-retry/);
  assert.match(components, /data-instagram-comment-draft/);
  assert.match(components, /admin-leads-admin-map-panel-v1/);
  assert.match(components, /Modelo 3D do loteamento/);
  assert.match(styles, /ADMIN_MAP_IN_LEADS_V1/);
  assert.match(styles, /admin-leads-content-tabs-v1/);
});
