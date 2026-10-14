/**
 * The index's component integrations execute in this documented order. Each
 * group installs the existing feature modules; this is an ordering contract,
 * not a parallel registry of replacement components.
 */
export const COMPONENT_APPLICATION_CONFIGURATION_V1 = Object.freeze({
  root: 'components/index.mjs',
  groups: Object.freeze([
    'shared-elements-and-navigation',
    'planning-and-stages',
    'finance-and-repasses',
    'commercial-and-brokers',
    'records-and-activities',
    'operational-ai-chat'
  ])
});

export const ComponentApplicationProgramV1 = {
  *program({host = globalThis, configuration = COMPONENT_APPLICATION_CONFIGURATION_V1, compose} = {}) {
    const runtime = yield {type: 'resolve-component-runtime', host};
    const validatedConfiguration = yield {type: 'validate-component-configuration', configuration};
    const components = yield {type: 'compose-component-application', runtime, configuration: validatedConfiguration, compose};
    yield {type: 'publish-component-application', runtime, components};
    return components;
  }
};

export async function driveComponentApplicationProgramV1(program, handlers) {
  let step = program.next();
  while (!step.done) {
    const handler = handlers?.[step.value?.type];
    if (typeof handler !== 'function') {
      throw new Error(`No component application handler for step: ${step.value?.type || 'unknown'}`);
    }
    step = program.next(await handler(step.value));
  }
  return step.value;
}
