import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const timeline = fs.readFileSync(path.join(root, "components/planning/stage-context-chrome-v1.mjs"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("timeline persistente expõe edição de estrutura e ação de sistema", () => {
  assert.match(timeline, /data-persistent-stage-edit/);
  assert.match(timeline, /Editar estrutura de/);
  assert.match(timeline, /data-stage-system-action/);
  assert.match(timeline, /view:\s*"actions"/);
  assert.match(timeline, /runtimeRouteV1\("\/admin\/workers\/stage"/);
});

test("timeline tem estados visuais para edição e ação adicional", () => {
  assert.match(styles, /stage-persistent-timeline-edit/);
  assert.match(styles, /stage-persistent-timeline-system-action/);
});
