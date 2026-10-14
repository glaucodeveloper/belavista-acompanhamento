/** Build helpers shared by the stage agenda renderer and its event routes. */
export const createStageAgendaHelpersV1 = ({
  agendaCalendarIsoV3,
  agendaCalendarParseDateV3,
  agendaCalendarTimeToHoursV3,
  agendaCalendarEventEndV3,
  controlCenterMaterialRowsV1,
  stageOf,
  esc,
  DateCtor = globalThis.Date,
} = {}) => {
  for (const [name, value] of Object.entries({
    agendaCalendarIsoV3,
    agendaCalendarParseDateV3,
    agendaCalendarTimeToHoursV3,
    agendaCalendarEventEndV3,
    controlCenterMaterialRowsV1,
    stageOf,
    esc,
    DateCtor,
  }))
    if (typeof value !== "function")
      throw new TypeError(`Stage agenda helpers require ${name}().`);

  const stageAgendaNextSlotV1 = (events, durationHours = 1.5, from = new DateCtor()) => {
    const minutes = Math.max(30, Math.min(8 * 60, Math.ceil(Number(durationHours || 1.5) * 2) * 30));
    const beginning = new DateCtor(from);
    beginning.setMinutes(Math.ceil(beginning.getMinutes() / 30) * 30, 0, 0);
    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      const day = new DateCtor(beginning.getFullYear(), beginning.getMonth(), beginning.getDate() + dayOffset);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      const date = agendaCalendarIsoV3(day);
      for (let startMinute = 8 * 60; startMinute + minutes <= 18 * 60; startMinute += 30) {
        const candidate = new DateCtor(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(startMinute / 60), startMinute % 60);
        if (candidate < beginning) continue;
        const end = candidate.getTime() + minutes * 60000;
        const conflict = (events || []).some((event) => {
          const eventDay = agendaCalendarParseDateV3(event.date);
          if (!eventDay) return false;
          const start = new DateCtor(eventDay.getFullYear(), eventDay.getMonth(), eventDay.getDate(), Math.floor(agendaCalendarTimeToHoursV3(event.start)), Math.round(agendaCalendarTimeToHoursV3(event.start) % 1 * 60)).getTime();
          return candidate.getTime() < agendaCalendarEventEndV3(event) && end > start;
        });
        if (!conflict) return { date, start: `${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}` };
      }
    }
    return null;
  };

  const stageAgendaMaterialSidebarV1 = (stage, state) => {
    const materials = controlCenterMaterialRowsV1(state).filter((item) => String(item.stageKey) === String(stage.key));
    const records = (state.records || []).filter((record) => String(stageOf(record) || "").toLocaleLowerCase("pt-BR") === stage.name.toLocaleLowerCase("pt-BR"));
    return `<aside class="stage-agenda-material-sidebar" data-stage-agenda-material-sidebar><header><span class="activity-kind">MATERIAIS DA ETAPA</span><h2>Materiais por atividade</h2><p>Passe sobre uma atividade para destacar seus materiais. Expanda um item para ver todos os dados e o comprovante.</p><button type="button" data-stage-material-show-all>Mostrar todos</button></header><div class="stage-agenda-material-accordions">${materials.length ? materials.map((material) => {
      const proof = records.find((record) => {
        const relation = `${record.detalhes || ""} ${record.materialId || ""} ${record.materialName || ""} ${JSON.stringify(record.properties || [])}`.toLocaleLowerCase("pt-BR");
        return Boolean(record.evidenceUri || record.comprovante || record.evidencias?.length || record.attachments?.length) && (relation.includes(String(material.id || "").toLocaleLowerCase("pt-BR")) || relation.includes(String(material.name || "").toLocaleLowerCase("pt-BR")));
      });
      const source = proof?.attachments?.[0]?.fileName || proof?.evidencias?.[0]?.fileName || proof?.comprovante || proof?.evidenceUri || "";
      const proofName = typeof source === "string" && !/^(data:|blob:)/i.test(source) ? source.split(/[\\/]/).pop()?.slice(0, 90) : "Arquivo anexado";
      return `<details class="stage-agenda-material-item" data-stage-material-id="${esc(material.id || "")}" data-stage-material-activity="${esc(material.activityName || "")}"><summary><b>${esc(material.name)}</b><small>${esc(material.status || "Planejado")}</small></summary><div class="stage-agenda-material-details"><dl><div><dt>ID</dt><dd>${esc(material.id || "Não informado")}</dd></div><div><dt>Atividade</dt><dd>${esc(material.activityName || "Sem vínculo direto")}</dd></div><div><dt>Quantidade</dt><dd>${material.quantity == null ? "A dimensionar" : `${esc(material.quantity)} ${esc(material.unit || "un.")}`}</dd></div><div><dt>Descrição / escopo</dt><dd>${esc(material.description || material.scope || "Não informado")}</dd></div><div><dt>Etapa</dt><dd>${esc(stage.name)}</dd></div><div><dt>Comprovante</dt><dd>${proof ? `${esc(proofName || "Arquivo anexado")} · Diário da etapa, registro ${esc(proof.id || "sem ID")}` : "Sem comprovante vinculado"}</dd></div></dl></div></details>`;
    }).join("") : '<p class="stage-agenda-material-empty">Nenhum material configurado para esta etapa.</p>'}</div></aside>`;
  };

  return Object.freeze({ stageAgendaNextSlotV1, stageAgendaMaterialSidebarV1 });
};

/** Build the dedicated stage agenda page from injected application services. */
export const createStageAgendaPageV1 = ({
  appStore,
  executionModel,
  stageV9ByState,
  stageV9FlowPackets,
  agendaCalendarReadV3,
  agendaCalendarOperationalEventsV3,
  controlCenterMaterialRowsV1,
  stageAgendaNextSlotV1,
  stageV9LiveFor,
  stageAgendaMaterialSidebarV1,
  stageV9DedicatedAgendaBase,
  esc,
} = {}) => {
  for (const method of ["get"])
    if (typeof appStore?.[method] !== "function")
      throw new TypeError(`Stage agenda page requires appStore.${method}().`);
  for (const [name, value] of Object.entries({
    stageV9ByState,
    stageV9FlowPackets,
    agendaCalendarReadV3,
    agendaCalendarOperationalEventsV3,
    controlCenterMaterialRowsV1,
    stageAgendaNextSlotV1,
    stageV9LiveFor,
    stageAgendaMaterialSidebarV1,
    esc,
  }))
    if (typeof value !== "function")
      throw new TypeError(`Stage agenda page requires ${name}().`);
  if (!Array.isArray(executionModel?.stages))
    throw new TypeError("Stage agenda page requires executionModel.stages.");
  if (typeof stageV9DedicatedAgendaBase !== "function")
    throw new TypeError("Stage agenda page requires its base page renderer.");

  return function (...args) {
    const state = appStore.get();
    const stage = stageV9ByState(state) || executionModel.stages[0];
    const packets = stageV9FlowPackets(stage);
    const agendaData = agendaCalendarReadV3();
    const storedEvents = agendaData.initialized ? agendaData.events : agendaCalendarOperationalEventsV3(state);
    const agenda = [...storedEvents, ...(state.operationalAgenda || []), ...(state.stageAgendaItems || [])];
    const materials = controlCenterMaterialRowsV1(state).filter((item) => String(item.stageKey) === String(stage.key));
    const suggested = stageAgendaNextSlotV1(agenda);
    const list = packets.map((packet, index) => {
      const appointment = agenda.find((item) =>
        String(item.stageKey || item.stage || "").toLocaleLowerCase("pt-BR") === stage.key.toLocaleLowerCase("pt-BR") &&
        String(item.activityName || item.activity || item.title || "").toLocaleLowerCase("pt-BR") === packet.label.toLocaleLowerCase("pt-BR"),
      );
      const date = appointment?.date || appointment?.plannedStart?.slice?.(0, 10);
      const when = date ? `${esc(date)}${appointment.start || appointment.time ? ` · ${esc(appointment.start || appointment.time)}` : ""}` : "Sem agendamento";
      const status = appointment?.status || (index === 0 && Number(stageV9LiveFor(stage).progress) > 0 ? "Em andamento" : "Planejada");
      return `<button type="button" class="stage-agenda-activity-row" data-activity-v9="${esc(`${stage.key}:${packet.key}`)}" data-stage-activity-focus="${esc(packet.label)}"><span class="stage-agenda-activity-index">${String(index + 1).padStart(2, "0")}</span><span class="stage-agenda-activity-main"><strong>${esc(packet.label)}</strong><small>${esc(packet.detail)}</small><em>${when} · ${esc(packet.unit)}</em></span><span class="stage-agenda-activity-status">${esc(status)}</span><span class="stage-agenda-activity-open">Abrir atividade ↗</span></button>`;
    }).join("");
    const customEvents = storedEvents.filter((item) => String(item.stageKey) === String(stage.key) && item.stageAgendaCustomV1);
    const customList = customEvents.map((item, index) => `<button type="button" class="stage-agenda-activity-row stage-agenda-custom-row" data-stage-agenda-event-open="${esc(item.id)}" data-stage-material-ids="${esc((item.materialIds || []).join(","))}"><span class="stage-agenda-activity-index">${String(packets.length + index + 1).padStart(2, "0")}</span><span class="stage-agenda-activity-main"><strong>${esc(item.title)}</strong><small>${esc(item.notes || "Atividade adicionada à agenda da etapa")}</small><em>${esc(item.date)} · ${esc(item.start)} · ${esc(item.durationHours)} h</em></span><span class="stage-agenda-activity-status">${esc(item.status || "Planejado")}</span><span class="stage-agenda-activity-open">Abrir agenda ↗</span></button>`).join("");
    const section = `<section class="stage-v9-flow-section stage-agenda-activities" aria-labelledby="stage-agenda-activities-title"><header><div><span class="activity-kind">AGENDA DA ETAPA · ${esc(stage.key.toUpperCase())}</span><h2 id="stage-agenda-activities-title">Lista de atividades</h2><p>Selecione uma atividade. À esquerda, os materiais relacionados aparecem em accordions com detalhes e comprovantes.</p></div><span class="stage-v9-flow-note">${packets.length + customEvents.length} atividades</span></header><div class="stage-agenda-activity-list">${list}${customList}</div></section>`;
    const dependency = (stage.dependsOn || []).filter((key) => {
      const preceding = executionModel.stages.find((item) => item.key === key);
      return preceding && Number(stageV9LiveFor(preceding).progress) < 100;
    });
    const form = `<aside class="stage-agenda-create-sidebar"><header><span class="activity-kind">NOVA ATIVIDADE · ${esc(stage.name)}</span><h2>Adicionar à agenda</h2><p>O encaixe sugere a primeira janela útil livre e preserva o vínculo com esta etapa.</p></header><form data-stage-agenda-create-form data-stage-key="${esc(stage.key)}"><label>Nome da atividade<input name="title" required maxlength="160" placeholder="Ex.: Conferir compactação"></label><label>Descrição / entrega<textarea name="notes" rows="3" maxlength="1200" placeholder="O que deve ser feito e comprovado"></textarea></label><label>Vincular ao fluxo<select name="relatedPacket"><option value="">Atividade independente</option>${packets.map((packet) => `<option value="${esc(packet.key)}">${esc(packet.label)}</option>`).join("")}</select></label><label>Responsável<input name="owner" value="${esc(stageV9LiveFor(stage).owner || "")}" placeholder="Equipe ou encarregado"></label><div class="stage-agenda-form-pair"><label>Duração (h)<input name="durationHours" type="number" min="0.5" max="8" step="0.5" value="1.5" required></label><label>Status<select name="status"><option>Planejado</option><option>Pendente</option><option>Em andamento</option></select></label></div><div class="stage-agenda-form-pair"><label>Data<input name="date" type="date" value="${esc(suggested?.date || "")}" required></label><label>Hora<input name="start" type="time" step="1800" value="${esc(suggested?.start || "08:00")}" required></label></div><button type="button" class="stage-agenda-suggest-button" data-stage-agenda-suggest>Recalcular encaixe livre</button><fieldset><legend>Materiais relacionados</legend><div class="stage-agenda-form-materials">${materials.map((item) => `<label><input type="checkbox" name="materialIds" value="${esc(item.id || "")}"> ${esc(item.name)}</label>`).join("") || "<small>Nenhum material cadastrado.</small>"}</div></fieldset><div class="stage-agenda-fit" data-stage-agenda-fit role="status"><b>Encaixe sugerido</b><span>${suggested ? `${esc(suggested.date)} · ${esc(suggested.start)} · sem conflito na agenda` : "Sem janela livre nos próximos 90 dias"}</span><small>${dependency.length ? `Dependências a confirmar: ${esc(dependency.join(", "))}.` : "Etapa sem dependência pendente identificada."}</small></div><button type="submit" class="stage-agenda-create-submit">Adicionar atividade</button></form></aside>`;
    const workspace = `<div class="stage-agenda-workspace">${stageAgendaMaterialSidebarV1(stage, state)}${section}${form}</div>`;
    let html = stageV9DedicatedAgendaBase.apply(this, args) || "";
    const start = html.indexOf('<section class="stage-v9-flow-section">');
    const end = start < 0 ? -1 : html.indexOf("</section>", start);
    if (start >= 0 && end >= 0) html = html.slice(0, start) + workspace + html.slice(end + "</section>".length);
    return html
      .replace('<section class="stage-v9-dedicated-page">', '<section class="stage-v9-dedicated-page stage-agenda-page">')
      .replace(`<h1>${esc(stage.name)}</h1>`, `<h1>Agenda de atividades</h1><p class="stage-v9-agenda-stage-name">${esc(stage.name)}</p>`);
  };
};

/** Install the page's focus, appointment, and persistent-create event routes. */
export const installStageAgendaPageEventsV1 = (ViewLayer, {
  appStore,
  executionModel,
  stageV9FlowPackets,
  agendaCalendarReadV3,
  agendaCalendarOperationalEventsV3,
  agendaCalendarParseDateV3,
  agendaCalendarTimeToHoursV3,
  agendaCalendarEventEndV3,
  agendaCalendarWriteV3,
  agendaCalendarWeekKeyV8,
  stageAgendaNextSlotV1,
  FormData: BrowserFormData,
} = {}) => {
  if (typeof ViewLayer?.prototype?.bind !== "function")
    throw new TypeError("Stage agenda events require ViewLayer.prototype.bind().");
  for (const method of ["get", "set"])
    if (typeof appStore?.[method] !== "function")
      throw new TypeError(`Stage agenda events require appStore.${method}().`);
  for (const [name, value] of Object.entries({
    stageV9FlowPackets,
    agendaCalendarReadV3,
    agendaCalendarOperationalEventsV3,
    agendaCalendarParseDateV3,
    agendaCalendarTimeToHoursV3,
    agendaCalendarEventEndV3,
    agendaCalendarWriteV3,
    agendaCalendarWeekKeyV8,
    stageAgendaNextSlotV1,
    BrowserFormData,
  }))
    if (typeof value !== "function")
      throw new TypeError(`Stage agenda events require ${name}().`);
  if (!Array.isArray(executionModel?.stages))
    throw new TypeError("Stage agenda events require executionModel.stages.");

  const bindBeforeStageAgendaWorkspaceV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeStageAgendaWorkspaceV1?.apply(this, args);
    const page = this.querySelector(".stage-agenda-page");
    if (!page) return result;
    const sidebar = page.querySelector("[data-stage-agenda-material-sidebar]");
    const materialCards = [...(sidebar?.querySelectorAll(".stage-agenda-material-item") || [])];
    page.querySelectorAll(".stage-agenda-activity-row").forEach((row) => {
      const focusMaterials = () => {
        const activity = row.dataset.stageActivityFocus || "";
        const ids = new Set(String(row.dataset.stageMaterialIds || "").split(",").filter(Boolean));
        let first = true;
        materialCards.forEach((card) => {
          const matches = ids.size ? ids.has(card.dataset.stageMaterialId) : card.dataset.stageMaterialActivity === activity;
          card.hidden = !matches;
          if (matches && first) { card.open = true; first = false; }
        });
        sidebar?.classList.toggle("is-filtered", Boolean(activity || ids.size));
      };
      row.addEventListener("mouseenter", focusMaterials);
      row.addEventListener("focus", focusMaterials);
    });
    sidebar?.querySelector("[data-stage-material-show-all]")?.addEventListener("click", () => {
      materialCards.forEach((card) => { card.hidden = false; });
      sidebar.classList.remove("is-filtered");
    });
    page.querySelectorAll("[data-stage-agenda-event-open]").forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault(); event.stopPropagation();
      appStore.set({ view: "agenda", selectedAgendaEventV3: button.dataset.stageAgendaEventOpen, lastAction: "Abriu atividade na agenda" });
    }));
    const form = page.querySelector("[data-stage-agenda-create-form]");
    if (!form) return result;
    const feedback = page.querySelector("[data-stage-agenda-fit]");
    const suggest = () => {
      const data = agendaCalendarReadV3();
      const events = data.initialized ? data.events : agendaCalendarOperationalEventsV3(appStore.get());
      const slot = stageAgendaNextSlotV1(events, Number(form.elements.durationHours.value) || 1.5);
      if (slot) { form.elements.date.value = slot.date; form.elements.start.value = slot.start; }
      const label = feedback?.querySelector("span");
      if (label) label.textContent = slot ? `${slot.date} · ${slot.start} · sem conflito na agenda` : "Sem janela livre nos próximos 90 dias";
    };
    form.querySelector("[data-stage-agenda-suggest]")?.addEventListener("click", suggest);
    form.elements.durationHours?.addEventListener("change", suggest);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new BrowserFormData(form));
      const stage = executionModel.stages.find((item) => item.key === form.dataset.stageKey);
      const date = String(values.date || ""), start = String(values.start || "");
      const durationHours = Number(values.durationHours);
      const day = agendaCalendarParseDateV3(date);
      const startHour = agendaCalendarTimeToHoursV3(start);
      const label = feedback?.querySelector("span");
      if (!stage || !day || day.getDay() === 0 || day.getDay() === 6 || !Number.isFinite(durationHours) || durationHours < 0.5 || durationHours > 8 || startHour < 8 || startHour + durationHours > 18) {
        if (label) label.textContent = "Escolha um dia útil entre 08:00 e 18:00, com duração de 0,5 a 8 horas.";
        return;
      }
      const stored = agendaCalendarReadV3();
      const data = stored.initialized ? stored : { ...stored, events: agendaCalendarOperationalEventsV3(appStore.get()) };
      const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(startHour), Math.round(startHour % 1 * 60)).getTime();
      const slotEnd = slotStart + durationHours * 3600000;
      const conflict = (data.events || []).some((item) => {
        const eventDay = agendaCalendarParseDateV3(item.date);
        if (!eventDay) return false;
        const hour = agendaCalendarTimeToHoursV3(item.start);
        const otherStart = new Date(eventDay.getFullYear(), eventDay.getMonth(), eventDay.getDate(), Math.floor(hour), Math.round(hour % 1 * 60)).getTime();
        return slotStart < agendaCalendarEventEndV3(item) && slotEnd > otherStart;
      });
      if (conflict) { if (label) label.textContent = "Horário ocupado. Use “Recalcular encaixe livre”."; return; }
      const title = String(values.title || "").trim();
      if (!title) return;
      const packet = stageV9FlowPackets(stage).find((item) => item.key === values.relatedPacket);
      const id = `agenda-stage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const next = { id, title, stageKey: stage.key, stageName: stage.name, activityId: packet ? `${stage.key}:${packet.key}` : id, activityName: title, relatedPacket: packet?.key || "", owner: String(values.owner || "").trim(), date, start, durationHours, spanDays: 1, status: String(values.status || "Planejado"), notes: String(values.notes || "").trim(), materialIds: new BrowserFormData(form).getAll("materialIds").map(String).filter(Boolean), stageAgendaCustomV1: true };
      agendaCalendarWriteV3({ ...data, events: [...(data.events || []), next] });
      if (!agendaCalendarReadV3().events.some((item) => item.id === id)) { if (label) label.textContent = "Não foi possível salvar na agenda deste navegador."; return; }
      appStore.set({ stageAgendaItems: [...(appStore.get().stageAgendaItems || []), next], agendaCalendarWeekV8: agendaCalendarWeekKeyV8(date), lastAction: `Adicionou atividade ${title} à agenda de ${stage.name}` });
      this.render();
    });
    return result;
  };
  return ViewLayer;
};
