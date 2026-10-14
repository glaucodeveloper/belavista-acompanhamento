/** Original ViewLayer class extracted from components.js; prototype extensions remain installed by the entry module. */
export const createViewLayerV1 = (dependencies = {}) => {
  const { appStore, ico, document, notify, demoData, activityCatalog, esc, stageMaterialsMarkup, apiFetch, subscribePublicLeads, readIntegrationSettings, operationalHeaders, stageProfilesFromSettings, publishOperationalRealtime, subscribeOperationalNotifications, normalizeOperationalRole, actorCanOpenView, isForemanUser, isLimitedOperationalActor, renderStageHomePageV1, stageHomeSnapshotV1, stageHomePageMarkupV1, reportCatalog, syncLiveSystemReportV1, stageOverlayKey, stageOverlayLabels, statusClass } = dependencies;
  class ViewLayer extends HTMLElement {
    records() {
      const s = appStore.get(),
        editing = s.records.find((r) => r.id === s.editingRecord),
        rows = s.records
          .map(
            (r) =>
              `<article class="record-card"><div><span class="record-id">${r.id}</span><strong>${r.atividade}</strong><small>${r.data} · ${r.hora} · ${r.responsavel}</small></div><span class="record-status">${r.status}</span><div class="record-actions"><button data-record-edit="${r.id}">Editar</button><button data-record-delete="${r.id}">Excluir</button></div></article>`,
          )
          .join("");
      return `<div class="records-page"><div class="records-map-wash"></div><div class="records-shell"><div class="records-head"><div><span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1><p>Obra → atividade → evidência → responsável → confirmação.</p></div><button class="records-new">＋ Novo registro</button></div><div class="records-layout"><section class="records-list"><div class="records-list-head"><b>${s.records.length} registros</b><small>SQLite local · entidades relacionais</small></div>${rows || '<div class="empty-records">Nenhum registro cadastrado.</div>'}</section><aside class="records-form-wrap ${editing ? "open" : ""}"><form class="record-form"><h2>${editing ? "Editar registro" : "Adicionar registro"}</h2><label>Obra<select name="obra"><option>Aliança Park</option><option>Aliança Park</option></select></label><label>Atividade<select name="atividade"><option>Drenagem Pluvial</option><option>Pavimentação</option><option>Rede de Água</option><option>Rede Elétrica</option></select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${editing?.data || new Date().toISOString().slice(0, 10)}"></label><label>Hora<input name="hora" type="time" value="${editing?.hora || "08:30"}"></label></div><label>Responsável<input name="responsavel" value="${editing?.responsavel || ""}" placeholder="Nome do envolvido"></label><label>Detalhes<textarea name="detalhes" placeholder="Descreva a evidência, medição ou ocorrência">${editing?.detalhes || ""}</textarea></label><label>Status<select name="status"><option ${editing?.status === "Pendente" ? "selected" : ""}>Pendente</option><option ${editing?.status === "Concluído" ? "selected" : ""}>Concluído</option></select></label><button class="record-confirm">${editing ? "Salvar alterações" : "Confirmar registro"}</button>${editing ? '<button type="button" class="record-cancel">Cancelar</button>' : ""}</form></aside></div><div class="phone-preview"><div class="phone-frame"><div class="phone-notch"></div><div class="phone-screen"><b>Registros</b>${s.records
        .slice(0, 3)
        .map(
          (r) =>
            `<div><small>${r.data} · ${r.hora}</small><strong>${r.atividade}</strong><span>${r.status}</span></div>`,
        )
        .join(
          "",
        )}</div></div><small>Prévia da interface mobile</small></div></div></div>`;
    }
    splitStageTabs() {
      const panel = this.querySelector(".stage-utilities");
      if (!panel || panel.dataset.split) return;
      panel.dataset.split = "true";
      const tabs = panel.querySelector(".utility-tabs"),
        content = panel.querySelector(".utility-content"),
        original = panel.querySelector(".utility-tab");
      original.dataset.utilityTab = "agenda";
      original.innerHTML = `${ico("calendar-days")} Agenda`;
      tabs.insertAdjacentHTML(
        "afterbegin",
        `<button class="utility-tab active" data-utility-tab="cronograma">${ico("calendar-clock")} Cronograma</button>`,
      );
      tabs.insertAdjacentHTML(
        "beforeend",
        `<button class="utility-tab" data-utility-tab="afazeres">${ico("list-checks")} A Fazeres</button>`,
      );
      original.classList.remove("active");
      content.dataset.utilityPane = "agenda";
      const cron = document.createElement("div");
      cron.className = "utility-pane";
      cron.dataset.pane = "cronograma";
      cron.innerHTML =
        '<div class="timeline-utility"><span class="activity-kind">CRONOGRAMA DA ETAPA</span><h3>Dependências e marcos</h3><div class="mini-timeline"><b>Início</b><i></i><b>Medição</b><i></i><b>Validação</b><i></i><b>Conclusão</b></div><p>Agenda, afazeres e canvas permanecem vinculados à mesma etapa.</p></div>';
      content.before(cron);
      const todo = document.createElement("div");
      todo.className = "utility-pane";
      todo.dataset.pane = "afazeres";
      todo.innerHTML =
        '<div class="todo-focus"><span class="activity-kind">A FAZERES DA ETAPA</span><h3>Execução diária</h3><p>Itens pendentes, responsáveis e alertas de prazo.</p><div class="todo-grid"></div><button class="agenda-action">＋ Adicionar afazer</button></div>';
      panel.appendChild(todo);
      todo
        .querySelector(".todo-grid")
        .append(...content.querySelectorAll(".todo-grid label"));
      const show = (name) => {
        tabs
          .querySelectorAll(".utility-tab")
          .forEach((x) =>
            x.classList.toggle("active", x.dataset.utilityTab === name),
          );
        cron.hidden = name !== "cronograma";
        content.hidden = name !== "agenda";
        todo.hidden = name !== "afazeres";
        notify(`${name[0].toUpperCase() + name.slice(1)} da etapa ativada.`);
      };
      tabs
        .querySelectorAll(".utility-tab")
        .forEach((tab) =>
          tab.addEventListener("click", () => show(tab.dataset.utilityTab)),
        );
      show("cronograma");
    }
    activityBlueprint() {
      const state = appStore.get(),
        stage =
          demoData.activities.find((item) => item.id === state.selectedStage) ||
          demoData.activities[1];
      const requested = String(
          state.selectedActivity || "Executar atividade principal",
        ),
        term = stage.name.toLowerCase().split(" ")[0];
      const catalog =
        activityCatalog.find(
          (item) => item.name.toLowerCase() === requested.toLowerCase(),
        ) ||
        activityCatalog.find(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            item.nature.toLowerCase().includes(term),
        );
      return {
        stage,
        name: requested,
        nature: catalog?.nature || stage.name,
        initial: catalog?.initial || [
          "Frente de serviço",
          "Responsável",
          "Data prevista",
        ],
        execution: catalog?.execution || [
          "Avanço executado",
          "Medição",
          "Comprovante fotográfico",
          "Pendências",
          "Próximo passo",
        ],
      };
    }
    openActivityPage(name, stageName = "") {
      const stageId = demoData.activities.find(
        (item) => item.name === stageName,
      )?.id;
      appStore.set({
        selectedActivity: name,
        activityDedicated: true,
        ...(stageId ? { selectedStage: stageId } : {}),
        lastAction: `Abriu atividade ${name}`,
      });
    }
    activityDedicatedPage() {
      const item = this.activityBlueprint(),
        initial = item.initial,
        execution = item.execution;
      const steps = [
        [
          "01",
          "Escopo e frente",
          `Definir ${initial.slice(0, 3).join(", ")}`,
          "brief",
          "plan",
        ],
        [
          "02",
          "Preparação",
          `Validar ${initial.slice(0, 2).join(" e ")}`,
          "plan",
          "execute",
        ],
        [
          "03",
          "Execução",
          `Registrar ${execution.slice(0, 3).join(", ")}`,
          "execute",
          "measure",
        ],
        [
          "04",
          "Medição",
          `Conferir ${execution.slice(3, 5).join(" e ") || "quantidade e avanço"}`,
          "measure",
          "evidence",
        ],
        [
          "05",
          "Evidências",
          `Anexar ${execution.slice(-2).join(" e ")}`,
          "evidence",
          "close",
        ],
        [
          "06",
          "Encerramento",
          "Validar pendências e liberar o próximo passo",
          "close",
          "",
        ],
      ];
      const stepCards = steps
        .map(
          (step, index) =>
            `<article class="activity-step-card workflow-card" data-step-id="${step[3]}" data-next="${step[4]}" style="left:${28 + (index % 3) * 300}px;top:${92 + Math.floor(index / 3) * 190}px"><span class="activity-kind">${step[0]} · ${esc(item.nature).toUpperCase()}</span><strong>${esc(step[1])}</strong><small>${esc(step[2])}</small><em>Etapa do fluxo →</em><span class="activity-step-port" aria-hidden="true"></span></article>`,
        )
        .join("");
      const people = demoData.collaborators
        .map(([name, role]) => `<option>${esc(name)} · ${esc(role)}</option>`)
        .join("");
      return `<div class="activity-dedicated-page"><div class="activity-dedicated-head"><button class="ghost" data-cmd="back-activity" data-view="stages">${ico("arrow-left")} Voltar para a etapa</button><div class="activity-dedicated-title"><span class="activity-kind">ATIVIDADE · ${esc(item.nature).toUpperCase()}</span><h1>${esc(item.name)}</h1><p>${esc(item.stage.name)} · ${esc(item.stage.week)} · ${esc(item.stage.owner)} · superfície de journaling operacional</p></div><div class="activity-dedicated-progress"><small>AVANÇO ATUAL</small><strong>${item.stage.progress}%</strong></div></div><div class="activity-dedicated-context"><section class="activity-description-card"><div class="activity-card-kicker">DESCRIÇÃO DA ATIVIDADE</div><h2>${esc(item.name)}</h2><p>Organize a execução de <b>${esc(item.name.toLowerCase())}</b> em passos verificáveis, relacionando responsáveis, materiais, compras, medições e evidências dentro da etapa <b>${esc(item.stage.name)}</b>.</p><div class="activity-context-tags"><span>${esc(item.nature)}</span><span>${esc(item.stage.owner)}</span><span>Etapa ${item.stage.id} de 18</span></div><div class="activity-associations"><div><small>COMPRAS ASSOCIADAS</small><b>PE-2025-040 · Tubo PEAD Ø600mm</b></div><div><small>MATERIAIS</small><b>${item.stage.name === "Rede de Água" ? "Tubos PEAD · 298 cavaletes · 298 ramais" : "Tubos PVC · Cimento · equipamentos"}</b></div><div><small>DEPENDÊNCIA</small><b>Conclusão da frente anterior</b></div></div>${stageMaterialsMarkup(item.stage.name)}</section><section class="activity-journal-card"><div class="activity-card-kicker">JOURNALING DE EXECUÇÃO</div><h2>Registrar atualização</h2><form class="activity-journal-form"><div class="activity-form-grid"><label>Data<input name="data" type="date" value="${new Date().toISOString().slice(0, 10)}"></label><label>Hora<input name="hora" type="time" value="08:30"></label><label>Avanço (%)<input name="percentual" type="number" min="0" max="100" value="${item.stage.progress}"></label><label>Status<select name="status"><option>Pendente</option><option selected>Em andamento</option><option>Concluído</option><option>Bloqueado</option></select></label></div><label>Responsável<select name="responsavel"><option>${esc(item.stage.owner)}</option>${people}</select></label><label>Descrição do diário<textarea name="detalhes" rows="4" placeholder="Descreva o que foi executado, medido ou encontrado…"></textarea></label><label>Evidências e comprovantes<textarea name="evidencias" rows="3" placeholder="Fotos, documentos, nota fiscal, medição ou link local"></textarea></label><div class="activity-journal-actions"><button type="button" class="ghost" data-cmd="activity-save-draft">Salvar rascunho</button><button type="submit" class="primary">${ico("save")} Registrar no diário</button></div></form></section></div><section class="activity-flow-card"><div class="activity-flow-head"><div><div class="activity-card-kicker">CANVAS DE PASSOS DA ATIVIDADE</div><h2>Superfície livre de execução</h2><p>Arraste os cards para organizar o fluxo. As conexões mostram a sequência de trabalho.</p></div><button class="ghost" data-cmd="activity-add-step">${ico("plus")} Adicionar passo</button></div><div class="activity-step-canvas" data-activity-step-canvas><svg class="activity-step-edges" aria-hidden="true"></svg>${stepCards}</div><div class="activity-step-inspector" data-step-inspector><span class="activity-kind">SELECIONE UM PASSO</span><p>Clique em um card para ver a orientação e os campos relacionados.</p></div></section><div class="activity-dedicated-footer"><span>${ico("database")} Diário vinculado à etapa, registros, compras e materiais</span><span>${item.initial.length} campos iniciais · ${item.execution.length} campos de execução</span></div></div>`;
    }
    bindActivityDedicated() {
      const page = this.querySelector(".activity-dedicated-page");
      if (!page) return;
      const back = this.querySelector('[data-cmd="back-activity"]');
      if (back) {
        back.removeAttribute("data-cmd");
        back.dataset.view = "stages";
        back.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          appStore.set({
            view: "stages",
            activityDedicated: false,
            selectedActivity: null,
            lastAction: "Voltou para as etapas",
          });
        });
      }
      this.querySelector('[data-cmd="activity-save-draft"]')?.addEventListener(
        "click",
        () => {
          notify("Rascunho do journaling salvo localmente.", "success");
          appStore.set({ lastAction: "Salvou rascunho da atividade" });
        },
      );
      this.querySelector(".activity-journal-form")?.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          const item = this.activityBlueprint(),
            data = new FormData(event.currentTarget),
            record = {
              id: `REG-${Date.now()}`,
              obra: "Aliança Park",
              atividade: item.name,
              etapa: item.stage.name,
              categoria: item.nature,
              responsavel: String(data.get("responsavel") || item.stage.owner),
              data: String(
                data.get("data") || new Date().toISOString().slice(0, 10),
              ),
              hora: String(data.get("hora") || "08:30"),
              detalhes: String(data.get("detalhes") || ""),
              evidenceUri: String(data.get("evidencias") || ""),
              status: String(data.get("status") || "Em andamento"),
              progresso: Number(data.get("percentual") || 0),
              createdAt: new Date().toISOString(),
            };
          appStore.update((state) => ({
            ...state,
            records: [record, ...(state.records || [])],
            lastAction: `Registrou journaling de ${item.name}`,
          }));
          notify("Atualização registrada no diário da atividade.", "success");
        },
      );
      const canvas = this.querySelector("[data-activity-step-canvas]");
      if (!canvas) return;
      const inspector = this.querySelector("[data-step-inspector]"),
        cards = [...canvas.querySelectorAll(".activity-step-card")];
      const draw = () => {
        const svg = canvas.querySelector(".activity-step-edges");
        svg.innerHTML = "";
        cards.forEach((card) => {
          const next = canvas.querySelector(
            `[data-step-id="${card.dataset.next}"]`,
          );
          if (!next) return;
          const x1 = card.offsetLeft + card.offsetWidth,
            y1 = card.offsetTop + card.offsetHeight / 2,
            x2 = next.offsetLeft,
            y2 = next.offsetTop + next.offsetHeight / 2,
            bend = Math.max(44, (x2 - x1) / 2),
            path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute(
            "d",
            `M${x1} ${y1} C${x1 + bend} ${y1},${x2 - bend} ${y2},${x2} ${y2}`,
          );
          path.classList.add("activity-step-edge");
          svg.appendChild(path);
        });
      };
      cards.forEach((card) => {
        let moved = false;
        card.addEventListener("click", () => {
          if (moved) return;
          cards.forEach((node) =>
            node.classList.toggle("selected", node === card),
          );
          if (inspector) {
            inspector.innerHTML = `<span class="activity-kind">${esc(card.querySelector(".activity-kind")?.textContent || "PASSO")}</span><b>${esc(card.querySelector("strong")?.textContent || "Passo da atividade")}</b><p>${esc(card.querySelector("small")?.textContent || "Campos de acompanhamento vinculados ao journaling.")}</p>`;
          }
        });
        card.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 || event.target.closest(".activity-step-port"))
            return;
          event.preventDefault();
          event.stopPropagation();
          const origin = { x: event.clientX, y: event.clientY },
            initial = { x: card.offsetLeft, y: card.offsetTop };
          moved = false;
          card.setPointerCapture?.(event.pointerId);
          const move = (ev) => {
            const dx = ev.clientX - origin.x,
              dy = ev.clientY - origin.y;
            if (Math.hypot(dx, dy) > 3) moved = true;
            if (!moved) return;
            card.classList.add("dragging");
            card.style.left = `${Math.max(12, initial.x + dx)}px`;
            card.style.top = `${Math.max(78, initial.y + dy)}px`;
            draw();
          };
          const finish = () => {
            card.classList.remove("dragging");
            card.releasePointerCapture?.(event.pointerId);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", finish);
            window.removeEventListener("pointercancel", finish);
            if (moved) notify("Passo reposicionado no canvas.");
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", finish, { once: true });
          window.addEventListener("pointercancel", finish, { once: true });
        });
      });
      this.querySelector('[data-cmd="activity-add-step"]')?.addEventListener(
        "click",
        () => {
          const name = prompt("Nome do novo passo da atividade:");
          if (!name?.trim()) return;
          const card = document.createElement("article");
          card.className = "activity-step-card workflow-card";
          card.dataset.stepId = `custom-${Date.now()}`;
          card.innerHTML = `<span class="activity-kind">NOVO PASSO</span><strong>${esc(name.trim())}</strong><small>Preencher orientação, responsável e evidências.</small><em>Passo adicionado →</em><span class="activity-step-port" aria-hidden="true"></span>`;
          card.style.left = "640px";
          card.style.top = "420px";
          canvas.appendChild(card);
          this.bindActivityDedicated();
          notify("Novo passo adicionado ao canvas.", "success");
        },
      );
      draw();
    }
    connectedCallback() {
      const renderKey = (state) =>
        [
          state.view,
          state.view === "lot-development" || state.view === "lot-profile"
            ? JSON.stringify(state.developmentProfiles || [])
            : "",
          state.selectedDevelopmentProfileId,
          state.selectedLotDetailKey,
          ["lot-detail", "lot-profile"].includes(state.view)
            ? (state.cashFlowLocal || []).map((entry) => `${entry.id}:${entry.lotKey}:${entry.amountCents}`).join(",")
            : "",
          state.developmentProfileQuery,
          state.reportFamily,
          state.reportType,
          state.reportPeriod,
          state.reportBuilderOpen,
          state.customReports?.length,
          state.view === "reports" ? JSON.stringify(state.reportDocumentLinks) : "",
          state.view === "reports" ? JSON.stringify(state.cashSummary) : "",
          state.view === "reports" ? state.cashFlowLocal?.length : "",
          state.view === "reports" ? (state.cashFlowLocal || []).map((entry) => `${entry.id}:${(entry.attachments || []).map((file) => file.id).join("+")}:${entry.fiscalStatus || ""}`).join(",") : "",
          state.view === "reports" ? state.publicLeads?.length : "",
          state.view === "reports" ? state.publicReservations?.length : "",
          state.view === "reports" ? state.operationalNotifications?.length : "",
          state.activityDedicated,
          state.stageActivityDedicatedV9,
          state.stageHomeCalendarWeekV1,
          state.selectedStage,
          state.selectedStageV9,
          state.selectedActivity,
          state.view === "activities" ? JSON.stringify(state.dashboardStageAdminStagesV1 || []) : "",
          state.view === "activities" ? `${state.atlasActivitiesLoadedV1}:${state.atlasActivitiesErrorV1 || ""}:${state.atlasActivityStageFilterV1 || ""}` : "",
          state.view === "activities" ? `${state.atlasActivityEditorOpenV1}:${state.atlasActivityEditorIdV1 || ""}:${state.atlasActivityMutationErrorV1 || ""}` : "",
          state.view === "agenda" ? `${state.agendaCalendarLoadedV3}:${state.agendaCalendarLoadingV3}:${state.agendaCalendarErrorV3 || ""}:${state.agendaCalendarRevisionV3 || ""}:${(state.agendaDatabaseEventsV3 || []).length}` : "",
          state.selectedAiAction,
          state.view === "actions" ? JSON.stringify(state.aiActions || []) : "",
          state.view === "actions" ? JSON.stringify(state.aiActionPositionChanges || {}) : "",
          state.selectedStageDetailTab,
          state.selectedActivityDetailTabV1,
          state.activityRecordModalOpenV1,
          state.stageRecordsContext,
          state.selectedRecord,
          state.editingRecord,
          state.selectedRecordsStageV5377,
          state.selectedRecordsActivityV5377,
          state.recordsRegistrationRequestedV5377,
          state.recordFilters && JSON.stringify(state.recordFilters),
          state.recordContext && JSON.stringify(state.recordContext),
          state.controlEventTab,
          state.controlEventDraft && JSON.stringify(state.controlEventDraft),
          state.records?.length,
          state.records
            ? state.records
                .map(
                  (record) =>
                    `${record?.id || ""}:${record?.updatedAt || record?.data || ""}:${(record?.attachments || []).length}:${(record?.files || []).length}:${(record?.properties || []).length}`,
                )
                .join("|")
            : "",
          state.controlStageRecordModalId,
          state.controlStageCenterItemModalKey,
          state.controlStageCenterTab,
          state.controlStageCenterMaterialMode,
          state.controlStageCenterServiceMode,
          state.view === "personnel" ? JSON.stringify(state.foremenContacts || []) : "",
          state.editingForemanId,
          state.commissionEntries?.length,
          state.view === "brokers-board" ? JSON.stringify(state.repasseEntries || []) : "",
          state.view === "brokers-board" ? JSON.stringify(state.repassePartners || []) : "",
          state.view === "brokers-board" ? JSON.stringify(state.repasseConfig || {}) : "",
          state.selectedCommissionProfile,
          state.selectedCommissionContract,
          state.commissionDirectoryPage,
          state.selectedPlanningStage,
          state.selectedCommissionProposal,
          state.proposalFormOpen,
          state.adminLeadProfile,
          state.leadContentTab,
          state.selectedLead,
          state.adminLeadQuery,
          state.leadFilters && JSON.stringify(state.leadFilters),
          state.instagramFeedStatus,
          state.instagramFeed?.updatedAt,
          state.instagramFeed?.posts?.length,
          state.instagramPolicy && JSON.stringify(state.instagramPolicy),
          state.instagramReplyFor,
          state.instagramReplyDraft,
          state.dashboardStageFocus,
          state.dashboardStageFocusTab,
          state.materialsPageTab,
          state.materialsPageQuery,
          state.materialsPageStage,
          state.materialsPageStatus,
          state.materialsPageNumber,
          state.materialsEditId,
          state.materialTransitionId,
          state.materialsNewStage,
          state.view === "materials"
            ? JSON.stringify(state.operationalAgenda || [])
            : "",
          state.view === "materials"
            ? JSON.stringify(state.operationalGuidance || null)
            : "",
          state.view === "materials"
            ? JSON.stringify(state.operationalState?.stages || [])
            : "",
          state.materialCatalogAdditions && JSON.stringify(state.materialCatalogAdditions),
          state.controlMaterialOverrides && JSON.stringify(state.controlMaterialOverrides),
          state.materialSheetCustomColumns && JSON.stringify(state.materialSheetCustomColumns),
          state.materialSheetHiddenColumns && JSON.stringify(state.materialSheetHiddenColumns),
          state.documentCatalog && JSON.stringify(state.documentCatalog),
          state.documentsCustomColumns && JSON.stringify(state.documentsCustomColumns),
          state.documentsHiddenColumns && JSON.stringify(state.documentsHiddenColumns),
          state.documentsFileFilter,
          state.documentsQuery,
          state.documentsCategory,
          state.documentsEditId,
        ].join("|");
      this.render();
      globalThis.__ensureStageContextChromeV1?.(this);
      this._renderStateKey = renderKey(appStore.get());
      this.loadPersistentRecords();
      this.loadPublicLeads();
      this.loadCommercialReservations();
      this.refreshCashFlow();
      Promise.resolve(this.runOperationalLoop("client.init")).finally(() =>
        this.refreshCashFlow(),
      );
      this.connectOperationalNotifications();
      this.startOperationalLoopTicker();
      this._unsubscribeViewRender = appStore.subscribe((state) => {
        const nextKey = renderKey(state);
        if (nextKey === this._renderStateKey) return;
        this._renderStateKey = nextKey;
        this.render();
        globalThis.__ensureStageContextChromeV1?.(this);
      });
    }
    disconnectedCallback() {
      this._unsubscribeViewRender?.();
      this._unsubscribeViewRender = null;
      this._unsubscribeOperationalNotifications?.();
      this._unsubscribeOperationalNotifications = null;
      clearInterval(this._operationalLoopTimer);
      this._operationalLoopTimer = null;
    }
    async loadPersistentRecords() {
      try {
        const response = await apiFetch("/api/records");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (Array.isArray(payload.records) && payload.records.length)
          appStore.set({
            records: payload.records,
            lastAction: "Carregou registros do banco local",
          });
      } catch (error) {
        console.warn(
          "Persistência local indisponível; mantendo demonstração.",
          error,
        );
      }
    }
    async loadPublicLeads() {
      if (this._publicLeadsSubscribed) return;
      this._publicLeadsSubscribed = true;
      try {
        this._unsubscribePublicLeads = await subscribePublicLeads((records) => {
          const leads = Object.entries(records || {})
            .map(([id, item]) => ({ id, ...item }))
            .sort((a, b) =>
              String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
            );
          appStore.set({
            publicLeads: leads,
            lastAction: leads.length
              ? "Atualizou leads do Firebase"
              : "Firebase de leads conectado",
          });
          document
            .querySelector('map-scene[data-persistent-map="true"]')
            ?.syncDashboardModeHighlightV1?.();
        });
      } catch (error) {
        console.info(
          "Firebase de leads indisponível; mantendo demonstração local.",
          error,
        );
      }
    }
    async loadCommercialReservations() {
      try {
        const response = await apiFetch("/api/commercial-sales");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json(),
          sales = Array.isArray(payload.sales) ? payload.sales : [],
          reservations = sales.filter((item) => item.broker === "Site público");
        appStore.set({
          commercialSales: sales,
          publicReservations: reservations,
          lastAction: reservations.length
            ? "Atualizou reservas vindas do site"
            : "Serviço local de reservas conectado",
        });
        document
          .querySelector('map-scene[data-persistent-map="true"]')
          ?.syncDashboardModeHighlightV1?.();
      } catch (error) {
        console.info("Reservas locais indisponíveis.", error);
      }
    }
    async refreshCashFlow() {
      if (this._cashFlowRefreshPromise) return this._cashFlowRefreshPromise;
      this._cashFlowRefreshPromise = (async () => {
        try {
          const response = await apiFetch("/api/cash-flow");
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json();
          appStore.set({
            cashSummary: payload.summary || {},
            cashFlowLocal: Array.isArray(payload.entries) ? payload.entries : [],
          });
        } catch (error) {
          console.info("Fluxo de caixa remoto ainda indisponível.", error);
        } finally {
          this._cashFlowRefreshPromise = null;
        }
      })();
      return this._cashFlowRefreshPromise;
    }
    startOperationalLoopTicker() {
      if (this._operationalLoopTimer) return;
      this._operationalLoopTimer = setInterval(() => {
        if (document.hidden) return;
        this.runOperationalLoop("client.tick", { quiet: true });
      }, 60 * 1000);
    }
    async runOperationalLoop(reason = "client.manual", { quiet = false } = {}) {
      try {
        const actor = appStore.get().currentActor || { role: "owner" };
        const state = appStore.get();
        const savedSettings = {
          ...(state.integrationSettings || {}),
          ...readIntegrationSettings(),
        };
        const response = await apiFetch("/api/operational-loop", {
          method: "POST",
          headers: operationalHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            reason,
            referenceDate: new Date().toISOString().slice(0, 10),
            syncActivities: true,
            publishNotifications: true,
            stageProfiles: stageProfilesFromSettings(savedSettings),
            clientState: {
              view: state.view,
              mapContext: Boolean(state.mapMode === "focus"),
              globalSituation: true,
              recordsTracked: Array.isArray(state.records)
                ? state.records.length
                : 0,
              notificationsTracked: Array.isArray(state.operationalNotifications)
                ? state.operationalNotifications.length
                : 0,
            },
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        appStore.set({
          cashSummary: payload.cashSummary || {},
          operationalState: payload.operational || null,
          operationalNotifications: payload.notifications || [],
          systemCalibration: payload.calibration || null,
          operationalAgenda: payload.agenda || [],
          operationalGuidance: payload.guidance || null,
          cashFlowLocal: payload.cashEntries || [],
          lastAction: quiet
            ? state.lastAction
            : `Atualizou ciclo operacional para o perfil ${actor.label || actor.role}`,
        });
        try {
          await publishOperationalRealtime(actor, payload, { reason });
        } catch (realtimeError) {
          console.info(
            "Espelho público do ciclo operacional ainda indisponível.",
            realtimeError,
          );
        }
      } catch (error) {
        console.info("Ciclo operacional indisponível.", error);
      }
    }
    async connectOperationalNotifications(force = false) {
      const actor = appStore.get().currentActor || { role: "owner" };
      if (this._operationalNotificationUid === actor.uid && !force) return;
      this._unsubscribeOperationalNotifications?.();
      this._unsubscribeOperationalNotifications = null;
      try {
        this._unsubscribeOperationalNotifications =
          await subscribeOperationalNotifications(actor, (records) => {
            const notifications = Object.entries(records || {})
              .map(([id, item]) => ({ id, ...item }))
              .sort((a, b) =>
                String(b.createdAt || "").localeCompare(
                  String(a.createdAt || ""),
                ),
              );
            appStore.set({
              operationalNotifications: notifications,
              lastAction: notifications.length
                ? "Atualizou notificações em tempo real"
                : "Canal em tempo real conectado",
            });
          });
        this._operationalNotificationUid = actor.uid;
      } catch (error) {
        this._operationalNotificationUid = "";
        console.info(
          "Canal em tempo real ainda não registrado neste dispositivo.",
          error,
        );
      }
    }
    render() {
      const state = appStore.get(),
        actor = state.currentActor || { role: "owner" },
        role = normalizeOperationalRole(actor.role || "owner"),
        requestedView = state.view,
        view =
          !actorCanOpenView(actor, requestedView)
            ? isLimitedOperationalActor(actor) ? "records" : "map"
            : requestedView;
      this.dataset.view = view;
      this.dataset.role = role;
      if (view !== requestedView) {
        queueMicrotask(() => {
          const current = appStore.get();
          if (
            isLimitedOperationalActor(current.currentActor) &&
            !actorCanOpenView(current.currentActor, current.view)
          ) {
            appStore.set({
              view: "records",
              activityDedicated: false,
              stageActivityDedicatedV9: false,
              selectedActivity: null,
              lastAction: "Área indisponível para este perfil",
            });
          }
        });
      }
      const labels = {
        assistant: ["Execução atual", "Panorama operacional"],
        map: ["Mapa operacional", "Visão temática por utilidade"],
        "lot-development": ["Loteamento", "Perfis de lotes e áreas comuns"],
        "lot-profile": ["Perfil do loteamento", "Propriedades, contexto e acompanhamento"],
        stages: ["Etapas da obra", "Canvas de execução e dependências"],
        agenda: ["Agenda da etapa", "Compromissos, responsáveis e alertas"],
        activities: state.stageActivityDedicatedV9
          ? ["Atividade da etapa", "Página dedicada · resumo, registros e apontamentos"]
          : ["Atividades", "Lista das atividades cadastradas"],
        progress: [
          "Andamento da obra",
          "Diário operacional e evidências de campo",
        ],
        foremen: ["Por encarregados", "Responsáveis vinculados à etapa em foco"],
        pert: ["PERT da etapa", "Dependências vivas e liberação de atividades"],
        raci: ["Pessoas responsáveis", "Matriz RACI interativa por atividade"],
        raid: [
          "Pendências da obra",
          "Riscos, premissas, problemas e dependências",
        ],
        purchases: ["Compras", "Compromissos, prazos e fornecedores"],
        inventory: ["Inventário", "Materiais, reservas e consumo"],
        materials: ["Materiais", "Alocação por etapa e catálogo geral"],
        documents: ["Documentos do loteamento", "Projetos, plantas, memoriais e licenças do Aliança Park"],
        leads: ["Leads", "Captação pública e intenção de compra"],
        contracts: [
          "Contratos",
          "Venda de lote · recibos, valores e confirmação de compra",
        ],
        proposals: [
          "Contratos",
          "Venda de lote · recibos, valores e confirmação de compra",
        ],
        commissions: ["Comissões", "Perfis, lotes, clientes e contratos"],
        collaborators: ["Colaboradores", "Alocação e presença em campo"],
        personnel: ["Pessoal", "Formação de equipes e unidades de produção"],
        brokers: ["Corretores", "Situação comercial, carteira e contatos"],
        "brokers-board": ["Lotes", "Valores, status, pagamentos e repasses por lote"],
        "broker-detail": ["Corretor", "Carteira, comissões, histórico e documentos"],
        "sales-history": ["Histórico de movimentações", "Relatórios completos, transações e anexos"],
        "agenda-detail": ["Tarefa da agenda", "Detalhes, requisitos e condição operacional"],
        "lot-detail": ["Ficha do lote", "Cadastro comercial, pagamentos, histórico e documentos"],
        "commission-deal": ["Negociação", "Cliente, lote, comissão e anexos"],
        finance: [
          "Financeiro",
          "Balanços, fluxo de caixa e planilhas gerenciais",
        ],
        repasses: ["Repasses", "Registros de saída vinculados a comissões e distribuição"],
        reports: ["Relatórios", "Orçamento, realizado e indicadores"],
        settings: ["Configuração", "Integrações e parâmetros"],
      };
      const [title, subtitle] = labels[view] || labels.assistant;
      const stagePanorama =
        view === "stages" && !state.activityDedicated
          ? typeof renderStageHomePageV1 === "function" &&
            typeof stageHomeSnapshotV1 === "function"
            ? stageHomePageMarkupV1()
            : this.assistant()
                .replace(
                  "DASHBOARD INICIAL · ALIANÇA PARK",
                  "ETAPAS E CRONOGRAMA · ALIANÇA PARK",
                )
                .replace(
                  "<h1>Panorama operacional</h1>",
                  "<h1>Etapas e cronograma</h1>",
                )
                .replace(
                  "Registros rápidos e leitura de status, com o mapa aberto somente quando necessário.",
                  "Mapa, filtros e cronograma integrados para acompanhar cada frente de execução.",
                )
          : null;
      const pageHeader = view === "agenda" || (view === "activities" && !state.stageActivityDedicatedV9)
        ? ""
        : `<div class="activity-header"><div><span>${title}</span><small>${subtitle}</small></div><div class="activity-state"><i></i> Em acompanhamento <b>·</b> ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div></div>`;
      this.innerHTML = `${pageHeader}${stagePanorama || (view === "stages" ? (state.activityDedicated ? this.activityDedicatedPage() : this.stagesCanvas()) : this[view]?.() || this.assistant())}`;
      // Não reter trilhos de filtro de versões anteriores em nenhuma visão.
      this.querySelectorAll("map-filter-rail").forEach((rail) => rail.remove());
      document.getElementById("belavista-map-widgets-v5")?.remove();
      if (view === "stages" && !state.activityDedicated) {
        this.addActivityNodes();
        this.addStageUtilities();
        this.splitStageTabs();
      }
      if (view === "stages" && state.activityDedicated) {
        this.scrollTop = 0;
        this.bindActivityDedicated();
      }
      window.lucide?.createIcons();
      this.bind();
      this.bindFloatingWidgets();
    }
    bind() {
      const current = appStore.get();
      if (current.printMode) {
        this.innerHTML = this.mapPrintReport();
      } else if (
        current.view === "assistant" &&
        !this.querySelector("[data-map-pdf]")
      )
        this.querySelector(".dashboard-home")?.insertAdjacentHTML(
          "beforeend",
          `<button type="button" class="dashboard-pdf dashboard-pdf-float" data-map-pdf>${ico("file-down")} Exportar mapa PDF</button>`,
        );
      this.querySelector("[data-map-pdf]")?.addEventListener("click", () =>
        this.openMapPrintMode(),
      );
      this.querySelector("[data-map-print-close]")?.addEventListener(
        "click",
        () =>
          appStore.set({
            printMode: false,
            lastAction: "Fechou prévia de impressão",
          }),
      );
      this.querySelector("[data-map-print-start]")?.addEventListener(
        "click",
        () => {
          notify(
            'Abrindo impressão. Escolha "Salvar como PDF" no destino.',
            "success",
          );
          setTimeout(() => window.print(), 120);
        },
      );
      this.querySelector("[data-audit-clear]")?.addEventListener("click", () => {
        appStore.update((s) => ({
          ...s,
          actionAudit: [],
          lastAction: "Limpou o histórico de uso da sessão",
        }));
        notify("Histórico de uso desta sessão limpo.", "success");
      });
      this.querySelector("[data-audit-export]")?.addEventListener("click", () => {
        const rows = [
          ["Horário", "Ação", "Área", "Módulo", "Usuário"],
          ...(appStore.get().actionAudit || []).map((item) => [
            new Date(item.at).toLocaleString("pt-BR"),
            item.label,
            item.view || "dashboard",
            item.view || "dashboard",
            item.actor || "Warley",
          ]),
        ];
        const csv = rows
          .map((row) =>
            row
              .map((value) => `"${String(value).replaceAll('"', '""')}"`)
              .join(";"),
          )
          .join("\n");
        const url = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8" }),
          ),
          link = document.createElement("a");
        link.href = url;
        link.download = `auditoria-uso-${appStore.get().sessionId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        appStore.set({ lastAction: "Exportou histórico de uso da sessão" });
      });
      this.querySelectorAll(".card-close").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          button.closest(".float-card")?.remove();
          appStore.set({ lastAction: "Ocultou um card do dashboard" });
        }),
      );
      const reportPeriodLabel = this.querySelector("[data-report-period]")?.closest("label");
      if (reportPeriodLabel) reportPeriodLabel.style.display = appStore.get().reportType === "system-live" ? "none" : "";
      this.querySelector("[data-report-family]")?.addEventListener(
        "change",
        (event) => {
          const family = event.currentTarget.value,
            first = reportCatalog.find((report) => report.family === family);
          appStore.set({
            reportFamily: family,
            reportType: first?.id || "financial-balance",
            lastAction: `Selecionou família de relatório ${family}`,
          });
        },
      );
      this.querySelectorAll("[data-report-family-tab]").forEach((button) =>
        button.addEventListener("click", () => {
          const family = button.dataset.reportFamilyTab,
            first = reportCatalog.find((report) => report.family === family);
          appStore.set({
            reportFamily: family,
            reportType: first?.id || "financial-balance",
            lastAction: `Selecionou aba ${family}`,
          });
        }),
      );
      this.querySelectorAll("[data-report-type-tab]").forEach((button) =>
        button.addEventListener("click", () => {
          const report = reportCatalog.find(
            (item) => item.id === button.dataset.reportTypeTab,
          );
          if (report)
            appStore.set({
              reportFamily: report.family,
              reportType: report.id,
              lastAction: `Abriu ${report.label}`,
            });
        }),
      );
      this.querySelector("[data-report-type]")?.addEventListener(
        "change",
        (event) => {
          const report = reportCatalog.find(
            (item) => item.id === event.currentTarget.value,
          );
          appStore.set({
            reportType: event.currentTarget.value,
            lastAction: `Abriu relatório ${report?.label || event.currentTarget.value}`,
          });
        },
      );
      this.querySelector("[data-report-period]")?.addEventListener(
        "change",
        (event) => {
          appStore.set({
            reportPeriod: event.currentTarget.value,
            lastAction: `Alterou período do relatório para ${event.currentTarget.options[event.currentTarget.selectedIndex].text}`,
          });
        },
      );
      this.querySelectorAll("[data-report-row-toggle]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const index = button.dataset.reportRowToggle,
            row = this.querySelector(`[data-report-detail="${index}"]`),
            open = row?.hidden !== false;
          if (row) {
            row.hidden = !open;
            row.classList.toggle("is-open", open);
          }
          button.setAttribute("aria-expanded", String(open));
          button.textContent = open ? "Ocultar itens" : "Ver itens";
          appStore.set({
            lastAction: `${open ? "Abriu" : "Fechou"} desdobramento da linha ${Number(index) + 1} do relatório`,
          });
        }),
      );
      this.querySelectorAll("[data-report-export]").forEach((button) =>
        button.addEventListener("click", () => {
          syncLiveSystemReportV1(appStore.get());
          const s = appStore.get(),
            report =
              reportCatalog.find((item) => item.id === s.reportType) ||
              reportCatalog[0],
            csv = [report.columns, ...report.rows]
              .map((row) =>
                row
                  .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
                  .join(";"),
              )
              .join("\n"),
            url = URL.createObjectURL(
              new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }),
            ),
            link = document.createElement("a");
          link.href = url;
          link.download = `${report.id}-${["system-live", "cash-evidence-live"].includes(report.id) ? "sessao-atual" : report.id.startsWith("custom-") ? "modelo-sem-dados" : "dados-demonstrativos"}.csv`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          notify(`${report.label} exportado em CSV${["system-live", "cash-evidence-live"].includes(report.id) ? " (estado da sessão)" : " (dados demonstrativos/modelo)"}.`, "success");
          appStore.set({ lastAction: `Exportou ${report.label}` });
        }),
      );
      this.querySelector("[data-report-print]")?.addEventListener("click", () => {
        window.print();
        appStore.set({ lastAction: "Abriu impressão do relatório" });
      });
      this.querySelector(".records-new")?.addEventListener("click", () => {
        this.querySelector(".records-form-wrap")?.classList.add("open");
      });
      this.querySelectorAll("[data-record-edit]").forEach((b) =>
        b.addEventListener("click", () => {
          appStore.set({ editingRecord: b.dataset.recordEdit });
        }),
      );
      this.querySelectorAll("[data-record-delete]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Excluir este registro?")) return;
          try {
            const response = await apiFetch(
              `/api/records/${encodeURIComponent(b.dataset.recordDelete)}`,
              { method: "DELETE", headers: operationalHeaders() },
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            appStore.update((s) => ({
              ...s,
              records: s.records.filter((r) => r.id !== b.dataset.recordDelete),
              lastAction: "Excluiu registro no banco",
            }));
            notify("Registro excluído do banco operacional.", "success");
          } catch (error) {
            notify("Não foi possível excluir o registro.", "warning");
            console.warn("Exclusão persistente indisponível.", error);
          }
        }),
      );
      this.querySelector(".record-cancel")?.addEventListener("click", () =>
        appStore.set({ editingRecord: null }),
      );
      this.querySelector(".record-form")?.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            attachments = f
              .getAll("attachments")
              .filter((item) => item instanceof File && item.size);
          f.delete("attachments");
          const value = Object.fromEntries(f.entries()),
            rawEditingId = appStore.get().editingRecord,
            editingId =
              rawEditingId && rawEditingId !== "new" ? rawEditingId : null,
            contextFields = [
              ...e.currentTarget.querySelectorAll("[data-record-context-field]"),
            ]
              .map(
                (input) =>
                  `${input.dataset.recordContextLabel}: ${String(input.value || "").trim()}`,
              )
              .filter((item) => !item.endsWith(": "));
          if (contextFields.length)
            value.detalhes = [
              value.detalhes,
              `Campos de ${e.currentTarget.dataset.recordNature || "execução"}:`,
              ...contextFields,
            ]
              .filter(Boolean)
              .join("\n");
          if (
            attachments.length
          ) {
            const summary = attachments
              .map(
                (file) =>
                  `${file.name} (${file.type || "documento"}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
              )
              .join(" · ");
            value.detalhes = [value.detalhes, `Anexos: ${summary}`]
              .filter(Boolean)
              .join("\n");
            const image = attachments.find((file) => /^image\//i.test(file.type));
            if (image) {
              const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => resolve("");
                reader.readAsDataURL(image);
              });
              const base64 = dataUrl.split(",")[1] || "";
              if (base64)
                value.evidence = {
                  kind: "upload",
                  fileName: image.name,
                  mimeType: image.type || "image/jpeg",
                  imageBase64: base64,
                };
            }
          }
          try {
            const response = await apiFetch(
              editingId
                ? `/api/records/${encodeURIComponent(editingId)}`
                : "/api/records",
              {
                method: editingId ? "PUT" : "POST",
                headers: operationalHeaders({
                  "Content-Type": "application/json",
                }),
                body: JSON.stringify(value),
              },
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const record = await response.json();
            appStore.update((s) => ({
              ...s,
              records: editingId
                ? s.records.map((r) => (r.id === editingId ? record : r))
                : [record, ...s.records],
              editingRecord: null,
              recordContext: null,
              recordCameraName: null,
              recordCameraPreview: null,
              lastAction: editingId
                ? "Atualizou registro no banco"
                : "Criou registro no banco",
            }));
            this._recordCameraFile = null;
            notify("Registro salvo na camada operacional.", "success");
          } catch (error) {
            notify(
              "Serviço operacional indisponível; registro não confirmado.",
              "warning",
            );
            console.warn("Persistência de registro indisponível.", error);
          }
        },
      );
      this.querySelectorAll("[data-view]").forEach((b) =>
        b.addEventListener("click", () => {
          const next =
            b.dataset.view === "inventory" || b.dataset.view === "assistant"
              ? "map"
              : b.dataset.view;
          appStore.set({
            view: next,
            activityDedicated: false,
            stageActivityDedicatedV9: false,
            selectedActivity: null,
            activityRecordModalOpenV1: false,
            editingRecord: null,
            ...(next === "contracts" || next === "proposals"
              ? { proposalFormOpen: false, contractEditing: null }
              : {}),
            recordContext: null,
            lastAction: `Abriu ${b.textContent.trim()}`,
          });
          if (next === "finance") this.refreshCashFlow?.();
        }),
      );
      // Ação prioritária do dashboard: “Novo registro” precisa abrir a tela
      // operacional já com o formulário pronto, sem depender de listeners
      // globais instalados por extensões antigas.
      this.querySelectorAll("[data-records-open-new]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          appStore.set({
            view: "records",
            activityDedicated: false,
            selectedActivity: null,
            selectedRecordsActivityV5377: null,
            recordsRegistrationRequestedV5377: true,
            editingRecord: null,
            recordContext: null,
            lastAction: "Abriu novo registro",
          });
        }),
      );
      this.querySelectorAll("[data-lead]").forEach((b) =>
        b.addEventListener("click", () => {
          appStore.set({ selectedLead: +b.dataset.lead });
          this.render();
        }),
      );
      this.querySelector("[data-lead-search]")?.addEventListener(
        "input",
        (event) => {
          const query = event.currentTarget.value.trim().toLowerCase();
          this.querySelectorAll(".lead-client-row").forEach((row) => {
            row.hidden = Boolean(
              query && !row.textContent.toLowerCase().includes(query),
            );
          });
        },
      );
      this.querySelectorAll("[data-lead-message]").forEach((button) =>
        button.addEventListener("click", () => {
          const detail = button.closest(".lead-ops-detail"),
            name =
              detail?.querySelector("h2")?.textContent?.trim() || "interessado",
            lot =
              detail?.querySelector(".lead-lot-focus b")?.textContent?.trim() ||
              "lote selecionado",
            message = `Olá, ${name}! Aqui é da equipe Vista Verde. Recebemos seu interesse no ${lot} e podemos enviar as condições, disponibilidade e próximos passos.`;
          window.open(
            `https://wa.me/?text=${encodeURIComponent(message)}`,
            "_blank",
            "noopener",
          );
          notify(`Mensagem de WhatsApp preparada para ${name}.`, "success");
          appStore.set({ lastAction: `Preparou WhatsApp para ${name}` });
        }),
      );
      this.querySelectorAll("[data-lead-reserve]").forEach((button) =>
        button.addEventListener("click", () => {
          const item = demoData.leads[Number(button.dataset.leadReserve)];
          notify(
            `Reserva preparada para ${item?.lot || "o lote interessado"}.`,
            "success",
          );
          appStore.set({ lastAction: `Abriu reserva de ${item?.lot || "lote"}` });
        }),
      );
      this.querySelectorAll("[data-stage-index]").forEach((b) =>
        b.addEventListener("click", () => {
          appStore.set({
            selectedStage: +b.dataset.stageIndex,
            stageSelected: true,
            lastAction: `Abriu a etapa ${b.dataset.stageIndex}`,
          });
          this.render();
        }),
      );
      this.querySelectorAll(".stage-detail-card").forEach((b) =>
        b.addEventListener("click", (e) => {
          if (e.target.closest(".stage-activity-card,.activity-connect")) return;
          appStore.set({ stageSelected: true });
          this._dedicated = true;
          this.openDedicatedStage();
          this.bindDedicatedStageContext();
          this.bindDedicatedWorkflow();
          this.bindDedicatedActivityClicks();
          this.enhanceDedicatedSurface();
          this.addCatalogPalette();
          this.bindCatalogButtons();
          this.addFineDurationControls();
          this.bindGhostConnections();
          this.watchSurfaceRelations();
          this.bindWorkflowFieldTrees();
        }),
      );
      this.querySelectorAll("[data-activity-detail]").forEach((b) =>
        b.addEventListener("click", () => {
          if (b.dataset.dragged === "true") return;
          this.openActivityPage(b.dataset.activityDetail);
        }),
      );
      this.querySelectorAll("[data-close-detail]").forEach((b) =>
        b.addEventListener("click", () =>
          b.closest(".activity-detail")?.classList.remove("open"),
        ),
      );
      this.querySelectorAll(
        "button:not([data-view]):not([data-cmd]):not([data-lead]):not([data-lead-message]):not([data-lead-reserve]):not([id])",
      ).forEach((button) =>
        button.addEventListener("click", () => {
          if (
            button.matches(
              "[data-report-row-toggle],[data-agenda-day],[data-agenda-new],[data-agenda-item-menu],[data-agenda-whatsapp],[data-agenda-alert],[data-activity-category-filter],[data-activity-open],[data-activity-v9],[data-activity-new],[data-activity-detail-tab],[data-activity-new-record],[data-activity-record-close],[data-front-stage-tab],[data-control-context-add-material],[data-progress-period],[data-progress-new],[data-progress-send],[data-progress-cancel],[data-record-paint],[data-record-mobile-select],[data-record-camera],[data-record-image-next],[data-record-image-back],[data-record-image-remove],[data-records-drill-root],[data-records-drill-stage],[data-records-drill-stage-back],[data-records-drill-activity],[data-record-new-activity],[data-record-drill-paint],[data-record-drill-fit],[data-record-drill-clear],[data-records-stage-fit],[data-map-pdf],[data-map-print-start],[data-map-print-close],[data-audit-clear],[data-audit-export],[data-lead-reservation-start],[data-reservation-start],[data-reservation-close],[data-reservation-analyze],[data-copy-pix],[data-commission-directory-page],[data-ai-step-prev],[data-ai-step-next],[data-ai-step-select],.control-remove-context-material,.reservation-submit,.records-new,.record-confirm,.record-cancel,.journal-open,.personnel-primary-button-v5372",
            ) ||
            button.closest(".activity-journal-form")
          )
            return;
          if (button.closest(".reports-toolbar,.report-footer")) return;
          const label = button.textContent.trim().replace(/\s+/g, " ");
          if (!label) return;
          if (button.classList.contains("stage-tab")) {
            this.querySelectorAll(".stage-tab").forEach((x) =>
              x.classList.remove("active"),
            );
            button.classList.add("active");
            notify(`Visão ${label} selecionada.`);
            return;
          }
          if (button.classList.contains("public-submit")) {
            const values = [...this.querySelectorAll(".public-fields input")].map(
              (x) => x.value.trim(),
            );
            if (values.some((v) => !v)) {
              notify(
                "Preencha nome, WhatsApp e e-mail para registrar a intenção.",
                "warning",
              );
              return;
            }
            notify("Lead registrado e encaminhado para atendimento.", "success");
            appStore.set({ lastAction: "Registrou novo lead" });
            return;
          }
          if (button.textContent.includes("relatório")) {
            notify("Relatório executivo preparado para exportação.", "success");
            return;
          }
          if (button.textContent.includes("recomend")) {
            notify(
              "Recomendações: priorizar postes e tubos atrasados.",
              "warning",
            );
            return;
          }
          notify(`${label} executado.`, "success");
          appStore.set({ lastAction: label });
        }),
      );
      this.querySelectorAll(".canvas-node").forEach((node) => {
        node.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", node.dataset.node);
          node.classList.add("dragging");
        });
        node.addEventListener("dragend", () => node.classList.remove("dragging"));
      });
      const zone = this.querySelector(".canvas-relate");
      if (zone) {
        zone.addEventListener("dragover", (e) => {
          e.preventDefault();
          zone.classList.add("drop-ready");
        });
        zone.addEventListener("dragleave", () =>
          zone.classList.remove("drop-ready"),
        );
        zone.addEventListener("drop", (e) => {
          e.preventDefault();
          const node = e.dataTransfer.getData("text/plain");
          zone.classList.remove("drop-ready");
          zone.querySelector("strong").textContent =
            `Relacionamento: ${node} → orçamento mensal`;
          appStore.set({ lastAction: `Relacionou ${node} ao orçamento mensal` });
        });
      }
      this.querySelectorAll('.stage-card[draggable="true"]').forEach((card) => {
        card.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/stage", card.dataset.stage);
          card.classList.add("dragging");
        });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));
      });
      this.querySelectorAll('.stage-card[draggable="true"]').forEach((card) => {
        card.addEventListener("pointerdown", (e) => {
          if (e.button !== 0 || e.target.closest("button,input,textarea")) return;
          const canvas = card.closest(".stage-canvas");
          if (!canvas) return;
          const start = canvas.getBoundingClientRect();
          const initial = { x: card.offsetLeft, y: card.offsetTop };
          const origin = { x: e.clientX, y: e.clientY };
          card.classList.add("pointer-dragging");
          const move = (ev) => {
            card.style.left = `${Math.max(12, initial.x + ev.clientX - origin.x)}px`;
            card.style.top = `${Math.max(42, initial.y + ev.clientY - origin.y)}px`;
          };
          const up = () => {
            card.classList.remove("pointer-dragging");
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            const relation = canvas.querySelector(".relation-label");
            if (relation)
              relation.textContent = `Posições relacionadas: ${card.dataset.stage} → próxima atividade`;
            appStore.set({
              lastAction: `Reposicionou ${card.dataset.stage} no canvas`,
            });
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        });
      });
      this.querySelectorAll(".stage-activity-card").forEach((card) => {
        card.addEventListener("pointerdown", (e) => {
          if (e.button !== 0 || e.target.closest(".activity-connect")) return;
          e.preventDefault();
          card.setPointerCapture?.(e.pointerId);
          const initial = { x: card.offsetLeft, y: card.offsetTop },
            origin = { x: e.clientX, y: e.clientY };
          let moved = false;
          card.classList.add("dragging");
          const move = (ev) => {
            if (
              Math.abs(ev.clientX - origin.x) > 3 ||
              Math.abs(ev.clientY - origin.y) > 3
            )
              moved = true;
            card.style.left = `${Math.max(10, initial.x + ev.clientX - origin.x)}px`;
            card.style.top = `${Math.max(45, initial.y + ev.clientY - origin.y)}px`;
          };
          const up = () => {
            card.classList.remove("dragging");
            card.releasePointerCapture?.(e.pointerId);
            card.removeEventListener("pointermove", move);
            card.removeEventListener("pointerup", up);
            if (moved) {
              card.dataset.dragged = "true";
              setTimeout(() => delete card.dataset.dragged, 0);
              appStore.set({
                lastAction: `Reposicionou atividade ${card.dataset.activityDetail}`,
              });
            }
          };
          card.addEventListener("pointermove", move);
          card.addEventListener("pointerup", up);
        });
      });
      const stageCanvas = this.querySelector(".stage-canvas");
      if (stageCanvas) {
        stageCanvas.addEventListener("dragover", (e) => {
          e.preventDefault();
          stageCanvas.classList.add("drop-ready");
        });
        stageCanvas.addEventListener("dragleave", () =>
          stageCanvas.classList.remove("drop-ready"),
        );
        stageCanvas.addEventListener("drop", (e) => {
          e.preventDefault();
          const stage = e.dataTransfer.getData("text/stage");
          stageCanvas.classList.remove("drop-ready");
          const label = stageCanvas.querySelector(".relation-label");
          if (label)
            label.textContent = `Dependência relacionada: ${stage} → próxima etapa`;
          appStore.set({ lastAction: `Moveu a etapa ${stage} no canvas` });
        });
      }
    }
    mapPrintReport() {
      const state = appStore.get(),
        stage =
          demoData.activities.find((item) => item.id === state.selectedStage) ||
          demoData.activities[1],
        overlayKey = stageOverlayKey(stage.name),
        overlayLabel = stageOverlayLabels[overlayKey] || stage.name;
      return `<section class="map-print-report"><header class="map-print-head"><div><span class="activity-kind">ALIANÇA PARK · RELATÓRIO EXECUTIVO</span><h1>Um empreendimento em evolução</h1><p>Uma visão integrada da implantação, da força comercial e do potencial financeiro que acompanham o desenvolvimento do Aliança Park.</p><div class="map-print-highlight"><i></i><span>Frente em evidência: <b>${esc(stage.name)}</b> · ${esc(overlayLabel)}</span></div></div></header><footer class="map-print-foot"><span>${ico("map")} Aliança Park · implantação urbana acompanhada em visão territorial</span><span>${ico("sparkles")} Panorama executivo de evolução, demanda e valor</span></footer></section>`;
    }
    openMapPrintMode() {
      const map = document.querySelector("map-scene:not([compact])");
      if (map?.openMapCanvasPrintV1) {
        map.openMapCanvasPrintV1();
        return;
      }
      appStore.set({
        printMode: true,
        lastAction: "Abriu relatório executivo do empreendimento",
      });
      const finishPrint = () => {
        if (appStore.get().printMode)
          appStore.set({
            printMode: false,
            lastAction: "Concluiu impressão do relatório executivo",
          });
      };
      window.addEventListener("afterprint", finishPrint, { once: true });
      const started = performance.now(),
        waitForScene = () => {
          const ready =
            map?.dataset.modelRender === "webgl-live-glb" &&
            map?.dataset.mapTexture === "ready" &&
            map?.dataset.mapSurfaceVisible === "true";
          if (ready || performance.now() - started > 4500) {
            window.print();
            return;
          }
          requestAnimationFrame(waitForScene);
        };
      requestAnimationFrame(() => requestAnimationFrame(waitForScene));
    }
    assistant() {
      return `<div class="scene-title"><span>IA · Aliança Park</span><small>Panorama operacional do empreendimento</small></div><glass-card class="float-card map-complete"><h3>${ico("layers-3")} Mapa de completude</h3><ul class="legend"><li><i class="dot green"></i> Acima de 75%</li><li><i class="dot teal"></i> 50% a 75%</li><li><i class="dot amber"></i> 25% a 50%</li><li><i class="dot red"></i> Abaixo de 25%</li></ul><button data-view="map">Ver detalhes</button></glass-card><glass-card class="float-card collab-card"><h3>${ico("users")} Colaboradores ativos</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Em atividades externas</span><button data-view="collaborators">Ver equipe</button></glass-card><glass-card class="float-card mini chrono"><h3>${ico("calendar-days")} Cronograma</h3><p>Semana 18 · 12 atividades</p><div class="weekdots"><i></i><i></i><i></i><i class="today"></i><i class="warn"></i><i></i><i></i></div><button data-view="stages">Ver cronograma</button></glass-card><glass-card class="float-card mini leads-card"><h3>${ico("users-round")} Leads · 7 dias</h3><div class="sparkline">⌁⌃⌁⌃⌁⌃⌁</div><strong>24</strong><small>Total no período</small><button data-view="leads">Ver leads</button></glass-card><glass-card class="float-card mini buy-card"><h3>${ico("shopping-cart")} Compras críticas</h3><strong>Postes de concreto</strong><span>Déficit 8 un.</span><button data-view="purchases">Ver compras</button></glass-card>`;
    }
    map() {
      const widgets = [
        ["stages", "calendar-days", "Etapas"],
        ["records", "clipboard-pen-line", "Registrar"],
        ["leads", "users-round", "Leads"],
        ["brokers", "badge-dollar-sign", "Corretores"],
        ["finance", "wallet-cards", "Financeiro"],
        ["reports", "chart-no-axes-combined", "Relatórios"],
        ["settings", "settings", "Ajustes"],
      ];
      return `<glass-card class="float-card overview wide"><h3>${ico("map")} Mapa operacional</h3><p>Atalhos de widgets para navegar e atuar sobre os dados do empreendimento.</p><div class="theme-grid map-widget-grid">${widgets.map(([view, icon, label]) => `<button type="button" data-view="${view}">${ico(icon)}<span>${label}</span></button>`).join("")}</div></glass-card>`;
    }
    stages() {
      const a = demoData.activities;
      return `<glass-card class="float-card work-canvas"><div class="card-head"><div><h3>${ico("layout-dashboard")} Canvas de trabalho</h3><small>Arraste os nós para relacionar dados e etapas</small></div><span class="chip violet">48 meses</span></div><div class="canvas-columns"><div><b>01 · Criar</b><span class="canvas-node" draggable="true" data-node="Registro de gasto">${ico("plus")} Registro de gasto</span><span class="canvas-node" draggable="true" data-node="Etapa / subetapa">${ico("layers-3")} Etapa / subetapa</span></div><div><b>02 · Preencher</b><span class="canvas-node" draggable="true" data-node="Data e competência">${ico("calendar-plus")} Data e competência</span><span class="canvas-node" draggable="true" data-node="Valor unitário e total">${ico("wallet-cards")} Valor unitário e total</span></div><div><b>03 · Relacionar</b><div class="canvas-relate"><strong>Solte aqui para criar um relacionamento</strong><small>Orçamento mensal · Indicador · Relatório</small></div></div></div><div class="canvas-foot"><span>Última ação: ${appStore.get().lastAction}</span><button data-view="reports">Abrir relatório</button></div></glass-card><glass-card class="float-card timeline-card"><div class="card-head"><div><h3>${ico("calendar-clock")} Etapas + Cronograma</h3><small>Semanas 23 — 28</small></div><span class="chip violet">Semana atual · 25</span></div><div class="timeline">${a.map((x, i) => `<div class="timeline-step ${x.status}"><b>${x.week}</b><span></span><strong>${x.name}</strong><small>${x.progress}% · ${x.owner}</small></div>`).join("")}</div></glass-card><glass-card class="float-card activity-list"><h3>${ico("list-checks")} Atividades da semana</h3>${a
        .slice(1, 5)
        .map(
          (x) =>
            `<div class="row"><span>${x.name}<small>${x.owner}</small></span><em class="status ${statusClass(x.status)}">${x.status}</em></div>`,
        )
        .join(
          "",
        )}</glass-card><glass-card class="float-card dep-card"><h3>${ico("triangle-alert")} Dependências e atrasos</h3><div class="alert-line"><b>Execução de meio-fio</b><span>Bloqueado</span></div><div class="alert-line"><b>Rede de água</b><span>Aguardando projeto</span></div><button>Ver análise completa</button></glass-card><glass-card class="float-card team-card"><h3>${ico("users")} Equipe escalada</h3>${demoData.collaborators.map((x) => `<div class="row"><span>${x[0]}<small>${x[1]}</small></span><em>${x[2]}</em></div>`).join("")}</glass-card>`;
    }
    stagesCanvas() {
      const a = demoData.activities;
      const selected =
        demoData.activities.find((x) => x.id === appStore.get().selectedStage) ||
        a[1];
      const activityNames = [
        "Preparar frente",
        "Executar atividade principal",
        "Validar medição",
        "Liberar próxima frente",
      ];
      const cards = a
        .map((x, i) => {
          const overlay = stageOverlayKey(x.name);
          return `<button class="stage-overview-card ${x.id === selected.id ? "selected" : ""} overlay-${overlay}" data-stage-index="${x.id}"><span class="stage-overview-index">${String(i + 1).padStart(2, "0")}</span><strong>${x.name}</strong><span class="stage-overlay-chip">${stageOverlayLabels[overlay]}</span><map-scene compact data-stage="${esc(x.name)}" data-overlay="${overlay}" data-map-index="${i}" class="stage-map-thumb" aria-hidden="true"></map-scene><small>${x.week} · ${x.progress}%</small><i class="stage-progress-mini"><b style="width:${x.progress}%"></b></i></button>`;
        })
        .join("");
      const details = `<div class="activity-detail" role="dialog" aria-modal="true"><button class="detail-close" data-close-detail aria-label="Fechar">×</button><span class="activity-kind">ATIVIDADE · ${selected.name.toUpperCase()}</span><h2 data-detail-title>Detalhes da etapa</h2><p>Superfície de controle exclusiva para organizar atividades, custos e dependências desta etapa.</p><div class="detail-columns"><div><small>RESPONSÁVEIS</small><b>${selected.owner}</b><b>Paula Nascimento · Planejamento</b></div><div><small>COMPRAS ASSOCIADAS</small><b>PE-2025-040 · Tubo PEAD Ø600mm</b><b>PE-2025-039 · Concreto FCK 25MPa</b></div><div><small>MATERIAIS</small><b>Tubos PVC · 780 m em uso</b><b>Cimento · 150 sc em uso</b></div></div></div>`;
      return `<div class="stage-shell stage-shell-expanded"><div class="stage-toolbar"><div class="breadcrumbs">Início <b>/</b> Obras <b>/</b> Aliança Park <b>/</b> Etapas</div><div class="stage-tools"><button class="stage-tab active">${ico("layout-dashboard")} Canvas</button><button class="ghost">${ico("sparkles")} IA: Sugestões</button></div></div><section class="stage-overview"><div class="section-kicker">ETAPAS DO EMPREENDIMENTO <small>Role horizontalmente para navegar por todo o calendário</small></div><div class="stage-overview-scroll">${cards}</div></section><div class="stage-body"><div class="stage-canvas stage-canvas-exclusive"><div class="canvas-guide"><b>Canvas exclusivo · ${selected.name}</b><span class="relation-label">Clique nos cards para ver detalhes · organize atividades livremente</span></div><article class="stage-card featured stage-detail-card"><div class="stage-card-head"><span class="status ${selected.status}">${selected.status}</span><h2>${selected.name}</h2><span class="stage-index">${selected.week} · ETAPA ${selected.id} DE 18</span></div><p class="stage-description">${selected.name} em acompanhamento operacional, com atividades, compras e recursos relacionados.</p><div class="stage-card-grid"><div class="stage-progress"><small>PROGRESSO GERAL</small><strong>${selected.progress}%</strong><div class="progress-ring"><i style="width:${selected.progress}%"></i></div><div class="metric-line"><span>Atividades</span><b>4</b></div><div class="metric-line"><span>Responsável</span><b>${selected.owner}</b></div></div><div class="stage-media"><map-scene compact data-stage="${esc(selected.name)}" data-overlay="${stageOverlayKey(selected.name)}" data-map-index="${a.findIndex((x) => x.id === selected.id)}" class="stage-map-detail" aria-label="Mapa da etapa ${esc(selected.name)}"></map-scene><small class="stage-map-status">Highlight: ${stageOverlayLabels[stageOverlayKey(selected.name)]} · ruas, lotes e pontos de acompanhamento</small></div><div class="stage-facts"><div><small>INÍCIO</small><b>03/06/2024</b></div><div><small>PREVISÃO TÉRMINO</small><b>16/06/2024</b></div><div><small>CUSTO PREVISTO</small><b>R$ 24.850,00</b></div><div><small>ASSOCIAÇÕES</small><b>2 compras · 8 materiais</b></div></div></div></article>${activityNames.map((name, i) => `<button class="activity-node stage-activity-card" data-activity-detail="${name}" style="left:${34 + i * 245}px;top:${550 + (i % 2) * 130}px"><span class="activity-kind">${i < 2 ? "SUBATIVIDADE" : "ATIVIDADE"} · ${selected.name}</span><strong>${name}</strong><small>${selected.owner} · ${Math.max(5, selected.progress - i * 12)}%</small><span class="activity-connect">＋</span></button>`).join("")}${details}</div><aside class="stage-rail"><section><h3>${ico("list-checks")} ATIVIDADES DA ETAPA</h3>${activityNames.map((x, i) => `<button class="rail-action" data-activity-detail="${x}">${String(i + 1).padStart(2, "0")} · ${x}</button>`).join("")}</section><section><h3>${ico("history")} HISTÓRICO</h3><div class="history"><p><i></i>Hoje · Medição atualizada</p><p><i></i>Ontem · Material associado</p><p><i></i>05/06 · Compra vinculada</p></div></section><section><h3>${ico("zap")} AÇÕES RÁPIDAS</h3><button class="rail-action">＋ Adicionar atividade</button><button class="rail-action">＋ Associar compra</button><button class="rail-action">＋ Associar material</button></section></aside></div></div>`;
    }
  
    inventory() {
      const rows = [
        ["Terraplanagem", "R$ 420.000", "R$ 388.000", "R$ 32.000", "92%"],
        ["Drenagem Pluvial", "R$ 610.000", "R$ 566.000", "R$ 44.000", "93%"],
        ["Rede de Água", "R$ 350.000", "R$ 210.000", "R$ 140.000", "60%"],
        ["Pavimentação", "R$ 880.000", "R$ 622.000", "R$ 258.000", "71%"],
        ["Rede Elétrica", "R$ 540.000", "R$ 164.000", "R$ 376.000", "30%"],
      ];
      return `<div class="kpi-strip"><stat-pill icon="wallet-cards" label="Orçamento total" value="R$ 2,80M" tone="violet" sub="48 meses"></stat-pill><stat-pill icon="coins" label="Realizado" value="R$ 1,95M" tone="teal" sub="69,6% do orçamento"></stat-pill><stat-pill icon="chart-no-axes-combined" label="Saldo projetado" value="R$ 845k" tone="amber"></stat-pill><stat-pill icon="triangle-alert" label="Variações" value="3" tone="red" sub="Requer análise"></stat-pill></div><glass-card class="float-card balance-main"><div class="card-head"><div><h3>${ico("chart-no-axes-combined")} Balanço financeiro por etapa</h3><small>Relação entre Orçamento, Lançamentos, Resumo Mensal e Indicadores</small></div><span class="chip violet">Junho · 2024</span></div><table><thead><tr><th>Centro de custo / etapa</th><th>Orçado</th><th>Realizado</th><th>Saldo</th><th>Consumo</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="positive">${r[3]}</td><td><span class="status ${r[4].startsWith("9") ? "pendente" : "concluido"}">${r[4]}</span></td></tr>`).join("")}</tbody></table></glass-card><glass-card class="float-card balance-monthly"><h3>${ico("calendar-range")} Resumo mensal</h3>${[
        ["Jan/24", "R$ 182k", "62%"],
        ["Fev/24", "R$ 236k", "68%"],
        ["Mar/24", "R$ 294k", "71%"],
        ["Abr/24", "R$ 348k", "76%"],
        ["Mai/24", "R$ 412k", "82%"],
        ["Jun/24", "R$ 478k", "86%"],
      ]
        .map(
          (r) =>
            `<div class="row"><span>${r[0]}<small>Realizado acumulado</small></span><b>${r[1]}</b><em>${r[2]}</em></div>`,
        )
        .join(
          "",
        )}</glass-card><glass-card class="float-card balance-relations"><h3>${ico("git-branch")} Relações administrativas</h3><div class="relation-chain"><span>Lançamentos</span><b>→</b><span>Resumo Mensal</span><b>→</b><span>Indicadores</span></div><p>Os gastos registrados por data, etapa, fornecedor e valor alimentam o consolidado mensal e os indicadores de avanço físico-financeiro.</p><button data-view="reports">Abrir relatório completo</button></glass-card>`;
    }
    leads() {
      const s = appStore.get().selectedLead,
        lead = demoData.leads[s];
      return `<div class="kpi-strip"><stat-pill icon="users" label="Intenções cadastradas" value="238" tone="violet" sub="+28 hoje"></stat-pill><stat-pill icon="map-pin" label="Lotes com interesse" value="96" tone="blue"></stat-pill><stat-pill icon="phone" label="Leads em contato" value="61" tone="teal"></stat-pill><stat-pill icon="badge-check" label="Qualificados" value="37" tone="amber"></stat-pill></div><glass-card class="float-card public-lead-card"><div class="public-brand">VISTA VERDE <small>LOTEAMENTO</small></div><span class="launch-chip">LANÇAMENTO</span><h2>Encontre o lote ideal<br>para <em>morar ou investir</em></h2><p>Espelho operacional da captação pública: intenção, faixa de valor, terreno e orientação solar chegam ao CRM.</p><div class="public-fields"><input placeholder="Nome completo"><input placeholder="WhatsApp (com DDD)"><input placeholder="E-mail"></div><div class="intent-switch"><button class="selected">⌂ Moradia</button><button>▧ Investimento</button><button>☼ Veraneio</button></div><button class="public-submit">Quero atendimento ${ico("arrow-right")}</button></glass-card><glass-card class="float-card lead-detail"><h3>${ico("user-round-search")} Lead selecionado</h3><div class="person"><span class="avatar">${lead.name[0]}</span><div><strong>${lead.name}</strong><small>${lead.status}</small></div></div><dl><dt>Lote desejado</dt><dd>${lead.lot}</dd><dt>Faixa de valor</dt><dd>${lead.budget}</dd><dt>Nascer do sol</dt><dd>${lead.sun}</dd><dt>Altitude</dt><dd>${lead.altitude}</dd><dt>Terreno</dt><dd>${lead.terrain}</dd><dt>Objetivo</dt><dd>${lead.objective}</dd></dl></glass-card><glass-card class="float-card lot-intents"><h3>Intenções relacionadas</h3>${demoData.leads.map((x, i) => `<button class="lead-row ${i === s ? "selected" : ""}" data-lead="${i}"><span class="avatar">${x.name[0]}</span><span><b>${x.name}</b><small>${x.lot} · ${x.budget}</small></span><em>${x.status}</em></button>`).join("")}</glass-card>`;
    }
    purchases() {
      return `<div class="kpi-strip"><stat-pill icon="clipboard-list" label="Pedidos em aberto" value="12" tone="violet" sub="R$ 485.230"></stat-pill><stat-pill icon="truck" label="Em andamento" value="8" tone="blue" sub="R$ 258.900"></stat-pill><stat-pill icon="clock-alert" label="Atrasadas" value="3" tone="amber" sub="R$ 78.600"></stat-pill><stat-pill icon="circle-check" label="Recebidas no mês" value="18" tone="teal" sub="R$ 612.450"></stat-pill></div><glass-card class="float-card purchase-analysis"><h3>${ico("sparkles")} IA · Análise de compras</h3><p>Há 3 pedidos atrasados com impacto direto em etapas críticas.</p><ul><li>Rede elétrica: postes com 8 dias de atraso</li><li>Drenagem: tubos com 5 dias de atraso</li></ul><button>Ver recomendações</button></glass-card><glass-card class="float-card purchase-summary"><h3>${ico("pie-chart")} Resumo de compras</h3><div class="donut"><span>R$ 1,43M<small>Total no mês</small></span></div><ul class="legend"><li><i class="dot violet"></i> Elétrica 32%</li><li><i class="dot blue"></i> Tubos 25%</li><li><i class="dot green"></i> Concreto 18%</li><li><i class="dot amber"></i> Diversos 15%</li></ul></glass-card><glass-card class="float-card purchases-table"><h3>${ico("shopping-cart")} Pedidos</h3><table><thead><tr><th>ID</th><th>Fornecedor</th><th>Descrição</th><th>Etapa</th><th>Valor</th><th>Status</th></tr></thead><tbody>${demoData.purchases.map((x) => `<tr><td>${x.id}</td><td>${x.supplier}</td><td>${x.desc}</td><td>${x.stage}</td><td>${x.value}</td><td><span class="status ${statusClass(x.status)}">${x.status}</span></td></tr>`).join("")}</tbody></table></glass-card><glass-card class="float-card deliveries"><h3>${ico("truck")} Próximas entregas</h3><div class="row"><span>18 MAI<small>Concreto FCK 25MPa</small></span><em>Em andamento</em></div><div class="row"><span>20 MAI<small>Cabo de alumínio</small></span><em>Em andamento</em></div><div class="row"><span>22 MAI<small>Caixa de passagem</small></span><em>Pendente</em></div></glass-card>`;
    }
    collaborators() {
      return `<glass-card class="float-card collab-main"><h3>${ico("users")} Colaboradores</h3><p>Visualização das pessoas e frentes ativas sobre o mapa.</p>${demoData.collaborators.map((x, i) => `<div class="collab-row"><span class="avatar">${x[0][0]}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${x[2]}</em></div>`).join("")}</glass-card><glass-card class="float-card collab-stats"><h3>${ico("hard-hat")} Presença e alocação</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Atividades externas</span><b>5</b><span>Equipamentos em uso</span></glass-card>`;
    }
    reports() {
      syncLiveSystemReportV1(appStore.get());
      const s = appStore.get(),
        families = [...new Set(reportCatalog.map((report) => report.family))],
        family = families.includes(s.reportFamily) ? s.reportFamily : families[0],
        types = reportCatalog.filter((report) => report.family === family),
        selected = types.find((report) => report.id === s.reportType) || types[0],
        periodLabels = {
          "2024-06": "Junho de 2024",
          "2024-Q2": "2º trimestre de 2024",
          2024: "Ano de 2024",
          all: "Todo o projeto",
        },
        period = ["system-live", "cash-evidence-live", "project-expenses-live", "project-expense-ledger-live", "service-completeness-live"].includes(selected.id)
          ? "Estado atual do sistema"
          : selected.id.startsWith("custom-")
            ? "Modelo sem dados vinculados"
            : "Dados demonstrativos de referência";
      const signalClass = (value) =>
        /crít|risco|atras|atenção|ação|vencid|acima/i.test(String(value))
          ? "warning"
          : /posit|normal|conclu|dentro|planejad/i.test(String(value))
            ? "positive"
            : "neutral";
      const workbookSheets = [
        "Lançamentos",
        "Resumo Mensal",
        "Orçamento",
        "Indicadores",
        "Como Usar",
      ];
      const explanations = {
        "financial-balance":
          "Compara orçamento, gasto realizado, saldo e consumo para cada centro de custo.",
        "monthly-spend":
          "Consolida as nove etapas por competência e o total mensal durante os 48 meses.",
        "budget-coverage":
          "Cruza as metas físicas do orçamento com os gastos alimentados pelos lançamentos.",
        "supplier-payments":
          "Permite auditar fornecedor, documento, quantidade, preço unitário, pagamento e status.",
        "unit-cost-indicators":
          "Converte gasto realizado em custo médio por lote e por metro quadrado de pavimentação.",
        "project-expenses-live":
          "Agrupa as saídas registradas no caixa por etapa e categoria; entradas não entram no total.",
        "project-expense-ledger-live":
          "Lista cada saída real do caixa, incluindo data, vínculo à etapa, descrição e situação fiscal.",
        "service-completeness-live":
          "Percentual inferido por serviço OCR vinculado à etapa: usa avanço explícito; sem esse dado, somente status final conta como concluído. Etapas sem evidência não recebem percentual.",
      };
      const explanation =
        explanations[selected.id] ||
        "Leitura gerencial vinculada às entidades, etapas e registros operacionais correspondentes.";
      const rowDetails = selected.rows
        .map(
          (row, index) =>
            `<tr class="report-detail-row" data-report-detail="${index}" hidden><td colspan="${selected.columns.length + 1}"><div><b>${esc(row[0])}</b><span>Origem: ${esc(selected.source)} · período ${esc(period)}.</span><span>Composição: ${esc(selected.columns.map((column, col) => `${column}: ${row[col] ?? "—"}`).join(" · "))}.</span><span>Ação administrativa: conferir lançamento, vínculo da etapa e evidências antes do fechamento.</span></div></td></tr>`,
        )
        .join("");
      return `<div class="reports-workspace"><div class="reports-toolbar" aria-label="Toolbar de relatórios"><div class="report-toolbar-title"><span class="activity-kind">CENTRAL ADMINISTRATIVA</span><strong>Central de métricas</strong><small>${reportCatalog.length} leituras administrativas, operacionais e comerciais</small></div><label>Família<select data-report-family>${families.map((value) => `<option value="${esc(value)}" ${value === family ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label><label>Relatório<select data-report-type>${types.map((report) => `<option value="${esc(report.id)}" ${report.id === selected.id ? "selected" : ""}>${esc(report.label)}</option>`).join("")}</select></label><label>Período<select data-report-period><option value="2024-06" ${s.reportPeriod === "2024-06" ? "selected" : ""}>Junho de 2024</option><option value="2024-Q2" ${s.reportPeriod === "2024-Q2" ? "selected" : ""}>2º trimestre de 2024</option><option value="2024" ${s.reportPeriod === "2024" ? "selected" : ""}>Ano de 2024</option><option value="all" ${s.reportPeriod === "all" ? "selected" : ""}>Todo o projeto</option></select></label><button type="button" class="report-toolbar-button report-export" data-report-export>${ico("file-down")} Exportar CSV</button><button type="button" class="report-toolbar-button report-print" data-report-print>${ico("printer")} Imprimir</button></div><nav class="report-family-tabs" aria-label="Abas de família de métricas">${families.map((value) => `<button type="button" class="${value === family ? "active" : ""}" data-report-family-tab="${esc(value)}">${esc(value)}<small>${reportCatalog.filter((item) => item.family === value).length} métricas</small></button>`).join("")}</nav><section class="report-type-tabs" aria-label="Subitens explicativos da família">${types.map((report) => `<button type="button" class="${report.id === selected.id ? "active" : ""}" data-report-type-tab="${esc(report.id)}"><strong>${esc(report.label)}</strong><small>${esc(explanations[report.id] || report.description)}</small><span>${ico(report.icon)} ${esc(report.source)}</span></button>`).join("")}</section><glass-card class="float-card reports-main"><div class="card-head"><div><h3>${ico(selected.icon)} ${esc(selected.label)}</h3><small>${esc(selected.description)}</small></div><span class="chip violet">${esc(period)} · Atualizado agora</span></div><div class="report-context"><span>${ico("database")} Fonte: ${esc(selected.source)}</span><span>${esc(selected.family)} · relatório gerencial</span></div><div class="report-explainer"><b>${ico("circle-help")} Como interpretar</b><span>${esc(explanation)}</span><small>Planilha disponível: ${workbookSheets.join(" · ")}.</small></div><div class="report-grid">${selected.metrics.map((metric) => `<div class="report-metric"><small>${esc(metric[0])}</small><strong>${esc(metric[1])}</strong><span>${esc(metric[2])}</span></div>`).join("")}</div><div class="report-table-wrap"><table class="report-table"><thead><tr>${selected.columns.map((column) => `<th>${esc(column)}</th>`).join("")}<th>Desdobrar</th></tr></thead><tbody>${selected.rows.map((row, index) => `<tr class="report-data-row" data-report-row="${index}">${row.map((cell, col) => `<td>${col === row.length - 1 ? `<span class="report-signal ${signalClass(cell)}">${esc(cell)}</span>` : esc(cell)}</td>`).join("")}<td><button type="button" class="report-row-toggle" data-report-row-toggle="${index}" aria-expanded="false">Ver itens</button></td></tr>`).join("")}${rowDetails}</tbody></table></div><div class="report-footer"><span>${ico("link-2")} Relacionado às tabelas do projeto e ao período selecionado.</span><button type="button" class="report-inline-export" data-report-export>${ico("download")} Baixar relatório</button></div></glass-card></div>`;
    }
    settings() {
      const s = appStore.get(),
        actor = s.currentActor || { name: "Warley", label: "Dono" },
        audit = [...(s.actionAudit || [])].reverse();
      const category = (label = "") => {
        const text = label.toLowerCase();
        if (/mapa|lote|highlight|pintura|área|pan|street|segmento/.test(text))
          return "Mapa";
        if (/registro|diário|evidência|progresso|medição/.test(text))
          return "Registros";
        if (/relatório|export|impressão|métrica/.test(text)) return "Relatórios";
        if (/lead|reserva|whatsapp|comiss|contrato/.test(text))
          return "Comercial";
        if (/etapa|atividade|agenda|afazer|canvas|workflow/.test(text))
          return "Operação";
        if (/sincron|config|sessão|instal|firebase|banco|pat/.test(text))
          return "Sistema";
        return "Navegação";
      };
      const groups = [
        "Navegação",
        "Operação",
        "Mapa",
        "Registros",
        "Relatórios",
        "Comercial",
        "Sistema",
      ]
        .map((name) => [
          name,
          audit.filter((item) => category(item.label) === name).length,
        ])
        .filter(([, count]) => count);
      const started = new Date(s.sessionStarted),
        elapsed = Math.max(0, Date.now() - started.getTime()),
        elapsedText =
          elapsed < 60000 ? "agora" : `${Math.floor(elapsed / 60000)} min`;
      const formatTime = (value) =>
        new Date(value).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      return `<section class="settings-page">
        <header class="settings-intro"><div><span class="activity-kind">GOVERNANÇA DE USO · SESSÃO ATUAL</span><h2>${ico("activity")} Métricas de ações do usuário</h2><p>Auditoria operacional das interações feitas no sistema por <b>${esc(actor.name)} · ${esc(actor.label)}</b>. O histórico permanece neste navegador durante esta sessão.</p></div><div class="settings-actions"><button type="button" class="ghost" data-audit-export>${ico("file-down")} Exportar histórico</button><button type="button" class="danger" data-audit-clear>${ico("trash-2")} Limpar sessão</button></div></header>
        <section class="audit-summary" aria-label="Resumo de uso"><article><small>Ações registradas</small><strong>${audit.length}</strong><span>eventos desta sessão</span></article><article><small>Tempo em sessão</small><strong>${elapsedText}</strong><span>iniciada às ${formatTime(s.sessionStarted)}</span></article><article><small>Módulos utilizados</small><strong>${groups.length}</strong><span>${groups.map(([name]) => name).join(" · ") || "aguardando interação"}</span></article><article><small>Última ação</small><strong class="audit-last-action">${esc(s.lastAction || "—")}</strong><span>${audit[0] ? formatTime(audit[0].at) : "sem eventos"}</span></article></section>
        <section class="audit-grid"><glass-card class="audit-card audit-distribution"><div class="card-head"><div><h3>${ico("chart-no-axes-combined")} Distribuição por área</h3><small>Classificação automática a partir da ação executada.</small></div><span class="chip violet">${s.sessionId}</span></div><div class="audit-bars">${groups.length ? groups.map(([name, count]) => `<div class="audit-bar"><span>${esc(name)}</span><b>${count}</b><i style="--audit-size:${Math.max(12, Math.round((count / audit.length) * 100))}%"></i></div>`).join("") : '<p class="audit-empty">As ações aparecerão aqui conforme a equipe utilizar os módulos.</p>'}</div></glass-card>
        <glass-card class="audit-card audit-session"><div class="card-head"><div><h3>${ico("shield-check")} Contexto da sessão</h3><small>Rastreabilidade local de operação.</small></div></div><dl><div><dt>Ator</dt><dd>${esc(actor.name)} · ${esc(actor.label)}</dd></div><div><dt>ID da sessão</dt><dd><code>${esc(s.sessionId)}</code></dd></div><div><dt>Início</dt><dd>${new Date(s.sessionStarted).toLocaleString("pt-BR")}</dd></div><div><dt>Último módulo</dt><dd>${esc(audit[0]?.view || s.view)}</dd></div></dl><p class="audit-note">Esta métrica resume uso e navegação; não substitui uma trilha de auditoria imutável de servidor.</p></glass-card></section>
        <glass-card class="audit-card audit-timeline"><div class="card-head"><div><h3>${ico("list-checks")} Linha do tempo de interações</h3><small>${audit.length} eventos capturados · mais recente primeiro</small></div></div><div class="audit-events">${audit.length ? audit.map((item) => `<article><time>${formatTime(item.at)}</time><div><b>${esc(item.label)}</b><small>${esc(category(item.label))} · ${esc(item.view || "dashboard")} · ${esc(item.actor || "Warley")}</small></div><span>${ico("circle-check")}</span></article>`).join("") : '<p class="audit-empty">Nenhuma ação registrada nesta sessão.</p>'}</div></glass-card>
        <footer class="settings-tools"><span>Configuração de repositório e segredos gerenciada pelo Cloudflare Worker.</span></footer>
      </section>`;
    }
  }
  return ViewLayer;
};
