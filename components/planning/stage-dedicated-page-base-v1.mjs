export const installStageDedicatedPageBaseV1 = (ViewLayer, dependencies = {}) => {
  const { appStore, executionModel, stageV9ByState, stageV9LiveFor, stageV9ProfileFor, stageV9MaterialsFor, stageV9FlowPackets, stageV9BudgetFor, stageOf, stageV9StatusFor, stageV9ProductionFor, stageV9DirectiveText, stageV9EscList, formatBRL, esc, ico } = dependencies;

ViewLayer.prototype.activityDedicatedPage = function () {
  const state = appStore.get(),
    stage = stageV9ByState(state) || executionModel.stages[0],
    live = stageV9LiveFor(stage),
    profile = stageV9ProfileFor(stage),
    materials = stageV9MaterialsFor(stage),
    packets = stageV9FlowPackets(stage),
    budget = stageV9BudgetFor(stage, state),
    deps = (stage.dependsOn || []).map(
      (key) =>
        executionModel.stages.find((item) => item.key === key)?.name || key,
    ),
    targets = profile.notificationTargets || {};
  const flow = packets
    .map(
      (packet, index) =>
        `<button type="button" class="stage-v9-activity-card" data-activity-v9="${esc(`${stage.key}:${packet.key}`)}"><header><span>${String(index + 1).padStart(2, "0")} · ${esc(packet.unit.toUpperCase())}</span><em>${index === 0 ? "Pronto" : index === 1 && Number(live.progress) > 0 ? "Em execução" : index === 2 ? "Aguardando validação" : "Bloqueado por completude"}</em></header><h3>${esc(packet.label)}</h3><p>${esc(packet.detail)}</p><div><small>Gatilho</small><b>${esc(packet.trigger)}</b></div><footer>Em sequência ${index < packets.length - 1 ? ico("arrow-right") : "· liberação"}</footer></button>`,
    )
    .join("");
  const recordRows = (Array.isArray(state.records) ? state.records : [])
    .filter(
      (record) =>
        stage.name === stageOf(record) ||
        String(record.atividade || "")
          .toLowerCase()
          .includes(String(stage.name).toLowerCase().split(" ")[0]),
    )
    .slice(-8)
    .reverse();
  const diary = recordRows.length
    ? recordRows
        .map(
          (record) =>
            `<tr><td><b>${esc(record.data || "—")}</b><small>${esc(record.hora || "")}</small></td><td>${esc(record.atividade || stage.name)}</td><td>${esc(record.responsavel || "A definir")}</td><td>${esc(record.detalhes || "Sem apontamento")}</td><td><span>${esc(record.status || "Pendente")}</span></td><td>${record.comprovante || record.evidencias ? "Anexado" : "—"}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="6" class="stage-v9-empty-diary">Nenhum apontamento desta etapa no histórico. O primeiro registro confirmado aparecerá aqui.</td></tr>`;
  return `<section class="stage-v9-dedicated-page"><header class="stage-v9-dedicated-head"><button type="button" class="stage-v9-back" data-view="stages">${ico("arrow-left")} Todas as etapas</button><div><span class="activity-kind">ETAPA DEDICADA · ${esc(stage.key.toUpperCase())}</span><h1>${esc(stage.name)}</h1><p>${esc(live.week || "Cronograma operacional")} · ${esc(live.owner || "Responsável a definir")} · unidade ${esc(stage.production?.unit || "produção")}</p></div><aside><small>AVANÇO REGISTRADO</small><b>${Number(live.progress) || 0}%</b><span>${esc(stageV9StatusFor(live))}</span></aside></header><section class="stage-v9-status-lines"><div><small>STATUS DA RELAÇÃO</small><b>${deps.length ? `Aguardando ${deps.join(", ")}` : "Liberada para início"}</b></div><div><small>CAIXA / ORÇAMENTO</small><b>${formatBRL(budget)}</b><span>peso ${Number(stage.cashWeight || 0) * 100}% no caixa</span></div><div><small>PRODUÇÃO</small><b>${esc(stageV9ProductionFor(stage))}</b><span>medida validada no diário</span></div><div><small>NOTIFICAÇÕES</small><b>${Object.values(targets).flat().length || 0} destinos</b><span>eventos auditáveis</span></div></section><section class="stage-v9-flow-section"><header><div><span class="activity-kind">FLUXOGRAMA ATUAL DE EXECUÇÃO</span><h2>Atividades e linhagens de requisito</h2><p>Clique em qualquer card para abrir o cabeçalho estrutural da atividade e seu diário de obra.</p></div><span class="stage-v9-flow-note">${stage.dependsOn?.length ? `↳ depende de ${stage.dependsOn.join(" · ")}` : "↳ início do encadeamento"}</span></header><div class="stage-v9-flow">${flow}</div></section><section class="stage-v9-detail-grid"><article class="stage-v9-detail-card"><span class="activity-kind">DIRETRIZ ATIVA</span><h2>O que dispara esta etapa</h2><p>${esc(stageV9DirectiveText(stage, profile))}</p><h3>Requisitos de evidência</h3><ul>${stageV9EscList(profile.evidenceFocus)}</ul><h3>Pedidos e materiais</h3><ul>${stageV9EscList(profile.procurementFocus || materials.map((item) => item.name))}</ul></article><article class="stage-v9-detail-card"><span class="activity-kind">MATERIAIS PRINCIPAIS</span><h2>Composição da frente</h2><div class="stage-v9-material-list">${materials.map((item) => `<div><b>${esc(item.name)}</b><span>${item.quantity == null ? "Quantidade a medir" : `${esc(item.quantity)} ${esc(item.unit || "un.")}`}</span><small>${esc(item.status || "Planejado")} · ${esc(item.scope || "Requisito da etapa")}</small></div>`).join("")}</div></article></section><section class="stage-v9-diary"><header><div><span class="activity-kind">DIÁRIO DE OBRA · HISTÓRICO DA ETAPA</span><h2>Registros, medições e comprovantes</h2></div><button type="button" data-view="records">Abrir histórico completo ${ico("arrow-up-right")}</button></header><div class="stage-v9-diary-table-wrap"><table class="stage-v9-diary-table"><thead><tr><th>Data / hora</th><th>Atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th><th>Comprovante</th></tr></thead><tbody>${diary}</tbody></table></div></section></section>`;
};
};
