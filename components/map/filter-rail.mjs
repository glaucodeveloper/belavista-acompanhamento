import { createServiceEventAdmin } from "../events/service-event-admin.mjs?v=service-event-admin-v4";
import mapFilterCatalogData from "../../frontend/src/data/map-filter-catalog.json" with { type: "json" };

export const createMapFilterRail = (dependencies) => {
  const {
    appStore,
    dashboardModeKeyV1,
    dashboardFiltersForModeV1,
    mapFilterSelectionKeyV1,
    dashboardModes,
    esc,
    mapFilterSummaryMarkupV1,
    ico,
    dashboardFilterForModeV1,
    dashboardFilters,
  } = dependencies;

  const syncDashboardMapWidgetSmokeV1 = (active) => {
    document
      .querySelectorAll(
        'map-scene[data-persistent-map="true"],map-scene[data-dashboard-operational-map]',
      )
      .forEach((map) =>
        map.toggleAttribute("data-map-widgets-open", Boolean(active)),
      );
  };

  const createMapFilterRailEventAdmin = (root, rail) =>
    createServiceEventAdmin({
      root,
      service: "map-filter-rail",
      routes: [
        {
          eventType: "click",
          selector: "[data-map-filter]",
          action: "select-filter",
          handler: ({ target }) => rail.select(target.dataset.mapFilter),
        },
        {
          eventType: "click",
          selector: "[data-map-filter-clear]",
          action: "clear-filter",
          handler: () => rail.clear(),
        },
        {
          eventType: "click",
          selector: "[data-map-progress-start]",
          action: "start-progress-selection",
          handler: ({ event }) => {
            event.preventDefault();
            event.stopPropagation();
            const map =
              document.querySelector("map-scene[data-dashboard-operational-map]") ||
              document.querySelector("map-scene:not([compact])");
            map?.setMapSelectionMode("progress");
            appStore.set({
              mapFilterWidget: "progress",
              lastAction: "Ativou seleção de áreas para leitura de progresso",
            });
          },
        },
        {
          eventType: "click",
          selector: "[data-map-progress-clear]",
          action: "clear-progress-selection",
          handler: ({ event }) => {
            event.preventDefault();
            event.stopPropagation();
            const map =
              document.querySelector("map-scene[data-dashboard-operational-map]") ||
              document.querySelector("map-scene:not([compact])");
            map?.clearProgressAreaSelectionV1(true);
          },
        },
        {
          eventType: "click",
          selector: "[data-map-progress-entry]",
          action: "open-progress-entry",
          handler: ({ event }) => {
            event.preventDefault();
            event.stopPropagation();
            const map =
              document.querySelector("map-scene[data-dashboard-operational-map]") ||
              document.querySelector("map-scene:not([compact])");
            const parts = map?.progressSelectionParts?.length
              ? map.progressSelectionParts
              : map?.progressAreaPartsFromStoreV1?.();
            if (parts?.length) map.renderProgressSelectionPanel(parts);
            else map?.setMapSelectionMode("progress");
          },
        },
        {
          eventType: "click",
          selector: "[data-map-widget-close]",
          action: "close-summary",
          handler: ({ event, target }) => {
            event.stopPropagation();
            const key = target.closest("[data-map-summary-widget]")?.dataset
                .mapSummaryKey,
              state = appStore.get(),
              filter =
                dashboardFilterForModeV1(key, state.dashboardMode) ||
                dashboardFilters[0];
            appStore.set({
              mapFilters: [],
              mapFilter: null,
              mapFilterWidget: null,
              lastAction: `Fechou resumo de ${filter[1] || "camada"}`,
            });
            document
              .querySelectorAll("map-filter-rail")
              .forEach((item) => item.render());
          },
        },
        {
          eventType: "click",
          selector: "[data-map-widget-context]",
          action: "open-summary-context",
          handler: ({ event, target }) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const summary = target.closest("[data-map-summary-widget]"),
              key = summary?.dataset.mapSummaryKey,
              state = appStore.get(),
              filter =
                dashboardFilterForModeV1(key, state.dashboardMode) ||
                dashboardFilters[0],
              nextView = target.dataset.mapWidgetContext || "map";
            if (key === "progress") {
              const map =
                document.querySelector(
                  "map-scene[data-dashboard-operational-map]",
                ) || document.querySelector("map-scene:not([compact])");
              map?.setMapSelectionMode("progress");
            }
            appStore.set({
              view: nextView,
              mapFilterWidget: key,
              lastAction: `Abriu contexto de ${filter[1]} no mapa`,
            });
          },
        },
      ],
    });

  return class MapFilterRail extends HTMLElement {
    connectedCallback() {
      this._eventServiceAdmin?.dispose();
      this._eventServiceAdmin = createMapFilterRailEventAdmin(this, this);
      this._mapProgressSelectionSignature = "";
      this._mapProgressSelectionUnsubscribe = appStore.subscribe((state) => {
        const signature = JSON.stringify(state.mapProgressSelection || []);
        if (signature !== this._mapProgressSelectionSignature) this.render();
      });
      this.render();
    }
    disconnectedCallback() {
      this._mapProgressSelectionUnsubscribe?.();
      this._mapProgressSelectionUnsubscribe = null;
      this._eventServiceAdmin?.dispose();
      this._eventServiceAdmin = null;
    }
    render() {
      const state = appStore.get(),
        mode = dashboardModeKeyV1(state.dashboardMode),
        filters = dashboardFiltersForModeV1(mode),
        selectedKey = mapFilterSelectionKeyV1(state),
        active = selectedKey ? [selectedKey] : [],
        widgetKey = filters.some((item) => item[0] === state.mapFilterWidget)
          ? state.mapFilterWidget
          : null,
        modeMeta = dashboardModes[mode];
      syncDashboardMapWidgetSmokeV1(Boolean(widgetKey));
      const socialContactBar =
        mode === "social"
          ? `<div class="dashboard-social-contact-bar" aria-label="Highlights por contato da conversa"><span>DESTAQUE DA CONVERSA</span><div>${mapFilterCatalogData.socialContacts
              .map(
                ([key, label]) =>
                  `<button type="button" data-map-filter="${key}" class="${active.includes(key) ? "active" : ""}" aria-pressed="${active.includes(key)}">${esc(label)}</button>`,
              )
              .join("")}</div></div>`
          : "";
      this._mapProgressSelectionSignature = JSON.stringify(
        state.mapProgressSelection || [],
      );
      this.dataset.dashboardMode = mode;
      this.innerHTML = `${widgetKey ? mapFilterSummaryMarkupV1(widgetKey, state) : ""}<div class="map-filter-rail-head"><span>${esc(modeMeta.label.toUpperCase())} · WIDGETS DO MAPA</span><small>${esc(modeMeta.description)} · selecione um item para abrir seu resumo e destacar os lotes correspondentes</small><button type="button" class="map-filter-clear" data-map-filter-clear ${active.length ? "" : "disabled"}>Limpar</button></div><div class="map-filter-rail-items">${filters.map(([key, label, icon]) => `<button type="button" class="map-filter-chip ${active.includes(key) ? "active" : ""}" data-map-filter="${key}" aria-pressed="${active.includes(key)}" aria-expanded="${widgetKey === key}">${ico(icon)}<span>${label}</span></button>`).join("")}</div>${socialContactBar}<div class="map-filter-rail-status" aria-live="polite">${selectedKey ? `Exibição ativa · ${esc(filters.find((item) => item[0] === selectedKey)?.[1] || selectedKey)}` : "Nenhum widget selecionado"}${widgetKey ? ` · resumo de ${esc(filters.find((item) => item[0] === widgetKey)?.[1] || widgetKey)}` : ""}</div>`;
      this.querySelectorAll(
        "[data-map-progress-start],[data-map-progress-clear],[data-map-progress-entry]",
      ).forEach((button) => {
        button.dataset.mapProgressActionBound = "true";
      });
      window.lucide?.createIcons();
    }
    select(key) {
      const state = appStore.get(),
        filter = dashboardFilterForModeV1(key, state.dashboardMode);
      if (!filter) return;
      appStore.set({
        mapFilters: [key],
        mapFilter: key,
        mapFilterWidget: key,
        lastAction: `Exibiu resumo de ${filter[1]}`,
      });
      const map =
        document.querySelector('map-scene[data-persistent-map="true"]') ||
        document.querySelector("map-scene[data-dashboard-operational-map]");
      map?.applyDashboardModeHighlightV1?.(key);
      document
        .querySelectorAll("map-filter-rail")
        .forEach((rail) => rail.render());
    }
    clear() {
      appStore.set({
        mapFilters: [],
        mapFilter: null,
        mapFilterWidget: null,
        lastAction: "Limpou o resumo selecionado",
      });
      const map =
        document.querySelector('map-scene[data-persistent-map="true"]') ||
        document.querySelector("map-scene[data-dashboard-operational-map]");
      map?.clearDashboardModeHighlightV1?.();
      document
        .querySelectorAll("map-filter-rail")
        .forEach((rail) => rail.render());
    }
  };
};
