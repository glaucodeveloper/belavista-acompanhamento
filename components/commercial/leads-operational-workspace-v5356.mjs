export const createLeadsOperationalWorkspaceV5356 = ({
  appStore,
  demoData,
  esc,
  ico,
  runtimeRouteV1,
}) => {
return function leadsOperationalWorkspaceV5356() {
    const state = appStore.get();
    const reservations = Array.isArray(state.publicReservations)
      ? state.publicReservations
      : [];
    const siteLeads = Array.isArray(state.publicLeads) ? state.publicLeads : [];
    const all = [
      ...reservations.map((item) => ({
        id: item.id,
        name: item.client || "Cliente em análise",
        lot: item.lot || "A definir",
        status: item.status || "Reserva em análise",
        source: "Reserva",
        note: item.notes || "Documentos e continuidade comercial.",
      })),
      ...siteLeads.map((item) => ({
        id: item.id,
        name: item.name || "Novo interessado",
        lot: item.lot || "A definir",
        status: item.status || "Novo",
        source: "Site",
        note:
          item.conversation ||
          item.notes ||
          "Intenção recebida pela página pública.",
      })),
    ];
    if (!all.length)
      all.push(
        ...(demoData.leads || []).slice(0, 4).map((item, index) => ({
          id: `DEMO-${index + 1}`,
          name: item.name,
          lot: item.lot,
          status: item.status,
          source: "Demonstração",
          note: `Objetivo: ${item.objective}`,
        })),
      );
    const selected =
      all[
        Math.max(0, Math.min(all.length - 1, Number(state.selectedLead) || 0))
      ] || all[0];
    const rows = all
      .map(
        (item, index) =>
          `<button type="button" class="lead-system-row-v5356 ${item === selected ? "selected" : ""}" data-v5356-lead-index="${index}"><span><b>${esc(item.name)}</b><small>${esc(item.lot)} · ${esc(item.source)}</small></span><em>${esc(item.status)}</em></button>`,
      )
      .join("");

    return `<section class="leads-internal-v5356">
      <header class="workspace-head-v5356"><div><span>LEADS · OPERAÇÃO COMERCIAL</span><h1>Aliança Park</h1><p>Copy comercial, página pública e janelas operacionais no mesmo workspace interno.</p></div><button type="button" data-v5356-open-public>${ico("external-link")} Abrir /leads</button></header>
      <section class="lead-copy-v5356"><span>LANÇAMENTO · ALIANÇA PARK</span><h2>Um loteamento para <em>morar, investir e crescer</em></h2><p>Escolha seu lote entendendo o lugar inteiro. Compare implantação, posição e interesse comercial antes de avançar para a continuidade com o corretor.</p><div><b>Mapa + CRM</b><b>Perfil de compra</b><b>Retorno comercial</b></div></section>
      <div class="leads-internal-grid-v5356">
        <section class="public-leads-frame-window-v5356"><header><span>PÁGINA PÚBLICA · /leads</span><small>Fonte preservada; nenhuma alteração no frontend público.</small></header><iframe src="${runtimeRouteV1("/leads", "embedded-admin=v5356")}" title="Página pública Aliança Park"></iframe></section>
        <aside class="lead-system-windows-v5356">
          <section class="lead-window-v5356 lead-suggestions-v5356"><header><span>SUGESTÕES DE AÇÃO</span><b>Próximos movimentos</b></header><button type="button" data-v5356-lead-action="reply">${ico("message-circle")} Responder lead prioritário</button><button type="button" data-v5356-lead-action="reservation">${ico("file-check-2")} Revisar reserva pendente</button><button type="button" data-view="map">${ico("map-pinned")} Relacionar lote no mapa</button><button type="button" data-v5356-inference-test>${ico("sparkles")} Testar inferência comercial</button><small data-v5356-inference-status>Dry-run sem commit.</small></section>
          <section class="lead-window-v5356"><header><span>LEADS NO SISTEMA</span><b>${all.length} registros</b></header><div class="lead-system-list-v5356">${rows}</div></section>
          <section class="lead-window-v5356 lead-selected-v5356"><header><span>LEAD SELECIONADO</span><b>${esc(selected?.name || "—")}</b></header><dl><div><dt>Lote</dt><dd>${esc(selected?.lot || "—")}</dd></div><div><dt>Status</dt><dd>${esc(selected?.status || "—")}</dd></div><div><dt>Origem</dt><dd>${esc(selected?.source || "—")}</dd></div></dl><p>${esc(selected?.note || "Sem observação registrada.")}</p><footer><button type="button" data-v5356-lead-action="reply">Abrir atendimento</button><button type="button" data-view="map">Abrir mapa</button></footer></section>
        </aside>
      </div>
    </section>`;
  };
};

export const bindLeadsOperationalWorkspaceV5356 = (
  root,
  {
    appStore,
    runtimeRouteV1,
    apiFetch,
    notify,
    windowRef = globalThis.window,
  } = {},
) => {
    root.querySelectorAll("[data-v5356-lead-index]").forEach((button) =>
      button.addEventListener("click", () => {
        appStore.set({
          selectedLead: Number(button.dataset.v5356LeadIndex) || 0,
          lastAction: "Selecionou lead na janela operacional",
        });
      }),
    );
    root.querySelector("[data-v5356-open-public]")?.addEventListener(
      "click",
      () => windowRef.open(runtimeRouteV1("/leads"), "_blank", "noopener"),
    );
    root.querySelectorAll("[data-v5356-lead-action]").forEach((button) =>
      button.addEventListener("click", () => {
        const action = button.dataset.v5356LeadAction;
        if (action === "reservation")
          appStore.set({
            lastAction: "Revisar reserva pendente na fila comercial",
          });
        else
          appStore.set({ lastAction: "Abrir atendimento do lead selecionado" });
        root.querySelector(".lead-selected-v5356")?.scrollIntoView?.({
          block: "nearest",
          behavior: "smooth",
        });
      }),
    );
    root.querySelectorAll("[data-v5356-inference-test]").forEach((button) =>
      button.addEventListener("click", async () => {
        const status = root.querySelector("[data-v5356-inference-status]");
        button.disabled = true;
        if (status)
          status.textContent = "Executando dry-run NVIDIA / operational-loop…";
        try {
          const response = await apiFetch("/api/operational-loop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trigger: "admin.ui.inference-test-v5356",
              dryRun: true,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(payload.error || `HTTP ${response.status}`);
          const trace =
            payload.metaTrace ||
            payload.metadataTrace ||
            payload.metaUsage ||
            payload.fieldsUsed ||
            payload.trace ||
            null;
          if (status)
            status.textContent = `Inferência respondeu · dry-run OK${trace ? " · metadados recebidos" : ""}`;
          appStore.set({
            lastInferenceTestV5356: {
              ok: true,
              at: new Date().toISOString(),
              trace,
            },
            lastAction: "Teste de inferência dry-run concluído",
          });
          notify("Inferência operacional respondeu em dry-run.", "success");
        } catch (error) {
          if (status) status.textContent = `Falha no teste: ${error.message}`;
          appStore.set({
            lastInferenceTestV5356: {
              ok: false,
              at: new Date().toISOString(),
              error: error.message,
            },
            lastAction: "Teste de inferência falhou",
          });
          notify("Teste de inferência indisponível.", "warning");
        } finally {
          button.disabled = false;
        }
      }),
    );


};

