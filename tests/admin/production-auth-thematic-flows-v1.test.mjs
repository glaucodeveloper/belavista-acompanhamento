import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {
  ADMIN_LOGIN_ROLES,
  FOREMAN_EXTENSION_VIEWS,
  FOREMAN_NAV_VIEWS,
  actorCanOpenView,
  navigationItemsForActor,
  navigationItemsForRole,
  normalizeOperationalRole,
  roleCanOpenView,
} from "../../admin-role-policy.mjs";

const runAuthMock = (source) => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", source],
    {
      cwd: process.cwd(),
      env: {...process.env, BELAVISTA_AUTH_MODE: "firebase"},
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim());
};

test("productionReady=true não cria usuário implícito e exige Bearer", () => {
  const status = runAuthMock(`
    const auth = await import('./auth-service.mjs?mock-production-status');
    const request = {headers: {host: 'belavista.example'}};
    let missing = null;
    try { await auth.requestActor(request); }
    catch (error) { missing = {statusCode: error.statusCode, message: error.message}; }
    console.log(JSON.stringify({status: auth.authStatus(), missing}));
  `);

  assert.equal(status.status.mode, "firebase");
  assert.equal(status.status.productionReady, true);
  assert.deepEqual(status.status.roles, ["owner", "admin", "foreman", "sales", "commercial", "broker", "corretor", "developer"]);
  assert.equal(status.missing.statusCode, 401);
  assert.match(status.missing.message, /autenticação obrigatória/i);
});

test("encarregado é propriedade do usuário, sem portal próprio", () => {
  const actor = {role: "admin", userType: "foreman"};
  assert.equal(actorCanOpenView(actor, "map"), false);
  assert.equal(actorCanOpenView(actor, "stages"), true);
  assert.equal(actorCanOpenView(actor, "records"), true);
  assert.equal(actorCanOpenView(actor, "settings"), false);
});

test("fluxos temáticos mock mantêm a fronteira entre encarregado, comercial e privilegiado", () => {
  const items = [
    ["map", "map", "Mapa"],
    ["assistant", "house", "Assistente"],
    ["stages", "workflow", "Etapas"],
    ["records", "clipboard", "Registros"],
    ["progress", "check", "Andamento"],
    ["leads", "users", "Leads"],
    ["contracts", "file-signature", "Contratos"],
    ["finance", "wallet", "Financeiro"],
    ["settings", "settings", "Configurações"],
  ];
  const foremanItems = navigationItemsForActor({role: "admin", userType: "foreman"}, items);
  assert.deepEqual(foremanItems.map(([id]) => id), FOREMAN_NAV_VIEWS);
  assert.equal(actorCanOpenView({role: "admin", userType: "foreman"}, "contracts"), false);
  assert.equal(actorCanOpenView({role: "admin", userType: "foreman"}, "finance"), false);
  assert.equal(actorCanOpenView({role: "admin", userType: "foreman"}, "records"), true);
  assert.deepEqual([...FOREMAN_EXTENSION_VIEWS], []);
  for (const view of ["pert", "actions", "raci", "raid", "settings"]) {
    assert.equal(actorCanOpenView({role: "admin", userType: "foreman"}, view), false);
  }

  assert.equal(roleCanOpenView("admin", "contracts"), true);
  assert.equal(roleCanOpenView("developer", "settings"), true);
  assert.deepEqual(
    navigationItemsForRole("corretor", items).map(([id]) => id),
    ["stages", "records"],
  );
});

test("aliases dos custom claims entram no mesmo fluxo temático", () => {
  assert.equal(normalizeOperationalRole("Dono"), "owner");
  assert.equal(normalizeOperationalRole("Proprietário"), "owner");
  assert.equal(normalizeOperationalRole("Encarregado"), "foreman");
  assert.equal(normalizeOperationalRole("Administrador"), "admin");
  assert.equal(normalizeOperationalRole("TI"), "developer");
  assert.equal(normalizeOperationalRole("Corretora"), "corretor");
  assert.equal(actorCanOpenView({role: "dono"}, "brokers-board"), true);
  assert.equal(actorCanOpenView({role: "dono"}, "brokers"), true);
  assert.deepEqual([...ADMIN_LOGIN_ROLES].includes("developer"), true);
});
