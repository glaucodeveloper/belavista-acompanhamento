export const toneV5360 = (value) => {
  const text = String(value || "").toLowerCase();
  if (/concl|final|assinado|aprovad|feito|regular/.test(text)) return "done";
  if (/pend|atras|risco|bloq|análise|reserva/.test(text)) return "warn";
  return "active";
};

export const recordStageV5360 = (record) =>
  String(
    record?.etapa ||
      record?.stage ||
      record?.atividade ||
      "Etapa operacional",
  );

export const activityPeriodV5360 = (item, index = 0) =>
  String(item?.week || item?.date || item?.data || `Período ${index + 1}`);
