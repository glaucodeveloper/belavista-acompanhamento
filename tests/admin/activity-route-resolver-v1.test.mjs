import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE_WORKBENCH,
  findWorkbenchActivity,
} from "../../stage-workbench-data.mjs";
import { runtimeRouteV1 } from "../../components/shared/routing.mjs";
import { createWorkbenchActivityRouteResolverV1 } from "../../components/planning/activity-route-resolver.mjs";

test("activity route resolver preserves catalog routing and accented text normalization", () => {
  const resolver = createWorkbenchActivityRouteResolverV1({
    appStore: { get: () => ({}) },
    demoData: { activities: [] },
    executionModel: { stages: [] },
    STAGE_WORKBENCH,
    findWorkbenchActivity,
    runtimeRouteV1,
  });
  const stage = STAGE_WORKBENCH.find((item) => item.key === "earthwork");
  const activity = stage.activities[0];

  assert.equal(resolver.normalizeActivityRouteTextV1("Terraplanagem"), "terraplanagem");
  assert.equal(resolver.workbenchStageFromValueV1(stage.aliases[0]), stage);
  assert.equal(resolver.workbenchActivityForValueV1(stage, activity.title), activity);

  const route = new URL(
    resolver.workbenchActivityRouteV1(activity.title, stage.key),
    "http://localhost",
  );
  assert.equal(route.pathname, "/admin/workers/activity");
  assert.equal(route.searchParams.get("stage"), stage.key);
  assert.equal(route.searchParams.get("activity"), activity.id);
});
