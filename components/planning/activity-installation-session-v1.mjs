/** Complete guided activity-installation route and its lifecycle integration. */
export const installActivityInstallationSessionV1 = (ViewLayer, {
  activityCatalog, activityInstallationDefaults, appStore, demoData, esc,
  executionModel, ico, notify, operationalRaid, renderActivityFormGroupsV1,
  stageV9LiveFor, stageV9MaterialsFor, stageV9ProductionFor, stageV9StatusFor,
} = {}) => {
  for (const [name, value] of Object.entries({ activityCatalog, activityInstallationDefaults, appStore, demoData, esc, executionModel, ico, notify, operationalRaid, renderActivityFormGroupsV1, stageV9LiveFor, stageV9MaterialsFor, stageV9ProductionFor, stageV9StatusFor })) {
    if (value == null) throw new TypeError("Activity installation requires " + name + ".");
  }
// ACTIVITY_INSTALLATION_SESSION_V1: instalação guiada de uma atividade, com
// rascunho único que pode atravessar as superfícies de organização do sistema.
const activityInstallationStepsV1 = [
  [
    "entry",
    "Registro inicial",
    "Defina a natureza, a etapa e o contrato mínimo da atividade.",
  ],
  [
    "materials",
    "Materiais predefinidos",
    "Parta da composição conhecida da etapa e confirme o que será usado.",
  ],
  [
    "edit",
    "Edição",
    "Ajuste quantidade, unidade, descrição e responsável antes da análise.",
  ],
  [
    "rationalize",
    "Racionalização IA",
    "Leia conflitos, duplicidades, dependências e lacunas antes de aceitar.",
  ],
  [
    "cards",
    "Organizar em cards",
    "Converta a proposta aprovada em cards do organizador operacional.",
  ],
];
const activityInstallationStateV1 = () => {
  const current = appStore.get().activityInstallation || {};
  return {
    ...structuredClone(activityInstallationDefaults),
    ...current,
    draft: {
      ...structuredClone(activityInstallationDefaults.draft),
      ...(current.draft || {}),
    },
    rationalization: {
      ...structuredClone(activityInstallationDefaults.rationalization),
      ...(current.rationalization || {}),
    },
    materials: Array.isArray(current.materials) ? current.materials : [],
    cards: Array.isArray(current.cards) ? current.cards : [],
    dependencies: Array.isArray(current.dependencies)
      ? current.dependencies
      : [],
    assignments: Array.isArray(current.assignments) ? current.assignments : [],
  };
};
const activityInstallationStageV1 = (installation) => {
  const stages = executionModel.stages || [];
  return (
    stages.find((stage) => stage.key === installation.stageKey) ||
    stages[0] ||
    {}
  );
};
const activityInstallationMaterialRowsV1 = (stage) => {
  const rows =
    typeof stageV9MaterialsFor === "function" ? stageV9MaterialsFor(stage) : [];
  return rows.map((item, index) => ({
    ...item,
    id: item.id || `${stage.key}-material-${index}`,
  }));
};
const activityInstallationCatalogItemV1 = (installation) => {
  const draft = installation.draft || {};
  return (
    activityCatalog.find((item) => item.name === draft.name) ||
    activityCatalog.find((item) => item.nature === draft.nature) ||
    activityCatalog[0] ||
    {}
  );
};
const activityInstallationCommitV1 = (updater, label) => {
  appStore.update((state) => {
    const current = activityInstallationStateV1();
    const next =
      typeof updater === "function"
        ? updater(current)
        : { ...current, ...updater };
    return {
      ...state,
      activityInstallation: {
        ...current,
        ...next,
        updatedAt: new Date().toISOString(),
      },
      lastAction: label,
    };
  });
};
const activityInstallationFieldValueV1 = (form, name, fallback = "") =>
  String(form?.querySelector(`[name="${name}"]`)?.value ?? fallback).trim();
const activityInstallationDraftFromFormV1 = (form, installation) => ({
  ...(installation.draft || {}),
  name: activityInstallationFieldValueV1(
    form,
    "name",
    installation.draft?.name,
  ),
  nature: activityInstallationFieldValueV1(
    form,
    "nature",
    installation.draft?.nature,
  ),
  description: activityInstallationFieldValueV1(
    form,
    "description",
    installation.draft?.description,
  ),
  unit: activityInstallationFieldValueV1(
    form,
    "unit",
    installation.draft?.unit,
  ),
  responsible: activityInstallationFieldValueV1(
    form,
    "responsible",
    installation.draft?.responsible,
  ),
  target: activityInstallationFieldValueV1(
    form,
    "target",
    installation.draft?.target,
  ),
  release: activityInstallationFieldValueV1(
    form,
    "release",
    installation.draft?.release,
  ),
  evidence: activityInstallationFieldValueV1(
    form,
    "evidence",
    installation.draft?.evidence,
  ),
});
const activityInstallationCheckV1 = (installation, stage) => {
  const draft = installation.draft || {},
    materials = installation.materials || [],
    cards = installation.cards || [],
    name = String(draft.name || "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  const duplicate = cards.some(
    (card) =>
      String(card.name || "")
        .toLocaleLowerCase("pt-BR")
        .trim() === name && name,
  );
  const checks = [
    {
      label: "Nome e natureza identificam a atividade",
      ok: Boolean(draft.name && draft.nature),
      detail:
        draft.name && draft.nature
          ? "Identificação mínima preenchida."
          : "Informe nome e natureza na entrada.",
    },
    {
      label: "Etapa e unidade de produção estão definidas",
      ok: Boolean(stage?.key && draft.unit),
      detail: draft.unit
        ? `${stage.name} · unidade ${draft.unit}`
        : "Selecione como o avanço será medido.",
    },
    {
      label: "Responsável operacional está definido",
      ok: Boolean(draft.responsible),
      detail: draft.responsible || "Atribua um encarregado ou responsável.",
    },
    {
      label: "Materiais predefinidos foram revisados",
      ok: materials.length > 0,
      detail: materials.length
        ? `${materials.length} item(ns) selecionado(s) para racionalização.`
        : "Selecione pelo menos um item ou confirme uma lista vazia.",
    },
    {
      label: "Não há duplicação no organizador",
      ok: !duplicate,
      detail: duplicate
        ? "Já existe um card com este nome nesta sessão."
        : "Nenhuma atividade duplicada encontrada.",
    },
    {
      label: "Dependências da etapa foram consideradas",
      ok: Boolean(
        (stage?.dependsOn || []).length || installation.dependencies?.length,
      ),
      detail: (stage?.dependsOn || []).length
        ? `Herdadas: ${stage.dependsOn.join(" · ")}`
        : "A etapa não possui dependência anterior cadastrada.",
    },
  ];
  return {
    checks,
    status: checks.every((item) => item.ok) ? "approved" : "attention",
    summary: checks.every((item) => item.ok)
      ? "Sem conflito estrutural detectado. A atividade pode ser aceita e organizada."
      : "A IA encontrou pontos que precisam de confirmação antes da propagação.",
  };
};
const activityInstallationWorkerPreviewV1 = (
  installation,
  stage,
  materials,
) => {
  const draft = installation.draft || {},
    catalogItem = activityInstallationCatalogItemV1(installation),
    release =
      draft.release ||
      catalogItem.release ||
      "Aceite da atividade registrado no diário",
    evidence =
      draft.evidence ||
      "Registro, foto, medição ou documento vinculado ao local";
  return `<section class="activity-install-worker-preview" data-installation-worker-preview><header><div><span class="activity-kind">SUPERFÍCIE INSTALADA · WORKER DE ATIVIDADE</span><h2>Conteúdo que será aberto na atividade</h2><p>A instalação cria a mesma ficha operacional usada pelo worker: descrição, mapa, produção, diário, evidências e saída.</p></div><span class="activity-install-count">estrutura compartilhada</span></header><div class="activity-install-worker-preview-grid"><article><span class="activity-kind">FICHA OPERACIONAL</span><h3>${esc(draft.name || "Atividade operacional")}</h3><p>${esc(draft.description || "Descrição será completada pelo responsável na edição.")}</p><dl><div><dt>ETAPA</dt><dd>${esc(stage.name)}</dd></div><div><dt>RESPONSÁVEL</dt><dd>${esc(draft.responsible || "A definir")}</dd></div><div><dt>UNIDADE</dt><dd>${esc(draft.unit || "registro")}</dd></div></dl></article><article><span class="activity-kind">LOCAL FÍSICO E PRODUÇÃO</span><h3>${esc(draft.target || "Local a selecionar no mapa")}</h3><p>O worker vincula o registro à área física e recalcula o avanço na unidade <b>${esc(draft.unit || "registro")}</b>.</p><div class="activity-install-preview-stat"><small>MAPA</small><b>Pronto para seleção</b><small>MEDIÇÃO</small><b>Entrada no diário</b></div></article><article><span class="activity-kind">MATERIAIS E EVIDÊNCIAS</span><h3>${materials.length} item(ns) relacionado(s)</h3><p>${esc(
    materials
      .slice(0, 4)
      .map((item) => item.name)
      .join(" · ") || "Materiais serão definidos na edição",
  )}</p><div class="activity-install-preview-stat"><small>SAÍDA</small><b>${esc(release)}</b><small>COMPROVANTE</small><b>${esc(evidence)}</b></div></article><article><span class="activity-kind">DIÁRIO E PROPAGAÇÃO</span><h3>Registro auditável</h3><p>Apontamentos, comprovantes e aceite alimentam o cronograma, a agenda e a próxima atividade após confirmação autorizada.</p><div class="activity-install-preview-links"><span>Registros</span><span>Apontamentos</span><span>Agenda</span><span>RAID / IA</span></div></article></div></section>`;
};
const activityInstallationStepContentV1 = (installation, stage, step) => {
  const draft = installation.draft || {},
    catalogItem = activityInstallationCatalogItemV1(installation),
    materialRows = activityInstallationMaterialRowsV1(stage),
    selected = new Set((installation.materials || []).map((item) => item.id)),
    materials = installation.materials || [],
    rationalization = installation.rationalization || {};
  if (step === 1)
    return `<form class="activity-install-form" data-installation-entry-form>${renderActivityFormGroupsV1({ mode: "installation-entry", draft: { ...draft, stageKey: installation.stageKey }, stageOptions: (executionModel.stages || []).map((item) => ({ key: item.key, name: item.name })), natureOptions: [...new Set(activityCatalog.map((item) => item.nature))], stageKey: installation.stageKey, unit: draft.unit || stage.production?.unit || "", responsible: draft.responsible || stageV9LiveFor(stage)?.owner || "" })}<footer><span>Modelo sugerido: ${esc(catalogItem.name || "atividade operacional")}</span><button type="submit" class="activity-install-primary" data-cmd="activity-installation">Salvar entrada e avançar ${ico("arrow-right")}</button></footer></form>`;
  if (step === 2)
    return `<section class="activity-install-materials"><header><div><span class="activity-kind">BASE PREDEFINIDA · ${esc(stage.name)}</span><h2>Itens que sustentam a atividade</h2><p>Selecione os itens realmente necessários. A lista vem da composição da etapa e continua editável.</p></div><span class="activity-install-count">${selected.size}/${materialRows.length} selecionados</span></header><div class="activity-install-material-list">${materialRows.map((item) => `<label class="activity-install-material-row ${selected.has(item.id) ? "selected" : ""}"><input type="checkbox" data-installation-material="${esc(item.id)}" ${selected.has(item.id) ? "checked" : ""}><span><b>${esc(item.name)}</b><small>${esc(item.scope || item.description || "Requisito operacional da etapa")}</small></span><em>${item.quantity == null ? "A medir" : `${esc(item.quantity)} ${esc(item.unit || "un.")}`}</em></label>`).join("") || '<p class="activity-install-empty">A etapa não possui lista predefinida. Avance para registrar a composição manualmente.</p>'}</div><footer><button type="button" class="ghost" data-installation-materials-all data-cmd="activity-installation">${ico("list-checks")} Adotar lista recomendada</button><button type="button" class="activity-install-primary" data-installation-next data-cmd="activity-installation">Continuar para edição ${ico("arrow-right")}</button></footer></section>`;
  if (step === 3)
    return `<form class="activity-install-form" data-installation-edit-form><header><div><span class="activity-kind">EDIÇÃO DA COMPOSIÇÃO</span><h2>${esc(draft.name || "Atividade sem nome")}</h2><p>A mesma ficha do worker: identidade, produção, responsabilidade, saída e evidências antes da leitura da IA.</p></div><span>${materials.length} item(ns)</span></header>${renderActivityFormGroupsV1({ mode: "installation-edit", draft: { ...draft, stageKey: installation.stageKey }, stageOptions: (executionModel.stages || []).map((item) => ({ key: item.key, name: item.name })), natureOptions: [...new Set(activityCatalog.map((item) => item.nature))], stageKey: installation.stageKey })}<div class="activity-install-edit-list">${materials.map((item, index) => `<article class="activity-install-edit-row" data-installation-edit-material="${esc(item.id)}"><div><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(item.name)}</b><small>${esc(item.scope || "Material relacionado")}</small></div><label>Quantidade<input type="number" min="0" step="any" name="quantity" value="${item.quantity == null ? "" : esc(item.quantity)}"></label><label>Unidade<input name="unit" value="${esc(item.unit || "")}" placeholder="un."></label><label>Situação<select name="status">${["Planejado", "A medir", "Em andamento", "Atenção", "Concluído"].map((value) => `<option ${value === item.status ? "selected" : ""}>${value}</option>`).join("")}</select></label></article>`).join("") || '<p class="activity-install-empty">Nenhum item foi selecionado. Volte à etapa anterior para adotar a lista predefinida.</p>'}</div><footer><button type="button" class="ghost" data-installation-prev data-cmd="activity-installation">${ico("arrow-left")} Voltar</button><button type="submit" class="activity-install-primary" data-cmd="activity-installation">Salvar edição e racionalizar ${ico("arrow-right")}</button></footer></form>`;
  if (step === 4) {
    const checks =
      Array.isArray(rationalization.checks) && rationalization.checks.length
        ? rationalization.checks
        : activityInstallationCheckV1(installation, stage).checks;
return `<section class="activity-install-rationalization"><header><div><span class="activity-kind">LEITURA IA · SEM PROPAGAÇÃO AUTOMÁTICA</span><h2>Racionalização da proposta</h2><p>A inteligência confronta os dados da entrada com etapa, materiais, dependências e cards já instalados. A aceitação final continua humana.</p></div><span class="activity-install-status ${rationalization.status || "pending"}">${rationalization.status === "approved" ? "Sem conflito" : rationalization.status === "attention" ? "Revisar" : "Não analisada"}</span></header><div class="activity-install-analysis"><div><small>ENTRADA</small><b>${esc(draft.name || "Atividade sem nome")}</b><span>${esc(stage.name)} · ${esc(draft.responsible || "Responsável a definir")}</span></div><div><small>PROPAGAÇÕES PREVISTAS</small><b>PERT · RACI · Atividades · Agenda</b><span>As relações só são publicadas após aceitar o resultado.</span></div></div><div class="activity-install-checks">${checks.map((item) => `<article class="${item.ok ? "ok" : "attention"}"><span>${item.ok ? "✓" : "!"}</span><div><b>${esc(item.label)}</b><small>${esc(item.detail)}</small></div></article>`).join("")}</div><p class="activity-install-rationalization-summary">${esc(rationalization.summary || "Analise a proposta para obter a decisão assistida.")}</p><footer><button type="button" class="ghost" data-installation-prev data-cmd="activity-installation">${ico("arrow-left")} Voltar à edição</button><button type="button" class="activity-install-primary" data-installation-rationalize data-cmd="activity-installation">${ico("sparkles")} Racionalizar agora</button><button type="button" class="activity-install-accept" data-installation-accept ${rationalization.status !== "approved" ? "disabled" : ""}>${ico("check-check")} Aceitar e organizar</button></footer></section>`;
  }
  const cards = installation.cards || [],
    preview =
      !cards.length && draft.name
        ? {
            id: "preview",
            name: draft.name,
            nature: draft.nature,
            stageName: stage.name,
            responsible: draft.responsible,
            unit: draft.unit,
            materials: materials.length,
            status: "Prévia",
          }
        : null;
return `<section class="activity-install-cards"><header><div><span class="activity-kind">ORGANIZADOR OPERACIONAL · SAÍDA</span><h2>Cards prontos para o sistema</h2><p>Esta é a forma que a atividade será lida no cronograma, nas responsabilidades, nas prioridades e na agenda.</p></div><span class="activity-install-count">${cards.length} card(s) gravado(s)</span></header><div class="activity-install-card-grid" data-installation-card-board>${[...cards, ...(preview ? [preview] : [])].map((card, index) => `<article class="activity-install-card ${card.id === "preview" ? "preview" : ""}" draggable="${card.id === "preview" ? "false" : "true"}" data-installation-card="${esc(card.id)}"><header><span>${String(index + 1).padStart(2, "0")} · ${esc(card.nature || "ATIVIDADE")}</span><em>${esc(card.status || "Pronto para organizar")}</em></header><h3>${esc(card.name || "Atividade operacional")}</h3><p>${esc(card.stageName || stage.name)} · ${esc(card.responsible || draft.responsible || "Responsável a definir")}</p><div><small>UNIDADE</small><b>${esc(card.unit || draft.unit || "A definir")}</b><small>MATERIAIS</small><b>${Number(card.materials || materials.length)} relacionados</b></div><footer><span>Arraste para ordenar</span>${card.id === "preview" ? "<b>prévia</b>" : "<b>gravado</b>"}</footer></article>`).join("") || '<div class="activity-install-empty-card">Racionalize uma atividade para criar o primeiro card.</div>'}</div><div class="activity-install-organizer-links"><span>Próximas superfícies:</span><button type="button" data-installation-route="pert" data-cmd="activity-installation">${ico("git-branch")} Criar dependências no PERT</button><button type="button" data-installation-route="raci" data-cmd="activity-installation">${ico("users-round")} Cadastrar papéis</button><button type="button" data-installation-route="activities" data-cmd="activity-installation">${ico("list-checks")} Abrir atividades</button><button type="button" data-installation-route="agenda" data-cmd="activity-installation">${ico("calendar-days")} Abrir agenda</button></div><footer class="activity-install-footer"><button type="button" class="ghost" data-installation-reset data-cmd="activity-installation">${ico("rotate-ccw")} Limpar sessão</button><button type="button" class="activity-install-primary" data-installation-finalize data-cmd="activity-installation" ${draft.name ? "" : "disabled"}>${ico("save")} Gravar card no organizador</button></footer></section>`;
};
const activityInstallationMarkupV1 = () => {
  const installation = activityInstallationStateV1(),
    stage = activityInstallationStageV1(installation),
    step = Math.max(
      1,
      Math.min(
        activityInstallationStepsV1.length,
        Number(installation.step) || 1,
      ),
    );
  return `<section class="activity-installation-page"><header class="activity-installation-head"><div><span class="activity-kind">ETAPAS E CRONOGRAMA · SESSÃO DE INSTALAÇÃO</span><h1>Instalar atividades no organizador</h1><p>Monte uma atividade limpa, revise sua composição e conecte-a às superfícies que propagam o sistema.</p></div><div class="activity-installation-head-actions"><span>${esc(stage.name)} · ${step}/5</span><button type="button" class="ghost" data-view="stages" data-cmd="activity-installation">${ico("arrow-left")} Voltar às etapas</button></div></header><nav class="activity-installation-steps" aria-label="Etapas da instalação">${activityInstallationStepsV1.map(([key, label, detail], index) => `<button type="button" class="${step === index + 1 ? "active" : ""} ${step > index + 1 ? "done" : ""}" data-installation-step="${index + 1}" data-cmd="activity-installation"><span>${String(index + 1).padStart(2, "0")}</span><div><b>${label}</b><small>${detail}</small></div></button>`).join("")}</nav><div class="activity-installation-context"><div><small>ETAPA EM CONFIGURAÇÃO</small><b>${esc(stage.name)}</b><span>${esc(stageV9ProductionFor(stage))} · ${esc(stageV9StatusFor(stageV9LiveFor(stage)))}</span></div><div><small>ESTADO DA SESSÃO</small><b>${installation.cards?.length || 0} card(s) instalado(s)</b><span>${installation.updatedAt ? "Atualizado agora" : "Rascunho limpo · nada propagado"}</span></div><div><small>ORGANIZADOR</small><b>PERT · papéis · prioridade · agenda</b><span>Links preservam o mesmo rascunho</span></div></div><main class="activity-installation-body"><section class="activity-installation-main"><div class="activity-installation-step-head"><span>0${step} · ${esc(activityInstallationStepsV1[step - 1][1].toUpperCase())}</span><b>${esc(activityInstallationStepsV1[step - 1][2])}</b></div>${activityInstallationStepContentV1(installation, stage, step)}</section><aside class="activity-installation-rail"><section><span class="activity-kind">ESTADO LIMPO</span><h2>Sem propagação prematura</h2><p>A sessão guarda o rascunho localmente. PERT, papéis, prioridades e agenda recebem a saída somente depois da racionalização e do aceite.</p><div class="activity-installation-rail-state"><b>${esc(installation.draft?.name || "Nova atividade")}</b><span>${esc(installation.draft?.responsible || "Responsável a definir")}</span><i class="${installation.rationalization?.status || "pending"}"></i></div></section><section><span class="activity-kind">MONITORAMENTO</span><h2>Trilha da instalação</h2><div class="activity-installation-log"><span>Entrada · ${installation.draft?.name ? "preenchida" : "aguardando"}</span><span>Materiais · ${installation.materials?.length || 0} selecionados</span><span>IA · ${installation.rationalization?.status === "approved" ? "aceita" : "pendente"}</span><span>Cards · ${installation.cards?.length || 0} gravados</span></div></section></aside></main></section>`;
};


const renderBeforeActivityInstallationV1 = ViewLayer.prototype.render;
ViewLayer.prototype.render = function (...args) {
  const state = appStore.get();
  if (
    state.view === "activity-installation" &&
    state.localSqlState?.clean !== true
  ) {
    appStore.set({
      view: "stages",
      lastAction:
        "Sessão de instalação indisponível: a base SQL local já possui atividades",
    });
    return renderBeforeActivityInstallationV1?.apply(this, args);
  }
  if (state.view === "activity-installation") {
    this.dataset.view = "activity-installation";
    this.innerHTML = `<div class="activity-header"><div><span>Sessão de instalação</span><small>Criação guiada de atividades e propagação controlada</small></div><div class="activity-state"><i></i> Rascunho local · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div></div>${activityInstallationMarkupV1()}`;
    window.lucide?.createIcons();
    this.bind();
    return;
  }
  const result = renderBeforeActivityInstallationV1?.apply(this, args);
  if (
    state.view === "stages" &&
    !state.activityDedicated &&
    state.localSqlState?.clean === true
  ) {
    const home = this.querySelector(".dashboard-carbon-home");
    if (home && !home.querySelector("[data-stages-organizer-raid]")) {
      const urgent = operationalRaid()
          .filter((item) => /alto|crít|urg/i.test(String(item.level)))
          .slice(0, 3),
        items = urgent.length ? urgent : operationalRaid().slice(0, 3);
      const organizer = `<section class="stages-organizer-raid" data-stages-organizer-raid><header><div><span class="activity-kind">ORGANIZADOR · SAÍDA IA</span><h2>RAID para decisão do administrador</h2><p>Urgências e atividades que exigem leitura antes da próxima propagação do cronograma.</p></div><div class="stages-organizer-actions"><button type="button" class="activity-install-primary" data-installation-open data-cmd="activity-installation">${ico("wand-sparkles")} Instalar atividades</button><button type="button" class="ghost" data-view="raid" data-cmd="activity-installation">Abrir quadro RAID ${ico("arrow-up-right")}</button></div></header><div class="stages-organizer-raid-grid">${items.map((item) => `<article><span>${esc(String(item.level || "atenção").toUpperCase())}</span><b>${esc(item.title)}</b><p>${esc(item.detail)}</p><small>${esc(item.linked || "Sem vínculo")} · saída IA pendente de confirmação</small></article>`).join("")}</div></section>`;
      home
        .querySelector(".dashboard-stage-timeline")
        ?.insertAdjacentHTML("afterend", organizer);
    }
  }
  return result;
};


  const activityInstallationBindBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = activityInstallationBindBaseV1?.apply(this, args);
    const state = appStore.get();
  if (state.view !== "activity-installation") return result;
  const installation = activityInstallationStateV1(),
    stage = activityInstallationStageV1(installation),
    materialRows = activityInstallationMaterialRowsV1(stage);
  if (
    Number(installation.step) === 5 &&
    !this.querySelector("[data-installation-worker-preview]")
  )
    this.querySelector(".activity-install-cards")?.insertAdjacentHTML(
      "beforeend",
      activityInstallationWorkerPreviewV1(
        installation,
        stage,
        installation.materials || [],
      ),
    );
  const setStep = (step) =>
    activityInstallationCommitV1(
      (current) => ({ ...current, step: Math.max(1, Math.min(5, step)) }),
      `Avançou para a etapa ${step} da instalação`,
    );
  const syncEntry = (form) => {
    const nextDraft = activityInstallationDraftFromFormV1(form, installation);
    if (
      !nextDraft.name ||
      !nextDraft.nature ||
      !nextDraft.unit ||
      !nextDraft.responsible
    ) {
      notify(
        "Preencha nome, natureza, unidade e responsável antes de avançar.",
        "warning",
      );
      return false;
    }
    activityInstallationCommitV1(
      (current) => ({ ...current, draft: nextDraft }),
      `Registrou a entrada inicial de ${nextDraft.name}`,
    );
    return true;
  };
  this.querySelector("[data-installation-entry-form]")?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      if (syncEntry(event.currentTarget)) setStep(2);
    },
  );
  this.querySelector("[data-installation-stage]")?.addEventListener(
    "change",
    (event) => {
      const key = event.currentTarget.value;
      activityInstallationCommitV1(
        (current) => ({
          ...current,
          stageKey: key,
          materials: [],
          rationalization: structuredClone(
            activityInstallationDefaults.rationalization,
          ),
        }),
        `Selecionou etapa ${key} para instalar atividade`,
      );
    },
  );
  this.querySelectorAll("[data-installation-material]").forEach((input) =>
    input.addEventListener("change", () => {
      const ids = [
          ...this.querySelectorAll("[data-installation-material]:checked"),
        ].map((item) => item.dataset.installationMaterial),
        selectedRows = materialRows.filter((item) => ids.includes(item.id));
      activityInstallationCommitV1(
        (current) => ({ ...current, materials: selectedRows }),
        `Selecionou ${selectedRows.length} material(is) predefinido(s)`,
      );
    }),
  );
  this.querySelector("[data-installation-materials-all]")?.addEventListener(
    "click",
    () =>
      activityInstallationCommitV1(
        (current) => ({ ...current, materials: materialRows }),
        `Adotou a lista predefinida de ${stage.name}`,
      ),
  );
  this.querySelector("[data-installation-next]")?.addEventListener(
    "click",
    () => setStep(3),
  );
  this.querySelector("[data-installation-prev]")?.addEventListener(
    "click",
    () => setStep(Math.max(1, Number(installation.step) - 1)),
  );
  this.querySelector("[data-installation-edit-form]")?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        materials = [...(installation.materials || [])].map((item) => {
          const row = form.querySelector(
            `[data-installation-edit-material="${CSS.escape(item.id)}"]`,
          );
          return row
            ? {
                ...item,
                quantity:
                  row.querySelector('[name="quantity"]')?.value === ""
                    ? null
                    : Number(row.querySelector('[name="quantity"]')?.value),
                unit: row.querySelector('[name="unit"]')?.value || item.unit,
                status:
                  row.querySelector('[name="status"]')?.value || item.status,
              }
            : item;
        }),
        draft = activityInstallationDraftFromFormV1(form, installation);
      activityInstallationCommitV1(
        (current) => ({ ...current, materials, draft, step: 4 }),
        `Editou e enviou ${draft.name || "atividade"} para racionalização`,
      );
    },
  );
  this.querySelector("[data-installation-rationalize]")?.addEventListener(
    "click",
    () => {
      const result = activityInstallationCheckV1(
        activityInstallationStateV1(),
        stage,
      );
      activityInstallationCommitV1(
        (current) => ({
          ...current,
          rationalization: { ...result, at: new Date().toISOString() },
        }),
        result.status === "approved"
          ? "IA aceitou a racionalização da atividade"
          : "IA apontou itens para revisão",
      );
      notify(
        result.summary,
        result.status === "approved" ? "success" : "warning",
      );
    },
  );
  this.querySelector("[data-installation-accept]")?.addEventListener(
    "click",
    () => {
      if (this.querySelector("[data-installation-accept]")?.disabled) return;
      setStep(5);
      notify(
        "Racionalização aceita. A atividade pode ser organizada em cards.",
        "success",
      );
    },
  );
  this.querySelector("[data-installation-finalize]")?.addEventListener(
    "click",
    () => {
      const current = activityInstallationStateV1(),
        draft = current.draft || {};
      if (!draft.name) return;
      const card = {
        id: `INST-${Date.now().toString(36).toUpperCase()}`,
        name: draft.name,
        nature: draft.nature,
        description: draft.description,
        stageKey: current.stageKey,
        stageName: stage.name,
        responsible: draft.responsible,
        unit: draft.unit,
        target: draft.target,
        materials: (current.materials || []).length,
        status: "Instalada no organizador",
        createdAt: new Date().toISOString(),
      };
      activityInstallationCommitV1(
        (previous) => ({
          ...previous,
          cards: [...(previous.cards || []), card],
          step: 5,
        }),
        `Gravou card de ${card.name} no organizador`,
      );
      notify("Card gravado no organizador operacional.", "success");
    },
  );
  this.querySelector("[data-installation-reset]")?.addEventListener(
    "click",
    () => {
      if (!confirm("Limpar o rascunho desta sessão de instalação?")) return;
      activityInstallationCommitV1(
        () => structuredClone(activityInstallationDefaults),
        "Limpou a sessão de instalação",
      );
    },
  );
  this.querySelectorAll("[data-installation-step]").forEach((button) =>
    button.addEventListener("click", () => {
      const target = Number(button.dataset.installationStep);
      if (
        target <= Number(activityInstallationStateV1().step) ||
        activityInstallationStateV1().rationalization?.status === "approved" ||
        target === 1
      )
        setStep(target);
      else
        notify("Conclua a etapa atual para avançar na instalação.", "warning");
    }),
  );
  this.querySelectorAll("[data-installation-route]").forEach((button) =>
    button.addEventListener("click", () => {
      const next = button.dataset.installationRoute,
        stageRecord = demoData.activities.find(
          (item) => item.name === stage.name,
        ),
        patch = {
          view: next,
          selectedStage: stageRecord?.id || appStore.get().selectedStage,
          selectedStageV9: stage.key,
          lastAction: `Abriu ${next.toUpperCase()} após instalar ${installation.draft?.name || "atividade"}`,
        };
      if (next === "raci") patch.selectedRaciCell = null;
      appStore.set(patch);
    }),
  );
  
    return result;
  };
// O subscription original usa uma chave compacta para renderizar as views.
// Este listener adicional observa somente o rascunho da instalação e mantém a
// sessão reativa sem mexer no ciclo de renderização das telas existentes.
const connectedBeforeActivityInstallationV1 =
  ViewLayer.prototype.connectedCallback;
ViewLayer.prototype.connectedCallback = function () {
  connectedBeforeActivityInstallationV1?.call(this);
  let signature = "";
  this._activityInstallationSubscription = appStore.subscribe((state) => {
    if (state.view !== "activity-installation") return;
    const next = JSON.stringify(state.activityInstallation || {});
    if (next === signature) return;
    signature = next;
    if (this.dataset.view === "activity-installation") this.render();
  });
};


};
