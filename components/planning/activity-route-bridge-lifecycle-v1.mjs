import { installActivityRouteBridgeV1 } from "./activity-route-bridge.mjs?v=focused-event-generators-v2";

/** Keep route-bridge events active on current and subsequently rendered views. */
export const installActivityRouteBridgeLifecycleV1 = ({
  ViewLayer,
  workbenchActivityRouteV1,
  documentRef = globalThis.document,
  queueMicrotaskFn = globalThis.queueMicrotask?.bind(globalThis),
} = {}) => {
  if (typeof ViewLayer?.prototype?.bind !== "function")
    throw new TypeError("Activity route bridge requires ViewLayer.bind().");
  if (typeof workbenchActivityRouteV1 !== "function")
    throw new TypeError("Activity route bridge requires the workbench route resolver.");

  const previousBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = previousBind.apply(this, args);
    installActivityRouteBridgeV1(this, workbenchActivityRouteV1);
    return result;
  };

  if (documentRef)
    queueMicrotaskFn(() => {
      documentRef
        .querySelectorAll("view-layer")
        .forEach((root) => installActivityRouteBridgeV1(root, workbenchActivityRouteV1));
    });

  return ViewLayer.prototype.bind;
};
