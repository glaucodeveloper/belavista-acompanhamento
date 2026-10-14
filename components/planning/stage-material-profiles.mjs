export const createStageMaterialProfileHelpersV1 = ({ demoData }) => {
  const splitStageConfigList = (value) =>
    String(value || "")
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

  const normalizeStageMaterialRows = (rows = [], fallback = []) => {
    const source = Array.isArray(rows) && rows.length ? rows : fallback;
    return source
      .map((item, index) => ({
        id: String(item?.id || `material-${index + 1}`),
        name: String(item?.name || "").trim(),
        description: String(item?.description || item?.scope || "").trim(),
        quantity: item?.quantity == null ? "" : String(item.quantity),
        unit: String(item?.unit || "un").trim(),
        status: String(item?.status || "Planejado").trim(),
      }))
      .filter((item) => item.name || item.description || item.quantity);
  };

  const defaultStageMaterialRows = (stage) => {
    const fromDemo = normalizeStageMaterialRows(
      demoData.stageMaterials?.[stage.name] || [],
    );
    if (fromDemo.length) return fromDemo;
    return normalizeStageMaterialRows(
      (stage.materials || []).map((name, index) => ({
        id: `material-${index + 1}`,
        name,
        description: "Material base da etapa",
        quantity: "",
        unit: "un",
        status: "Planejado",
      })),
    );
  };

  const stageProfilesFromSettings = (settings) =>
    Object.fromEntries(
      Object.entries(settings?.stageProfiles || {}).map(([key, profile]) => [
        key,
        {
          requirements: splitStageConfigList(profile?.requirements),
          conditions: splitStageConfigList(profile?.conditions),
          typicalDescription: String(profile?.typicalDescription || "").trim(),
          organizationRequest: String(profile?.organizationRequest || "").trim(),
          organizationContext: String(profile?.organizationContext || "").trim(),
          requestHints: splitStageConfigList(profile?.requestHints),
          evidenceFocus: splitStageConfigList(profile?.evidenceFocus),
          procurementFocus: splitStageConfigList(profile?.procurementFocus),
          materialsTable: normalizeStageMaterialRows(profile?.materialsTable),
          notificationTargets: Object.fromEntries(
            Object.entries(profile?.notificationTargets || {}).map(
              ([role, list]) => [role, splitStageConfigList(list)],
            ),
          ),
        },
      ]),
    );

  return {
    splitStageConfigList,
    normalizeStageMaterialRows,
    defaultStageMaterialRows,
    stageProfilesFromSettings,
  };
};
