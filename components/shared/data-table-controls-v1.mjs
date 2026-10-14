/** Installs search, category, paging, and CSV controls on existing data tables. */
export const installDataTableControlsV1 = (
  ViewLayer,
  {
    document: documentRef = globalThis.document,
    URL: URLCtor = globalThis.URL,
    Blob: BlobCtor = globalThis.Blob,
    setTimeout: setTimeoutFn = globalThis.setTimeout,
  } = {},
) => {
  if (!ViewLayer?.prototype)
    throw new TypeError("Data-table controls require the application view layer.");

  const renderBeforeDataTablesV1 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderBeforeDataTablesV1.apply(this, args);
    if (!documentRef.getElementById("data-table-controls-v1-style")) {
      const style = documentRef.createElement("style");
      style.id = "data-table-controls-v1-style";
      style.textContent = `.data-table-controls-v1{display:flex;flex-wrap:wrap;align-items:end;gap:10px;padding:14px 16px;background:#20262a;border:1px solid #3a4449;border-radius:12px;margin:12px 0}.data-table-controls-v1 label{display:grid;gap:5px;color:#b7c3c8;font-size:11px}.data-table-controls-v1 input,.data-table-controls-v1 select{min-width:140px;max-width:220px;background:#141a1d;color:#edf3f4;border:1px solid #526068;border-radius:7px;padding:8px}.data-table-controls-v1 button{background:#25323a;color:#e8f1f4;border:1px solid #526068;border-radius:7px;padding:8px 11px;cursor:pointer}.data-table-footer-v1{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 16px;color:#b7c3c8;font-size:12px}.data-table-footer-v1 button{background:#25323a;color:#e8f1f4;border:1px solid #526068;border-radius:7px;padding:7px 11px;cursor:pointer}.data-table-footer-v1 button:disabled{opacity:.4;cursor:default}@media(max-width:650px){.data-table-controls-v1{display:grid;grid-template-columns:1fr 1fr}.data-table-controls-v1 label:first-child{grid-column:1/-1}.data-table-controls-v1 input,.data-table-controls-v1 select{width:100%;max-width:none;min-width:0}}`;
      documentRef.head.append(style);
    }
    const wire = (root, rows, options = {}) => {
      if (!root || !rows.length || root.querySelector("[data-table-controls-v1]")) return;
      const toolbar = documentRef.createElement("div");
      toolbar.className = "data-table-controls-v1";
      toolbar.dataset.tableControlsV1 = options.kind;
      toolbar.innerHTML = `<label>Pesquisar<input type="search" placeholder="Buscar na lista" data-table-search></label><label>Categoria<select data-table-category><option value="">Todas</option></select></label><label>Linhas<select data-table-size><option>10</option><option selected>20</option><option>50</option><option value="all">Todas</option></select></label><button type="button" data-table-csv>Exportar CSV</button>`;
      const footer = documentRef.createElement("footer");
      footer.className = "data-table-footer-v1";
      footer.innerHTML = `<span data-table-count></span><span><button type="button" data-table-prev>Anterior</button> <span data-table-page></span> <button type="button" data-table-next>Próxima</button></span>`;
      const host = options.host || root;
      const tableWrap = options.tableWrap || rows[0].closest(".control-table-wrap, .contracts-table-wrap-v2");
      if (tableWrap) tableWrap.before(toolbar);
      else rows[0].before(toolbar);
      if (tableWrap) tableWrap.after(footer);
      else rows[rows.length - 1].after(footer);
      const category = toolbar.querySelector("[data-table-category]");
      const categories = [...new Set(rows.map(options.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      categories.forEach((value) => { const option = documentRef.createElement("option"); option.value = value; option.textContent = value; category.append(option); });
      let page = 0;
      const getMatching = () => {
        const query = toolbar.querySelector("[data-table-search]").value.trim().toLocaleLowerCase("pt-BR");
        return rows.filter((row) => (!query || row.textContent.toLocaleLowerCase("pt-BR").includes(query)) && (!category.value || options.category(row) === category.value));
      };
      const update = () => {
        const matching = getMatching();
        const sizeValue = toolbar.querySelector("[data-table-size]").value;
        const size = sizeValue === "all" ? Math.max(matching.length, 1) : Number(sizeValue);
        const pages = Math.max(1, Math.ceil(matching.length / size));
        page = Math.min(page, pages - 1);
        const visible = new Set(matching.slice(page * size, (page + 1) * size));
        rows.forEach((row) => { row.hidden = !visible.has(row); });
        footer.querySelector("[data-table-count]").textContent = `${matching.length ? page * size + 1 : 0}–${Math.min((page + 1) * size, matching.length)} de ${matching.length} registros`;
        footer.querySelector("[data-table-page]").textContent = `${page + 1} / ${pages}`;
        footer.querySelector("[data-table-prev]").disabled = page === 0;
        footer.querySelector("[data-table-next]").disabled = page >= pages - 1;
      };
      toolbar.querySelector("[data-table-search]").addEventListener("input", () => { page = 0; update(); });
      category.addEventListener("change", () => { page = 0; update(); });
      toolbar.querySelector("[data-table-size]").addEventListener("change", () => { page = 0; update(); });
      footer.querySelector("[data-table-prev]").addEventListener("click", () => { page--; update(); });
      footer.querySelector("[data-table-next]").addEventListener("click", () => { page++; update(); });
      toolbar.querySelector("[data-table-csv]").addEventListener("click", () => {
        const table = rows[0].closest("table");
        const headings = table ? [...table.querySelectorAll("thead th")].map((cell) => cell.textContent.trim()) : ["Registro", "Detalhes", "Status"];
        const values = getMatching().map((row) => row.matches("tr")
          ? [...row.querySelectorAll("td")].map((cell) => cell.querySelector("input, select")?.value ?? cell.textContent.trim())
          : [row.querySelector("span")?.textContent.trim() || "", row.querySelector("b")?.textContent.trim() || "", row.querySelector("em")?.textContent.trim() || ""]);
        const matrix = [headings, ...values];
        const csv = "\uFEFF" + matrix.map((record) => record.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(";")).join("\r\n");
        const url = URLCtor.createObjectURL(new BlobCtor([csv], { type: "text/csv;charset=utf-8" }));
        const link = documentRef.createElement("a"); link.href = url; link.download = `${options.kind}-registros.csv`; link.click();
        setTimeoutFn(() => URLCtor.revokeObjectURL(url), 1000);
      });
      update();
    };
    const contracts = this.querySelector(".contracts-page-v2");
    wire(contracts, [...(contracts?.querySelectorAll("[data-contract-row]") || [])], { kind: "contratos", category: (row) => row.cells[2]?.querySelector(".deal-status")?.textContent.trim() || "" });
    const materials = [...this.querySelectorAll("[data-control-material-row]")];
    wire(materials[0]?.closest(".control-center-section"), materials, { kind: "materiais", category: (row) => row.querySelector('[data-control-material-field="status"]')?.value || "" });
    const records = [...this.querySelectorAll(".records-stage-history-v1 .records-history-row-v1")];
    wire(this.querySelector(".records-stage-history-v1"), records, { kind: "registros", category: (row) => row.querySelector("em")?.textContent.trim() || "" });
    return result;
  };
};
