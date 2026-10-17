/** Notification inbox presentation and persisted-state selectors for the shared topbar. */
export const topbarNotificationIdV1 = (item = {}) =>
  String(item.id || item.notificationId || "");

export const topbarNotificationIsReadV1 = (item = {}) =>
  Boolean(
    item.readAt ||
      item.read_at ||
      item.acknowledgedAt ||
      item.acknowledged_at ||
      ["read", "acknowledged"].includes(String(item.status || "").toLowerCase()),
  );

export const renderTopbarNotificationPanelV1 = (
  state = {},
  { esc = (value) => String(value ?? "") } = {},
) => {
  const allItems = Array.isArray(state.operationalNotifications)
      ? state.operationalNotifications.filter((item) => topbarNotificationIdV1(item))
      : [],
    items = allItems.slice(0, 12),
    unreadCount = allItems.filter((item) => !topbarNotificationIsReadV1(item)).length;
  const rows = items.length
    ? items
        .map((item) => {
          const id = topbarNotificationIdV1(item),
            tone = String(item.severity || "info").toLowerCase().replace(/[^a-z]/g, ""),
            read = topbarNotificationIsReadV1(item);
          return `<button type="button" class="topbar-notification-item ${read ? "read" : "unread"}" data-notification-item="${esc(id)}" aria-pressed="${read}"><i class="${esc(tone)}"></i><span><b>${esc(item.title || "Atualização operacional")}</b><small>${esc(item.message || "")}</small><em>${esc(item.createdAt || item.created_at || item.updatedAt || "agora")}</em>${item.actionUrl || item.action_url ? `<strong>${esc(item.actionLabel || "Abrir contexto")}</strong>` : ""}</span></button>`;
        })
        .join("")
    : '<p class="topbar-notification-empty">Nenhuma notificação operacional recebida.</p>';
  return `<aside class="topbar-notification-panel" data-topbar-notification-panel hidden><header><div><span class="activity-kind">CENTRAL DE AVISOS</span><h2>Notificações</h2></div><button type="button" data-notification-close aria-label="Fechar notificações">×</button></header><div class="topbar-notification-list">${rows}</div><footer><small>${unreadCount} não lida(s) · exibindo ${items.length} de ${allItems.length}</small><button type="button" data-notification-mark-all ${unreadCount ? "" : "disabled"}>Marcar como lidas</button></footer></aside>`;
};

export const countUnreadTopbarNotificationsV1 = (state = {}) =>
  (Array.isArray(state.operationalNotifications) ? state.operationalNotifications : [])
    .filter((item) => !topbarNotificationIsReadV1(item))
    .length;
