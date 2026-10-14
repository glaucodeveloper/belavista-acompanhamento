import { isLimitedOperationalActor } from "./admin-role-policy.mjs";

const RECORD_ROUTE = /^\/api\/records(?:\/[^/]+)?$/;
const STAGE_READ_ROUTE = /^\/api\/stages-admin\/\d+(?:\/report)?$/;

export const limitedActorCanAccessApi = (actor, pathname, method = "GET", search = "") => {
  if (!isLimitedOperationalActor(actor)) return true;
  const normalizedMethod = String(method || "GET").toUpperCase();
  const query = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const records = RECORD_ROUTE.test(String(pathname || "")) && ["GET", "POST", "PUT"].includes(normalizedMethod);
  const timeline =
    (pathname === "/api/stages-admin" && normalizedMethod === "GET") ||
    (STAGE_READ_ROUTE.test(String(pathname || "")) && normalizedMethod === "GET") ||
    (pathname === "/api/workbench/state" && normalizedMethod === "GET" && !query.has("resource")) ||
    (pathname === "/api/workbench/diary" && normalizedMethod === "GET" && !query.has("resource"));
  return records || timeline;
};
