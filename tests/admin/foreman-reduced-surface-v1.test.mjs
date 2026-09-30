import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  FOREMAN_EXTENSION_VIEWS,
  FOREMAN_NAV_VIEWS,
  roleCanOpenView,
} from "../../admin-role-policy.mjs";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("encarregado fica restrito à superfície de campo", () => {
  assert.deepEqual([...FOREMAN_NAV_VIEWS], ["assistant", "stages", "records", "progress"]);
  assert.deepEqual([...FOREMAN_EXTENSION_VIEWS], ["agenda", "activities", "progress", "records"]);
  for (const view of ["control", "leads", "contracts", "finance", "reports", "settings", "pert", "actions", "raci", "raid"]) {
    assert.equal(roleCanOpenView("foreman", view), false, `view indevida: ${view}`);
  }
  for (const view of ["assistant", "stages", "agenda", "activities", "progress", "records"]) {
    assert.equal(roleCanOpenView("foreman", view), true, `view de campo removida: ${view}`);
  }
});

test("shell e mobile possuem contrato visual reduzido para encarregado", () => {
  const app = read("app.js");
  const components = read("components.js");
  const styles = read("styles.css");
  assert.match(app, /roleCanOpenView/);
  assert.match(app, /dataset\.role=role/);
  assert.match(components, /FOREMAN_EXTENSION_VIEWS/);
  assert.match(components, /Área indisponível para o perfil de encarregado/);
  assert.match(styles, /belavista-app\[data-role="foreman"\]/);
  assert.match(styles, /records-entry-panel-v1:not\(\.open\)/);
});
