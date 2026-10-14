/** Reports workspace rendering, evidence actions, and custom report builder. */
export const installReportsWorkspaceV1 = (ViewLayer, services = {}) => {
  const { appStore, syncCashEvidenceReportV1, syncConstructionFinanceReportsV1, syncServiceCompletionReportV1, reportCatalog, esc, ico, notify, documentRef, FileReaderCtor, apiFetch, operationalHeaders, CSSRef, URLRef, schedule, FormDataCtor } = services;
  if (!ViewLayer?.prototype || typeof appStore?.get !== "function" || typeof appStore?.set !== "function") throw new TypeError("Reports workspace requires ViewLayer and appStore get/set.");
  if (!Array.isArray(reportCatalog)) throw new TypeError("Reports workspace requires the application report catalog.");
  for (const [name, dependency] of Object.entries({ syncCashEvidenceReportV1, syncConstructionFinanceReportsV1, syncServiceCompletionReportV1, esc, ico, notify, apiFetch, operationalHeaders, schedule, FormDataCtor, FileReaderCtor })) if (typeof dependency !== "function") throw new TypeError(`Reports workspace requires ${name}().`);
  if (typeof documentRef?.createElement !== "function" || typeof CSSRef?.escape !== "function" || typeof URLRef?.createObjectURL !== "function" || typeof URLRef?.revokeObjectURL !== "function") throw new TypeError("Reports workspace requires injected DOM, CSS, and URL capabilities.");
const originalReportsPageV1 = ViewLayer.prototype.reports;
ViewLayer.prototype.reports = function () {
  const reportState = appStore.get();
  syncCashEvidenceReportV1(reportState);
  syncConstructionFinanceReportsV1(reportState);
  syncServiceCompletionReportV1(reportState);
  (appStore.get().customReports || []).forEach((model) => {
    if (!reportCatalog.some((report) => report.id === model.id))
      reportCatalog.push(model);
  });
  const markup = originalReportsPageV1.call(this);
  const state = appStore.get();
  const selected = reportCatalog.find((report) => report.id === state.reportType && report.family === state.reportFamily)
    || reportCatalog.find((report) => report.family === state.reportFamily);
  const live = ["system-live", "cash-evidence-live", "project-expenses-live", "project-expense-ledger-live", "service-completeness-live"].includes(selected?.id);
  const custom = selected?.id?.startsWith("custom-");
  const nature = live
    ? "Dados da sessão atual"
    : custom
      ? "Modelo configurado · sem dados vinculados"
      : "Dados demonstrativos · não atualizados automaticamente";
  const annotatedMarkup = markup
    .replace(/<label>Período<select data-report-period>[\s\S]*?<\/select><\/label>/, "")
    .replace(/<span class="chip violet">[^<]* · Atualizado agora<\/span>/, `<span class="chip violet">${esc(nature)}</span>`)
    .replace(/<small>Planilha disponível: [^<]*<\/small>/, `<small>${esc(nature)}. Consulte a fonte indicada antes de tomar decisões.</small>`)
    .replace(
      "Relacionado às tabelas do projeto e ao período selecionado.",
      live
        ? "Valores carregados nesta sessão; confirme na fonte operacional antes do fechamento."
        : custom
          ? "Este modelo define a estrutura do relatório; ainda não executa consultas às fontes selecionadas."
          : "Exemplo de apresentação; valores não representam o estado atual do projeto.",
    );
  const fragment = documentRef.createElement("template");
  fragment.innerHTML = annotatedMarkup;
  fragment.content.querySelectorAll(".report-data-row").forEach((dataRow, index) => {
    const detail = fragment.content.querySelector(`[data-report-detail="${index}"]`);
    if (!detail) return;
    dataRow.after(detail);
    detail.id = `report-detail-${index}`;
    dataRow.querySelector("[data-report-row-toggle]")?.setAttribute("aria-controls", detail.id);
    const values = selected?.rows?.[index] || [];
    const fields = (selected?.columns || []).map((column, columnIndex) =>
      `<li><small>${esc(column)}</small><strong>${esc(values[columnIndex] ?? "—")}</strong></li>`,
    ).join("");
    const entry = ["cash-evidence-live", "project-expense-ledger-live"].includes(selected?.id) ? selected.entries?.[index] : null;
    const linkedDocuments = entry ? (state.documentCatalog || []).filter((document) =>
      document.properties?.cashFlowId === entry.id ||
      document.properties?.reportItemId === entry.id ||
      (Array.isArray(entry.documentIds) && entry.documentIds.includes(document.id)) ||
      (state.reportDocumentLinks?.[entry.id] || []).includes(document.id),
    ) : [];
    const attachments = entry?.attachments || (entry?.attachment ? [entry.attachment] : []);
    const documentItems = [
      ...attachments.filter((file) => file.fileName).map((file) => `<li><span class="report-document-icon">${ico("paperclip")}</span><span><strong>${esc(file.fileName)}</strong><small>Comprovante do lançamento ${esc(entry.id)}</small></span><button type="button" data-report-cash-file="${esc(entry.id)}" data-report-cash-attachment="${esc(file.id)}">Baixar arquivo</button></li>`),
      ...linkedDocuments.map((document) => `<li><span class="report-document-icon">${ico("file-text")}</span><span><strong>${esc(document.title || document.fileName || "Documento")}</strong><small>${esc(document.code || document.category || "Acervo do loteamento")}${document.fileName ? ` · ${esc(document.fileName)}` : " · arquivo pendente"}</small></span><button type="button" data-report-project-document="${esc(document.id)}">Ver no acervo</button></li>`),
    ].join("");
    const fiscal = entry?.fiscalDocumentNumber || entry?.fiscalDocumentType
      ? `<p class="report-document-fiscal"><b>Documento fiscal:</b> ${esc([entry.fiscalDocumentType, entry.fiscalDocumentNumber, entry.fiscalIssuer, entry.fiscalIssueDate].filter(Boolean).join(" · "))} <em>${esc(entry.fiscalStatus || "Pendente")}</em></p>`
      : "";
    const linkableDocuments = entry ? (state.documentCatalog || []).filter((document) =>
      (document.fileName || document.sourceUrl) && !linkedDocuments.some((linked) => linked.id === document.id),
    ) : [];
    const evidenceActions = entry ? `<div class="report-document-actions"><label>Anexar recibo ou documento<input type="file" data-report-cash-upload="${esc(entry.id)}" accept="application/pdf,image/jpeg,image/png,image/webp"></label>${linkableDocuments.length ? `<label>Documento do acervo<select data-report-document-choice="${esc(entry.id)}"><option value="">Selecione um documento</option>${linkableDocuments.map((document) => `<option value="${esc(document.id)}">${esc(document.title || document.fileName)}</option>`).join("")}</select></label><button type="button" data-report-document-link="${esc(entry.id)}">Vincular</button>` : ""}</div>` : "";
    const evidenceMarkup = `<section class="report-expanded-documents" aria-label="Recibos e documentos do item"><header><h5>Recibos e documentos relacionados</h5><small>${documentItems ? `${attachments.length + linkedDocuments.length} arquivo(s) vinculado(s)` : "Nenhum arquivo vinculado"}</small></header>${fiscal}${documentItems ? `<ul>${documentItems}</ul>` : `<p class="report-document-empty">${custom ? "Este modelo ainda não consulta documentos." : live ? "Não há recibo ou documento vinculado diretamente a este item." : "Item demonstrativo: não há recibo real associado a esta linha."}</p>`}${evidenceActions}${selected?.id === "system-live" && /caixa|entradas|saídas/i.test(String(values[0])) ? '<button type="button" class="report-document-related" data-report-linked-report="cash-evidence-live">Ver lançamentos e comprovantes de caixa</button>' : ""}</section>`;
    detail.querySelector("td").innerHTML = `<section class="report-expanded-panel" aria-label="Detalhes da linha ${index + 1}"><header class="report-expanded-head"><span class="report-expanded-index">ITEM ${String(index + 1).padStart(2, "0")}</span><span class="report-expanded-title"><h4>${esc(values[0] ?? "Item sem identificação")}</h4><p>Desdobramento da linha selecionada</p></span><span class="report-expanded-nature">${esc(nature)}</span></header><ul class="report-expanded-fields">${fields}</ul>${evidenceMarkup}<footer class="report-expanded-footer"><span>Fonte: ${esc(selected?.source || "Não informada")}</span><span>${live ? "Dados carregados na sessão; confirme antes do fechamento." : custom ? "Modelo sem consulta ativa às fontes." : "Valores ilustrativos; não usar como apuração real."}</span></footer></section>`;
  });
  if (["cash-evidence-live", "project-expenses-live", "project-expense-ledger-live"].includes(selected?.id) && !selected.rows.length) {
    const tbody = fragment.content.querySelector(".report-table tbody");
    const emptyMessage = selected.id === "project-expenses-live"
      ? "Nenhuma saída registrada no caixa nesta sessão."
      : selected.id === "project-expense-ledger-live"
        ? "Nenhum gasto lançado no caixa nesta sessão."
        : "Nenhum lançamento de caixa carregado nesta sessão.";
    if (tbody) tbody.innerHTML = `<tr><td colspan="${selected.columns.length + 1}">${emptyMessage}</td></tr>`;
  }
  return fragment.innerHTML;
};

const bindBeforeReportsWorkspaceV1 = ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function () {
  bindBeforeReportsWorkspaceV1.call(this);
  const workspace = this.querySelector(".reports-workspace");
  if (!workspace) return;
  workspace.addEventListener("change", async (event) => {
    const input = event.target?.closest?.("input[data-report-cash-upload]");
    if (!input?.files?.[0]) return;
    const file = input.files[0];
    if (file.size > 6 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("Use PDF ou imagem de até 6 MB.", "warning");
      input.value = "";
      return;
    }
    input.disabled = true;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReaderCtor();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
        reader.readAsDataURL(file);
      });
      const response = await apiFetch(`/api/cash-flow/${encodeURIComponent(input.dataset.reportCashUpload)}/attachments`, {
        method: "POST", headers: operationalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ attachment: { fileName: file.name, dataUrl } }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.entry) throw new Error(payload.error || `HTTP ${response.status}`);
      appStore.set({ cashFlowLocal: (appStore.get().cashFlowLocal || []).map((entry) => entry.id === payload.entry.id ? payload.entry : entry), lastAction: `Anexou comprovante ao lançamento ${payload.entry.id}` });
      notify("Comprovante anexado ao lançamento.", "success");
    } catch (error) {
      notify(error.message || "Não foi possível anexar o comprovante.", "error");
      input.disabled = false;
      input.value = "";
    }
  });
  workspace.addEventListener("click", async (event) => {
    const button = event.target?.closest?.("button[data-report-cash-file],button[data-report-project-document],button[data-report-linked-report],button[data-report-document-link]");
    if (!button) return;
    if (button.dataset.reportDocumentLink) {
      const id = button.dataset.reportDocumentLink;
      const documentId = workspace.querySelector(`select[data-report-document-choice="${CSSRef.escape(id)}"]`)?.value;
      if (!documentId) { notify("Selecione um documento do acervo.", "warning"); return; }
      const current = appStore.get().reportDocumentLinks || {};
      appStore.set({ reportDocumentLinks: { ...current, [id]: [...new Set([...(current[id] || []), documentId])] }, lastAction: `Vinculou documento ao lançamento ${id}` });
      return;
    }
    if (button.dataset.reportLinkedReport) {
      appStore.set({ reportFamily: "Financeiro", reportType: button.dataset.reportLinkedReport, lastAction: "Abriu lançamentos e comprovantes" });
      return;
    }
    if (button.dataset.reportProjectDocument) {
      appStore.set({ view: "documents", documentsEditId: button.dataset.reportProjectDocument, lastAction: "Abriu documento vinculado ao relatório" });
      return;
    }
    const id = button.dataset.reportCashFile;
    const entry = (appStore.get().cashFlowLocal || []).find((item) => item.id === id);
    const file = (entry?.attachments || (entry?.attachment ? [entry.attachment] : [])).find((item) => item.id === button.dataset.reportCashAttachment);
    if (!file?.fileName) return;
    button.disabled = true;
    try {
      const response = await apiFetch(`/api/cash-flow/${encodeURIComponent(id)}/attachments/${encodeURIComponent(file.id)}/file`, { headers: operationalHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const url = URLRef.createObjectURL(await response.blob());
      const link = documentRef.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      schedule(() => URLRef.revokeObjectURL(url), 1000);
    } catch {
      notify("Não foi possível abrir o comprovante deste lançamento.", "error");
    } finally {
      button.disabled = false;
    }
  });
  const state = appStore.get(),
    toolbar = workspace.querySelector(".reports-toolbar"),
    types = workspace.querySelector(".report-type-tabs");
  if (toolbar && !toolbar.querySelector("[data-report-builder-open]"))
    toolbar.insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="report-toolbar-button" data-report-builder-open>${ico("plus")} Criar relatório</button>`,
    );
  const saved = state.customReports || [];
  if (
    types &&
    saved.length &&
    !workspace.querySelector(".saved-report-options")
  )
    types.insertAdjacentHTML(
      "afterend",
      `<section class="saved-report-options"><div><span class="activity-kind">MODELOS SALVOS</span><b>${saved.length} relatório${saved.length === 1 ? "" : "s"} criado${saved.length === 1 ? "" : "s"}</b></div>${saved.map((model) => `<button type="button" data-report-type-tab="${esc(model.id)}"><span>${ico("bookmark")} ${esc(model.label)}</span><small>${esc(model.family)} · ${esc(model.source)}</small></button>`).join("")}</section>`,
    );
  if (state.reportBuilderOpen && !workspace.querySelector(".report-builder")) {
    const families = [...new Set(reportCatalog.map((report) => report.family))];
    toolbar?.insertAdjacentHTML(
      "afterend",
      `<form class="report-builder" data-report-builder><header><div><span class="activity-kind">NOVO MODELO DE RELATÓRIO</span><h2>Defina a leitura administrativa</h2><p>Escolha a categoria, as fontes e os indicadores que formarão a nova opção da central.</p></div><button type="button" class="toolbar-action" data-report-builder-close>Fechar</button></header><div class="report-builder-grid"><label class="full">Nome do relatório<input required name="name" maxlength="72" placeholder="Ex.: Painel de custos de drenagem"></label><label>Família<select name="family">${families.map((family) => `<option>${esc(family)}</option>`).join("")}<option>Personalizado</option></select></label><label>Categoria de análise<select name="category"><option value="Financeiro">Financeira</option><option value="Construção">Obra e produção</option><option value="Suprimentos">Suprimentos</option><option value="Comercial">Comercial</option><option value="Governança">Governança</option></select></label><label>Período-base<select name="period"><option>Competência mensal</option><option>Trimestre</option><option>Acumulado do projeto</option><option>Data de corte</option></select></label><label>Agrupar por<select name="group"><option>Etapa</option><option>Responsável</option><option>Fornecedor</option><option>Centro de custo</option><option>Categoria</option></select></label><fieldset class="full"><legend>Fontes de dados</legend><label><input checked type="checkbox" name="source" value="Lançamentos"> Lançamentos</label><label><input type="checkbox" name="source" value="Orçamento"> Orçamento</label><label><input type="checkbox" name="source" value="Etapas"> Etapas</label><label><input type="checkbox" name="source" value="Registros"> Registros</label><label><input type="checkbox" name="source" value="Compras"> Compras</label><label><input type="checkbox" name="source" value="Leads"> Leads</label></fieldset><fieldset class="full"><legend>Indicadores e itens</legend><label><input checked type="checkbox" name="indicator" value="Orçado versus realizado"> Orçado versus realizado</label><label><input type="checkbox" name="indicator" value="Consumo do período"> Consumo do período</label><label><input type="checkbox" name="indicator" value="Avanço físico"> Avanço físico</label><label><input type="checkbox" name="indicator" value="Pendências e riscos"> Pendências e riscos</label><label><input type="checkbox" name="indicator" value="Responsáveis e prazos"> Responsáveis e prazos</label><label><input type="checkbox" name="indicator" value="Evidências vinculadas"> Evidências vinculadas</label></fieldset><label class="full">Descrição administrativa<textarea name="description" placeholder="Explique a pergunta que este relatório deve responder."></textarea></label></div><footer><small>O modelo fica salvo neste dispositivo e pode ser exportado como CSV ou impresso.</small><button class="report-toolbar-button" type="submit">${ico("save")} Salvar como opção de relatório</button></footer></form>`,
    );
  }
  this.querySelector("[data-report-builder-open]")?.addEventListener(
    "click",
    () =>
      appStore.set({
        reportBuilderOpen: true,
        lastAction: "Iniciou criação de relatório",
      }),
  );
  this.querySelector("[data-report-builder-close]")?.addEventListener(
    "click",
    () =>
      appStore.set({
        reportBuilderOpen: false,
        lastAction: "Fechou criação de relatório",
      }),
  );
  this.querySelectorAll(".saved-report-options [data-report-type-tab]").forEach(
    (button) =>
      button.addEventListener("click", () => {
        const model = reportCatalog.find(
          (report) => report.id === button.dataset.reportTypeTab,
        );
        if (model)
          appStore.set({
            reportFamily: model.family,
            reportType: model.id,
            lastAction: `Abriu relatório salvo ${model.label}`,
          });
      }),
  );
  this.querySelector("[data-report-builder]")?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = new FormDataCtor(event.currentTarget),
        name = String(form.get("name") || "").trim();
      if (!name) {
        notify("Informe o nome do novo relatório.", "warning");
        return;
      }
      const category = String(form.get("category") || "Personalizado"),
        family = String(form.get("family") || category),
        sources = form.getAll("source").map(String),
        indicators = form.getAll("indicator").map(String),
        group = String(form.get("group") || "Etapa"),
        period = String(form.get("period") || "Competência mensal"),
        id = `custom-${Date.now().toString(36)}`;
      const source = sources.length ? sources.join(" · ") : "Fonte a definir",
        selectedIndicators = indicators.length
          ? indicators
          : ["Indicador a definir"];
      const model = {
        id,
        family,
        category,
        label: name,
        icon: "file-chart-column",
        description: String(
          form.get("description") ||
            `Leitura de ${category.toLocaleLowerCase()} por ${group.toLocaleLowerCase()}.`,
        ),
        source,
        metrics: [
          [
            "Indicadores",
            String(selectedIndicators.length),
            "Itens configurados",
          ],
          ["Fontes", String(sources.length), source],
          ["Agrupamento", group, period],
          ["Situação", "Configurado", "Aguardando dados"],
        ],
        columns: [group, "Indicador", "Fonte", "Período", "Situação"],
        rows: selectedIndicators.map((indicator) => [
          group,
          indicator,
          source,
          period,
          "Configurado",
        ]),
      };
      reportCatalog.push(model);
      appStore.set({
        customReports: [...(appStore.get().customReports || []), model],
        reportFamily: family,
        reportType: id,
        reportBuilderOpen: false,
        lastAction: `Criou relatório ${name}`,
      });
      notify(`Relatório “${name}” salvo como nova opção.`, "success");
    },
  );
};


};
