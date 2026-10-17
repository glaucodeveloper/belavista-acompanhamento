import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  countUnreadTopbarNotificationsV1,
  renderTopbarNotificationPanelV1,
  topbarNotificationIdV1,
  topbarNotificationIsReadV1,
} from "../../components/shared/topbar-notifications-v1.mjs";

test("notification inbox renders persisted unread state and server action context", () => {
  const state = { operationalNotifications: [
    { id: "n1", title: "Material recebido", message: "Nota vinculada", severity: "info", status: "queued", actionUrl: "/?view=materials", createdAt: "2026-10-16T12:00:00.000Z" },
    { id: "n2", title: "Etapa atrasada", severity: "warning", status: "read", readAt: "2026-10-16T12:01:00.000Z" },
    { id: "n3", title: "Atendida", status: "delivered", acknowledgedAt: "2026-10-16T12:02:00.000Z" },
  ] };
  const markup = renderTopbarNotificationPanelV1(state, { esc: (value) => String(value) });
  assert.equal(countUnreadTopbarNotificationsV1(state), 1);
  assert.equal(topbarNotificationIdV1(state.operationalNotifications[0]), "n1");
  assert.equal(topbarNotificationIsReadV1(state.operationalNotifications[1]), true);
  assert.match(markup, /topbar-notification-item unread/);
  assert.match(markup, /topbar-notification-item read/);
  assert.match(markup, /Material recebido/);
  assert.match(markup, /Abrir contexto/);
  assert.match(markup, /1 não lida\(s\) · exibindo 3 de 3/);
});

test("notification click and refresh use the authenticated persistent API", async () => {
  const [topbar, server, engine, atlasCss] = await Promise.all([
    readFile(new URL("../../components/shared/app-topbar.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../server.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../operational-engine.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../atlas-carbon-integration-v1.css", import.meta.url), "utf8"),
  ]);
  assert.match(topbar, /apiFetchFn\("\/api\/notifications"/);
  assert.match(topbar, /method: "PUT"/);
  assert.match(topbar, /this\.openNotificationAction\(item\)/);
  assert.match(topbar, /setInterval\(\(\) => this\.refreshNotifications\(\), 60_000\)/);
  assert.match(server, /acknowledgeNotification\(decodeURIComponent\(notification\[1\]\),actor/);
  assert.match(server, /Notificação não encontrada para este perfil\./);
  assert.match(engine, /row\.recipientRole!==role/);
  assert.match(engine, /WHERE id=\? AND recipient_role=\?/);
  assert.match(atlasCss, /app-topbar \.topbar-notification-panel\s*\{[^}]*position: absolute !important/s);
  assert.match(atlasCss, /app-topbar \.topbar-notification-panel\s*\{[^}]*z-index: 10000 !important/s);
  assert.match(atlasCss, /app-topbar \.topbar-notification-item small\s*\{[^}]*font-size: 12px !important/s);
});
