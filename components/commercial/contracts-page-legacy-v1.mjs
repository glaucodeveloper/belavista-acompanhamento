export const contractStatusClassV1 = (status) =>
  String(status || "")
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

/** Complete contracts and proposal page behavior, installed on the existing ViewLayer. */
export const installContractsPageV1 = (ViewLayer, dependencies = {}) => {
  const {
    appStore, normalizeOperationalRole, commissionProfiles, commissionDeals,
    esc, ico, notify, commercialScopeV1, brlToNumber, formatBRL,
    readProposalImageAsDataUrl, PROPOSAL_VISION_PROMPT,
    parseProposalVisionPayload, saveOperationalProposal,
    fetch: fetcher, document: documentRef,
    HTMLSelectElement: HTMLSelectElementCtor, Option: OptionCtor,
    Event: EventCtor, FormData: FormDataCtor, Blob: BlobCtor,
    URL: URLRef, setTimeout: schedule,
  } = dependencies;
  for (const [name, value] of Object.entries({ appStore, normalizeOperationalRole, commissionProfiles, commissionDeals, esc, ico, notify, commercialScopeV1, brlToNumber, formatBRL, readProposalImageAsDataUrl, PROPOSAL_VISION_PROMPT, parseProposalVisionPayload, saveOperationalProposal, fetcher, documentRef, HTMLSelectElementCtor, OptionCtor, EventCtor, FormDataCtor, BlobCtor, URLRef, schedule }))
    if (value == null) throw new TypeError(`Contracts page requires injected dependency ${name}.`);

const viewLayerRenderAccessV1 = ViewLayer.prototype.render;
ViewLayer.prototype.render = function (...args) {
  const state = appStore.get(),
    // A sessão de demonstração e sessões legadas podem não persistir o papel.
    // A aplicação trata esse caso como proprietário em toda a navegação; usar
    // a mesma regra aqui evita que a página Corretores seja desviada para Mapa.
    role = normalizeOperationalRole(state.currentActor?.role || "owner"),
    brokerOnly = ["sales", "commercial", "broker", "corretor"].includes(role),
    privileged = ["owner", "admin", "developer"].includes(role);
  if (brokerOnly && !["map", "contracts", "proposals"].includes(state.view)) {
    appStore.set({
      view: "map",
      activityDedicated: false,
      selectedActivity: null,
      lastAction: "Acesso do corretor limitado ao dashboard e à carteira",
    });
    return;
  }
  if (!brokerOnly && state.view === "contracts" && !privileged) {
    appStore.set({
      view: "map",
      proposalFormOpen: false,
      selectedCommissionProfile: null,
      selectedCommissionContract: null,
      selectedCommissionProposal: null,
      lastAction: "Carteira comercial restrita ao corretor",
    });
    return;
  }
  if (!privileged && ["commissions", "brokers"].includes(state.view)) {
    appStore.set({
      view: "contracts",
      selectedCommissionProfile: null,
      selectedCommissionContract: null,
      selectedCommissionProposal: null,
      lastAction: "Acesso comercial redirecionado para minha carteira",
    });
    return;
  }
  const result = viewLayerRenderAccessV1.apply(this, args);
  if (this.dataset.view === "contracts") {
    const head = this.querySelector(".activity-header>div:first-child");
    if (head) {
      head.querySelector("span").textContent = "Contratos";
      head.querySelector("small").textContent =
        "Recibos, valores e confirmação de compra da carteira autenticada";
    }
  }
  return result;
};



const viewLayerBindMyContractsV1 = ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function (...args) {
  const result = viewLayerBindMyContractsV1.apply(this, args);
  const page = this.querySelector(".my-contracts-page-v1");
  if (page && !page.querySelector("[data-proposal-new]")) {
    page
      .querySelector(".my-contracts-head-v1")
      ?.insertAdjacentHTML(
        "beforeend",
        `<button type="button" class="toolbar-primary" data-proposal-new>${ico("plus")} Nova proposta</button>`,
      );
  }
  this.querySelector("[data-proposal-new]")?.addEventListener("click", () =>
    appStore.set({
      view: "contracts",
      proposalFormOpen: true,
      selectedCommissionProposal: null,
      selectedCommissionContract: null,
      lastAction: "Abriu formulário de nova proposta",
    }),
  );
  this.querySelector("[data-proposal-form-back]")?.addEventListener(
    "click",
    () =>
      appStore.set({
        view: appStore.get().view === "proposals" ? "commissions" : "contracts",
        proposalFormOpen: false,
        lastAction: "Voltou para a área comercial",
      }),
  );
  const form = this.querySelector("[data-my-proposal-form]");
  if (form && !form.querySelector("[data-proposal-inference-status]")) {
    form
      .querySelector("[data-proposal-attachments]")
      ?.insertAdjacentHTML(
        "afterend",
        `<div class="my-proposal-inference-v1"><span data-proposal-inference-status>Selecione uma imagem para sugerir cliente, lote, valor e condição pela NVIDIA.</span><button type="button" data-proposal-infer hidden>Reanalisar pela NVIDIA</button></div>`,
      );
  }
  const inferProposalAttachment = async (file) => {
    if (!form || !file) return;
    const status = form.querySelector("[data-proposal-inference-status]");
    const button = form.querySelector("[data-proposal-infer]");
    const requestId = `${Date.now()}-${Math.random()}`;
    form.dataset.proposalInferenceRequest = requestId;
    if (status) status.textContent = "Analisando o documento pela NVIDIA…";
    if (button) button.disabled = true;
    try {
      const dataUrl = await readProposalImageAsDataUrl(file);
      const response = await fetcher("/api/ai/vision-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: PROPOSAL_VISION_PROMPT,
          view: "contracts",
          context: {
            purpose: "proposta de reserva de lote",
            fields: ["client", "lot", "value", "payment"],
          },
          attachment: { name: file.name, type: file.type, dataUrl },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.error || `Falha na inferência (${response.status})`,
        );
      }
      const draft = parseProposalVisionPayload(payload);
      if (!draft)
        throw new Error("A NVIDIA não retornou campos reconhecíveis.");
      if (form.dataset.proposalInferenceRequest !== requestId) return;
      [
        "seller",
        "lot",
        "quadra",
        "lotArea",
        "value",
        "client",
        "payment",
      ].forEach((name) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (!input || !draft[name]) return;
        if (
          name === "payment" &&
          input instanceof HTMLSelectElementCtor &&
          ![...input.options].some((option) => option.value === draft[name])
        ) {
          input.append(new OptionCtor(`Inferido: ${draft[name]}`, draft[name]));
        }
        input.value = draft[name];
        input.dispatchEvent(new EventCtor("input", { bubbles: true }));
      });
      form._proposalInference = {
        provider: payload.provider || "nvidia",
        model: payload.model || "",
        sourceFile: file.name,
        confidence: draft.confidence,
        extracted: draft,
        extractedAt: new Date().toISOString(),
      };
      const confidence =
        draft.confidence == null
          ? ""
          : ` Confiança estimada: ${Math.round(draft.confidence * 100)}%.`;
      if (status)
        status.textContent = `Sugestões aplicadas. Revise os campos antes de salvar.${confidence}`;
    } catch (error) {
      if (form.dataset.proposalInferenceRequest !== requestId) return;
      if (status)
        status.textContent = `Não foi possível inferir este anexo: ${error.message}`;
      console.info("Inferência visual da proposta indisponível.", error);
    } finally {
      if (form.dataset.proposalInferenceRequest === requestId && button)
        button.disabled = false;
    }
  };
  form
    ?.querySelector('[name="attachments"]')
    ?.addEventListener("change", (event) => {
      const target = form.querySelector("[data-proposal-attachments]");
      const files = [...(event.target.files || [])];
      target.textContent = files.length
        ? files
            .map(
              (file) =>
                `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`,
            )
            .join(" | ")
        : "Nenhum anexo selecionado.";
      const visualFile = files.find((file) =>
        /^image\/(?:png|jpeg|webp)$/i.test(file.type),
      );
      const inferButton = form.querySelector("[data-proposal-infer]");
      if (inferButton) inferButton.hidden = !visualFile;
      if (visualFile) void inferProposalAttachment(visualFile);
    });
  form
    ?.querySelector("[data-proposal-infer]")
    ?.addEventListener("click", () => {
      const file = [
        ...(form.querySelector('[name="attachments"]')?.files || []),
      ].find((item) => /^image\/(?:png|jpeg|webp)$/i.test(item.type));
      if (file) void inferProposalAttachment(file);
    });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormDataCtor(form).entries()),
      scope = commercialScopeV1(),
      profile =
        scope.profiles.find((item) => item.id === values.profile) ||
        scope.profile,
      files = [...(form.querySelector('[name="attachments"]')?.files || [])];
    if (!profile) {
      form.querySelector("[data-proposal-form-status]").textContent =
        "Associe este login a um perfil comercial antes de criar propostas.";
      return;
    }
    if (files.some((file) => file.size > 12 * 1024 * 1024)) {
      form.querySelector("[data-proposal-form-status]").textContent =
        "Cada anexo deve ter no máximo 12 MB.";
      return;
    }
    const value = brlToNumber(values.value),
      rate = Number(values.rate) || 0,
      editing = appStore.get().contractEditing,
      id = editing?.id || `PROP-LOCAL-${Date.now().toString().slice(-6)}`,
      entry = {
        id,
        profile: profile.id,
        seller:
          values.seller || "Aliança Park Desenvolvimento Imobiliário Ltda.",
        sellerDocument: values.sellerDocument || "",
        lot: String(values.lot || "").toUpperCase(),
        lotArea: values.lotArea || "",
        quadra: values.quadra,
        client: values.client,
        cpf: values.cpf || "Não informado",
        email: values.email || "",
        phone: values.phone || "",
        purpose: values.purpose || "Moradia",
        status: editing?.status || "Proposta",
        value: formatBRL(value),
        commission: formatBRL((value * rate) / 100),
        rate: `${rate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`,
        date: new Date().toLocaleDateString("pt-BR"),
        payment: values.payment,
        stage: "Proposta cadastrada",
        attachments: files.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        })),
        inference: form._proposalInference || null,
        createdBy: appStore.get().currentActor?.uid || "",
      };
    const existingEntries = (appStore.get().commissionEntries || []).filter(
      (item) => item.id !== id,
    );
    appStore.set({
      commissionEntries: [entry, ...existingEntries],
      proposalFormOpen: false,
      contractEditing: null,
      lastAction: `Salvou proposta ${id}`,
    });
    notify("Proposta salva na carteira individual.", "success");
  });
  form?.addEventListener("submit", async (event) => {
    const values = Object.fromEntries(
        new FormDataCtor(event.currentTarget).entries(),
      ),
      scope = commercialScopeV1(),
      profile =
        scope.profiles.find((item) => item.id === values.profile) ||
        scope.profile,
      files = [
        ...(event.currentTarget.querySelector('[name="attachments"]')?.files ||
          []),
      ];
    if (!profile) return;
    try {
      await saveOperationalProposal(
        {
          ...values,
          uid: appStore.get().currentActor?.uid || "",
          inference: event.currentTarget._proposalInference || null,
        },
        files,
        appStore.get().currentActor || {},
      );
    } catch (error) {
      console.info(
        "Proposta salva localmente; envio ao Firebase indisponível.",
        error,
      );
    }
  });
  this.querySelectorAll("[data-my-proposal]").forEach((button) =>
    button.addEventListener("click", () =>
      appStore.set({
        view: "contracts",
        selectedCommissionProposal: button.dataset.myProposal,
        selectedCommissionProfile: null,
        selectedCommissionContract: null,
        lastAction: `Abriu proposta ${button.dataset.myProposal}`,
      }),
    ),
  );
  this.querySelectorAll("[data-my-contract]").forEach((button) =>
    button.addEventListener("click", () =>
      appStore.set({
        view: "contracts",
        selectedCommissionContract: button.dataset.myContract,
        selectedCommissionProfile: null,
        selectedCommissionProposal: null,
        lastAction: `Abriu contrato ${button.dataset.myContract}`,
      }),
    ),
  );
  return result;
};


ViewLayer.prototype.proposalFormV1 = function (scope) {
  const selected = scope.profile?.id || scope.profiles[0]?.id || "";
  return `<section class="my-proposal-page-v1"><header class="my-proposal-head-v1"><div><span class="activity-kind">NOVO DOCUMENTO · PROPOSTA COMERCIAL</span><h1>Proposta / contrato de venda de lote</h1><p>Registre o lote vendedor, o cliente e o corretor em uma única proposta. Os anexos ficam registrados na pasta do negócio.</p></div><button type="button" class="toolbar-action" data-proposal-form-back>${ico("arrow-left")} Voltar para minha carteira</button></header><form class="my-proposal-form-v1" data-my-proposal-form enctype="multipart/form-data"><section><header><span>01</span><div><h2>Lote vendedor</h2><p>Identifique o proprietário/vendedor e o imóvel que será negociado.</p></div></header><div class="my-proposal-fields-v1"><label>Vendedor / proprietário<input name="seller" required placeholder="Nome ou razão social"></label><label>CPF / CNPJ do vendedor<input name="sellerDocument" placeholder="Documento do vendedor"></label><label>Quadra / lote<input name="lot" required placeholder="Q12-L54"></label><label>Descrição da quadra<input name="quadra" required placeholder="Quadra 12 · lote 54"></label><label>Área do lote (m²)<input name="lotArea" type="number" min="0" step="0.01" placeholder="250,00"></label><label>Valor proposto<input name="value" required inputmode="decimal" placeholder="480000,00"></label><label>Taxa de comissão (%)<input name="rate" type="number" min="0" max="100" step=".1" value="6" required></label><label class="wide">Condição de pagamento<textarea name="payment" required placeholder="Sinal, financiamento e parcelas"></textarea></label></div></section><section><header><span>02</span><div><h2>Corretor responsável</h2><p>A identidade autenticada define o escopo da carteira.</p></div></header><label>Corretor<select name="profile" ${scope.profile ? "disabled" : ""}>${scope.profiles.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${esc(item.name)} · ${esc(item.creci)}</option>`).join("")}</select></label></section><section><header><span>03</span><div><h2>Cliente comprador</h2><p>Use somente dados necessários para a análise comercial.</p></div></header><div class="my-proposal-fields-v1"><label>Nome completo<input name="client" required></label><label>CPF / CNPJ<input name="cpf" placeholder="Documento do comprador"></label><label>E-mail<input name="email" type="email"></label><label>WhatsApp<input name="phone" inputmode="tel"></label><label>Finalidade<select name="purpose"><option>Moradia</option><option>Investimento</option><option>Veraneio</option></select></label></div></section><section><header><span>04</span><div><h2>Anexos da proposta</h2><p>Identidade, comprovante e documentos comerciais aceitos em PDF ou imagem.</p></div></header><label class="my-proposal-upload-v1">${ico("paperclip")}<span><b>Selecionar anexos</b><small>PDF, JPG ou PNG · até 12 MB por arquivo</small></span><input type="file" name="attachments" multiple accept="application/pdf,image/*"></label><div class="my-proposal-attachment-list-v1" data-proposal-attachments>Nenhum anexo selecionado.</div></section><footer><span data-proposal-form-status>Confira os dados antes de salvar a minuta.</span><button type="submit" class="toolbar-primary">${ico("save")} Salvar proposta</button></footer></form></section>`;
};
// CONTRACTS_TABLE_V1: a carteira de contratos começa pela leitura tabular.
// O formulário só aparece por Novo ou Editar; confirmar uma compra retorna à
// tabela para manter o recibo, a condição e o valor no mesmo contexto.
const contractDealsV1 = (scope, state) => {
  const hidden = new Set(state.commissionHiddenIds || []);
  const overrides = state.contractStatusOverrides || {};
  const local = new Map(
    (state.commissionEntries || []).map((item) => [item.id, item]),
  );
  const merged = new Map(
    scope.deals
      .filter((item) => !hidden.has(item.id))
      .map((item) => [item.id, { ...item, ...(local.get(item.id) || {}) }]),
  );
  (state.commissionEntries || []).forEach((item) => {
    if (!hidden.has(item.id) && !merged.has(item.id)) merged.set(item.id, item);
  });
  return [...merged.values()].map((item) => ({
    ...item,
    status: overrides[item.id] || item.status || "Proposta",
  }));
};

ViewLayer.prototype.contracts = function () {
  const state = appStore.get();
  const scope = commercialScopeV1();
  const deals = contractDealsV1(scope, state);
  if (state.proposalFormOpen) return this.proposalFormV1(scope);
  if (state.selectedCommissionProposal) {
    const deal = deals.find(
      (item) => item.id === state.selectedCommissionProposal,
    );
    return deal ? this.commissionProposal(deal) : this.contracts();
  }
  if (state.selectedCommissionContract) {
    const deal = deals.find(
      (item) => item.id === state.selectedCommissionContract,
    );
    return deal ? this.commissionContract(deal) : this.contracts();
  }
  const filters = {
    query: "",
    status: "all",
    ...(state.contractFilters || {}),
  };
  const shown = deals.filter((deal) => {
    const haystack = JSON.stringify(deal).toLocaleLowerCase();
    return (
      (!filters.query ||
        haystack.includes(filters.query.toLocaleLowerCase())) &&
      (filters.status === "all" || deal.status === filters.status)
    );
  });
  const total = shown.reduce((sum, item) => sum + brlToNumber(item.value), 0);
  const confirmed = shown.filter(
    (item) => item.status === "Compra confirmada",
  ).length;
  const rows = shown
    .map(
      (deal) => `<tr data-contract-row="${esc(deal.id)}">
        <td><span class="contract-table-id-v1">${esc(deal.id)}</span><small>${esc(deal.date || "Data não informada")}</small></td>
        <td><b>${esc(deal.client || "Cliente não informado")}</b><small>${esc(deal.lot || "Lote a definir")}</small></td>
        <td><span class="deal-status ${contractStatusClassV1(deal.status)}">${esc(deal.status)}</span><small>${esc(deal.stage || "Em acompanhamento")}</small></td>
        <td><b>${esc(deal.payment || "Sem recibo lançado")}</b><small>Condição registrada no contrato</small></td>
        <td><b>${esc(deal.value || "R$ 0,00")}</b><small>${esc(deal.commission || "Sem comissão")}</small></td>
        <td class="contract-table-actions-v1"><button type="button" data-contract-open="${esc(deal.id)}">Abrir</button><button type="button" data-contract-edit="${esc(deal.id)}">Editar</button><button type="button" data-contract-confirm="${esc(deal.id)}" ${deal.status === "Compra confirmada" ? "disabled" : ""}>${deal.status === "Compra confirmada" ? "Compra confirmada" : "Confirmar compra"}</button></td>
      </tr>`,
    )
    .join("");
  return `<section class="contracts-page-v2"><header class="contracts-page-head-v2"><div><span class="activity-kind">OPERAÇÃO COMERCIAL · CONTRATOS</span><h1>Contratos</h1><p>Acompanhe recibos, valores, condições e confirmação de compra em uma lista única.</p></div><span class="contracts-identity-v2">${ico(scope.profile ? "shield-check" : "briefcase-business")} ${esc(scope.elevated ? "Visão consolidada da operação" : scope.profile ? scope.profile.name : "Carteira comercial")}</span></header><div class="data-page-toolbar contracts-toolbar-v2" aria-label="Controles de contratos"><div class="toolbar-context"><span class="activity-kind">CONTRATOS / RECIBOS</span><b>${shown.length} contratos visíveis</b><small>Valores derivados dos lançamentos comerciais.</small></div><div class="toolbar-controls"><label class="toolbar-search">Buscar<input type="search" value="${esc(filters.query)}" placeholder="Contrato, cliente ou lote" data-contract-filter="query"></label><label>Status<select data-contract-filter="status"><option value="all" ${filters.status === "all" ? "selected" : ""}>Todos os status</option>${["Reserva", "Em análise", "Proposta", "Assinado", "Compra confirmada"].map((status) => `<option value="${status}" ${filters.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><button type="button" class="toolbar-action" data-contract-filter-clear>${ico("filter-x")} Limpar</button><button type="button" class="toolbar-action" data-contract-export>${ico("download")} Exportar</button><button type="button" class="toolbar-primary" data-contract-new>${ico("plus")} Novo contrato</button></div></div><section class="contracts-kpis-v2"><article><small>CONTRATOS</small><b>${deals.length}</b><span>na carteira comercial</span></article><article><small>VALOR VISÍVEL</small><b>${formatBRL(total)}</b><span>conforme o filtro atual</span></article><article><small>COMPRA CONFIRMADA</small><b>${confirmed}</b><span>retornos validados</span></article><article><small>RECIBOS / CONDIÇÕES</small><b>${shown.filter((item) => item.payment).length}</b><span>com informação financeira</span></article></section><section class="contracts-table-card-v2"><header><div><span class="activity-kind">01 · VISUALIZAÇÃO PADRÃO</span><h2>Recibos e valores</h2><p>Abra o contrato, edite os dados ou confirme a compra sem perder a listagem.</p></div><small>${shown.length} linha(s)</small></header><div class="contracts-table-wrap-v2"><table><thead><tr><th>Contrato</th><th>Cliente / lote</th><th>Status</th><th>Recibo / condição</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="contracts-empty-v2">Nenhum contrato corresponde aos filtros atuais.</td></tr>'}</tbody></table></div></section></section>`;
};

// Mantém links antigos funcionando, mas a entrada pública passa a ser sempre
// a página de contratos com tabela, nunca o formulário aberto por padrão.
ViewLayer.prototype.proposals = function () {
  return this.contracts();
};

// CONTRACTS_TABLE_BIND_V1: controles da página tabular de contratos. A lista
// continua sendo a visão padrão; o formulário só é aberto por Novo ou Editar.
const viewLayerBindContractsTableV1 = ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function (...args) {
  const result = viewLayerBindContractsTableV1.apply(this, args),
    page = this.querySelector(".contracts-page-v2"),
    form = this.querySelector("[data-my-proposal-form]"),
    state = appStore.get();

  if (form && state.contractEditing && !form.dataset.contractEditingHydrated) {
    const deal = state.contractEditing;
    const fields = {
      seller: deal.seller || "",
      sellerDocument: deal.sellerDocument || "",
      lot: deal.lot || "",
      quadra: deal.quadra || "",
      lotArea: deal.lotArea || "",
      value: String(deal.value || "").replace(/[^\d,.-]/g, ""),
      rate: String(deal.rate || "6")
        .replace("%", "")
        .replace(",", "."),
      payment: deal.payment || "",
      profile: deal.profile || "",
      client: deal.client || "",
      cpf: deal.cpf || "",
      email: deal.email || "",
      phone: deal.phone || "",
      purpose: deal.purpose || "Moradia",
    };
    Object.entries(fields).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field && field.type !== "file") field.value = value;
    });
    const title = form.closest(".my-proposal-page-v1")?.querySelector("h1"),
      label = form
        .closest(".my-proposal-page-v1")
        ?.querySelector(".my-proposal-head-v1 .activity-kind"),
      submit = form.querySelector('button[type="submit"]'),
      status = form.querySelector("[data-proposal-form-status]");
    if (label) label.textContent = "EDITAR DOCUMENTO · CONTRATO COMERCIAL";
    if (title) title.textContent = `Editar contrato ${deal.id}`;
    if (submit) submit.innerHTML = `${ico("save")} Atualizar contrato`;
    if (status)
      status.textContent = `Editando ${deal.id}. Salve para atualizar a listagem.`;
    form.dataset.contractEditingHydrated = "true";
  }

  if (form && state.contractEditing) {
    const header = form.closest(".my-proposal-page-v1")?.querySelector(".my-proposal-head-v1");
    if (header && !header.querySelector("[data-contract-preview-tab]")) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = "toolbar-action";
      button.dataset.contractPreviewTab = state.contractEditing.id;
      button.textContent = "Visualizar contrato";
      header.querySelector("div")?.append(button);
      button.addEventListener("click", () => appStore.set({
        view: "contracts", proposalFormOpen: false, contractEditing: null,
        selectedCommissionContract: button.dataset.contractPreviewTab,
        lastAction: `Visualizou contrato ${button.dataset.contractPreviewTab}`,
      }));
    }
  }

  if (!page || page.dataset.contractsTableBound === "true") return result;
  page.dataset.contractsTableBound = "true";
  const findDeal = (id) =>
    contractDealsV1(commercialScopeV1(), appStore.get()).find(
      (item) => item.id === id,
    );
  const setFilter = (name, value) =>
    appStore.set({
      contractFilters: {
        ...(appStore.get().contractFilters || {}),
        [name]: value,
      },
      lastAction: `Filtrou contratos por ${name}`,
    });

  page.querySelectorAll("[data-contract-filter]").forEach((control) => {
    control.addEventListener("change", () =>
      setFilter(control.dataset.contractFilter, control.value),
    );
    if (control.matches('input[type="search"]'))
      control.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          setFilter(control.dataset.contractFilter, control.value);
        }
      });
  });
  page
    .querySelector("[data-contract-filter-clear]")
    ?.addEventListener("click", () =>
      appStore.set({
        contractFilters: { query: "", status: "all" },
        lastAction: "Limpou filtros de contratos",
      }),
    );
  page.querySelector("[data-contract-new]")?.addEventListener("click", () =>
    appStore.set({
      view: "contracts",
      proposalFormOpen: true,
      contractEditing: null,
      selectedCommissionProposal: null,
      selectedCommissionContract: null,
      lastAction: "Abriu novo contrato",
    }),
  );
  page.querySelectorAll("[data-contract-open]").forEach((button) =>
    button.addEventListener("click", () =>
      appStore.set({
        view: "contracts",
        proposalFormOpen: false,
        contractEditing: null,
        selectedCommissionProposal: null,
        selectedCommissionContract: button.dataset.contractOpen,
        lastAction: `Abriu contrato ${button.dataset.contractOpen}`,
      }),
    ),
  );
  page.querySelectorAll("[data-contract-row]").forEach((row) => {
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `Editar contrato ${row.dataset.contractRow}`);
    const openForm = (event) => {
      if (event.target.closest("button,a,input,select")) return;
      const deal = findDeal(row.dataset.contractRow);
      if (deal) appStore.set({
        view: "contracts", proposalFormOpen: true, contractEditing: deal,
        selectedCommissionProposal: null, selectedCommissionContract: null,
        lastAction: `Abriu formulário do contrato ${deal.id}`,
      });
    };
    row.addEventListener("click", openForm);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openForm(event);
      }
    });
  });
  page.querySelectorAll("[data-contract-edit]").forEach((button) =>
    button.addEventListener("click", () => {
      const deal = findDeal(button.dataset.contractEdit);
      if (!deal) return;
      appStore.set({
        view: "contracts",
        proposalFormOpen: true,
        contractEditing: deal,
        selectedCommissionProposal: null,
        selectedCommissionContract: null,
        lastAction: `Editou contrato ${deal.id}`,
      });
    }),
  );
  page.querySelectorAll("[data-contract-confirm]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.contractConfirm,
        deal = findDeal(id);
      if (!deal || deal.status === "Compra confirmada") return;
      const current = appStore.get();
      appStore.set({
        view: "contracts",
        proposalFormOpen: false,
        contractEditing: null,
        selectedCommissionProposal: null,
        selectedCommissionContract: null,
        contractStatusOverrides: {
          ...(current.contractStatusOverrides || {}),
          [id]: "Compra confirmada",
        },
        lastAction: `Confirmou compra ${id}`,
      });
      notify(
        `Compra ${id} confirmada. O contrato voltou para a listagem.`,
        "success",
      );
    }),
  );
  page
    .querySelector("[data-contract-export]")
    ?.addEventListener("click", () => {
      const current = appStore.get(),
        filters = {
          query: "",
          status: "all",
          ...(current.contractFilters || {}),
        },
        deals = contractDealsV1(commercialScopeV1(), current).filter((deal) => {
          const haystack = JSON.stringify(deal).toLocaleLowerCase();
          return (
            (!filters.query ||
              haystack.includes(filters.query.toLocaleLowerCase())) &&
            (filters.status === "all" || deal.status === filters.status)
          );
        }),
        csv = [
          [
            "Contrato",
            "Cliente",
            "Lote",
            "Status",
            "Recibo / condição",
            "Valor",
          ],
          ...deals.map((deal) => [
            deal.id,
            deal.client || "",
            deal.lot || "",
            deal.status || "",
            deal.payment || "",
            deal.value || "",
          ]),
        ]
          .map((row) =>
            row
              .map((value) => `"${String(value).replace(/"/g, '""')}"`)
              .join(";"),
          )
          .join("\n"),
        url = URLRef.createObjectURL(
          new BlobCtor(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
        ),
        link = documentRef.createElement("a");
      link.href = url;
      link.download = "contratos-recibos.csv";
      link.click();
      schedule(() => URLRef.revokeObjectURL(url), 0);
      notify("Lista de contratos exportada em CSV.", "success");
      appStore.set({ lastAction: "Exportou contratos e recibos" });
    });
  return result;
};


};
