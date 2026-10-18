/** Finance workspace, cash-record presentation, and agent awareness view models. */
export const createFinanceWorkspaceV8 = (services = {}) => {
  const { appStore, executionModel, esc, ico, formatBRL, queueMicrotaskFn, DateCtor = Date } = services;
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function") throw new TypeError("Finance workspace requires appStore get/set.");
  for (const [name, dependency] of Object.entries({ executionModel, esc, ico, formatBRL, queueMicrotaskFn, DateCtor })) if (typeof dependency !== "function" && name !== "executionModel") throw new TypeError(`Finance workspace requires ${name}().`);
  if (!executionModel || typeof executionModel !== "object") throw new TypeError("Finance workspace requires the execution model.");
const cashRecordLauncherMarkupV1 = (returnView = "finance") => {
  const actor = appStore.get().currentActor || { role: "owner", label: "Dono" };
  const allowed = actor.role === "owner" || actor.role === "developer";
  return `<section class="cash-record-launcher" data-cash-record-launcher><div><span class="activity-kind">SAÍDAS DE CAIXA</span><h2>Registrar uma saída</h2><p>Entradas de lotes e repasses são registradas exclusivamente na página Repasses.</p></div>${allowed ? `<button type="button" class="toolbar-primary" data-cash-record-open data-return-view="${esc(returnView)}">${ico("plus")} Nova saída</button>` : `<span class="cash-record-permission">Somente o Dono pode registrar movimentações.</span>`}</section>`;
};

const agentAwarenessStepsV1 = (item = {}) => {
  const baseAt =
    item.createdAt || item.updatedAt || item.at || new DateCtor().toISOString();
  const supplied = [
    item.steps,
    item.actionSteps,
    item.timeline,
    item.trace,
  ].find((value) => Array.isArray(value) && value.length);
  if (supplied) {
    return supplied.map((step, index) => ({
      label: String(
        step?.label || step?.title || step?.action || `Passo ${index + 1}`,
      ),
      detail: String(
        step?.detail ||
          step?.message ||
          step?.description ||
          "Etapa registrada pelo agente.",
      ),
      at: step?.at || step?.createdAt || baseAt,
      status: String(step?.status || "registrado"),
    }));
  }
  const type = String(item.type || item.eventType || "").toLowerCase();
  const subject = String(
    item.entity || item.entityId || "contexto operacional",
  );
  const labels = type.includes("cash")
    ? [
        [
          "Evento financeiro recebido",
          "O motor identificou uma alteração relacionada ao caixa.",
        ],
        [
          "Saldo e cobertura recalculados",
          "As dependências e a capacidade de alocação foram comparadas.",
        ],
        [
          "Orientação encaminhada",
          "O alerta permanece disponível para decisão humana.",
        ],
      ]
    : type.includes("material")
      ? [
          [
            "Status de material recebido",
            "A entrada foi relacionada ao acompanhamento operacional.",
          ],
          [
            "Cobertura de suprimentos avaliada",
            "O agente comparou pendências e recebimentos da frente.",
          ],
          [
            "Ação sugerida registrada",
            "A equipe responsável deve confirmar a próxima providência.",
          ],
        ]
      : type.includes("stage") || type.includes("activity")
        ? [
            [
              "Evento da etapa recebido",
              "A alteração foi vinculada à frente correspondente.",
            ],
            [
              "Dependências verificadas",
              "O agente conferiu bloqueios, progresso e condições de execução.",
            ],
            [
              "Próximo passo preparado",
              "A recomendação aguarda confirmação ou novo registro.",
            ],
          ]
        : [
            [
              "Registro recebido",
              "O evento entrou na fila de ciência do agente.",
            ],
            ["Contexto relacionado", `A ação foi vinculada a ${subject}.`],
            [
              "Resultado aguardando confirmação",
              "Nenhuma alteração externa é aplicada sem uma ação autorizada.",
            ],
          ];
  return labels.map(([label, detail], index) => ({
    label,
    detail: index === 0 && item.message ? String(item.message) : detail,
    at: baseAt,
    status: index === labels.length - 1 ? "aguardando" : "concluído",
  }));
};

const agentAwarenessEntriesV1 = (state) => {
  const notifications = Array.isArray(state.operationalNotifications)
    ? state.operationalNotifications.map((item) => ({
        ...item,
        source: "Motor operacional",
        title: item.title || item.type || "Notificação do agente",
        message: item.message || "Evento recebido pelo agente.",
      }))
    : [];
  const local = Array.isArray(state.controlChangeLog)
    ? state.controlChangeLog.map((item) => ({
        id: `local-${item.id || item.at || item.label}`,
        type: "control.change",
        source: "Sessão local",
        title: item.label || "Alteração registrada",
        message: item.detail || "Alteração local capturada.",
        createdAt: item.at,
        entity: item.entity,
        entityId: item.entityId,
        steps: item.steps,
      }))
    : [];
  const realtime = Object.values(state.controlRealtime?.events || {}).map(
    (item) => ({
      ...item,
      id: `rtdb-${item.id || item.createdAt || item.type}`,
      source: "RTDB",
      title: item.label || item.type || "Evento em tempo real",
      message: item.detail || item.message || "Evento recebido em tempo real.",
      createdAt: item.createdAt || item.updatedAt,
    }),
  );
  return [...notifications, ...local, ...realtime]
    .filter((item) => item.title || item.message)
    .sort((a, b) =>
      String(b.createdAt || b.updatedAt || b.at || "").localeCompare(
        String(a.createdAt || a.updatedAt || a.at || ""),
      ),
    )
    .slice(0, 10);
};

const AgentAwarenessLogV1 = ({ props = {} } = {}) => ({
  next(message = {}) {
    const item = { ...props, ...message },
      steps = agentAwarenessStepsV1(item),
      timestamp = item.createdAt || item.updatedAt || item.at,
      date = timestamp ? new DateCtor(timestamp) : null,
      timeLabel =
        date && !Number.isNaN(date.getTime())
          ? date.toLocaleString("pt-BR")
          : "agora",
      severity = String(item.severity || "info").toLowerCase(),
      logId = String(
        item.id || `${item.type || "agent"}-${timestamp || "now"}`,
      );
    return {
      done: false,
      value: `<details class="finance-agent-log ${esc(severity)}" data-agent-log="${esc(logId)}"${item.expanded ? " open" : ""}><summary><span class="finance-agent-log-marker">${ico("chevron-right")}</span><span class="finance-agent-log-main"><time>${esc(timeLabel)}</time><b>${esc(item.title || "Registro do agente")}</b><small>${esc(item.message || "")}</small></span><span class="finance-agent-log-meta"><i>${esc(item.source || "Agente")}</i><b>${steps.length} passo${steps.length === 1 ? "" : "s"}</b></span></summary><div class="finance-agent-log-body"><div class="finance-agent-log-context"><span>${esc(String(item.type || "ação operacional"))}</span><small>${esc(item.entity ? `${item.entity}${item.entityId ? ` · ${item.entityId}` : ""}` : "Sem entidade informada")}</small></div><ol>${steps
        .map((step) => {
          const stepDate = new DateCtor(step.at || timestamp || "");
          const stepTime = !Number.isNaN(stepDate.getTime())
            ? stepDate.toLocaleString("pt-BR")
            : timeLabel;
          return `<li><time>${esc(stepTime)}</time><div><b>${esc(step.label)}</b><small>${esc(step.detail)}</small></div><em class="${esc(step.status)}">${esc(step.status)}</em></li>`;
        })
        .join("")}</ol></div></details>`,
    };
  },
});

const agentAwarenessLogV1 = (item) =>
  AgentAwarenessLogV1({ props: item }).next().value;

const financeAgentAwarenessMarkupV1 = (state) => {
  const logs = agentAwarenessEntriesV1(state);
  return `<section class="finance-notification-list finance-agent-awareness" data-agent-awareness><header><div><span class="activity-kind">CIÊNCIA DO AGENTE</span><h2>Registros e passos da ação</h2><p>Abra cada ocorrência para acompanhar o horário, o contexto e a sequência observada pelo agente.</p></div><span class="finance-agent-awareness-count">${logs.length} registros · mais recente primeiro</span></header><div class="finance-agent-log-list">${logs.map((item, index) => agentAwarenessLogV1({ ...item, expanded: index === 0 })).join("") || '<p class="finance-agent-empty">Nenhum registro para o perfil atual.</p>'}</div></section>`;
};

const financeControlV8 = function () {
  const state = appStore.get(),
    actor = state.currentActor || { role: "owner", label: "Dono" },
    summary = state.cashSummary || {},
    operational = state.operationalState || {},
    cash = operational.cash || {},
    entries = state.cashFlowLocal || [],
    notifications = state.operationalNotifications || [],
    guidance = state.operationalGuidance || null,
    agenda = (state.operationalAgenda || []).slice(0, 4);
  const stages = operational.stages || [];
  queueMicrotaskFn(() => this.bindCommercialPagesV7?.());
  return `<section class="control-page finance-control-page"><header class="control-page-head"><div><span class="activity-kind">GESTÃO FINANCEIRA · CONTROLE TOTAL</span><h1>Caixa e distribuição da obra</h1><p>Livro-razão, reserva operacional, alocação por dependência e alertas do agente.</p></div><div class="control-head-actions"><button type="button" data-view="reports">${ico("chart-no-axes-combined")} Relatórios gerenciais</button><button type="button" class="toolbar-primary" data-v7-finance-export>${ico("download")} Exportar dados</button></div></header><section class="finance-master-grid"><article class="finance-master-balance"><span>CAIXA MESTRE · DONO</span><strong>${formatBRL(Number(summary.balanceCents ?? cash.balanceCents ?? 0) / 100)}</strong><small>Entradas ${formatBRL(Number(summary.entriesCents || 0) / 100)} · Saídas ${formatBRL(Number(summary.exitsCents || 0) / 100)}</small></article><article><small>Reserva mínima</small><b>${formatBRL(Number(cash.reserveCents || 0) / 100)}</b><span>calibrada pelo Administrador</span></article><article><small>Disponível para alocação</small><b>${formatBRL(Number(cash.allocatableCents || 0) / 100)}</b><span>após reserva operacional</span></article><article><small>Notificações do perfil</small><b>${notifications.length}</b><span>eventos auditáveis</span></article></section>${guidance ? `<section class="control-ledger"><header><div><span class="activity-kind">INFERÊNCIA OPERACIONAL CENTRAL</span><h2>${esc(guidance.focalStage?.name || "Frente prioritária")}</h2></div><small>${esc(guidance.summary || "")}</small></header><div class="finance-allocation-list"><article><span>01</span><div><b>Ação de caixa</b><small>${esc(guidance.cashAction || "Sem ação definida")}</small></div><div><small>Início previsto</small><b>${esc(guidance.focalStage?.plannedStart || "—")}</b></div><div><small>Fim previsto</small><b>${esc(guidance.focalStage?.plannedFinish || "—")}</b></div><em>${esc(String(guidance.focalStage?.adjustedRate || "—"))}</em></article>${agenda.map((item, index) => `<article><span>${String(index + 2).padStart(2, "0")}</span><div><b>${esc(item.title)}</b><small>${esc(item.stageName)} · ${esc(item.owner || "Responsável a definir")}</small></div><div><small>Início</small><b>${esc(item.plannedStart || "—")}</b></div><div><small>Status</small><b>${esc(item.status)}</b></div><em>${esc(item.category)}</em></article>`).join("")}</div></section>` : ""}${["owner", "developer"].includes(actor.role) ? `<form class="cash-entry-control" data-v8-cash-entry><header><div><span class="activity-kind">NOVO LANÇAMENTO · AUTORIDADE DO DONO</span><h2>Movimentar fluxo de caixa</h2></div><small>Correções futuras devem usar estorno ou ajuste, preservando a trilha.</small></header><div><label>Tipo<select name="kind"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Data<input type="date" name="date" value="${new DateCtor().toISOString().slice(0, 10)}" required></label><label>Categoria<input name="category" placeholder="Vendas, obra, ajuste…" required></label><label>Etapa<select name="stage"><option>Geral</option>${executionModel.stages.map((item) => `<option>${esc(item.name)}</option>`).join("")}</select></label><label>Valor (R$)<input name="amount" inputmode="decimal" placeholder="0,00" required></label><label class="wide">Origem / descrição<input name="description" placeholder="Identifique recebimento, pagamento, estorno ou ajuste" required></label></div><footer><span data-v8-cash-status>O agente recalculará todas as frentes após confirmar.</span><button type="submit">${ico("wallet-cards")} Registrar e recalcular</button></footer></form>` : `<div class="role-boundary-notice">${ico("lock-keyhole")} Somente o Dono altera o caixa. Seu perfil atual é ${esc(actor.label || actor.role)}.</div>`}<section class="finance-allocation-board"><header><div><span class="activity-kind">ALOCAÇÃO SEQUENCIAL · VERSÃO ${operational.calibrationVersion || 1}</span><h2>Capacidade financeira por etapa</h2></div><button type="button" data-view="settings">Abrir calibrações</button></header><div class="finance-allocation-list">${stages.map((stage, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><div><b>${esc(stage.name)}</b><small>${stage.blockedBy?.length ? `Bloqueada por ${stage.blockedBy.join(", ")}` : "Elegível conforme relações"}</small></div><div><small>Necessidade</small><b>${formatBRL(Number(stage.needCents || 0) / 100)}</b></div><div><small>Alocado</small><b>${formatBRL(Number(stage.allocatedCents || 0) / 100)}</b></div><em class="${stage.coverage < 35 ? "critical" : ""}">${stage.coverage}%</em></article>`).join("") || "<p>Aguardando o primeiro cálculo operacional.</p>"}</div></section><section class="control-ledger finance-ledger"><header><div><span class="activity-kind">LIVRO-RAZÃO</span><h2>Entradas e saídas registradas</h2></div><label>Filtrar lançamentos<input data-v8-finance-search placeholder="ID, etapa, categoria ou descrição"></label></header><div class="control-table-wrap"><table><thead><tr><th>Data / ID</th><th>Natureza</th><th>Categoria</th><th>Etapa</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${entries.map((item) => `<tr data-v8-finance-row data-search="${esc(JSON.stringify(item).toLowerCase())}"><td><b>${esc(item.date)}</b><small>${esc(item.id)}</small></td><td><span class="cash-kind ${esc(item.kind)}">${esc(item.kind)}</span></td><td>${esc(item.category)}</td><td>${esc(item.stage)}</td><td>${esc(item.description)}</td><td><b>${item.kind === "saida" ? "−" : "＋"} ${formatBRL(Number(item.amountCents || 0) / 100)}</b></td></tr>`).join("")}</tbody></table></div></section><aside class="finance-notification-list"><span class="activity-kind">CIÊNCIA DO AGENTE</span>${
    notifications
      .slice(0, 6)
      .map(
        (item) =>
          `<article class="${esc(item.severity)}"><b>${esc(item.title)}</b><p>${esc(item.message)}</p><small>${new DateCtor(item.createdAt).toLocaleString("pt-BR")}</small></article>`,
      )
      .join("") || "<p>Nenhuma notificação para o perfil atual.</p>"
  }</aside></section>`;
};


  return { cashRecordLauncherMarkupV1, financeAgentAwarenessMarkupV1, financeControlV8 };
};

export const installFinancePageV8 = (ViewLayer, workspace = {}, appStore) => {
  if (!ViewLayer?.prototype || typeof workspace.financeControlV8 !== "function" || typeof workspace.cashRecordLauncherMarkupV1 !== "function" || typeof workspace.financeAgentAwarenessMarkupV1 !== "function") throw new TypeError("Finance page requires a complete finance workspace.");
  const { financeControlV8, cashRecordLauncherMarkupV1, financeAgentAwarenessMarkupV1 } = workspace;
  ViewLayer.prototype.finance = function (...args) {
    const html = financeControlV8.apply(this, args);
    const withPrint = html.replace(/(<button type="button" class="toolbar-primary" data-v7-finance-export>[\s\S]*?<\/button>)/, (match) => `${match}<button type="button" class="toolbar-action" data-v7-finance-print>Imprimir</button>`);
    const withCashRecordLauncher = withPrint.replace(/<form class="cash-entry-control" data-v8-cash-entry>[\s\S]*?<\/form>|<div class="role-boundary-notice">[\s\S]*?<\/div>/, cashRecordLauncherMarkupV1("finance"));
    return withCashRecordLauncher.replace(/<aside class="finance-notification-list">[\s\S]*?<\/aside>/, financeAgentAwarenessMarkupV1(appStore.get()));
  };
};
