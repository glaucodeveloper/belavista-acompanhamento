import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const brokerControl = fs.readFileSync(path.join(root, "components/commercial/broker-control-page-v1.mjs"), "utf8");

test("configurações reutiliza a grade histórica de corretores", () => {
  assert.match(components, /ViewLayer\.prototype\.settings\s*=\s*function/);
  assert.match(components, /return brokersControlV8\.apply\(this, args\)/);
  assert.match(brokerControl, /broker-control-grid/);
  assert.match(brokerControl, /data-v8-reason-form/);
  assert.match(brokerControl, /data-v7-period/);
});
