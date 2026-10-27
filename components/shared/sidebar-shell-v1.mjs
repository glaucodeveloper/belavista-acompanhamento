import { renderSidebarShell as renderSidebarShellTsV1 } from "../../dist/frontend/components.js";

/** Renders the stable sidebar shell around role-aware navigation markup. */
const renderSidebarShellLegacyV1 = ({
  actor = {},
  adminMenuOpen = false,
  navigationMarkup = {},
  esc = (value) => String(value ?? ""),
  ico = () => "",
} = {}) => {
  const name = actor.name || "Warley";
  return `<aside class="sidebar" id="sidebar"><div class="logo"><div class="logo-mark">${ico("layers")}</div><div><div class="logo-name">atlas<span>.</span></div><div class="logo-sub">GESTÃO DE OBRAS &amp; VENDAS</div></div></div><nav aria-label="Navegação principal">${navigationMarkup.mobileAgendaItem || ""}${navigationMarkup.markup || ""}</nav><a class="field-portal-link site-manual-link" href="./assets/docs/manual-usuario-planejamento-inteligente.html" target="_blank" rel="noopener">${ico("book-open-check")}<span>Manual de operação</span>${ico("external-link")}</a><div class="sidebar-foot"><button class="profile profile-trigger" id="adminTrigger"><span class="avatar">${esc(name[0] || "W")}</span><div><strong>${esc(name)}</strong><small>${esc(actor.label || "Dono")}</small></div>${ico("chevron-up")}</button><div class="admin-menu ${adminMenuOpen ? "open" : ""}"><button>Preferências</button><button>Auditoria da sessão</button><button>Encerrar sessão</button></div><div class="integration"><span></span>Integração ativa</div></div></aside>`;
};

export const renderSidebarShellV1 = (input = {}) => renderSidebarShellTsV1
  ? renderSidebarShellTsV1(input)
  : renderSidebarShellLegacyV1(input);
