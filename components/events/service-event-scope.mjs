import { createServiceEventGenerator } from "./generators/service-event-generator.mjs?v=service-event-generator-v1";

const isEventRoute = (route) =>
  route &&
  typeof route.eventType === "string" &&
  (route.selector == null || typeof route.selector === "string") &&
  typeof route.action === "string" &&
  typeof route.handler === "function";

const reportRouteFailure = (onError, error, context) => {
  try {
    onError(error, context);
  } catch (reportingError) {
    console.error("Event route error reporter failed.", reportingError);
  }
};

export const createServiceEventScope = ({
  service,
  routes,
  onError = (error, context) =>
    console.error(`[event:${context.service}/${context.action}]`, error),
}) => {
  const generator = createServiceEventGenerator({ service, onError });
  let active = true;
  const normalizedRoutes = (Array.isArray(routes) ? routes : []).filter(isEventRoute);

  const dispatchRoute = (route, { event, target, root }) => {
    if (!active) return;
    try {
      return generator.dispatch({
        service,
        action: route.action,
        event,
        target,
        root,
        handler: route.handler,
      });
    } catch (error) {
      reportRouteFailure(onError, error, { service, action: route.action });
    }
  };

  const scope = {
    service,
    routes: normalizedRoutes,
    program: generator.program,
    get active() {
      return active;
    },
    dispatch: (message) =>
      active ? generator.dispatch({ ...message, service }) : undefined,
    dispatchRoute,
    dispose() {
      if (!active) return;
      active = false;
      generator.dispose();
    },
  };

  return scope;
};
