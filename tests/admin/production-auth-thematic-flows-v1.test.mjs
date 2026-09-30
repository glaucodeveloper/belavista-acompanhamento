import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {
  ADMIN_LOGIN_ROLES,
  FIELD_PORTAL_ROLES,
  FOREMAN_EXTENSION_VIEWS,
  FOREMAN_NAV_VIEWS,
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
  assert.deepEqual(status.status.roles, ["owner", "admin", "foreman", "developer"]);
  assert.equal(status.missing.statusCode, 401);
  assert.match(status.missing.message, /autenticação obrigatória/i);
});

test("login mock do portal de encarregados aceita somente os três papéis publicados", () => {
  assert.deepEqual([...FIELD_PORTAL_ROLES], ["foreman", "admin", "developer"]);
  for (const role of FIELD_PORTAL_ROLES) {
    assert.equal(
      FIELD_PORTAL_ROLES.includes(normalizeOperationalRole(role)),
      true,
      `papel ${role} deveria entrar no portal`,
    );
  }
  for (const role of ["owner", "sales", "commercial", "broker", "corretor", "guest"]) {
    assert.equal(
      FIELD_PORTAL_ROLES.includes(normalizeOperationalRole(role)),
      false,
      `papel ${role} não deve entrar no portal`,
    );
  }
});

test("fluxos temáticos mock mantêm a fronteira entre encarregado, comercial e privilegiado", () => {
  const items = [
    ["assistant", "house", "Dashboard inicial"],
    ["stages", "workflow", "Etapas"],
    ["records", "clipboard", "Registros"],
    ["progress", "check", "Andamento"],
    ["leads", "users", "Leads"],
    ["contracts", "file-signature", "Contratos"],
    ["finance", "wallet", "Financeiro"],
    ["settings", "settings", "Configurações"],
  ];
  const foremanItems = navigationItemsForRole("foreman", items);
  assert.deepEqual(foremanItems.map(([id]) => id), FOREMAN_NAV_VIEWS);
  assert.equal(roleCanOpenView("foreman", "contracts"), false);
  assert.equal(roleCanOpenView("foreman", "finance"), false);
  assert.equal(roleCanOpenView("foreman", "records"), true);
  assert.deepEqual([...FOREMAN_EXTENSION_VIEWS], ["agenda", "activities", "progress", "records"]);
  for (const view of ["pert", "actions", "raci", "raid", "settings"]) {
    assert.equal(roleCanOpenView("foreman", view), false);
  }

  assert.equal(roleCanOpenView("admin", "contracts"), true);
  assert.equal(roleCanOpenView("developer", "settings"), true);
  assert.deepEqual(
    navigationItemsForRole("corretor", items).map(([id]) => id),
    ["assistant", "contracts"],
  );
});

test("aliases dos custom claims entram no mesmo fluxo temático", () => {
  assert.equal(normalizeOperationalRole("Encarregado"), "foreman");
  assert.equal(normalizeOperationalRole("Administrador"), "admin");
  assert.equal(normalizeOperationalRole("TI"), "developer");
  assert.equal(normalizeOperationalRole("Corretora"), "corretor");
  assert.deepEqual([...ADMIN_LOGIN_ROLES].includes("developer"), true);
});
