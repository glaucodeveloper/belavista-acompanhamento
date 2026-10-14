export const createWorkbenchActivityRouteResolverV1 = ({
  appStore,
  demoData,
  executionModel,
  STAGE_WORKBENCH,
  findWorkbenchActivity,
  runtimeRouteV1,
}) => {
  const normalizeActivityRouteTextV1 = (value) =>
    String(value ?? "")
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const activityRouteStageHintsV1 = {
    project: [
      "projet",
      "design",
      "levantamento",
      "locacao",
      "locação",
      "sondagem",
    ],
    earthwork: [
      "terra",
      "terraplan",
      "abertura",
      "subleito",
      "caçamba",
      "cacamba",
    ],
    drainage: ["dren", "pluvial", "vala", "manilha", "boca de lobo"],
    water: ["agua", "água", "pead", "cavalete", "ramal", "pressao", "pressão"],
    curbs: ["meio fio", "meio-fio", "sarjeta", "acessibilidade"],
    paving: ["paviment", "paralelep", "pedra", "calceteiro"],
    electrical: ["eletric", "coelba", "poste", "iluminacao", "iluminação"],
    signage: ["as built", "sinalizacao", "sinalização", "entrega", "garantia"],
  };

  const workbenchStageFromValueV1 = (value) => {
    const token = normalizeActivityRouteTextV1(value);
    if (!token) return null;
    const direct = STAGE_WORKBENCH.find((stage) =>
      [stage.key, stage.title, ...stage.aliases].some(
        (candidate) => normalizeActivityRouteTextV1(candidate) === token,
      ),
    );
    if (direct) return direct;
    // Algumas versões antigas exibem o cartão com o ID numérico de
    // `demoData.activities` (por exemplo, 1 = Terraplanagem). Converta esse
    // valor pelo nome da etapa antes de tentar qualquer fallback heurístico.
    const legacyStage = Array.isArray(demoData?.activities)
      ? demoData.activities.find(
          (item) =>
            String(item?.id ?? "") === String(value ?? "") ||
            normalizeActivityRouteTextV1(item?.name) === token,
        )
      : null;
    if (legacyStage) {
      const matching = STAGE_WORKBENCH.find(
        (stage) =>
          normalizeActivityRouteTextV1(stage.title) ===
            normalizeActivityRouteTextV1(legacyStage.name) ||
          stage.aliases.some(
            (alias) =>
              normalizeActivityRouteTextV1(alias) ===
              normalizeActivityRouteTextV1(legacyStage.name),
          ),
      );
      if (matching) return matching;
    }
    const model = Array.isArray(executionModel.stages)
      ? executionModel.stages.find((stage) =>
          [stage.key, stage.id, stage.name].some(
            (candidate) => normalizeActivityRouteTextV1(candidate) === token,
          ),
        )
      : null;
    if (model) {
      const modelToken = normalizeActivityRouteTextV1(model.key || model.name);
      const matching = STAGE_WORKBENCH.find(
        (stage) =>
          normalizeActivityRouteTextV1(stage.key) === modelToken ||
          normalizeActivityRouteTextV1(stage.title) ===
            normalizeActivityRouteTextV1(model.name) ||
          stage.aliases.some(
            (alias) => normalizeActivityRouteTextV1(alias) === modelToken,
          ),
      );
      if (matching) return matching;
    }
    const hinted = STAGE_WORKBENCH.find((stage) =>
      (activityRouteStageHintsV1[stage.key] || []).some((hint) =>
        token.includes(normalizeActivityRouteTextV1(hint)),
      ),
    );
    return hinted || null;
  };

  const workbenchActivityForValueV1 = (stage, value) => {
    const token = normalizeActivityRouteTextV1(value);
    if (!stage || !token) return stage?.activities?.[0] || null;
    const direct = stage.activities.find((item) =>
      [item.id, item.title].some(
        (candidate) => normalizeActivityRouteTextV1(candidate) === token,
      ),
    );
    if (direct) return direct;
    const partial = stage.activities.find((item) => {
      const itemToken = normalizeActivityRouteTextV1(item.id + " " + item.title);
      return itemToken.includes(token) || token.includes(itemToken);
    });
    if (partial) return partial;
    const packet =
      token.includes("prepar") || token.includes("frente")
        ? "front"
        : token.includes("execut") || token.includes("realiz")
          ? "execute"
          : token.includes("med") || token.includes("valid")
            ? "measure"
            : token.includes("liber") || token.includes("proxim")
              ? "release"
              : "";
    const packetIndex = {
      front: 0,
      execute: Math.min(1, stage.activities.length - 1),
      measure: Math.max(0, stage.activities.length - 2),
      release: stage.activities.length - 1,
    }[packet];
    return (
      stage.activities[packetIndex == null ? 0 : packetIndex] ||
      stage.activities[0]
    );
  };

  const workbenchActivityRouteV1 = (activityValue = "", stageValue = "") => {
    const raw = String(activityValue ?? "").trim();
    const parts = raw.split(":");
    const embeddedStage =
      parts.length > 1 ? workbenchStageFromValueV1(parts[0]) : null;
    const candidateStage =
      parts.length === 1 ? workbenchStageFromValueV1(raw) : null;
    const state = appStore.get?.() || {};
    const stateStage =
      state.selectedStageV9 || state.selectedStage || state.stageSelected || "";
    const stage =
      embeddedStage ||
      candidateStage ||
      workbenchStageFromValueV1(stageValue) ||
      workbenchStageFromValueV1(stateStage) ||
      STAGE_WORKBENCH[0];
    const requestedActivity = embeddedStage ? parts.slice(1).join(":") : raw;
    const activity =
      workbenchActivityForValueV1(stage, requestedActivity) ||
      findWorkbenchActivity(stage.key, stage.activities[0]?.id).activity;
    return runtimeRouteV1(
      "/admin/workers/activity",
      `stage=${encodeURIComponent(stage.key)}&activity=${encodeURIComponent(activity.id)}`,
    );
  };

  return {
    normalizeActivityRouteTextV1,
    workbenchStageFromValueV1,
    workbenchActivityForValueV1,
    workbenchActivityRouteV1,
  };
};
