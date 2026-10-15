import {
  SIDEBAR_REPORT_ICONS_V1,
  SIDEBAR_STAGE_EXTENSION_ITEMS_V1,
} from "./sidebar-navigation-catalog-v1.mjs?v=sidebar-navigation-catalog-v1";

/** Renders role-aware primary, stage-extension, report, and mobile navigation items. */
export const renderSidebarNavigationV1 = ({
  items = [],
  state = {},
  view = state.view,
  foremanSurface = false,
  FOREMAN_EXTENSION_VIEWS = [],
  reportFamilies = [],
  ico = () => "",
  esc = (value) => String(value ?? ""),
} = {}) => {
  const extensionViews = [
      "agenda", "activities", "progress",
      ...(state.localSqlState?.clean === true ? ["activity-installation"] : []),
    ],
    renderItem = ([id, icon, label, action]) => {
        const active = id === "stages"
            ? view === "stages" || extensionViews.includes(view)
            : view === id,
          button = action === "messages"
            ? `<button class="nav-item ${active ? "active" : ""}" data-sidebar-action="messages">${ico(icon)}<span>${label}</span><i class="sidebar-mode-live">●</i></button>`
            : `<button class="nav-item ${active ? "active" : ""}" data-view="${id}">${ico(icon)}<span>${label}</span></button>`;

        if (id === "stages") {
          const sub = [
              ...(state.localSqlState?.clean === true ? [["activity-installation", "wand-sparkles", "Instalação"]] : []),
              ...SIDEBAR_STAGE_EXTENSION_ITEMS_V1,
            ],
            hasStageContext = Boolean(state.stageSelected || state.activityDedicated || state.stageActivityDedicatedV9),
            visibleSub = foremanSurface
              ? sub.filter(([subId]) => FOREMAN_EXTENSION_VIEWS.includes(subId))
              : sub;
          return `<div class="nav-group">${button}${hasStageContext && visibleSub.length ? `<div class="nav-subitems" aria-label="Extensões da etapa selecionada">${visibleSub.map(([subId, subIcon, subLabel]) => `<button class="nav-subitem ${subId === "agenda" ? "stage-agenda-nav-subitem" : ""} ${view === subId ? "active" : ""}" data-view="${subId}">${ico(subIcon)}<span>${subLabel}</span></button>`).join("")}</div>` : ""}</div>`;
        }
        if (id === "reports")
          return `<div class="nav-group">${button}<div class="nav-subitems report-subitems" aria-label="Subitens de relatórios">${reportFamilies.map((family) => `<button class="nav-subitem ${view === "reports" && state.reportFamily === family ? "active" : ""}" data-view="reports" data-report-family="${esc(family)}">${ico(SIDEBAR_REPORT_ICONS_V1[family] || "file-chart-column")}<span>${esc(family)}</span></button>`).join("")}</div></div>`;
        return button;
      },
    visibleItems = items.filter(([id]) => id !== "finance" && (id !== "records" || foremanSurface)),
    operationsIds = new Set(["records", "materials", "messages"]),
    groups = [
      ["WORKSPACE", visibleItems.filter(([id]) => !operationsIds.has(id))],
      ["OPERAÇÕES", visibleItems.filter(([id]) => operationsIds.has(id))],
    ],
    markup = groups.map(([label, groupItems]) => {
      if (!groupItems.length) return "";
      return `<section class="navblock" aria-label="${label.toLowerCase()}"><div class="smallcaps nav-label">${label}</div>${groupItems.map(renderItem).join("")}</section>`;
    }).join(""),
    mobileAgendaItem = "";

  return Object.freeze({ markup, mobileAgendaItem });
};
