const stageOf = (record) =>
  String(record?.etapa || record?.stage || record?.atividade || "Etapa operacional");

const requireRecordEntryDependencies = (dependencies) => {
  const required = ["appStore", "demoData", "activityCatalog", "esc", "ico"];
  for (const name of required) {
    if (dependencies[name] == null)
      throw new TypeError(`Stage record entry page requires ${name}.`);
  }
  if (typeof dependencies.appStore.get !== "function" || typeof dependencies.appStore.set !== "function")
    throw new TypeError("Stage record entry page requires appStore.get() and set().");
  if (!Array.isArray(dependencies.demoData.activities) || !Array.isArray(dependencies.activityCatalog))
    throw new TypeError("Stage record entry page requires activity collections.");
  if (typeof dependencies.esc !== "function" || typeof dependencies.ico !== "function")
    throw new TypeError("Stage record entry page requires esc() and ico().");
  return dependencies;
};

/** Install the existing records-in-stage renderer and its state transitions. */
export const installStageRecordEntryPageV1 = (ViewLayer, dependencies = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype !== "object")
    throw new TypeError("Stage record entry page requires ViewLayer.prototype.");
  const { appStore, demoData, activityCatalog, esc, ico } = requireRecordEntryDependencies(dependencies);

  ViewLayer.prototype.records = function () {
    const state = appStore.get(),
      stages = Array.isArray(demoData.activities) ? demoData.activities : [],
      key = String(state.selectedStageV9 || state.selectedStage || ""),
      stage = stages.find((item) => String(item.id) === key || String(item.name) === key) || stages[0],
      name = stage?.name || "Etapa não selecionada",
      records = (state.records || []).filter(
        (record) => !state.stageRecordsContext || stageOf(record) === name,
      ),
      editing = state.records?.find((item) => String(item.id) === String(state.editingRecord)),
      catalog = activityCatalog
        .filter((item) => String(item.name || "").toLocaleLowerCase("pt-BR").includes(name.toLocaleLowerCase("pt-BR").split(" ")[0]))
        .slice(0, 6),
      activities = catalog.length
        ? catalog
        : [{ name: `Registrar avanço · ${name}`, nature: "Execução operacional" }],
      selected = state.recordContext?.atividade || activities[0]?.name || name;
    const option = (value, current) =>
      `<option value="${esc(value)}" ${String(current || "") === String(value) ? "selected" : ""}>${esc(value)}</option>`,
      stageItems = stages
        .map((item, index) =>
          `<button type="button" class="records-stage-choice-v1 ${item.id === stage?.id ? "active" : ""}" data-record-stage="${esc(item.id)}"><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(item.name)}</b><small>${Number(item.progress) || 0}% · ${esc(item.owner || "Responsável a definir")}</small><i><em style="width:${Number(item.progress) || 0}%"></em></i></button>`,
        )
        .join(""),
      activityItems = activities
        .map((item, index) =>
          `<button type="button" class="records-activity-choice-v1 ${item.name === selected ? "active" : ""}" data-record-activity="${esc(item.name)}"><span>${String(index + 1).padStart(2, "0")}</span><div><b>${esc(item.name)}</b><small>${esc(item.nature || "Execução operacional")} · pronto para registrar</small></div>${ico("arrow-up-right")}</button>`,
        )
        .join(""),
      history = records
        .slice()
        .reverse()
        .map((item) =>
          `<article class="records-history-row-v1"><div><span>${esc(item.id || "REG")}</span><b>${esc(item.atividade || "Atividade operacional")}</b><small>${esc(item.data || "—")} · ${esc(item.responsavel || "A definir")}</small></div><em>${esc(item.status || "Pendente")}</em></article>`,
        )
        .join("");
    return `<section class="records-stage-page-v1"><header class="workspace-head-v5362"><div><span>REGISTROS · ETAPA EM FOCO</span><h1>Adicionar registro</h1><p>Escolha uma etapa e uma atividade para registrar o apontamento com responsável, evidência e área do mapa.</p></div><button type="button" class="records-new" data-records-entry-new>${ico("plus")} Novo registro</button></header><div class="records-stage-layout-v1"><aside class="records-stage-picker-v1"><header><span>01 · ETAPAS</span><b>${stages.length} frentes</b><h2>Escolha uma etapa</h2><p>A seleção controla as atividades e o vínculo do registro.</p></header><div>${stageItems}</div></aside><main class="records-stage-main-v1"><section class="records-activity-panel-v1"><header><div><span>02 · ATIVIDADES DA FRENTE</span><h2>${esc(name)}</h2><p>${esc(stage?.owner || "Equipe responsável")} · progresso geral ${Number(stage?.progress) || 0}%</p></div><b>${activities.length} atividades</b></header><div>${activityItems}</div></section><section class="records-entry-panel-v1 ${state.editingRecord ? "open" : ""}"><header><div><span>03 · APONTAMENTO</span><h2>${state.editingRecord ? "Confirmar registro" : "Selecione uma atividade para registrar"}</h2><p>O registro será preservado no histórico desta etapa.</p></div></header><form class="record-form"><input type="hidden" name="obra" value="Aliança Park"><input type="hidden" name="etapa" value="${esc(name)}"><label>Atividade<select name="atividade">${activities.map((item) => option(item.name, selected)).join("")}</select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${esc(editing?.data || new Date().toISOString().slice(0, 10))}"></label><label>Hora<input name="hora" type="time" value="${esc(editing?.hora || "08:30")}"></label></div><label>Responsável<input name="responsavel" value="${esc(editing?.responsavel || "")}" placeholder="Encarregado ou equipe" required></label><label>Detalhes / medição<textarea name="detalhes" placeholder="Quantidade, ocorrência, medição ou evidência" required>${esc(editing?.detalhes || "")}</textarea></label><label>Foto / evidência<input name="evidenceUri" value="${esc(editing?.evidenceUri || "")}" placeholder="URL local ou caminho da foto"></label><input type="hidden" name="mapArea" value="${esc(editing?.mapArea || "")}"><div class="record-map-actions"><button type="button" class="record-map-paint" data-record-paint="new">${ico("paintbrush")} Pintar área no mapa</button><span>${editing?.mapArea ? "Área já vinculada" : "Nenhuma área vinculada"}</span></div><label>Status<select name="status">${option("Pendente", editing?.status)}${option("Concluído", editing?.status)}</select></label><footer><button type="submit" class="record-confirm">Confirmar registro</button>${state.editingRecord ? '<button type="button" class="record-cancel">Cancelar</button>' : ""}</footer></form></section><section class="records-stage-history-v1"><header><div><span>04 · HISTÓRICO DA ETAPA</span><h2>Registros preservados</h2></div><b>${records.length}</b></header>${history || "<p>Nenhum registro desta etapa. O primeiro apontamento aparecerá aqui.</p>"}</section></main></div></section>`;
  };

  const baseBind = dependencies.bindBase || ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = baseBind?.apply(this, args);
    if (appStore.get().view !== "records") return result;
    this.querySelectorAll("[data-record-stage]").forEach((button) =>
      button.addEventListener("click", () => {
        const stage = demoData.activities.find((item) => String(item.id) === String(button.dataset.recordStage));
        appStore.set({
          view: "records",
          selectedStage: stage?.id,
          selectedStageV9: null,
          stageRecordsContext: true,
          editingRecord: null,
          recordContext: null,
          lastAction: `Selecionou a etapa ${stage?.name || ""}`,
        });
      }),
    );
    this.querySelectorAll("[data-record-activity]").forEach((button) =>
      button.addEventListener("click", () => {
        const stage = demoData.activities.find((item) => String(item.id) === String(appStore.get().selectedStage));
        appStore.set({
          editingRecord: "new",
          recordContext: {
            atividade: button.dataset.recordActivity,
            stage: stage?.name || "",
          },
          lastAction: `Preparou registro de ${button.dataset.recordActivity}`,
        });
      }),
    );
    this.querySelector("[data-records-entry-new]")?.addEventListener("click", () =>
      appStore.set({
        editingRecord: "new",
        recordContext: null,
        lastAction: "Abriu formulário de novo registro",
      }),
    );
    return result;
  };

  return ViewLayer;
};
