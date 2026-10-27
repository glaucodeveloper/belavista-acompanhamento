/** Inject the stage's physical map into the existing activity/progress headers. */
import { createAtlasStageViewTabsMarkupV1 as createAtlasStageViewTabsMarkupTsV1 } from "../../dist/frontend/components.js";
import { createAtlasStageContextResolverV1 as createAtlasStageContextResolverTsV1 } from "../../dist/frontend/program.js";

export const installStageHeader3DControlsV1 = (ViewLayer, {
  esc,
  ico,
  stageOverlayKey,
  demoData,
  extensionStage,
  requestAnimationFrameFn = globalThis.requestAnimationFrame?.bind(globalThis),
} = {}) => {
  for (const [name, value] of Object.entries({ esc, ico, stageOverlayKey, extensionStage, requestAnimationFrameFn }))
    if (typeof value !== "function")
      throw new TypeError(`Stage 3D header requires ${name}().`);
  if (!Array.isArray(demoData?.activities))
    throw new TypeError("Stage 3D header requires the operational activity model.");
  const stageHeader3DMarkup = (stage) =>
    `<section class="stage-header-3d" data-stage-header-3d><header><div><span class="activity-kind">MAPA 3D · ${esc(stage.name)}</span><h2>Local físico da etapa</h2><p>Use os controles para inspecionar a área de execução relacionada a esta etapa.</p></div><button type="button" class="ghost" data-stage-header-fit>${ico("scan-search")} Reset inicial</button></header><div class="stage-header-3d-frame"><map-scene data-stage-header-map data-stage="${esc(stage.name)}" data-overlay="${stageOverlayKey(stage.name)}" data-map-index="${demoData.activities.findIndex((item) => item.id === stage.id)}" aria-label="Mapa 3D da etapa ${esc(stage.name)}"></map-scene></div></section>`;
  const addStageHeader3D = (html, stage) => html.replace(
    '<div class="extension-head">',
    `${stageHeader3DMarkup(stage)}<div class="extension-head">`,
  );
  const activitiesWithStageHeader3D = ViewLayer.prototype.activities;
  ViewLayer.prototype.activities = function () {
    return addStageHeader3D(activitiesWithStageHeader3D?.call(this) || "", extensionStage());
  };
  const progressWithStageHeader3D = ViewLayer.prototype.progress;
  ViewLayer.prototype.progress = function () {
    return addStageHeader3D(progressWithStageHeader3D?.call(this) || "", extensionStage());
  };
  const bindWithStageHeader3D = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function () {
    bindWithStageHeader3D?.call(this);
    const host = this.querySelector(".activities-page,.progress-page");
    if (host && !host.querySelector("[data-stage-header-3d]"))
      host.querySelector(".extension-head")?.insertAdjacentHTML("beforebegin", stageHeader3DMarkup(extensionStage()));
    this.querySelectorAll("[data-stage-header-fit]").forEach((button) =>
      button.addEventListener("click", () => this.querySelector("[data-stage-header-map]")?.fitSceneView?.(true)),
    );
    this.querySelectorAll("[data-stage-header-map]").forEach((map) =>
      requestAnimationFrameFn(() => map.fitSceneView?.(false)),
    );
  };
  return stageHeader3DMarkup;
};

/** Apply the same stage-map header to the stage's subordinate page renderers. */
export const installStageSubpageMapShellV1 = (ViewLayer, {
  extensionStage,
  stageHeader3DMarkup,
  views = ["agenda", "pert", "raci", "raid", "foremen"],
} = {}) => {
  if (typeof extensionStage !== "function" || typeof stageHeader3DMarkup !== "function")
    throw new TypeError("Stage subpage shell requires extensionStage() and stageHeader3DMarkup().");
  const stageSubpageMapShellV1 = (html) => {
    if (!html || html.includes("data-stage-header-3d")) return html;
    return html.replace('<div class="extension-head">', `${stageHeader3DMarkup(extensionStage())}<div class="extension-head">`);
  };
  for (const view of views) {
    const base = ViewLayer.prototype[view];
    if (typeof base !== "function") continue;
    ViewLayer.prototype[view] = function (...args) {
      return stageSubpageMapShellV1(base.apply(this, args) || "");
    };
  }
  return ViewLayer;
};

/** Ensure stage navigation tabs exist in the activity/progress HTML immediately. */
export const installStageStableViewTabsV1 = (ViewLayer, { stageViewTabs } = {}) => {
  if (typeof stageViewTabs !== "function")
    throw new TypeError("Stable stage tabs require stageViewTabs().");
  const injectStageViewTabsV1 = (html, active, marker) => {
    if (!html || html.includes('class="stage-view-tabs"')) return html;
    return html.replace(marker, `${stageViewTabs(active)}${marker}`);
  };
  const activitiesStableTabsBaseV1 = ViewLayer.prototype.activities;
  ViewLayer.prototype.activities = function (...args) {
    return injectStageViewTabsV1(activitiesStableTabsBaseV1?.apply(this, args) || "", "activities", '<section class="activities-dynamic-summary">');
  };
  const progressStableTabsBaseV1 = ViewLayer.prototype.progress;
  ViewLayer.prototype.progress = function (...args) {
    return injectStageViewTabsV1(progressStableTabsBaseV1?.apply(this, args) || "", "progress", '<div class="progress-toolbar">');
  };
  return ViewLayer;
};

/** Resolve stage context through the TypeScript program; retain the prior MJS body as recovery. */
export const createStageContextResolverV1 = (input = {}) => {
  if (typeof createAtlasStageContextResolverTsV1 === "function")
    return createAtlasStageContextResolverTsV1(input);
  const { appStore, executionModel, demoData } = input;
  return (state = appStore.get()) => {
    const stages = Array.isArray(executionModel?.stages) ? executionModel.stages : [],
      activities = Array.isArray(demoData?.activities) ? demoData.activities : [],
      selectedModel =
        stages.find((item) => String(item.key) === String(state.selectedStageV9 || "")) ||
        stages.find((item) => String(item.key) === String(state.selectedStage || "")) ||
        stages.find((item) => String(item.id) === String(state.selectedStage || "")) ||
        stages.find((item) => String(item.name) === String(state.selectedStage || "")) ||
        stages[0],
      record = activities.find((item) =>
        String(item.id) === String(selectedModel?.id || "") ||
        String(item.name).toLocaleLowerCase("pt-BR") ===
          String(selectedModel?.name || "").toLocaleLowerCase("pt-BR"),
      ) || activities[1];
    return { state, model: selectedModel, record };
  };
};

/** Render stage context tabs through the TS component; keep an inline MJS recovery. */
export const createStageViewTabsMarkupV1 = (input = {}) => {
  if (typeof createAtlasStageViewTabsMarkupTsV1 === "function")
    return createAtlasStageViewTabsMarkupTsV1(input);
  const { stageContextV1, demoData = {}, esc = value => String(value ?? ""), ico = () => "" } = input;
  return active => {
    const { model, record } = stageContextV1(),
      stage = record || model || demoData.activities?.[1] || {},
      tabs = [["stages", "gantt-chart", "Gantt"]];
    return `<nav class="stage-view-tabs" aria-label="Exibições da etapa" data-stage-context-key="${esc(model?.key || "")}"><div class="stage-view-context"><span class="activity-kind">ETAPA EM FOCO</span><strong>${esc(stage.name || "")}</strong><small>${esc(stage.week || "")} · ${Number(stage.progress) || 0}% · ${esc(stage.owner || "")}</small></div><div class="stage-view-links">${tabs.map(([view, icon, label]) => `<button type="button" class="${active === view ? "active" : ""}" data-stage-view="${view}" data-view="${view}">${ico(icon)} ${label}</button>`).join("")}</div></nav>`;
  };
};

/** Bind the stage tabs with the original state transition and record filter context. */
export const installStageViewTabsEventsV1 = (ViewLayer, { appStore, stageContextV1 } = {}) => {
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Stage view tabs require appStore.get() and set().");
  if (typeof stageContextV1 !== "function")
    throw new TypeError("Stage view tabs require stageContextV1().");
  const bindStageViewTabsEventsBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindStageViewTabsEventsBaseV1?.apply(this, args);
    this.querySelectorAll("nav.stage-view-tabs").forEach((nav) => {
      if (nav.dataset.stageTabsEventsBound === "true") return;
      nav.dataset.stageTabsEventsBound = "true";
      nav.querySelectorAll("[data-stage-view]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const next = button.dataset.stageView, { model, record: stage } = stageContextV1(), state = appStore.get();
          appStore.set({
            view: next,
            selectedStage: stage.id || state.selectedStage,
            selectedStageV9: model?.key || state.selectedStageV9,
            activityDedicated: false,
            stageActivityDedicatedV9: false,
            selectedActivity: null,
            activityRecordModalOpenV1: false,
            editingRecord: null,
            recordContext: null,
            stageRecordsContext: next === "records",
            recordFilters: next === "records"
              ? { ...(state.recordFilters || {}), stage: stage.name, entity: "records" }
              : state.recordFilters,
            lastAction: `Abriu ${button.textContent.trim()} da etapa ${stage.name}`,
          });
        }),
      );
    });
    return result;
  };
  return ViewLayer;
};

export const STAGE_CONTEXT_VIEWS_V1 = new Set([
  "stages", "records", "progress", "foremen",
]);

/** Render the persistent timeline from the live stage model and operational state. */
export const createStagePersistentTimelineMarkupV1 = ({
  appStore,
  extensionStage,
  executionModel,
  stageV9LiveFor,
  demoData,
  esc,
  ico,
  isLimitedOperationalActor = (actor = {}) => actor.userType === "foreman" || actor.user_type === "foreman" || ["sales", "commercial", "broker", "corretor"].includes(String(actor.role || "").toLocaleLowerCase("pt-BR")),
} = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("Persistent stage timeline requires appStore.get().");
  if (typeof extensionStage !== "function" || typeof stageV9LiveFor !== "function" || typeof esc !== "function" || typeof ico !== "function")
    throw new TypeError("Persistent stage timeline requires its stage, live, escape, and icon services.");
  if (!Array.isArray(executionModel?.stages) || !Array.isArray(demoData?.activities))
    throw new TypeError("Persistent stage timeline requires stage and activity models.");
  return () => {
    const state = appStore.get(), limited = isLimitedOperationalActor(state.currentActor || {}), selected = extensionStage(), operational = state.operationalState || {},
      stages = executionModel.stages || [], selectedStageKey = String(state.selectedStageV9 || selected?.key || stages[0]?.key || ""),
      stageOptions = stages.map((stage, index) => {
        const live = (operational.stages || []).find((item) => item.key === stage.key) || stageV9LiveFor(stage) || {};
        return `<option value="${esc(stage.key)}" ${String(stage.key) === selectedStageKey ? "selected" : ""}>${String(index + 1).padStart(2, "0")} · ${esc(stage.name)} · ${Math.max(0, Math.min(100, Number(live.progress) || 0))}%</option>`;
      }).join("");
    const cards = (executionModel.stages || []).map((stage, index) => {
      const live = (operational.stages || []).find((item) => item.key === stage.key) || stageV9LiveFor(stage) || {},
        progress = Math.max(0, Math.min(100, Number(live.progress) || 0)),
        stageRecord = demoData.activities.find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(stage.name).toLocaleLowerCase("pt-BR")),
        active = String(state.selectedStageV9 || "") === String(stage.key) || (!state.selectedStageV9 && String(stageRecord?.id || "") === String(selected?.id || ""));
      return `<article class="stage-persistent-timeline-card ${active ? "active" : ""}" data-persistent-stage-key="${esc(stage.key)}" aria-current="${active ? "step" : "false"}" tabindex="0" role="button"><span>${String(index + 1).padStart(2, "0")}</span><div><small>${esc(live.week || `Fase ${String(index + 1).padStart(2, "0")}`)} · ${esc(progress >= 100 ? "Concluída" : progress > 0 ? "Em andamento" : "Planejada")}</small><b>${esc(stage.name)}</b><i><em style="width:${progress}%"></em></i></div><strong>${progress}%</strong>${limited ? "" : `<button type="button" class="stage-persistent-timeline-edit" data-persistent-stage-edit="${esc(stage.key)}" aria-label="Editar estrutura de ${esc(stage.name)}">${ico("pencil")}</button>`}</article>`;
    }).join("");
    return `<section class="stage-persistent-timeline" data-stage-persistent-timeline><header><div><span class="activity-kind">CRONOGRAMA · ETAPAS</span><b>Linha do tempo da obra</b><small>${limited ? "Acompanhamento das etapas e do progresso do cronograma." : "Selecione uma etapa para abrir seu cronograma; use o lápis para editar sua estrutura."}</small></div><span class="stage-persistent-timeline-count">${stages.length} etapas</span></header><div class="stage-persistent-mobile-picker"><label>Etapa em foco<select data-persistent-stage-select aria-label="Selecionar etapa">${stageOptions}</select></label></div><div class="stage-persistent-timeline-track">${cards}${limited ? "" : `<button type="button" class="stage-persistent-timeline-add-stage" data-persistent-stage-add aria-label="Adicionar etapa">${ico("plus")}<b>Adicionar etapa</b><small>Nova estrutura e atividades</small></button>`}</div></section>`;
  };
};

/** Place the persistent timeline in the first markup pass of its stage views. */
export const installStagePersistentTimelinePagesV1 = (ViewLayer, {
  stagePersistentTimelineMarkupV1,
  views = ["agenda", "activities", "progress", "records", "foremen"],
} = {}) => {
  if (typeof stagePersistentTimelineMarkupV1 !== "function")
    throw new TypeError("Persistent stage timeline pages require stagePersistentTimelineMarkupV1().");
  for (const view of views) {
    const base = ViewLayer.prototype[view];
    if (typeof base !== "function") continue;
    ViewLayer.prototype[view] = function (...args) {
      const html = base.apply(this, args) || "";
      return html.includes("data-stage-persistent-timeline") ? html : stagePersistentTimelineMarkupV1() + html;
    };
  }
  return ViewLayer;
};

/** Route clicks on timeline cards to the stage's dedicated flow. */
export const installPersistentStageTimelineEventsV1 = (ViewLayer, {
  appStore,
  executionModel,
  demoData,
} = {}) => {
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Persistent stage timeline events require appStore.get() and set().");
  if (!Array.isArray(executionModel?.stages) || !Array.isArray(demoData?.activities))
    throw new TypeError("Persistent stage timeline events require the stage and activity models.");
  const bindPersistentStageTimelineBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindPersistentStageTimelineBaseV1?.apply(this, args);
    if (!this.__stagePersistentTimelineClickV1) {
      this.__stagePersistentTimelineClickV1 = true;
      this.addEventListener("click", (event) => {
        const button = event.target?.closest?.("[data-persistent-stage-key]");
        if (!button || !this.contains(button)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const key = button.dataset.persistentStageKey,
          stage = executionModel.stages.find((item) => item.key === key),
          record = demoData.activities.find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(stage?.name || "").toLocaleLowerCase("pt-BR"));
        if (stage) appStore.set({
          view: "stages",
          selectedStage: record?.id || stage.key,
          selectedStageV9: key,
          activityDedicated: true,
          stageActivityDedicatedV9: false,
          dashboardStageFocus: "",
          lastAction: `Abriu a etapa ${stage.name} pela linha do tempo`,
        });
      }, true);
    }
    return result;
  };
  return ViewLayer;
};

export function installStageContextChromeV1(ViewLayer, {
  STAGE_CONTEXT_VIEWS_V1,
  appStore,
  executionModel,
  runtimeRouteV1,
  stageContextV1,
  stagePersistentTimelineMarkupV1,
  stageViewTabs,
  isLimitedOperationalActor = (actor = {}) => actor.userType === "foreman" || actor.user_type === "foreman" || ["sales", "commercial", "broker", "corretor"].includes(String(actor.role || "").toLocaleLowerCase("pt-BR")),
}) {
  // STAGE_CONTEXT_CHROME_V1: a linha do tempo e o menu da etapa são um único
  // cabeçalho de navegação. Algumas páginas antigas renderizam a timeline no
  // view-layer e outras renderizam as abas dentro do conteúdo; normalizamos a
  // posição depois da composição final para que todas tenham a mesma leitura.
  const stageContextChromeV1 = (layer) => {
    const state = appStore.get();
    const limited = isLimitedOperationalActor(state.currentActor || {});
    if (layer && !layer.__stageContextChromeObserverV1 && typeof MutationObserver !== "undefined") {
      layer.__stageContextChromeObserverV1 = new MutationObserver(() => {
        if (layer.__stageContextChromeSyncingV1) return;
        stageContextChromeV1(layer);
      });
      layer.__stageContextChromeObserverV1.observe(layer, { childList: true });
    }
    if (!layer || !STAGE_CONTEXT_VIEWS_V1.has(state.view) || state.printMode)
      return;
    if (layer.__stageContextChromeSyncingV1) return;
    layer.__stageContextChromeSyncingV1 = true;
    try {
    let chrome = layer.querySelector("[data-stage-context-chrome]");
    if (!chrome) {
      chrome = document.createElement("div");
      chrome.className = "stage-context-chrome-v1";
      chrome.dataset.stageContextChrome = "true";
      layer.prepend(chrome);
    } else if (chrome !== layer.firstElementChild) {
      layer.prepend(chrome);
    }
  
    const timeline = layer.querySelector("[data-stage-persistent-timeline]");
    if (timeline && timeline.parentElement !== chrome) chrome.append(timeline);
    if (!chrome.querySelector("[data-stage-persistent-timeline]"))
      chrome.insertAdjacentHTML("afterbegin", stagePersistentTimelineMarkupV1());
    const persistentTimeline = chrome.querySelector("[data-stage-persistent-timeline]");
    if (persistentTimeline && persistentTimeline.dataset.interactionBound !== "true") {
      persistentTimeline.dataset.interactionBound = "true";
      const openStageStructure = (key) => {
        const stage = (executionModel.stages || []).find((item) => String(item.key) === String(key));
        if (!stage) return;
        const query = `stage=${encodeURIComponent(stage.key)}&mode=edit`;
        window.location.assign(runtimeRouteV1("/admin/workers/stage", query));
      };
      persistentTimeline.addEventListener("click", (event) => {
        const edit = event.target.closest("[data-persistent-stage-edit]");
        if (edit) {
          event.preventDefault();
          event.stopPropagation();
          openStageStructure(edit.dataset.persistentStageEdit);
          return;
        }
        const addStage = event.target.closest("[data-persistent-stage-add]");
        if (addStage) {
          event.preventDefault();
          event.stopPropagation();
          window.location.assign(runtimeRouteV1("/admin/workers/stage", { query: { mode: "new", focus: "stage" } }));
          return;
        }
        const card = event.target.closest("[data-persistent-stage-key]");
        if (!card) return;
        appStore.set({
          selectedStageV9: card.dataset.persistentStageKey,
          stageSelected: true,
          lastAction: `Selecionou a etapa ${card.dataset.persistentStageKey} na timeline`,
        });
      });
      persistentTimeline.addEventListener("keydown", (event) => {
        const card = event.target.closest("[data-persistent-stage-key]");
        if (card && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          appStore.set({ selectedStageV9: card.dataset.persistentStageKey, stageSelected: true });
        }
      });
      persistentTimeline.addEventListener("change", (event) => {
        const picker = event.target?.closest?.("[data-persistent-stage-select]");
        if (!picker || !persistentTimeline.contains(picker)) return;
        const stage = (executionModel.stages || []).find(
          (item) => String(item.key) === String(picker.value),
        );
        if (!stage) return;
        const editButton = persistentTimeline.querySelector(
          ".stage-persistent-mobile-picker [data-persistent-stage-edit]",
        );
        if (editButton) editButton.dataset.persistentStageEdit = stage.key;
        appStore.set({
          selectedStageV9: stage.key,
          stageSelected: true,
          lastAction: `Selecionou a etapa ${stage.name} no menu mobile`,
        });
      });
    }

    if (limited) {
      layer.querySelectorAll("nav.stage-view-tabs").forEach((nav) => nav.remove());
      return;
    }
    // The stages route already is the Gantt/timeline page. Its single-tab
    // wrapper repeats the same context without offering another destination.
    if (state.view === "stages") {
      layer.querySelectorAll("nav.stage-view-tabs").forEach((nav) => nav.remove());
      return;
    }
  
    const existingTabs = layer.querySelector("nav.stage-view-tabs");
    if (existingTabs && existingTabs.parentElement !== chrome)
      chrome.append(existingTabs);
    if (!chrome.querySelector("nav.stage-view-tabs"))
      chrome.insertAdjacentHTML("beforeend", stageViewTabs(state.view));
  
    let nav = chrome.querySelector("nav.stage-view-tabs");
    const { model, record } = stageContextV1(state);
    if (nav && (
      nav.dataset.stageContextKey !== String(model?.key || "") ||
      nav.querySelector(".stage-view-context strong")?.textContent.trim() !== (record || model)?.name ||
      nav.querySelector("[data-stage-view].active")?.dataset.stageView !== state.view
    )) {
      nav.remove();
      chrome.insertAdjacentHTML("beforeend", stageViewTabs(state.view));
      nav = chrome.querySelector("nav.stage-view-tabs");
    }

    layer.querySelectorAll("nav.stage-view-tabs").forEach((other) => {
      if (other !== nav) other.remove();
    });
    layer.querySelectorAll("[data-stage-persistent-timeline]").forEach((other) => {
      if (other.parentElement !== chrome) other.remove();
    });
    nav?.classList.toggle("stage-context-home-tabs-v1", state.view === "stages");
    if (!nav || nav.dataset.stageContextChromeBound === "true") return;
    nav.dataset.stageContextChromeBound = "true";
    nav.addEventListener("click", (event) => {
        const button = event.target?.closest?.("[data-stage-view]");
        if (!button || !nav.contains(button)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const next = button.dataset.stageView,
          { model, record: stage } = stageContextV1(),
          current = appStore.get();
        appStore.set({
          view: next,
          selectedStage: stage?.id || current.selectedStage,
          selectedStageV9: model?.key || current.selectedStageV9,
          activityDedicated: false,
          stageActivityDedicatedV9: false,
          selectedActivity: null,
          activityRecordModalOpenV1: false,
          editingRecord: null,
          recordContext: null,
          stageRecordsContext: next === "records",
          recordFilters:
            next === "records"
              ? {
                  ...(current.recordFilters || {}),
                  stage: stage?.name || "",
                  entity: "records",
                }
              : current.recordFilters,
          lastAction: `Abriu ${button.textContent.trim()} da etapa ${stage?.name || ""}`,
        });
      }, true);
    window.lucide?.createIcons();
    } finally {
      layer.__stageContextChromeSyncingV1 = false;
    }
  };
  
  const stagesPage = ViewLayer.prototype.stages;
  ViewLayer.prototype.stages = function (...args) {
    if (isLimitedOperationalActor(appStore.get().currentActor || {}))
      return `<div class="limited-schedule-page">${stagePersistentTimelineMarkupV1()}</div>`;
    return stagesPage?.apply(this, args) || "";
  };

  // O shell também consegue reconstruir uma view sem passar pelo renderizador
  // final do ViewLayer. Exponha somente este sincronizador pequeno para o shell
  // chamar depois de cada mudança de rota/estado.
  globalThis.__ensureStageContextChromeV1 = stageContextChromeV1;

  const bindBeforeStageContextChromeV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeStageContextChromeV1?.apply(this, args);
    globalThis.__ensureStageContextChromeV1?.(this);
    return result;
  };
  
  const renderStageContextChromeV1 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderStageContextChromeV1.apply(this, args);
    stageContextChromeV1(this);
    return result;
  };
}
