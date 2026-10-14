/** Operational governance, calibration, integration settings, and their form behavior. */
export const installOperationalSettingsWorkspaceV1 = (ViewLayer, {
  appStore,
  readIntegrationSettings,
  integrationSettingsKey,
  apiFetch,
  operationalHeaders,
  registerOperationalDevice,
  esc,
  ico,
  notify,
  settingsAuditTemplate,
  storage = globalThis.localStorage,
  document: documentRef = globalThis.document,
  CustomEventCtor = globalThis.CustomEvent,
  FormDataCtor = globalThis.FormData,
} = {}) => {
  if (!ViewLayer?.prototype || typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Operational settings require ViewLayer and appStore get/set.");
  for (const [name, dependency] of Object.entries({
    readIntegrationSettings,
    apiFetch,
    operationalHeaders,
    registerOperationalDevice,
    esc,
    ico,
    notify,
  }))
    if (typeof dependency !== "function") throw new TypeError(`Operational settings require ${name}().`);
  if (typeof integrationSettingsKey !== "string" || !integrationSettingsKey)
    throw new TypeError("Operational settings require the existing integration storage key.");
  if (typeof FormDataCtor !== "function" || typeof CustomEventCtor !== "function")
    throw new TypeError("Operational settings require FormData and CustomEvent constructors.");

  ViewLayer.prototype.settings = function (...args) {
    const state = appStore.get(),
      actor = state.currentActor || { role: "owner", label: "Dono" },
      calibration = state.systemCalibration,
      config = calibration?.config || {},
      stages = config.stages || [],
      saved = {
        ...(readIntegrationSettings() || {}),
        ...(state.integrationSettings || {}),
      };
    const governance = `<section class="operational-governance"><header><div><span class="activity-kind">AUTORIDADE, CIÊNCIA E PROPAGAÇÃO</span><h2>Governança do agente</h2><p>Cloudflare concentra a lógica operacional; o Firebase só espelha mudanças em tempo real para avisar os apps das pontas.</p></div><button type="button" data-register-device>${ico("bell-ring")} Ativar neste dispositivo</button></header><div class="role-governance-grid"><article class="${["owner", "developer"].includes(actor.role) ? "current" : ""}"><span>DONO</span><b>Fluxo de caixa</b><p>Cria entradas, saídas, ajustes e estornos. Também pode registrar fatos.</p></article><article class="${["admin", "developer"].includes(actor.role) ? "current" : ""}"><span>ADMINISTRADOR</span><b>Calibrações do sistema</b><p>Define reserva, prioridade, orçamento e relações. Também pode registrar fatos.</p></article><article class="${["foreman", "developer"].includes(actor.role) ? "current" : ""}"><span>ENCARREGADO</span><b>Registros de campo</b><p>Confirma produção, serviço, evidência e completude; não altera caixa nem regra.</p></article></div><small data-device-status>Perfil atual: ${esc(actor.label || actor.role)} · O canal em tempo real usa Firebase Realtime Database; a automação e a decisão continuam na camada operacional.</small></section>`;
    const calibrationPanel = `<section class="calibration-settings"><header><div><span class="activity-kind">CALIBRAÇÃO OPERACIONAL · VERSÃO ${calibration?.version || "—"}</span><h2>Relações que governam a distribuição do caixa</h2><p>Somente Administrador salva. Dono e Encarregado têm leitura integral da regra.</p></div><span>Atualizado por ${esc(calibration?.updatedBy || "bootstrap")}</span></header><form data-calibration-form><div class="calibration-master"><label>Reserva mínima (R$)<input name="reserve" inputmode="decimal" value="${esc(Number(config.reserveCents || 0) / 100)}" ${["admin", "developer"].includes(actor.role) ? "" : "disabled"}></label><label>Dependência concluída em (%)<input name="dependencyProgress" type="number" min="1" max="100" value="${esc(config.dependencyProgress || 100)}" ${["admin", "developer"].includes(actor.role) ? "" : "disabled"}></label><label>Intervalo entre alertas (min)<input name="notificationCooldownMinutes" type="number" min="5" max="10080" value="${esc(config.notificationCooldownMinutes || 240)}" ${["admin", "developer"].includes(actor.role) ? "" : "disabled"}></label></div><div class="calibration-stage-list">${stages.map((stage, index) => `<article data-calibration-stage="${esc(stage.key)}"><span>${String(index + 1).padStart(2, "0")}</span><div><b>${esc(stage.name)}</b><small>Depende de ${(stage.dependsOn || []).join(", ") || "nenhuma etapa"}</small></div><label>Orçamento (R$)<input name="budgetCents" inputmode="decimal" value="${esc(Number(stage.budgetCents || 0) / 100)}" ${["admin", "developer"].includes(actor.role) ? "" : "disabled"}></label><label>Prioridade<input name="priority" type="number" min="0" max="100" value="${esc(stage.priority || 0)}" ${["admin", "developer"].includes(actor.role) ? "" : "disabled"}></label><input type="hidden" name="dependsOn" value="${esc((stage.dependsOn || []).join(","))}"></article>`).join("") || "<p>Carregando calibrações do servidor…</p>"}</div><footer><span data-calibration-status>${["admin", "developer"].includes(actor.role) ? "Cada versão fica registrada na auditoria." : "Seu perfil possui acesso somente para leitura."}</span><button type="submit" ${["admin", "developer"].includes(actor.role) ? "" : "disabled"}>${ico("save")} Salvar nova versão</button></footer></form></section>`;
    const integrations = `<section class="integration-settings"><header><div><span class="activity-kind">ATENDIMENTO, PIX E NOTIFICAÇÕES</span><h2>Integrações operacionais</h2><p>O desktop e as páginas publicadas funcionam como clientes. A automação vive no Cloudflare Worker; o Firebase só entrega mudanças em tempo real.</p></div><div class="integration-status-list"><span class="active">Cloudflare · cliente</span><span>Firebase Realtime · escuta</span><span>WhatsApp · preparado</span></div></header><form data-integration-form><fieldset><legend>Camada operacional</legend><label>Base pública da API<input name="apiBase" value="${esc(saved.apiBase || "")}" placeholder="https://seu-worker.workers.dev"></label><label>Base pública dos uploads do Worker<input name="workerPublicBaseUrl" value="${esc(saved.workerPublicBaseUrl || "")}" placeholder="https://seu-worker.workers.dev"></label><label>Chave pública VAPID<input name="firebaseMessagingVapidKey" value="${esc(saved.firebaseMessagingVapidKey || "")}" placeholder="Para push opcional do Firebase"></label></fieldset><fieldset><legend>Destinos e realtime</legend><label>UID do canal Dono<input name="ownerNotificationUid" value="${esc(saved.ownerNotificationUid || "")}" placeholder="owner-root"></label><label>UID do canal Administrador<input name="adminNotificationUid" value="${esc(saved.adminNotificationUid || "")}" placeholder="admin-ops"></label><label>UID do canal Encarregado<input name="foremanNotificationUid" value="${esc(saved.foremanNotificationUid || "")}" placeholder="foreman-front-1"></label><label>Áreas extras de chegada<textarea name="notificationAreas" rows="2" placeholder="desktop-supplies, rtdb/commercial, mobile-foreman">${esc(saved.notificationAreas || "")}</textarea></label></fieldset><fieldset><legend>Segredos do Worker · somente nomes</legend><label>Nome do segredo NVIDIA<input name="workerSecretNvidiaApiKey" value="${esc(saved.workerSecretNvidiaApiKey || "NVIDIA_API_KEY")}" placeholder="NVIDIA_API_KEY"></label><label>Nome do segredo Firebase RTDB<input name="workerSecretFirebaseDatabaseUrl" value="${esc(saved.workerSecretFirebaseDatabaseUrl || "FIREBASE_DATABASE_URL")}" placeholder="FIREBASE_DATABASE_URL"></label><label>Nome do segredo Service Account<input name="workerSecretFirebaseServiceAccountJson" value="${esc(saved.workerSecretFirebaseServiceAccountJson || "FIREBASE_SERVICE_ACCOUNT_JSON")}" placeholder="FIREBASE_SERVICE_ACCOUNT_JSON"></label><div class="worker-secret-fixed-v5364"><span>PAT GitHub</span><b>GITHUB_PAT · configurado no Worker</b><small>O valor do PAT não é inserido no navegador.</small></div></fieldset><fieldset><legend>Propagação para GitHub</legend><div class="worker-secret-fixed-v5364"><span>Repositório operacional</span><b>${esc(state.config?.github?.repo || "GITHUB_REPO · configurado no Worker")}</b><small>${state.config?.github?.branch ? `Branch ${esc(state.config.github.branch)}` : "Repo, branch e PAT são lidos exclusivamente do ambiente do Cloudflare Worker."}</small></div></fieldset><fieldset><legend>WhatsApp operacional</legend><label>Número para notificações<input name="whatsappNumber" value="${esc(saved.whatsappNumber || "")}" placeholder="5571999999999"></label><label>Webhook do serviço operacional<input name="whatsappWebhook" value="${esc(saved.whatsappWebhook || "")}" placeholder="https://servico.externo/webhook"></label><label class="check"><input type="checkbox" name="autoNotify" ${saved.autoNotify ? "checked" : ""}> Enfileirar alertas de caixa e materiais</label></fieldset><fieldset><legend>Instagram · preparação</legend><label>Conta / identificador<input name="instagramAccount" value="${esc(saved.instagramAccount || "")}" placeholder="@aliancapark"></label><label>Webhook do serviço operacional<input name="instagramWebhook" value="${esc(saved.instagramWebhook || "")}" placeholder="URL do receptor"></label></fieldset><fieldset><legend>Sinal da reserva · Pix</legend><label>Chave Pix<input name="pixKey" value="${esc(saved.pixKey || "")}" placeholder="CPF, CNPJ, e-mail, telefone ou aleatória"></label><label>Valor do sinal<input name="signalAmount" type="number" min="0" step="0.01" value="${esc(saved.signalAmount || "1000")}"></label><label>Recebedor<input name="pixReceiver" maxlength="25" value="${esc(saved.pixReceiver || "ALIANCA PARK")}"></label><label>Cidade<input name="pixCity" maxlength="15" value="${esc(saved.pixCity || "SENADOR CANEDO")}"></label></fieldset><footer><small>Liquidação do Pix deve ser confirmada pelo PSP. OCR é triagem; validade documental exige conferência humana/serviço autorizado.</small><button type="submit">Salvar configurações</button></footer></form></section>`;
    const base = typeof settingsAuditTemplate === "function" ? settingsAuditTemplate.apply(this, args) : "";
    return base.replace('<footer class="settings-tools">', `${governance}${calibrationPanel}${integrations}<footer class="settings-tools">`);
  };

  const bindBeforeOperationalSettingsV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeOperationalSettingsV1.apply(this, args),
      form = this.querySelector("[data-integration-form]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormDataCtor(form)),
        looksLikeGithubPat = (value) => /^(?:github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]+$/.test(String(value || "").trim()),
        data = Object.fromEntries(Object.entries(raw).filter(([key, value]) => {
          if (looksLikeGithubPat(value)) return false;
          return !/^(?:pat|githubPat|github_pat|githubToken|github_token)$/i.test(key);
        }));
      for (const key of ["repo", "githubRepo", "githubBranch", "githubWorkflow"]) delete data[key];
      data.workerSecretGithubPat = "GITHUB_PAT";
      data.workerGitHubSource = "cloudflare-env";
      data.autoNotify = form.elements.autoNotify.checked;
      data.stageProfiles = {
        ...(readIntegrationSettings().stageProfiles || {}),
        ...(appStore.get().integrationSettings?.stageProfiles || {}),
      };
      storage.setItem(integrationSettingsKey, JSON.stringify(data));
      // Keep secrets/configuration out of appStore so saving does not rebuild the subscribed ViewLayer.
      documentRef.dispatchEvent(new CustomEventCtor("belavista:integrations-saved", { detail: { settings: data } }));
      notify("Configurações salvas. O PAT permanece somente no segredo GITHUB_PAT do Worker.", "success");
    });
    this.querySelector("[data-register-device]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget,
        status = this.querySelector("[data-device-status]"),
        actor = appStore.get().currentActor;
      button.disabled = true;
      status.textContent = "Solicitando permissão e conectando este dispositivo ao canal em tempo real…";
      try {
        const result = await registerOperationalDevice(actor);
        await this.connectOperationalNotifications(true);
        status.textContent = result.pushEnabled
          ? "Dispositivo registrado no Realtime Database com push habilitado."
          : "Dispositivo registrado no Realtime Database; o push pode ser ativado depois com a chave VAPID.";
        notify("Dispositivo vinculado ao canal operacional em tempo real.", "success");
      } catch (error) {
        button.disabled = false;
        status.textContent = error.message;
        notify("Não foi possível ativar notificações.", "warning");
      }
    });
    this.querySelector("[data-calibration-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        status = form.querySelector("[data-calibration-status]"),
        parseMoney = (value) => Math.round(Number(String(value || "").replace(/\./g, "").replace(",", ".")) * 100) || 0,
        stages = [...form.querySelectorAll("[data-calibration-stage]")].map((row) => ({
          key: row.dataset.calibrationStage,
          budgetCents: parseMoney(row.querySelector('[name="budgetCents"]').value),
          priority: Number(row.querySelector('[name="priority"]').value) || 0,
          dependsOn: row.querySelector('[name="dependsOn"]').value.split(",").filter(Boolean),
        })),
        payload = {
          reserveCents: parseMoney(form.elements.reserve.value),
          dependencyProgress: Number(form.elements.dependencyProgress.value),
          notificationCooldownMinutes: Number(form.elements.notificationCooldownMinutes.value),
          stages,
        };
      status.textContent = "Validando relações e criando uma nova versão…";
      try {
        const response = await apiFetch("/api/calibrations", {
            method: "PUT",
            headers: operationalHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
          }),
          result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        appStore.set({
          systemCalibration: result.calibration,
          operationalState: result.operational,
          lastAction: `Administrador publicou calibração ${result.calibration.version}`,
        });
        await this.runOperationalLoop("calibration.changed");
        notify("Calibração publicada e caixa redistribuído.", "success");
      } catch (error) {
        status.textContent = error.message;
        notify("Calibração não foi alterada.", "warning");
      }
    });
    return result;
  };

  return Object.freeze({ render: ViewLayer.prototype.settings, bind: ViewLayer.prototype.bind });
};
