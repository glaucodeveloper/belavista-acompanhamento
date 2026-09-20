// BELAVISTA_ADMIN_ROLE_POLICY_V1
// Política compartilhada por login, navegação e testes mock. Os papéis de
// produção continuam vindo dos custom claims do Firebase; este módulo apenas
// descreve o que a interface pode expor para cada papel.

export const FIELD_PORTAL_ROLES = Object.freeze([
  "foreman",
  "admin",
  "developer",
]);

export const ADMIN_LOGIN_ROLES = Object.freeze([
  "admin",
  "foreman",
  "owner",
  "developer",
  "sales",
  "commercial",
  "broker",
  "corretor",
]);

export const FOREMAN_NAV_VIEWS = Object.freeze([
  "assistant",
  "stages",
  "records",
  "progress",
]);

export const FOREMAN_EXTENSION_VIEWS = Object.freeze([
  "agenda",
  "activities",
  "progress",
  "records",
]);

const BROKER_ROLES = new Set(["sales", "commercial", "broker", "corretor"]);
const PRIVILEGED_ROLES = new Set(["owner", "admin", "developer"]);
const FOREMAN_VIEWS = new Set([
  ...FOREMAN_NAV_VIEWS,
  ...FOREMAN_EXTENSION_VIEWS,
]);

export const normalizeOperationalRole = (value) => {
  const role = String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  const aliases = {
    administrador: "admin",
    encarregado: "foreman",
    desenvolvimento: "developer",
    desenvolvedor: "developer",
    ti: "developer",
    dev: "developer",
    corretora: "corretor",
    vendedor: "sales",
    vendedora: "sales",
    comercial: "commercial",
  };
  return aliases[role] || role;
};

export const roleCanOpenView = (role, view) => {
  const normalized = normalizeOperationalRole(role);
  if (normalized === "foreman") return FOREMAN_VIEWS.has(String(view || ""));
  if (BROKER_ROLES.has(normalized)) {
    return ["assistant", "contracts", "proposals", "messages"].includes(
      String(view || ""),
    );
  }
  return PRIVILEGED_ROLES.has(normalized);
};

export const navigationItemsForRole = (role, items = []) => {
  const normalized = normalizeOperationalRole(role);
  if (normalized === "foreman") {
    return items.filter(([id]) => FOREMAN_NAV_VIEWS.includes(id));
  }
  if (BROKER_ROLES.has(normalized)) {
    return items.filter(([id]) =>
      ["assistant", "contracts", "messages"].includes(id),
    );
  }
  return items;
};

export const isFieldPortalRole = (role) =>
  FIELD_PORTAL_ROLES.includes(normalizeOperationalRole(role));
