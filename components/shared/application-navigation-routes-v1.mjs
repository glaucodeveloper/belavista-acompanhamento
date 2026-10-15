/** Canonical URL routes and sidebar transitions shared by app startup and navigation. */
export const APP_VIEW_ALIASES_V1 = Object.freeze({
  stages: "agenda",
  lotes: "brokers-board",
  repasse: "repasses",
  finance: "control",
  contracts: "control",
  proposals: "control",
  "commission-deal": "control",
  actions: "activities",
});

const APP_DIRECT_VIEWS_V1 = new Set([
  "map", "control", "lot-development", "lot-profile", "stages", "materials",
  "agenda", "activities", "progress", "records", "foremen",
  "messages", "brokers", "broker-detail", "sales-history", "brokers-board",
  "cash-record", "repasses", "settings", "activity-installation",
]);

export const resolveApplicationRouteV1 = (rawView) => {
  const requested = String(rawView || ""),
    aliasedView = APP_VIEW_ALIASES_V1[requested] || requested,
    requestedView = aliasedView === "assistant"
      ? "map"
      : ["pert", "raid", "raci"].includes(aliasedView)
        ? "agenda"
        : APP_DIRECT_VIEWS_V1.has(aliasedView)
          ? aliasedView
          : "map";
  return Object.freeze({ aliasedView, requestedView });
};

export const resolveSidebarNavigationTargetV1 = (rawView) => {
  const requestedNext = rawView === "inventory" || rawView === "assistant"
      ? "map"
      : String(rawView || ""),
    next = ["documents", "personnel", "leads", "reports"].includes(requestedNext)
      ? "map"
      : ["contracts", "commission-deal", "proposals"].includes(requestedNext)
        ? "control"
      : requestedNext === "actions" ? "activities" : requestedNext === "stages" ? "agenda" : requestedNext;
  return Object.freeze({ requestedNext, next });
};
