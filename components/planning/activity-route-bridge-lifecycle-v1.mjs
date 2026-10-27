import { installActivityRouteBridgeV1 } from "./activity-route-bridge.mjs?v=focused-event-generators-v2";
import * as activityRouteBridgeComponentsTsV1 from "../../dist/frontend/components.js";

/** Install the MJS route bridge when the typed owner cannot be used. */
export const installActivityRouteBridgeLegacyLifecycleV1 = ({
  ViewLayer,
  workbenchActivityRouteV1,
  documentRef = globalThis.document,
  queueMicrotaskFn = globalThis.queueMicrotask?.bind(globalThis),
  bindBase,
} = {}) => {
  if (typeof ViewLayer?.prototype?.bind !== "function")
    throw new TypeError("Activity route bridge requires ViewLayer.bind().");
  if (typeof workbenchActivityRouteV1 !== "function")
    throw new TypeError("Activity route bridge requires the workbench route resolver.");

  const previousBind = bindBase || ViewLayer.prototype.bind;
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

/** Keep route-bridge events active on current and subsequently rendered views. */
export const installActivityRouteBridgeLifecycleV1 = ({
  ViewLayer,
  workbenchActivityRouteV1,
  activityCatalog = [],
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  queueMicrotaskFn = globalThis.queueMicrotask?.bind(globalThis),
} = {}) => {
  if (typeof ViewLayer?.prototype?.bind !== "function")
    throw new TypeError("Activity route bridge requires ViewLayer.bind().");
  if (typeof workbenchActivityRouteV1 !== "function")
    throw new TypeError("Activity route bridge requires the workbench route resolver.");
  const bindBase = ViewLayer.prototype.bind;

  let typedActivityRouteBridgeInstalledV1 = false;
  try {
    typedActivityRouteBridgeInstalledV1 =
      typeof activityRouteBridgeComponentsTsV1.installAtlasActivityRouteBridgeLifecycleV1 === "function"
      && activityRouteBridgeComponentsTsV1.installAtlasActivityRouteBridgeLifecycleV1({
        ViewLayer,
        activityCatalog,
        workbenchActivityRouteV1,
        documentRef,
        windowRef,
        queueMicrotaskFn,
      });
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] TypeScript activity-route bridge unavailable; keeping MJS fallback.", error);
  }
  if (typedActivityRouteBridgeInstalledV1) return ViewLayer.prototype.bind;
  return installActivityRouteBridgeLegacyLifecycleV1({
    ViewLayer, workbenchActivityRouteV1, documentRef, queueMicrotaskFn, bindBase,
  });
};
