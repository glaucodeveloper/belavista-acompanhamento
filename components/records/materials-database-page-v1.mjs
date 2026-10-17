import { apiFetch } from "../../api-client.mjs?v=github-pat-gateway-v1";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const quantity = (value) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export function installMaterialsDatabasePageV1(ViewLayer, {
  appStore,
  controlCenterMaterialRowsV1,
  executionModel,
} = {}) {
  ViewLayer.prototype.materials = function () {
    const rows = this._materialsDatabaseRowsV1 || [], editing = this._materialsDatabaseEditingV1 || null,
      loading = this._materialsDatabaseLoadingV1, error = this._materialsDatabaseErrorV1 || "",
      stages = executionModel?.stages || [],
      stageRows = typeof controlCenterMaterialRowsV1 === "function" && typeof appStore?.get === "function"
        ? controlCenterMaterialRowsV1(appStore.get())
        : [],
      populatedStages = stages.map((stage) => ({
        stage,
        items: stageRows.filter((item) => String(item.stageKey || "") === String(stage.key)),
      })),
      requestedTab = this._materialsStageTabV1,
      initialStage = populatedStages.find(({ items }) => items.length)?.stage.key,
      activeTab = populatedStages.some(({ stage }) => String(stage.key) === String(requestedTab)) || requestedTab === "inventory"
        ? requestedTab
        : initialStage || "inventory",
      activeStage = populatedStages.find(({ stage }) => String(stage.key) === String(activeTab)),
      stageRowsMarkup = activeStage?.items.map((item) => `<tr>
        <td><strong>${escapeHtml(item.name || item.description || "Material")}</strong><small>${escapeHtml(item.id || "")}</small></td>
        <td>${escapeHtml(item.activityName || "—")}</td><td>${item.quantity == null ? "—" : quantity(item.quantity)}</td>
        <td>${escapeHtml(item.unit || "—")}</td><td>${escapeHtml(item.status || "—")}</td>
        <td>${escapeHtml(item.scope || "—")}</td></tr>`).join("") || "";
    const rowMarkup = rows.map((item) => `<tr data-material-row="${escapeHtml(item.id)}">
      <td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}</small></td>
      <td>${escapeHtml(item.unit || "un")}</td><td>${quantity(item.plannedQuantity)}</td>
      <td>${quantity(item.receivedQuantity)}</td><td>${quantity(item.usedQuantity)}</td>
      <td>${escapeHtml(item.status || "")}</td><td class="atlas-material-actions">
        <button type="button" data-material-edit="${escapeHtml(item.id)}">Editar</button>
        <button type="button" data-material-delete="${escapeHtml(item.id)}">Excluir</button></td></tr>`).join("");
    const values = editing || { name: "", unit: "un", plannedQuantity: 0, receivedQuantity: 0, usedQuantity: 0, status: "Planejado" };
    return `<section class="atlas-materials-page">
      <header class="atlas-page-heading"><div><span class="atlas-eyebrow">OPERAÇÃO · ESTOQUE</span><h1>Materiais</h1>
      <p>Materiais do empreendimento organizados por etapa, com o cadastro persistido no banco operacional.</p></div>
      <div class="atlas-page-actions"><button type="button" data-material-refresh>Atualizar</button><button type="button" class="primary" data-material-new>Novo material</button></div></header>
      ${error ? `<p class="atlas-material-error" role="alert">${escapeHtml(error)}</p>` : ""}
      <nav class="atlas-stage-material-tabs" role="tablist" aria-label="Materiais por etapa">
        ${populatedStages.map(({ stage, items }) => `<button type="button" role="tab" aria-selected="${String(stage.key) === String(activeTab)}" class="${String(stage.key) === String(activeTab) ? "active" : ""}" data-material-stage-tab="${escapeHtml(stage.key)}"><span>${escapeHtml(stage.name)}</span><small>${items.length}</small></button>`).join("")}
        <button type="button" role="tab" aria-selected="${activeTab === "inventory"}" class="${activeTab === "inventory" ? "active" : ""}" data-material-stage-tab="inventory"><span>Estoque geral</span><small>${rows.length}</small></button>
      </nav>
      ${activeStage ? `<section class="atlas-material-table-card atlas-stage-material-panel" role="tabpanel" aria-label="Materiais da etapa ${escapeHtml(activeStage.stage.name)}">
        <header><div><h2>${escapeHtml(activeStage.stage.name)}</h2><p>${activeStage.items.length} material(is) associado(s) a esta etapa</p></div></header>
        <div class="atlas-material-table-scroll"><table><thead><tr><th>Material</th><th>Atividade</th><th>Quantidade</th><th>Unidade</th><th>Status</th><th>Escopo</th></tr></thead><tbody>
          ${stageRowsMarkup || `<tr><td colspan="6" class="atlas-material-empty">Nenhum material associado a esta etapa.</td></tr>`}
        </tbody></table></div>
      </section>` : ""}
      ${activeTab === "inventory" || !activeStage ? `<div data-material-inventory-panel>
      <section class="atlas-material-editor ${editing || this._materialsDatabaseNewV1 ? "is-open" : ""}">
        <h2>${editing ? "Editar material" : "Cadastrar material"}</h2>
        <form data-material-form data-material-id="${escapeHtml(editing?.id || "")}">
          <label>Material<input name="name" required maxlength="160" value="${escapeHtml(values.name)}"></label>
          <label>Unidade<input name="unit" maxlength="40" value="${escapeHtml(values.unit)}"></label>
          <label>Quantidade prevista<input name="plannedQuantity" type="number" min="0" step="any" required value="${escapeHtml(values.plannedQuantity)}"></label>
          <label>Quantidade recebida<input name="receivedQuantity" type="number" min="0" step="any" required value="${escapeHtml(values.receivedQuantity)}"></label>
          <label>Quantidade usada<input name="usedQuantity" type="number" min="0" step="any" required value="${escapeHtml(values.usedQuantity)}"></label>
          <label>Status<input name="status" maxlength="60" value="${escapeHtml(values.status)}"></label>
          <div class="atlas-material-form-actions"><button class="primary" type="submit">${editing ? "Salvar alterações" : "Cadastrar"}</button><button type="button" data-material-cancel>Cancelar</button></div>
        </form>
      </section>
      <section class="atlas-material-table-card"><div class="atlas-material-list-heading"><div><h2>Cadastro de materiais</h2><p>${rows.length} registro${rows.length === 1 ? "" : "s"} persistido${rows.length === 1 ? "" : "s"}</p></div>
        <label>Pesquisar<input type="search" data-material-search placeholder="Nome, unidade ou status"></label></div>
        <div class="atlas-material-table-scroll"><table><thead><tr><th>Material</th><th>Unidade</th><th>Previsto</th><th>Recebido</th><th>Usado</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${rowMarkup || `<tr><td colspan="7" class="atlas-material-empty">${loading ? "Carregando materiais do banco…" : "Nenhum material cadastrado no banco operacional."}</td></tr>`}</tbody></table></div>
      </section>
      </div>` : ""}
    </section>`;
  };

  const load = async (view) => {
    if (view._materialsDatabaseLoadingV1) return;
    view._materialsDatabaseLoadingV1 = true;
    view._materialsDatabaseErrorV1 = "";
    try {
      const response = await apiFetch("/api/materials");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Não foi possível carregar materiais (HTTP ${response.status}).`);
      view._materialsDatabaseRowsV1 = Array.isArray(payload.materials) ? payload.materials : [];
    } catch (error) {
      view._materialsDatabaseErrorV1 = error.message || "Falha ao carregar os materiais do banco operacional.";
    } finally {
      view._materialsDatabaseLoadingV1 = false;
      if (view.isConnected && view.dataset.view === "materials") view.render();
    }
  };

  const bind = (page) => {
    const setEditor = (material, isNew = false) => {
      page._materialsStageTabV1 = "inventory";
      page._materialsDatabaseEditingV1 = material;
      page._materialsDatabaseNewV1 = isNew;
      page.render();
    };
    const newButton = page.querySelector("[data-material-new]");
    if (newButton) newButton.onclick = () => setEditor(null, true);
    const cancelButton = page.querySelector("[data-material-cancel]");
    if (cancelButton) cancelButton.onclick = () => setEditor(null, false);
    const refreshButton = page.querySelector("[data-material-refresh]");
    if (refreshButton) refreshButton.onclick = () => { page._materialsDatabaseLoadedV1 = false; void load(page); };
    page.querySelectorAll("[data-material-edit]").forEach((button) => {
      button.onclick = () => setEditor(page._materialsDatabaseRowsV1.find((item) => item.id === button.dataset.materialEdit) || null);
    });
    page.querySelectorAll("[data-material-delete]").forEach((button) => {
      button.onclick = async () => {
        const item = page._materialsDatabaseRowsV1.find((entry) => entry.id === button.dataset.materialDelete);
        if (!item || !globalThis.confirm(`Excluir o material “${item.name}” do banco operacional?`)) return;
        try {
          const response = await apiFetch(`/api/materials/${encodeURIComponent(item.id)}`, { method: "DELETE" });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `Não foi possível excluir (HTTP ${response.status}).`);
          page._materialsDatabaseRowsV1 = payload.materials || [];
          page.render();
        } catch (error) {
          page._materialsDatabaseErrorV1 = error.message || "Não foi possível excluir o material.";
          page.render();
        }
      };
    });
    const form = page.querySelector("[data-material-form]");
    if (form) form.onsubmit = async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries()), id = form.dataset.materialId;
      for (const key of ["plannedQuantity", "receivedQuantity", "usedQuantity"]) data[key] = Number(data[key]);
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const response = await apiFetch(id ? `/api/materials/${encodeURIComponent(id)}` : "/api/materials", {
          method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Não foi possível salvar (HTTP ${response.status}).`);
        page._materialsDatabaseRowsV1 = payload.materials || [];
        page._materialsDatabaseEditingV1 = null;
        page._materialsDatabaseNewV1 = false;
        page._materialsDatabaseErrorV1 = "";
        page.render();
      } catch (error) {
        page._materialsDatabaseErrorV1 = error.message || "Não foi possível salvar o material.";
        page.render();
      }
    };
    const search = page.querySelector("[data-material-search]");
    if (search) search.oninput = () => {
      const term = search.value.trim().toLocaleLowerCase("pt-BR");
      page.querySelectorAll("[data-material-row]").forEach((row) => { row.hidden = !row.textContent.toLocaleLowerCase("pt-BR").includes(term); });
    };
    page.querySelectorAll("[data-material-stage-tab]").forEach((button) => {
      button.onclick = () => {
        page._materialsStageTabV1 = button.dataset.materialStageTab;
        page.render();
      };
    });
  };
  const renderBase = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderBase.apply(this, args);
    if (this.dataset.view !== "materials") return result;
    if (!this._materialsDatabaseLoadedV1) {
      this._materialsDatabaseLoadedV1 = true;
      void load(this);
    }
    bind(this);
    return result;
  };
}
