import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { installStageBindCompositionV1 } from "../../components/planning/stage-bind-composition-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("stage bind composition delegates from components.js to the planning module", () => {
  const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
  const composition = fs.readFileSync(path.join(root, "components/planning/stage-application-composition-v1.mjs"), "utf8");
  assert.match(components, /installStageApplicationCompositionV1\(/);
  assert.match(composition, /installStageBindCompositionV1\(ViewLayer\)/);
  assert.doesNotMatch(components, /this\.bindDashboardCardDrag\(\)/);
  assert.doesNotMatch(components, /this\.bindStageExtensions\(\)/);
});

test("stage bind composition preserves base-call and extension order", () => {
  const calls = [];
  class ViewLayer {
    bind() { calls.push("base"); }
    bindDashboardCardDrag() { calls.push("dashboard-drag"); }
    bindStageExtensions() { calls.push("stage-extensions"); }
  }

  installStageBindCompositionV1(ViewLayer);
  const view = new ViewLayer();
  assert.equal(view.bind("ignored-by-original-wrapper"), undefined);
  assert.deepEqual(calls, ["base", "dashboard-drag", "stage-extensions"]);
});
