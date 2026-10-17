import { isLimitedOperationalActor } from "./admin-role-policy.mjs";
import { delegatedForemanKeyCanAccessV1 } from "./foreman-access-key-policy.mjs";

const RECORD_ROUTE = /^\/api\/records(?:\/[^/]+)?$/;
const STAGE_READ_ROUTE = /^\/api\/stages-admin\/\d+(?:\/report)?$/;

export const limitedActorCanAccessApi = (actor, pathname, method = "GET", search = "") => {
  const delegated = delegatedForemanKeyCanAccessV1(actor, pathname, method, search);
  if (delegated !== null) return delegated;
  if (!isLimitedOperationalActor(actor)) return true;
  const normalizedMethod = String(method || "GET").toUpperCase();
  const query = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const records = RECORD_ROUTE.test(String(pathname || "")) && ["GET", "POST", "PUT"].includes(normalizedMethod);
  const recordInference = ["/api/ai", "/api/ai/vision-reasoning", "/api/inference", "/api/records/ocr"]
    .includes(String(pathname || "")) && normalizedMethod === "POST";
  const timeline =
    (pathname === "/api/agenda-events" && normalizedMethod === "GET") ||
    (["/api/stage-agenda", "/api/activities", "/api/activity-dependencies"].includes(String(pathname || "")) && normalizedMethod === "GET") ||
    (pathname === "/api/stages-admin" && normalizedMethod === "GET") ||
    (STAGE_READ_ROUTE.test(String(pathname || "")) && normalizedMethod === "GET") ||
    (pathname === "/api/workbench/state" && normalizedMethod === "GET" && !query.has("resource")) ||
    (pathname === "/api/workbench/diary" && normalizedMethod === "GET" && !query.has("resource"));
  return records || recordInference || timeline;
};
