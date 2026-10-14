/**
 * Builds live report projections from the same operational state used by the
 * finance and records workspaces. The catalog remains owned by the app shell;
 * domain readers are injected so this module does not depend on components.js.
 */
export const createLiveReportBuildersV1 = ({
  reportCatalog,
  formatBRL,
  stageRecordStagesV1,
  stageRecordStageForV1,
  stageRecordServiceRowsV1,
  isAssistantVisualAdditionV1,
  controlCenterMaterialRowsV1,
}) => {
  const upsertLiveReportV1 = (report) => {
    const index = reportCatalog.findIndex((item) => item.id === report.id);
    if (index < 0) reportCatalog.push(report);
    else reportCatalog[index] = report;
  };

  const syncCashEvidenceReportV1 = (state) => {
    const entries = Array.isArray(state.cashFlowLocal) ? state.cashFlowLocal : [];
    const report = {
      id: "cash-evidence-live",
      family: "Financeiro",
      label: "Lançamentos e comprovantes",
      icon: "receipt-text",
      description: "Cada lançamento do caixa com situação fiscal e documentos efetivamente vinculados.",
      source: "Caixa operacional · anexos e controle fiscal",
      metrics: [
        ["Lançamentos", String(entries.length), "Registros carregados"],
        ["Com arquivo", String(entries.filter((entry) => (entry.attachments || (entry.attachment ? [entry.attachment] : [])).length).length), "Comprovante anexado"],
        ["Conferidos", String(entries.filter((entry) => entry.fiscalStatus === "conferido").length), "Conferência fiscal"],
        ["Sem arquivo", String(entries.filter((entry) => !(entry.attachments || (entry.attachment ? [entry.attachment] : [])).length).length), "Exigem acompanhamento"],
      ],
      columns: ["Data / ID", "Lançamento", "Etapa", "Valor", "Situação fiscal"],
      rows: entries.map((entry) => [
        `${entry.date || "Sem data"} · ${entry.id}`,
        entry.category || entry.description || "Sem descrição",
        entry.stage || "Geral",
        formatBRL(Number(entry.amountCents || 0) / 100),
        entry.fiscalStatus || "Pendente",
      ]),
      entries,
    };
    const index = reportCatalog.findIndex((item) => item.id === report.id);
    if (index < 0) reportCatalog.push(report);
    else reportCatalog[index] = report;
  };

  const syncConstructionFinanceReportsV1 = (state) => {
    const entries = Array.isArray(state.cashFlowLocal) ? state.cashFlowLocal : [];
    const normalize = (value) => String(value ?? "")
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const stages = stageRecordStagesV1();
    const outflows = entries.filter((entry) =>
      ["saida", "despesa", "outflow", "expense"].includes(normalize(entry.kind)),
    );
    const amountBRL = (entry) => Number(entry.amountCents ?? (Number(entry.amount || 0) * 100)) / 100;
    const stageNameFor = (entry) => stageRecordStageForV1(entry, stages)?.name
      || entry.stage
      || "Sem etapa vinculada";
    const grouped = new Map();
    outflows.forEach((entry) => {
      const stage = stageNameFor(entry);
      const category = entry.category || "Sem categoria";
      const key = `${stage}\u0000${category}`;
      const group = grouped.get(key) || { stage, category, count: 0, total: 0, latest: "" };
      group.count += 1;
      group.total += amountBRL(entry);
      group.latest = [group.latest, entry.date || ""].filter(Boolean).sort().at(-1) || "Sem data";
      grouped.set(key, group);
    });
    const total = outflows.reduce((sum, entry) => sum + amountBRL(entry), 0);
    const stagesWithExpense = new Set(outflows.map(stageNameFor)).size;

    upsertLiveReportV1({
      id: "project-expenses-live",
      family: "Financeiro",
      label: "Gastos registrados por etapa",
      icon: "chart-no-axes-combined",
      description: "Consolida somente saídas reais do caixa operacional por etapa e categoria.",
      source: "Caixa operacional · lançamentos de saída",
      metrics: [
        ["Gastos registrados", formatBRL(total), "Saídas do caixa nesta sessão"],
        ["Lançamentos", String(outflows.length), "Pagamentos / despesas registrados"],
        ["Etapas com gasto", String(stagesWithExpense), "Com lançamento vinculado"],
        ["Sem etapa", String(outflows.filter((entry) => !stageRecordStageForV1(entry, stages)).length), "Exigem classificação"],
      ],
      columns: ["Etapa", "Categoria", "Lançamentos", "Gasto registrado", "Data mais recente"],
      rows: [...grouped.values()]
        .sort((a, b) => b.total - a.total)
        .map((item) => [item.stage, item.category, String(item.count), formatBRL(item.total), item.latest]),
    });

    upsertLiveReportV1({
      id: "project-expense-ledger-live",
      family: "Financeiro",
      label: "Lançamentos de gastos da obra",
      icon: "receipt-text",
      description: "Livro detalhado de saídas, com etapa, categoria, descrição e situação fiscal do lançamento.",
      source: "Caixa operacional · saídas e comprovantes vinculados",
      metrics: [
        ["Total de gastos", formatBRL(total), "Saídas registradas"],
        ["Lançamentos", String(outflows.length), "Itens detalhados abaixo"],
        ["Com etapa", String(outflows.filter((entry) => Boolean(stageRecordStageForV1(entry, stages))).length), "Rastreabilidade da obra"],
        ["Com comprovante", String(outflows.filter((entry) => (entry.attachments || (entry.attachment ? [entry.attachment] : [])).length).length), "Arquivo vinculado ao caixa"],
      ],
      columns: ["Data / ID", "Etapa", "Categoria", "Descrição", "Valor", "Situação fiscal"],
      rows: outflows.map((entry) => [
        `${entry.date || "Sem data"} · ${entry.id || "Sem ID"}`,
        stageNameFor(entry),
        entry.category || "Sem categoria",
        entry.description || "Sem descrição",
        formatBRL(amountBRL(entry)),
        entry.fiscalStatus || "Pendente",
      ]),
      entries: outflows,
    });
  };

  const syncServiceCompletionReportV1 = (state) => {
    const stages = stageRecordStagesV1();
    const services = stageRecordServiceRowsV1(state);
    const normalize = (value) => String(value ?? "")
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const completeStatuses = new Set([
      "concluido", "concluida", "finalizado", "finalizada",
      "executado", "executada", "feito", "feita",
    ]);
    const recordsById = new Map((Array.isArray(state.records) ? state.records : [])
      .map((record) => [String(record.id), record]));
    const scoreService = (service) => {
      const record = recordsById.get(String(service.recordId)) || {};
      const isComplete = completeStatuses.has(normalize(service.status));
      const progressProperty = (Array.isArray(record.properties) ? record.properties : [])
        .find((property) => /^(progress|progresso|progress_percent|completion_percent|percentual_concluido)$/i.test(String(property?.id || "")));
      const rawProgress = record.progresso ?? record.progressPercent ?? record.progress
        ?? progressProperty?.value;
      if (rawProgress != null && String(rawProgress).trim() !== "") {
        const parsed = Number(String(rawProgress).replace("%", "").replace(",", ".").trim());
        if (Number.isFinite(parsed)) {
          // OCR defaults progress to zero; an explicit final status takes precedence.
          if (parsed === 0 && isComplete) return 100;
          return Math.min(100, Math.max(0, parsed));
        }
      }
      return isComplete ? 100 : 0;
    };
    const observed = new Map(services.map((service) => [service.recordId, {
      ...service,
      inferredProgress: scoreService(service),
    }]));
    const mappedServices = [...observed.values()];
    const overall = mappedServices.length
      ? mappedServices.reduce((sum, service) => sum + service.inferredProgress, 0) / mappedServices.length
      : null;
    const stagesWithEvidence = stages.filter((stage) =>
      mappedServices.some((service) => service.stageKey === stage.key),
    ).length;
    const allAssistantServices = (Array.isArray(state.records) ? state.records : []).filter((record) => {
      const target = record.allocationTarget || record.properties?.find?.((item) => item.id === "allocation_target")?.value;
      return isAssistantVisualAdditionV1(record) && normalize(target).includes("serv");
    });
    const unmappedCount = Math.max(0, allAssistantServices.length - mappedServices.length);
    const rows = stages.map((stage) => {
      const stageServices = mappedServices.filter((service) => service.stageKey === stage.key);
      const completed = stageServices.filter((service) => service.inferredProgress >= 100).length;
      const progress = stageServices.length
        ? `${Math.round(stageServices.reduce((sum, service) => sum + service.inferredProgress, 0) / stageServices.length)}%`
        : "Sem registros";
      return [stage.name, String(stageServices.length), String(completed), progress,
        stageServices.length ? "Com evidência" : "Sem registros"];
    });

    upsertLiveReportV1({
      id: "service-completeness-live",
      family: "Construção",
      label: "Completude inferida dos serviços",
      icon: "chart-spline",
      description: `Estima a conclusão a partir de serviços alocados por OCR às etapas e dos avanços/status registrados. O progresso zero padrão do OCR não anula um status final. ${unmappedCount} serviço(s) assistido(s) sem etapa ficam fora da média.`,
      source: "Registros de serviço do assistente · vinculados à etapa",
      metrics: [
        ["Completude registrada", overall == null ? "Sem base" : `${Math.round(overall)}%`, "Média por serviço com etapa"],
        ["Serviços concluídos", String(mappedServices.filter((service) => service.inferredProgress >= 100).length), "Status final ou avanço explícito de 100%"],
        ["Serviços considerados", String(mappedServices.length), "Evidências OCR associadas a etapa"],
        ["Etapas com evidência", `${stagesWithEvidence} / ${stages.length}`, "Cobertura de registros"],
      ],
      columns: ["Etapa", "Serviços registrados", "Concluídos", "Completude inferida", "Leitura"],
      rows,
    });
  };

  const syncLiveSystemReportV1 = (state) => {
    const rows = [
      ["Saldo de caixa", formatBRL(Number(state.cashSummary?.balanceCents || 0) / 100), "cashSummary", "Atual"],
      ["Entradas", formatBRL(Number(state.cashSummary?.entriesCents || 0) / 100), "cashSummary", "Atual"],
      ["Saídas", formatBRL(Number(state.cashSummary?.exitsCents || 0) / 100), "cashSummary", "Atual"],
      ["Lançamentos de caixa", String((state.cashFlowLocal || []).length), "cashFlowLocal", "Atual"],
      ["Registros operacionais", String((state.records || []).length), "records", "Atual"],
      ["Etapas", String((state.operationalState?.stages || []).length), "operationalState", "Atual"],
      ["Materiais monitorados", String(controlCenterMaterialRowsV1(state).length), "catálogo operacional", "Atual"],
      ["Leads captados", String((state.publicLeads || []).length), "captação pública", "Atual"],
      ["Reservas públicas", String((state.publicReservations || []).length), "reservas públicas", "Atual"],
      ["Lançamentos comerciais", String((state.commissionEntries || []).length), "carteira comercial", "Atual"],
      ["Alertas do agente", String((state.operationalNotifications || []).length), "operationalNotifications", "Atual"],
    ];
    const report = {
      id: "system-live", family: "Sistema", label: "Métricas do sistema",
      icon: "activity", source: "Estado operacional carregado",
      description: "Saldos e contagens do estado operacional carregado nesta sessão.",
      metrics: [
        ["Saldo de caixa", rows[0][1], "caixa mestre"],
        ["Registros", rows[4][1], "histórico operacional"],
        ["Leads", rows[7][1], "captação pública"],
        ["Lançamentos comerciais", rows[9][1], "carteira comercial"],
      ],
      columns: ["Indicador", "Valor", "Origem", "Situação"], rows,
    };
    const index = reportCatalog.findIndex((item) => item.id === report.id);
    if (index < 0) reportCatalog.unshift(report);
    else reportCatalog[index] = report;
  };

  return Object.freeze({
    syncCashEvidenceReportV1,
    syncConstructionFinanceReportsV1,
    syncServiceCompletionReportV1,
    syncLiveSystemReportV1,
  });
};
