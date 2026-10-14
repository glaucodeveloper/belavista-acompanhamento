import test from "node:test";
import assert from "node:assert/strict";
import { renderSidebarShellV1 } from "../../components/shared/sidebar-shell-v1.mjs";

test("sidebar shell renders role-aware navigation without altering its routes", () => {
  const html = renderSidebarShellV1({
    actor: { name: "Ana <Admin>", label: "Admin" },
    adminMenuOpen: true,
    navigationMarkup: {
      modeLabel: "Execução e acompanhamento",
      mobileAgendaItem: '<button data-view="agenda">Agenda</button>',
      markup: '<button data-view="actions">Ações IA</button>',
    },
    esc: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
  });

  assert.match(html, /^<aside class="sidebar" id="sidebar">/);
  assert.match(html, /<nav aria-label="Navegação principal">/);
  assert.match(html, /class="logo-name">atlas<span>\.<\/span>/);
  assert.match(html, /<button data-view="agenda">Agenda<\/button>/);
  assert.match(html, /<button data-view="actions">Ações IA<\/button>/);
  assert.match(html, /class="admin-menu open"/);
  assert.match(html, /Ana &lt;Admin&gt;/);
  assert.doesNotMatch(html, /mobile-menu-trigger|data-icon="menu"/);
});
