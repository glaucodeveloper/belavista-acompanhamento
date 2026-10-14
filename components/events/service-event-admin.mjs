import { createServiceEventScope } from "./service-event-scope.mjs?v=service-event-scope-v1";
import {
  eventChannelKey,
  resolveServiceEventTarget,
} from "./service-event-route.mjs?v=service-event-route-v1";

const reportRouteFailure = (onError, error, context) => {
  try {
    onError(error, context);
  } catch (reportingError) {
    console.error("Event route error reporter failed.", reportingError);
  }
};

export const createServiceEventAdministrators = ({
  root,
  services,
  onError = (error, context) =>
    console.error(`[event:${context.service}/${context.action}]`, error),
}) => {
  if (!root?.addEventListener || !Array.isArray(services))
    throw new TypeError("Event administration requires an event root and services.");

  const serviceNames = new Set();
  for (const entry of services) {
    if (!entry || typeof entry.service !== "string") continue;
    if (serviceNames.has(entry.service))
      throw new TypeError(`Duplicate event service: ${entry.service}`);
    serviceNames.add(entry.service);
  }

  let active = true;
  const serviceScopes = services
      .filter((entry) => entry && typeof entry.service === "string")
      .map((entry) => ({
        capture: Boolean(entry.capture),
        scope: createServiceEventScope({
          service: entry.service,
          routes: entry.routes,
          onError,
        }),
      })),
    routesByChannel = new Map(),
    publicServices = new Map();

  for (const { capture, scope } of serviceScopes) {
    for (const route of scope.routes) {
      const key = eventChannelKey(route.eventType, capture),
        channel = routesByChannel.get(key) || {
          eventType: route.eventType,
          capture,
          routes: [],
          listener: null,
        };
      channel.routes.push({ scope, route });
      routesByChannel.set(key, channel);
    }
  }

  const detachInactiveChannels = () => {
    for (const channel of routesByChannel.values()) {
      if (
        channel.listener &&
        !channel.routes.some(({ scope }) => scope.active)
      ) {
        root.removeEventListener?.(
          channel.eventType,
          channel.listener,
          channel.capture,
        );
        channel.listener = null;
      }
    }
  };

  const dispatch = (scope, route, event) => {
    if (!active || !scope.active) return;
    let target;
    try {
      target = resolveServiceEventTarget(event, root, route.selector);
    } catch (error) {
      reportRouteFailure(onError, error, {
        service: scope.service,
        action: route.action,
      });
      return;
    }
    if (!target) return;
    return scope.dispatchRoute(route, { event, target, root });
  };

  try {
    for (const channel of routesByChannel.values()) {
      channel.listener = (event) => {
        if (!active) return;
        for (const { scope, route } of channel.routes) {
          if (!scope.active) continue;
          const result = dispatch(scope, route, event);
          if (result) return result;
        }
      };
      root.addEventListener(channel.eventType, channel.listener, channel.capture);
    }
  } catch (error) {
    active = false;
    for (const channel of routesByChannel.values()) {
      if (!channel.listener) continue;
      root.removeEventListener?.(
        channel.eventType,
        channel.listener,
        channel.capture,
      );
      channel.listener = null;
    }
    for (const { scope } of serviceScopes) scope.dispose();
    throw error;
  }

  const getService = (service) => {
    const scope = serviceScopes.find(
      (candidate) => candidate.scope.service === service,
    )?.scope;
    if (!scope) return undefined;
    if (publicServices.has(service)) return publicServices.get(service);

    const serviceApi = {
      service,
      program: scope.program,
      dispatch: (message) =>
        active && scope.active ? scope.dispatch(message) : undefined,
      dispose() {
        if (!scope.active) return;
        scope.dispose();
        detachInactiveChannels();
      },
    };
    publicServices.set(service, serviceApi);
    return serviceApi;
  };

  return {
    services: serviceScopes.map(({ scope }) => scope.service),
    programs: Object.fromEntries(
      serviceScopes.map(({ scope }) => [scope.service, scope.program]),
    ),
    getService,
    dispatch(service, message) {
      return getService(service)?.dispatch(message);
    },
    dispose() {
      if (!active) return;
      active = false;
      for (const channel of routesByChannel.values()) {
        if (!channel.listener) continue;
        root.removeEventListener?.(
          channel.eventType,
          channel.listener,
          channel.capture,
        );
        channel.listener = null;
      }
      for (const { scope } of serviceScopes) scope.dispose();
    },
  };
};

export const createServiceEventAdmin = ({ root, service, routes, onError, capture }) => {
  const administrators = createServiceEventAdministrators({
    root,
    services: [{ service, routes, capture }],
    onError,
  });
  const program = administrators.programs[service];
  return {
    service,
    program,
    dispatch: (message) => administrators.dispatch(service, message),
    dispose: () => administrators.dispose(),
  };
};
