import { createServiceEventAdmin } from "../events/service-event-admin.mjs?v=service-event-admin-v4";
import {
  countUnreadTopbarNotificationsV1,
  readTopbarNotificationIdsV1,
  renderTopbarNotificationPanelV1,
  writeTopbarNotificationIdsV1,
} from "./topbar-notifications-v1.mjs?v=topbar-notifications-v1";

const syncDashboardModeV1 = () => {
  const next = "tracking";
  document.documentElement.dataset.dashboardMode = next;
  const map =
    document.querySelector('map-scene[data-persistent-map="true"]') ||
    document.querySelector("map-scene[data-dashboard-operational-map]");
  if (map) {
    map.dataset.dashboardMode = next;
    map.clearDashboardModeHighlightV1?.();
    map.syncDashboardModeHighlightV1?.();
  }
  document
    .querySelectorAll("map-filter-rail")
    .forEach((rail) => rail.render?.());
  return next;
};

export const createAppTopbar = ({
  appStore,
  spreadsheetSchema,
  normalizeOperationalRole,
  actorCanOpenView = () => true,
  isLimitedOperationalActor = () => false,
  ico,
  esc,
  notify,
}) => {
  class AppTopbar extends HTMLElement {
    connectedCallback() {
      this._topbarEventAdmin?.dispose();
      this._topbarEventAdmin = createServiceEventAdmin({
        root: this,
        service: "topbar-operations",
        routes: [
          {
            eventType: "click",
            selector: "#syncBtn",
            action: "synchronize",
            handler: ({ target }) => {
              target.classList.add("spinning");
              setTimeout(() => target.classList.remove("spinning"), 650);
              appStore.set({ lastAction: "Sincronizou dados" });
              notify("Dados sincronizados localmente.", "success");
            },
          },
          {
            eventType: "click",
            selector: '[aria-label="Notificações"]',
            action: "toggle-notifications",
            handler: ({ event }) => {
              event.stopPropagation();
              const panel = this.querySelector(
                "[data-topbar-notification-panel]",
              );
              if (panel) panel.hidden = !panel.hidden;
            },
          },
          {
            eventType: "click",
            selector: "[data-notification-close]",
            action: "close-notifications",
            handler: () => {
              this.querySelector("[data-topbar-notification-panel]")?.setAttribute(
                "hidden",
                "",
              );
            },
          },
          {
            eventType: "click",
            selector: "[data-notification-item]",
            action: "mark-notification-read",
            handler: ({ target }) => {
              const ids = new Set(
                readTopbarNotificationIdsV1(),
              );
              ids.add(target.dataset.notificationItem);
              writeTopbarNotificationIdsV1(ids);
              target.classList.remove("unread");
              target.classList.add("read");
              target.querySelector("i")?.classList.add("read");
            },
          },
          {
            eventType: "click",
            selector: "[data-notification-mark-all]",
            action: "mark-all-notifications-read",
            handler: () => {
              const state = appStore.get(),
                ids = (Array.isArray(state.operationalNotifications)
                  ? state.operationalNotifications
                  : []
                ).map((item) =>
                  String(
                    item.id || item.notificationId || item.updatedAt || item.title,
                  ),
                );
              writeTopbarNotificationIdsV1(ids);
              this.querySelectorAll("[data-notification-item]").forEach((item) =>
                item.classList.remove("unread"),
              );
              const badge = this.querySelector(".badge");
              if (badge) badge.textContent = "0";
            },
          },
          {
            eventType: "click",
            selector: ".top-profile",
            action: "toggle-account-menu",
            handler: () => {
              this.querySelector(".top-admin-menu")?.classList.toggle("open");
              appStore.set({
                adminMenu: !appStore.get().adminMenu,
                lastAction: "Alternou menu do administrador",
              });
            },
          },
          {
            eventType: "click",
            selector: ".top-admin-menu button",
            action: "run-account-command",
            handler: ({ target }) => this.runAccountCommand(target),
          },
        ],
      });
      this.render();
      syncDashboardModeV1();
      this._notificationSignature = "";
      this._topbarStoreUnsubscribe = appStore.subscribe((s) => {
        this.updateThemeButton(s.theme);
        this.updateAtlasNavigation(s);
        const signature = (s.operationalNotifications || [])
          .map(
            (item) =>
              item.id ||
              item.notificationId ||
              item.updatedAt ||
              item.title ||
              item.message,
          )
          .join("|");
        if (signature !== this._notificationSignature) {
          this._notificationSignature = signature;
          this.render();
        }
      });
    }
    disconnectedCallback() {
      this._topbarStoreUnsubscribe?.();
      this._topbarStoreUnsubscribe = null;
      this._topbarEventAdmin?.dispose();
      this._topbarEventAdmin = null;
    }
    async runAccountCommand(button) {
      const label = button.textContent.trim();
      this.querySelector(".top-admin-menu")?.classList.remove("open");
      if (/encerrar/i.test(label)) {
        appStore.set({ adminMenu: false, lastAction: "Encerrando sessão" });
        if (typeof globalThis.BELAVISTA_ADMIN_SIGN_OUT === "function") {
          await globalThis.BELAVISTA_ADMIN_SIGN_OUT();
        } else {
          notify(
            "A sessão autenticada não está disponível neste ambiente.",
            "warning",
          );
        }
        return;
      }
      appStore.set({
        view: "settings",
        adminMenu: false,
        lastAction: `Abriu ${label}`,
      });
    }
    updateThemeButton(theme) {
      const b = this.querySelector("#themeBtn");
      if (!b) return;
      b.setAttribute(
        "aria-label",
        theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro",
      );
      b.innerHTML = ico(theme === "dark" ? "sun" : "moon");
      window.lucide?.createIcons();
    }
    updateAtlasNavigation(state = appStore.get()) {
      const routeLabels = { control: "Visão geral", map: "Mapa de lotes", stages: "Cronograma", agenda: "Agenda", activities: "Atividades", progress: "Progresso", records: "Registros de obras", materials: "Materiais", "lot-development": "Loteamento", "brokers-board": "Lotes", brokers: "Corretores", repasses: "Repasses", "sales-history": "Histórico de movimentações", settings: "Configurações" },
        title = routeLabels[state.view] || "Acompanhamento",
        titleNode = this.querySelector(".atlas-breadcrumbs strong");
      if (titleNode) titleNode.textContent = title;
      this.querySelectorAll("[data-atlas-view]").forEach((button) => {
        const view = button.dataset.atlasView,
          allowed = actorCanOpenView(state.currentActor || {}, view),
          active = view === state.view ||
            (view === "stages" && ["agenda", "activities", "progress", "foremen", "activity-installation"].includes(state.view));
        button.hidden = !allowed;
        button.classList.toggle("active", active);
      });
    }
    render() {
      const s = appStore.get(),
        actor = s.currentActor || { name: "Warley", label: "Dono" },
        normalizedRole = normalizeOperationalRole(actor.role || "owner");
      this.dataset.role = normalizedRole;
      const routeLabels = { control: "Visão geral", map: "Mapa de lotes", stages: "Cronograma", agenda: "Agenda", activities: "Atividades", progress: "Progresso", records: "Registros de obras", materials: "Materiais", "lot-development": "Loteamento", "brokers-board": "Lotes", brokers: "Corretores", repasses: "Repasses", "sales-history": "Histórico de movimentações", settings: "Configurações" };
      const title = routeLabels[s.view] || "Acompanhamento";
      const toolbar = [
        ["control", "layout-dashboard", "Visão"],
        ["map", "map", "Mapa"],
        ["stages", "calendar-days", "Cronograma"],
        ["records", "scan-line", "OCR"],
      ].map(([view, icon, label]) => `<button type="button" data-atlas-view="${view}" title="Abrir ${label}">${ico(icon)}<span>${label}</span></button>`).join("");
      this.innerHTML = `<header class="topbar atlas-topbar"><div class="atlas-topbar-leading"><button type="button" class="icon-btn menu-toggle" data-sidebar-menu-toggle aria-label="Abrir menu" aria-expanded="false">${ico("menu")}</button><div class="atlas-breadcrumbs"><span>Empreendimentos</span><span>›</span><strong>${esc(title)}</strong></div></div><nav class="atlas-toolbar" role="toolbar" aria-label="Barra de ferramentas da aplicação">${toolbar}</nav><div class="top-actions"><span class="atlas-session"><i></i>Sessão ativa</span><button id="syncBtn" class="ghost">${ico("refresh-cw")}<span>Sincronizar</span></button><button class="icon-btn" aria-label="Notificações">${ico("bell")}<span class="badge">0</span></button><div class="top-admin-wrap"><div class="profile top-profile" id="topAdminTrigger" tabindex="0" role="button"><span class="avatar">${esc(actor.name?.[0] || "W")}</span><div><strong>${esc(actor.name || "Warley")}</strong><small>${esc(actor.label || "Dono")}</small></div>${ico("chevron-down")}</div><div class="top-admin-menu"><button>Perfil e permissões</button><button>Auditoria da sessão</button><button>Encerrar sessão</button></div></div></div></header>`;
      this.updateAtlasNavigation(s);
      const notificationButton = this.querySelector(
        '[aria-label="Notificações"]',
      );
      if (notificationButton) {
        notificationButton.dataset.notificationsTrigger = "true";
        const notifications = Array.isArray(s.operationalNotifications)
            ? s.operationalNotifications
            : [],
          unreadCount = countUnreadTopbarNotificationsV1(s);
        notificationButton.querySelector(".badge").textContent = String(
          unreadCount || notifications.length || 0,
        );
        this.insertAdjacentHTML(
          "beforeend",
          renderTopbarNotificationPanelV1(s, { esc }),
        );
      }
      if (isLimitedOperationalActor(actor)) {
        this.querySelector(".atlas-session")?.remove();
        this.querySelector("#syncBtn")?.remove();
        notificationButton?.remove();
        this.querySelectorAll(
          ".top-admin-menu button:not(:last-child)",
        ).forEach((button) => button.remove());
      }
      window.lucide?.createIcons();
    }
  }
  return AppTopbar;
};
