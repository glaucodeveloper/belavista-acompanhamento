import { createSidebarNavigationV1 } from "./sidebar-navigation-v1.mjs?v=sidebar-navigation-v2";
import { createSidebarChromeControllerV1 } from "./sidebar-chrome-controller-v1.mjs?v=sidebar-chrome-controller-v1";
import { renderSidebarShellV1 } from "./sidebar-shell-v1.mjs?v=atlas-zip-sidebar-v2";

export const createAppSidebar = ({
  appStore,
  normalizeOperationalRole,
  isForemanUser,
  isLimitedOperationalActor,
  dashboardModeKeyV1,
  navigationItemsForActor,
  FOREMAN_EXTENSION_VIEWS,
  reportCatalog,
  ico,
  esc,
  notify,
}) => {
  class AppSidebar extends HTMLElement {
    constructor() {
      super();
      this._navigation = createSidebarNavigationV1({
        appStore,
        normalizeOperationalRole,
        isForemanUser,
        isLimitedOperationalActor,
        dashboardModeKeyV1,
        navigationItemsForActor,
        FOREMAN_EXTENSION_VIEWS,
        reportCatalog,
        ico,
        esc,
        notify,
      });
      this._chromeController = createSidebarChromeControllerV1({ appStore, notify });
    }
    connectedCallback() {
      this._chromeController.connect(this);
      this._navigation.connect(this, { closeMobileNavigation: () => this.setMobileNavigationOpen(false) });
      this.render();
      this._sidebarStoreUnsubscribe?.();
      this._sidebarStoreUnsubscribe = appStore.subscribe(() => {
        if (!this._dedicated) this.render();
      });
    }
    disconnectedCallback() {
      this._chromeController.disconnect();
      this._navigation.disconnect();
      this._sidebarStoreUnsubscribe?.();
      this._sidebarStoreUnsubscribe = null;
    }
    setMobileNavigationOpen(open) {
      this.classList.toggle("mobile-open", open);
      const menuToggle = document.querySelector("[data-sidebar-menu-toggle]");
      menuToggle?.setAttribute("aria-expanded", String(open));
      menuToggle?.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      document.querySelector("[data-sidebar-overlay]")?.setAttribute("aria-hidden", String(!open));
      const mobileTrigger = this.querySelector(".mobile-menu-trigger");
      mobileTrigger?.setAttribute("aria-expanded", String(open));
      mobileTrigger?.setAttribute(
        "aria-label",
        open ? "Fechar navegação" : "Abrir navegação",
      );
      const label = mobileTrigger?.querySelector("span");
      if (label) label.textContent = open ? "Fechar" : "Menu";
    }
    render() {
      const state = appStore.get(),
        navigationMarkup = this._navigation.render(state),
        foremanSurface = navigationMarkup.foremanSurface;
      this.dataset.role = navigationMarkup.normalizedRole;
      const previousNav = this.querySelector('.sidebar nav');
      const navScrollTop = previousNav?.scrollTop ?? this._navScrollTop ?? 0;
      const navScrollLeft = previousNav?.scrollLeft ?? this._navScrollLeft ?? 0;
      this._navScrollTop = navScrollTop;
      this._navScrollLeft = navScrollLeft;
      const actor = state.currentActor || { name: "Warley", label: "Dono" };
      this.innerHTML = renderSidebarShellV1({
        actor,
        adminMenuOpen: state.adminMenu,
        navigationMarkup,
        esc,
        ico,
      });
      const nextNav = this.querySelector('.sidebar nav');
      if (nextNav) {
        nextNav.scrollTop = navScrollTop;
        nextNav.scrollLeft = navScrollLeft;
      }
      this.dataset.sidebarReady = "true";
      if (foremanSurface) {
        this.querySelectorAll(".admin-menu button:not(:last-child)").forEach(
          (button) => button.remove(),
        );
      }
      window.lucide?.createIcons();
    }
  }
  return AppSidebar;
};
