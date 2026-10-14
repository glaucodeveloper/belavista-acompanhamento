import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { statusClass } from "../../components/shared/status-class-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("status class conversion preserves legacy spacing, casing, and accent behavior", () => {
  assert.equal(statusClass("Em Andamento"), "em-andamento");
  assert.equal(statusClass("Concluído"), "concluido");
  assert.equal(statusClass("A ção"), "a-cao");
  assert.equal(statusClass("A ção extra"), "a-cao-extra");
  assert.equal(statusClass(null), "null");
});

test("components entry point injects the shared status formatter into ViewLayer", () => {
  const source = fs.readFileSync(path.join(root, "components.js"), "utf8");
  assert.match(source, /status-class-v1\.mjs\?v=status-class-v1/);
  assert.match(source, /statusClass,/);
  assert.doesNotMatch(source, /const statusClass\s*=/);
});
