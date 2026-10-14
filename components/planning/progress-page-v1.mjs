export const createProgressPageV1 = ({
  appStore,
  demoData,
  extensionStage,
  esc,
  ico,
  DateCtor = globalThis.Date,
}) =>
  function progressPageV1() {
    const stage = extensionStage(),
      stored = appStore.get().records || [],
      first = stored[0] || {};
    const entries = [
      {
        time: first.hora || "08:30",
        date: "06/06/2024",
        title: first.detalhes || "Medição da rede principal",
        service: first.atividade || "Drenagem Pluvial",
        owner: first.responsavel || "Carlos Mendes",
        status: first.status || "Pendente",
        detail:
          "Conferir extensão executada, cotas e evidência fotográfica antes de liberar a próxima frente.",
        tone: "warning",
        photo: first.evidenceUri || "./assets/reference/dashboard.png",
      },
      {
        time: "09:45",
        date: "06/06/2024",
        title: "Registro fotográfico da frente",
        service: "Drenagem Pluvial",
        owner: "Paula Nascimento",
        status: "Concluído",
        detail:
          "Fotos vinculadas à medição e ao trecho executado no período da manhã.",
        tone: "success",
        photo: "./assets/reference/dashboard.png",
      },
      {
        time: "14:20",
        date: "06/06/2024",
        title: "Recebimento de tubos PEAD",
        service: "Suprimentos · Drenagem",
        owner: "Mariana Lopes",
        status: "Em validação",
        detail:
          "Conferir nota fiscal, lote e quantidade recebida contra o pedido PE-2025-040.",
        tone: "info",
        photo: "./assets/reference/dashboard.png",
      },
    ];

    return `<div class="stage-extension-page progress-page"><div class="extension-head"><div><span class="activity-kind">DIÁRIO DE OBRAS · ${esc(stage.name)}</span><h1>Andamento da obra</h1><p>Diário operacional com apontamentos, evidências e confirmação de campo.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico("arrow-left")} Todas as etapas</button><button class="primary" data-progress-new>${ico("plus")} Novo apontamento</button></div></div><div class="progress-toolbar"><div class="progress-periods"><button class="active" data-progress-period="today">Hoje · 06 jun</button><button data-progress-period="yesterday">Ontem · 05 jun</button><button data-progress-period="week">Semana atual</button></div><label>Etapa<select data-progress-stage>${demoData.activities.map((item) => `<option ${item.id === stage.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label><span class="progress-sync">${ico("cloud-check")} Última sincronização: 16:29 · local</span></div><div class="progress-layout"><main class="progress-journal"><div class="progress-section-head"><div><span class="activity-kind">REGISTROS DE CAMPO</span><h2>Diário do dia</h2></div><span class="count-badge">${entries.length} apontamentos</span></div>${entries.map((entry, index) => `<article class="journal-entry" data-progress-entry="${index}" tabindex="0"><div class="journal-time"><time>${entry.time}</time><small>${entry.date}</small></div><div class="journal-marker ${entry.tone}"></div><div class="journal-entry-main"><div class="journal-entry-top"><div><span class="activity-kind">${esc(entry.service)}</span><h3>${esc(entry.title)}</h3></div><span class="journal-status ${entry.tone}">${esc(entry.status)}</span></div><p>${esc(entry.detail)}</p><div class="journal-meta"><span>${ico("user-round")} ${esc(entry.owner)}</span><span>${ico("map-pin")} Aliança Park · ${esc(stage.name)}</span><button class="ghost journal-open">Abrir detalhes ${ico("arrow-up-right")}</button></div><div class="journal-detail"><div><small>ATIVIDADE</small><b>${esc(entry.service)}</b></div><div><small>RESPONSÁVEL</small><b>${esc(entry.owner)}</b></div><div><small>EVIDÊNCIA</small><b>Foto e registro vinculados</b></div><p>${esc(entry.detail)}</p></div></div><img class="journal-photo" src="${esc(entry.photo)}" alt="Evidência de ${esc(entry.title)}" loading="lazy"></article>`).join("")}<div class="progress-entry-form" hidden><form data-progress-form><div class="extension-card-head"><div><span class="activity-kind">NOVO APONTAMENTO</span><h2>Registrar ocorrência ou avanço</h2></div><button type="button" class="icon-btn compact" data-progress-cancel aria-label="Fechar">×</button></div><div class="progress-form-grid"><label>Atividade<select name="atividade">${demoData.activities.map((item) => `<option>${esc(item.name)}</option>`).join("")}</select></label><label>Responsável<select name="responsavel">${demoData.collaborators.map(([name]) => `<option>${esc(name)}</option>`).join("")}</select></label><label>Hora<input type="time" name="hora" value="${new DateCtor().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}"></label><label>Status<select name="status"><option>Pendente</option><option>Em validação</option><option>Concluído</option></select></label><label class="full">Detalhes<textarea name="detalhes" placeholder="Descreva o avanço, medição, ocorrência ou evidência"></textarea></label><label class="full">Foto / evidência<input name="evidenceUri" placeholder="URL local ou caminho da foto"></label></div><button class="primary" type="submit">${ico("save")} Salvar no diário</button></form></div></main><aside class="progress-rail"><section class="extension-card progress-summary"><div class="extension-card-head"><h2>Resumo do dia</h2>${ico("activity")}</div><div class="progress-metrics"><div><b>${entries.length}</b><span>Apontamentos</span></div><div><b>1</b><span>Pendência</span></div><div><b>${stage.progress}%</b><span>Etapa</span></div></div><div class="progress-bar"><i style="width:${stage.progress}%"></i></div><small>${esc(stage.name)} · ${esc(stage.owner)}</small></section><section class="extension-card"><div class="extension-card-head"><h2>Próximas confirmações</h2>${ico("list-checks")}</div><div class="next-check"><span>16:00</span><b>Liberar frente seguinte</b><small>Após validação da medição</small></div><div class="next-check"><span>Amanhã</span><b>Validar material recebido</b><small>Nota fiscal e inspeção</small></div><button class="ghost full-button" data-view="agenda">Abrir agenda</button></section><section class="extension-card progress-proof"><div class="extension-card-head"><h2>Evidências vinculadas</h2>${ico("images")}</div><p>Fotos, medições e comprovantes ficam relacionados ao serviço e podem alimentar o relatório de avanço.</p><button class="ghost full-button" data-view="records">Ver registros e fotos</button></section></aside></div><div class="progress-footer"><span>${ico("send")} Diário pronto para medição físico-financeira.</span><button class="primary" data-progress-send>${ico("file-up")} Enviar diário para medição</button></div></div>`;
  };
