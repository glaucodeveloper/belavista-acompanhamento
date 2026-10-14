import { AtlasActivitiesListV1 } from "./atlas-activities-list-v1.mjs";

const renderStageActivityRecordModalV1 = ({ stage, packet, live, esc, ico, DateRef }) =>
  `<div class="activity-record-modal-v1" data-activity-record-modal role="dialog" aria-modal="true" aria-labelledby="activity-record-modal-title"><div class="activity-record-modal-card"><header><div><span class="activity-kind">NOVO REGISTRO · ATIVIDADE</span><h2 id="activity-record-modal-title">Novo registro</h2><p>${esc(packet.label)} · ${esc(stage.name)} · responsável ${esc(live.owner || "A definir")}</p></div><button type="button" class="activity-record-modal-close" data-activity-record-close aria-label="Fechar novo registro">×</button></header><form class="record-form activity-record-modal-form" data-activity-record-form><input type="hidden" name="obra" value="Aliança Park"><input type="hidden" name="etapa" value="${esc(stage.name)}"><input type="hidden" name="categoria" value="${esc(stage.name)}"><div class="activity-record-modal-grid"><label>Atividade<input name="atividade" value="${esc(packet.label)}" readonly></label><label>Data<input name="data" type="date" value="${new DateRef().toISOString().slice(0, 10)}" required></label><label>Hora<input name="hora" type="time" value="08:30" required></label><label>Responsável<input name="responsavel" value="${esc(live.owner || "")}" placeholder="Encarregado ou equipe" required></label><label class="wide">Detalhes / medição<textarea name="detalhes" placeholder="Quantidade, ocorrência, medição ou evidência" required></textarea></label><label class="wide">Foto / evidência<input name="evidenceUri" placeholder="URL local ou referência do comprovante"></label><section class="activity-record-attachments-v1"><header><span class="activity-kind">ANEXOS · REGISTRO</span><small>Imagem ou documento</small></header><label class="activity-record-dropzone-v1"><span>${ico("paperclip")}<b>Adicionar foto ou documento</b><small>JPG, PNG, WEBP, PDF ou Office · imagem até 6 MB · documento até 12 MB</small></span><input name="attachments" type="file" data-activity-record-attachments multiple accept="image/*,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"></label><div class="activity-record-attachment-list-v1" data-activity-record-attachment-list hidden></div><button type="button" class="activity-record-attachments-clear-v1" data-activity-record-attachments-clear hidden>Limpar anexos</button><p class="activity-record-attachments-note-v1">Os anexos acompanham a revisão deste registro e ficam identificados no Diário.</p></section><input type="hidden" name="mapArea" value=""><label>Status<select name="status"><option>Pendente</option><option>Concluído</option></select></label></div><footer class="activity-record-modal-actions"><button type="button" class="button button-secondary" data-activity-record-close>Cancelar</button><button type="submit" class="button button-primary record-confirm">Confirmar registro</button></footer></form></div></div>`;

/** Install the activity catalog and stage-specific detail route on ViewLayer. */
export const installStageActivityPageV1 = (ViewLayer, {
  appStore,
  executionModel,
  activityCatalog,
  extensionStage,
  stageV9FlowPackets,
  stageV9ProfileFor,
  stageV9LiveFor,
  stageV9MaterialsFor,
  stageV9BudgetFor,
  stageOf,
  stageV9ProductionFor,
  stageV9DirectiveText,
  formatBRL,
  apiFetch,
  esc,
  ico,
  Date: DateRef = Date,
} = {}) => {
  if (typeof ViewLayer !== "function" || !ViewLayer.prototype)
    throw new TypeError("Stage activity page requires a ViewLayer constructor.");
  if (typeof appStore?.get !== "function")
    throw new TypeError("Stage activity page requires appStore.get().");
  if (!Array.isArray(executionModel?.stages))
    throw new TypeError("Stage activity page requires executionModel.stages.");
  if (!Array.isArray(activityCatalog))
    throw new TypeError("Stage activity page requires activityCatalog.");
  if (typeof apiFetch !== "function")
    throw new TypeError("Stage activity page requires apiFetch().");
  if (typeof extensionStage !== "function")
    throw new TypeError("Stage activity page requires extensionStage().");
  for (const [name, value] of Object.entries({
    stageV9FlowPackets,
    stageV9ProfileFor,
    stageV9LiveFor,
    stageV9MaterialsFor,
    stageV9BudgetFor,
    stageOf,
    stageV9ProductionFor,
    stageV9DirectiveText,
    formatBRL,
    esc,
    ico,
    DateRef,
  }))
    if (typeof value !== "function")
      throw new TypeError(`Stage activity page requires ${name}().`);

  ViewLayer.prototype.activities = function () {
    const stage = extensionStage(),
      categories = [...new Set(activityCatalog.map((item) => item.nature))];
    const relevant = activityCatalog.slice(0, 11);
    const cards = relevant
      .map(
        (item, index) =>
          `<article class="activity-catalog-card" data-activity-card data-activity-category="${esc(item.nature)}"><div class="activity-catalog-top"><span class="activity-kind">${esc(item.nature)}</span><span class="activity-status-chip ${index < 3 ? "active" : ""}">${index < 3 ? "Disponível" : "Modelo"}</span></div><h3>${esc(item.name)}</h3><p>Fluxo de execução para ${esc(stage.name.toLowerCase())}, com preenchimento inicial e evidências.</p><div class="activity-field-counts"><span>${ico("list-plus")} <b>${item.initial.length}</b> campos iniciais</span><span>${ico("check-check")} <b>${item.execution.length}</b> execução</span></div><button class="activity-open" data-activity-open="${index}">${ico("panel-right-open")} Abrir atividade</button></article>`,
      )
      .join("");
    return `<div class="stage-extension-page activities-page"><div class="extension-head"><div><span class="activity-kind">${esc(stage.week)} · ${esc(stage.name)}</span><h1>Atividades da etapa</h1><p>Catálogo de frentes, propriedades de registro e associações administrativas.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico("arrow-left")} Todas as etapas</button><button class="primary" data-activity-new>${ico("plus")} Nova atividade</button></div></div><div class="extension-context"><div><small>ETAPA SELECIONADA</small><b>${esc(stage.name)}</b><span>${esc(stage.owner)} · ${stage.progress}% concluído</span></div><div><small>MODELO DE PREENCHIMENTO</small><b>Inicial → Execução → Evidências</b><span>Materiais, compras, responsáveis e medições</span></div><div class="extension-context-status"><i></i> ${relevant.length} modelos disponíveis</div></div><div class="activity-toolbar"><div class="activity-filter-label">Filtrar por natureza</div><button class="active" data-activity-category-filter="all">Todas <span>${relevant.length}</span></button>${categories.map((category) => `<button data-activity-category-filter="${esc(category)}">${esc(category)} <span>${relevant.filter((item) => item.nature === category).length}</span></button>`).join("")}</div><div class="activities-layout"><main class="activity-catalog-grid">${cards}</main><aside class="activity-detail-drawer"><div class="activity-detail-empty"><span class="activity-detail-icon">${ico("mouse-pointer-click")}</span><h2>Selecione uma atividade</h2><p>Clique em um card para abrir a sequência de preenchimento, associações e propriedades de execução.</p></div></aside></div></div>`;
  };
  const activitiesBeforeStagesV9 = ViewLayer.prototype.activities;
  const stageV9ActivityDetail = (activityId) => {
    const [stageKey, packetKey] = String(activityId || "").split(":"),
      stage = executionModel.stages.find((item) => item.key === stageKey) || executionModel.stages[0],
      packet = stageV9FlowPackets(stage).find((item) => item.key === packetKey) || stageV9FlowPackets(stage)[0],
      profile = stageV9ProfileFor(stage),
      live = stageV9LiveFor(stage),
      materials = stageV9MaterialsFor(stage),
      state = appStore.get(),
      budget = stageV9BudgetFor(stage, state),
      records = (state.records || [])
        .filter((record) => stage.name === stageOf(record) || String(record.atividade || "")
          .toLowerCase().includes(stage.name.toLowerCase().split(" ")[0]))
        .slice(-6)
        .reverse();
    return `<section class="stage-v9-activity-detail"><header class="stage-v9-activity-head"><button type="button" class="stage-v9-back" data-activity-v9-back>${ico("arrow-left")} Voltar ao fluxo da etapa</button><div><span class="activity-kind">ATIVIDADE · ${esc(stage.name.toUpperCase())}</span><h1>${esc(packet.label)}</h1><p>${esc(packet.detail)} · ${esc(live.owner || "Responsável a definir")}</p></div><aside><small>STATUS</small><b>${esc(Number(live.progress) > 0 ? "Em andamento" : "Planejada")}</b><span>${Number(live.progress) || 0}% da etapa</span></aside></header><section class="stage-v9-activity-status-lines"><div><small>LINHAGEM</small><b>${esc(stage.dependsOn?.length ? `Após ${stage.dependsOn.join(", ")}` : "Origem da etapa")}</b></div><div><small>UNIDADE DE PRODUÇÃO</small><b>${esc(packet.unit)}</b><span>${esc(stageV9ProductionFor(stage))}</span></div><div><small>ORÇAMENTO REFERENCIAL</small><b>${formatBRL(budget)}</b><span>Peso ${Number(stage.cashWeight || 0) * 100}% do caixa</span></div><div><small>DATA / RESPONSÁVEL</small><b>${esc(live.week || "A definir")}</b><span>${esc(live.owner || "A definir")}</span></div></section><section class="stage-v9-activity-body"><article class="stage-v9-activity-structure"><span class="activity-kind">DETALHAMENTO E DIRETRIZ</span><h2>${esc(packet.label)}</h2><p>${esc(profile.typicalDescription || stageV9DirectiveText(stage, profile))}</p><div class="stage-v9-trigger-box"><small>GATILHO DO AGENTE</small><b>${esc(packet.trigger)}</b><span>O agente só propaga a mudança quando os requisitos estão completos e o usuário autorizado confirma.</span></div><h3>Materiais necessários</h3><div class="stage-v9-material-list">${materials.slice(0, 6).map((item) => `<div><b>${esc(item.name)}</b><span>${item.quantity == null ? "Medir antes de requisitar" : `${esc(item.quantity)} ${esc(item.unit || "un.")}`}</span><small>${esc(item.status || "Planejado")}</small></div>`).join("")}</div></article><article class="stage-v9-activity-form-card"><span class="activity-kind">STATUS LINE · REGISTRO RÁPIDO</span><h2>Confirmar execução</h2><div class="stage-v9-check-lines"><label><input type="checkbox"> Frente e responsável confirmados</label><label><input type="checkbox"> Unidade de produção informada</label><label><input type="checkbox"> Material e comprovante conferidos</label><label><input type="checkbox"> Próximo passo pode ser propagado</label></div><button type="button" class="stage-v9-primary-action" data-stage-activity-action>Salvar confirmação no Diário ${ico("check")}</button></article></section><section class="stage-v9-activity-diary"><header><div><span class="activity-kind">DIÁRIO DE OBRA · ATIVIDADE</span><h2>Registros da atividade</h2></div><small>${records.length} registro(s) relacionado(s)</small></header><div class="stage-v9-diary-table-wrap"><table class="stage-v9-diary-table"><thead><tr><th>Data / hora</th><th>Atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th></tr></thead><tbody>${records.map((record) => `<tr><td>${esc(record.data || "—")} ${esc(record.hora || "")}</td><td>${esc(record.atividade || stage.name)}</td><td>${esc(record.responsavel || "A definir")}</td><td>${esc(record.detalhes || "Sem apontamento")}</td><td>${esc(record.status || "Pendente")}</td></tr>`).join("") || '<tr><td colspan="5" class="stage-v9-empty-diary">Sem histórico específico para esta atividade.</td></tr>'}</tbody></table></div></section></section>${state.activityRecordModalOpenV1 ? renderStageActivityRecordModalV1({ stage, packet, live, esc, ico, DateRef }) : ""}`;
  };

  ViewLayer.prototype.activities = function () {
    const state = appStore.get();
    if (state.stageActivityDedicatedV9)
      return stageV9ActivityDetail(state.selectedActivity);
    const stages = Array.isArray(state.dashboardStageAdminStagesV1) ? state.dashboardStageAdminStagesV1 : [],
      selectedStageId = state.atlasActivityStageFilterV1 || (state.stageSelected
        ? stages.find((item) => item.name === extensionStage()?.name)?.id
        : null) || "all";
    return AtlasActivitiesListV1({ props: {
      stages,
      selectedStageId,
      loaded: Boolean(state.atlasActivitiesLoadedV1),
      error: state.atlasActivitiesErrorV1 || "",
      actorRole: state.currentActor?.role || "",
      editorOpen: Boolean(state.atlasActivityEditorOpenV1),
      editorId: state.atlasActivityEditorIdV1 || "",
      mutationError: state.atlasActivityMutationErrorV1 || "",
      esc,
      ico,
    } }).next().value;
  };
  ViewLayer.prototype.atlasActivitiesListV1 = ViewLayer.prototype.activities;
  const activityListBindBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = activityListBindBaseV1?.apply(this, args);
    const page = this.querySelector("[data-atlas-activities-page]");
    if (!page) return result;
    const load = () => {
      if (this._atlasActivitiesLoadPromiseV1) return this._atlasActivitiesLoadPromiseV1;
      this._atlasActivitiesLoadPromiseV1 = apiFetch("/api/stages-admin", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !Array.isArray(payload.stages)) throw new Error(payload.error || `HTTP ${response.status}`);
          appStore.set({ dashboardStageAdminStagesV1: payload.stages, atlasActivitiesLoadedV1: true, atlasActivitiesErrorV1: "" });
        })
        .catch((error) => {
          const message = String(error?.message || "Serviço indisponível");
          const authUnavailable = /default credentials|OAuth2 access token|Project Id/i.test(message);
          appStore.set({
            atlasActivitiesLoadedV1: true,
            atlasActivitiesErrorV1: authUnavailable
              ? "O servidor não possui as credenciais Firebase necessárias para consultar as atividades."
              : message,
          });
        })
        .finally(() => { this._atlasActivitiesLoadPromiseV1 = null; });
      return this._atlasActivitiesLoadPromiseV1;
    };
    if (!appStore.get().atlasActivitiesLoadedV1) load();
    page.querySelector("[data-atlas-activities-refresh]")?.addEventListener("click", () => {
      appStore.set({ atlasActivitiesLoadedV1: false, atlasActivitiesErrorV1: "" });
      load();
    });
    page.querySelector("[data-atlas-activity-stage-filter]")?.addEventListener("change", (event) =>
      appStore.set({ atlasActivityStageFilterV1: event.currentTarget.value }));
    page.querySelector("[data-atlas-activity-new]")?.addEventListener("click", () =>
      appStore.set({atlasActivityEditorOpenV1:true,atlasActivityEditorIdV1:"",atlasActivityMutationErrorV1:""}));
    page.querySelector("[data-atlas-activity-cancel]")?.addEventListener("click", () =>
      appStore.set({atlasActivityEditorOpenV1:false,atlasActivityEditorIdV1:"",atlasActivityMutationErrorV1:""}));
    page.querySelectorAll("[data-atlas-activity-edit]").forEach(button=>button.addEventListener("click",()=>
      appStore.set({atlasActivityEditorOpenV1:true,atlasActivityEditorIdV1:button.dataset.atlasActivityEdit,atlasActivityMutationErrorV1:""})));
    page.querySelector("[data-atlas-activity-form]")?.addEventListener("submit",async event=>{
      event.preventDefault();
      const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries()),id=String(data.id||"");
      delete data.id;
      try{
        const response=await apiFetch(id?`/api/activities/${encodeURIComponent(id)}`:"/api/activities",{
          method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
        const payload=await response.json().catch(()=>({}));
        if(!response.ok||!payload.activity)throw new Error(payload.error||`HTTP ${response.status}`);
        appStore.set({atlasActivityEditorOpenV1:false,atlasActivityEditorIdV1:"",atlasActivityMutationErrorV1:"",atlasActivitiesLoadedV1:false});
        await load();
      }catch(error){appStore.set({atlasActivityMutationErrorV1:`Não foi possível salvar a atividade: ${error.message}`});}
    });
    page.querySelectorAll("[data-atlas-activity-delete]").forEach(button=>button.addEventListener("click",async()=>{
      const id=button.dataset.atlasActivityDelete;
      if(!globalThis.confirm?.("Excluir esta atividade cadastrada?"))return;
      try{
        const response=await apiFetch(`/api/activities/${encodeURIComponent(id)}`,{method:"DELETE"});
        const payload=await response.json().catch(()=>({}));
        if(!response.ok||!payload.ok)throw new Error(payload.error||`HTTP ${response.status}`);
        appStore.set({atlasActivityMutationErrorV1:"",atlasActivitiesLoadedV1:false});
        await load();
      }catch(error){appStore.set({atlasActivityMutationErrorV1:`Não foi possível excluir a atividade: ${error.message}`});}
    }));
    const search = page.querySelector("[data-atlas-activity-search]");
    search?.addEventListener("input", () => {
      const term = search.value.trim().toLocaleLowerCase("pt-BR");
      const rows = [...page.querySelectorAll("[data-atlas-activity-row]")];
      rows.forEach((row) => { row.hidden = !row.dataset.atlasActivitySearch.includes(term); });
      const empty = page.querySelector("[data-atlas-activities-filter-empty]");
      if (empty) empty.hidden = !rows.length || rows.some((row) => !row.hidden);
    });
    return result;
  };
  return ViewLayer;
};
