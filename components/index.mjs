const { composeAtlasAdminComponentApplicationV1 } = await import("../dist/frontend/program.js");
if (typeof composeAtlasAdminComponentApplicationV1 !== "function")
  throw new TypeError("Composição TypeScript do Atlas não foi exportada.");
const componentExportsV1 = await composeAtlasAdminComponentApplicationV1();
export const {
  AppSidebar, AppTopbar, ViewLayer, MapFilterRail, MapScene,
  prepareAssistantLotStatusPromptV1, prepareAssistantMapAreaPromptV1, AiChat, ico, esc,
  COMPONENT_APPLICATION_CONFIGURATION_V1, ComponentApplicationProgramV1,
  driveComponentApplicationProgramV1, actorCanOpenView, isLimitedOperationalActor,
  normalizeOperationalRole, resolveStartupActor: resolveStartupActorV1,
} = componentExportsV1;
