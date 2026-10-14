/** Project document catalog, IndexedDB file service, table editing, and event bindings. */
export const installProjectDocumentsPageV1 = (ViewLayer, dependencies = {}) => {
  const { appStore, esc, ico, notify, runtimeRouteV1, host = globalThis } = dependencies;
  const indexedDB = host.indexedDB;
  const document = host.document;
  const window = host.window || host;
  const FormData = host.FormData;
  const requestAnimationFrame = host.requestAnimationFrame.bind(host);
  const confirm = host.confirm.bind(host);
  const URL = host.URL;
  const setTimeout = host.setTimeout.bind(host);
  const Option = host.Option;
  const CSS = host.CSS;

  const ADMIN_DOCUMENT_CATEGORIES_V1 = [
    "Projeto e planta", "Memorial descritivo", "Licença e aprovação",
    "Topografia e levantamento", "Infraestrutura", "Institucional", "Outro",
  ];
  const ADMIN_DOCUMENT_COLUMNS_V2 = [
    ["title", "Título"], ["category", "Categoria"], ["code", "Código / revisão"],
    ["issuer", "Emissor / órgão"], ["documentDate", "Data do documento"],
    ["fileName", "Arquivo"], ["description", "Descrição"],
    ["createdAt", "Adicionado em"], ["updatedAt", "Última alteração"],
  ];
  const adminDocumentDateV2 = (value) => value ? new Date(value).toLocaleString("pt-BR") : "—";
  const adminDocumentProtectedV2 = (item) => ["doc-proj-exec", "doc-proj-licenses", "doc-presentation-v3"].includes(item.id) || item.builtIn || item.sourceMaterialId;
  const adminDocumentBlobV1 = (operation, id, blob) => new Promise((resolve, reject) => {
    if (!host.indexedDB) {
      reject(new Error("O armazenamento local de arquivos não está disponível neste navegador."));
      return;
    }
    const opening = indexedDB.open("alianca-park-project-documents-v1", 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore("files", { keyPath: "id" });
    opening.onerror = () => reject(opening.error || new Error("Falha ao abrir documentos."));
    opening.onsuccess = () => {
      const db = opening.result;
      const transaction = db.transaction("files", operation === "get" ? "readonly" : "readwrite");
      const store = transaction.objectStore("files");
      const request = operation === "put"
        ? store.put({ id, blob })
        : operation === "delete" ? store.delete(id) : store.get(id);
      let value;
      request.onsuccess = () => { value = request.result; };
      transaction.oncomplete = () => { db.close(); resolve(value?.blob || value || null); };
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Falha ao acessar o arquivo.")); };
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error("Operação cancelada.")); };
    };
  });
  
  ViewLayer.prototype.documents = function () {
    const state = appStore.get();
    const catalog = Array.isArray(state.documentCatalog) ? state.documentCatalog : [];
    const query = String(state.documentsQuery || "").trim().toLocaleLowerCase("pt-BR");
    const category = String(state.documentsCategory || "all");
    const shown = catalog.filter((item) =>
      (category === "all" || item.category === category) &&
      ((state.documentsFileFilter || "all") === "all" || ((state.documentsFileFilter === "attached") === Boolean(item.fileName))) &&
      (!query || [item.title, item.code, item.category, item.issuer, item.description, item.fileName]
        .concat(Object.values(item.properties || {})).some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(query))))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    const editing = catalog.find((item) => item.id === state.documentsEditId);
    const openForm = state.documentsEditId === "new" || Boolean(editing);
    const customColumns = Array.isArray(state.documentsCustomColumns) ? state.documentsCustomColumns : [];
    const columns = [...ADMIN_DOCUMENT_COLUMNS_V2, ...customColumns.map((entry) => [entry.id, entry.label])];
    const hidden = Array.isArray(state.documentsHiddenColumns) ? state.documentsHiddenColumns : [];
    const visible = columns.filter(([id]) => !hidden.includes(id));
    const opt = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
    return `<section class="project-documents-page" data-project-documents-page>
      <header class="project-documents-head"><div><span class="activity-kind">ALIANÇA PARK · ACERVO DO EMPREENDIMENTO</span><h1>Documentos do loteamento</h1><p>Projetos, plantas, memoriais, licenças e arquivos institucionais do loteamento. Anexos de contratos e registros permanecem em suas próprias páginas.</p></div><button type="button" class="toolbar-primary" data-document-new>${ico("file-plus-2")} Adicionar documento</button></header>
      <div class="project-documents-summary"><div><small>DOCUMENTOS</small><b>${catalog.length}</b></div><div><small>CATEGORIAS</small><b>${new Set(catalog.map((item) => item.category)).size}</b></div><div><small>ARMAZENAMENTO</small><b>Local neste navegador</b></div></div>
      <div class="project-documents-toolbar"><label>Pesquisar<input type="search" data-document-query value="${esc(state.documentsQuery || "")}" placeholder="Título, código, órgão, arquivo…"></label><label>Categoria<select data-document-category>${opt("all", "Todas as categorias", category)}${ADMIN_DOCUMENT_CATEGORIES_V1.map((item) => opt(item, item, category)).join("")}</select></label><label>Arquivo<select data-document-file-filter>${opt("all", "Todos", state.documentsFileFilter || "all")}${opt("attached", "Com arquivo", state.documentsFileFilter || "all")}${opt("pending", "Pendentes", state.documentsFileFilter || "all")}</select></label><details class="project-document-columns"><summary>Configurar colunas</summary>${columns.map(([id, label]) => `<div><label><input type="checkbox" data-document-column-toggle="${esc(id)}" ${hidden.includes(id) ? "" : "checked"}>${esc(label)}</label>${customColumns.some((entry) => entry.id === id) ? `<button type="button" data-document-column-delete="${esc(id)}" title="Excluir propriedade e seus valores">Excluir</button>` : ""}</div>`).join("")}<form data-document-column-form><input name="label" required maxlength="50" placeholder="Nova propriedade"><button type="submit">Adicionar coluna</button></form></details><span>${shown.length} de ${catalog.length} documentos</span></div>
      ${openForm ? `<form class="project-document-editor" data-document-form><header><div><span class="activity-kind">${editing ? "EDITAR DOCUMENTO" : "NOVO DOCUMENTO"}</span><h2>${editing ? esc(editing.title) : "Adicionar ao acervo"}</h2></div><button type="button" data-document-cancel>Fechar</button></header><div class="project-document-fields"><label>Título<input name="title" required maxlength="140" value="${esc(editing?.title || "")}" placeholder="Ex.: Planta geral aprovada"></label><label>Categoria<select name="category">${ADMIN_DOCUMENT_CATEGORIES_V1.map((item) => opt(item, item, editing?.category || "Projeto e planta")).join("")}</select></label><label>Código / revisão<input name="code" maxlength="60" value="${esc(editing?.code || "")}" placeholder="Ex.: AP-PL-001 · Rev. B"></label><label>Emissor / órgão<input name="issuer" maxlength="100" value="${esc(editing?.issuer || "")}" placeholder="Projetista, prefeitura, concessionária…"></label><label>Data do documento<input name="documentDate" type="date" value="${esc(editing?.documentDate || "")}"></label><label>Item documental em Materiais<select name="sourceMaterialId">${opt("", "Sem vínculo", editing?.sourceMaterialId || "")}${opt("proj-exec", "Projeto executivo", editing?.sourceMaterialId || "")}${opt("proj-licenses", "Liberações / licenças", editing?.sourceMaterialId || "")}</select></label><label>Arquivo PDF, DWG ou outro formato<input name="file" type="file" accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" ${editing?.fileName ? "" : "required"}><small>${editing?.fileName ? `Atual: ${esc(editing.fileName)} · deixe vazio para manter` : "PDF, DWG, DXF, Office ou imagem · até 25 MB"}</small></label><label class="wide">Descrição<textarea name="description" rows="3" maxlength="800" placeholder="Conteúdo, abrangência e observações relevantes">${esc(editing?.description || "")}</textarea></label>${customColumns.map((entry) => `<label>${esc(entry.label)}<input name="property:${esc(entry.id)}" maxlength="500" value="${esc(editing?.properties?.[entry.id] || "")}"></label>`).join("")}</div><footer><span>O arquivo fica somente neste navegador; não é enviado ao servidor.</span><button type="submit" class="toolbar-primary">${ico("save")} Salvar documento</button></footer></form>` : ""}
      <div class="project-documents-sheet-tools"><span data-document-selection-label>Selecione uma célula · Enter edita · Delete limpa · setas navegam</span><button type="button" data-document-selected-open data-document-open hidden>Abrir arquivo</button><button type="button" data-document-selected-edit data-document-edit hidden>Editar documento</button><button type="button" data-document-selected-clear hidden>Limpar célula</button><button type="button" data-document-selected-row-delete data-document-delete hidden>Excluir linha</button><button type="button" data-document-selected-column-delete hidden>Excluir coluna</button></div>
      <div class="project-documents-table-wrap"><table class="project-documents-table"><thead><tr><th scope="col" class="project-document-row-number">#</th>${visible.map(([id, label]) => `<th scope="col" data-document-column-header="${esc(id)}" tabindex="0" title="Clique para selecionar a coluna">${esc(label)}</th>`).join("")}</tr></thead><tbody>${shown.map((item, index) => `<tr data-document-row="${esc(item.id)}"><th scope="row" class="project-document-row-number" data-document-row-header="${esc(item.id)}" tabindex="0" title="Clique para selecionar a linha">${index + 1}</th>${visible.map(([id]) => { const raw = id === "createdAt" || id === "updatedAt" ? adminDocumentDateV2(item[id]) : customColumns.some((entry) => entry.id === id) ? item.properties?.[id] : item[id]; return `<td><button type="button" class="project-document-cell" data-document-cell="${esc(item.id)}" data-document-field="${esc(id)}" title="Clique para selecionar; Enter para editar">${esc(raw || "—")}</button></td>`; }).join("")}</tr>`).join("") || `<tr><td colspan="${visible.length + 1}">Nenhum documento encontrado.</td></tr>`}</tbody></table></div>
      <dialog class="project-document-cell-dialog" data-document-cell-dialog><form method="dialog" data-document-cell-form><h2>Editar célula</h2><p data-document-cell-caption></p><div data-document-cell-control></div><footer><button value="cancel">Cancelar</button><button value="save" class="toolbar-primary">Confirmar alteração</button></footer></form></dialog>
    </section>`;
  };
  
  const bindBeforeProjectDocumentsV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeProjectDocumentsV1?.apply(this, args);
    const root = this.querySelector("[data-project-documents-page]");
    if (!root || root.dataset.documentsBound) return result;
    root.dataset.documentsBound = "true";
    root.querySelectorAll('[data-document-delete="doc-proj-exec"],[data-document-delete="doc-proj-licenses"],[data-document-delete="doc-presentation-v3"]').forEach((button) => button.remove());
    if (appStore.get().documentsEditId !== "new")
      root.querySelector('input[name="file"]')?.removeAttribute("required");
    const patch = (value) => appStore.set({ ...value, lastAction: "Atualizou documentos do loteamento" });
    root.querySelector("[data-document-new]")?.addEventListener("click", () => patch({ documentsEditId: "new" }));
    root.querySelector("[data-document-cancel]")?.addEventListener("click", () => patch({ documentsEditId: null }));
    root.querySelector("[data-document-query]")?.addEventListener("input", (event) => {
      const value = event.currentTarget.value;
      const cursor = event.currentTarget.selectionStart;
      patch({ documentsQuery: value });
      requestAnimationFrame(() => {
        const input = this.querySelector("[data-document-query]");
        input?.focus();
        input?.setSelectionRange(cursor, cursor);
      });
    });
    root.querySelector("[data-document-category]")?.addEventListener("change", (event) => patch({ documentsCategory: event.currentTarget.value }));
    root.querySelector("[data-document-file-filter]")?.addEventListener("change", (event) => patch({ documentsFileFilter: event.currentTarget.value }));
    root.querySelectorAll("[data-document-column-toggle]").forEach((input) => input.addEventListener("change", () => {
      const hidden = new Set(appStore.get().documentsHiddenColumns || []);
      if (input.checked) hidden.delete(input.dataset.documentColumnToggle);
      else hidden.add(input.dataset.documentColumnToggle);
      patch({ documentsHiddenColumns: [...hidden] });
    }));
    root.querySelector("[data-document-column-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const label = String(new FormData(event.currentTarget).get("label") || "").trim();
      if (!label) return;
      const prior = appStore.get().documentsCustomColumns || [];
      if (prior.some((entry) => entry.label.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"))) return notify("Essa propriedade já existe.", "warning");
      patch({ documentsCustomColumns: [...prior, { id: `custom-${host.crypto?.randomUUID?.() || Date.now().toString(36)}`, label }] });
    });
    root.querySelectorAll("[data-document-column-delete]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.documentColumnDelete;
      const entry = (appStore.get().documentsCustomColumns || []).find((column) => column.id === id);
      if (!entry || !confirm(`Excluir a coluna ${entry.label} e todos os valores desta propriedade?`)) return;
      appStore.update((current) => ({
        ...current,
        documentsCustomColumns: (current.documentsCustomColumns || []).filter((column) => column.id !== id),
        documentsHiddenColumns: (current.documentsHiddenColumns || []).filter((column) => column !== id),
        documentCatalog: (current.documentCatalog || []).map((item) => {
          const properties = { ...(item.properties || {}) };
          delete properties[id];
          return { ...item, properties, updatedAt: new Date().toISOString() };
        }),
        lastAction: `Excluiu a propriedade documental ${entry.label}`,
      }));
    }));
    const saveCell = (id, field, value) => {
      const custom = (appStore.get().documentsCustomColumns || []).some((entry) => entry.id === field);
      appStore.update((current) => ({
        ...current,
        documentCatalog: (current.documentCatalog || []).map((item) => item.id !== id ? item : {
          ...item,
          ...(custom ? { properties: { ...(item.properties || {}), [field]: value } } : { [field]: value }),
          updatedAt: new Date().toISOString(),
        }),
        lastAction: "Editou uma célula do acervo documental",
      }));
    };
    const cellDialog = root.querySelector("[data-document-cell-dialog]");
    const openCell = (button) => {
      const item = (appStore.get().documentCatalog || []).find((row) => row.id === button?.dataset.documentCell);
      if (!item) return;
      const field = button.dataset.documentField;
      if (["createdAt", "updatedAt", "fileName"].includes(field)) {
        if (field === "fileName" && item.fileName) root.querySelector("[data-document-selected-open]")?.click();
        return;
      }
      const label = [...ADMIN_DOCUMENT_COLUMNS_V2, ...(appStore.get().documentsCustomColumns || []).map((entry) => [entry.id, entry.label])].find(([id]) => id === field)?.[1] || field;
      cellDialog.dataset.id = item.id;
      cellDialog.dataset.field = field;
      cellDialog.querySelector("[data-document-cell-caption]").textContent = `${item.title} · ${label}`;
      const control = cellDialog.querySelector("[data-document-cell-control]");
      control.replaceChildren();
      const input = field === "category" ? document.createElement("select") : document.createElement(field === "description" ? "textarea" : "input");
      if (field === "category") ADMIN_DOCUMENT_CATEGORIES_V1.forEach((category) => input.add(new Option(category, category)));
      if (field === "documentDate") input.type = "date";
      input.name = "value";
      input.required = field === "title" || field === "category";
      input.value = field.startsWith("custom-") ? item.properties?.[field] || "" : item[field] || "";
      control.append(input);
      cellDialog.showModal();
    };
    let selection = null;
    const selectSheet = (type, id, field, target) => {
      root.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
      target.classList.add("is-selected");
      if (type === "cell") target.closest("td")?.classList.add("is-selected");
      selection = { type, id, field };
      const item = (appStore.get().documentCatalog || []).find((row) => row.id === id);
      const custom = (appStore.get().documentsCustomColumns || []).find((entry) => entry.id === field);
      const label = custom?.label || ADMIN_DOCUMENT_COLUMNS_V2.find(([key]) => key === field)?.[1] || field;
      root.querySelector("[data-document-selection-label]").textContent = type === "row" ? `Linha: ${item?.title || id}` : type === "column" ? `Coluna: ${label}` : `${item?.title || id} · ${label}`;
      const show = (name, visible) => { const button = root.querySelector(`[data-document-selected-${name}]`); if (button) button.hidden = !visible; return button; };
      const open = show("open", type === "cell" && field === "fileName" && Boolean(item?.fileName));
      if (open) open.dataset.documentOpen = id || "";
      const edit = show("edit", type === "row" || type === "cell");
      if (edit) edit.dataset.documentEdit = id || "";
      show("clear", type === "cell" && !["title", "category", "createdAt", "updatedAt", "fileName"].includes(field));
      const rowDelete = show("row-delete", type === "row" && item && !adminDocumentProtectedV2(item));
      if (rowDelete) rowDelete.dataset.documentDelete = id || "";
      const columnDelete = show("column-delete", type === "column");
      if (columnDelete) columnDelete.textContent = custom ? "Excluir coluna" : "Ocultar coluna";
    };
    root.querySelectorAll("[data-document-cell]").forEach((button) => {
      button.addEventListener("click", () => selectSheet("cell", button.dataset.documentCell, button.dataset.documentField, button));
      button.addEventListener("dblclick", () => openCell(button));
    });
    root.querySelectorAll("[data-document-row-header]").forEach((header) => header.addEventListener("click", () => selectSheet("row", header.dataset.documentRowHeader, "", header)));
    root.querySelectorAll("[data-document-column-header]").forEach((header) => header.addEventListener("click", () => selectSheet("column", "", header.dataset.documentColumnHeader, header)));
    const clearSelectedCell = () => {
      if (selection?.type !== "cell" || ["title", "category", "createdAt", "updatedAt", "fileName"].includes(selection.field)) return;
      const item = (appStore.get().documentCatalog || []).find((row) => row.id === selection.id);
      if (item && confirm(`Limpar esta célula de ${item.title}?`)) saveCell(item.id, selection.field, "");
    };
    root.querySelector("[data-document-selected-clear]")?.addEventListener("click", clearSelectedCell);
    root.querySelector("[data-document-selected-column-delete]")?.addEventListener("click", () => {
      if (selection?.type !== "column") return;
      const button = root.querySelector(`[data-document-column-delete="${selection.field}"]`);
      if (button) button.click();
      else {
        if (!confirm("Ocultar esta coluna da tabela? Os dados serão preservados.")) return;
        patch({ documentsHiddenColumns: [...new Set([...(appStore.get().documentsHiddenColumns || []), selection.field])] });
      }
    });
    root.querySelector(".project-documents-table")?.addEventListener("keydown", (event) => {
      if (!selection || !["Enter", "Delete", "Backspace", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"].includes(event.key)) return;
      if (event.key === "Escape") { selection = null; root.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected")); return; }
      if (event.key === "Enter") {
        if (selection.type === "cell") { event.preventDefault(); openCell(root.querySelector(`[data-document-cell="${CSS.escape(selection.id)}"][data-document-field="${CSS.escape(selection.field)}"]`)); }
        else if (selection.type === "row") root.querySelector("[data-document-selected-edit]")?.click();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (selection.type === "cell") clearSelectedCell();
        else if (selection.type === "row") root.querySelector("[data-document-selected-row-delete]:not([hidden])")?.click();
        else root.querySelector("[data-document-selected-column-delete]:not([hidden])")?.click();
        return;
      }
      if (selection.type !== "cell") return;
      event.preventDefault();
      const cells = [...root.querySelectorAll(".project-documents-table tbody tr")].map((row) => [...row.querySelectorAll("[data-document-cell]")]);
      const row = cells.findIndex((entries) => entries.some((button) => button.dataset.documentCell === selection.id));
      const column = cells[row]?.findIndex((button) => button.dataset.documentField === selection.field) ?? -1;
      const nextRow = Math.max(0, Math.min(cells.length - 1, row + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0)));
      const nextColumn = Math.max(0, Math.min((cells[nextRow]?.length || 1) - 1, column + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0)));
      const next = cells[nextRow]?.[nextColumn];
      if (next) { next.focus(); selectSheet("cell", next.dataset.documentCell, next.dataset.documentField, next); }
    });
    cellDialog?.querySelector("form")?.addEventListener("submit", (event) => {
      if (event.submitter?.value !== "save") return;
      const input = cellDialog.querySelector('[name="value"]');
      if (!input.reportValidity()) { event.preventDefault(); return; }
      const item = (appStore.get().documentCatalog || []).find((row) => row.id === cellDialog.dataset.id);
      if (!item || !confirm(`Salvar a alteração em ${item.title}?`)) { event.preventDefault(); return; }
      saveCell(item.id, cellDialog.dataset.field, input.value.trim());
    });
    root.querySelectorAll("[data-document-edit]").forEach((button) => button.addEventListener("click", () => patch({ documentsEditId: button.dataset.documentEdit })));
    root.querySelector("[data-document-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form);
      const file = form.elements.namedItem("file")?.files?.[0];
      const prior = (appStore.get().documentCatalog || []).find((item) => item.id === appStore.get().documentsEditId);
      if (!file && !prior) return;
      if (file && (file.size > 25 * 1024 * 1024 || !/\.(pdf|docx?|xlsx?|dwg|dxf|png|jpe?g|webp)$/i.test(file.name))) {
        notify("Selecione PDF, Office, CAD ou imagem de até 25 MB.", "error");
        return;
      }
      const id = prior?.id || `doc-${host.crypto?.randomUUID?.() || Date.now().toString(36)}`;
      const saveButton = form.querySelector('button[type="submit"]');
      saveButton.disabled = true;
      try {
        if (file) await adminDocumentBlobV1("put", id, file);
        const record = {
          id, title: String(values.get("title") || "").trim(),
          category: String(values.get("category") || "Outro"),
          code: String(values.get("code") || "").trim(),
          issuer: String(values.get("issuer") || "").trim(),
          documentDate: String(values.get("documentDate") || ""),
          description: String(values.get("description") || "").trim(),
          sourceMaterialId: String(values.get("sourceMaterialId") || ""),
          fileName: file?.name || prior?.fileName || "",
          fileSize: file?.size ?? prior?.fileSize ?? 0,
          fileType: file?.type || prior?.fileType || "",
          sourceUrl: file ? "" : prior?.sourceUrl || "",
          builtIn: Boolean(prior?.builtIn),
          properties: Object.fromEntries((appStore.get().documentsCustomColumns || []).map((entry) => [entry.id, String(values.get(`property:${entry.id}`) || "").trim()])),
          createdAt: prior?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        appStore.update((current) => ({
          ...current,
          documentCatalog: [...(current.documentCatalog || []).filter((item) => item.id !== id), record],
          documentsEditId: null,
          lastAction: `Salvou documento do loteamento: ${record.title}`,
        }));
        notify("Documento salvo no acervo local do loteamento.", "success");
      } catch (error) {
        saveButton.disabled = false;
        notify(error?.message || "Não foi possível salvar o documento.", "error");
      }
    });
    root.querySelectorAll("[data-document-open]").forEach((button) => button.addEventListener("click", async () => {
      const item = (appStore.get().documentCatalog || []).find((row) => row.id === button.dataset.documentOpen);
      if (!item) return;
      try {
        if (item.sourceUrl) {
          window.open(runtimeRouteV1(item.sourceUrl), "_blank", "noopener");
          return;
        }
        const file = await adminDocumentBlobV1("get", item.id);
        if (!file) throw new Error("Arquivo indisponível neste navegador.");
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        if (/^(application\/pdf|image\/)/.test(item.fileType || "")) link.target = "_blank";
        else link.download = item.fileName || "documento";
        link.rel = "noopener";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        notify(error?.message || "Não foi possível abrir o arquivo.", "error");
      }
    }));
    root.querySelectorAll("[data-document-delete]").forEach((button) => button.addEventListener("click", async () => {
      const item = (appStore.get().documentCatalog || []).find((row) => row.id === button.dataset.documentDelete);
      if (!item || ["doc-proj-exec", "doc-proj-licenses", "doc-presentation-v3"].includes(item.id) || item.builtIn || item.sourceMaterialId || !confirm(`Excluir permanentemente ${item.title} deste navegador?`)) return;
      try {
        await adminDocumentBlobV1("delete", item.id);
        appStore.update((current) => ({
          ...current,
          documentCatalog: (current.documentCatalog || []).filter((row) => row.id !== item.id),
          lastAction: `Excluiu documento do loteamento: ${item.title}`,
        }));
        notify("Documento removido do acervo local.", "success");
      } catch (error) {
        notify(error?.message || "Não foi possível excluir o documento.", "error");
      }
    }));
    return result;
  };
};
