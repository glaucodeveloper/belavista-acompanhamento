const requireDependencies = (dependencies) => {
  const functions = [
    "stageRecordStagesV1", "stageRecordMaterialRowsV1", "stageRecordServiceRowsV1",
    "stageMaterialReportBindV1", "stageRecordNormalizeV1", "stageRecordCenterItemModalMarkupV1",
    "queueMicrotaskFn",
  ];
  if (typeof dependencies?.appStore?.get !== "function" || typeof dependencies.appStore.set !== "function")
    throw new TypeError("Stage home record resources require appStore.get() and set().");
  if (!Array.isArray(dependencies?.demoData?.activities))
    throw new TypeError("Stage home record resources require demoData.activities.");
  for (const name of functions)
    if (typeof dependencies[name] !== "function") throw new TypeError(`Stage home record resources require ${name}().`);
  if (typeof dependencies.documentRef?.querySelector !== "function" || typeof dependencies.windowRef !== "object")
    throw new TypeError("Stage home record resources require documentRef and windowRef.");
  return dependencies;
};

/** Bind the stage-home material/service records workspace to its injected services. */
export const installStageHomeRecordResourcesEventsV1 = (ViewLayer, dependencies = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype !== "object")
    throw new TypeError("Stage home record resources require ViewLayer.prototype.");
  const {
    appStore, demoData, stageRecordStagesV1, stageRecordMaterialRowsV1,
    stageRecordServiceRowsV1, stageMaterialReportBindV1, stageRecordNormalizeV1,
    stageRecordCenterItemModalMarkupV1, documentRef, queueMicrotaskFn, windowRef,
  } = requireDependencies(dependencies);
  const baseBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = baseBind.apply(this, args),
      root = this.querySelector("[data-stage-home-record-resources]");
    if (!root) return result;
    const state = appStore.get(),
      stages = stageRecordStagesV1(),
      selectedKey = String(root.querySelector("[data-stage-home-resource-stage]")?.value || ""),
      materialRows = stageRecordMaterialRowsV1(state).filter((item) => String(item.stageKey || "") === selectedKey),
      serviceRows = stageRecordServiceRowsV1(state).filter((item) => String(item.stageKey || "") === selectedKey);
    stageMaterialReportBindV1(root, materialRows);
    root.querySelector("[data-stage-home-resource-stage]")?.addEventListener("change", (event) => {
      const key = String(event.currentTarget.value || ""),
        stage = stages.find((item) => String(item.key) === key);
      if (!stage) return;
      const record = demoData.activities.find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(stage.name).toLocaleLowerCase("pt-BR"));
      appStore.set({ selectedStageV9: stage.key, selectedStage: record?.id || stage.key, stageSelected: true, lastAction: `Abriu a etapa ${stage.name} na lista de materiais e serviços` });
    });
    root.querySelectorAll("[data-stage-record-center-tab]").forEach((button) => button.addEventListener("click", () => {
      appStore.set({ controlStageCenterTab: button.dataset.stageRecordCenterTab, controlStageRecordModalId: null, controlStageCenterItemModalKey: null, lastAction: `Abriu a aba ${button.textContent.trim()} da etapa` });
    }));
    root.querySelectorAll("[data-stage-center-view-mode]").forEach((button) => button.addEventListener("click", () => {
      const kind = button.dataset.stageCenterViewMode,
        mode = button.dataset.stageCenterMode;
      if (!["materials", "services"].includes(kind) || !["table", "proofs"].includes(mode)) return;
      appStore.set({ [kind === "materials" ? "controlStageCenterMaterialMode" : "controlStageCenterServiceMode"]: mode, lastAction: `Abriu ${mode === "proofs" ? "os comprovantes" : "a tabela"} de ${kind === "materials" ? "materiais" : "serviços"} da etapa` });
    }));
    const bindFilters = (config) => {
      const rows = [...root.querySelectorAll(config.rowSelector)],
        search = root.querySelector(config.searchSelector),
        stageFilter = root.querySelector(config.stageSelector),
        statusFilter = root.querySelector(config.statusSelector),
        apply = () => {
          const query = stageRecordNormalizeV1(search?.value),
            stage = String(stageFilter?.value || ""),
            status = stageRecordNormalizeV1(statusFilter?.value);
          rows.forEach((row) => {
            const matchesQuery = !query || stageRecordNormalizeV1(row.dataset[config.textKey]).includes(query),
              matchesStage = !stage || row.dataset[config.stageKey] === stage,
              matchesStatus = !status || stageRecordNormalizeV1(row.dataset[config.statusKey]) === status;
            row.hidden = !(matchesQuery && matchesStage && matchesStatus);
          });
        };
      search?.addEventListener("input", apply);
      stageFilter?.addEventListener("change", apply);
      statusFilter?.addEventListener("change", apply);
      root.querySelector(config.clearSelector)?.addEventListener("click", () => {
        if (search) search.value = "";
        if (stageFilter) stageFilter.value = "";
        if (statusFilter) statusFilter.value = "";
        apply();
      });
    };
    bindFilters({ searchSelector: "[data-stage-center-material-search]", stageSelector: "[data-stage-center-material-stage-filter]", statusSelector: "[data-stage-center-material-status-filter]", rowSelector: "[data-stage-center-material-row]", textKey: "stageCenterMaterialText", stageKey: "stageCenterMaterialStage", statusKey: "stageCenterMaterialStatus", clearSelector: "[data-stage-center-material-clear]" });
    bindFilters({ searchSelector: "[data-stage-center-service-search]", stageSelector: "[data-stage-center-service-stage-filter]", statusSelector: "[data-stage-center-service-status-filter]", rowSelector: "[data-stage-center-service-row]", textKey: "stageCenterServiceText", stageKey: "stageCenterServiceStage", statusKey: "stageCenterServiceStatus", clearSelector: "[data-stage-center-service-clear]" });
    const openItem = (element) => {
      const key = String(element.dataset.stageCenterItemOpen || "");
      if (!key) return;
      appStore.set({ controlStageCenterItemModalKey: key, lastAction: `Abriu as propriedades da adição ${key}` });
      queueMicrotaskFn(() => {
        const host = documentRef.querySelector("[data-stage-home-record-resources]");
        if (!host) return;
        let dialog = host.querySelector("[data-stage-center-item-dialog]");
        if (!dialog) {
          const latest = appStore.get(),
            currentStages = stageRecordStagesV1(),
            currentSelectedKey = String(host.querySelector("[data-stage-home-resource-stage]")?.value || ""),
            materials = stageRecordMaterialRowsV1(latest).filter((item) => String(item.stageKey || "") === currentSelectedKey),
            services = stageRecordServiceRowsV1(latest).filter((item) => String(item.stageKey || "") === currentSelectedKey);
          host.insertAdjacentHTML("beforeend", stageRecordCenterItemModalMarkupV1(latest, materials, services, currentStages));
          dialog = host.querySelector("[data-stage-center-item-dialog]");
        }
        if (dialog) {
          try { if (!dialog.open) dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
        }
      });
    };
    root.querySelectorAll("[data-stage-center-item-open]").forEach((row) => {
      row.addEventListener("click", (event) => { if (!event.target.closest("button, a")) openItem(row); });
      row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openItem(row); } });
    });
    root.querySelectorAll("button[data-stage-center-service-record]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = String(button.dataset.stageCenterServiceRecord || "");
      if (id) appStore.set({ controlStageCenterItemModalKey: `service:${id}`, lastAction: `Abriu as propriedades do serviço ${id}` });
    }));
    const itemDialog = root.querySelector("[data-stage-center-item-dialog]");
    if (itemDialog) {
      try { if (!itemDialog.open) itemDialog.showModal(); } catch { itemDialog.setAttribute("open", ""); }
      itemDialog.addEventListener("click", (event) => { if (event.target === itemDialog) appStore.set({ controlStageCenterItemModalKey: null }); });
      itemDialog.querySelectorAll("[data-stage-center-item-close]").forEach((button) => button.addEventListener("click", () => appStore.set({ controlStageCenterItemModalKey: null })));
    }
    windowRef.lucide?.createIcons();
    return result;
  };
  return ViewLayer;
};

/** Append the material/service review workspace to the active stages landing. */
export const installStageHomeRecordResourcesPageV1 = (ViewLayer, {
  appStore,
  documentRef,
  stageHomeRecordResourcesMarkupV1,
} = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype.render !== "function")
    throw new TypeError("Stage home record resources page requires ViewLayer.prototype.render().");
  if (typeof appStore?.get !== "function")
    throw new TypeError("Stage home record resources page requires appStore.get().");
  if (typeof documentRef?.createElement !== "function" || typeof stageHomeRecordResourcesMarkupV1 !== "function")
    throw new TypeError("Stage home record resources page requires documentRef and its markup service.");
  const baseRender = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = baseRender.apply(this, args), state = appStore.get();
    if (state.view !== "stages" || state.stageActivityDedicatedV9 || this.querySelector("[data-stage-home-record-resources]"))
      return result;
    const section = documentRef.createElement("section");
    section.className = "stage-home-section stage-home-records";
    section.dataset.stageHomeSection = "records";
    section.innerHTML = `<header><div><span class="activity-kind">REGISTROS DA ETAPA</span><h2>Materiais e serviços adicionados</h2><p>Itens reconhecidos pelo assistente, vinculados à etapa e disponíveis para revisão humana.</p></div></header>${stageHomeRecordResourcesMarkupV1(state)}`;
    this.append(section);
    this.bind();
    return result;
  };
  return ViewLayer;
};

/** Keep the stages navigation action in the stages landing context. */
export const installStageRecordsNavigationV1 = (ViewLayer, { appStore } = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype.bind !== "function")
    throw new TypeError("Stage records navigation requires ViewLayer.prototype.bind().");
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Stage records navigation requires appStore.get() and set().");
  const baseBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = baseBind.apply(this, args),
      stagesButton = this.querySelector('[data-view="stages"]');
    if (!stagesButton || stagesButton.dataset.stageRecordsNavigationBound === "true") return result;
    stagesButton.dataset.stageRecordsNavigationBound = "true";
    stagesButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = appStore.get();
      appStore.set({ view: "stages", activityDedicated: false, stageActivityDedicatedV9: false, selectedStageV9: current.selectedStageV9 || current.selectedStage || "water", stageSelected: true, lastAction: "Abriu Etapas com os materiais e serviços registrados" });
    }, true);
    return result;
  };
  return ViewLayer;
};
