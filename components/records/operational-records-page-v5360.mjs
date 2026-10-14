export const createOperationalRecordsPageV5360 = ({
  appStore,
  demoData,
  activityCatalog,
  esc,
  ico,
  stageOf,
}) => {
return function operationalRecordsPageV5360() {
  const state = appStore.get(),
    allStages = Array.isArray(demoData.activities) ? demoData.activities : [];
  const stageKey = String(
    state.selectedStageV9 ||
      state.selectedStage ||
      state.recordFilters?.stage ||
      "",
  );
  const stage =
    allStages.find(
      (item) => String(item.id) === stageKey || String(item.name) === stageKey,
    ) || allStages[0];
  const stageName = stage?.name || "Etapa não selecionada";
  const term = stageName.toLocaleLowerCase("pt-BR").split(" ")[0];
  const stageActivities = activityCatalog.filter(
    (item) =>
      String(item.name || "")
        .toLocaleLowerCase("pt-BR")
        .includes(term) ||
      String(item.nature || "")
        .toLocaleLowerCase("pt-BR")
        .includes(term),
  );
  const activities = stageActivities.length
    ? stageActivities
    : [
        {
          name: `Registrar avanço · ${stageName}`,
          nature: "Execução operacional",
          initial: ["Frente de serviço", "Responsável", "Data prevista"],
          execution: ["Avanço executado", "Medição", "Evidência", "Pendências"],
        },
      ];
  const records = (state.records || []).filter(
    (record) =>
      !state.stageRecordsContext ||
      stageName === stageOf(record) ||
      String(record.atividade || "")
        .toLocaleLowerCase("pt-BR")
        .includes(term),
  );
  const selectedActivity =
    state.recordContext?.atividade || activities[0]?.name || stageName;
  const editing = state.records?.find(
    (item) => String(item.id) === String(state.editingRecord),
  );
  const opt = (value, label, current) =>
    `<option value="${esc(value)}" ${String(current || "") === String(value) ? "selected" : ""}>${esc(label)}</option>`;
  const stageCards = allStages
    .map(
      (item) =>
        `<button type="button" class="records-stage-choice-v1 ${item.id === stage?.id ? "active" : ""}" data-record-stage="${esc(item.id)}"><span>${String(allStages.indexOf(item) + 1).padStart(2, "0")}</span><b>${esc(item.name)}</b><small>${Number(item.progress) || 0}% · ${esc(item.owner || "Responsável a definir")}</small><i><em style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%"></em></i></button>`,
    )
    .join("");
  const activityRows = activities
    .map(
      (item, index) =>
        `<button type="button" class="records-activity-choice-v1 ${item.name === selectedActivity ? "active" : ""}" data-record-activity="${esc(item.name)}"><span>${String(index + 1).padStart(2, "0")}</span><div><b>${esc(item.name)}</b><small>${esc(item.nature || "Execução operacional")} · pronto para registrar</small></div>${ico("arrow-up-right")}</button>`,
    )
    .join("");
  const rows = records
    .slice()
    .reverse()
    .slice(0, 30)
    .map(
      (record) =>
        `<article class="records-history-row-v1"><div><span>${esc(record.id || "REG")}</span><b>${esc(record.atividade || "Atividade operacional")}</b><small>${esc(record.data || "—")} · ${esc(record.responsavel || "A definir")}</small></div><em>${esc(record.status || "Pendente")}</em></article>`,
    )
    .join("");
  return `<section class="records-stage-page-v1"><header class="workspace-head-v5362"><div><span>REGISTROS · ETAPA EM FOCO</span><h1>Adicionar registro</h1><p>Escolha uma etapa, abra a atividade correspondente e confirme o apontamento com evidências.</p></div><button type="button" class="records-new" data-records-entry-new>${ico("plus")} Novo registro</button></header><div class="records-stage-layout-v1"><aside class="records-stage-picker-v1"><header><span>01 · ETAPAS</span><b>${allStages.length} frentes navegáveis</b><h2>Escolha uma etapa</h2><p>A seleção da frente controla as atividades e o vínculo do registro.</p></header><div>${stageCards}</div></aside><main class="records-stage-main-v1"><section class="records-activity-panel-v1"><header><div><span>02 · ATIVIDADES DA FRENTE</span><h2>${esc(stageName)}</h2><p>${esc(stage?.owner || "Equipe responsável")} · progresso geral ${Number(stage?.progress) || 0}% · selecione uma unidade de produção.</p></div><b>${activities.length} atividades</b></header><div>${activityRows}</div></section><section class="records-entry-panel-v1 ${state.editingRecord ? "open" : ""}"><header><div><span>03 · APONTAMENTO</span><h2>${state.editingRecord ? "Confirmar registro" : "Selecione uma atividade para registrar"}</h2><p>O registro fica vinculado à etapa ${esc(stageName)} e pode receber área do mapa, responsável e evidências.</p></div></header><form class="record-form" data-record-stage-form><input type="hidden" name="obra" value="Aliança Park"><input type="hidden" name="etapa" value="${esc(stageName)}"><label>Atividade<select name="atividade">${activities.map((item) => opt(item.name, item.name, selectedActivity)).join("")}</select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${esc(editing?.data || new Date().toISOString().slice(0, 10))}"></label><label>Hora<input name="hora" type="time" value="${esc(editing?.hora || "08:30")}"></label></div><label>Responsável<input name="responsavel" value="${esc(editing?.responsavel || "")}" placeholder="Encarregado ou equipe" required></label><label>Detalhes / medição<textarea name="detalhes" placeholder="Quantidade produzida, ocorrência, medição ou evidência" required>${esc(editing?.detalhes || "")}</textarea></label><label>Foto / evidência<input name="evidenceUri" value="${esc(editing?.evidenceUri || "")}" placeholder="URL local ou caminho da foto"></label><input type="hidden" name="mapArea" value="${esc(editing?.mapArea || "")}"><div class="record-map-actions"><button type="button" class="record-map-paint" data-record-paint="${esc(editing?.id || "new")}">${ico("paintbrush")} Pintar área no mapa</button><span>${editing?.mapArea ? "Área já vinculada" : "Nenhuma área vinculada"}</span></div><label>Status<select name="status">${opt("Pendente", "Pendente", editing?.status)}${opt("Concluído", "Concluído", editing?.status)}</select></label><footer><button type="submit" class="record-confirm">Confirmar registro</button>${state.editingRecord ? '<button type="button" class="record-cancel">Cancelar</button>' : ""}</footer></form></section><section class="records-stage-history-v1"><header><div><span>04 · HISTÓRICO DA ETAPA</span><h2>Registros preservados</h2></div><b>${records.length}</b></header>${rows || "<p>Nenhum registro desta etapa. O primeiro apontamento aparecerá aqui.</p>"}</section></main></div></section>`;
};
};

export const createStageRecordContextPageV1 = ({
  baseRecordsPage,
  appStore,
  demoData,
  esc,
}) =>
  function stageRecordContextPageV1(...args) {
    const state = appStore.get(),
      stage = state.stageRecordsContext
        ? demoData.activities.find(
            (item) => String(item.id) === String(state.selectedStage),
          )
        : null;
    const html = baseRecordsPage?.apply(this, args) || "";
    if (!stage) return html;
    return html
      .replace(
        '<span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1>',
        `<span class="activity-kind">REGISTROS DA ETAPA · ${esc(stage.id || "ETAPA")}</span><h1>Registros · ${esc(stage.name)}</h1>`,
      )
      .replace(
        "Obra → atividade → evidência → responsável → confirmação.",
        "Lançamentos, medições e evidências vinculados exclusivamente a esta etapa.",
      );
  };

