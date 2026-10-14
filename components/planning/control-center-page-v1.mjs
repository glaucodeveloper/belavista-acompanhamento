/** Complete control-center page renderer, material/stage editor, and lifecycle bindings. */
export const createControlCenterPageV1 = ({
  appStore,
  executionModel,
  demoData,
  commissionDeals,
  brokerReasonsV9,
  controlCenterMaterialRowsV1,
  controlCenterFinanceRowsV1,
  controlCenterMoneyV1,
  controlCenterRecordChangeV1,
  controlCenterPublishV1,
  controlCenterRealtimeLabelV1,
  controlStageProfileV1,
  controlStageContextMarkupV1,
  controlStageUnifiedFormMarkupV1,
  controlStageContextPayloadV1,
  cashRecordLauncherMarkupV1,
  subscribeOperationalControlCenter,
  readIntegrationSettings,
  INTEGRATION_SETTINGS_KEY,
  apiFetch,
  operationalHeaders,
  stageV9StatusFor,
  formatBRL,
  esc,
  ico,
  notify,
} = {}) => {
  const installRenderer = (ViewLayer) => {
    ViewLayer.prototype.control = function () {
      const state = appStore.get(),
        cash = state.cashSummary || {},
        operational = state.operationalState || {},
        stages = executionModel.stages || [],
        materials = controlCenterMaterialRowsV1(state),
        financeRows = controlCenterFinanceRowsV1(state),
        reasons = brokerReasonsV9(state),
        deals = [...commissionDeals, ...(state.commissionEntries || [])],
        events = Object.values(state.controlRealtime?.events || {})
          .slice(-6)
          .reverse(),
        logs = (state.controlChangeLog || []).slice(0, 6);
      const stageRows = stages
        .map((stage) => {
          const live = stageV9LiveFor(stage),
            computed =
              (operational.stages || []).find((item) => item.key === stage.key) ||
              {},
            progress = Number(computed.progress ?? live.progress) || 0;
          return `<tr><td><b>${esc(stage.name)}</b><small>${esc(stage.key)}</small></td><td>${stage.priority || "—"}</td><td>${stage.dependsOn?.length ? esc(stage.dependsOn.join(" · ")) : "Origem"}</td><td>${esc(stage.production?.quantity ?? "—")} ${esc(stage.production?.unit || "")}</td><td><i class="control-progress"><em style="width:${Math.max(0, Math.min(100, progress))}%"></em></i><b>${progress}%</b></td><td>${esc(progress >= 100 ? "Concluída" : progress > 0 ? "Em andamento" : "Planejada")}</td></tr>`;
        })
        .join("");
      const materialRows = materials
        .map(
          (item) =>
            `<tr data-control-material-row="${esc(item.id)}"><td><b>${esc(item.stageName)}</b><small>${esc(item.activityName)}</small></td><td>${esc(item.name)}<small>${esc(item.scope || "")}</small></td><td><input data-control-material-field="quantity" data-control-material-id="${esc(item.id)}" type="number" min="0" step="any" value="${item.quantity == null ? "" : esc(item.quantity)}" aria-label="Quantidade de ${esc(item.name)}"></td><td><input data-control-material-field="unit" data-control-material-id="${esc(item.id)}" value="${esc(item.unit || "")}" aria-label="Unidade de ${esc(item.name)}"></td><td><select data-control-material-field="status" data-control-material-id="${esc(item.id)}"><option ${item.status === "Planejado" ? "selected" : ""}>Planejado</option><option ${item.status === "Em andamento" ? "selected" : ""}>Em andamento</option><option ${item.status === "Atenção" ? "selected" : ""}>Atenção</option><option ${item.status === "Concluído" ? "selected" : ""}>Concluído</option><option ${item.status === "Dimensionar" ? "selected" : ""}>Dimensionar</option></select></td></tr>`,
        )
        .join("");
      const financeTable = financeRows
        .map(
          (row) =>
            `<tr><td>${esc(row.date || row.createdAt || "—")}</td><td>${esc(row.kind || row.type || "Lançamento")}</td><td>${esc(row.stage || row.etapa || "Caixa mestre")}</td><td>${controlCenterMoneyV1(row)}</td><td>${esc(row.description || row.details || "Registro de caixa")}</td></tr>`,
        )
        .join("");
      const commissionRows = reasons
        .map(
          (reason) =>
            `<tr><td><b>${esc(reason.label)}</b><small>${esc(reason.payment)}</small></td><td><input data-control-commission-field="sharePercent" data-control-commission-id="${esc(reason.id)}" type="number" min="0" max="100" step="0.1" value="${Number(reason.sharePercent || 0)}" aria-label="Participação de ${esc(reason.label)}"></td><td>${Number(reason.warley || 0)}%</td><td>${Number(reason.partner || 0)}%</td><td><label class="control-switch"><input data-control-commission-field="active" data-control-commission-id="${esc(reason.id)}" type="checkbox" ${reason.active !== false ? "checked" : ""}> ativa</label></td></tr>`,
        )
        .join("");
      const eventRows = [
        ...logs.map((item) => ({
          kind: "Edição local",
          label: item.label,
          detail: item.detail,
          at: item.at,
        })),
        ...events.map((item) => ({
          kind: "RTDB",
          label: item.type || "agentBridgeEvents",
          detail: item.entity
            ? `${item.entity} · ${item.entityId || ""}`
            : "Evento recebido",
          at: item.createdAt || item.updatedAt,
        })),
      ]
        .slice(0, 8)
        .map(
          (item) =>
            `<li><span>${esc(item.kind)}</span><b>${esc(item.label)}</b><small>${esc(item.detail || "")} · ${item.at ? new Date(item.at).toLocaleString("pt-BR") : "agora"}</small></li>`,
        )
        .join("");
      return `<section class="control-center-page"><header class="control-center-head"><div><span class="activity-kind">CENTRAL ADMINISTRATIVA · ESCUTA ATIVA</span><h1>Finanças, materiais, etapas e comissões</h1><p>Uma tabela de referência para o agente ouvir alterações, recalcular relações e sugerir a próxima ação.</p></div><div class="control-center-head-actions"><span class="control-live-dot">${ico("radio")} ${esc(controlCenterRealtimeLabelV1(state))}</span><button type="button" data-view="assistant">${ico("arrow-left")} Dashboard</button></div></header><section class="control-center-kpis"><article><small>CAIXA MESTRE</small><b>${formatBRL(Number(cash.balanceCents || operational.cash?.balanceCents || 0) / 100)}</b><span>fonte do cálculo de prioridade</span></article><article><small>MATERIAIS / ATIVIDADES</small><b>${materials.length}</b><span>${materials.filter((item) => item.status === "Atenção").length} em atenção</span></article><article><small>ETAPAS RELACIONAIS</small><b>${stages.length}</b><span>produção e dependências</span></article><article><small>COMISSÕES</small><b>${deals.length}</b><span>${reasons.length} razões editáveis</span></article></section><section class="control-center-section"><header><div><span class="activity-kind">01 · FLUXO FINANCEIRO</span><h2>Caixa que orienta o andamento</h2><p>O saldo e os lançamentos alimentam a cobertura das etapas; registros financeiros continuam sob responsabilidade do Dono.</p></div><button type="button" data-view="finance">Abrir financeiro ${ico("arrow-up-right")}</button></header><div class="control-table-wrap"><table class="control-center-table"><thead><tr><th>Data</th><th>Tipo</th><th>Vínculo</th><th>Valor</th><th>Descrição</th></tr></thead><tbody>${financeTable}</tbody></table></div></section><section class="control-center-section"><header><div><span class="activity-kind">02 · MATERIAIS POR ATIVIDADE</span><h2>Composição editável das frentes</h2><p>Edite quantidade, unidade ou situação. Cada alteração gera uma entrada local e um evento de escuta para o agente.</p></div><span class="control-section-note">${materials.length} itens relacionados</span></header><div class="control-table-wrap"><table class="control-center-table control-editable-table"><thead><tr><th>Etapa / atividade</th><th>Material ou equipamento</th><th>Quantidade</th><th>Unidade</th><th>Status</th></tr></thead><tbody>${materialRows}</tbody></table></div></section><section class="control-center-section"><header><div><span class="activity-kind">03 · ETAPAS E PRODUÇÃO</span><h2>Relação de execução</h2><p>Prioridade, dependências, unidade de produção e avanço comprovado em uma só leitura.</p></div><button type="button" data-view="stages">Abrir etapas ${ico("arrow-up-right")}</button></header><div class="control-table-wrap"><table class="control-center-table"><thead><tr><th>Etapa</th><th>Prioridade</th><th>Dependências</th><th>Meta / unidade</th><th>Avanço</th><th>Status</th></tr></thead><tbody>${stageRows}</tbody></table></div></section><section class="control-center-section"><header><div><span class="activity-kind">04 · COMISSÕES E REPASSES</span><h2>Razões que o sistema deve respeitar</h2><p>As razões ficam editáveis para o Administrador; a aplicação deve refletir imediatamente nos relatórios mensais, anuais e acumulados.</p></div><button type="button" data-view="brokers">Abrir corretores ${ico("arrow-up-right")}</button></header><div class="control-table-wrap"><table class="control-center-table control-editable-table"><thead><tr><th>Razão</th><th>Participação</th><th>Warley</th><th>Contraparte</th><th>Estado</th></tr></thead><tbody>${commissionRows}</tbody></table></div></section>${controlStageContextMarkupV1(state, stages)}<aside class="control-center-listener"><header><div><span class="activity-kind">07 · PONTE DE ESCUTA</span><h2>Últimas edições e eventos ouvidos</h2></div><span>${esc(controlCenterRealtimeLabelV1(state))}</span></header><ol>${eventRows || "<li><b>Nenhuma edição registrada nesta sessão.</b><small>Altere um material, uma compreensão de etapa ou uma razão de comissão para testar a propagação.</small></li>"}</ol></aside></section>`;
    };
    
    const controlCenterBaseV1 = ViewLayer.prototype.control;
    ViewLayer.prototype.control = function (...args) {
      const html = controlCenterBaseV1.apply(this, args),
        marker =
          '<section class="control-center-section"><header><div><span class="activity-kind">01 · FLUXO FINANCEIRO';
      return html.replace(
        marker,
        `${cashRecordLauncherMarkupV1("control")}${marker}`,
      );
    };
    
    ViewLayer.prototype.connectControlCenterListenerV1 = async function () {
      if (this._controlCenterListenerV1) return;
      this._controlCenterListenerV1 = true;
      try {
        this._unsubscribeControlCenterV1 = await subscribeOperationalControlCenter(
          this.constructor === undefined ? {} : appStore.get().currentActor || {},
          (payload) => {
            appStore.set({
              controlRealtime: payload,
              lastAction: `Ouviu ${payload.source || "evento"} no Firebase`,
            });
          },
        );
      } catch (error) {
        console.info(
          "Escuta da Central indisponível; edição local permanece ativa.",
          error,
        );
      }
    };
  };

  const installEvents = (ViewLayer) => {
    const upgradeControlCenterMaterialsV1 = (root, state) => {
      const section = [...root.querySelectorAll(".control-center-section")].find(
        (item) =>
          item
            .querySelector(".activity-kind")
            ?.textContent.includes("02 · MATERIAIS"),
      );
      const host = section?.querySelector(".control-table-wrap");
      if (!host || host.dataset.materialAccordionReady === "true") return;
      const stages = executionModel.stages || [],
        selectedKey = state.selectedPlanningStage || "",
        tabs = [
          { key: "all", name: "Todas as frentes" },
          ...stages.map((stage) => ({ key: stage.key, name: stage.name })),
        ];
      host.outerHTML = `<div class="control-material-accordion-host control-front-bases-layout" data-material-accordion-ready="true"><nav class="control-front-bases-tabs" aria-label="Navegação das bases das frentes">${tabs.map((tab) => `<button type="button" class="${(tab.key === "all" && !selectedKey) || tab.key === selectedKey ? "active" : ""}" data-front-stage-tab="${esc(tab.key)}"><small>${tab.key === "all" ? "BASE" : "ETAPA"}</small><span>${esc(tab.name)}</span></button>`).join("")}</nav><div class="control-front-bases-content"><div class="control-front-bases-intro"><span class="activity-kind">BASES DAS FRENTES</span><h3>Formulário da frente em foco</h3><p>Selecione uma etapa na barra lateral para alternar a sessão e editar no mesmo formulário suas propriedades, requisitos, execução, produção e materiais.</p></div><div data-control-front-stage-session>${controlStageUnifiedFormMarkupV1({ ...state, selectedPlanningStage: selectedKey }, stages)}</div><div class="control-front-ai-hint"><span class="activity-kind">INTELIGÊNCIA ARTIFICIAL</span><b>As instruções de organização fazem parte do formulário da etapa.</b><small>Use os campos de pedido e contexto para orientar agrupamentos, prioridades e requisições do Worker.</small></div></div></div>`;
      root
        .querySelector(
          ".control-stage-context-section:not(.control-stage-unified-section)",
        )
        ?.remove();
    };
    const bindControlStageUnifiedFormV1 = (layer) => {
      const root = layer.querySelector(".control-center-page"),
        materialHost = root?.querySelector("[data-material-accordion-ready]");
      if (!root || !materialHost) return;
      if (materialHost.dataset.tabsBound !== "true") {
        materialHost.dataset.tabsBound = "true";
        materialHost.querySelectorAll("[data-front-stage-tab]").forEach((tab) =>
          tab.addEventListener("click", () => {
            const key = tab.dataset.frontStageTab;
            appStore.set({
              selectedPlanningStage: key === "all" ? "" : key,
              lastAction:
                key === "all"
                  ? "Abriu a base de todas as frentes"
                  : `Abriu o formulário da etapa ${key}`,
            });
          }),
        );
      }
      const inlineStageRecord = root.querySelector(
        "[data-control-stage-inline-record]",
      );
      const inlineStageRecordSubmit = inlineStageRecord?.querySelector(
        "[data-control-inline-record-submit]",
      );
      if (inlineStageRecord && !inlineStageRecord.querySelector("[data-inline-record-category]")) {
        const detailsLabel = inlineStageRecord.querySelector("[data-inline-record-details]")?.closest("label");
        detailsLabel?.insertAdjacentHTML("beforebegin", `<div class="control-inline-record-extra-v1"><label>Categoria / tipo<select data-inline-record-category><option value="execucao">Execução</option><option value="medicao">Medição</option><option value="vistoria">Vistoria</option><option value="material">Material</option><option value="ocorrencia">Ocorrência</option></select></label><label>Avanço confirmado <output data-inline-record-progress-output>0%</output><input data-inline-record-progress type="range" min="0" max="100" value="0"></label><label>Foto ou comprovante<input data-inline-record-photo type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment"></label></div>`);
        inlineStageRecord.querySelector("[data-inline-record-progress]")?.addEventListener("input", (event) => {
          inlineStageRecord.querySelector("[data-inline-record-progress-output]").value = `${event.target.value}%`;
        });
      }
      if (
        inlineStageRecord &&
        inlineStageRecordSubmit &&
        inlineStageRecordSubmit.dataset.recordBound !== "true"
      ) {
        inlineStageRecordSubmit.dataset.recordBound = "true";
        inlineStageRecordSubmit.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
    
          const button = event.currentTarget,
            statusNode = inlineStageRecord.querySelector(
              "[data-control-inline-record-status]",
            ),
            stageKey = String(
              inlineStageRecord.dataset.controlStageInlineRecord || "",
            ),
            stageName = String(
              inlineStageRecord.dataset.controlStageInlineRecordName || "",
            ),
            activity = String(
              inlineStageRecord.querySelector("[data-inline-record-activity]")
                ?.value || stageName,
            ).trim(),
            responsible = String(
              inlineStageRecord.querySelector("[data-inline-record-responsible]")
                ?.value || "",
            ).trim(),
            details = String(
              inlineStageRecord.querySelector("[data-inline-record-details]")
                ?.value || "",
            ).trim(),
            recordStatus = String(
              inlineStageRecord.querySelector("[data-inline-record-status]")
                ?.value || "Pendente",
            ),
            now = new Date(),
            pad = (value) => String(value).padStart(2, "0"),
            defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
              now.getDate(),
            )}`,
            defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`,
            date = inlineStageRecord.querySelector('[data-inline-record-date]')?.value || defaultDate,
            time = inlineStageRecord.querySelector('[data-inline-record-time]')?.value || defaultTime;
    
          if (!details) {
            if (statusNode)
              statusNode.textContent =
                "Descreva a medição, ocorrência ou evidência antes de registrar.";
            inlineStageRecord
              .querySelector("[data-inline-record-details]")
              ?.focus();
            return;
          }
    
          const photo = inlineStageRecord.querySelector("[data-inline-record-photo]")?.files?.[0];
          if (photo && photo.size > 6 * 1024 * 1024) {
            if (statusNode) statusNode.textContent = "O anexo deve ter até 6 MB.";
            return;
          }
          let evidenceUri = "";
          if (photo) {
            try {
              evidenceUri = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Falha ao ler o anexo."));
                reader.readAsDataURL(photo);
              });
            } catch {
              if (statusNode) statusNode.textContent = "Não foi possível ler o anexo.";
              return;
            }
          }
          const category = String(inlineStageRecord.querySelector("[data-inline-record-category]")?.value || "execucao");
          const progress = Number(inlineStageRecord.querySelector("[data-inline-record-progress]")?.value || 0);
          const payload = {
            obra: "Aliança Park",
            etapa: stageName,
            categoria: category,
            tipo: category,
            atividade: activity || stageName,
            data: date,
            hora: time,
            responsavel: responsible,
            detalhes: `${details}\nAvanço confirmado: ${progress}%`,
            progresso: progress,
            evidenceUri: evidenceUri || undefined,
            status: recordStatus,
          };
    
          button.disabled = true;
          if (statusNode)
            statusNode.textContent = `Salvando registro em ${stageName}...`;
    
          try {
            const response = await apiFetch("/api/records", {
              method: "POST",
              headers: operationalHeaders({
                "Content-Type": "application/json",
              }),
              body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const record = await response.json();
    
            inlineStageRecord.querySelector("[data-inline-record-details]").value =
              "";
    
            appStore.update((current) => ({
              ...current,
              records: [record, ...(current.records || [])],
              selectedPlanningStage: stageKey || current.selectedPlanningStage,
              lastAction: `Criou registro de ${activity} destinado à etapa ${stageName}`,
            }));
            notify(`Registro salvo em ${stageName}.`, "success");
          } catch (error) {
            button.disabled = false;
            if (statusNode)
              statusNode.textContent =
                "Serviço operacional indisponível; registro não confirmado.";
            notify(
              "Serviço operacional indisponível; registro não confirmado.",
              "warning",
            );
            console.warn("Registro rápido da etapa indisponível.", error);
          }
        });
      }
    
      const selector = root.querySelector("[data-control-stage-selector]");
      if (selector && selector.dataset.unifiedBound !== "true") {
        selector.dataset.unifiedBound = "true";
        selector.addEventListener("change", (event) =>
          appStore.set({
            selectedPlanningStage: event.currentTarget.value,
            lastAction: `Selecionou compreensão da etapa ${event.currentTarget.value}`,
          }),
        );
      }
      const add = root.querySelector("[data-control-context-add-material]");
      if (add && add.dataset.unifiedBound !== "true") {
        add.dataset.unifiedBound = "true";
        add.addEventListener("click", () => {
          const form = root.querySelector("[data-control-stage-context-form]"),
            grid = form?.querySelector(".control-stage-property-grid");
          if (!grid) return;
          grid.querySelector("[data-control-context-empty]")?.remove();
          const row = document.createElement("article");
          row.className = "control-stage-property";
          row.setAttribute("data-control-context-material-row", "");
          row.innerHTML = `<header><div><small>PROPRIEDADE MATERIAL · Atividade principal</small><h3>Nova propriedade</h3><p>Requisito operacional da etapa.</p></div><span class="control-material-status">Planejado</span></header><div class="control-stage-property-fields"><label><span>Material / equipamento</span><input name="materialName" placeholder="Ex.: Tubo PEAD"></label><label><span>Descrição / uso</span><input name="materialDescription" placeholder="Uso, bitola ou escopo"></label><label><span>Quantidade</span><input name="materialQuantity" type="number" min="0" step="any" placeholder="A medir"></label><label><span>Unidade</span><input name="materialUnit" placeholder="m, un, m²"></label><label><span>Situação</span><select name="materialStatus"><option>Planejado</option><option>Em andamento</option><option>Atenção</option><option>Concluído</option><option>Dimensionar</option></select></label><button type="button" class="control-remove-context-material" aria-label="Remover material">${ico("trash-2")} Remover</button></div>`;
          grid.appendChild(row);
          row
            .querySelector(".control-remove-context-material")
            ?.addEventListener("click", () => row.remove());
          row.querySelector('[name="materialName"]')?.focus();
          window.lucide?.createIcons();
        });
      }
      root
        .querySelectorAll(".control-remove-context-material")
        .forEach((button) => {
          if (button.dataset.unifiedBound === "true") return;
          button.dataset.unifiedBound = "true";
          button.addEventListener("click", () =>
            button.closest("[data-control-context-material-row]")?.remove(),
          );
        });
      const form = root.querySelector("[data-control-stage-context-form]");
      if (!form) return;
      if (form.dataset.organizationFieldsReady !== "true") {
        form.dataset.organizationFieldsReady = "true";
        const stageKey = form.dataset.controlStageContextForm,
          profile = controlStageProfileV1(
            (executionModel.stages || []).find((item) => item.key === stageKey) ||
              {},
            appStore.get(),
          ),
          fields = document.createElement("div");
        fields.className = "control-front-ai-fields";
        fields.innerHTML = `<div class="control-front-ai-fields-head"><span class="activity-kind">ORGANIZAÇÃO PARA IA</span><b>Como o agente deve interpretar e montar as requisições</b><small>Textos salvos junto à compreensão desta etapa e enviados na propagação operacional.</small></div><label><span>Pedido de organização<small>Objetivo textual da próxima organização.</small></span><textarea name="organizationRequest" rows="4" placeholder="Ex.: agrupe por frente, destaque pendências e gere a próxima requisição.">${esc(profile.organizationRequest || "")}</textarea></label><label><span>Contexto e critérios<small>Regras, restrições e prioridades que devem ser consideradas.</small></span><textarea name="organizationContext" rows="4" placeholder="Ex.: considere estoque, prazo, equipe, dependências e evidências obrigatórias.">${esc(profile.organizationContext || "")}</textarea></label>`;
        form.querySelector("footer")?.before(fields);
      }
      if (form.dataset.unifiedSubmitBound === "true") return;
      form.dataset.unifiedSubmitBound = "true";
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const stageKey = form.dataset.controlStageContextForm,
          payload = controlStageContextPayloadV1(form),
          currentSettings = {
            ...(readIntegrationSettings() || {}),
            ...(appStore.get().integrationSettings || {}),
          },
          previousProfile = currentSettings.stageProfiles?.[stageKey] || {};
        const changedFields = [
          "requirements",
          "conditions",
          "typicalDescription",
          "organizationRequest",
          "organizationContext",
          "requestHints",
          "evidenceFocus",
          "procurementFocus",
          "production",
          "materialsTable",
          "notificationTargets",
        ].filter(
          (field) =>
            JSON.stringify(previousProfile[field] ?? "") !==
            JSON.stringify(payload[field] ?? ""),
        );
        const nextSettings = {
          ...currentSettings,
          stageProfiles: {
            ...(currentSettings.stageProfiles || {}),
            [stageKey]: payload,
          },
        };
        localStorage.setItem(
          INTEGRATION_SETTINGS_KEY,
          JSON.stringify(nextSettings),
        );
        appStore.set({
          integrationSettings: nextSettings,
          selectedPlanningStage: stageKey,
          aiComprehensionChanges: {
            stageKey,
            fields: changedFields,
            at: new Date().toISOString(),
          },
          lastAction: `Salvou compreensão operacional da etapa ${stageKey}`,
        });
        const stage = (executionModel.stages || []).find(
            (item) => item.key === stageKey,
          ),
          dbStage = demoData.activities.find((item) => item.name === stage?.name),
          actor = appStore.get().currentActor || {};
        try {
          if (dbStage?.id) {
            const response = await apiFetch(
              `/api/stages-admin/${encodeURIComponent(dbStage.id)}/ai`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "x-belavista-role": actor.role || "admin",
                  "x-belavista-user": actor.uid || "local-admin",
                  "x-belavista-name": actor.name || "Administrador",
                },
                body: JSON.stringify({
                  requirements: payload.requirements,
                  conditions: payload.conditions,
                  typicalDescription: payload.typicalDescription,
                  organizationRequest: payload.organizationRequest,
                  organizationContext: payload.organizationContext,
                  requestHints: payload.requestHints,
                  evidenceFocus: payload.evidenceFocus,
                  procurementFocus: payload.procurementFocus,
                  notificationTargets: payload.notificationTargets,
                  executionProfile: { production: payload.production },
                }),
              },
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.info(
            "Persistência central da compreensão indisponível; mantendo edição local.",
            error,
          );
        }
        const entry = controlCenterRecordChangeV1(
          "Compreensão da etapa editada",
          `${stageKey} · ${payload.materialsTable.length} materiais · ${payload.requirements.length} requisitos`,
          { entity: "stageAiConfig", entityId: stageKey },
        );
        controlCenterPublishV1(
          "control.stage-context.updated",
          "stageAiConfig",
          stageKey,
          { ...payload, changeId: entry.id },
        );
        const loop = layer.runOperationalLoop?.("stage.context.changed", {
          quiet: true,
        });
        loop?.catch?.(() => {});
        notify(
          "Compreensão salva; requisitos, materiais e produtividade foram enviados ao Worker.",
          "success",
        );
      });
    };
    const renderBeforeControlCenterV1 = ViewLayer.prototype.render;
    ViewLayer.prototype.render = function () {
      renderBeforeControlCenterV1.call(this);
      if (appStore.get().view === "control") {
        const head = this.querySelector(".activity-header");
        if (head) {
          const title = head.querySelector("span"),
            subtitle = head.querySelector("small");
          if (title) title.textContent = "Central de operação";
          if (subtitle)
            subtitle.textContent =
              "Tabelas relacionais, edições e escuta do agente";
        }
        upgradeControlCenterMaterialsV1(this, appStore.get());
        bindControlStageUnifiedFormV1(this);
      }
    };
    const bindBeforeControlCenterV1 = ViewLayer.prototype.bind;
    ViewLayer.prototype.bind = function () {
      bindBeforeControlCenterV1.call(this);
      const root = this.querySelector(".control-center-page");
      if (!root) return;
      this.connectControlCenterListenerV1();
      const materialHost = root.querySelector("[data-material-accordion-ready]");
      if (materialHost && !materialHost.dataset.tabsBound) {
        materialHost.dataset.tabsBound = "true";
        materialHost.querySelectorAll("[data-front-stage-tab]").forEach((tab) =>
          tab.addEventListener("click", () => {
            const key = tab.dataset.frontStageTab;
            appStore.set({
              selectedPlanningStage: key === "all" ? "" : key,
              lastAction:
                key === "all"
                  ? "Abriu a base de todas as frentes"
                  : `Abriu o formulário da etapa ${key}`,
            });
          }),
        );
      }
      root.querySelectorAll("[data-control-material-field]").forEach((input) =>
        input.addEventListener("change", (event) => {
          const id = input.dataset.controlMaterialId,
            field = input.dataset.controlMaterialField,
            value =
              field === "quantity"
                ? input.value === ""
                  ? null
                  : Number(input.value)
                : input.value;
          appStore.update((state) => ({
            ...state,
            controlMaterialOverrides: {
              ...(state.controlMaterialOverrides || {}),
              [id]: {
                ...(state.controlMaterialOverrides || {})[id],
                [field]: value,
              },
            },
          }));
          const entry = controlCenterRecordChangeV1(
            `Material ${field} editado`,
            `${id} · ${String(value ?? "medir")}`,
            { entity: "material", entityId: id },
          );
          controlCenterPublishV1("control.material.updated", "material", id, {
            field,
            value,
            changeId: entry.id,
          });
          const materialLoop = this.runOperationalLoop?.("material.changed", {
            quiet: true,
          });
          materialLoop?.catch?.(() => {});
          notify(
            "Material atualizado; a Central registrou e propagou a edição.",
            "success",
          );
        }),
      );
      root.querySelectorAll("[data-control-commission-field]").forEach((input) =>
        input.addEventListener("change", (event) => {
          const id = input.dataset.controlCommissionId,
            field = input.dataset.controlCommissionField,
            value =
              field === "sharePercent"
                ? Number(input.value)
                : Boolean(input.checked);
          appStore.update((state) => {
            const current = brokerReasonsV9(state).find(
              (item) => item.id === id,
            ) || { id };
            const configured = (state.commissionReasons || []).filter(
              (item) => item.id !== id,
            );
            return {
              ...state,
              commissionReasons: [...configured, { ...current, [field]: value }],
            };
          });
          const entry = controlCenterRecordChangeV1(
            `Regra ${id} editada`,
            `${field} = ${String(value)}`,
            { entity: "commissionReason", entityId: id },
          );
          controlCenterPublishV1(
            "control.commission-rule.updated",
            "commissionReason",
            id,
            { field, value, changeId: entry.id },
          );
          const commissionLoop = this.runOperationalLoop?.(
            "commission-rule.changed",
            { quiet: true },
          );
          commissionLoop?.catch?.(() => {});
          notify(
            "Regra de comissão atualizada e registrada para o agente.",
            "success",
          );
        }),
      );
      root
        .querySelector("[data-control-stage-selector]")
        ?.addEventListener("change", (event) => {
          appStore.set({
            selectedPlanningStage: event.currentTarget.value,
            lastAction: `Selecionou compreensão da etapa ${event.currentTarget.value}`,
          });
        });
      root
        .querySelector("[data-control-context-add-material]")
        ?.addEventListener("click", () => {
          const form = root.querySelector("[data-control-stage-context-form]"),
            grid = form?.querySelector(".control-stage-property-grid");
          if (!grid) return;
          grid.querySelector("[data-control-context-empty]")?.remove();
          const row = document.createElement("article");
          row.className = "control-stage-property";
          row.setAttribute("data-control-context-material-row", "");
          row.innerHTML = `<header><div><small>PROPRIEDADE MATERIAL · Atividade principal</small><h3>Nova propriedade</h3><p>Requisito operacional da etapa.</p></div><span class="control-material-status">Planejado</span></header><div class="control-stage-property-fields"><label><span>Material / equipamento</span><input name="materialName" placeholder="Ex.: Tubo PEAD"></label><label><span>Descrição / uso</span><input name="materialDescription" placeholder="Uso, bitola ou escopo"></label><label><span>Quantidade</span><input name="materialQuantity" type="number" min="0" step="any" placeholder="A medir"></label><label><span>Unidade</span><input name="materialUnit" placeholder="m, un, m²"></label><label><span>Situação</span><select name="materialStatus"><option>Planejado</option><option>Em andamento</option><option>Atenção</option><option>Concluído</option><option>Dimensionar</option></select></label><button type="button" class="control-remove-context-material" aria-label="Remover material">${ico("trash-2")} Remover</button></div>`;
          grid.appendChild(row);
          row
            .querySelector(".control-remove-context-material")
            ?.addEventListener("click", () => row.remove());
          row.querySelector('[name="materialName"]')?.focus();
          window.lucide?.createIcons();
        });
      root
        .querySelectorAll(".control-remove-context-material")
        .forEach((button) =>
          button.addEventListener("click", () =>
            button.closest("[data-control-context-material-row]")?.remove(),
          ),
        );
      const stageContextForm = root.querySelector(
        "[data-control-stage-context-form]",
      );
      if (stageContextForm && !stageContextForm.dataset.organizationFieldsReady) {
        stageContextForm.dataset.organizationFieldsReady = "true";
        const stageKey = stageContextForm.dataset.controlStageContextForm;
        const profile = controlStageProfileV1(
          (executionModel.stages || []).find((item) => item.key === stageKey) || {},
          appStore.get(),
        );
        const fields = document.createElement("div");
        fields.className = "control-front-ai-fields";
        fields.innerHTML = `<div class="control-front-ai-fields-head"><span class="activity-kind">ORGANIZAÇÃO PARA IA</span><b>Como o agente deve interpretar e montar as requisições</b><small>Textos salvos junto à compreensão desta etapa e enviados na propagação operacional.</small></div><label><span>Pedido de organização<small>Objetivo textual da próxima organização.</small></span><textarea name="organizationRequest" rows="4" placeholder="Ex.: agrupe por frente, destaque pendências e gere a próxima requisição.">${esc(profile.organizationRequest || "")}</textarea></label><label><span>Contexto e critérios<small>Regras, restrições e prioridades que devem ser consideradas.</small></span><textarea name="organizationContext" rows="4" placeholder="Ex.: considere estoque, prazo, equipe, dependências e evidências obrigatórias.">${esc(profile.organizationContext || "")}</textarea></label>`;
        stageContextForm.querySelector("footer")?.before(fields);
      }
      stageContextForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const stageKey = stageContextForm.dataset.controlStageContextForm;
        const payload = controlStageContextPayloadV1(stageContextForm);
        const currentSettings = {
          ...(readIntegrationSettings() || {}),
          ...(appStore.get().integrationSettings || {}),
        };
        const previousProfile = currentSettings.stageProfiles?.[stageKey] || {};
        const changedFields = [
          "requirements",
          "conditions",
          "typicalDescription",
          "organizationRequest",
          "organizationContext",
          "requestHints",
          "evidenceFocus",
          "procurementFocus",
          "production",
          "materialsTable",
          "notificationTargets",
        ].filter(
          (field) =>
            JSON.stringify(previousProfile[field] ?? "") !==
            JSON.stringify(payload[field] ?? ""),
        );
        const nextSettings = {
          ...currentSettings,
          stageProfiles: {
            ...(currentSettings.stageProfiles || {}),
            [stageKey]: payload,
          },
        };
        localStorage.setItem(
          INTEGRATION_SETTINGS_KEY,
          JSON.stringify(nextSettings),
        );
        appStore.set({
          integrationSettings: nextSettings,
          selectedPlanningStage: stageKey,
          aiComprehensionChanges: {
            stageKey,
            fields: changedFields,
            at: new Date().toISOString(),
          },
          lastAction: `Salvou compreensão operacional da etapa ${stageKey}`,
        });
        const stage = (executionModel.stages || []).find(
          (item) => item.key === stageKey,
        );
        const dbStage = demoData.activities.find(
          (item) => item.name === stage?.name,
        );
        const actor = appStore.get().currentActor || {};
        try {
          if (dbStage?.id) {
            const response = await apiFetch(
              `/api/stages-admin/${encodeURIComponent(dbStage.id)}/ai`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "x-belavista-role": actor.role || "admin",
                  "x-belavista-user": actor.uid || "local-admin",
                  "x-belavista-name": actor.name || "Administrador",
                },
                body: JSON.stringify({
                  requirements: payload.requirements,
                  conditions: payload.conditions,
                  typicalDescription: payload.typicalDescription,
                  organizationRequest: payload.organizationRequest,
                  organizationContext: payload.organizationContext,
                  requestHints: payload.requestHints,
                  evidenceFocus: payload.evidenceFocus,
                  procurementFocus: payload.procurementFocus,
                  notificationTargets: payload.notificationTargets,
                  executionProfile: { production: payload.production },
                }),
              },
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.info(
            "Persistência central da compreensão indisponível; mantendo edição local.",
            error,
          );
        }
        const entry = controlCenterRecordChangeV1(
          "Compreensão da etapa editada",
          `${stageKey} · ${payload.materialsTable.length} materiais · ${payload.requirements.length} requisitos`,
          { entity: "stageAiConfig", entityId: stageKey },
        );
        controlCenterPublishV1(
          "control.stage-context.updated",
          "stageAiConfig",
          stageKey,
          { ...payload, changeId: entry.id },
        );
        const loop = this.runOperationalLoop?.("stage.context.changed", {
          quiet: true,
        });
        loop?.catch?.(() => {});
        notify(
          "Compreensão salva; requisitos, materiais e produtividade foram enviados ao Worker.",
          "success",
        );
      });
    };
    const disconnectedBeforeControlCenterV1 =
      ViewLayer.prototype.disconnectedCallback;
    ViewLayer.prototype.disconnectedCallback = function () {
      this._unsubscribeControlCenterV1?.();
      this._unsubscribeControlCenterV1 = null;
      this._controlCenterListenerV1 = false;
      disconnectedBeforeControlCenterV1?.call(this);
    };
  };

  return Object.freeze({ installRenderer, installEvents });
};
