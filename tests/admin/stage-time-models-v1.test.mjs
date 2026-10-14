import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStageTimeModelsV1 } from "../../components/planning/stage-time-models-v1.mjs";

const stageOverlayKey = (name) =>
  String(name || "").toLowerCase().includes("terra") ? "terraplanagem" : "drenagem";

test("stage time models preserve explicit duration precedence and workday conversion", () => {
  const planner = createStageTimeModelsV1({ demoData: { activities: [] }, stageOverlayKey });
  const models = planner.buildStageTimeModels([
    { name: "Terraplanagem", durationHours: 12, plannedDays: 5 },
    { name: "Drenagem", plannedDays: 3 },
    { name: "Drenagem", plannedStart: "2026-10-01T08:00:00Z", plannedEnd: "2026-10-02T08:00:00Z" },
  ]);

  assert.deepEqual(models.map((model) => model.totalHours), [12, 24, 24]);
  assert.equal(models[0].tasks.reduce((sum, task) => sum + task.hours, 0), 12);
  assert.equal(models[1].startDay, models[0].endDay + 1);
  assert.equal(models[2].startDay, models[1].endDay + 1);
  assert.deepEqual(models.map((model) => model.tasks.map((task) => task.name)), [
    planner.STAGE_WORK_PACKETS,
    planner.STAGE_WORK_PACKETS,
    planner.STAGE_WORK_PACKETS,
  ]);
});

test("stage time formatting and lookup retain the planning display contract", () => {
  const stage = { name: "Terraplanagem" };
  const planner = createStageTimeModelsV1({ demoData: { activities: [stage] }, stageOverlayKey });
  const [model] = planner.buildStageTimeModels();

  assert.equal(model.totalHours, 64);
  assert.equal(planner.formatHours(7.5), "7,5 h");
  assert.equal(planner.formatHours(16), "2 dias");
  assert.equal(planner.formatPlanningDate(1), "02/06");
  assert.equal(planner.findStageTimeModel(stage).stage, stage);
  assert.equal(planner.findStageTimeModel("missing").stage, stage);
});

test("components composition injects the existing stage key resolver into planning services", async () => {
  const source = await readFile(new URL("../../components/planning/planning-runtime-context-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /createStageTimeModelsV1\(\{ demoData, stageOverlayKey \}\)/);
  assert.match(source, /import \{ createStageTimeModelsV1 \} from "\.\/stage-time-models-v1\.mjs\?/);
});
