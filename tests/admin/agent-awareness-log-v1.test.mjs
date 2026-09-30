import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("ciência do agente expõe registros expansíveis e passos temporizados", () => {
  assert.match(components, /const AgentAwarenessLogV1 =/);
  assert.match(components, /data-agent-awareness/);
  assert.match(components, /new Date\(step\.at \|\| timestamp/);
  assert.match(components, /financeAgentAwarenessMarkupV1/);
  assert.match(styles, /\.finance-agent-log\[open\]/);
});
