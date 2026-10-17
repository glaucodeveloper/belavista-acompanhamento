import { STAGE_WORKBENCH } from "../../stage-workbench-data.mjs";
import { FOREMAN_ACCESS_KEY_PERMISSIONS_V1 } from "../../foreman-access-key-policy.mjs";

const listFrom = (value) => Array.isArray(value) ? value : [];
const asLines = (value) => listFrom(value).map((item) => typeof item === "string" ? item : item?.name || item?.title || "").filter(Boolean).join("\n");
const parseLines = (value) => String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const materialEntries = (value) => listFrom(value).map((item, index) => typeof item === "string"
  ? { id: `material-${index}`, name: item, description: "", usage: "", quantity: "", unit: "" }
  : { id: String(item?.id || `material-${index}`), name: String(item?.name || item?.title || ""), description: String(item?.description || item?.scope || ""), usage: String(item?.usage || item?.use || ""), quantity: item?.quantity == null ? "" : String(item.quantity), unit: String(item?.unit || "") });
const materialNames = (value) => materialEntries(value).map((item) => item.name).filter(Boolean);
const materialSummary = (value) => materialEntries(value).map((item) => [item.name, item.description, item.usage].filter(Boolean).join(" — ")).filter(Boolean).join(", ");
const parseTargets = (value) => String(value || "").split(/[,;\r?\n]/).map((item) => item.trim()).filter(Boolean);
const normalizeStageName = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
const defaultSessionProgramming = (session) => {
  const unit = String(session.unit || "").trim().toLocaleLowerCase("pt-BR"), text = `${session.title || ""} ${session.text || ""} ${session.release || ""} ${materialSummary(session.materials)}`.toLocaleLowerCase("pt-BR"),
    quantified = /m³|m²|\bm\b|un|ponto|trecho|setor|viagem|lote|ramal|cavalete|ensaio|processo/.test(unit),
    physical = !/processo|dossiê|termo|ensaio/.test(unit) && !/aprova[cç][aã]o|protocolo|dossi[eê]|termo/.test(text),
    dependency = Boolean(session.release) || /antes|depois|libera|depend|aceite|bloque/.test(text),
    productionBasis = /m³/.test(unit) ? "volume" : /m²/.test(unit) ? "area" : /\bm\b/.test(unit) ? "comprimento" : /viagem|lote|ramal|cavalete|un|ponto|trecho|setor|ensaio|processo/.test(unit) ? "contagem" : "registro";
  return { scheduleMode: quantified ? "production" : dependency ? "sequential" : "parallel", productionModeEnabled: quantified, productionBasis, mapLocation: physical, requireAcceptance: dependency };
};
const defaultSessionProperties = (session) => {
  const operational = session.operational || {}, responsibility = operational.responsibility || {}, production = operational.production || {};
  return [
    ["Unidade de produção", session.unit || production.unit || "registro"],
    ["Materiais e equipamentos", materialSummary(session.materials || operational.materials || operational.equipment) || "A definir"],
    ["Requisito de liberação", session.release || "Sem requisito informado"],
    ["Responsabilidade principal", responsibility.primary || session.responsible || "Responsável técnico da frente"],
    ["Equipe e apoio", responsibility.support || "Encarregado e equipe executora"],
    ["Condições de entrada", listFrom(operational.entryConditions).join(" · ") || "Projeto e área liberados"],
    ["Forma de medição", production.method || "Medir produção confirmada por frente, local e data"],
    ["Fórmula de produção", production.formula || "quantidade válida = soma das medições confirmadas"],
    ["Evidência e aceite", listFrom(operational.evidence || operational.acceptance).join(" · ") || "Registro, fotos e confirmação do responsável"],
    ["Base legal/técnica", listFrom(operational.legalBasis).join(" · ") || "Projeto, licença e norma aplicável"],
  ].map(([label, value], index) => ({ id: `${session.id}-property-${index}`, label, value: String(value) }));
};
export const stageKeyFor = (stage, executionModel) => {
  const configured = executionModel?.stages?.find((item) => item.name === stage.name)?.key;
  if (configured) return configured;
  const name = normalizeStageName(stage.name), workerStage = STAGE_WORKBENCH.find((item) =>
    [item.key, item.title, ...item.aliases].some((candidate) => normalizeStageName(candidate) === name));
  if (workerStage) return workerStage.key;
  if (name === "sinalizacao") return "signage";
  return String(stage.id);
};
/** Settings for the persisted, per-stage operational comprehension used by planning and OCR. */
export const installSettingsCommercialWorkspaceV1 = (ViewLayer, {
  appStore,
  executionModel,
  apiFetch,
  esc,
  ico,
  notify,
} = {}) => {
  if (!ViewLayer?.prototype || typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Stage comprehension settings require ViewLayer and appStore get/set.");
  for (const [name, dependency] of Object.entries({ apiFetch, esc, ico, notify }))
    if (typeof dependency !== "function") throw new TypeError(`Stage comprehension settings require ${name}().`);

  let stagesPromise = null;
  let loadedStages = [];
  const workbenchSaveTimers = new Map();
  const workbenchSaveQueues = new Map();
  const actorHeaders = () => {
    const actor = appStore.get().currentActor || {};
    return {
      "Content-Type": "application/json",
      "X-Belavista-Role": String(actor.role || ""),
      "X-Belavista-User": String(actor.uid || ""),
      "X-Belavista-Name": String(actor.name || ""),
    };
  };
  const loadStages = async () => {
    const response = await apiFetch("/api/stages-admin", { cache: "no-store", headers: actorHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Não foi possível carregar etapas (HTTP ${response.status}).`);
    const stages = Array.isArray(payload.stages) ? payload.stages : [];
    const hydrated = await Promise.all(stages.map(async (stage) => {
      const stageKey = stageKeyFor(stage, executionModel),
        [detailResponse, workbenchResponse] = await Promise.all([
          apiFetch(`/api/stages-admin/${encodeURIComponent(stage.id)}`, { cache: "no-store", headers: actorHeaders() }),
          apiFetch(`/api/workbench/state?stage=${encodeURIComponent(stageKey)}`, { cache: "no-store", headers: actorHeaders() }),
        ]),
        [detail, workbench] = await Promise.all([
          detailResponse.json().catch(() => ({})),
          workbenchResponse.json().catch(() => ({})),
        ]);
      if (!detailResponse.ok) throw new Error(detail.error || `Não foi possível carregar a compreensão de ${stage.name} (HTTP ${detailResponse.status}).`);
      if (!workbenchResponse.ok) throw new Error(workbench.error || `Não foi possível carregar as compreensões originais do Worker para ${stage.name} (HTTP ${workbenchResponse.status}).`);
      const definition = STAGE_WORKBENCH.find((item) => item.key === stageKey || item.aliases.includes(stageKey)),
        storedSessions = listFrom(workbench.state?.inputSessions),
        workbenchSessions = storedSessions.length ? storedSessions : (definition?.activities || []).map((activity, index) => ({
          id: `input-${activity.id}`, activityId: activity.id, title: activity.title,
          text: `Entrada base: ${activity.release}. Equipamentos e materiais: ${activity.materials.join(", ")}.`,
          unit: activity.unit, materials: activity.materials, release: activity.release,
          responsible: activity.operational?.responsibility?.primary || "", operational: activity.operational,
          properties: [], automation: { propagateRelations: true, generateSchedule: true, generateResources: true, notifyWorker: true },
          programming: {}, inference: null,
          order: index, custom: false,
        }));
      for (const session of workbenchSessions) {
        session.automation = { propagateRelations: true, generateSchedule: true, generateResources: true, notifyWorker: true, ...(session.automation || {}) };
        session.programming = { ...defaultSessionProgramming(session), ...(session.programming || {}) };
        session.properties = listFrom(session.properties).length ? session.properties : defaultSessionProperties(session);
      }
      return { ...stage, ...detail.stage, stageKey, workbenchState: workbench.state || {}, workbenchSessions, workbenchSource: storedSessions.length ? "persisted" : definition ? "worker-defaults" : "unavailable" };
    }));
    return hydrated;
  };
  const refreshStageProfilesInMemory = (stages) => {
    const current = appStore.get(), profiles = {};
    for (const stage of stages) {
      const config = stage.aiConfig;
      if (!config) continue;
      const activityMaterials = listFrom(stage.workbenchSessions).flatMap((session) => materialEntries(session.materials).map((item) => ({ ...item, activityName: session.title || "" }))).filter((item) => item.name),
        configuredMaterials = listFrom(config.executionProfile?.materialsTable),
        seenMaterials = new Set(),
        materialsTable = [...configuredMaterials, ...activityMaterials].filter((item) => {
          const key = `${normalizeStageName(item.name)}|${normalizeStageName(item.activityName || "")}`;
          if (!item.name || seenMaterials.has(key)) return false;
          seenMaterials.add(key);
          return true;
        });
      const profile = {
        ...(config.executionProfile || {}),
        materialsTable,
        expectedActivities: listFrom(config.executionProfile?.expectedActivities).length
          ? listFrom(config.executionProfile.expectedActivities)
          : listFrom(stage.workbenchSessions).map((session) => session.title).filter(Boolean),
        requirements: listFrom(config.requirements),
        conditions: listFrom(config.conditions),
        typicalDescription: String(config.typicalDescription || ""),
        requestHints: listFrom(config.requestHints),
        evidenceFocus: listFrom(config.evidenceFocus),
        procurementFocus: listFrom(config.procurementFocus),
        notificationTargets: config.notificationTargets || {},
        organizationRequest: config.organizationRequest || config.executionProfile?.aiOrganization?.request || "",
        organizationContext: config.organizationContext || config.executionProfile?.aiOrganization?.context || "",
      };
      profiles[stage.stageKey] = profile;
    }
    appStore.set({ integrationSettings: { ...(current.integrationSettings || {}), stageProfiles: profiles } });
  };
  const profileMarkup = (stage) => {
    const config = stage.aiConfig || {}, profile = config.executionProfile || {},
      materials = listFrom(profile.materialsTable), sessions = listFrom(stage.workbenchSessions),
      sourceMaterials = sessions.flatMap((session) => materialEntries(session.materials).map((item) => ({ ...item, activity: session.title, activityUnit: session.unit, release: session.release }))).filter((item) => item.name),
      expectedActivities = listFrom(profile.expectedActivities).length ? listFrom(profile.expectedActivities) : sessions.map((session) => session.title).filter(Boolean),
      production = profile.production || {}, targets = config.notificationTargets || {};
    return `<form class="stage-comprehension-form" data-stage-comprehension-form="${esc(stage.id)}" data-stage-key="${esc(stage.stageKey)}">
      <div class="stage-comprehension-tabs" role="tablist" aria-label="Compreensão da etapa">
        <button type="button" class="active" role="tab" aria-selected="true" data-comprehension-tab="materials">Materiais <span>${materials.length + sourceMaterials.length}</span></button>
        <button type="button" role="tab" aria-selected="false" data-comprehension-tab="activities">Atividades esperadas <span>${sessions.length}</span></button>
        <button type="button" role="tab" aria-selected="false" data-comprehension-tab="execution">Execução</button>
      </div>
      <section class="stage-comprehension-panel" data-comprehension-panel="materials">
        <header><div><span class="activity-kind">MATERIAIS DA ETAPA</span><h2>Compreensão de materiais</h2><p>Itens, especificações e unidades usados para interpretar solicitações e registros desta etapa.</p></div><button type="button" class="toolbar-action" data-comprehension-add-material>${ico("plus")} Adicionar material</button></header>
        <div class="stage-comprehension-materials" data-comprehension-materials ${materials.length ? "" : "hidden"}><div class="stage-comprehension-material-head"><span>Material</span><span>Descrição / aplicação</span><span>Quantidade</span><span>Unidade</span><span>Estado</span><span></span></div>
          <div data-comprehension-material-rows>${materials.map((item) => `<div class="stage-comprehension-material-row"><input name="materialName" value="${esc(item.name || "")}" aria-label="Material"><input name="materialDescription" value="${esc(item.description || item.scope || "")}" aria-label="Descrição / aplicação"><input name="materialQuantity" value="${esc(item.quantity ?? "")}" inputmode="decimal" aria-label="Quantidade"><input name="materialUnit" value="${esc(item.unit || "")}" aria-label="Unidade"><input name="materialStatus" value="${esc(item.status || "")}" aria-label="Estado"><button type="button" aria-label="Remover material" data-comprehension-remove-material>${ico("trash-2")}</button></div>`).join("")}</div>
        </div>
        ${materials.length ? "" : '<p class="stage-comprehension-empty-materials" data-comprehension-empty-materials>Nenhum material adicional foi configurado para esta etapa. A composição original do Worker aparece abaixo.</p>'}
        <section class="stage-comprehension-source" aria-label="Materiais usados nas compreensões originais do Worker"><header><div><span class="activity-kind">COMPREENSÃO DO WORKER</span><h3>Materiais e equipamentos por atividade</h3><p>${stage.workbenchSource === "persisted" ? "Itens atualmente vinculados às atividades salvas no banco do Worker." : "Itens definidos nas atividades originais do Worker; ainda sem sessão personalizada salva."}</p></div><span>${sourceMaterials.length} itens</span></header><div class="stage-comprehension-source-list">${sourceMaterials.map((item) => `<article><b>${esc(item.name)}</b><span>${esc(item.activity)}</span>${item.description ? `<small>${esc(item.description)}</small>` : ""}${item.usage ? `<small>Uso: ${esc(item.usage)}</small>` : ""}<small>${esc(item.unit || "unidade não definida")} · ${esc(item.release || "sem critério de liberação")}</small></article>`).join("") || '<p>O Worker não possui materiais vinculados às atividades desta etapa.</p>'}</div></section>
        <label class="stage-comprehension-wide">Compras e logística a considerar<textarea name="procurementFocus" rows="3">${esc(asLines(config.procurementFocus))}</textarea></label>
      </section>
      <section class="stage-comprehension-panel" data-comprehension-panel="activities" hidden>
        <header><div><span class="activity-kind">PLANEJAMENTO DA ETAPA</span><h2>Atividades esperadas</h2><p>Sequência e atividades que a inteligência deve considerar ao organizar agenda e interpretar registros. Uma atividade por linha.</p></div></header>
      <div class="stage-comprehension-registered-activities"><header><div><b>Atividades e compreensões originais do Worker</b><small>${stage.workbenchSource === "persisted" ? "Sessões carregadas do banco do Worker." : "Catálogo de atividades usado originalmente pelo Worker."}</small></div><button type="button" data-session-add>${ico("plus")} Adicionar atividade</button></header>${sessions.length ? sessions.map((session, index) => sessionEditorMarkup(session, index, stage.stageKey, sessions.length)).join("") : '<p>Nenhuma atividade de compreensão está cadastrada para esta etapa no Worker.</p>'}</div>
        <label class="stage-comprehension-wide">Atividades<textarea name="expectedActivities" rows="9" placeholder="Atividades já definidas para esta etapa">${esc(asLines(expectedActivities))}</textarea></label>
        <label class="stage-comprehension-wide">Pistas para identificar pedidos e ações<textarea name="requestHints" rows="4">${esc(asLines(config.requestHints))}</textarea></label>
      </section>
      <section class="stage-comprehension-panel" data-comprehension-panel="execution" hidden>
        <header><div><span class="activity-kind">CRITÉRIOS OPERACIONAIS</span><h2>Compreensão da execução</h2><p>Critérios da etapa usados na execução, liberação, evidências e inferência de atividades.</p></div></header>
        <label class="stage-comprehension-wide">Descrição típica da execução<textarea name="typicalDescription" rows="4">${esc(config.typicalDescription || "")}</textarea></label>
        <div class="stage-comprehension-two"><label>Requisitos<textarea name="requirements" rows="5">${esc(asLines(config.requirements))}</textarea></label><label>Condições para liberação<textarea name="conditions" rows="5">${esc(asLines(config.conditions))}</textarea></label></div>
        <div class="stage-comprehension-two"><label>Evidências esperadas<textarea name="evidenceFocus" rows="4">${esc(asLines(config.evidenceFocus))}</textarea></label><label>Contexto para organização<textarea name="organizationContext" rows="4">${esc(config.organizationContext || "")}</textarea></label></div>
        <label class="stage-comprehension-wide">Instrução de organização<textarea name="organizationRequest" rows="3">${esc(config.organizationRequest || "")}</textarea></label>
        <section class="stage-comprehension-source"><header><div><span class="activity-kind">REGRAS ORIGINAIS DO WORKER</span><h3>Produção e condições por atividade</h3><p>Leitura das compreensões já usadas no workbench, sem substituí-las por parâmetros genéricos da etapa.</p></div></header><div class="stage-comprehension-execution-list">${sessions.map((session) => { const spec = session.inference?.production || session.operational?.production || {}, conditions = listFrom(session.inference?.conditions).length ? session.inference.conditions : listFrom(session.operational?.entryConditions); return `<article><header><b>${esc(session.title || "Atividade")}</b><span>${esc(session.unit || "")}</span></header><dl><div><dt>Forma de medida</dt><dd>${esc(spec.measureForm || session.operational?.production?.method || "Não definida na compreensão salva")}</dd></div><div><dt>Ritmo</dt><dd>${esc(spec.referenceRate ?? session.operational?.production?.rate ?? "—")} ${esc(spec.rateUnit || "")}</dd></div><div><dt>Requisito de liberação</dt><dd>${esc(session.release || "Não informado")}</dd></div></dl><div class="stage-comprehension-condition-list"><b>Condições</b>${conditions.length ? `<ul>${conditions.map((condition) => `<li>${esc(typeof condition === "string" ? condition : condition.trigger || condition.label || condition.message || "Condição operacional")}</li>`).join("")}</ul>` : "<p>Sem condições estruturadas nesta compreensão.</p>"}</div><div class="stage-comprehension-properties"><b>Propriedades</b>${listFrom(session.properties).length ? `<ul>${session.properties.map((property) => `<li><span>${esc(property.label || "Propriedade")}</span><strong>${esc(property.value || "—")}</strong></li>`).join("")}</ul>` : `<p>Materiais: ${esc(materialSummary(session.materials) || "não definidos")}</p>`}</div></article>`; }).join("") || '<p>O Worker não tem sessões de compreensão para esta etapa.</p>'}</div></section>
        <section class="stage-comprehension-production"><header><div><span class="activity-kind">UNIDADE DE PRODUÇÃO</span><h3>Como medir o avanço</h3></div><p>Parâmetros cadastrados para prazo e prontidão da execução.</p></header><div><label>Meta<input name="productionQuantity" type="number" min="0" step="any" value="${production.quantity == null ? "" : esc(production.quantity)}"></label><label>Unidade<input name="productionUnit" value="${esc(production.unit || "")}" placeholder="m, m², m³, viagem, un."></label><label>Ritmo<input name="productionRate" type="number" min="0" step="any" value="${production.rate == null ? "" : esc(production.rate)}"></label><label>Ritmo / unidade de tempo<input name="productionRateUnit" value="${esc(production.rateUnit || "")}" placeholder="m/dia, viagens/dia"></label></div></section>
        <div class="stage-comprehension-two stage-comprehension-notifications"><label>Destinos do dono<input name="notifyOwner" value="${esc(listFrom(targets.owner).join(", "))}"></label><label>Destinos do administrador<input name="notifyAdmin" value="${esc(listFrom(targets.admin).join(", "))}"></label><label>Destinos do encarregado<input name="notifyForeman" value="${esc(listFrom(targets.foreman).join(", "))}"></label></div>
      </section>
      <footer><span data-comprehension-status>Configuração vinculada à etapa no banco de dados.</span><button type="submit" class="toolbar-primary">${ico("save")} Salvar compreensão da etapa</button></footer>
    </form>`;
  };

  const stageAdminMarkup = (stage = {}) => `<form class="stage-comprehension-admin-form" data-stage-admin-form data-stage-id="${esc(stage.id ?? "")}">
    <header><div><span class="activity-kind">CADASTRO DA ETAPA</span><h2>${stage.id ? "Dados da etapa" : "Nova etapa"}</h2><p>Nome e parâmetros operacionais são persistidos no banco da aplicação.</p></div>${stage.id ? `<button type="button" class="stage-comprehension-delete" data-stage-delete>${ico("trash-2")} Excluir etapa</button>` : ""}</header>
    <div class="stage-comprehension-admin-fields"><label>Nome<input name="name" value="${esc(stage.name || "")}" maxlength="120" required></label><label>Estado<input name="status" value="${esc(stage.status || "planejado")}" maxlength="80" required></label><label>Avanço (%)<input name="progress" type="number" min="0" max="100" step="1" value="${esc(stage.progress ?? 0)}" required></label><label>Semana / período<input name="week" value="${esc(stage.week || "")}" maxlength="80"></label><label>Responsável<input name="owner" value="${esc(stage.owner || "")}" maxlength="120"></label></div>
    <footer><span data-stage-admin-status></span><div>${stage.id ? "" : `<button type="button" data-stage-create-cancel>Cancelar</button>`}<button type="submit" class="toolbar-primary">${stage.id ? "Salvar etapa" : "Criar etapa"}</button></div></footer>
  </form>`;

  const sessionEditorMarkup = (session, index, stageKey, sessionCount) => {
    const id = esc(session.id), automation = session.automation || {}, programming = session.programming || {}, properties = listFrom(session.properties), materials = materialEntries(session.materials);
    const production = session.inference?.production || session.operational?.production || {}, conditions = Array.isArray(session.inference?.conditions) ? session.inference.conditions : listFrom(session.operational?.entryConditions).map((trigger) => ({ kind: "operacional", label: "Condição de entrada", trigger: typeof trigger === "string" ? trigger : trigger.trigger || trigger.label || "", severity: "warning", notifyRoles: ["owner"] }));
    const propertyRows = properties.length ? properties.map((property, propertyIndex) => `<div class="stage-comprehension-session-property"><input data-session-property="label" data-session-id="${id}" data-property-index="${propertyIndex}" aria-label="Nome da propriedade" value="${esc(property.label || "")}"><input data-session-property="value" data-session-id="${id}" data-property-index="${propertyIndex}" aria-label="Valor da propriedade" value="${esc(property.value || "")}"><button type="button" aria-label="Remover propriedade" data-session-property-remove data-session-id="${id}" data-property-index="${propertyIndex}">${ico("trash-2")}</button></div>`).join("") : '<p class="stage-comprehension-empty-materials">Nenhuma propriedade configurada.</p>';
    return `<details class="stage-comprehension-session" data-session-editor="${id}"><summary><span><b>${esc(session.title || "Atividade")}</b><small>${esc(session.unit || "Unidade não definida")} · ${esc(session.release || "Sem requisito de liberação")}</small></span><span>${session.inference?.summary ? "Compreensão disponível" : "Editar compreensão"}</span></summary><div class="stage-comprehension-session-body">
      <div class="stage-comprehension-two"><label>Atividade<input data-session-field="title" data-session-id="${id}" value="${esc(session.title || "")}"></label><label>Unidade de produção<input data-session-field="unit" data-session-id="${id}" value="${esc(session.unit || "")}"></label></div>
      <label class="stage-comprehension-wide">Descrição, fato, requisito ou dependência<textarea data-session-field="text" data-session-id="${id}" rows="4">${esc(session.text || "")}</textarea></label>
      <section class="stage-comprehension-session-materials"><header><div><b>Materiais e equipamentos desta atividade</b><small>Cadastre cada item com descrição e como será usado na atividade.</small></div><button type="button" data-session-material-add data-session-id="${id}">${ico("plus")} Adicionar item</button></header><div class="stage-comprehension-session-material-list">${materials.map((item, materialIndex) => `<article class="stage-comprehension-session-material" data-session-material-row><label>Material / equipamento<input data-session-material-field="name" data-session-id="${id}" data-material-index="${materialIndex}" value="${esc(item.name)}" required></label><label>Descrição<textarea data-session-material-field="description" data-session-id="${id}" data-material-index="${materialIndex}" rows="2">${esc(item.description)}</textarea></label><label>Uso na atividade<textarea data-session-material-field="usage" data-session-id="${id}" data-material-index="${materialIndex}" rows="2">${esc(item.usage)}</textarea></label><div class="stage-comprehension-two"><label>Quantidade<input data-session-material-field="quantity" data-session-id="${id}" data-material-index="${materialIndex}" inputmode="decimal" value="${esc(item.quantity)}"></label><label>Unidade<input data-session-material-field="unit" data-session-id="${id}" data-material-index="${materialIndex}" value="${esc(item.unit)}"></label></div><button type="button" data-session-material-remove data-session-id="${id}" data-material-index="${materialIndex}">${ico("trash-2")} Remover item</button></article>`).join("") || '<p class="stage-comprehension-empty-materials">Nenhum material ou equipamento vinculado a esta atividade.</p>'}</div></section>
      <label class="stage-comprehension-wide">Requisito de liberação<textarea data-session-field="release" data-session-id="${id}" rows="3">${esc(session.release || "")}</textarea></label>
      <label>Responsabilidade principal<input data-session-field="responsible" data-session-id="${id}" value="${esc(session.responsible || "")}"></label>
      <section class="stage-comprehension-session-properties"><header><div><b>Propriedades dinâmicas</b><small>Valores reutilizados na descrição e inferência da sessão.</small></div><button type="button" data-session-property-add data-session-id="${id}">${ico("plus")} Adicionar propriedade</button></header>${propertyRows}</section>
      <section class="stage-comprehension-session-options"><b>Propagação e geração</b><div class="stage-comprehension-two">${[
        ["propagateRelations", "Propagar relações"], ["generateSchedule", "Gerar cronograma"], ["generateResources", "Recalcular materiais e equipe"], ["notifyWorker", "Avisar o worker"],
        ["productionModeEnabled", "Programar por produção"], ["mapLocation", "Vincular localização 3D"], ["requireAcceptance", "Exigir aceite do requisito"],
      ].map(([key, label]) => `<label class="stage-comprehension-session-check"><input type="checkbox" data-session-option="${key}" data-session-id="${id}"${automation[key] ?? programming[key] ? " checked" : ""}><span>${label}</span></label>`).join("")}</div><div class="stage-comprehension-two"><label>Modo de agenda<select data-session-programming="scheduleMode" data-session-id="${id}"><option value="sequential"${programming.scheduleMode === "sequential" ? " selected" : ""}>Sequencial · aguarda requisito</option><option value="parallel"${programming.scheduleMode === "parallel" ? " selected" : ""}>Paralela · permite sobreposição</option><option value="production"${programming.scheduleMode === "production" ? " selected" : ""}>Por produção · dimensiona pelo ritmo</option></select></label><label>Base de medição<input data-session-programming="productionBasis" data-session-id="${id}" value="${esc(programming.productionBasis || "registro")}"></label></div></section>
      <section class="stage-comprehension-session-production"><b>Produção e condições da atividade</b><div class="stage-comprehension-two"><label>Forma de medida<textarea data-session-production="measureForm" data-session-id="${id}" rows="2">${esc(production.measureForm || production.method || "")}</textarea></label><label>Validação e aceite<textarea data-session-production="validation" data-session-id="${id}" rows="2">${esc(production.validation || "")}</textarea></label><label>Ritmo de referência<input data-session-production="referenceRate" data-session-id="${id}" type="number" min="0" step="any" value="${esc(production.referenceRate ?? production.rate ?? "")}"></label><label>Unidade do ritmo<input data-session-production="rateUnit" data-session-id="${id}" value="${esc(production.rateUnit || "")}"></label><label>Cálculo da quantidade<textarea data-session-production="quantityFormula" data-session-id="${id}" rows="2">${esc(production.quantityFormula || production.formula || "")}</textarea></label><label>Cálculo da duração<textarea data-session-production="durationFormula" data-session-id="${id}" rows="2">${esc(production.durationFormula || "")}</textarea></label></div><div class="stage-comprehension-session-conditions"><header><b>Condições e disparos</b><button type="button" data-session-condition-add data-session-id="${id}">${ico("plus")} Adicionar condição</button></header>${conditions.length ? conditions.map((condition, conditionIndex) => `<div class="stage-comprehension-session-condition"><label>Rótulo<input data-session-condition="label" data-session-id="${id}" data-condition-index="${conditionIndex}" value="${esc(condition.label || condition.kind || "Condição")}"></label><label>Severidade<select data-session-condition="severity" data-session-id="${id}" data-condition-index="${conditionIndex}"><option value="info"${condition.severity === "info" ? " selected" : ""}>Informação</option><option value="warning"${condition.severity !== "critical" && condition.severity !== "info" ? " selected" : ""}>Atenção</option><option value="critical"${condition.severity === "critical" ? " selected" : ""}>Crítica</option></select></label><label class="stage-comprehension-wide">Disparar quando<textarea data-session-condition="trigger" data-session-id="${id}" data-condition-index="${conditionIndex}" rows="2">${esc(condition.trigger || condition.message || "")}</textarea></label><button type="button" data-session-condition-remove data-session-id="${id}" data-condition-index="${conditionIndex}">Remover condição</button></div>`).join("") : '<p class="stage-comprehension-empty-materials">Sem condições configuradas.</p>'}</div></section>
      <div class="stage-comprehension-session-actions"><button type="button" data-session-move="up" data-session-id="${id}" ${index === 0 ? "disabled" : ""}>↑ Subir</button><button type="button" data-session-move="down" data-session-id="${id}" ${index === sessionCount - 1 ? "disabled" : ""}>↓ Descer</button><button type="button" data-session-infer data-session-id="${id}" data-stage-key="${esc(stageKey)}">${ico("sparkles")} Compreender agora</button>${session.custom ? `<button type="button" data-session-remove data-session-id="${id}">${ico("trash-2")} Remover atividade</button>` : ""}<span data-session-status="${id}">${esc(session.inference?.summary || "Alterações são salvas na compreensão original do Worker.")}</span></div></div></details>`;
  };

  ViewLayer.prototype.settings = function () {
    const actor = appStore.get().currentActor || {},
      foremanKeyAdmin = globalThis.BELAVISTA_CAPACITOR_NATIVE !== true && actor.role === "owner" && actor.userType !== "foreman" ? `<section class="foreman-access-keys-v1 atlas-foreman-access-keys-v1"><header><div><span class="activity-kind">ACESSO DE CAMPO · CHAVES DELEGADAS</span><h2>Chaves de encarregados</h2><p>Emita credenciais limitadas para registros, linha do tempo, compromissos da agenda e envio de notas/fotos à IA. As chaves podem ser revogadas a qualquer momento.</p></div><span class="access-key-expiry-v1">Validade: 90 dias</span></header><form data-foreman-key-form><label>Identificação da chave<input name="label" minlength="2" maxlength="60" required placeholder="Ex.: Encarregado · Frente Norte"></label><fieldset><legend>Permissões dessa chave</legend>${FOREMAN_ACCESS_KEY_PERMISSIONS_V1.map((permission) => `<label><input type="checkbox" name="permissions" value="${esc(permission)}" ${permission === "agenda.write" ? "" : "checked"}> ${esc(({ "timeline.read": "Ver linha do tempo e etapas", "agenda.write": "Criar e alterar compromissos na agenda", "records.read": "Consultar registros", "records.write": "Criar e editar registros", "ai.notes": "Enviar notas à IA", "ai.photos": "Enviar fotos à IA" })[permission] || permission)}</label>`).join("")}</fieldset><footer><small>A administração de chaves fica disponível somente no desktop. O segredo é exibido uma única vez.</small><button type="submit" class="toolbar-primary">Emitir chave de encarregado</button></footer><output data-foreman-key-status aria-live="polite"></output></form><div data-foreman-key-once hidden></div><div class="foreman-key-list-v1" data-foreman-key-list>Carregando chaves emitidas…</div></section>` : "";
    return `<main class="stage-comprehension-settings" data-stage-comprehension-settings><header class="stage-comprehension-settings-head"><div><span class="activity-kind">CONFIGURAÇÃO OPERACIONAL</span><h1>Compreensão por etapa</h1><p>Configure cadastro, materiais, atividades esperadas e execução de cada etapa.</p></div><button type="button" class="toolbar-primary" data-stage-create>${ico("plus")} Nova etapa</button></header>${foremanKeyAdmin}<section class="atlas-lead-contact-settings"><form data-public-lead-contact-form><div><span class="activity-kind">ATENDIMENTO COMERCIAL · LEADS</span><h2>WhatsApp de contato</h2><p>Destino usado para montar o link com a mensagem pronta. O visitante confirma antes de abrir o WhatsApp.</p></div><label>Número com DDD<input name="whatsappNumber" type="tel" inputmode="tel" autocomplete="tel" required ${["owner", "admin", "developer"].includes(actor.role) ? "" : "disabled"}></label><footer><small data-public-lead-contact-status>Carregando configuração persistida…</small><button type="submit" class="toolbar-primary" ${["owner", "admin", "developer"].includes(actor.role) ? "" : "disabled"}>Salvar contato</button></footer></form></section><div class="stage-comprehension-content" data-stage-comprehension-content><p class="stage-comprehension-loading">Carregando etapas persistidas…</p></div></main>`;
  };

  const renderSettingsBeforeDynamicRolesV1 = ViewLayer.prototype.settings;
  ViewLayer.prototype.settings = function (...args) {
    const markup = renderSettingsBeforeDynamicRolesV1.apply(this, args), actor = appStore.get().currentActor || {};
    if (globalThis.BELAVISTA_CAPACITOR_NATIVE === true || actor.role !== "owner" || actor.userType === "foreman") return markup;
    const labels = { "view.map": "Interface · Mapa", "view.agenda": "Interface · Agenda", "view.records": "Interface · Registros", "view.stages": "Interface · Etapas", "timeline.read": "Linha do tempo", "agenda.write": "Criar/alterar compromissos", "records.read": "Consultar registros", "records.write": "Criar/editar registros", "ai.notes": "Notas para IA", "ai.photos": "Fotos para IA" };
    const panel = `<section class="foreman-access-keys-v1 dynamic-foreman-roles-v1"><header><div><span class="activity-kind">ACESSO DE CAMPO · PAPÉIS DINÂMICOS</span><h2>Papéis e chaves</h2><p>Defina as interfaces e operações permitidas por papel. Cada chave herda as permissões persistidas do papel associado.</p></div><span class="access-key-expiry-v1">Chaves válidas por 90 dias</span></header><form data-access-role-form><label>Nome do papel<input name="name" minlength="2" maxlength="60" required placeholder="Ex.: Encarregado de obra"></label><fieldset><legend>Interfaces e permissões</legend>${FOREMAN_ACCESS_KEY_PERMISSIONS_V1.map((permission) => `<label><input type="checkbox" name="permissions" value="${esc(permission)}"> ${esc(labels[permission] || permission)}</label>`).join("")}</fieldset><footer><small>Vistas de agenda e etapas implicam leitura do cronograma; escrita de registro implica leitura.</small><button type="submit">Salvar papel</button></footer><output data-role-status aria-live="polite"></output></form><div data-access-role-list>Carregando papéis persistidos…</div><form data-foreman-key-form><label>Identificação da chave<input name="label" minlength="2" maxlength="60" required placeholder="Ex.: Frente Norte · turno A"></label><label>Papel<select name="roleId" required><option value="">Crie ou selecione um papel salvo</option></select></label><footer><small>A chave recebe exatamente os escopos do papel; o token só aparece uma vez.</small><button type="submit">Emitir chave</button></footer><output data-foreman-key-status aria-live="polite"></output></form><div data-foreman-key-once hidden></div><div class="foreman-key-list-v1" data-foreman-key-list>Carregando chaves emitidas…</div></section>`;
    return markup.replace("</main>", `${panel}</main>`);
  };

  const bindBeforeSettings = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeSettings.apply(this, args), root = this,
      route = this.dataset.view || appStore.get().view;
    if (route !== "settings") return result;
    const contactForm = root.querySelector("[data-public-lead-contact-form]");
    if (contactForm && contactForm.dataset.bound !== "true") {
      contactForm.dataset.bound = "true";
      const contactStatus = contactForm.querySelector("[data-public-lead-contact-status]"), contactInput = contactForm.elements.whatsappNumber;
      apiFetch("/api/settings/public-lead-contact", { cache: "no-store", headers: actorHeaders() })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
          contactInput.value = data.whatsappNumber || "";
            contactStatus.textContent = data.updatedAt ? `Salvo no repositório em ${new Date(data.updatedAt).toLocaleString("pt-BR")}.` : "Número carregado do repositório.";
          }).catch((error) => { contactStatus.textContent = `Falha ao carregar do repositório: ${error.message}`; });
      contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const phone = String(contactInput.value || "").replace(/\D/g, "");
        if (phone.length < 10 || phone.length > 15) { contactStatus.textContent = "Informe um telefone válido com DDD."; return; }
        const button = contactForm.querySelector('[type="submit"]');
        button.disabled = true;
          contactStatus.textContent = "Salvando no repositório…";
        try {
          const response = await apiFetch("/api/settings/public-lead-contact", { method: "PUT", headers: actorHeaders(), body: JSON.stringify({ whatsappNumber: phone }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
          contactInput.value = data.whatsappNumber;
            contactStatus.textContent = `Salvo no repositório em ${new Date(data.updatedAt).toLocaleString("pt-BR")}.`;
          notify("WhatsApp de atendimento salvo.", "success");
        } catch (error) {
          contactStatus.textContent = error.message;
          notify("Não foi possível salvar o WhatsApp de atendimento.", "error");
        } finally { button.disabled = false; }
      });
    }
    const host = root.querySelector("[data-stage-comprehension-content]");
    if (!host || host.dataset.loaded === "true" || host.dataset.loading === "true") return result;
    host.dataset.loading = "true";
    stagesPromise ||= loadStages();
    stagesPromise.then((stages) => {
      loadedStages = stages;
      refreshStageProfilesInMemory(stages);
      const selected = stages.find((stage) => String(stage.id) === String(appStore.get().selectedComprehensionStageV1)) || stages[0];
      const renderStage = (active, creating = false) => {
        if (active) appStore.set({ selectedComprehensionStageV1: String(active.id) });
        const nav = `<nav class="stage-comprehension-stage-list" aria-label="Etapas">${stages.map((stage) => `<button type="button" class="${active && String(stage.id) === String(active.id) ? "active" : ""}" data-comprehension-stage="${esc(stage.id)}"><span>${esc(stage.name)}</span><small>${esc(stage.status || "")}${stage.progress == null ? "" : ` · ${Number(stage.progress)}%`}</small></button>`).join("")}${stages.length ? "" : '<p class="stage-comprehension-empty">Nenhuma etapa cadastrada.</p>'}</nav>`;
        host.innerHTML = `${nav}<div class="stage-comprehension-settings-detail">${stageAdminMarkup(creating ? {} : active || {})}${active && !creating ? profileMarkup(active) : '<p class="stage-comprehension-empty">Cadastre uma etapa para configurar as compreensões operacionais.</p>'}</div>`;
        bindForm(host, active, stages, renderStage);
      };
      renderStage(selected || null);
      host.dataset.loaded = "true";
    }).catch((error) => {
      host.innerHTML = `<p class="stage-comprehension-error">${esc(error?.message || "Falha ao carregar configurações das etapas.")}</p>`;
      host.dataset.loading = "false";
      stagesPromise = null;
    });
    return result;
  };

  const bindForm = (host, stage, stages, renderStage) => {
    const root = host.closest?.("[data-stage-comprehension-settings]") || host.parentElement;
    const createButton = root?.querySelector("[data-stage-create]");
    if (createButton && createButton.dataset.bound !== "true") {
      createButton.dataset.bound = "true";
      createButton.addEventListener("click", () => renderStage(null, true));
    }
    host.querySelectorAll("[data-comprehension-stage]").forEach((button) => button.addEventListener("click", () => {
      const next = stages.find((item) => String(item.id) === String(button.dataset.comprehensionStage));
      if (next) renderStage(next);
    }));
    const adminForm = host.querySelector("[data-stage-admin-form]");
    adminForm?.querySelector("[data-stage-create-cancel]")?.addEventListener("click", () => renderStage(stage || stages[0] || null));
    adminForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = adminForm.querySelector("[data-stage-admin-status]"), stageId = adminForm.dataset.stageId,
        button = adminForm.querySelector('[type="submit"]'), fields = adminForm.elements,
        payload = { name: fields.name.value.trim(), status: fields.status.value.trim(), progress: Number(fields.progress.value), week: fields.week.value.trim(), owner: fields.owner.value.trim() };
      if (!payload.name || !payload.status || !Number.isFinite(payload.progress) || payload.progress < 0 || payload.progress > 100) {
        if (status) status.textContent = "Informe nome e estado e um avanço entre 0 e 100%.";
        return;
      }
      button.disabled = true;
      if (status) status.textContent = "Salvando no banco de dados…";
      try {
        const response = await apiFetch(stageId ? `/api/stages-admin/${encodeURIComponent(stageId)}` : "/api/stages-admin", { method: stageId ? "PUT" : "POST", headers: actorHeaders(), body: JSON.stringify(payload) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Falha ao salvar etapa (HTTP ${response.status}).`);
        stagesPromise = null;
        const updatedStages = await loadStages();
        loadedStages = updatedStages;
        refreshStageProfilesInMemory(updatedStages);
        const updated = updatedStages.find((item) => String(item.id) === String(result.stage?.id || stageId));
        renderStage(updated || updatedStages[0] || null);
        notify(stageId ? "Etapa atualizada no banco de dados." : "Etapa criada no banco de dados.", "success");
      } catch (error) {
        if (status) status.textContent = error?.message || "Falha ao salvar etapa.";
        notify(status?.textContent || "Falha ao salvar etapa.", "error");
      } finally { button.disabled = false; }
    });
    adminForm?.querySelector("[data-stage-delete]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget, stageId = adminForm.dataset.stageId;
      if (!stageId) return;
      const confirmDelete = host.ownerDocument?.defaultView?.confirm || globalThis.confirm;
      if (typeof confirmDelete === "function" && !confirmDelete(`Excluir a etapa “${stage.name}”? A operação só será permitida se não houver dados vinculados.`)) return;
      button.disabled = true;
      const status = adminForm.querySelector("[data-stage-admin-status]");
      if (status) status.textContent = "Verificando vínculos e removendo etapa…";
      try {
        const response = await apiFetch(`/api/stages-admin/${encodeURIComponent(stageId)}`, { method: "DELETE", headers: actorHeaders() });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Falha ao excluir etapa (HTTP ${response.status}).`);
        stagesPromise = null;
        const updatedStages = await loadStages();
        loadedStages = updatedStages;
        refreshStageProfilesInMemory(updatedStages);
        renderStage(updatedStages[0] || null);
        notify("Etapa removida do banco de dados.", "success");
      } catch (error) {
        if (status) status.textContent = error?.message || "Falha ao excluir etapa.";
        notify(status?.textContent || "Falha ao excluir etapa.", "error");
        button.disabled = false;
      }
    });
    const form = host.querySelector("[data-stage-comprehension-form]");
    if (!form) return;
    form.querySelectorAll("[data-comprehension-tab]").forEach((button) => button.addEventListener("click", () => {
      form.querySelectorAll("[data-comprehension-tab]").forEach((tab) => { const active = tab === button; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); });
      form.querySelectorAll("[data-comprehension-panel]").forEach((panel) => { panel.hidden = panel.dataset.comprehensionPanel !== button.dataset.comprehensionTab; });
    }));
    form.querySelector("[data-comprehension-add-material]")?.addEventListener("click", () => {
      form.querySelector("[data-comprehension-materials]")?.removeAttribute("hidden");
      form.querySelector("[data-comprehension-empty-materials]")?.setAttribute("hidden", "hidden");
      const row = host.ownerDocument.createElement("div");
      row.className = "stage-comprehension-material-row";
      row.innerHTML = `<input name="materialName" aria-label="Material" placeholder="Nome"><input name="materialDescription" aria-label="Descrição / aplicação" placeholder="Descrição / aplicação"><input name="materialQuantity" inputmode="decimal" aria-label="Quantidade" placeholder="Quantidade"><input name="materialUnit" aria-label="Unidade" placeholder="Unidade"><input name="materialStatus" aria-label="Estado" placeholder="Estado"><button type="button" aria-label="Remover material" data-comprehension-remove-material>${ico("trash-2")}</button>`;
      form.querySelector("[data-comprehension-material-rows]")?.append(row);
    });
    form.addEventListener("click", (event) => {
      if (event.target.closest("[data-comprehension-remove-material]")) event.target.closest(".stage-comprehension-material-row")?.remove();
      const addSessionMaterial = event.target.closest("[data-session-material-add]");
      if (addSessionMaterial) {
        const session = stage.workbenchSessions.find((item) => String(item.id) === addSessionMaterial.dataset.sessionId);
        if (!session) return;
        session.materials = [...materialEntries(session.materials), { id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: "", description: "", usage: "", quantity: "", unit: "" }];
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
        host.querySelector(`[data-session-material-field="name"][data-session-id="${CSS.escape(String(session.id))}"][data-material-index="${session.materials.length - 1}"]`)?.focus();
        return;
      }
      const removeSessionMaterial = event.target.closest("[data-session-material-remove]");
      if (removeSessionMaterial) {
        const session = stage.workbenchSessions.find((item) => String(item.id) === removeSessionMaterial.dataset.sessionId);
        if (!session) return;
        session.materials = materialEntries(session.materials).filter((_, index) => index !== Number(removeSessionMaterial.dataset.materialIndex));
        queueWorkbenchSave(stage, host);
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
        return;
      }
      const addProperty = event.target.closest("[data-session-property-add]");
      if (addProperty) {
        const session = stage.workbenchSessions.find((item) => String(item.id) === addProperty.dataset.sessionId);
        if (!session) return;
        session.properties = [...listFrom(session.properties), { id: `property-${Date.now()}`, label: "Nova propriedade", value: "" }];
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
        queueWorkbenchSave(stage, host);
        return;
      }
      const removeProperty = event.target.closest("[data-session-property-remove]");
      if (removeProperty) {
        const session = stage.workbenchSessions.find((item) => String(item.id) === removeProperty.dataset.sessionId);
        if (!session) return;
        session.properties = listFrom(session.properties).filter((_, index) => index !== Number(removeProperty.dataset.propertyIndex));
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
        queueWorkbenchSave(stage, host);
        return;
      }
      const addCondition = event.target.closest("[data-session-condition-add]");
      if (addCondition) {
        const session = stage.workbenchSessions.find((item) => String(item.id) === addCondition.dataset.sessionId);
        if (!session) return;
        session.inference = { ...(session.inference || {}), production: { ...(session.inference?.production || session.operational?.production || {}) }, conditions: [...listFrom(session.inference?.conditions), { kind: "operacional", label: "Nova condição", trigger: "notificar quando o registro indicar impedimento ou pendência", notifyWhen: "negative-match", notifyRoles: ["owner"], severity: "warning", watchTerms: [], negativeTerms: ["bloqueado", "pendente", "atrasado"], message: "Condição manual identificada na leitura operacional." }] };
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
        queueWorkbenchSave(stage, host);
        return;
      }
      const removeCondition = event.target.closest("[data-session-condition-remove]");
      if (removeCondition) {
        const session = stage.workbenchSessions.find((item) => String(item.id) === removeCondition.dataset.sessionId);
        if (!session) return;
        session.inference = { ...(session.inference || {}), conditions: listFrom(session.inference?.conditions).length ? [...session.inference.conditions] : [] };
        session.inference.conditions.splice(Number(removeCondition.dataset.conditionIndex), 1);
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
        queueWorkbenchSave(stage, host);
        return;
      }
      const addSession = event.target.closest("[data-session-add]");
      if (addSession) {
        const id = `input-custom-${Date.now()}`, session = { id, activityId: `activity-custom-${Date.now()}`, title: "Nova atividade", text: "", unit: "", materials: [], release: "", responsible: "", properties: [], automation: { propagateRelations: true, generateSchedule: true, generateResources: true, notifyWorker: true }, programming: { scheduleMode: "parallel", productionModeEnabled: false, productionBasis: "registro", mapLocation: true, requireAcceptance: false }, inference: null, order: stage.workbenchSessions.length, custom: true };
        session.properties = defaultSessionProperties(session);
        stage.workbenchSessions.push(session);
        stage.workbenchState = { ...(stage.workbenchState || {}), inputSessions: stage.workbenchSessions };
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(id)}"]`);
        if (editor) editor.open = true;
        queueWorkbenchSave(stage, host);
        return;
      }
      const removeSession = event.target.closest("[data-session-remove]");
      if (removeSession) {
        stage.workbenchSessions = stage.workbenchSessions.filter((item) => String(item.id) !== removeSession.dataset.sessionId || !item.custom);
        stage.workbenchSessions.forEach((item, index) => { item.order = index; });
        renderStage(stage);
        queueWorkbenchSave(stage, host);
        return;
      }
      const moveSession = event.target.closest("[data-session-move]");
      if (moveSession) {
        const from = stage.workbenchSessions.findIndex((item) => String(item.id) === moveSession.dataset.sessionId), to = from + (moveSession.dataset.sessionMove === "up" ? -1 : 1);
        if (from < 0 || to < 0 || to >= stage.workbenchSessions.length) return;
        const [session] = stage.workbenchSessions.splice(from, 1);
        stage.workbenchSessions.splice(to, 0, session);
        stage.workbenchSessions.forEach((item, index) => { item.order = index; });
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
        queueWorkbenchSave(stage, host);
      }
    });
    const updateSession = (field) => {
      const session = stage.workbenchSessions.find((item) => String(item.id) === field.dataset.sessionId);
      if (!session) return;
      const key = field.dataset.sessionField;
      if (key === "materials") session.materials = parseLines(field.value);
      else if (field.dataset.sessionMaterialField) {
        const materials = materialEntries(session.materials), material = materials[Number(field.dataset.materialIndex)];
        if (!material) return;
        material[field.dataset.sessionMaterialField] = field.value;
        session.materials = materials;
      }
      else if (key) session[key] = field.value;
      else if (field.dataset.sessionProperty) {
        const property = listFrom(session.properties)[Number(field.dataset.propertyIndex)];
        if (property) property[field.dataset.sessionProperty] = field.value;
      } else if (field.dataset.sessionOption) {
        const key = field.dataset.sessionOption;
        const defaults = { scheduleMode: "parallel", productionBasis: "registro" };
        const programmingKeys = ["productionModeEnabled", "mapLocation", "requireAcceptance"];
        if (programmingKeys.includes(key)) session.programming = { ...(session.programming || defaults), [key]: field.checked };
        else session.automation = { propagateRelations: true, generateSchedule: true, generateResources: true, notifyWorker: true, ...(session.automation || {}), [key]: field.checked };
      } else if (field.dataset.sessionProgramming) {
        session.programming = { scheduleMode: "parallel", productionBasis: "registro", ...(session.programming || {}), [field.dataset.sessionProgramming]: field.value };
      } else if (field.dataset.sessionProduction) {
        const key = field.dataset.sessionProduction, production = { ...(session.inference?.production || session.operational?.production || {}) };
        production[key] = key === "referenceRate" ? (field.value === "" ? null : Number(field.value)) : field.value;
        session.inference = { ...(session.inference || {}), manual: true, production };
      } else if (field.dataset.sessionCondition) {
        const index = Number(field.dataset.conditionIndex), conditions = listFrom(session.inference?.conditions).length ? [...session.inference.conditions] : listFrom(session.operational?.entryConditions).map((trigger) => ({ kind: "operacional", label: "Condição de entrada", trigger: typeof trigger === "string" ? trigger : trigger.trigger || trigger.label || "", severity: "warning", notifyRoles: ["owner"] }));
        if (!conditions[index]) return;
        conditions[index] = { ...conditions[index], [field.dataset.sessionCondition]: field.value };
        session.inference = { ...(session.inference || {}), conditions };
      }
      const status = host.querySelector(`[data-session-status="${CSS.escape(String(session.id))}"]`);
      if (status) status.textContent = "Alteração pendente de salvamento…";
      queueWorkbenchSave(stage, host);
    };
    form.querySelectorAll("[data-session-field], [data-session-material-field], [data-session-property], [data-session-option], [data-session-programming], [data-session-production], [data-session-condition]").forEach((field) => {
      field.addEventListener(field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "input", () => updateSession(field));
    });
    form.querySelectorAll("[data-session-infer]").forEach((button) => button.addEventListener("click", async () => {
      const session = stage.workbenchSessions.find((item) => String(item.id) === button.dataset.sessionId);
      if (!session) return;
      const status = host.querySelector(`[data-session-status="${CSS.escape(String(session.id))}"]`);
      button.disabled = true;
      if (status) status.textContent = "Consultando o serviço de compreensão do Worker…";
      try {
        const response = await apiFetch("/api/workbench/infer", { method: "POST", headers: actorHeaders(), body: JSON.stringify({
          stage: stage.stageKey, activityId: session.activityId || session.id, title: session.title, text: session.text || "",
          calendarDate: stage.workbenchState.calendarDate, activities: stage.workbenchSessions,
          automation: session.automation || {}, programming: session.programming || {}, properties: session.properties || [],
        }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Falha na compreensão (HTTP ${response.status}).`);
        session.inference = result;
        if (status) status.textContent = result.summary || "Compreensão retornada pelo serviço.";
        await saveWorkbenchState(stage);
        renderStage(stage);
        const editor = host.querySelector(`[data-session-editor="${CSS.escape(String(session.id))}"]`);
        if (editor) editor.open = true;
      } catch (error) {
        if (status) status.textContent = error?.message || "Falha ao compreender a atividade.";
        notify(status?.textContent || "Falha ao compreender a atividade.", "error");
      } finally { button.disabled = false; }
    }));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-comprehension-status]"), previous = stage.aiConfig || {},
        executionProfile = { ...(previous.executionProfile || {}), materialsTable: [...form.querySelectorAll("[data-comprehension-material-rows] .stage-comprehension-material-row")].map((row) => ({ name: row.querySelector('[name="materialName"]')?.value.trim() || "", description: row.querySelector('[name="materialDescription"]')?.value.trim() || "", quantity: row.querySelector('[name="materialQuantity"]')?.value.trim() || "", unit: row.querySelector('[name="materialUnit"]')?.value.trim() || "", status: row.querySelector('[name="materialStatus"]')?.value.trim() || "" })).filter((item) => item.name), expectedActivities: parseLines(form.elements.expectedActivities.value) },
        lines = (name) => parseLines(form.elements[name]?.value),
        payload = {
          requirements: lines("requirements"), conditions: lines("conditions"),
          typicalDescription: form.elements.typicalDescription.value.trim(),
          requestHints: lines("requestHints"), evidenceFocus: lines("evidenceFocus"),
          procurementFocus: lines("procurementFocus"),
          organizationRequest: form.elements.organizationRequest.value.trim(),
          organizationContext: form.elements.organizationContext.value.trim(),
          notificationTargets: {
            owner: parseTargets(form.elements.notifyOwner.value),
            admin: parseTargets(form.elements.notifyAdmin.value),
            foreman: parseTargets(form.elements.notifyForeman.value),
          },
          executionProfile: { ...executionProfile, production: {
            quantity: form.elements.productionQuantity.value === "" ? null : Number(form.elements.productionQuantity.value),
            unit: form.elements.productionUnit.value.trim(),
            rate: form.elements.productionRate.value === "" ? null : Number(form.elements.productionRate.value),
            rateUnit: form.elements.productionRateUnit.value.trim(),
          } },
        };
      status.textContent = "Salvando no banco de dados…";
      form.querySelector('[type="submit"]')?.setAttribute("disabled", "disabled");
      try {
        const response = await apiFetch(`/api/stages-admin/${encodeURIComponent(stage.id)}/ai`, { method: "PUT", headers: actorHeaders(), body: JSON.stringify(payload) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Falha ao salvar (HTTP ${response.status}).`);
        const updated = result.stage;
        const stageIndex = stages.findIndex((item) => String(item.id) === String(stage.id));
        if (stageIndex >= 0) stages[stageIndex] = { ...stages[stageIndex], ...updated, stageKey: stage.stageKey };
        refreshStageProfilesInMemory(stages);
        Object.assign(stage, stages[stageIndex]);
        status.textContent = `Salvo no banco de dados${updated.aiConfig?.updatedAt ? ` · ${updated.aiConfig.updatedAt}` : ""}.`;
        notify(`Compreensão de ${stage.name} salva.`, "success");
      } catch (error) {
        status.textContent = error?.message || "Falha ao salvar a compreensão.";
        notify(status.textContent, "error");
      } finally {
        form.querySelector('[type="submit"]')?.removeAttribute("disabled");
      }
    });
  };

  const saveWorkbenchState = async (stage) => {
    const url = `/api/workbench/state?stage=${encodeURIComponent(stage.stageKey)}`;
    const priorQueue = workbenchSaveQueues.get(stage.stageKey) || Promise.resolve();
    const save = priorQueue.catch(() => {}).then(async () => {
      const read = await apiFetch(url, { cache: "no-store", headers: actorHeaders() });
      const current = await read.json().catch(() => ({}));
      if (!read.ok) throw new Error(current.error || `Não foi possível recarregar o estado original (HTTP ${read.status}).`);
      const state = { ...(current.state || stage.workbenchState || {}), inputSessions: stage.workbenchSessions };
      const response = await apiFetch(url, { method: "PUT", headers: actorHeaders(), body: JSON.stringify(state) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Falha ao salvar no banco do Worker (HTTP ${response.status}).`);
      stage.workbenchState = result.state || state;
      stage.workbenchSessions = listFrom(stage.workbenchState.inputSessions);
      stage.workbenchSource = "persisted";
      refreshStageProfilesInMemory(loadedStages);
      return result;
    });
    workbenchSaveQueues.set(stage.stageKey, save);
    return save;
  };
  const queueWorkbenchSave = (stage, host) => {
    clearTimeout(workbenchSaveTimers.get(stage.stageKey));
    const timer = setTimeout(async () => {
      const status = host.querySelector("[data-comprehension-status]");
      if (status) status.textContent = "Salvando as compreensões do Worker no banco…";
      try {
        await saveWorkbenchState(stage);
        const sessionStatuses = host.querySelectorAll("[data-session-status]");
        sessionStatuses.forEach((item) => { if (item.textContent === "Alteração pendente de salvamento…") item.textContent = "Compreensão salva no banco do Worker."; });
        if (status) status.textContent = "Compreensões do Worker salvas no banco de dados.";
      } catch (error) {
        if (status) status.textContent = `Falha ao salvar compreensão do Worker: ${error?.message || "erro desconhecido"}`;
        notify(status?.textContent || "Falha ao salvar compreensão do Worker.", "error");
      }
    }, 450);
    workbenchSaveTimers.set(stage.stageKey, timer);
  };
};

