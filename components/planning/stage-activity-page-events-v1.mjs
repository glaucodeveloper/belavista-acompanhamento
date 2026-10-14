/** Bind the original stage and dedicated-activity page interactions. */
export const installStageActivityPageEventsV1 = (ViewLayer, {
  appStore,
  executionModel,
  stageV9FlowPackets,
  stageV9ByState,
  stageOf,
  extensionStage,
  activityCatalog,
  workbenchActivityRouteV1,
  esc,
  ico,
  notify,
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
  URL: URLRef = globalThis.URL,
} = {}) => {
  if (typeof ViewLayer?.prototype?.bind !== "function")
    throw new TypeError("Stage activity events require ViewLayer.prototype.bind().");
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Stage activity events require appStore.get() and set().");
  if (!Array.isArray(executionModel?.stages))
    throw new TypeError("Stage activity events require executionModel.stages.");
  for (const [name, value] of Object.entries({
    stageV9FlowPackets, stageV9ByState, stageOf, extensionStage,
    workbenchActivityRouteV1, esc, ico, notify,
  }))
    if (typeof value !== "function")
      throw new TypeError(`Stage activity events require ${name}().`);
  if (!Array.isArray(activityCatalog))
    throw new TypeError("Stage activity events require activityCatalog.");
  if (typeof documentRef?.createElement !== "function" || typeof windowRef?.location?.assign !== "function" || typeof URLRef?.createObjectURL !== "function")
    throw new TypeError("Stage activity events require document, navigation, and URL browser capabilities.");

  const bindBeforeStagesV9 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function () {
    bindBeforeStagesV9?.call(this);
    this.querySelectorAll("[data-stage-v9]").forEach((button) =>
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appStore.set({
          view: "stages",
          selectedStageV9: button.dataset.stageV9,
          selectedStage: button.dataset.stageV9,
          stageSelected: true,
          activityDedicated: true,
          stageActivityDedicatedV9: false,
          lastAction: `Abriu a etapa ${button.textContent.trim()}`,
        });
      }),
    );
    this.querySelector("[data-stage-v9-back]")?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        appStore.set({
          view: "stages",
          activityDedicated: false,
          stageActivityDedicatedV9: false,
          selectedActivity: null,
          lastAction: "Voltou para a árvore de etapas",
        });
      },
      true,
    );
    const dedicated = this.querySelector(".stage-v9-dedicated-page");
    if (dedicated && !dedicated.querySelector("[data-stage-detail-tabs]")) {
      const tabs = documentRef.createElement("nav");
      tabs.className = "stage-detail-tabs-v5428";
      tabs.dataset.stageDetailTabs = "";
      tabs.setAttribute("aria-label", "Seções da etapa");
      [
        ["andamento", "Andamento"],
        ["agenda", "Agenda"],
        ["atividades", "Atividades"],
        ["materiais", "Materiais"],
        ["diario", "Diário"],
      ].forEach(([key, label]) => {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.dataset.stageDetailTab = key;
        button.textContent = label;
        button.addEventListener("click", () => {
          tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
          appStore.set({ selectedStageDetailTab: key, lastAction: `Abriu a aba ${label} da etapa` });
          const targets = {
            andamento: ".stage-v9-status-lines",
            agenda: ".stage-agenda-activities",
            atividades: ".stage-agenda-activities",
            materiais: ".stage-v9-detail-grid",
            diario: ".stage-v9-diary",
          };
          const selector = targets[key];
          if (selector) dedicated.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        tabs.appendChild(button);
      });
      dedicated.querySelector(".stage-v9-dedicated-head")?.insertAdjacentElement("afterend", tabs);
      const active = appStore.get().selectedStageDetailTab || "agenda";
      tabs.querySelector(`[data-stage-detail-tab="${active}"]`)?.classList.add("active");
    }
    this.querySelectorAll("[data-activity-v9]").forEach((button) =>
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appStore.set({
          view: "activities",
          selectedActivity: button.dataset.activityV9,
          stageSelected: true,
          selectedActivityDetailTabV1: "summary",
          activityRecordModalOpenV1: false,
          editingRecord: null,
          recordContext: null,
          activityDedicated: false,
          stageActivityDedicatedV9: true,
          lastAction: `Abriu atividade ${button.textContent.trim()}`,
        });
      }),
    );
    this.querySelector("[data-activity-v9-back]")?.addEventListener("click", () =>
      appStore.set({
        view: "stages",
        activityDedicated: true,
        stageActivityDedicatedV9: false,
        selectedActivityDetailTabV1: "summary",
        activityRecordModalOpenV1: false,
        editingRecord: null,
        recordContext: null,
        lastAction: "Voltou ao fluxo da etapa",
      }),
    );
    this.querySelector("[data-stage-activity-action]")?.addEventListener("click", () => {
      appStore.set({ lastAction: "Confirmou requisitos da atividade no Diário" });
      notify("Confirmação registrada. A propagação permanece auditável no Diário de obra.", "success");
    });
    if (!this.dataset.activityDedicatedOpenCapture) {
      this.dataset.activityDedicatedOpenCapture = "true";
      this.addEventListener("click", (event) => {
        const editButton = event.target?.closest?.("[data-activity-edit]");
        if (editButton && this.contains(editButton)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const stage = extensionStage(), item = activityCatalog[Number(editButton.dataset.activityEdit)];
          if (item) windowRef.location.assign(workbenchActivityRouteV1(item.name, stage?.name));
          return;
        }
        const button = event.target?.closest?.("[data-activity-open]"), card = event.target?.closest?.("[data-activity-card]");
        if ((!button && !card) || !this.contains(button || card)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const stage = extensionStage(),
          model = (executionModel.stages || []).find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(stage?.name).toLocaleLowerCase("pt-BR")) || executionModel.stages?.[0],
          packets = stageV9FlowPackets(model),
          activityIndex = button ? Number(button.dataset.activityOpen) : Array.from(this.querySelectorAll("[data-activity-card]")).indexOf(card),
          packet = packets[activityIndex < 0 ? 0 : activityIndex] || packets[0];
        if (!model || !packet) return;
        appStore.set({
          view: "activities", selectedStage: stage?.id, selectedStageV9: model.key,
          selectedActivity: `${model.key}:${packet.key}`, stageSelected: true,
          activityDedicated: false, stageActivityDedicatedV9: true,
          lastAction: `Abriu atividade dedicada ${packet.label}`,
        });
      }, true);
    }
    this.querySelectorAll("[data-activity-open]").forEach((button) =>
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const stage = extensionStage(),
          model = (executionModel.stages || []).find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(stage?.name).toLocaleLowerCase("pt-BR")) || executionModel.stages?.[0],
          packets = stageV9FlowPackets(model), packet = packets[Number(button.dataset.activityOpen) || 0] || packets[0];
        if (!model || !packet) return;
        appStore.set({
          view: "activities", selectedStage: stage?.id, selectedStageV9: model.key,
          selectedActivity: `${model.key}:${packet.key}`, stageSelected: true,
          activityDedicated: false, stageActivityDedicatedV9: true,
          lastAction: `Abriu atividade dedicada ${packet.label}`,
        });
      }),
    );
    const activityDetail = this.querySelector(".stage-v9-activity-detail");
    if (activityDetail && !activityDetail.querySelector("[data-activity-detail-tabs]")) {
      const state = appStore.get(), stage = stageV9ByState(state) || executionModel.stages?.[0],
        packets = stageV9FlowPackets(stage), currentPacket = String(state.selectedActivity || "").split(":").slice(1).join(":"),
        activePacket = packets.find((item) => item.key === currentPacket) || packets[0], timeline = documentRef.createElement("section");
      timeline.className = "activity-position-timeline-v1";
      timeline.dataset.activityPositionTimeline = "";
      timeline.innerHTML = `<header><div><span class="activity-kind">CRONOGRAMA · POSIÇÃO DA ATIVIDADE</span><h2>Onde esta atividade está no fluxo</h2><p>${esc(stage?.description || "A posição organiza dependências, produção, registros e a próxima liberação.")}</p></div><b>${packets.length} cards relacionados</b></header><div class="activity-position-track-v1">${packets.map((packet, index) => `<button type="button" class="${packet.key === currentPacket ? "active" : ""}" data-activity-timeline-packet="${esc(`${stage.key}:${packet.key}`)}"><span>${String(index + 1).padStart(2, "0")}</span><div><small>${esc(packet.unit || "produção")}</small><strong>${esc(packet.label)}</strong><em>${esc(packet.trigger || "Aguardando atualização")}</em></div></button>`).join("")}</div>`;
      activityDetail.querySelector(".stage-v9-activity-status-lines")?.insertAdjacentElement("beforebegin", timeline);
      const tabs = documentRef.createElement("nav");
      tabs.className = "activity-detail-tabs-v1";
      tabs.dataset.activityDetailTabs = "";
      tabs.setAttribute("aria-label", "Seções da atividade");
      [["summary", "Resumo"], ["records", "Registros"], ["entries", "Apontamentos"]].forEach(([key, label]) => {
        const tab = documentRef.createElement("button");
        tab.type = "button";
        tab.dataset.activityDetailTab = key;
        tab.textContent = label;
        tabs.appendChild(tab);
      });
      const newRecord = documentRef.createElement("button");
      newRecord.type = "button";
      newRecord.className = "activity-detail-new-record";
      newRecord.dataset.activityNewRecord = "";
      newRecord.innerHTML = `${ico("plus")} Novo registro`;
      tabs.appendChild(newRecord);
      const statusLines = activityDetail.querySelector(".stage-v9-activity-status-lines"),
        activityBody = activityDetail.querySelector(".stage-v9-activity-body"), diary = activityDetail.querySelector(".stage-v9-activity-diary"),
        summaryPanel = documentRef.createElement("section"), recordsPanel = documentRef.createElement("section"), entriesPanel = documentRef.createElement("section");
      summaryPanel.className = "activity-tab-panel-v1";
      summaryPanel.dataset.activityTabPanel = "summary";
      summaryPanel.append(timeline, statusLines, activityBody);
      recordsPanel.className = "activity-tab-panel-v1 activity-tab-records-v1";
      recordsPanel.dataset.activityTabPanel = "records";
      recordsPanel.innerHTML = `<header><div><span class="activity-kind">REGISTROS · ATIVIDADE</span><h2>Registros da atividade</h2><p>O mesmo histórico operacional da tela de Registros, concentrado nesta frente.</p></div><b>${(state.records || []).length} registro(s) no sistema</b></header>`;
      if (diary) recordsPanel.append(diary);
      const relatedRecords = (state.records || []).filter((record) => stage.name === stageOf(record) || String(record.atividade || "").toLowerCase().includes(String(activePacket.label || "").toLowerCase())).slice(-8).reverse(),
        entryItems = [
          { kind: "ENTRADA", title: "Contexto da atividade", detail: activePacket.detail },
          { kind: "GATILHO", title: "Fato observado", detail: activePacket.trigger },
          { kind: "SAÍDA", title: "Próxima liberação", detail: activePacket.key === "release" ? "Diretriz de completude confirmada" : "Aceite desta atividade alimenta a próxima frente" },
          ...relatedRecords.map((record) => ({ kind: "REGISTRO COMPLEMENTAR", title: record.atividade || activePacket.label, detail: record.detalhes || "Sem apontamento descrito", meta: `${record.data || "Sem data"} · ${record.responsavel || "Responsável a definir"}` })),
        ];
      entriesPanel.className = "activity-tab-panel-v1 activity-tab-entries-v1";
      entriesPanel.dataset.activityTabPanel = "entries";
      entriesPanel.innerHTML = `<header><div><span class="activity-kind">APONTAMENTOS · LISTA COMPLEMENTAR</span><h2>Apontamentos da atividade</h2><p>Contexto, gatilhos e observações que complementam os registros formais.</p></div><b>${entryItems.length} itens</b></header><div class="activity-entries-list-v1">${entryItems.map((item) => `<article><span>${esc(item.kind)}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p>${item.meta ? `<small>${esc(item.meta)}</small>` : ""}</div></article>`).join("")}</div>`;
      activityDetail.querySelector(".stage-v9-activity-head")?.insertAdjacentElement("afterend", tabs);
      tabs.insertAdjacentElement("afterend", summaryPanel);
      summaryPanel.insertAdjacentElement("afterend", recordsPanel);
      recordsPanel.insertAdjacentElement("afterend", entriesPanel);
      const labels = { summary: "Resumo", records: "Registros", entries: "Apontamentos" },
        showTab = (requested, persist = false) => {
          const key = labels[requested] ? requested : "summary";
          tabs.querySelectorAll("[data-activity-detail-tab]").forEach((item) => item.classList.toggle("active", item.dataset.activityDetailTab === key));
          [summaryPanel, recordsPanel, entriesPanel].forEach((panel) => { panel.hidden = panel.dataset.activityTabPanel !== key; });
          if (persist) appStore.set({ selectedActivityDetailTabV1: key, lastAction: `Abriu ${labels[key]} da atividade` });
        };
      tabs.addEventListener("click", (event) => {
        const create = event.target.closest("[data-activity-new-record]"), tab = event.target.closest("[data-activity-detail-tab]");
        if (create) {
          event.preventDefault(); event.stopPropagation();
          appStore.set({ selectedActivityDetailTabV1: "records", activityRecordModalOpenV1: true, editingRecord: "new", recordContext: null, lastAction: `Abriu novo registro para ${activePacket.label}` });
          return;
        }
        if (!tab) return;
        event.preventDefault(); event.stopPropagation();
        showTab(tab.dataset.activityDetailTab, true);
      });
      this.querySelectorAll("[data-activity-record-close]").forEach((button) => button.addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation();
        appStore.set({ activityRecordModalOpenV1: false, editingRecord: null, recordContext: null, lastAction: "Fechou o modal de novo registro" });
      }));
      const attachmentInput = this.querySelector("[data-activity-record-attachments]"), attachmentList = this.querySelector("[data-activity-record-attachment-list]"), attachmentClear = this.querySelector("[data-activity-record-attachments-clear]");
      if (attachmentInput && !attachmentInput.dataset.bound) {
        attachmentInput.dataset.bound = "true";
        const allowedFile = (file) => /^image\//i.test(file.type) || /^(application\/pdf|text\/plain|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml|spreadsheetml)\.document|application\/vnd\.ms-excel)$/i.test(file.type) || /\.(pdf|txt|doc|docx|xls|xlsx)$/i.test(file.name);
        const renderAttachments = () => {
          const files = [...(attachmentInput.files || [])];
          attachmentList.hidden = !files.length;
          attachmentClear.hidden = !files.length;
          attachmentList.innerHTML = files.map((file, index) => `<article><span class="activity-record-attachment-icon" data-activity-record-attachment-preview="${index}">${/^image\//i.test(file.type) ? "" : "▣"}</span><div><strong>${esc(file.name)}</strong><small>${esc(file.type || "Documento")} · ${(file.size / 1024 / 1024).toFixed(2)} MB</small></div></article>`).join("");
          attachmentList.querySelectorAll("[data-activity-record-attachment-preview]").forEach((preview, index) => {
            const file = files[index];
            if (!/^image\//i.test(file?.type || "")) return;
            const image = documentRef.createElement("img");
            image.alt = `Prévia de ${file.name}`;
            const objectUrl = URLRef.createObjectURL(file);
            image.src = objectUrl;
            image.addEventListener("load", () => URLRef.revokeObjectURL(objectUrl), { once: true });
            preview.replaceChildren(image);
          });
        };
        attachmentInput.addEventListener("change", () => {
          const files = [...(attachmentInput.files || [])], invalid = files.find((file) => !allowedFile(file) || (file.type.startsWith("image/") ? file.size > 6 * 1024 * 1024 : file.size > 12 * 1024 * 1024));
          if (invalid) {
            attachmentInput.value = "";
            renderAttachments();
            notify(`${invalid.name}: imagem até 6 MB ou documento até 12 MB, em formato aceito.`, "warning");
            return;
          }
          renderAttachments();
        });
        attachmentClear?.addEventListener("click", () => { attachmentInput.value = ""; renderAttachments(); });
        renderAttachments();
      }
      showTab(state.selectedActivityDetailTabV1 || "summary");
      timeline.querySelectorAll("[data-activity-timeline-packet]").forEach((card) => card.addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation();
        appStore.set({
          view: "activities", selectedActivity: card.dataset.activityTimelinePacket,
          stageSelected: true, selectedActivityDetailTabV1: "summary", activityRecordModalOpenV1: false,
          activityDedicated: false, stageActivityDedicatedV9: true,
          lastAction: `Selecionou atividade ${card.querySelector("strong")?.textContent || ""} no cronograma`,
        });
      }));
    }
  };
  return ViewLayer;
};
