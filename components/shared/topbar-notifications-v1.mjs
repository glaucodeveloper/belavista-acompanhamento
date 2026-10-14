/** Notification-panel presentation and read-state helpers for the shared topbar. */
export const TOPBAR_NOTIFICATION_READ_KEY_V1 = "belavista.notifications.read.v1";

export const readTopbarNotificationIdsV1 = (storage = globalThis.localStorage) => {
  try {
    const value = JSON.parse(storage?.getItem(TOPBAR_NOTIFICATION_READ_KEY_V1) || "[]");
    return new Set(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set();
  }
};

export const writeTopbarNotificationIdsV1 = (ids, storage = globalThis.localStorage) =>
  storage?.setItem(TOPBAR_NOTIFICATION_READ_KEY_V1, JSON.stringify([...new Set(Array.from(ids || [], String))]));

export const renderTopbarNotificationPanelV1 = (state = {}, { esc = (value) => String(value ?? ""), storage = globalThis.localStorage } = {}) => {
  const items = Array.isArray(state.operationalNotifications)
      ? state.operationalNotifications.slice(0, 12)
      : [],
    read = readTopbarNotificationIdsV1(storage);
  const rows = items.length
    ? items.map((item) => {
        const id = String(item.id || item.notificationId || item.updatedAt || item.title || Math.random()),
          tone = String(item.severity || "info").toLowerCase().replace(/[^a-z]/g, "");
        return `<button type="button" class="topbar-notification-item ${read.has(id) ? "read" : "unread"}" data-notification-item="${esc(id)}"><i class="${tone}"></i><span><b>${esc(item.title || "Atualização operacional")}</b><small>${esc(item.message || "")}</small><em>${esc(item.createdAt || item.updatedAt || "agora")}</em></span></button>`;
      }).join("")
    : '<p class="topbar-notification-empty">Nenhuma notificação operacional recebida.</p>';
  return `<aside class="topbar-notification-panel" data-topbar-notification-panel hidden><header><div><span class="activity-kind">CENTRAL DE AVISOS</span><h2>Notificações</h2></div><button type="button" data-notification-close aria-label="Fechar notificações">×</button></header><div class="topbar-notification-list">${rows}</div><footer><small>${items.length} evento(s) carregado(s) do canal operacional.</small><button type="button" data-notification-mark-all>Marcar como lidas</button></footer></aside>`;
};

export const countUnreadTopbarNotificationsV1 = (state = {}, storage = globalThis.localStorage) => {
  const items = Array.isArray(state.operationalNotifications) ? state.operationalNotifications : [],
    read = readTopbarNotificationIdsV1(storage);
  return items.filter((item) => !read.has(String(item.id || item.notificationId || item.updatedAt || item.title))).length;
};
