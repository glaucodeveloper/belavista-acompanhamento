/** Browser window modeled as the root element of the application program. */
export const APPLICATION_SYSTEM_CONFIGURATION_V1 = Object.freeze({
  initialTheme: 'dark',
  initialMapMode: 'overview',
  sidebarCollapsed: false,
  activityDedicated: false,
  proposalFormOpen: false,
  contractEditing: null,
  stageActivityRefreshDelays: Object.freeze([0, 500, 1800, 4200]),
  deferredModuleActivationDelay: 900,
  mapWarmupDelay: 120
});

export const WindowElement = ({windowRef = globalThis.window, props = {}, children = []} = {}) => ({
  next(message = {}) {
    const element = message.element || windowRef;
    if (!element) throw new Error('Application window is unavailable.');
    return {
      done: false,
      value: Object.freeze({
        type: 'window-element',
        id: props.id || 'application-window',
        element,
        document: element.document,
        location: element.location,
        history: element.history,
        children: [...children]
      })
    };
  }
});

/**
 * The application boot sequence is a live program. Each yield is an explicit
 * state transition interpreted by the small driver below.
 */
export const ApplicationStateProgramV1 = {
  *program({windowElement = WindowElement(), config} = {}) {
    const applicationWindow = yield {type: 'resolve-window-element', component: windowElement};
    const authenticated = yield {type: 'await-authentication', applicationWindow};
    if (!authenticated) return {status: 'authentication-required'};

    const safeConfig = yield {type: 'sanitize-config', config};
    const state = yield {type: 'initialize-application-state', applicationWindow, config: safeConfig};
    yield {type: 'mount-application', applicationWindow, state};
    yield {type: 'activate-application-services', applicationWindow, state};
    return {status: 'ready', state};
  }
};

/** Execute yielded application effects without hiding their order from the program. */
export async function driveApplicationStateProgramV1(program, handlers) {
  let step = program.next();
  while (!step.done) {
    const effect = step.value;
    const handler = handlers?.[effect?.type];
    if (typeof handler !== 'function') {
      throw new Error(`No application boot handler for step: ${effect?.type || 'unknown'}`);
    }
    step = program.next(await handler(effect));
  }
  return step.value;
}
