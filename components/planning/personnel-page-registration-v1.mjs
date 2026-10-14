import { installForemenDirectoryPageV1, installStageForemenTabV1 } from "./foremen-directory-v1.mjs?v=foremen-directory-v2";

/** Register the staff directory, stage foremen tab, and legacy collaborators route. */
export const installPersonnelPageRegistrationV1 = ({
  ViewLayer,
  appStore,
  executionModel,
  publishOperationalEvent,
  extensionStage,
  personnelModel,
  stageV9LiveFor,
  esc,
  ico,
  logger = globalThis.console,
  host = globalThis,
} = {}) => {
  installForemenDirectoryPageV1(ViewLayer, {
    appStore,
    esc,
    executionModel,
    publishOperationalEvent,
    logger,
    host,
  });
  installStageForemenTabV1(ViewLayer, {
    appStore,
    extensionStage,
    personnelModel,
    stageV9LiveFor,
    esc,
    ico,
  });

  // Keep the historical route as an alias of the actual personnel page.
  ViewLayer.prototype.collaborators = function () {
    return this.personnel();
  };
};
