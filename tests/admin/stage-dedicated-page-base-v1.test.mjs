import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dedicated stage page base stays modular and precedes the agenda composition", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const module = await readFile(new URL("../../components/planning/stage-dedicated-page-base-v1.mjs", import.meta.url), "utf8");
  const installAt = source.indexOf("installStageDedicatedPageBaseV1(ViewLayer,");
  const compositionAt = source.indexOf("const stageV9DedicatedAgendaBase = ViewLayer.prototype.activityDedicatedPage;");

  assert.ok(installAt >= 0 && compositionAt > installAt);
  assert.match(source, /import \{ installStageDedicatedPageBaseV1 \} from "\.\/components\/planning\/stage-dedicated-page-base-v1\.mjs/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.activityDedicatedPage = function/);
  assert.match(module, /ViewLayer\.prototype\.activityDedicatedPage = function/);
  assert.match(module, /stage-v9-dedicated-page/);
  assert.match(module, /stage-v9-flow/);
  assert.match(module, /stage-v9-material-list/);
  assert.match(module, /stage-v9-diary-table/);
  assert.match(module, /stageV9DirectiveText/);
  assert.match(module, /stageV9EscList/);
});
