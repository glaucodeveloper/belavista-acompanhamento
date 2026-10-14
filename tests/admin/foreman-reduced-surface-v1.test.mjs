import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  actorCanOpenView,
  FOREMAN_EXTENSION_VIEWS,
  FOREMAN_NAV_VIEWS,
  navigationItemsForActor,
} from "../../admin-role-policy.mjs";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("encarregado e corretor ficam restritos a registros e cronograma", () => {
  const actor = {role: "admin", userType: "foreman"};
  assert.deepEqual([...FOREMAN_NAV_VIEWS], ["records", "stages"]);
  assert.deepEqual([...FOREMAN_EXTENSION_VIEWS], []);
  for (const view of ["map", "materials", "agenda", "control", "leads", "contracts", "finance", "reports", "settings", "pert", "actions", "raci", "raid", "activities", "progress", "foremen"]) {
    assert.equal(actorCanOpenView(actor, view), false, `view indevida: ${view}`);
  }
  for (const view of ["records", "stages"]) {
    assert.equal(actorCanOpenView(actor, view), true, `view permitida ausente: ${view}`);
  }
  assert.deepEqual(navigationItemsForActor(actor, [["map"], ["stages"], ["records"]]).map(([id]) => id), ["records", "stages"]);
  const broker = {role: "corretor"};
  for (const view of ["records", "stages"]) assert.equal(actorCanOpenView(broker, view), true);
  for (const view of ["map", "materials", "agenda", "brokers", "control"]) assert.equal(actorCanOpenView(broker, view), false);
  assert.deepEqual(navigationItemsForActor(broker, []).map(([id]) => id), ["records", "stages"]);
  assert.equal(actorCanOpenView({role: "admin"}, "materials"), true);
});

test("shell e mobile possuem contrato visual reduzido para encarregado", () => {
  const app = read("app.js");
  const components = read("components/shared/view-layer-v1.mjs");
  const styles = read("styles.css");
  assert.match(app, /actorCanOpenView/);
  assert.match(app, /dataset\.role=role/);
  assert.match(read("components.js"), /FOREMAN_EXTENSION_VIEWS/);
  assert.match(components, /Área indisponível para este perfil/);
  assert.match(components, /isForemanUser/);
  assert.match(components, /isLimitedOperationalActor/);
  assert.match(read("admin-auth.mjs"), /const required=true/);
  assert.match(read("admin-auth.mjs"), /BELAVISTA_CAPACITOR_NATIVE===true/);
  assert.match(read("firebase.mjs"), /indexedDBLocalPersistence\|\|authSdk\.browserLocalPersistence/);
  assert.match(read("scripts/build-capacitor-web.mjs"), /BELAVISTA_CAPACITOR_NATIVE = true/);
  assert.match(read("mobile-operational-v1.css"), /safe-area-inset-bottom/);
});
