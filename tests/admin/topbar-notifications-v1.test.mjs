import test from "node:test";
import assert from "node:assert/strict";
import {
  countUnreadTopbarNotificationsV1,
  readTopbarNotificationIdsV1,
  renderTopbarNotificationPanelV1,
  writeTopbarNotificationIdsV1,
} from "../../components/shared/topbar-notifications-v1.mjs";

const storageHarness = (initial = "[]") => {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
    value: () => value,
  };
};

test("topbar notifications render from current operational events and report unread counts", () => {
  const storage = storageHarness(),
    state = { operationalNotifications: [
      { id: "n1", title: "Material recebido", message: "Nota vinculada", severity: "info" },
      { id: "n2", title: "Etapa atrasada", severity: "warning" },
    ] },
    markup = renderTopbarNotificationPanelV1(state, { storage, esc: (value) => String(value) });

  assert.match(markup, /Material recebido/);
  assert.match(markup, /Etapa atrasada/);
  assert.equal(countUnreadTopbarNotificationsV1(state, storage), 2);
  writeTopbarNotificationIdsV1(["n1"], storage);
  assert.deepEqual([...readTopbarNotificationIdsV1(storage)], ["n1"]);
  assert.equal(countUnreadTopbarNotificationsV1(state, storage), 1);
  assert.match(renderTopbarNotificationPanelV1(state, { storage }), /topbar-notification-item read/);
});

test("topbar notification helpers tolerate corrupt persisted read state without hiding notifications", () => {
  const storage = storageHarness("not-json"),
    state = { operationalNotifications: [{ id: "n1", title: "Aviso" }] };
  assert.equal(countUnreadTopbarNotificationsV1(state, storage), 1);
  assert.match(renderTopbarNotificationPanelV1({}, { storage }), /Nenhuma notificação operacional/);
});
