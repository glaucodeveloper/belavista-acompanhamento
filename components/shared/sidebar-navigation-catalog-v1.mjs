/** Stable menu vocabulary; role policy filters these entries before rendering. */
export const SIDEBAR_MODE_LABELS_V1 = Object.freeze({
  tracking: "Execução e acompanhamento",
  commercial: "Leads e lotes",
  social: "Comunicação e relacionamentos",
});

export const SIDEBAR_MODE_ITEMS_V1 = Object.freeze({
  tracking: [
    ["map", "house", "Mapa"], ["lot-development", "land-plot", "Loteamento"],
    ["control", "table-properties", "Dashboard"], ["stages", "workflow", "Etapas"],
    ["records", "clipboard-pen-line", "Registros"], ["materials", "package", "Materiais"],
    ["brokers-board", "map-pinned", "Lotes"], ["repasses", "wallet", "Repasses"],
    ["brokers", "users-round", "Corretores"], ["sales-history", "history", "Histórico de movimentações"],
    ["finance", "wallet-cards", "Financeiro"], ["settings", "settings", "Configurações"],
  ],
  commercial: [
    ["map", "house", "Mapa"], ["lot-development", "land-plot", "Loteamento"],
    ["stages", "workflow", "Etapas"], ["materials", "package", "Materiais"],
    ["brokers-board", "map-pinned", "Lotes"], ["repasses", "wallet", "Repasses"],
    ["brokers", "users-round", "Corretores"], ["sales-history", "history", "Histórico de movimentações"],
    ["control", "table-properties", "Dashboard"], ["records", "clipboard-pen-line", "Registros"],
    ["finance", "wallet-cards", "Financeiro"], ["settings", "settings", "Configurações"],
  ],
  social: [
    ["map", "house", "Mapa"], ["lot-development", "land-plot", "Loteamento"],
    ["stages", "workflow", "Etapas"], ["messages", "messages-square", "Mensagens", "messages"],
    ["control", "table-properties", "Dashboard"], ["records", "clipboard-pen-line", "Registros"],
    ["brokers-board", "map-pinned", "Lotes"], ["brokers", "users-round", "Corretores"],
    ["sales-history", "history", "Histórico de movimentações"], ["settings", "settings", "Configurações"],
  ],
});

export const SIDEBAR_REPORT_ICONS_V1 = Object.freeze({
  Financeiro: "wallet-cards", Construção: "hard-hat", Suprimentos: "package-check",
  Comercial: "filter", Governança: "shield-check",
});

export const SIDEBAR_STAGE_EXTENSION_ITEMS_V1 = Object.freeze([
  ["agenda", "calendar-days", "Agenda"],
  ["activities", "list-checks", "Atividades"],
]);
