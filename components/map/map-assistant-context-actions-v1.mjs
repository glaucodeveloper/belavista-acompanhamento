/** Bridges map selections to the existing worker-chat context actions. */
export const createMapAssistantContextActionsV1 = ({
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
