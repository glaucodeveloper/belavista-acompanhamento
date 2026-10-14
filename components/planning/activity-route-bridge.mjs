import { createServiceEventAdmin } from "../events/service-event-admin.mjs?v=service-event-admin-v4";

const ACTIVITY_ROUTE_BRIDGE_SELECTORS_V1 =
  "[data-v5362-activity],[data-v5360-stage-card],[data-v5356-stage-activity],[data-activity-v9],[data-activity-detail],[data-activity-open],[data-activity-card],[data-agenda-item]";

export const installActivityRouteBridgeV1 = (root, resolveActivityRoute) => {
  if (!root || root.__activityRouteBridgeV1) return;
  const administrator = createServiceEventAdmin({
    root,
    service: "activity-route-bridge",
    capture: true,
    routes: [
      {
        eventType: "click",
        selector: ACTIVITY_ROUTE_BRIDGE_SELECTORS_V1,
        action: "open-activity-route",
        handler: ({ event, target }) => {
          if (target.closest("[data-activity-location-editor]")) return;
          if (
            target.matches("[data-agenda-item-menu]") ||
            target.closest("[data-agenda-item-menu]")
          )
            return;
          if (
            target.matches("[data-activity-edit],[data-activity-delete]") ||
            target.closest("[data-activity-edit],[data-activity-delete]")
          )
            return;
          if (
            target.matches(
              "[data-activity-v9],[data-activity-open],[data-activity-card]",
            ) ||
            target.closest(
              "[data-activity-v9],[data-activity-open],[data-activity-card]",
            )
          )
            return;
          if (target.dataset.dragged === "true" || target.dataset.moved === "true")
            return;
          let activityValue =
            target.dataset.activityV9 ||
            target.dataset.v5362Activity ||
            target.dataset.v5360StageCard ||
            target.dataset.v5356StageActivity ||
            target.dataset.activityDetail ||
            "";
          if (target.matches("[data-activity-open]"))
            activityValue =
              activityCatalog[Number(target.dataset.activityOpen)]?.name ||
              activityValue;
          if (!activityValue && target.matches("[data-agenda-item]"))
            activityValue =
              target.querySelector(".agenda-item-copy strong")?.textContent || "";
          if (!activityValue && target.matches("[data-activity-card]"))
            activityValue = target.querySelector("h3,h2,strong")?.textContent || "";
          if (!activityValue) return;
          const stageValue =
            target.dataset.stage || target.closest("[data-stage]")?.dataset.stage || "";
          event.preventDefault();
          event.stopImmediatePropagation();
          window.location.assign(resolveActivityRoute(activityValue, stageValue));
        },
      },
    ],
  });
  root.__activityRouteBridgeV1 = administrator;
  return administrator;
};
