import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GlassCard, StatPill } from "../../components/shared/primitive-elements.mjs";
import { registerPrimitiveElementsV1 } from "../../components/shared/primitive-elements-registration-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("shared primitive registration defines the original tags only when absent", () => {
  const definitions = new Map(), calls = [],
    customElementsRef = {
      get(name) { return definitions.get(name); },
      define(name, constructor) { calls.push(name); definitions.set(name, constructor); },
    };
  const registered = registerPrimitiveElementsV1({ customElementsRef });
  registerPrimitiveElementsV1({ customElementsRef });
  assert.deepEqual(calls, ["glass-card", "stat-pill"]);
  assert.equal(definitions.get("glass-card"), GlassCard);
  assert.equal(definitions.get("stat-pill"), StatPill);
  assert.deepEqual(registered, { GlassCard, StatPill });
  assert.equal(Object.isFrozen(registered), true);
});

test("components root delegates the shared primitive tags to the shared module", () => {
  const source = fs.readFileSync(path.join(root, "components.js"), "utf8");
  assert.match(source, /registerPrimitiveElementsV1\(\{ customElementsRef: customElements \}\)/);
  assert.doesNotMatch(source, /customElements\.define\("(?:glass-card|stat-pill)"/);
});
