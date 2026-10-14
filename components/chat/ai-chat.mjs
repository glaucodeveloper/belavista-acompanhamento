import { createAiChatDependenciesV1 } from "./ai-chat-dependencies-v1.mjs?v=ai-chat-dependencies-v6";

export { assertAiChatDependenciesV1 } from "./ai-chat-dependencies-v1.mjs";

export const createAiChat = ({ browser, ports }) => {
  ({ browser, ports } = createAiChatDependenciesV1({ browser, ports }));
  const {
    chat: {
      CHAT_IMAGE_MAX_BYTES_V1,
      CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1,
      CHAT_VISUAL_ALLOCATION_POLICY_V1,
    },
    storage: {
      readChatHistory,
      readChatWindowLayout,
      writeChatHistory,
      writeChatWindowLayout,
      clearChatHistory,
      readChatVoiceEnabled,
      writeChatVoiceEnabled,
    },
    agenda: {
      findLastAvailableSlot,
      parseDate,
      readCalendar,
      weekKey,
      writeCalendar,
      normalizeActivityRouteText,
    },
    state: chatState,
    projectContext,
    assistant: { infer: inferAssistantRequestV1 },
    recordPersistence: { persistVisualAttachment, createRecord },
    commands: { applyLotStatusCommand, parseLotStatusCommand },
    events: { createServiceEventAdministrators },
    map: {
      commonAreaLabel,
    },
    records: {
      listLotDevelopmentProfiles,
      readStageRecordAttachments,
      normalizeStageRecord,
      saveLotDevelopmentProfile,
    },
    ui: { esc, ico, notify },
  } = ports || {};
  const appStore = chatState;
  const { metrics, activities } = projectContext;
  const demoData = { metrics, activities };
  const { executionModel } = projectContext;
  const {
    eventTarget: browserEventTarget,
    document: browserDocument,
    FileReader: BrowserFileReader,
    speechSynthesis,
    SpeechSynthesisUtterance,
    createIcons,
    print: printPage,
    setTimeout: schedule,
    clearTimeout: cancel,
    requestAnimationFrame: onNextFrame,
  } = browser;
  class AiChat extends browser.HTMLElement {
    connectedCallback() {
      this._chatView = null;
      this._suggestionKey = null;
      this._transitionTimer = null;
      this._autoMessageTimer = null;
      this._autoMessageQueue = [];
      this._autoMessageKeys = new Set();
      this._observedSystemState = null;
      this._contextFadeTimer = null;
      this._chatHistoryHydrated = false;
      this.chatAttachment = null;
      this.chatMapContext = false;
      this._chatEventActionsV1 = new WeakMap();
      this.chatVoiceEnabled = readChatVoiceEnabled();
      this.render();
      this.restoreSavedLayout();
      this._chatStoreUnsubscribe = appStore.subscribe((state) => {
        this.positionForView();
        this.announceContextualSuggestion(state);
        this.observeSystemState(state);
      });
      this.observeSystemState(appStore.get());
      this.announceContextualSuggestion(appStore.get(), true);
      this.bindEventServicesV1();
    }
    disconnectedCallback() {
      this._chatStoreUnsubscribe?.();
      this._chatEventAdministratorsV1?.dispose();
      this._chatEventAdministratorsV1 = null;
      this._chatGlobalEventAdministratorsV1?.dispose();
      this._chatGlobalEventAdministratorsV1 = null;
      const gesture = this._chatPointerGestureV1;
      if (gesture) gesture.handle.releasePointerCapture?.(gesture.pointerId);
      this._chatPointerGestureV1 = null;
      this.classList.remove("is-dragging", "is-resizing");
      this.style.removeProperty("transition");
      cancel(this._autoMessageTimer);
      cancel(this._mapFocusTimer);
      cancel(this._contextFadeTimer);
    }
    positionForView() {
      // A janela da IA tem um único estado de layout para toda a SPA. Trocar de
      // página ou atualizar o mapa muda apenas o contexto da conversa; posição,
      // tamanho e minimização permanecem exatamente onde o usuário deixou.
      if (this._chatPositioned) return;
      const saved =
        readChatWindowLayout() || appStore.get().widgetLayouts?.chat?.global;
      this._chatPositioned = true;
      this.style.removeProperty("right");
      this.style.removeProperty("bottom");
      this.style.removeProperty("transform");
      this.classList.remove("dock-right", "dock-bottom");
      this.classList.add("dock-left");
      if (saved) {
        this.applySavedLayout(saved);
        this.dataset.chatLayout = "global";
        return;
      }
      // O painel inicia no canto inferior direito para preservar os controles de
      // navegação e os cabeçalhos das páginas de workers. Depois de arrastado,
      // o layout continua sendo persistido pelo usuário.
      this.classList.remove("dock-left");
      this.classList.add("dock-right");
      this.dataset.chatLayout = "global";
    }
    render() {
      this.className = "ai-chat floating-panel dock-left";
      const m = demoData.metrics;
      this.innerHTML = `<div class="chat-head drag-handle" title="Arraste para mover"><span class="ai-logo">✦</span><div><strong>IA · Aliança Park</strong><small><span class="chat-monitoring-dot" data-chat-monitoring>MONITORANDO SISTEMA</span> · reajo à navegação e aos eventos · <span class="chat-drag-hint">ARRASTE PARA MOVER</span></small></div><div class="chat-head-actions"><button type="button" class="icon-btn compact chat-voice-toggle" data-chat-voice-toggle aria-pressed="${String(this.chatVoiceEnabled)}" aria-label="${this.chatVoiceEnabled ? "Desativar" : "Ativar"} avisos falados" title="${this.chatVoiceEnabled ? "Desativar" : "Ativar"} avisos falados">${ico("volume-2")}</button><button class="icon-btn compact close-chat">${ico("minus")}</button></div></div><div class="chat-scroll"><div class="chat-greeting"><strong>Bom dia, Warley. 👋</strong><span>Este é o resumo do empreendimento com base nos dados de hoje. Vou avisar quando o sistema mudar.</span></div><div class="chat-summary"><div><b>${m.completeness || 63}%</b><small>Completude<br>geral</small></div><div><b>${m.delayed}</b><small>Etapas<br>atrasadas</small></div><div><b>${m.criticalPurchases}</b><small>Compras<br>críticas</small></div><div><b>${m.review}</b><small>Pendências<br>de revisão</small></div></div><h3 class="chat-question">O que você deseja acompanhar agora?</h3><div class="chat-quick-actions"><button data-view="inventory">${ico("package-check")} Ver compras necessárias</button><button data-view="leads">${ico("user-round-search")} Ver leads hoje</button><button data-view="records">${ico("clipboard-pen-line")} Registrar andamento</button><button data-view="control">${ico("chart-no-axes-combined")} Analisar loteamento</button><button data-view="map">${ico("layers-3")} Abrir mapa de completude</button></div><div class="chat-contextual-fade" data-chat-context-fade aria-live="polite" aria-atomic="true" hidden></div><div class="chat-log" aria-live="polite"></div></div><form class="chat-form"><div class="chat-input-tools" role="group" aria-label="Contexto da mensagem"><button type="button" class="chat-input-tool" data-chat-map aria-label="Abrir mapa 3D de lotes">${ico("map")}<span>Lotes 3D</span></button><button type="button" class="chat-input-tool" data-chat-camera aria-label="Anexar foto pela câmera">${ico("camera")}<span>Câmera</span></button><span class="chat-paste-hint">Cole uma imagem · Ctrl+V</span><input type="file" class="chat-camera-input" data-chat-camera-input accept="image/png,image/jpeg,image/webp" capture="environment" aria-label="Capturar imagem para a IA"/></div><div class="chat-attachment" data-chat-attachment aria-live="polite" hidden></div><div class="chat-input-row"><input aria-label="Mensagem para IA" placeholder="Pergunte algo ou dê um comando…"/><button class="chat-send" aria-label="Enviar">${ico("send")}</button></div></form>${["n", "ne", "e", "se", "s", "sw", "w", "nw"].map((edge) => `<span class="chat-resize-handle resize-${edge}" data-resize="${edge}" aria-label="Redimensionar pela borda ${edge}"></span>`).join("")}`;
      this.renderChatAttachment();
      // A conversa operacional começa limpa a cada abertura da aplicação.
      // Isso remove pedidos antigos do usuário e evita que sejam reapresentados
      // pela restauração do histórico local.
      this.clearChatHistory();
      this.positionForView();
      createIcons();
    }
    bindEventServicesV1() {
      this._chatEventAdministratorsV1?.dispose();
      this._chatEventAdministratorsV1 = createServiceEventAdministrators({
        root: this,
        services: [
          {
            service: "ai-chat-window",
            routes: [
              {
                eventType: "click",
                selector: ".close-chat",
                action: "toggle-collapse",
                handler: ({ event }) => {
                  event.stopPropagation();
                  const wasCollapsed = this.classList.contains("collapsed");
                  if (!wasCollapsed) {
                    const rect = this.getBoundingClientRect();
                    this._expandedSize = {
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                    };
                  }
                  const collapsed = this.classList.toggle("collapsed");
                  if (!collapsed && this._expandedSize) {
                    this.style.width = `${this._expandedSize.width}px`;
                    this.style.height = `${this._expandedSize.height}px`;
                  }
                  const button = this.querySelector(".close-chat");
                  button?.setAttribute(
                    "aria-label",
                    collapsed ? "Restaurar chat da IA" : "Minimizar chat da IA",
                  );
                  button?.setAttribute("title", collapsed ? "Restaurar" : "Minimizar");
                  this.saveLayout();
                },
              },
              {
                eventType: "pointerdown",
                selector: ".drag-handle",
                action: "begin-drag",
                handler: ({ event }) => this.beginDragV1(event),
              },
              {
                eventType: "pointerdown",
                selector: "[data-resize]",
                action: "begin-resize",
                handler: ({ event, target }) => this.beginResizeV1(event, target),
              },
            ],
          },
          {
            service: "ai-chat-composer",
            routes: [
              {
                eventType: "click",
                selector: "[data-chat-voice-toggle]",
                action: "toggle-voice",
                handler: ({ target }) => {
          this.chatVoiceEnabled = !this.chatVoiceEnabled;
          writeChatVoiceEnabled(this.chatVoiceEnabled);
          target.setAttribute(
            "aria-pressed",
            String(this.chatVoiceEnabled),
          );
          target.setAttribute(
            "aria-label",
            `${this.chatVoiceEnabled ? "Desativar" : "Ativar"} avisos falados`,
          );
          target.setAttribute(
            "title",
            `${this.chatVoiceEnabled ? "Desativar" : "Ativar"} avisos falados`,
          );
          if (!this.chatVoiceEnabled) speechSynthesis?.cancel?.();
                },
              },
              {
                eventType: "click",
                selector: "[data-cmd]",
                action: "send-command",
                handler: ({ target }) => this.respond(target.dataset.cmd),
              },
              {
                eventType: "click",
                selector: "[data-view]",
                action: "navigate",
                handler: ({ target }) => {
                  const next =
                    target.dataset.view === "inventory" || target.dataset.view === "assistant"
                      ? "map"
                      : target.dataset.view;
                  appStore.set({
                    view: next,
                    activityDedicated: false,
                    selectedActivity: null,
                    lastAction: `Abriu ${target.textContent.trim()}`,
                  });
                },
              },
              {
                eventType: "click",
                selector: "[data-chat-map]",
                action: "open-map-context",
                handler: () => this.openMapContext(),
              },
              {
                eventType: "click",
                selector: "[data-chat-camera]",
                action: "open-camera",
                handler: () => this.querySelector("[data-chat-camera-input]")?.click(),
              },
              {
                eventType: "change",
                selector: "[data-chat-camera-input]",
                action: "read-camera-image",
                handler: ({ event }) => {
                  const file = event.target.files?.[0];
                  if (file) this.readChatImage(file, "camera");
                },
              },
              {
                eventType: "paste",
                selector: null,
                action: "read-pasted-image",
                handler: ({ event }) => {
        const item = [...(event.clipboardData?.items || [])].find(
          (entry) =>
            entry.kind === "file" &&
            /^image\/(?:png|jpeg|webp)$/i.test(entry.type),
        );
        const file = item?.getAsFile?.();
        if (!file) return;
        event.preventDefault();
        this.readChatImage(file, "clipboard");
              },
              },
              {
                eventType: "submit",
                selector: ".chat-form",
                action: "submit-message",
                handler: ({ event, target }) => {
                  event.preventDefault();
                  const input = target.querySelector('input[aria-label="Mensagem para IA"]');
                  const text = input.value.trim();
                  if (!text && !this.chatAttachment) return;
                  const message =
                    text ||
                    (this.chatAttachment?.source === "clipboard"
                      ? "Analise a imagem colada e descreva os fatos visíveis e seus impactos operacionais."
                      : "Analise esta evidência capturada no mapa.");
                  const attachment = this.chatAttachment;
                  this.respond(message, attachment);
                  input.value = "";
                  this.chatAttachment = null;
                  const cameraInput = this.querySelector("[data-chat-camera-input]");
                  if (cameraInput) cameraInput.value = "";
                  this.renderChatAttachment();
                },
              },
            ],
          },
          {
            service: "ai-chat-message-actions",
            routes: [
              {
                eventType: "click",
                selector: ".chat-message-speak",
                action: "speak-message",
                handler: ({ target }) => this.speakText(target.dataset.chatMessageText || ""),
              },
              {
                eventType: "click",
                selector: "[data-contextual-message]",
                action: "respond-to-suggestion",
                handler: ({ target }) => this.respond(target.dataset.contextualMessage),
              },
              {
                eventType: "click",
                selector: "[data-chat-attachment-remove]",
                action: "remove-attachment",
                handler: () => {
                  this.chatAttachment = null;
                  const input = this.querySelector("[data-chat-camera-input]");
                  if (input) input.value = "";
                  this.renderChatAttachment();
                },
              },
              {
                eventType: "click",
                selector: "[data-chat-event-action]",
                action: "run-dynamic-action",
                handler: ({ event, target }) => this._chatEventActionsV1.get(target)?.(event),
              },
            ],
          },
        ],
      });
      this._chatGlobalEventAdministratorsV1?.dispose();
      this._chatGlobalEventAdministratorsV1 = createServiceEventAdministrators({
        root: browserEventTarget,
        services: [
          {
            service: "ai-chat-system-events",
            routes: [
              ...["belavista:test-case-completed", "belavista:test-controls-changed", "belavista:integrations-saved"].map((eventType) => ({
                eventType,
                selector: null,
                action: "observe-system-event",
                handler: ({ event }) => this.handleSystemEvent(event),
              })),
            ],
          },
          {
            service: "ai-chat-layout-gesture",
            routes: [
              {
                eventType: "pointermove",
                selector: null,
                action: "move-window",
                handler: ({ event }) => this.moveLayoutGestureV1(event),
              },
              {
                eventType: "pointerup",
                selector: null,
                action: "finish-window",
                handler: ({ event }) => this.finishLayoutGestureV1(event),
              },
              {
                eventType: "pointercancel",
                selector: null,
                action: "cancel-window",
                handler: ({ event }) => this.finishLayoutGestureV1(event),
              },
            ],
          },
        ],
      });
    }
    registerEventActionV1(target, handler) {
      if (!target || typeof handler !== "function") return;
      target.dataset.chatEventAction = "true";
      this._chatEventActionsV1.set(target, handler);
    }
    appendConversationMessage(kind, text, { auto = false, persist = true } = {}) {
      const log = this.querySelector(".chat-log");
      if (!log) return null;
      const node = browserDocument.createElement("div");
      node.className =
        kind === "user" ? "user-mini" : `ai-mini${auto ? " ai-auto-mini" : ""}`;
      node.dataset.chatHistoryMessage = "true";
      node.textContent = String(text || "");
      log.append(node);
      if (kind !== "user") {
        const speak = browserDocument.createElement("button");
        speak.type = "button";
        speak.className = "chat-message-speak";
        speak.setAttribute("aria-label", "Ouvir resposta da IA");
        speak.title = "Ouvir resposta";
        speak.textContent = "Ouvir";
        speak.dataset.chatMessageText = String(text || "");
        node.append(speak);
      }
      if (persist) this.persistChatMessage(kind, text, auto);
      log.scrollTop = log.scrollHeight;
      return node;
    }
    speakText(text) {
      const synth = speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance !== "function")
        return false;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text || ""));
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      synth.speak(utterance);
      return true;
    }
    persistChatMessage(kind, text, auto = false) {
      const value = String(text || "")
        .trim()
        .slice(0, 1600);
      if (!value) return;
      const history = readChatHistory();
      history.push({
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        text: value,
        auto: Boolean(auto),
        view: appStore.get().view,
        at: new Date().toISOString(),
      });
      writeChatHistory(history);
    }
    clearChatHistory() {
      try {
        clearChatHistory();
      } catch {
        // Storage indisponível não deve impedir a abertura do assistente.
      }
      const log = this.querySelector(".chat-log");
      if (log) log.replaceChildren();
      this._chatHistoryHydrated = true;
    }
    restoreChatHistory() {
      if (this._chatHistoryHydrated) return;
      const log = this.querySelector(".chat-log");
      if (!log) return;
      readChatHistory().forEach((item) =>
        this.appendConversationMessage(
          item.kind === "user" ? "user" : "assistant",
          item.text,
          { auto: Boolean(item.auto), persist: false },
        ),
      );
      this._chatHistoryHydrated = true;
      log.scrollTop = log.scrollHeight;
    }
    prepareLotStatusPrompt(lotLabel) {
      const label = String(lotLabel || "lote selecionado").trim();
      const input = this.querySelector('input[aria-label="Mensagem para IA"]');
      if (!input) return false;
  
      // O marcador apenas abre o contexto. A pergunta continua pertencendo ao
      // usuário: não escrevemos nem enviamos uma mensagem em seu nome.
      if (this.classList.contains("collapsed")) {
        this.classList.remove("collapsed");
        if (this._expandedSize) {
          this.style.width = `${this._expandedSize.width}px`;
          this.style.height = `${this._expandedSize.height}px`;
        }
      }
      this.dataset.lotStatusContext = label;
      input.dataset.lotStatusContext = label;
      input.placeholder = `Pergunte sobre o status do ${label}…`;
      input.setAttribute(
        "aria-description",
        `Contexto selecionado: ${label}. Escreva e envie manualmente sua pergunta.`,
      );
      onNextFrame(() => input.focus({ preventScroll: true }));
      return true;
    }
    prepareMapAreaPrompt(areaLabel) {
      const label = String(areaLabel || commonAreaLabel).trim();
      const input = this.querySelector('input[aria-label="Mensagem para IA"]');
      if (!input) return false;
      if (this.classList.contains("collapsed")) {
        this.classList.remove("collapsed");
        if (this._expandedSize) {
          this.style.width = `${this._expandedSize.width}px`;
          this.style.height = `${this._expandedSize.height}px`;
        }
      }
      this.dataset.mapContextKind = "common-area";
      this.dataset.mapContextLabel = label;
      input.dataset.mapContextKind = "common-area";
      input.dataset.mapContextLabel = label;
      input.placeholder = `Pergunte sobre ${label}…`;
      input.setAttribute(
        "aria-description",
        `Contexto selecionado: ${label}. Escreva e envie manualmente sua pergunta.`,
      );
      onNextFrame(() => input.focus({ preventScroll: true }));
      return true;
    }
    systemViewLabel(view) {
      return (
        {
          assistant: "dashboard inicial",
          map: "mapa operacional",
          stages: "etapas e cronograma",
          agenda: "agenda",
          activities: "atividades",
          progress: "andamento da obra",
          records: "registros",
          leads: "leads",
          commissions: "corretores e comissões",
          reports: "relatórios",
          settings: "configurações",
          purchases: "compras",
          inventory: "materiais",
          control: "central de controle",
        }[view] || "esta área"
      );
    }
    systemSnapshot(state) {
      const notifications = Array.isArray(state.operationalNotifications)
        ? state.operationalNotifications
        : [];
      const control = state.controlRealtime || {};
      const cash = state.cashSummary || {};
      return {
        view: state.view,
        lastAction: String(state.lastAction || ""),
        notifications: `${notifications.length}:${notifications
          .slice(0, 4)
          .map(
            (item) =>
              item.id ||
              item.notificationId ||
              item.updatedAt ||
              item.title ||
              item.message ||
              "item",
          )
          .join("|")}`,
        cash: Number.isFinite(Number(cash.balanceCents))
          ? Number(cash.balanceCents)
          : Number.isFinite(Number(cash.balance))
            ? Number(cash.balance)
            : null,
        control: `${control.updatedAt || control.at || control.source || ""}`,
        records: Array.isArray(state.records) ? state.records.length : 0,
      };
    }
    updateMonitoring(state) {
      const node = this.querySelector("[data-chat-monitoring]");
      if (node)
        node.textContent = `MONITORANDO · ${this.systemViewLabel(state.view).toUpperCase()}`;
    }
    queueAutomaticMessage(text, key) {
      if (!text || this._autoMessageKeys.has(key)) return;
      this._autoMessageKeys.add(key);
      if (this._autoMessageKeys.size > 120)
        this._autoMessageKeys.delete(this._autoMessageKeys.values().next().value);
      this._autoMessageQueue.push(text);
      cancel(this._autoMessageTimer);
      this._autoMessageTimer = schedule(() => {
        const messages = this._autoMessageQueue.splice(0, 3);
        if (messages.length) {
          const text = messages.join(" ");
          this.appendConversationMessage("assistant", text, { auto: true });
          if (this.chatVoiceEnabled) this.speakText(text);
        }
      }, 260);
    }
    observeSystemState(state) {
      const next = this.systemSnapshot(state);
      this.updateMonitoring(state);
      if (!this._observedSystemState) {
        this._observedSystemState = next;
        return;
      }
      const previous = this._observedSystemState,
        events = [];
      if (next.view !== previous.view)
        events.push({
          key: `navigation:${next.view}:${next.lastAction}`,
          text: `Navegação detectada: você está em ${this.systemViewLabel(next.view)}. Vou acompanhar as informações desta área.`,
        });
      else if (
        next.lastAction !== previous.lastAction &&
        !/^(Consulta IA:|IA (abriu|preparou|filtrou|executou)|Extensões administrativas carregadas|Painel aberto;)/i.test(
          next.lastAction,
        )
      )
        events.push({
          key: `action:${next.lastAction}`,
          text: `Registrei a mudança: ${next.lastAction}. Vou refletir isso no acompanhamento do sistema.`,
        });
      if (
        next.notifications !== previous.notifications &&
        Number(next.notifications.split(":", 1)[0]) > 0
      )
        events.push({
          key: `notifications:${next.notifications}`,
          text: "Recebi uma atualização operacional. Confira as notificações e os próximos responsáveis sugeridos.",
        });
      if (next.cash !== previous.cash && next.cash !== null)
        events.push({
          key: `cash:${next.cash}`,
          text: "O caixa mestre foi atualizado. A prioridade das etapas, materiais e urgências deve ser recalculada a partir desse saldo.",
        });
      if (next.control !== previous.control && next.control)
        events.push({
          key: `control:${next.control}`,
          text: "O centro de controle recebeu uma mudança em tempo real. Estou acompanhando as propagações dos workers.",
        });
      if (next.records !== previous.records)
        events.push({
          key: `records:${next.records}`,
          text: `O histórico de registros mudou para ${next.records} item(ns). Verifique evidências, responsável e local da atividade.`,
        });
      this._observedSystemState = next;
      events.forEach((event) =>
        this.queueAutomaticMessage(event.text, event.key),
      );
    }
    handleSystemEvent(event) {
      const detail = event?.detail || {},
        label =
          detail.name || detail.caseName || detail.id || "uma ação de teste";
      if (event.type === "belavista:test-case-completed")
        this.queueAutomaticMessage(
          `A suíte de testes concluiu ${label}. Vou manter o resultado no contexto desta sessão.`,
          `test-completed:${label}:${detail.at || detail.completedAt || ""}`,
        );
      if (event.type === "belavista:test-controls-changed")
        this.queueAutomaticMessage(
          `Os casos de teste foram ${detail.enabled === false ? "desativados" : "atualizados"}. Acompanhe as próximas entradas e propagações no painel.`,
          `test-controls:${detail.enabled}:${detail.at || ""}`,
        );
      if (event.type === "belavista:integrations-saved")
        this.queueAutomaticMessage(
          "As configurações de integração foram salvas. O monitoramento segue preparado para os eventos operacionais.",
          "integrations-saved",
        );
    }
    contextualSuggestion(state) {
      const stage =
        demoData.activities.find((item) => item.id === state.selectedStage) ||
        demoData.activities[1];
      const stageName = stage?.name || "a etapa selecionada";
      const suggestions = {
        assistant: {
          label: "PANORAMA OPERACIONAL",
          title: "Comece pelas frentes críticas",
          text: `Há ${demoData.metrics.delayed} etapas atrasadas e ${demoData.metrics.criticalPurchases} compras críticas. Sugiro revisar a drenagem e o abastecimento antes de avançar o calendário.`,
          actions: [
            [
              "Ver etapas críticas",
              "Abra as etapas críticas e avalie o próximo marco.",
            ],
          ],
        },
        map: {
          label: "LEITURA DO MAPA",
          title: "Compare o destaque com o progresso",
          text: "O mapa está pronto para cruzar lotes, ruas e áreas de lazer com o avanço físico. Posso destacar a drenagem ou abrir uma seleção de progresso.",
          actions: [
            [
              "Destacar drenagem",
              "Destaque drenagem no mapa e mostre os riscos de execução.",
            ],
          ],
        },
        stages: {
          label: "PLANEJAMENTO DE ETAPAS",
          title: `Atenção ao tempo de ${stageName}`,
          text: `A etapa está em ${stage?.progress || 0}% e o cronograma soma as atividades em horas. O próximo ganho operacional é abrir o cronograma e conferir as dependências antes de liberar a frente.`,
          actions: [
            [
              "Abrir cronograma",
              "Abra o cronograma das etapas e sugira a próxima frente.",
            ],
            [
              "Ver atividades",
              "Abra as atividades da etapa e mostre o que falta executar.",
            ],
          ],
        },
        agenda: {
          label: "AGENDA OPERACIONAL",
          title: "Prepare os próximos envolvidos",
          text: "A agenda concentra confirmações, responsáveis e alertas de prazo. Vale enviar hoje os compromissos da etapa e criar o alerta do próximo marco.",
          actions: [
            [
              "Preparar agenda",
              "Prepare a agenda de hoje e sugira os responsáveis que precisam ser notificados.",
            ],
          ],
        },
        activities: {
          label: "EXECUÇÃO DA ATIVIDADE",
          title: "Complete a próxima evidência",
          text: `A etapa ${stageName} precisa manter execução, medição e comprovantes relacionados. Posso abrir a atividade mais urgente e organizar os campos de preenchimento.`,
          actions: [
            [
              "Organizar execução",
              "Sugira a próxima atividade de execução para a etapa e os campos que faltam preencher.",
            ],
          ],
        },
        progress: {
          label: "DIÁRIO DE OBRAS",
          title: "Transforme o avanço em evidência",
          text: "O diário ganha valor quando cada apontamento vincula responsável, área do mapa, medição e foto. Sugiro registrar o próximo avanço diretamente na superfície destacada.",
          actions: [
            [
              "Registrar andamento",
              "Abra um novo registro de andamento com os campos da natureza da etapa.",
            ],
          ],
        },
        records: {
          label: "REGISTROS OPERACIONAIS",
          title: "Feche o registro com uma área",
          text: "Há mais rastreabilidade quando o registro leva atividade, responsável, evidência e trecho do modelo 3D. Posso preparar o formulário para pintar a área executada.",
          actions: [
            [
              "Preparar registro",
              "Abra um novo registro e prepare a seleção de área no mapa.",
            ],
          ],
        },
        leads: {
          label: "OPORTUNIDADE COMERCIAL",
          title: "Priorize o próximo contato",
          text: `O funil tem ${demoData.metrics.leads} leads e ${demoData.metrics.lotsWithInterest} lotes com interesse. Sugiro agrupar por objetivo e abordar primeiro quem já indicou faixa de valor e lote.`,
          actions: [
            [
              "Priorizar leads",
              "Analise os leads qualificados e sugira uma próxima ação de marketing.",
            ],
            [
              "Agrupar por lote",
              "Agrupe os leads por lote e destaque as oportunidades mais quentes.",
            ],
          ],
        },
        commissions: {
          label: "GESTÃO COMERCIAL",
          title: "Conecte carteira e fechamento",
          text: "As carteiras ficam mais acionáveis quando cada responsável acompanha lotes, clientes, contrato e comissão em uma única sequência. Posso filtrar os lançamentos pendentes.",
          actions: [
            [
              "Revisar comissões",
              "Mostre os lançamentos de comissão pendentes e sugira a ordem de revisão.",
            ],
          ],
        },
        reports: {
          label: "ANÁLISE GERENCIAL",
          title: "Escolha o indicador decisivo",
          text: `O relatório selecionado em ${state.reportFamily || "Financeiro"} pode ser lido junto com etapas, lançamentos e compras. Sugiro começar pelo desvio físico-financeiro e suas causas.`,
          actions: [
            [
              "Analisar desvios",
              "Abra o relatório de avanço físico-financeiro e explique os principais desvios.",
            ],
          ],
        },
        settings: {
          label: "GOVERNANÇA DE USO",
          title: "Revise o que foi feito na sessão",
          text: "A auditoria local mostra as ações iteradas por Warley. Sugiro revisar os módulos mais usados e exportar o histórico antes de encerrar a sessão.",
          actions: [
            [
              "Revisar auditoria",
              "Mostre um resumo das ações tomadas nesta sessão e sugira uma melhoria de uso.",
            ],
          ],
        },
        purchases: {
          label: "SUPRIMENTOS",
          title: "Antecipe o material crítico",
          text: `Há ${demoData.metrics.criticalPurchases} compras críticas. Sugiro cruzar atraso, etapa e saldo de material antes de confirmar a próxima frente.`,
          actions: [
            [
              "Revisar compras",
              "Liste as compras críticas e indique quais etapas estão bloqueadas.",
            ],
          ],
        },
        inventory: {
          label: "MATERIAIS",
          title: "Confronte consumo e saldo",
          text: "O melhor próximo passo é comparar o consumo por etapa com os materiais comprometidos, evitando liberar uma frente sem cobertura.",
          actions: [
            [
              "Analisar materiais",
              "Analise o consumo e indique os materiais que exigem reposição.",
            ],
          ],
        },
      };
      return suggestions[state.view] || suggestions.assistant;
    }
    announceContextualSuggestion(state, force = false) {
      const log = this.querySelector(".chat-log"),
        node = this.querySelector("[data-chat-context-fade]");
      if (!log || !node) return;
      const key = [
        state.view,
        state.activityDedicated ? "dedicated" : "overview",
        state.selectedStage || "",
        state.reportFamily || "",
      ].join(":");
      if (!force && this._suggestionKey === key) return;
      const suggestion = this.contextualSuggestion(state);
      this._suggestionKey = key;
      const actions = suggestion.actions
        .map(
          ([label, message]) =>
            `<button type="button" data-contextual-message="${esc(message)}">${ico("sparkles")} ${esc(label)}</button>`,
        )
        .join("");
      cancel(this._contextFadeTimer);
      node.innerHTML = `<div class="chat-contextual-kicker">${ico("sparkles")} ${esc(suggestion.label)} · IA</div><strong>${esc(suggestion.title)}</strong><p>${esc(suggestion.text)}</p><div class="chat-contextual-actions">${actions}</div>`;
      node.hidden = false;
      node.classList.remove("is-visible");
      onNextFrame(() => node.classList.add("is-visible"));
      createIcons();
      this._contextFadeTimer = schedule(() => {
        node.classList.remove("is-visible");
        schedule(() => {
          if (!node.classList.contains("is-visible")) node.hidden = true;
        }, 420);
      }, 4200);
    }
    applySavedLayout(layout) {
      if (!layout) return;
      if (Number.isFinite(layout.left)) this.style.left = `${layout.left}px`;
      if (Number.isFinite(layout.top)) this.style.top = `${layout.top}px`;
      if (Number.isFinite(layout.width)) this.style.width = `${layout.width}px`;
      if (Number.isFinite(layout.height))
        this.style.height = `${layout.height}px`;
      if (Number.isFinite(layout.width) || Number.isFinite(layout.height))
        this._expandedSize = {
          width: Number(layout.width) || 390,
          height: Number(layout.height) || 520,
        };
      this.style.right = "auto";
      this.style.bottom = "auto";
      this.style.transform = "none";
      this.classList.toggle("collapsed", Boolean(layout.collapsed));
    }
    restoreSavedLayout() {
      const layout =
        readChatWindowLayout() || appStore.get().widgetLayouts?.chat?.global;
      this.applySavedLayout(layout);
      if (layout && !readChatWindowLayout()) writeChatWindowLayout(layout);
    }
    saveLayout() {
      const parent = this.parentElement?.getBoundingClientRect(),
        rect = this.getBoundingClientRect();
      if (!parent) return;
      const collapsed = this.classList.contains("collapsed"),
        previous = readChatWindowLayout() || {},
        expanded =
          this._expandedSize ||
          (!collapsed ? { width: rect.width, height: rect.height } : null);
      const layout = {
        left: Math.round(rect.left - parent.left),
        top: Math.round(rect.top - parent.top),
        width: Math.round(expanded?.width || previous.width || 390),
        height: Math.round(
          expanded?.height || previous.height || Math.max(320, rect.height),
        ),
        collapsed,
      };
      writeChatWindowLayout(layout);
    }
    openMapContext() {
      this.chatMapContext = true;
      appStore.set({
        view: "map",
        lastAction: "Abriu os lotes 3D pelo chat da IA",
      });
      const map =
        browserDocument.querySelector("map-scene[data-stages-panorama-map]") ||
        browserDocument.querySelector("map-scene[data-dashboard-operational-map]") ||
        browserDocument.querySelector("map-scene:not([compact])");
      if (map) {
        map.classList.add("chat-map-focus");
        cancel(this._mapFocusTimer);
        this._mapFocusTimer = schedule(
          () => map.classList.remove("chat-map-focus"),
          1200,
        );
      }
      const node = this.appendConversationMessage(
        "user",
        "🗺️ Contexto de lotes 3D aberto",
      );
      node?.classList.add("chat-context-mini");
    }
    readChatImage(file, source = "file") {
      if (!file) return;
      const mimeType = String(file.type || "image/png").toLowerCase();
      if (!/^image\/(?:png|jpeg|webp)$/.test(mimeType)) {
        notify("Cole ou anexe PNG, JPEG ou WEBP.", "warning");
        return;
      }
      if (Number(file.size) > CHAT_IMAGE_MAX_BYTES_V1) {
        notify("A imagem precisa ter no máximo 6 MB.", "warning");
        return;
      }
      const reader = new BrowserFileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (
          !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(dataUrl)
        ) {
          notify("Não foi possível preparar essa imagem para a IA.", "warning");
          return;
        }
        this.chatAttachment = {
          name: String(file.name || `imagem-${source}.png`),
          mimeType,
          dataUrl,
          source,
        };
        this.renderChatAttachment();
      };
      reader.onerror = () =>
        notify("Não foi possível ler a imagem colada.", "warning");
      reader.readAsDataURL(file);
    }
    renderChatAttachment() {
      const slot = this.querySelector("[data-chat-attachment]");
      if (!slot) return;
      const attachment = this.chatAttachment;
      slot.hidden = !attachment;
      slot.innerHTML = attachment
        ? `<img src="${esc(attachment.dataUrl)}" alt="Prévia da imagem ${esc(attachment.name)}"/><span><b>${attachment.source === "clipboard" ? "Imagem colada" : "Imagem anexada"}</b><small>${esc(attachment.name)}</small></span><button type="button" data-chat-attachment-remove aria-label="Remover imagem">×</button>`
        : "";
      createIcons();
    }
    renderChatAttachmentActions(payload) {
      const ref = payload?.attachment;
      if (!ref) return;
      const log = this.querySelector(".chat-log");
      if (!log) return;
      const wrap = browserDocument.createElement("div");
      wrap.className = "chat-attachment-actions";
      const allocationCall = (Array.isArray(payload?.toolCalls) ? payload.toolCalls : [])
          .find((call) => String(call?.name || "") === "stage.allocate_visual_record"),
        allocation = allocationCall?.arguments && typeof allocationCall.arguments === "object"
          ? allocationCall.arguments
          : null,
        allocationTarget = allocation?.target === "material" ? "material" : "service",
        destinationLabel = allocationTarget === "material" ? "Materiais" : "Serviços",
        allocationTitle = String(
          allocationTarget === "material"
            ? allocation?.materialName || allocation?.activityName || "Item reconhecido"
            : allocation?.activityName || "Serviço reconhecido",
        ).trim(),
        allocationStageName = String(allocation?.stageName || "Etapa a confirmar").trim();
      if (!ref.stored && !payload?.recordOcr) {
        wrap.innerHTML = `<span>${ico("shield-alert")} A imagem foi analisada, mas ainda não pode virar evidência permanente.</span><small>Configure o binding privado BELAVISTA_UPLOADS (Cloudflare R2) para liberar o aceite no registro.</small>`;
      } else if (allocation) {
        wrap.classList.add("is-allocated");
        wrap.setAttribute("aria-live", "polite");
        wrap.innerHTML = `<b>${ico("badge-check")} Leitura concluída e pronta para revisão</b><span>O assistente associou o anexo ao sistema. Confira os dados antes de concluir o fluxo.</span><dl class="chat-allocation-summary"><div><dt>Destino</dt><dd>${esc(destinationLabel)}</dd></div><div><dt>Etapa</dt><dd>${esc(allocationStageName)}</dd></div><div><dt>Item</dt><dd>${esc(allocationTitle)}</dd></div></dl><div><button type="button" data-chat-apply="record">${ico("arrow-up-right")} Revisar propriedades</button><button type="button" data-chat-apply="proof">${ico("paperclip")} Usar como comprovação</button></div>`;
      } else {
        wrap.innerHTML = `<b>${ico(ref.stored ? "shield-check" : "scan-line")} ${ref.stored ? "Imagem protegida e pronta para revisão humana" : "OCR concluído; imagem temporária"}</b><span>Escolha o destino; nada será gravado até você confirmar o formulário.</span><div><button type="button" data-chat-apply="record">${ico("clipboard-pen-line")} Usar em registro</button><button type="button" data-chat-apply="proof">${ico("badge-check")} Usar como comprovação</button></div>`;
        wrap.querySelectorAll("[data-chat-apply]").forEach((button) =>
          this.registerEventActionV1(button, () => {
            const state = appStore.get(),
              stage = allocation
                ? (executionModel.stages || []).find((item) => String(item.key) === String(allocation.stageKey || "")) ||
                  (executionModel.stages || []).find((item) => normalizeStageRecord(item.name) === normalizeStageRecord(allocation.stageName))
                : demoData.activities.find((item) => item.id === state.selectedStage),
              purpose =
                button.dataset.chatApply === "proof" ? "comprovação" : "registro";
            if (allocation && purpose === "registro" && stage) {
              const latest = appStore.get(),
                attachmentMatches = (item) => readStageRecordAttachments(item)
                  .some((attachment) => String(attachment.label || "") === String(ref.name || "")),
                material = allocationTarget === "material"
                  ? (latest.materialCatalogAdditions || []).find((item) =>
                      String(item.stageKey || "") === String(stage.key) && attachmentMatches(item))
                  : null,
                service = allocationTarget === "service"
                  ? (latest.records || []).find((item) =>
                      String(item.stageKey || "") === String(stage.key) &&
                      String(item.allocationTarget || "") === "service" &&
                      attachmentMatches(item))
                  : null,
                itemKey = material?.id || (service?.id ? `service:${service.id}` : "");
              appStore.set({
                view: "stages",
                sidebarCollapsed: false,
                selectedStageV9: stage.key,
                selectedStage: stage.key,
                stageSelected: true,
                controlStageCenterTab: allocationTarget === "material" ? "materials" : "services",
                controlStageCenterItemModalKey: itemKey || null,
                lastAction: `Abriu a revisão de ${allocationTitle} em ${stage.name}`,
              });
              notify(`Abrindo ${destinationLabel} da etapa ${stage.name} para revisão.`, "success");
              return;
            }
            appStore.set({
              view: "records",
              sidebarCollapsed: true,
              editingRecord: "new",
              recordContext: {
                stage: stage?.name || "",
                activity: state.selectedActivity || "",
                label: `Imagem protegida · ${purpose}`,
                attachmentRef: ref,
                evidencePurpose: purpose,
              },
              lastAction: `Preparou imagem para ${purpose}`,
            });
            notify(
              `Imagem preparada como ${purpose}. Revise e confirme o formulário.`,
              "success",
            );
          }),
        );
      }
      log.append(wrap);
      log.scrollTop = log.scrollHeight;
      createIcons();
    }
    buildToolContext() {
      const state = appStore.get(),
        map = browserDocument.querySelector("map-scene:not([compact])");
      return {
        view: state.view,
        selectedStage:
          demoData.activities.find((item) => item.id === state.selectedStage)
            ?.name || null,
        selectedRecord: state.selectedRecord || null,
        selectedLead: state.selectedLead || null,
        report: {
          family: state.reportFamily,
          type: state.reportType,
          period: state.reportPeriod,
        },
        records: (state.records || []).slice(0, 5).map((item) => ({
          id: item.id,
          activity: item.atividade,
          status: item.status,
          responsible: item.responsavel,
        })),
        stages: (Array.isArray(executionModel?.stages) ? executionModel.stages : [])
          .map((stage) => ({
            key: String(stage.key || ""),
            name: String(stage.name || ""),
            unit: String(stage.production?.unit || ""),
            materials: Array.isArray(stage.materials)
              ? stage.materials.map(String).slice(0, 20)
              : [],
          }))
          .filter((stage) => stage.key && stage.name),
        map: map
          ? {
              ready: map.dataset.modelReady === "true",
              selected: map.dataset.selectedPart || null,
              highlight: map.stageOverlayKey || null,
              zoom: map.sceneManualZoom,
              rotation: map.sceneManualRotation,
              tilt: map.dataset.sceneTilt,
            }
          : null,
        lotDevelopment: listLotDevelopmentProfiles(state).slice(0, 24).map((profile) => ({
          id: profile.id,
          kind: profile.kind,
          title: profile.title,
          lotLabel: profile.lotLabel || "",
          status: profile.status || "",
        })),
        capabilities: [
          "navigation",
          "map-highlight",
          "map-view",
          "map-tiles",
          "record-form",
          "agenda-pending-entry",
          "document-form",
          "report-selection",
          "commission-filter",
          "lot-development-profile",
          "print-confirmation",
        ],
      };
    }
    addToolFeedback(message, tone = "done") {
      const log = this.querySelector(".chat-log");
      if (!log) return;
      log.insertAdjacentHTML(
        "beforeend",
        `<div class="chat-tool-feedback ${esc(tone)}">${ico(tone === "pending" ? "shield-check" : "zap")}<span>${esc(message)}</span></div>`,
      );
      log.scrollTop = log.scrollHeight;
      createIcons();
    }
    requestToolConfirmation(call) {
      const log = this.querySelector(".chat-log");
      if (!log) return;
      const scope =
        call.arguments?.scope === "map"
          ? "mapa 3D e medidores"
          : call.arguments?.scope === "contract"
            ? "contrato atual"
            : "escopo atual da página";
      const wrap = browserDocument.createElement("div");
      wrap.className = "chat-tool-confirmation";
      wrap.innerHTML = `<b>${ico("printer")} Confirmar impressão</b><span>Abrir o diálogo do sistema para imprimir ${esc(scope)}?</span><div><button type="button" data-tool-confirm>Imprimir</button><button type="button" data-tool-cancel>Agora não</button></div>`;
      this.registerEventActionV1(wrap.querySelector("[data-tool-confirm]"), () => {
        wrap.remove();
        if (call.arguments?.scope === "map") {
          const map = browserDocument.querySelector("map-scene:not([compact])");
          if (map?.openMapCanvasPrintV1) {
            map.openMapCanvasPrintV1();
            return;
          }
          this.addToolFeedback(
            "Mapa não está disponível para abrir a interface PDF.",
            "warning",
          );
          return;
        }
        appStore.set({
          printMode: true,
          lastAction: "Solicitou impressão pelo assistente",
        });
        if (!printPage) {
          this.addToolFeedback("Impressão não está disponível neste ambiente.", "warning");
          appStore.set({ printMode: false });
          return;
        }
        printPage();
        schedule(() => appStore.set({ printMode: false }), 500);
      });
      this.registerEventActionV1(wrap.querySelector("[data-tool-cancel]"), () => {
        wrap.remove();
        this.addToolFeedback("Impressão cancelada.", "muted");
      });
      log.append(wrap);
      log.scrollTop = log.scrollHeight;
      createIcons();
    }
    async allocateVisualRecordV1(args = {}, context = {}) {
      const stages = Array.isArray(executionModel?.stages) ? executionModel.stages : [];
      const normalizedStageKey = String(args.stageKey || "").trim();
      const normalizedStageName = normalizeStageRecord(args.stageName);
      const stage =
        stages.find((item) => String(item.key) === normalizedStageKey) ||
        (normalizedStageName ? stages.find((item) => normalizeStageRecord(item.name) === normalizedStageName) : null);
      if (!stage) {
        const question = "Não consegui encaixar esta descrição com segurança em uma etapa. Qual etapa ou atividade deve receber este item?";
        this.addToolFeedback(question, "question");
        return question;
      }
      const target = args.target === "material" ? "material" : "service";
      const sourceAttachment = context.sourceAttachment || null;
      const sourceName = String(sourceAttachment?.name || context.payload?.attachment?.name || "anexo visual").trim();
      let storedAttachment = (Array.isArray(context.serviceRequest?.files) ? context.serviceRequest.files : [])
        .find((file) => String(file?.fileName || file?.name || "").trim() === sourceName) || null;
      // A resposta do VLM contém metadados, não o arquivo. Ao aceitar a
      // alocação, persista o data URL recebido pela caixa de chat como evidência
      // local para que a ficha não exiba "sem arquivo".
      if (!storedAttachment && sourceAttachment?.dataUrl && stage.key) {
        try {
          storedAttachment = await persistVisualAttachment({
            stageKey: stage.key,
            activityKey: String(args.activityId || args.materialName || "ocr"),
            target: target === "material" ? "material-proof" : "service-proof",
            title: `OCR · ${sourceName}`,
            notes: "Arquivo original recebido pelo assistente operacional para revisão humana.",
            fileName: sourceName,
            dataUrl: sourceAttachment.dataUrl,
          });
        } catch (error) {
          console.warn("Não foi possível persistir o anexo da leitura visual:", error);
        }
      }
      const sourceFileUrl = String(storedAttachment?.fileUrl || storedAttachment?.url || "").trim();
      const now = new Date();
      const activityName = String(args.activityName || "").trim().slice(0, 160);
      const materialName = String(args.materialName || "").trim().slice(0, 160);
      const title = target === "material"
        ? materialName || activityName || "Material identificado na leitura visual"
        : activityName || "Serviço identificado na leitura visual";
      const details = String(args.details || "Leitura visual recebida pelo assistente operacional.").trim().slice(0, 4000);
      const pointer = String(args.pointer || "").trim().slice(0, 1200);
      const quantity = args.quantity == null || args.quantity === "" ? null : Number.isFinite(Number(args.quantity)) ? Number(args.quantity) : null;
      const confidence = Number.isFinite(Number(args.confidence)) && Number(args.confidence) > 0 ? Math.round(Number(args.confidence) * 100) : null;
      const unit = String(args.unit || (target === "material" ? stage.production?.unit || "un." : quantity == null ? "registro" : "registro")).trim().slice(0, 20);
      const properties = [
        { id: "allocation_target", label: "Destino da leitura visual", type: "text", value: target === "material" ? "Materiais" : "Serviços" },
        { id: "allocation_source", label: "Origem", type: "text", value: "Assistente operacional · leitura visual no chat" },
        { id: "allocation_stage_key", label: "Chave da etapa", type: "text", value: String(stage.key || "") },
        { id: "allocation_stage", label: "Etapa associada", type: "text", value: String(stage.name || "") },
        { id: "allocation_activity_id", label: "ID da atividade", type: "text", value: String(args.activityId || "") || "Não informado" },
        { id: "allocation_activity", label: "Atividade / serviço", type: "text", value: activityName || "Não informado" },
        { id: "allocation_material", label: "Material / equipamento", type: "text", value: materialName || "Não informado" },
        { id: "allocation_quantity", label: "Quantidade identificada", type: "number", value: quantity == null ? "Não informado" : quantity },
        { id: "allocation_unit", label: "Unidade identificada", type: "text", value: unit || "Não informado" },
        { id: "allocation_pointer", label: "Apontamento que sustentou a alocação", type: "text", value: pointer || details },
        { id: "allocation_confidence", label: "Confiança da leitura", type: "text", value: confidence == null ? "Não informado" : `${confidence}%` },
        { id: "allocation_attachment", label: "Anexo analisado", type: "text", value: sourceName },
        { id: "allocation_attachment_url", label: "Arquivo persistido", type: "text", value: sourceFileUrl },
        { id: "allocation_attachment_mime", label: "Tipo do arquivo", type: "text", value: String(storedAttachment?.mimeType || sourceAttachment?.mimeType || "") },
      ];
      const localId = `REG-VIS-${Date.now().toString(36).toUpperCase()}`;
      const payload = {
        id: localId,
        obra: "Aliança Park",
        etapa: stage.name,
        stageKey: stage.key,
        stageName: stage.name,
        atividade: target === "material" ? `Material: ${title}` : title,
        activityId: String(args.activityId || "").trim(),
        responsavel: "Assistente operacional",
        data: now.toISOString().slice(0, 10),
        hora: now.toTimeString().slice(0, 5),
        detalhes: [details, pointer ? `Indicação visual: ${pointer}` : "", `Anexo analisado: ${sourceName}`].filter(Boolean).join("\n"),
        status: "Pendente",
        progresso: 0,
        unit,
        quantity,
        allocationTarget: target,
        source: "chat-visual",
        properties,
        attachments: sourceAttachment ? [{
          name: sourceName,
          fileName: sourceName,
          label: sourceName,
          mimeType: String(storedAttachment?.mimeType || sourceAttachment.mimeType || "image/*"),
          fileUrl: sourceFileUrl,
          url: sourceFileUrl,
          notes: sourceFileUrl ? "Arquivo original salvo na solicitação vinculada" : "Imagem recebida, mas sem arquivo persistido",
        }] : [],
        evidenceUri: "",
      };
      let saved = null;
      try {
        saved = await createRecord(payload);
      } catch (error) {
        const localRecord = {
          ...payload,
          id: localId,
          attachments: payload.attachments,
          pendingPersistence: true,
        };
        const pendingMaterialAddition = target === "material"
          ? {
              id: `AI-MATERIAL-${localId}`,
              name: materialName || title,
              scope: details,
              quantity,
              unit,
              status: "Pendente",
              stageKey: stage.key,
              stageName: stage.name,
              activityName: activityName || "Leitura visual do chat",
              source: "chat-visual",
              sourceRecordId: localId,
              properties,
              attachments: localRecord.attachments,
              updatedAt: now.toISOString(),
            }
          : null;
        appStore.update((current) => ({
          ...current,
          records: [localRecord, ...(current.records || [])],
          materialCatalogAdditions: pendingMaterialAddition
            ? [pendingMaterialAddition, ...(current.materialCatalogAdditions || []).filter((item) => item.id !== pendingMaterialAddition.id)]
            : current.materialCatalogAdditions || [],
          lastAction: `Preparou alocação visual pendente em ${stage.name}`,
        }));
        this.addToolFeedback(`Leitura visual preparada em ${target === "material" ? "Materiais" : "Serviços"}, mas a persistência está pendente (${error.message}).`, "warning");
        return `Preparou alocação visual pendente em ${stage.name}; persistência aguardando conexão.`;
      }
      const record = {
        ...saved,
        ...payload,
        id: saved?.id || localId,
        properties: saved?.properties || properties,
        attachments: payload.attachments,
        pendingPersistence: false,
      };
      const materialAddition = target === "material" ? {
        id: `AI-MATERIAL-${record.id}`,
        name: materialName || title,
        scope: details,
        quantity,
        unit,
        status: "Pendente",
        stageKey: stage.key,
        stageName: stage.name,
        activityName: activityName || "Leitura visual do chat",
        source: "chat-visual",
        sourceRecordId: record.id,
        properties,
        attachments: record.attachments,
        updatedAt: now.toISOString(),
      } : null;
      appStore.update((current) => ({
        ...current,
        records: [record, ...(current.records || []).filter((item) => item.id !== record.id)],
        materialCatalogAdditions: materialAddition
          ? [materialAddition, ...(current.materialCatalogAdditions || []).filter((item) => item.id !== materialAddition.id)]
          : current.materialCatalogAdditions || [],
        lastAction: `Alocou leitura visual em ${target === "material" ? "Materiais" : "Serviços"} · ${stage.name}`,
      }));
      const destination = target === "material" ? "Materiais" : "Serviços";
      this.addToolFeedback(`Leitura visual alocada em ${destination} · ${stage.name}${title ? ` · ${title}` : ""}. Status: Pendente para revisão humana.`, "pending");
      return `Alocou a leitura visual em ${destination} na etapa ${stage.name}, com status Pendente para revisão humana.`;
    }
  
    async executeToolCalls(calls = [], context = {}) {
      const map = browserDocument.querySelector("map-scene:not([compact])"),
        allowedViews = new Set([
          "assistant",
          "stages",
          "agenda",
          "activities",
          "progress",
          "records",
          "leads",
          "commissions",
          "lot-development",
          "reports",
          "settings",
        ]);
      const executed = [];
      for (const call of calls.slice(0, 4)) {
        const name = String(call?.name || ""),
          args =
            call?.arguments && typeof call.arguments === "object"
              ? call.arguments
              : {};
        if (name === "ui.navigate" && allowedViews.has(args.view)) {
          appStore.set({
            view: args.view,
            sidebarCollapsed: args.view === "records",
            lastAction: `IA abriu ${args.view}`,
          });
          executed.push(`Abriu ${args.view}.`);
          continue;
        }
        if (name === "lot-development.upsert_profile") {
          const profile = saveLotDevelopmentProfile(args);
          executed.push(`Preparou o perfil ${profile.title} no Loteamento para revisão.`);
          continue;
        }
        if (name === "map.set_overlay" && map) {
          if (args.category === "clear") map.clearStageOverlay?.(false);
          else if (
            [
              "terraplanagem",
              "drenagem",
              "rede-agua",
              "rede-eletrica",
              "pavimentacao",
              "urbanizacao",
            ].includes(args.category)
          )
            map.setStageOverlay?.(args.category, false);
          executed.push(
            args.category === "clear"
              ? "Limpou destaque do mapa."
              : `Destacou ${args.category} no mapa.`,
          );
          continue;
        }
        if (name === "map.adjust_view" && map) {
          if (args.fit) map.fitSceneView?.(true);
          else {
            if (Number.isFinite(Number(args.rotationDelta)))
              map.setSceneRotation?.(
                map.sceneManualRotation + Number(args.rotationDelta),
                true,
              );
            if (Number.isFinite(Number(args.tiltDelta)))
              map.setSceneTiltAdjust?.(
                map.sceneTiltAdjust + Number(args.tiltDelta),
                true,
              );
            if (Number.isFinite(Number(args.zoomDelta)))
              map.setSceneZoom?.(
                map.sceneManualZoom + Number(args.zoomDelta),
                true,
              );
          }
          executed.push("Ajustou a vista 3D.");
          continue;
        }
        if (
          name === "map.set_tiles" &&
          map &&
          ["satellite", "osm", "generated"].includes(args.mode)
        ) {
          map.setMapTileMode?.(args.mode, true);
          executed.push(
            `Base ${args.mode === "osm" ? "OpenStreetMap" : args.mode === "generated" ? "aérea HD gerada" : "satélite"} ativada.`,
          );
          continue;
        }
        if (name === "records.open_form") {
          const category = ["ocorrencia", "vistoria", "reuniao", "comunicacao", "decisao", "outro"].includes(args.category) ? args.category : "ocorrencia";
          appStore.set({
            view: "control",
            controlEventTab: "event",
            controlEventDraft: {
              title: String(args.activity || "").slice(0, 120),
              responsible: String(args.responsible || "").slice(0, 120),
              details: String(args.details || "").slice(0, 4000),
              category,
            },
            lastAction: "IA preparou registro geral para revisão",
          });
          executed.push("Abriu a ficha de evento geral para revisão, sem gravar dados.");
          continue;
        }
        if (name === "stage.allocate_visual_record") {
          const message = await this.allocateVisualRecordV1(args, context);
          if (message) executed.push(message);
          continue;
        }
        if (name === "agenda.create_pending") {
          const state = appStore.get(),
            stages = executionModel.stages || [],
            stageKey = String(args.stageKey || "").trim(),
            stageName = String(args.stageName || args.relation || "").trim(),
            normalizedStageName = normalizeActivityRouteText(stageName),
            selectedKey = String(state.selectedStageV9 || state.selectedStage || ""),
            stage =
              stages.find((item) => String(item.key) === stageKey) ||
              stages.find((item) =>
                normalizedStageName &&
                normalizeActivityRouteText(item.name) === normalizedStageName,
              ) ||
              stages.find((item) => String(item.key) === selectedKey);
          if (!stage) {
            this.addToolFeedback(
              "A IA precisa confirmar a etapa antes de criar o apontamento no cronograma.",
              "warning",
            );
            continue;
          }
          const data = readCalendar(),
            events = [...(data.events || [])],
            requestedDate = String(args.date || "").trim(),
            baseWeek = weekKey(
              parseDate(requestedDate) || new Date(),
            ),
            slot = findLastAvailableSlot(events, baseWeek),
            date = parseDate(requestedDate)
              ? requestedDate
              : slot.date,
            requestedStart = String(args.start || "").trim(),
            start = /^\d{2}:\d{2}$/.test(requestedStart)
              ? requestedStart
              : slot.start,
            id = `agenda-ai-${Date.now().toString(36)}`,
            title =
              String(args.title || args.activityName || "Apontamento pendente da IA")
                .trim()
                .slice(0, 160),
            owner = String(args.owner || "").trim().slice(0, 120),
            event = {
              id,
              title,
              stageKey: stage.key,
              stageName: stage.name,
              activityId: String(args.activityId || "").trim(),
              activityName: String(args.activityName || title).trim().slice(0, 160),
              owner,
              date,
              start,
              durationHours: Math.max(0.5, Math.min(24, Number(args.durationHours) || 1.5)),
              spanDays: Math.max(1, Math.min(7, Number(args.spanDays) || 1)),
              status: "Pendente",
              aiPending: true,
              notes: String(args.notes || "").trim().slice(0, 1200),
              detailsNeeded: String(args.detailsNeeded || "").trim().slice(0, 800),
              evidenceRequired: Boolean(args.evidenceRequired),
            };
          writeCalendar({
            version: 3,
            initialized: true,
            events: [...events, event],
          });
          const agendaItem = {
            id,
            title,
            name: title,
            stageKey: stage.key,
            stageName: stage.name,
            activityId: event.activityId,
            activity: event.activityName,
            owner,
            responsible: owner,
            status: "Pendente",
            date,
            start,
            time: start,
            durationHours: event.durationHours,
            spanDays: event.spanDays,
            plannedStart: `${date}T${start}:00`,
            aiPending: true,
            detailsNeeded: event.detailsNeeded,
            evidenceRequired: event.evidenceRequired,
          };
          appStore.set({
            view: "agenda",
            selectedStageV9: stage.key,
            selectedStage: stage.key,
            selectedAgendaEventV3: id,
            operationalAgenda: [
              ...(state.operationalAgenda || []).filter(
                (item) => String(item?.id || "") !== id,
              ),
              agendaItem,
            ],
            agendaCalendarRevisionV3: Date.now(),
            agendaCalendarRevisionV7: Date.now(),
            agendaCalendarWeekV8: weekKey(date),
            lastAction: `IA criou apontamento pendente ${title} em ${stage.name}`,
          });
          executed.push(
            `Criou apontamento pendente no cronograma de ${stage.name} e abriu para completar os dados.`,
          );
          continue;
        }
        if (name === "documents.open_form") {
          appStore.set({
            view: "documents",
            documentsEditId: "new",
            lastAction: `IA solicitou documento${args.reason ? `: ${String(args.reason).slice(0, 120)}` : ""}`,
          });
          executed.push("Abriu a inclusão de documento para anexar a evidência solicitada.");
          continue;
        }
        if (name === "reports.select") {
          const family = [
            "Financeiro",
            "Construção",
            "Suprimentos",
            "Comercial",
            "Governança",
          ].includes(args.family)
            ? args.family
            : "Financeiro";
          appStore.set({
            view: "reports",
            reportFamily: family,
            reportType: args.reportType || appStore.get().reportType,
            lastAction: `IA abriu relatório ${family}`,
          });
          executed.push(`Abriu relatórios de ${family}.`);
          continue;
        }
        if (name === "commissions.filter") {
          appStore.set({
            view: "commissions",
            commissionFilters: {
              ...(appStore.get().commissionFilters || {}),
              query: args.query || "",
              status: args.status || "all",
              profile: args.profile || "all",
            },
            lastAction: "IA filtrou carteira comercial",
          });
          executed.push("Aplicou filtro na carteira comercial.");
          continue;
        }
        if (name === "ui.print") {
          this.requestToolConfirmation(call);
          executed.push("Solicitou confirmação para impressão.");
          continue;
        }
      }
      executed.forEach((message) => this.addToolFeedback(message));
      return executed;
    }
    async respond(text, attachment = null, options = {}) {
      const lotCommand = !attachment ? parseLotStatusCommand(text) : null;
      if (lotCommand) {
        this.appendConversationMessage("user", text);
        const answerText = lotCommand.error ? lotCommand.error : applyLotStatusCommand(lotCommand);
        this.appendConversationMessage("assistant", answerText);
        this.persistChatMessage("assistant", answerText);
        return;
      }
      appStore.set({ lastAction: `Consulta IA: ${text.slice(0, 48)}` });
      const userMessage = [
        text,
        this.chatMapContext ? "· mapa 3D" : "",
        attachment ? `· 📷 ${attachment.name}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      this.appendConversationMessage("user", userMessage);
      const answer = this.appendConversationMessage("assistant", "Analisando…", {
        persist: false,
      });
      try {
        const endpoint = attachment ? "/api/ai/vision-reasoning" : "/api/ai";
        const requestInit = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            view: appStore.get().view,
            mapContext: this.chatMapContext,
            instruction: `${CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1} ${CHAT_VISUAL_ALLOCATION_POLICY_V1}`,
            requestContext:
              options?.requestContext && typeof options.requestContext === "object"
                ? options.requestContext
                : null,
            context: this.buildToolContext(),
            attachment: attachment
              ? {
                  name: attachment.name,
                  mimeType: attachment.mimeType,
                  dataUrl: attachment.dataUrl,
                }
              : null,
          }),
        };
        const payload = await inferAssistantRequestV1({
          modelRequest: {
            endpoint: "/api/inference",
            body: JSON.parse(requestInit.body),
          },
          httpRequest: { endpoint, init: requestInit },
        });
        if (payload.inference && typeof payload.inference === "object") {
          this.dataset.inferenceEndpoint = String(payload.inference.endpoint || endpoint);
          this.dataset.inferenceSystemModel = String(
            payload.inference.systemModel?.id || payload.inference.systemModel || "",
          );
          if (payload.inference.jev?.choice)
            this.dataset.inferenceChoice = String(payload.inference.jev.choice);
          if (payload.inference.jev?.error)
            this.dataset.inferenceError = String(payload.inference.jev.error).slice(0, 240);
        }
        const answerText = payload.text || "Ação preparada.";
        answer.textContent = answerText;
        this.persistChatMessage("assistant", answerText);
        if (payload.vision)
          this.addToolFeedback(
            `Imagem interpretada pela NVIDIA · ${payload.model || "modelo multimodal"}.`,
          );
        this.renderChatAttachmentActions(payload);
        const executed = await this.executeToolCalls(
          Array.isArray(payload.toolCalls) ? payload.toolCalls : [],
          { payload, sourceAttachment: attachment },
        );
        if (executed.length)
          appStore.set({
            lastAction: `IA executou ${executed.length} ferramenta(s)`,
          });
      } catch (err) {
        const answerText = `Endpoint de IA indisponível · ${err.message || "falha de conexão"}. Nenhuma resposta local foi usada.`;
        answer.textContent = answerText;
        this.persistChatMessage("assistant", answerText);
        console.warn(
          "Endpoint de IA indisponível; nenhuma resposta local foi usada:",
          err,
        );
      }
      if (
        this.chatVoiceEnabled &&
        answer?.textContent &&
        answer.textContent !== "Analisando…"
      )
        this.speakText(answer.textContent);
      const log = this.querySelector(".chat-log");
      if (log) log.scrollTop = log.scrollHeight;
    }
    beginDragV1(event) {
      const handle = event.target?.closest?.(".drag-handle");
      if (!handle || event.button !== 0 || event.target.closest("button")) return;
      event.preventDefault();
      const rect = this.getBoundingClientRect();
      this._chatPointerGestureV1 = {
        type: "drag",
        handle,
        pointerId: event.pointerId,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      handle.setPointerCapture?.(event.pointerId);
      this.classList.add("is-dragging");
      this.style.transition = "none";
    }
    beginResizeV1(event, handle) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const parent = this.parentElement?.getBoundingClientRect(),
        rect = this.getBoundingClientRect();
      if (!parent) return;
      const direction = handle.dataset.resize,
        initial = {
          left: rect.left - parent.left,
          top: rect.top - parent.top,
          width: rect.width,
          height: rect.height,
          x: event.clientX,
          y: event.clientY,
        },
        minWidth = Math.min(320, Math.max(220, parent.width - 16)),
        minHeight = Math.min(260, Math.max(180, parent.height - 24)),
        maxWidth = Math.max(minWidth, parent.width - initial.left - 8),
        maxHeight = Math.max(minHeight, parent.height - initial.top - 8);
      this._chatPointerGestureV1 = {
        type: "resize",
        handle,
        pointerId: event.pointerId,
        direction,
        initial,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
        parent,
      };
      this.style.transition = "none";
      this.classList.add("is-resizing");
      handle.setPointerCapture?.(event.pointerId);
    }
    moveLayoutGestureV1(event) {
      const gesture = this._chatPointerGestureV1;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (gesture.type === "drag") {
        const parent = this.parentElement.getBoundingClientRect();
        const x = Math.max(
          8,
          Math.min(
            parent.width - this.offsetWidth - 8,
            event.clientX - parent.left - gesture.x,
          ),
        );
        const y = Math.max(
          80,
          Math.min(
            parent.height - this.offsetHeight - 8,
            event.clientY - parent.top - gesture.y,
          ),
        );
        this.style.left = x + "px";
        this.style.top = y + "px";
        this.style.right = "auto";
        this.style.bottom = "auto";
        return;
      }
      const { initial, direction, minWidth, minHeight, maxWidth, maxHeight } = gesture,
        dx = event.clientX - initial.x,
        dy = event.clientY - initial.y,
        clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      let left = initial.left,
        top = initial.top,
        width = initial.width,
        height = initial.height;
      if (direction.includes("e")) width = clamp(initial.width + dx, minWidth, maxWidth);
      if (direction.includes("s")) height = clamp(initial.height + dy, minHeight, maxHeight);
      if (direction.includes("w")) {
        left = clamp(initial.left + dx, 8, initial.left + initial.width - minWidth);
        width = initial.left + initial.width - left;
      }
      if (direction.includes("n")) {
        top = clamp(initial.top + dy, 8, initial.top + initial.height - minHeight);
        height = initial.top + initial.height - top;
      }
      this.style.left = `${left}px`;
      this.style.top = `${top}px`;
      this.style.right = "auto";
      this.style.bottom = "auto";
      this.style.width = `${width}px`;
      this.style.height = `${height}px`;
      this.style.transform = "none";
    }
    finishLayoutGestureV1(event) {
      const gesture = this._chatPointerGestureV1;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      gesture.handle.releasePointerCapture?.(gesture.pointerId);
      this._chatPointerGestureV1 = null;
      this.classList.remove("is-dragging", "is-resizing");
      this.style.removeProperty("transition");
      this.saveLayout();
    }
  }
  return AiChat;
};
