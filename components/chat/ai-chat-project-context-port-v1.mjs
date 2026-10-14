/** Immutable, read-only project context used to ground AI Chat interactions. */
export const createAiChatProjectContextPortV1 = ({ demoData, executionModel } = {}) => {
  if (!demoData?.metrics || !Array.isArray(demoData.activities))
    throw new TypeError("AI chat project context requires metrics and activities.");
  if (!executionModel || typeof executionModel !== "object")
    throw new TypeError("AI chat project context requires the execution model.");

  return Object.freeze({
    metrics: demoData.metrics,
    activities: demoData.activities,
    executionModel,
  });
};
