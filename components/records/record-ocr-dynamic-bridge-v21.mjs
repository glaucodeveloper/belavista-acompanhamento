/** Publishes the live application ports and stage vocabulary used by OCR/chat. */
export const installRecordOcrDynamicBridgeV21 = ({
  host = globalThis,
  apiFetch,
  operationalHeaders,
  appStore,
  executionModel,
  stageProfileSettingsFor,
} = {}) => {
  if (!host || !appStore?.get || !Array.isArray(executionModel?.stages))
    throw new TypeError("Record OCR bridge requires the live app store and execution model.");

  const labels = (value) =>
    (Array.isArray(value) ? value : [])
      .map((item) => typeof item === "string"
        ? item
        : [item?.name, item?.title, item?.description].filter(Boolean).join(": "))
      .filter(Boolean)
      .slice(0, 20);

  host.__BELAVISTA_RECORD_OCR_BRIDGE_V21 = {
    apiFetch,
    operationalHeaders,
    appStore,
    stages: executionModel.stages
      .map((stage) => {
        const profile = {
          ...(stage.executionProfile || {}),
          ...(stageProfileSettingsFor(stage.key) || {}),
        };
        return {
          key: String(stage.key || ""),
          name: String(stage.name || ""),
          description: String(
            stage.description || profile.typicalDescription || profile.executionDescription || "",
          ).slice(0, 900),
          activityHints: [
            ...labels(profile.requestHints),
            ...labels(profile.expectedActivities),
            ...labels(profile.evidenceFocus),
          ].slice(0, 20),
          activities: (Array.isArray(stage.activities) ? stage.activities : [])
            .slice(0, 24)
            .map((activity) => ({
              id: String(activity?.id || activity?.key || ""),
              name: String(activity?.name || activity?.title || "").slice(0, 180),
              description: String(activity?.description || activity?.details || "").slice(0, 360),
            }))
            .filter((activity) => activity.name || activity.description),
          unit: String(stage.production?.unit || ""),
          materials: labels(
            profile.materialsTable?.length ? profile.materialsTable : stage.materials,
          ),
        };
      })
      .filter((stage) => stage.key && stage.name),
  };

  return host.__BELAVISTA_RECORD_OCR_BRIDGE_V21;
};
