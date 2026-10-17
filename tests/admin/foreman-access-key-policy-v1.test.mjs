import test from "node:test";
import assert from "node:assert/strict";
import {
  FOREMAN_ACCESS_KEY_PERMISSIONS_V1,
  delegatedForemanKeyCanAccessV1,
  foremanAccessKeyActorV1,
  normalizeForemanAccessPermissionsV1,
} from "../../foreman-access-key-policy.mjs";
import { limitedActorCanAccessApi } from "../../api-access-policy.mjs";
import { actorCanOpenView, navigationItemsForActor } from "../../admin-role-policy.mjs";

test("permissões de encarregado aceitam só escopos conhecidos e escrita implica leitura", () => {
  assert.deepEqual(normalizeForemanAccessPermissionsV1(["records.write", "admin", "records.write"]), ["records.write", "records.read"]);
  assert.equal(FOREMAN_ACCESS_KEY_PERMISSIONS_V1.includes("ai.photos"), true);
  assert.equal(FOREMAN_ACCESS_KEY_PERMISSIONS_V1.includes("agenda.write"), true);
});

test("chave delegada limita leitura de cronograma e CRUD de registros", () => {
  const actor = foremanAccessKeyActorV1({ role: "owner", githubId: 123 }, {
    id: "FKEY-test", label: "Frente Norte", permissions: ["timeline.read", "records.write"],
  });
  assert.equal(limitedActorCanAccessApi(actor, "/api/stages-admin", "GET"), true);
  assert.equal(limitedActorCanAccessApi(actor, "/api/activities", "GET"), true);
  assert.equal(limitedActorCanAccessApi(actor, "/api/stage-agenda", "GET"), true);
  assert.equal(limitedActorCanAccessApi(actor, "/api/agenda-events", "GET"), true);
  assert.equal(limitedActorCanAccessApi(actor, "/api/agenda-events", "PUT"), false);
  assert.equal(limitedActorCanAccessApi(actor, "/api/activities", "POST"), false);
  assert.equal(limitedActorCanAccessApi(actor, "/api/records", "GET"), true);
  assert.equal(limitedActorCanAccessApi(actor, "/api/records", "POST"), true);
  assert.equal(limitedActorCanAccessApi(actor, "/api/records/1", "DELETE"), false);
  assert.equal(limitedActorCanAccessApi(actor, "/api/repasses", "GET"), false);
  assert.equal(limitedActorCanAccessApi(actor, "/api/workbench/state", "GET"), true);
  assert.equal(limitedActorCanAccessApi(actor, "/api/workbench/state", "GET", "?resource=attachments"), false);
});

test("criação/alteração de compromissos exige permissão explícita da chave", () => {
  const timelineOnly = { mode: "delegated-foreman-key", permissions: ["timeline.read"] };
  const agendaWriter = { mode: "delegated-foreman-key", permissions: ["timeline.read", "agenda.write"] };
  assert.equal(delegatedForemanKeyCanAccessV1(timelineOnly, "/api/agenda-events", "GET"), true);
  assert.equal(delegatedForemanKeyCanAccessV1(timelineOnly, "/api/agenda-events", "PUT"), false);
  assert.equal(delegatedForemanKeyCanAccessV1(agendaWriter, "/api/agenda-events", "PUT"), true);
  assert.equal(delegatedForemanKeyCanAccessV1(agendaWriter, "/api/agenda-events", "POST"), false);
  assert.deepEqual(normalizeForemanAccessPermissionsV1(["agenda.write"]), ["agenda.write"]);
});

test("papéis dinâmicos limitam interfaces pelo conjunto persistido de permissões", () => {
  const brokerRole = foremanAccessKeyActorV1({ role: "owner", githubId: 7 }, {
    id: "FKEY-broker", roleId: "FROLE-broker", roleName: "Corretor de campo",
    permissions: ["view.map", "view.records", "records.read"],
  });
  assert.equal(actorCanOpenView(brokerRole, "map"), true);
  assert.equal(actorCanOpenView(brokerRole, "records"), true);
  assert.equal(actorCanOpenView(brokerRole, "agenda"), false);
  assert.equal(actorCanOpenView(brokerRole, "settings"), false);
  assert.deepEqual(navigationItemsForActor(brokerRole, []), [["map", "house", "Mapa"], ["records", "clipboard-list", "Registros"]]);
  assert.deepEqual(normalizeForemanAccessPermissionsV1(["view.agenda", "view.records"]), ["view.agenda", "view.records", "records.read", "timeline.read"]);
});

test("escopos de IA distinguem notas e fotos e não liberam inferência ampla", () => {
  const notes = { mode: "delegated-foreman-key", permissions: ["ai.notes"] };
  const photos = { mode: "delegated-foreman-key", permissions: ["ai.photos"] };
  assert.equal(delegatedForemanKeyCanAccessV1(notes, "/api/ai", "POST"), true);
  assert.equal(delegatedForemanKeyCanAccessV1(photos, "/api/ai/vision-reasoning", "POST"), true);
  assert.equal(delegatedForemanKeyCanAccessV1(notes, "/api/ai/vision-reasoning", "POST"), false);
  assert.equal(delegatedForemanKeyCanAccessV1(photos, "/api/records/ocr", "POST"), true);
  assert.equal(delegatedForemanKeyCanAccessV1(notes, "/api/inference", "POST"), false);
  assert.equal(delegatedForemanKeyCanAccessV1(notes, "/api/ai", "POST", "?view=finance"), true);
});
