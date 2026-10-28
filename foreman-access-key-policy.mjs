export const FOREMAN_ACCESS_KEY_PERMISSIONS_V1 = Object.freeze([
  "view.map",
  "view.agenda",
  "view.records",
  "view.stages",
  "timeline.read",
  "agenda.write",
  "records.read",
  "records.write",
  "ai.notes",
  "ai.photos",
]);

export function normalizeForemanAccessPermissionsV1(value) {
  const input = Array.isArray(value) ? value : [];
  const allowed = new Set(FOREMAN_ACCESS_KEY_PERMISSIONS_V1);
  const permissions = [...new Set(input.map((item) => String(item || "").trim()).filter((item) => allowed.has(item)))];
  if (permissions.includes("records.write") && !permissions.includes("records.read")) permissions.push("records.read");
  if (permissions.includes("view.records") && !permissions.includes("records.read")) permissions.push("records.read");
  if ((permissions.includes("view.agenda") || permissions.includes("view.stages")) && !permissions.includes("timeline.read")) permissions.push("timeline.read");
  return permissions;
}

export function foremanAccessKeyActorV1(actor, key) {
  return {
    ...actor,
    role: "admin",
    userType: "foreman",
    accessLevel: "admin",
    mode: "delegated-foreman-key",
    delegatedKeyId: key.id,
    delegatedKeyLabel: key.label,
    delegatedRoleId: key.roleId || "",
    delegatedRoleName: key.roleName || "",
    permissions: normalizeForemanAccessPermissionsV1(key.permissions),
    delegatedViews: normalizeForemanAccessPermissionsV1(key.permissions).filter((permission) => permission.startsWith("view.")).map((permission) => permission.slice(5)),
  };
}

const timelineRead = (pathname, method) => method === "GET" && (
  pathname === "/api/agenda-events" ||
  pathname === "/api/stage-agenda" ||
  pathname === "/api/activities" ||
  pathname === "/api/activity-dependencies" ||
  pathname === "/api/stages-admin" ||
  /^\/api\/stages-admin\/\d+(?:\/report)?$/.test(pathname) ||
  pathname === "/api/workbench/state" ||
  pathname === "/api/workbench/diary"
);

export function delegatedForemanKeyCanAccessV1(actor, pathname, method = "GET", search = "") {
  if (actor?.mode !== "delegated-foreman-key") return null;
  const permissions = new Set(normalizeForemanAccessPermissionsV1(actor.permissions));
  const verb = String(method || "GET").toUpperCase();
  if (pathname === "/api/agenda-events" && verb === "PUT") return permissions.has("agenda.write");
  if (timelineRead(pathname, verb)) {
    if (["/api/workbench/state", "/api/workbench/diary"].includes(pathname) && new URLSearchParams(String(search || "").replace(/^\?/, "")).has("resource")) return false;
    return permissions.has("timeline.read");
  }
  if (pathname === "/api/records/ocr" && verb === "POST") return permissions.has("ai.photos");
  if (pathname === "/api/workbench/attachments" && verb === "GET") return permissions.has("records.read");
  if (pathname === "/api/workbench/attachments" && verb === "POST") return permissions.has("records.write");
  if (/^\/api\/workbench\/attachments\/[^/]+\/file$/.test(String(pathname || "")) && verb === "GET") return permissions.has("records.read");
  if (pathname === "/api/records" || /^\/api\/records\/[^/]+$/.test(pathname)) {
    if (verb === "GET") return permissions.has("records.read");
    if (["POST", "PUT"].includes(verb)) return permissions.has("records.write");
    return false;
  }
  if (pathname === "/api/field-confirmations" && verb === "POST") return permissions.has("records.write");
  if (pathname === "/api/ai" && verb === "POST") return permissions.has("ai.notes") || permissions.has("ai.photos");
  if (pathname === "/api/ai/vision-reasoning" && verb === "POST") return permissions.has("ai.photos");
  return false;
}
