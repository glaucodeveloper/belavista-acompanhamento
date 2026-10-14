// Planejamento de duração das etapas: centraliza regras de estimativa e
// distribuição de pacotes sem acoplar o cálculo ao ViewLayer.
export const createStageTimeModelsV1 = ({ demoData, stageOverlayKey }) => {
  const WORKDAY_HOURS = 8;
  const STAGE_TIME_DEFAULTS = {
    terraplanagem: 64,
    drenagem: 72,
    pavimentacao: 80,
    "rede-agua": 56,
    "rede-eletrica": 64,
    sinalizacao: 32,
    urbanizacao: 48,
  };
  const STAGE_WORK_PACKETS = [
    "Preparar frente",
    "Executar atividade principal",
    "Validar medição",
    "Liberar próxima frente",
  ];
  const numericTime = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const durationFromItem = (item, index = 0) => {
    const direct = [
      item?.durationHours,
      item?.plannedHours,
      item?.estimatedHours,
      item?.hours,
      item?.properties?.durationHours,
      item?.properties?.plannedHours,
    ]
      .map(numericTime)
      .find(Boolean);
    if (direct) return direct;
    const days = [
      item?.durationDays,
      item?.plannedDays,
      item?.properties?.durationDays,
    ]
      .map(numericTime)
      .find(Boolean);
    if (days) return days * WORKDAY_HOURS;
    const start = Date.parse(item?.plannedStart || item?.start || "");
    const end = Date.parse(item?.plannedEnd || item?.end || "");
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start)
      return Math.max(0.5, (end - start) / 3600000);
    const key = stageOverlayKey(item?.name);
    return STAGE_TIME_DEFAULTS[key] || Math.max(24, 40 + index * 8);
  };
  const formatHours = (hours) => {
    const value = Math.round(Number(hours || 0) * 2) / 2;
    if (value < WORKDAY_HOURS) return `${String(value).replace(".", ",")} h`;
    const days = Math.floor(value / WORKDAY_HOURS),
      rest = Math.round((value - days * WORKDAY_HOURS) * 2) / 2;
    return rest
      ? `${days} d ${String(rest).replace(".", ",")} h`
      : `${days} ${days === 1 ? "dia" : "dias"}`;
  };
  const planningDate = (day) =>
    new Date(Date.UTC(2024, 5, 3) + Math.max(0, day - 1) * 86400000);
  const formatPlanningDate = (day) =>
    planningDate(day).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  const buildStageTimeModels = (stages = demoData.activities) => {
    let cursor = 1;
    return stages.map((stage, index) => {
      const totalHours = durationFromItem(stage, index),
        packetHours = [0.18, 0.52, 0.15, 0].map(
          (weight) => Math.round(totalHours * weight * 2) / 2,
        );
      packetHours[3] = Math.max(
        0.5,
        Math.round(
          (totalHours -
            packetHours.slice(0, 3).reduce((sum, value) => sum + value, 0)) *
            2,
        ) / 2,
      );
      const tasks = [];
      let taskDay = cursor;
      packetHours.forEach((hours, taskIndex) => {
        const days = Math.max(0.5, hours / WORKDAY_HOURS),
          endDay = taskDay + Math.max(0.5, Math.ceil(days)) - 1;
        tasks.push({
          name: STAGE_WORK_PACKETS[taskIndex],
          hours,
          startDay: taskDay,
          endDay,
        });
        taskDay = endDay + 1;
      });
      const model = {
        stage,
        totalHours,
        startDay: cursor,
        endDay: Math.max(cursor, taskDay - 1),
        tasks,
      };
      cursor = model.endDay + 1;
      return model;
    });
  };
  const findStageTimeModel = (stage, models = buildStageTimeModels()) =>
    models.find(
      (model) => model.stage === stage || model.stage?.name === stage,
    ) || models[0];

  return {
    WORKDAY_HOURS,
    STAGE_WORK_PACKETS,
    buildStageTimeModels,
    findStageTimeModel,
    formatHours,
    formatPlanningDate,
  };
};
