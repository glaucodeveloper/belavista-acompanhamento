import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("stage page composition keeps its original installer order and shared timeline output", async () => {
  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const planning = await readFile(new URL("../../components/planning/planning-pages-application-v1.mjs", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-pages-application-composition-v1.mjs", import.meta.url), "utf8");
  const orderedInstallers = [
    "installStageDedicatedSubpagesEventsV5427(ViewLayer, {",
    "installDashboardHomeEventsV1(ViewLayer, dashboardHomePageV1.bind)",
    "installLotDevelopmentRenderGuardV1(ViewLayer, { appStore, windowRef })",
    "installDashboardStageControlV1(ViewLayer, {",
    "installStagePanoramaPageV1(ViewLayer)",
    "installStageSubpageMapShellV1(ViewLayer,",
    "installStageViewTabsEventsV1(ViewLayer,",
    "installStageRecordEntryPageV1(ViewLayer,",
    "createStagePersistentTimelineMarkupV1({",
    "installStagePersistentTimelinePagesV1(ViewLayer,",
    "installPersistentStageTimelineEventsV1(ViewLayer,",
    "installPertInteractiveV1(ViewLayer,",
    "installAiActionReflectionV1(ViewLayer,",
    "installDashboardHomeContextV1(ViewLayer,",
  ].map((needle) => composition.indexOf(needle));

  assert.match(root, /installPlanningPagesApplicationV1\(\{/);
  assert.match(root, /stagePersistentTimelineMarkupV1,/);
  assert.match(planning, /installStagePagesApplicationCompositionV1\(\{/);
  assert.match(planning, /const stagePersistentTimelineMarkupV1 = stagePages\.stagePersistentTimelineMarkupV1/);
  assert.ok(orderedInstallers.every((index) => index >= 0));
  assert.deepEqual(orderedInstallers, [...orderedInstallers].sort((a, b) => a - b));
  for (const installer of [
    "installStageDedicatedSubpagesEventsV5427(",
    "installDashboardHomeEventsV1(",
    "installDashboardStageControlV1(",
    "installStagePanoramaPageV1(",
    "installStageSubpageMapShellV1(",
    "installStageViewTabsEventsV1(",
    "installStageRecordEntryPageV1(",
    "createStagePersistentTimelineMarkupV1(",
    "installStagePersistentTimelinePagesV1(",
    "installPersistentStageTimelineEventsV1(",
    "installPertInteractiveV1(",
    "installAiActionReflectionV1(",
    "installDashboardHomeContextV1(",
  ]) assert.doesNotMatch(root, new RegExp(installer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
