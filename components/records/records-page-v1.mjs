export const installRecordsPageV1 = (ViewLayer, dependencies = {}) => {
  const { appStore, demoData, activityCatalog, esc, ico, notify, apiFetch } = dependencies;
  const document = dependencies.document || globalThis.document;

ViewLayer.prototype.records = function () {
  const s = appStore.get(),
    filters = {
      entity: "records",
      stage: "all",
      activity: "all",
      category: "all",
      responsible: "all",
      purchase: "all",
      query: "",
      ...(s.recordFilters || {}),
    };
  const records = s.records || [],
    unique = (values) => [...new Set(values.filter(Boolean))],
    activityNames = unique([
      ...demoData.activities.map((item) => item.name),
      ...activityCatalog.map((item) => item.name),
      ...records.map((item) => item.atividade),
    ]),
    stageNames = unique([
      ...demoData.activities.map((item) => item.name),
      ...records.map((item) => item.etapa),
    ]),
    responsibleNames = unique([
      ...demoData.collaborators.map((item) => item[0]),
      ...records.map((item) => item.responsavel),
    ]),
    categories = unique(activityCatalog.map((item) => item.nature)),
    purchases = demoData.purchases;
  const categoryOf = (record) =>
    activityCatalog.find((item) =>
      String(record.atividade || "")
        .toLowerCase()
        .includes(String(item.name || "").toLowerCase()),
    )?.nature ||
    record.categoria ||
    "Execução operacional";
  const entityMatch = (record) => {
    const text = JSON.stringify(record).toLowerCase(),
      entity = filters.entity;
    if (entity === "all" || entity === "records") return true;
    if (entity === "projects") return Boolean(record.obra);
    if (entity === "stages") return Boolean(record.etapa || record.atividade);
    if (entity === "activities") return Boolean(record.atividade);
    if (entity === "collaborators") return Boolean(record.responsavel);
    if (entity === "materials")
      return /tubo|cimento|brita|areia|material|m[eé]dica/i.test(text);
    if (entity === "purchases")
      return /pe-|compra|fornecedor|poste|tubo|concreto/i.test(text);
    if (entity === "leads") return /lead|lote|interesse|cliente/i.test(text);
    if (entity === "activity_relations")
      return Boolean(record.atividade && record.etapa);
    if (entity === "audit_events")
      return Boolean(record.updatedAt || record.createdAt);
    return true;
  };
  const filtered = records.filter((record) => {
    const text = JSON.stringify(record).toLowerCase(),
      q = String(filters.query || "")
        .trim()
        .toLowerCase(),
      purchase = String(filters.purchase || "all");
    return (
      entityMatch(record) &&
      (!q || text.includes(q)) &&
      (filters.stage === "all" || record.etapa === filters.stage) &&
      (filters.activity === "all" || record.atividade === filters.activity) &&
      (filters.category === "all" || categoryOf(record) === filters.category) &&
      (filters.responsible === "all" ||
        record.responsavel === filters.responsible) &&
      (purchase === "all" || text.includes(purchase.toLowerCase()))
    );
  });
  const selected = records.find((record) => record.id === s.selectedRecord),
    editing = records.find((record) => record.id === s.editingRecord),
    context = s.recordContext || null,
    contextCatalog =
      context &&
      (activityCatalog.find((item) => item.name === context.activity) ||
        activityCatalog.find((item) => item.nature === context.nature)),
    formActivity =
      context?.activity ||
      editing?.atividade ||
      activityNames[0] ||
      "Atividade operacional",
    formNature =
      context?.nature ||
      editing?.categoria ||
      contextCatalog?.nature ||
      "Execução operacional",
    protectedEvidence = selected?.evidenceUri?.match(/^r2:\/\/[^/]+\/(.+)$/),
    photo =
      selected?.evidenceUri && !protectedEvidence
        ? selected.evidenceUri
        : "./assets/reference/dashboard.png";
  const opt = (value, label, current) =>
    `<option value="${esc(value)}" ${current === value ? "selected" : ""}>${esc(label)}</option>`;
  const evidenceThumb = (record) =>
    /^r2:\/\//i.test(String(record.evidenceUri || ""))
      ? `<div class="record-thumb record-thumb-protected" title="Comprovação protegida no Cloudflare R2">${ico("shield-check")}<span>R2 protegido</span></div>`
      : `<img class="record-thumb" src="${esc(record.evidenceUri || "./assets/reference/dashboard.png")}" alt="Evidência de ${esc(record.atividade || "atividade")}" loading="lazy">`;
  const contextFields = contextCatalog
    ? `<section class="record-context-fields" data-record-context-fields><div class="record-context-heading"><div><span class="activity-kind">${esc(contextCatalog.nature)}</span><b>${esc(contextCatalog.name)}</b></div><small>${esc(context?.label || "Área selecionada no modelo 3D")}</small></div><div class="record-context-group"><span>01 · DADOS INICIAIS</span><div>${contextCatalog.initial.map((field, index) => `<label>${esc(field)}<input name="context_initial_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Preencher ${esc(field.toLowerCase())}"></label>`).join("")}</div></div><div class="record-context-group"><span>02 · EXECUÇÃO E EVIDÊNCIAS</span><div>${contextCatalog.execution.map((field, index) => `<label>${esc(field)}<input name="context_execution_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Registrar ${esc(field.toLowerCase())}"></label>`).join("")}</div></div></section>`
    : '<div class="record-context-empty" data-record-context-fields>Selecione uma superfície do modelo 3D para carregar os campos da natureza correspondente.</div>';
  const cards = filtered
    .map(
      (record) =>
        `<article class="record-card" data-record-open="${esc(record.id)}" tabindex="0" role="button"><div class="record-main"><span class="record-id">${esc(record.id)}</span><span class="record-category">${esc(categoryOf(record))}</span><strong>${esc(record.atividade || "Registro operacional")}</strong><small>${esc(record.data)} · ${esc(record.hora)} · ${esc(record.responsavel || "A definir")}</small><small>${esc(record.obra || "Aliança Park")} · ${esc(record.etapa || "Etapa não vinculada")}</small></div>${evidenceThumb(record)}<span class="record-status">${esc(record.status)}</span><div class="record-actions"><button data-record-edit="${esc(record.id)}">Editar</button><button data-record-delete="${esc(record.id)}">Excluir</button><button data-record-open="${esc(record.id)}">Abrir drill-in</button></div></article>`,
    )
    .join("");
  const detail = selected
    ? `<aside class="record-detail"><div class="record-detail-head"><div><span class="activity-kind">DRILL-IN · ${esc(selected.id)}</span><h2>${esc(selected.atividade || "Registro operacional")}</h2></div><button type="button" data-record-close aria-label="Fechar detalhes">×</button></div><div class="record-detail-meta"><span>${esc(selected.status)}</span><small>${esc(selected.data)} · ${esc(selected.hora)}</small></div>${protectedEvidence ? `<div class="record-evidence record-evidence-protected" data-record-evidence-key="${esc(protectedEvidence[1])}"><span>${ico("shield-check")}</span><b>Comprovação protegida no Cloudflare R2</b><small>Carregando com autorização do Worker…</small></div>` : `<img class="record-evidence" src="${esc(photo)}" alt="Foto ou evidência do registro">`}<div class="record-detail-grid"><div><small>OBRA</small><b>${esc(selected.obra || "Aliança Park")}</b></div><div><small>ETAPA</small><b>${esc(selected.etapa || "Não vinculada")}</b></div><div><small>CATEGORIA</small><b>${esc(categoryOf(selected))}</b></div><div><small>RESPONSÁVEL</small><b>${esc(selected.responsavel || "A definir")}</b></div><div><small>ATIVIDADE</small><b>${esc(selected.atividade || "Não vinculada")}</b></div><div><small>ÁREA PINTADA</small><b>${selected.mapArea ? esc(selected.mapArea) : "Ainda não marcada"}</b></div><div><small>COMPRA / EVIDÊNCIA</small><b>${selected.evidenceUri ? "Foto anexada" : "Evidência padrão disponível"}</b></div></div><p class="record-detail-copy">${esc(selected.detalhes || "Sem observações registradas.")}</p><div class="record-detail-actions"><button data-record-edit="${esc(selected.id)}">Editar registro</button><button data-record-paint="${esc(selected.id)}">${ico("paintbrush")} Pintar no mapa</button><button data-record-delete="${esc(selected.id)}">Excluir registro</button></div></aside>`
    : '<aside class="record-detail record-detail-empty"><span class="activity-kind">DRILL-IN DE REGISTROS</span><h2>Selecione um item</h2><p>Clique em qualquer registro para abrir fotos, evidências, relações e os dados completos da atividade.</p></aside>';
  queueMicrotask(() => this.bindRecords?.());
  return `<div class="records-page"><div class="records-map-wash" aria-hidden="true"></div><div class="records-shell"><div class="records-head"><div><span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1><p>Obra → atividade → evidência → responsável → confirmação.</p></div><button class="records-new">＋ Novo registro</button></div><div class="records-map-instruction"><span>${ico("paintbrush")} MAPA DE PROGRESSO</span><b>Use “Pintar no mapa” no formulário para marcar a área executada.</b><small>O modelo 3D fica à direita; clique em um lote, rua ou estrutura para vincular a evidência.</small></div><div class="records-toolbar" aria-label="Filtros de registros"><label>Categoria de visualização<select data-record-filter="entity">${opt("records", "Registros operacionais", filters.entity)}${opt("all", "Todas as entidades", filters.entity)}${opt("projects", "Obras", filters.entity)}${opt("stages", "Etapas", filters.entity)}${opt("activities", "Atividades", filters.entity)}${opt("collaborators", "Colaboradores", filters.entity)}${opt("materials", "Materiais", filters.entity)}${opt("purchases", "Compras", filters.entity)}${opt("leads", "Leads", filters.entity)}${opt("activity_relations", "Relações de atividades", filters.entity)}${opt("audit_events", "Auditoria", filters.entity)}</select></label><label>Etapa<select data-record-filter="stage">${opt("all", "Todas as etapas", filters.stage)}${stageNames.map((value) => opt(value, value, filters.stage)).join("")}</select></label><label>Atividade<select data-record-filter="activity">${opt("all", "Todas as atividades", filters.activity)}${activityNames.map((value) => opt(value, value, filters.activity)).join("")}</select></label><label>Categoria específica<select data-record-filter="category">${opt("all", "Todas as categorias", filters.category)}${categories.map((value) => opt(value, value, filters.category)).join("")}</select></label><label>Responsável<select data-record-filter="responsible">${opt("all", "Todos os responsáveis", filters.responsible)}${responsibleNames.map((value) => opt(value, value, filters.responsible)).join("")}</select></label><label>Compra relacionada<select data-record-filter="purchase">${opt("all", "Todas as compras", filters.purchase)}${purchases.map((item) => opt(item.id, `${item.id} · ${item.desc}`, filters.purchase)).join("")}</select></label><label class="records-search">Buscar<input data-record-filter="query" value="${esc(filters.query)}" placeholder="ID, detalhe, fornecedor…"></label><button type="button" class="records-clear-filters" data-record-clear>Limpar filtros</button></div><div class="records-layout"><section class="records-list records-report-area"><div class="records-list-head"><div><b>Relatório de registros</b><small>${filtered.length} de ${records.length} itens · passe o mouse para revelar o mapa</small></div><span class="records-scope">${esc(filters.entity === "all" ? "Todas as tabelas" : filters.entity)}</span></div>${cards || '<div class="empty-records">Nenhum registro corresponde aos filtros atuais.</div>'}</section>${detail}<aside class="records-form-wrap ${s.editingRecord ? "open" : ""}"><form class="record-form"><h2>${s.editingRecord ? "Editar registro" : "Adicionar registro"}</h2><label>Obra<select name="obra">${opt("Aliança Park", "Aliança Park", editing?.obra)}${opt("Belavista", "Belavista", editing?.obra)}</select></label><label>Atividade<select name="atividade">${activityNames.map((value) => opt(value, value, editing?.atividade)).join("")}</select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${esc(editing?.data || new Date().toISOString().slice(0, 10))}"></label><label>Hora<input name="hora" type="time" value="${esc(editing?.hora || "08:30")}"></label></div><label>Responsável<select name="responsavel">${opt("", "A definir", editing?.responsavel || "")}${responsibleNames.map((value) => opt(value, value, editing?.responsavel)).join("")}</select></label><label>Detalhes<textarea name="detalhes" placeholder="Descreva a evidência, medição ou ocorrência">${esc(editing?.detalhes || "")}</textarea></label><label>Foto / evidência<input name="evidenceUri" value="${esc(editing?.evidenceUri || "")}" placeholder="URL local ou caminho da foto"></label><input type="hidden" name="mapArea" value="${esc(editing?.mapArea || "")}"><div class="record-map-actions"><button type="button" class="record-map-paint" data-record-paint="${esc(editing?.id || "new")}">${ico("paintbrush")} Pintar no mapa</button><span data-record-map-status>${editing?.mapArea ? "Área já marcada no mapa" : "Nenhuma área marcada"}</span></div><label>Status<select name="status">${opt("Pendente", "Pendente", editing?.status)}${opt("Concluído", "Concluído", editing?.status)}</select></label><button class="record-confirm">${s.editingRecord ? "Salvar alterações" : "Confirmar registro"}</button>${s.editingRecord ? '<button type="button" class="record-cancel">Cancelar</button>' : ""}</form></aside></div><div class="records-filter-foot"><span>Relacionamentos ativos: etapas · atividades · responsáveis · materiais · compras · evidências · áreas do mapa</span><span>${s.editingRecord ? "Editando " + esc(s.editingRecord) : "Clique em um card para abrir o drill-in"}</span></div></div></div>`;
};

ViewLayer.prototype.bindRecords = function () {
  const page = this.querySelector(".records-page");
  if (!page || page.dataset.bound) return;
  page.dataset.bound = "true";
  const state = appStore.get(),
    context = state.recordContext || null,
    contextCatalog =
      context &&
      (activityCatalog.find((item) => item.name === context.activity) ||
        activityCatalog.find((item) => item.nature === context.nature));
  const form = page.querySelector(".record-form");
  if (form) {
    const isEditing = Boolean(
      state.editingRecord && state.editingRecord !== "new",
    );
    form.querySelector("h2").textContent = isEditing
      ? "Editar registro"
      : "Adicionar registro";
    const confirm = form.querySelector(".record-confirm");
    if (confirm)
      confirm.textContent = isEditing
        ? "Salvar alterações"
        : "Confirmar registro";
    form.dataset.recordNature = context?.nature || "";
    form.dataset.recordActivity = context?.activity || "";
    form.dataset.recordStage = context?.stage || "";
    const activitySelect = form.querySelector('select[name="atividade"]');
    if (
      activitySelect &&
      context?.activity &&
      [...activitySelect.options].some(
        (option) => option.value === context.activity,
      )
    )
      activitySelect.value = context.activity;
    [
      ["categoria", context?.nature || ""],
      ["etapa", context?.stage || ""],
    ].forEach(([name, value]) => {
      let input = form.querySelector(`input[name="${name}"]`);
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.appendChild(input);
      }
      input.value = value;
    });
    const existing = form.querySelector("[data-record-context-fields]");
    existing?.remove();
    const section = document.createElement("section");
    section.className = contextCatalog
      ? "record-context-fields"
      : "record-context-empty";
    section.dataset.recordContextFields = "true";
    section.innerHTML = contextCatalog
      ? `<div class="record-context-heading"><div><span class="activity-kind">${esc(contextCatalog.nature)}</span><b>${esc(contextCatalog.name)}</b></div><small>${esc(context?.label || "Área selecionada no modelo 3D")}</small></div><div class="record-context-group"><span>01 · DADOS INICIAIS</span><div>${contextCatalog.initial.map((field, index) => `<label>${esc(field)}<input name="context_initial_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Preencher ${esc(field.toLowerCase())}"></label>`).join("")}</div></div><div class="record-context-group"><span>02 · EXECUÇÃO E EVIDÊNCIAS</span><div>${contextCatalog.execution.map((field, index) => `<label>${esc(field)}<input name="context_execution_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Registrar ${esc(field.toLowerCase())}"></label>`).join("")}</div></div>`
      : "Selecione uma superfície do modelo 3D para carregar os campos da natureza correspondente.";
    form
      .querySelector(".record-map-actions")
      ?.insertAdjacentElement("afterend", section);
    const mapAreaInput = form.querySelector('input[name="mapArea"]'),
      mapAreaStatus = form.querySelector("[data-record-map-status]");
    if (mapAreaInput && context) {
      mapAreaInput.value = JSON.stringify(context);
      if (mapAreaStatus)
        mapAreaStatus.textContent = `${context.label} · ${context.nature || "contexto"} selecionado`;
    }
    const evidence = form.querySelector('input[name="evidenceUri"]');
    if (evidence && state.recordCameraPreview) {
      evidence.type = "hidden";
      evidence.value = state.recordCameraPreview;
    }
    const attachmentRef =
      context?.attachmentRef?.reference || context?.attachmentRef?.ref || "";
    if (evidence && attachmentRef) {
      evidence.value = attachmentRef;
      evidence.readOnly = true;
      evidence.title = "Referência privada mantida pelo Worker Cloudflare";
      evidence.dataset.workerAttachment = "true";
    }
  }
  let mobileCapture = page.querySelector(".records-mobile-capture");
  if (!mobileCapture) {
    mobileCapture = document.createElement("section");
    mobileCapture.className = "records-mobile-capture";
    mobileCapture.setAttribute("aria-label", "Captura de registro em campo");
    mobileCapture.innerHTML = `<div><span class="activity-kind">REGISTRO DE CAMPO</span><b>${context ? `Área: ${esc(context.label)}` : "Selecione uma superfície ou registre uma evidência"}</b><small>${context ? `${esc(context.nature)} · ${esc(context.activity)}` : state.recordCameraName ? `Foto capturada: ${esc(state.recordCameraName)}` : "Toque no mapa para selecionar lote, rua ou estrutura."}</small></div><div class="records-mobile-actions"><button type="button" data-record-mobile-select>${ico("scan-line")} Selecionar superfície</button><button type="button" data-record-camera>${ico("camera")} Abrir câmera</button><input type="file" accept="image/*" capture="environment" data-record-camera-input aria-label="Capturar foto da evidência"></div>`;
    page
      .querySelector(".records-map-instruction")
      ?.insertAdjacentElement("afterend", mobileCapture);
  }
  const map = document.querySelector("map-scene:not([compact])");
  const beginSurfaceSelection = () => {
    map?.setRecordPaintMode(true, (area) => {
      appStore.set({
        editingRecord: "new",
        recordContext: area,
        selectedRecord: null,
        lastAction: `Selecionou ${area.label} para ${area.nature}`,
      });
      notify(
        `${area.label} selecionada. Campos de ${area.nature} carregados.`,
        "success",
      );
    });
  };
  mobileCapture
    .querySelector("[data-record-mobile-select]")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      beginSurfaceSelection();
    });
  mobileCapture
    .querySelector("[data-record-camera]")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      mobileCapture.querySelector("[data-record-camera-input]")?.click();
    });
  mobileCapture
    .querySelector("[data-record-camera-input]")
    ?.addEventListener("change", (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this._recordCameraFile = file;
        appStore.set({
          editingRecord: "new",
          recordCameraName: file.name,
          recordCameraPreview: String(reader.result || ""),
          lastAction: `Capturou evidência ${file.name}`,
        });
      };
      reader.readAsDataURL(file);
    });
  page.querySelector(".records-new")?.addEventListener("click", () => {
    this._recordCameraFile = null;
    appStore.set({
      editingRecord: "new",
      recordContext: null,
      recordCameraName: null,
      recordCameraPreview: null,
      selectedRecord: null,
      lastAction: "Abriu novo registro",
    });
  });
  page.querySelectorAll("[data-record-filter]").forEach((control) =>
    control.addEventListener("change", (event) => {
      const key = event.currentTarget.dataset.recordFilter,
        recordFilters = {
          ...(appStore.get().recordFilters || {}),
          [key]: event.currentTarget.value,
        };
      appStore.set({ recordFilters });
    }),
  );
  page.querySelector("[data-record-clear]")?.addEventListener("click", () =>
    appStore.set({
      recordFilters: {
        entity: "records",
        stage: "all",
        activity: "all",
        category: "all",
        responsible: "all",
        purchase: "all",
        query: "",
      },
      selectedRecord: null,
    }),
  );
  page.querySelectorAll(".record-card[data-record-open]").forEach((card) =>
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      appStore.set({
        selectedRecord: card.dataset.recordOpen,
        lastAction: `Abriu drill-in do registro ${card.dataset.recordOpen}`,
      });
    }),
  );
  page.querySelectorAll(".record-card[data-record-open]").forEach((card) =>
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        appStore.set({ selectedRecord: card.dataset.recordOpen });
      }
    }),
  );
  page
    .querySelectorAll(".record-actions [data-record-open]")
    .forEach((button) =>
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        appStore.set({
          selectedRecord: button.dataset.recordOpen,
          lastAction: `Abriu drill-in do registro ${button.dataset.recordOpen}`,
        });
      }),
    );
  page
    .querySelector("[data-record-close]")
    ?.addEventListener("click", () => appStore.set({ selectedRecord: null }));
  const startPaint = (button) => {
    const targetId = button.dataset.recordPaint;
    const form = page.querySelector(".record-form");
    if (!form && targetId && targetId !== "new") {
      appStore.set({
        editingRecord: targetId,
        lastAction: `Preparou pintura do registro ${targetId}`,
      });
      setTimeout(() => this.querySelector(".record-map-paint")?.click(), 0);
      return;
    }
    page
      .querySelectorAll("[data-record-paint]")
      .forEach((item) => item.classList.toggle("active", item === button));
    map?.setRecordPaintMode(true, (area) => {
      page
        .querySelectorAll("[data-record-paint]")
        .forEach((item) => item.classList.remove("active"));
      appStore.set({
        editingRecord: targetId && targetId !== "new" ? targetId : "new",
        recordContext: area,
        selectedRecord: null,
        lastAction: `Selecionou ${area.label} para ${area.nature}`,
      });
      notify(
        "Área pintada. Confirme o registro para salvar a relação.",
        "success",
      );
    });
  };
  page.querySelectorAll("[data-record-paint]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startPaint(button);
    }),
  );
  page.querySelectorAll("[data-record-evidence-key]").forEach((node) => {
    if (node.dataset.evidenceLoading) return;
    node.dataset.evidenceLoading = "true";
    const key = String(node.dataset.recordEvidenceKey || "").trim();
    if (!key) return;
    apiFetch(`/api/media/attachment?key=${encodeURIComponent(key)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`evidence_${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        const image = document.createElement("img");
        image.className = "record-evidence";
        image.src = URL.createObjectURL(blob);
        image.alt = "Comprovação protegida do registro";
        node.replaceWith(image);
      })
      .catch(() => {
        const message = node.querySelector("small");
        if (message)
          message.textContent =
            "Comprovação mantida no R2; acesso visual indisponível nesta sessão.";
      });
  });
};
};
