import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveApplicationRouteV1,
  resolveSidebarNavigationTargetV1,
} from "../../components/shared/application-navigation-routes-v1.mjs";

test("application routes keep Agenda and AI actions direct and preserve legacy aliases", () => {
  assert.deepEqual(resolveApplicationRouteV1("agenda"), { aliasedView: "agenda", requestedView: "agenda" });
  assert.deepEqual(resolveApplicationRouteV1("actions"), { aliasedView: "actions", requestedView: "actions" });
  assert.deepEqual(resolveApplicationRouteV1("lotes"), { aliasedView: "brokers-board", requestedView: "brokers-board" });
  assert.deepEqual(resolveApplicationRouteV1("finance"), { aliasedView: "control", requestedView: "control" });
  assert.deepEqual(resolveApplicationRouteV1("pert"), { aliasedView: "pert", requestedView: "stages" });
  assert.deepEqual(resolveApplicationRouteV1("unknown"), { aliasedView: "unknown", requestedView: "map" });
});

test("sidebar targets preserve allowed Materials, Agenda, and AI actions routes", () => {
  for (const view of ["materials", "agenda", "actions"])
    assert.deepEqual(resolveSidebarNavigationTargetV1(view), { requestedNext: view, next: view });
});
