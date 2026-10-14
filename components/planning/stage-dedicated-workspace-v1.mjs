/** Dedicated stage workspace renderer and context controls. */
export const installStageDedicatedWorkspaceV1 = (ViewLayer, {
  appStore,
  demoData,
  extensionStage,
  stageMaterialsFor,
  stagePlanningMarkup,
  esc,
  ico,
  notify,
  readIntegrationSettings,
  splitStageConfigList,
  integrationSettingsKey,
  localStorage: localStorageRef = globalThis.localStorage,
  window: windowRef = globalThis.window,
  prompt: promptRef = (...args) => globalThis.prompt(...args),
} = {}) => {
  const documentRef = globalThis.document;
ViewLayer.prototype.addStageUtilities = function () {
    const shell = this.querySelector(".stage-shell");
    if (!shell || shell.querySelector(".stage-utilities")) return;
    const stage = extensionStage(),
      agenda = (appStore.get().operationalAgenda || [])
        .filter((item) => item.stageName === stage.name)
        .slice(0, 3),
      agendaRows = agenda.length
        ? agenda
            .map(
              (item) =>
                `<label><input type="checkbox"> ${esc(item.title)} <small>${esc(item.plannedStart || "Hoje")} · ${esc(item.owner || "Responsável a definir")}</small></label>`,
            )
            .join("")
        : `<label><input type="checkbox"> Confirmar medição da drenagem <small>08:30 · Carlos Mendes</small></label><label><input type="checkbox"> Validar recebimento de tubos <small>10:00 · Paula Nascimento</small></label><label><input type="checkbox"> Liberar frente seguinte <small>16:00 · Mariana Lopes</small></label>`;
    const nextDue = agenda[0]?.plannedStart || "hoje";
    const panel = documentRef.createElement("section");
    panel.className = "stage-utilities";
    panel.innerHTML = `<div class="utility-tabs"><button class="utility-tab active" data-utility-tab="cronograma">${ico("calendar-clock")} Cronograma / Agenda</button><button class="utility-tab" data-utility-tab="canvas">${ico("workflow")} Canvas organizacional</button></div><div class="utility-content"><div class="agenda-summary"><div><span class="activity-kind">AGENDA DA ETAPA · HOJE</span><h3>Afazeres operacionais</h3><p>Conecte a equipe, confirme presença e avise os envolvidos.</p></div><button class="whatsapp-action">${ico("message-circle")} Enviar agenda no WhatsApp</button></div><div class="todo-grid">${agendaRows}</div><div class="agenda-actions"><button class="agenda-action">＋ Adicionar afazer</button><button class="alert-action">${ico("bell-ring")} Criar alerta de prazo</button><span class="agenda-status">Próximo alerta: ${esc(nextDue)}</span></div></div>`;
    shell.appendChild(panel);
    panel.querySelectorAll("[data-utility-tab]").forEach((tab) =>
      tab.addEventListener("click", () => {
        panel
          .querySelectorAll(".utility-tab")
          .forEach((x) => x.classList.remove("active"));
        tab.classList.add("active");
        notify(
          tab.dataset.utilityTab === "cronograma"
            ? "Agenda da etapa ativada."
            : "Canvas organizacional ativado.",
        );
      }),
    );
    panel.querySelector(".whatsapp-action").addEventListener("click", () => {
      notify(
        "Agenda preparada para envio aos envolvidos via WhatsApp.",
        "success",
      );
      appStore.set({ lastAction: "Enviou agenda da etapa via WhatsApp" });
    });
    panel.querySelector(".agenda-action").addEventListener("click", () => {
      const label = promptRef("Descreva o novo afazer da etapa:");
      if (label?.trim()) {
        const item = documentRef.createElement("label");
        item.innerHTML = `<input type="checkbox"> ${esc(label.trim())} <small>Agora · responsável a definir</small>`;
        panel.querySelector(".todo-grid").appendChild(item);
        notify("Afazer adicionado à agenda.", "success");
        appStore.set({ lastAction: "Adicionou afazer na agenda" });
      }
    });
    panel.querySelector(".alert-action").addEventListener("click", () => {
      notify("Alerta criado para o prazo da etapa.", "warning");
      appStore.set({ lastAction: "Criou alerta de prazo" });
    });
  };
ViewLayer.prototype.openDedicatedStage = function () {
    const s =
      demoData.activities.find((x) => x.id === appStore.get().selectedStage) ||
      demoData.activities[1];
    this.innerHTML = `<div class="stage-dedicated"><button class="ghost" data-back-stages>${ico("arrow-left")} Voltar para todas as etapas</button><div class="dedicated-head"><div><span class="activity-kind">PÁGINA DEDICADA · ETAPA ${s.id} DE 18</span><h1>${s.name}</h1><p>${s.week} · ${s.owner} · acompanhamento operacional</p></div><span class="stage-dedicated-progress">${s.progress}%</span></div><div class="dedicated-grid"><section class="dedicated-panel"><h3>Resumo executivo</h3><p>Orçamento previsto <b>R$ 24.850,00</b></p><p>Realizado <b>R$ 16.120,00</b></p><p>Saldo <b>R$ 8.730,00</b></p></section><section class="dedicated-panel"><h3>Responsáveis</h3><p><b>${s.owner}</b><br>Execução da frente</p><p><b>Paula Nascimento</b><br>Planejamento e medição</p></section><section class="dedicated-panel"><h3>Compras e materiais</h3>${
      stageMaterialsFor(s.name).length
        ? stageMaterialsFor(s.name)
            .map(
              (item) =>
                `<p><b>${esc(item.name)}</b> · ${item.quantity == null ? esc(item.scope) : `${esc(item.quantity)} ${esc(item.unit)} · ${esc(item.scope)}`}</p>`,
            )
            .join("")
        : "<p>PE-2025-040 · Tubo PEAD Ø600mm</p><p>Tubos PVC · 780 m em uso</p><p>Cimento · 150 sc em uso</p>"
    }</section>${stagePlanningMarkup(s)}</div><section class="dedicated-canvas"><div class="canvas-guide"><b>Superfície livre de atividades</b><span>Arraste, conecte e acompanhe as relações desta etapa</span></div><div class="dedicated-activity" style="left:30px;top:90px"><span class="activity-kind">ATIVIDADE PRINCIPAL</span><strong>Executar ${s.name}</strong><small>${s.owner} · ${s.progress}%</small></div><div class="dedicated-activity" style="left:360px;top:220px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar medição e materiais</strong><small>Paula Nascimento · pendente</small></div><div class="dedicated-activity" style="left:700px;top:100px"><span class="activity-kind">PRÓXIMA AÇÃO</span><strong>Liberar próxima frente</strong><small>Dependência da conclusão atual</small></div></section></div>`;
    windowRef.lucide?.createIcons();
    this.querySelector("[data-back-stages]")?.addEventListener("click", () =>
      this.render(),
    );
  };
ViewLayer.prototype.bindDedicatedStageContext = function () {
    const form = this.querySelector("[data-stage-context-form]");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const stageKey = form.dataset.stageContextForm;
      const settings = {
        ...(readIntegrationSettings() || {}),
        ...(appStore.get().integrationSettings || {}),
      };
      const nextProfile = {
        requirements: splitStageConfigList(
          form.querySelector('[name="requirements"]')?.value,
        ),
        conditions: splitStageConfigList(
          form.querySelector('[name="conditions"]')?.value,
        ),
        typicalDescription:
          form.querySelector('[name="typicalDescription"]')?.value || "",
        requestHints: splitStageConfigList(
          form.querySelector('[name="requestHints"]')?.value,
        ),
        evidenceFocus: splitStageConfigList(
          form.querySelector('[name="evidenceFocus"]')?.value,
        ),
        procurementFocus: splitStageConfigList(
          form.querySelector('[name="procurementFocus"]')?.value,
        ),
        materialsTable: [...form.querySelectorAll("[data-stage-material-row]")]
          .map((item) => ({
            name: item.querySelector('[name="materialName"]')?.value || "",
            description:
              item.querySelector('[name="materialDescription"]')?.value || "",
            quantity:
              item.querySelector('[name="materialQuantity"]')?.value || "",
            unit: item.querySelector('[name="materialUnit"]')?.value || "",
            status: item.querySelector('[name="materialStatus"]')?.value || "",
          }))
          .filter((item) => item.name || item.description || item.quantity),
        notificationTargets: {
          owner: splitStageConfigList(
            form.querySelector('[name="notifyOwner"]')?.value,
          ),
          admin: splitStageConfigList(
            form.querySelector('[name="notifyAdmin"]')?.value,
          ),
          foreman: splitStageConfigList(
            form.querySelector('[name="notifyForeman"]')?.value,
          ),
        },
      };
      const data = {
        ...settings,
        stageProfiles: {
          ...(settings.stageProfiles || {}),
          [stageKey]: nextProfile,
        },
      };
      localStorageRef.setItem(integrationSettingsKey, JSON.stringify(data));
      appStore.set({
        integrationSettings: data,
        lastAction: `Salvou contexto operacional da etapa ${stageKey}`,
      });
      await this.runOperationalLoop("stage.context.changed", { quiet: true });
      const status = this.querySelector("[data-stage-context-status]");
      if (status)
        status.textContent =
          "Contexto salvo. O ciclo operacional já recebeu a descrição, os materiais quantificados e os destinos desta etapa.";
      notify("Contexto da etapa salvo e propagado para o agente.", "success");
    });
    this.querySelectorAll("[data-add-stage-material]").forEach((button) =>
      button.addEventListener("click", () => {
        const target = form.querySelector(
          `[data-stage-materials="${button.dataset.addStageMaterial}"]`,
        );
        if (!target) return;
        target.insertAdjacentHTML(
          "beforeend",
          '<tr data-stage-material-row><td><input name="materialName" placeholder="Ex.: Tubo PEAD"></td><td><input name="materialDescription" placeholder="Escopo, bitola, uso..."></td><td><input name="materialQuantity" inputmode="decimal" placeholder="0"></td><td><input name="materialUnit" placeholder="m, un, m²"></td><td><input name="materialStatus" placeholder="Planejado"></td></tr>',
        );
      }),
    );
  };
  return ViewLayer;
};

