import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { limitedActorCanAccessApi } from "../../api-access-policy.mjs";
import { createStagePersistentTimelineMarkupV1 } from "../../components/planning/stage-context-chrome-v1.mjs";
import { actorCanOpenView, navigationItemsForActor } from "../../admin-role-policy.mjs";

const foreman = { role: "admin", userType: "foreman" };
const broker = { role: "corretor" };

test("encarregado e corretor só veem registros e cronograma na navegação", () => {
  for (const actor of [foreman, broker]) {
    assert.deepEqual(navigationItemsForActor(actor, []).map(([id]) => id), ["records", "stages"]);
    assert.equal(actorCanOpenView(actor, "records"), true);
    assert.equal(actorCanOpenView(actor, "stages"), true);
    for (const view of ["map", "materials", "agenda", "brokers", "repasses", "settings", "actions"])
      assert.equal(actorCanOpenView(actor, view), false, `${view} liberada indevidamente`);
  }
});

test("linha do tempo para perfis restritos é somente leitura", () => {
  const stage = { key: "earth", name: "Terraplenagem", progress: 48, week: "Semana 3" };
  const build = (actor) => createStagePersistentTimelineMarkupV1({
    appStore: { get: () => ({ currentActor: actor, selectedStageV9: "earth" }) },
    extensionStage: () => stage,
    executionModel: { stages: [stage] },
    stageV9LiveFor: () => stage,
    demoData: { activities: [{ id: "earth", name: "Terraplenagem" }] },
    esc: (value) => String(value ?? ""),
    ico: () => "<svg></svg>",
  })();
  const restricted = build(broker);
  assert.match(restricted, /Terraplenagem/);
  assert.doesNotMatch(restricted, /data-persistent-stage-edit|data-persistent-stage-add|data-stage-system-action/);
  assert.match(build({ role: "owner" }), /data-persistent-stage-add/);
});

test("API bloqueia áreas fora do escopo e preserva leituras/gravações de registros", () => {
  for (const actor of [foreman, broker]) {
    for (const [path, method, search] of [
      ["/api/records", "GET", ""],
      ["/api/records", "POST", ""],
      ["/api/records/record-1", "PUT", ""],
      ["/api/stages-admin", "GET", ""],
      ["/api/stages-admin/2/report", "GET", ""],
      ["/api/workbench/diary", "GET", ""],
    ]) assert.equal(limitedActorCanAccessApi(actor, path, method, search), true, `${method} ${path}`);
    for (const [path, method, search] of [
      ["/api/materials", "GET", ""],
      ["/api/workbench/diary", "POST", ""],
      ["/api/workbench/diary", "GET", "resource=attachments"],
      ["/api/records", "DELETE", ""],
      ["/api/cash-flow", "GET", ""],
      ["/api/operational-loop", "POST", ""],
    ]) assert.equal(limitedActorCanAccessApi(actor, path, method, search), false, `${method} ${path}`);
  }
  assert.equal(limitedActorCanAccessApi({ role: "owner" }, "/api/materials", "GET"), true);
});

test("web e Capacitor exigem autenticação e servidor usa Firebase como padrão", async () => {
  const [auth, service] = await Promise.all([
    readFile(new URL("../../admin-auth.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../auth-service.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(auth, /const required=true/);
  assert.match(auth, /BELAVISTA_CAPACITOR_NATIVE===true/);
  assert.match(service, /BELAVISTA_AUTH_MODE\|\|'firebase'/);
  assert.match(service, /Autenticação Firebase obrigatória fora do ambiente local/);
});
