import * as atlasMapProgramTsV1 from "../../dist/frontend/program.js";

/** Keep the compositor API while the TypeScript program owns assistant context actions. */
export const createMapAssistantContextActionsV1 = (input = {}) => {
  const owner = atlasMapProgramTsV1.createPublicMapAssistantContextActions;
  return typeof owner === "function"
    ? owner(input)
    : createMapAssistantContextActionsFallbackV1(input);
};

/** Legacy behavior stays available until the authenticated MapScene path is revalidated. */
export const createMapAssistantContextActionsFallbackV1 = ({
  host,
  documentRef,
  commonAreaLabel,
  loadWorkerContextChat,
} = {}) => {
  if (!host || typeof host !== "object")
    throw new TypeError("Map assistant actions require the application host.");
  if (typeof loadWorkerContextChat !== "function")
    throw new TypeError("Map assistant actions require the worker-chat loader.");

  const prepareAssistantLotStatusPromptV1 = async (lotLabel) => {
    if (!host.belavistaWorkerAssistant?.openLotStatusContext)
      await loadWorkerContextChat();
    return host.belavistaWorkerAssistant?.openLotStatusContext?.(lotLabel) || false;
  };

  const prepareAssistantMapAreaPromptV1 = async (areaLabel) => {
    if (!host.belavistaWorkerAssistant?.openMapAreaContext)
      await loadWorkerContextChat();
    const label = String(areaLabel || commonAreaLabel).trim();
    return (
      host.belavistaWorkerAssistant?.openMapAreaContext?.(label) ||
      documentRef?.querySelector?.("ai-chat")?.prepareMapAreaPrompt?.(label) ||
      false
    );
  };

  return Object.freeze({
    prepareAssistantLotStatusPromptV1,
    prepareAssistantMapAreaPromptV1,
  });
};
