export const SERVER_SYSTEM_CONFIGURATION_V1 = Object.freeze({
  developmentSeedEnvironment: 'development',
  seedOnlyWhenDatabaseIsClean: true
});

export const ServerInitializationProgramV1 = {
  *program({environment = process.env.NODE_ENV, configuration = SERVER_SYSTEM_CONFIGURATION_V1} = {}) {
    const seedResult = environment === configuration.developmentSeedEnvironment
      ? yield {type: 'initialize-clean-development-database'}
      : {status: 'skipped', reason: 'not-development'};
    yield {type: 'server-system-initialized', environment, seedResult};
    return {status: 'ready', environment, seedResult};
  }
};

export async function driveServerInitializationProgramV1(program, handlers) {
  let step = program.next();
  while (!step.done) {
    const handler = handlers?.[step.value?.type];
    if (typeof handler !== 'function') {
      throw new Error(`No server initialization handler for step: ${step.value?.type || 'unknown'}`);
    }
    step = program.next(await handler(step.value));
  }
  return step.value;
}
