import { FOREMAN_ACCESS_KEY_PERMISSIONS_V1 } from "../../foreman-access-key-policy.mjs?v=dynamic-access-roles-v1";

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
  window: windowRef = globalThis.window,
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
    const integrations = `<section class="integration-settings"><header><div><span class="activity-kind">ATENDIMENTO, PIX E NOTIFICAÇÕES</span><h2>Integrações operacionais</h2><p>O desktop e as páginas publicadas funcionam como clientes. A automação vive no Cloudflare Worker; o Firebase só entrega mudanças em tempo real.</p></div><div class="integration-status-list"><span class="active">Cloudflare · cliente</span><span>Firebase Realtime · escuta</span><span>WhatsApp · link com confirmação</span></div></header><form data-integration-form><fieldset><legend>Camada operacional</legend><label>Base pública da API<input name="apiBase" value="${esc(saved.apiBase || "")}" placeholder="https://seu-worker.workers.dev"></label><label>Base pública dos uploads do Worker<input name="workerPublicBaseUrl" value="${esc(saved.workerPublicBaseUrl || "")}" placeholder="https://seu-worker.workers.dev"></label><label>Chave pública VAPID<input name="firebaseMessagingVapidKey" value="${esc(saved.firebaseMessagingVapidKey || "")}" placeholder="Para push opcional do Firebase"></label></fieldset><fieldset><legend>Destinos e realtime</legend><label>UID do canal Dono<input name="ownerNotificationUid" value="${esc(saved.ownerNotificationUid || "")}" placeholder="owner-root"></label><label>UID do canal Administrador<input name="adminNotificationUid" value="${esc(saved.adminNotificationUid || "")}" placeholder="admin-ops"></label><label>UID do canal Encarregado<input name="foremanNotificationUid" value="${esc(saved.foremanNotificationUid || "")}" placeholder="foreman-front-1"></label><label>Áreas extras de chegada<textarea name="notificationAreas" rows="2" placeholder="desktop-supplies, rtdb/commercial, mobile-foreman">${esc(saved.notificationAreas || "")}</textarea></label></fieldset><fieldset><legend>Segredos do Worker · somente nomes</legend><label>Nome do segredo NVIDIA<input name="workerSecretNvidiaApiKey" value="${esc(saved.workerSecretNvidiaApiKey || "NVIDIA_API_KEY")}" placeholder="NVIDIA_API_KEY"></label><label>Nome do segredo Firebase RTDB<input name="workerSecretFirebaseDatabaseUrl" value="${esc(saved.workerSecretFirebaseDatabaseUrl || "FIREBASE_DATABASE_URL")}" placeholder="FIREBASE_DATABASE_URL"></label><label>Nome do segredo Service Account<input name="workerSecretFirebaseServiceAccountJson" value="${esc(saved.workerSecretFirebaseServiceAccountJson || "FIREBASE_SERVICE_ACCOUNT_JSON")}" placeholder="FIREBASE_SERVICE_ACCOUNT_JSON"></label><div class="worker-secret-fixed-v5364"><span>PAT GitHub</span><b>GITHUB_PAT · configurado no Worker</b><small>O valor do PAT não é inserido no navegador.</small></div></fieldset><fieldset><legend>Propagação para GitHub</legend><div class="worker-secret-fixed-v5364"><span>Repositório operacional</span><b>${esc(state.config?.github?.repo || "GITHUB_REPO · configurado no Worker")}</b><small>${state.config?.github?.branch ? `Branch ${esc(state.config.github.branch)}` : "Repo, branch e PAT são lidos exclusivamente do ambiente do Cloudflare Worker."}</small></div></fieldset><fieldset><legend>WhatsApp · atendimento de leads</legend><label>Número de destino para links de contato<input name="whatsappNumber" type="tel" inputmode="tel" autocomplete="tel" value="${esc(saved.whatsappNumber || "74991220997")}" placeholder="74991220997"></label><small>O link abre uma conversa com mensagem pronta; o envio só ocorre após confirmação no WhatsApp.</small><label>Webhook do serviço operacional<input name="whatsappWebhook" value="${esc(saved.whatsappWebhook || "")}" placeholder="https://servico.externo/webhook"></label><label class="check"><input type="checkbox" name="autoNotify" ${saved.autoNotify ? "checked" : ""}> Enfileirar alertas de caixa e materiais</label></fieldset><fieldset><legend>Instagram · preparação</legend><label>Conta / identificador<input name="instagramAccount" value="${esc(saved.instagramAccount || "")}" placeholder="@aliancapark"></label><label>Webhook do serviço operacional<input name="instagramWebhook" value="${esc(saved.instagramWebhook || "")}" placeholder="URL do receptor"></label></fieldset><fieldset><legend>Sinal da reserva · Pix</legend><label>Chave Pix<input name="pixKey" value="${esc(saved.pixKey || "")}" placeholder="CPF, CNPJ, e-mail, telefone ou aleatória"></label><label>Valor do sinal<input name="signalAmount" type="number" min="0" step="0.01" value="${esc(saved.signalAmount || "1000")}"></label><label>Recebedor<input name="pixReceiver" maxlength="25" value="${esc(saved.pixReceiver || "ALIANCA PARK")}"></label><label>Cidade<input name="pixCity" maxlength="15" value="${esc(saved.pixCity || "SENADOR CANEDO")}"></label></fieldset><footer><small>Liquidação do Pix deve ser confirmada pelo PSP. OCR é triagem; validade documental exige conferência humana/serviço autorizado.</small><button type="submit">Salvar configurações</button></footer></form></section>`;
    const foremanPermissionLabels = {
      "view.map": "Interface · Mapa",
      "view.agenda": "Interface · Agenda",
      "view.records": "Interface · Registros",
      "view.stages": "Interface · Etapas",
      "timeline.read": "Ver linha do tempo e etapas",
      "agenda.write": "Criar e alterar compromissos na agenda",
      "records.read": "Consultar registros",
      "records.write": "Criar e editar registros",
      "ai.notes": "Enviar notas à IA",
      "ai.photos": "Enviar fotos à IA",
    };
    const accessKeys = globalThis.BELAVISTA_CAPACITOR_NATIVE !== true && actor.role === "owner" && actor.userType !== "foreman" ? `<section class="foreman-access-keys-v1"><header><div><span class="activity-kind">ACESSO DE CAMPO · PAPÉIS DINÂMICOS</span><h2>Papéis e chaves</h2><p>Monte papéis com permissões explícitas e emita chaves vinculadas. Atualizar o papel atualiza o escopo das chaves associadas.</p></div><span class="access-key-expiry-v1">Validade das chaves: 90 dias</span></header><form data-access-role-form><label>Nome do papel<input name="name" minlength="2" maxlength="60" required placeholder="Ex.: Encarregado de obra"></label><fieldset><legend>Interfaces e permissões do papel</legend>${FOREMAN_ACCESS_KEY_PERMISSIONS_V1.map((permission) => `<label><input type="checkbox" name="permissions" value="${esc(permission)}"> ${esc(foremanPermissionLabels[permission] || permission)}</label>`).join("")}</fieldset><footer><small>Os papéis são persistidos no banco do Worker; permissões de interface e operações são avaliadas separadamente.</small><button type="submit">Salvar papel</button></footer><output data-role-status aria-live="polite"></output></form><div data-access-role-list>Carregando papéis persistidos…</div><form data-foreman-key-form><label>Identificação da chave<input name="label" minlength="2" maxlength="60" required placeholder="Ex.: Encarregado · Frente Norte"></label><label>Papel da chave<select name="roleId" required><option value="">Crie ou selecione um papel salvo</option></select></label><footer><small>A chave herda permissões do papel. O segredo é exibido uma única vez, após emissão.</small><button type="submit">Emitir chave</button></footer><output data-foreman-key-status aria-live="polite"></output></form><div data-foreman-key-once hidden></div><div class="foreman-key-list-v1" data-foreman-key-list>Carregando chaves emitidas…</div></section>` : "";
    const base = typeof settingsAuditTemplate === "function" ? settingsAuditTemplate.apply(this, args) : "";
    return base.replace('<footer class="settings-tools">', `${governance}${accessKeys}${calibrationPanel}${integrations}<footer class="settings-tools">`);
  };

  const bindBeforeOperationalSettingsV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeOperationalSettingsV1.apply(this, args),
      form = this.querySelector("[data-integration-form]");
    const keyPanel = [...(this.querySelectorAll?.(".foreman-access-keys-v1") || [])].find((panel) => panel.querySelector?.("[data-access-role-form]")) || this.querySelector(".foreman-access-keys-v1"),
      keyForm = keyPanel?.querySelector("[data-foreman-key-form]"),
      keyList = keyPanel?.querySelector("[data-foreman-key-list]"),
      keyStatus = keyPanel?.querySelector("[data-foreman-key-status]"),
      keyOnce = keyPanel?.querySelector("[data-foreman-key-once]"),
      roleForm = keyPanel?.querySelector("[data-access-role-form]"),
      roleList = keyPanel?.querySelector("[data-access-role-list]"),
      roleStatus = keyPanel?.querySelector("[data-role-status]"),
      roleSelect = keyForm?.elements?.roleId;
    const permissionLabels = {
      "view.map": "Interface · Mapa",
      "view.agenda": "Interface · Agenda",
      "view.records": "Interface · Registros",
      "view.stages": "Interface · Etapas",
      "timeline.read": "Linha do tempo",
      "agenda.write": "Compromissos da agenda",
      "records.read": "Consultar registros",
      "records.write": "Criar/editar registros",
      "ai.notes": "Notas para IA",
      "ai.photos": "Fotos para IA",
    };
    const loadForemanKeys = async () => {
      if (!keyList) return;
      keyList.textContent = "Consultando chaves no serviço autenticado…";
      try {
        const response = await apiFetch("/api/access-keys", { headers: operationalHeaders() }),
          payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        const keys = Array.isArray(payload.keys) ? payload.keys : [];
        keyList.innerHTML = keys.length ? keys.map((key) => {
          const revoked = Boolean(key.revokedAt), expired = Date.parse(key.expiresAt) <= Date.now(),
            stateLabel = revoked ? "Revogada" : expired ? "Expirada" : "Ativa";
          return `<article class="foreman-key-row-v1"><div><b>${esc(key.label)}</b><small>${esc((key.permissions || []).map((permission) => permissionLabels[permission] || permission).join(" · ") || "Sem permissões")}</small><small>Criada ${esc(new Date(key.createdAt).toLocaleDateString("pt-BR"))} · expira ${esc(new Date(key.expiresAt).toLocaleDateString("pt-BR"))}</small></div><span class="${revoked || expired ? "inactive" : "active"}">${stateLabel}</span>${revoked || expired ? "" : `<button type="button" data-foreman-key-revoke="${esc(key.id)}">Revogar</button>`}</article>`;
        }).join("") : `<p class="foreman-key-empty-v1">Nenhuma chave de encarregado emitida.</p>`;
      } catch (error) {
        keyList.textContent = `Não foi possível consultar as chaves: ${error.message}`;
      }
    };
    const loadAccessRoles = async () => {
      if (!roleList) return;
      roleList.textContent = "Consultando papéis persistidos…";
      try {
        const response = await apiFetch("/api/access-roles", { headers: operationalHeaders() }), payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        const roles = Array.isArray(payload.roles) ? payload.roles : [];
        roleList.innerHTML = roles.length ? roles.map((role) => `<article class="foreman-key-row-v1" data-role-row="${esc(role.id)}"><div><b>${esc(role.name)}</b><small>${esc((role.permissions || []).map((permission) => permissionLabels[permission] || permission).join(" · ") || "Sem permissões")}</small></div><button type="button" data-role-edit="${esc(role.id)}">Editar</button><button type="button" data-role-delete="${esc(role.id)}">Excluir</button></article>`).join("") : `<p class="foreman-key-empty-v1">Nenhum papel configurado. Crie um perfil para habilitar a emissão.</p>`;
        if (roleSelect) roleSelect.innerHTML = `<option value="">Selecione o papel da chave</option>${roles.map((role) => `<option value="${esc(role.id)}">${esc(role.name)}</option>`).join("")}`;
      } catch (error) { roleList.textContent = `Não foi possível consultar papéis: ${error.message}`; }
    };
    if (keyPanel) {
      void loadAccessRoles();
      void loadForemanKeys();
      keyPanel.addEventListener("click", async (event) => {
        const editRole = event.target.closest?.("[data-role-edit]");
        if (editRole) {
          try {
            const response = await apiFetch("/api/access-roles", { headers: operationalHeaders() }), payload = await response.json();
            if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
            const role = (payload.roles || []).find((item) => item.id === editRole.dataset.roleEdit);
            if (!role) throw new Error("Papel não encontrado.");
            roleForm.dataset.roleId = role.id;
            roleForm.elements.name.value = role.name;
            roleForm.querySelectorAll('input[name="permissions"]').forEach((input) => { input.checked = role.permissions.includes(input.value); });
            roleStatus.textContent = "Editando papel persistido. Salve para aplicar às chaves associadas.";
          } catch (error) { if (roleStatus) roleStatus.textContent = `Falha ao carregar papel: ${error.message}`; }
          return;
        }
        const deleteRole = event.target.closest?.("[data-role-delete]");
        if (deleteRole) {
          if (!windowRef?.confirm?.("Excluir este papel? Chaves ativas vinculadas impedem a exclusão.")) return;
          try {
            const response = await apiFetch(`/api/access-roles/${encodeURIComponent(deleteRole.dataset.roleDelete)}`, { method: "DELETE", headers: operationalHeaders() }), payload = await response.json();
            if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
            if (roleStatus) roleStatus.textContent = "Papel excluído.";
            await loadAccessRoles(); await loadForemanKeys();
          } catch (error) { if (roleStatus) roleStatus.textContent = `Falha ao excluir papel: ${error.message}`; }
          return;
        }
        const revokeButton = event.target.closest?.("[data-foreman-key-revoke]");
        if (revokeButton) {
          if (!windowRef?.confirm?.("Revogar esta chave agora? Os dispositivos conectados perdem o acesso nas próximas requisições.")) return;
          revokeButton.disabled = true;
          try {
            const response = await apiFetch(`/api/access-keys/${encodeURIComponent(revokeButton.dataset.foremanKeyRevoke)}`, { method: "DELETE", headers: operationalHeaders() }),
              payload = await response.json();
            if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
            if (keyStatus) keyStatus.textContent = "Chave revogada; as sessões derivadas deixam de autenticar.";
            await loadForemanKeys();
          } catch (error) {
            revokeButton.disabled = false;
            if (keyStatus) keyStatus.textContent = `Falha ao revogar: ${error.message}`;
          }
        }
        const copyButton = event.target.closest?.("[data-foreman-key-copy]");
        if (copyButton) {
          try {
            await documentRef.defaultView.navigator.clipboard.writeText(copyButton.dataset.foremanKeyCopy);
            if (keyStatus) keyStatus.textContent = "Chave copiada. Guarde-a no aparelho do encarregado; ela não será exibida novamente.";
          } catch {
            if (keyStatus) keyStatus.textContent = "Cópia indisponível. Selecione e copie o valor exibido agora.";
          }
        }
      });
      roleForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = String(new FormDataCtor(roleForm).get("name") || "").trim(),
          permissions = [...roleForm.querySelectorAll('input[name="permissions"]:checked')].map((input) => input.value),
          roleId = roleForm.dataset.roleId || "";
        if (!name || !permissions.length) { if (roleStatus) roleStatus.textContent = "Informe o nome e marque ao menos uma permissão."; return; }
        try {
          const response = await apiFetch("/api/access-roles", { method: roleId ? "PUT" : "POST", headers: operationalHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ id: roleId, name, permissions }) }), payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          roleForm.reset(); delete roleForm.dataset.roleId;
          if (roleStatus) roleStatus.textContent = `Papel ${payload.role.name} salvo. Chaves vinculadas usarão as permissões atuais após autenticar novamente.`;
          await loadAccessRoles(); await loadForemanKeys();
        } catch (error) { if (roleStatus) roleStatus.textContent = `Falha ao salvar papel: ${error.message}`; }
      });
      keyForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = keyForm.querySelector('[type="submit"]'),
          label = String(new FormDataCtor(keyForm).get("label") || "").trim(),
          roleId = String(new FormDataCtor(keyForm).get("roleId") || "");
        button.disabled = true;
        if (keyStatus) keyStatus.textContent = "Criando chave limitada…";
        if (keyOnce) { keyOnce.hidden = true; keyOnce.replaceChildren(); }
        try {
          const response = await apiFetch("/api/access-keys", { method: "POST", headers: operationalHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label, roleId }) }),
            payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          const key = payload.key;
          if (keyOnce) {
            keyOnce.hidden = false;
            keyOnce.innerHTML = `<strong>Copie a chave agora · exibida uma única vez</strong><code>${esc(key.token)}</code><button type="button" data-foreman-key-copy="${esc(key.token)}">Copiar chave</button>`;
          }
          keyForm.elements.label.value = "";
          if (roleSelect) roleSelect.value = "";
          if (keyStatus) keyStatus.textContent = `Chave emitida; expira em ${new Date(key.expiresAt).toLocaleDateString("pt-BR")}.`;
          await loadForemanKeys();
        } catch (error) {
          if (keyStatus) keyStatus.textContent = `Não foi possível emitir a chave: ${error.message}`;
        } finally { button.disabled = false; }
      });
    }
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
