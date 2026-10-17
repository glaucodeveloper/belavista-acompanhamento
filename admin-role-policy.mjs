// BELAVISTA_ADMIN_ACCESS_POLICY_V2
// O nível de acesso (role) e a função exercida na obra (userType) são
// independentes. "encarregado" é um tipo de usuário, não um portal ou nível
// administrativo.

export const ADMIN_LOGIN_ROLES = Object.freeze([
  "admin",
  "owner",
  "developer",
  "sales",
  "commercial",
  "broker",
  "corretor",
]);

export const FOREMAN_NAV_VIEWS = Object.freeze(["map", "agenda", "records", "stages"]);
// Encarregados e corretores usam somente registros e a linha do tempo.
export const FOREMAN_EXTENSION_VIEWS = Object.freeze([]);
export const LIMITED_OPERATIONAL_VIEWS = Object.freeze(["map", "agenda", "records", "stages"]);

export const REMOVED_ADMIN_VIEWS = Object.freeze([
  "documents",
  "personnel",
  "leads",
  "reports",
]);
const REMOVED_ADMIN_VIEW_SET = new Set(REMOVED_ADMIN_VIEWS);

const BROKER_ROLES = new Set(["sales", "commercial", "broker", "corretor"]);
const PRIVILEGED_ROLES = new Set(["owner", "admin", "developer"]);

export const normalizeOperationalRole = (value) => {
  const role = String(value || "").trim().toLocaleLowerCase("pt-BR");
  const aliases = {
    dono: "owner",
    proprietário: "owner",
    proprietario: "owner",
    administrador: "admin",
    desenvolvimento: "developer",
    desenvolvedor: "developer",
    ti: "developer",
    dev: "developer",
    encarregado: "foreman",
    corretora: "corretor",
    vendedor: "sales",
    vendedora: "sales",
    comercial: "commercial",
  };
  return aliases[role] || role;
};

export const normalizeUserType = (value) => {
  const type = String(value || "").trim().toLocaleLowerCase("pt-BR");
  return ["encarregado", "foreman"].includes(type) ? "foreman" : type;
};

// Compatibilidade temporária: role=foreman legado vira tipo encarregado, sem
// voltar a conceder permissões administrativas pelo nível de acesso.
export const userTypeForActor = (actor = {}) =>
  normalizeUserType(
    actor.userType ||
      actor.user_type ||
      actor.claims?.userType ||
      actor.claims?.user_type ||
      (normalizeOperationalRole(actor.role) === "foreman" ? "foreman" : ""),
  );

export const isForemanUser = (actor = {}) => userTypeForActor(actor) === "foreman";
export const isLimitedOperationalActor = (actor = {}) =>
  isForemanUser(actor) || BROKER_ROLES.has(accessLevelForActor(actor));

// Claims antigos usavam role=foreman. Para não ampliar esse acesso, o valor
// vira uma propriedade do usuário e o nível base passa a ser administrativo.
export const accessLevelForActor = (actor = {}) => {
  const level = normalizeOperationalRole(
    actor.accessLevel || actor.access_level || actor.role || "",
  );
  return level === "foreman" ? "admin" : level;
};

export const roleCanOpenView = (role, view) => {
  const normalized = normalizeOperationalRole(role);
  if (REMOVED_ADMIN_VIEW_SET.has(String(view || ""))) return false;
  if (BROKER_ROLES.has(normalized)) {
    return LIMITED_OPERATIONAL_VIEWS.includes(String(view || ""));
  }
  return PRIVILEGED_ROLES.has(normalized);
};

export const actorCanOpenView = (actor = {}, view) => {
  if (actor.mode === "delegated-foreman-key" && actor.delegatedRoleId && Array.isArray(actor.delegatedViews))
    return actor.delegatedViews.includes(String(view || ""));
  if (isLimitedOperationalActor(actor)) return LIMITED_OPERATIONAL_VIEWS.includes(String(view || ""));
  if (REMOVED_ADMIN_VIEW_SET.has(String(view || ""))) return false;
  return roleCanOpenView(accessLevelForActor(actor), view);
};

export const resolveStartupActorV1 = ({ authenticatedActor, restoredActor, fallbackActor } = {}) => {
  if (authenticatedActor && typeof authenticatedActor === "object") return authenticatedActor;
  const hasAccessContext = (actor) => Boolean(actor && typeof actor === "object" && [
    actor.role,
    actor.accessLevel,
    actor.access_level,
    actor.userType,
    actor.user_type,
    actor.claims?.role,
    actor.claims?.userType,
    actor.claims?.user_type,
  ].some((value) => String(value || "").trim()));
  if (hasAccessContext(restoredActor)) return restoredActor;
  return fallbackActor && typeof fallbackActor === "object" ? fallbackActor : {};
};

export const navigationItemsForRole = (role, items = []) => {
  const normalized = normalizeOperationalRole(role);
  const visibleItems = items.filter(([id]) => !REMOVED_ADMIN_VIEW_SET.has(id));
  if (BROKER_ROLES.has(normalized)) {
    return visibleItems.filter(([id]) => LIMITED_OPERATIONAL_VIEWS.includes(id));
  }
  return visibleItems;
};

export const navigationItemsForActor = (actor = {}, items = []) => {
  if (actor.mode === "delegated-foreman-key" && actor.delegatedRoleId && Array.isArray(actor.delegatedViews)) {
    const labels = new Map([["map", ["map", "house", "Mapa"]], ["agenda", ["agenda", "calendar-range", "Agenda"]], ["records", ["records", "clipboard-list", "Registros"]], ["stages", ["stages", "calendar-range", "Linha do tempo do cronograma"]]]);
    return actor.delegatedViews.map((view) => labels.get(view)).filter(Boolean);
  }
  if (isLimitedOperationalActor(actor)) {
    return [
      ["map", "house", "Mapa"],
      ["records", "clipboard-list", "Registros"],
      ["stages", "calendar-range", "Linha do tempo do cronograma"],
    ];
  }
  const visibleItems = items.filter(([id]) => !REMOVED_ADMIN_VIEW_SET.has(id));
  return navigationItemsForRole(accessLevelForActor(actor), visibleItems);
};
