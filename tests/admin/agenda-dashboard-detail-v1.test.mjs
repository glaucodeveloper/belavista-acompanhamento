import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installAgendaDashboardDetailV1 } from "../../components/planning/agenda-dashboard-detail-v1.mjs";

const setup = () => {
  const agenda = {
      initialized: true,
      version: 3,
      events: [{
        id: "agenda-1", title: "Conferir drenagem", activityName: "Inspecionar tubulação",
        stageKey: "drain", stageName: "Drenagem Pluvial", date: "2026-10-12", start: "08:30",
        owner: "Equipe de campo", status: "Planejado", requirements: ["Verificar caimento"], materials: ["Tubos"],
      }],
    };
  let state = {
    view: "control", agendaFocusedEventId: "agenda-1", dashboardAgendaSelectedDateV1: "2026-10-12",
    agendaMobileNotifications: [], agendaMobileNotificationsEnabled: false, records: [],
  };
  const writes = [], notices = [], listeners = new Map(),
    appStore = {
      get: () => state,
      set(patch) { writes.push(patch); state = { ...state, ...patch }; },
    },
    listen = (key, fields = {}) => ({
      dataset: {},
      addEventListener(type, handler) { listeners.set(`${key}:${type}`, handler); },
      ...fields,
    }),
    quickRecordForm = listen("quick-record", { entries: [["stageKey", "drain"], ["activity", "Conferir drenagem"], ["date", "2026-10-12"], ["responsible", "Equipe de campo"], ["detail", "Medição concluída"]] }),
    agendaForm = listen("agenda-form", { entries: [["title", "Conferir drenagem atualizada"], ["activityName", "Inspecionar tubo"], ["stageKey", "drain"], ["date", "2026-10-14"], ["start", "09:00"], ["owner", "Equipe técnica"], ["status", "Em andamento"], ["customStatus", "Aguardando vistoria"], ["requirements", "Acesso liberado\nEPIs conferidos"], ["materials", "Tubos\nConexões"]] }),
    cancelForm = listen("cancel-form", { entries: [["reason", "Interdição para inspeção"], ["confirmed", "on"]] }),
    detailNodes = new Map([
      ["[data-agenda-detail-back]", listen("back")],
      ["[data-activity-quick-record]", quickRecordForm],
      ["[data-agenda-detail-form]", agendaForm],
      ["[data-agenda-mark-done]", listen("done")],
      ["[data-agenda-cancel-form]", cancelForm],
    ]),
    detail = {
      dataset: { agendaEventId: "agenda-1" },
      querySelector: (selector) => detailNodes.get(selector) || null,
    },
    ViewLayer = class {
      control() { return "<header>Controle</header>"; }
      bind() {}
    };
  const dependencies = {
    appStore,
    agendaCalendarReadV3: () => agenda,
    agendaCalendarOperationalEventsV3: () => [],
    agendaCalendarIsoV3: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    agendaCalendarWriteV3(value) { agenda.events = value.events; agenda.initialized = value.initialized; writes.push({ agenda: value }); },
    agendaCalendarParseDateV3: (value) => new Date(`${value}T00:00:00`),
    agendaCalendarStatusToneV3: (status) => String(status).toLowerCase().replaceAll(" ", "-"),
    agendaCalendarAddDaysV3: (value, days) => {
      const date = new Date(`${value}T00:00:00`);
      date.setDate(date.getDate() + days);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    },
    executionModel: { stages: [{ key: "drain", name: "Drenagem Pluvial" }] },
    stageV9LiveFor: () => ({ owner: "Equipe de campo" }),
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
    notify: (...args) => notices.push(args),
    stageRecordStagesV1: () => [{ key: "drain", name: "Drenagem Pluvial" }],
    stageRecordDashboardActionWorkspaceMarkupV1: () => "<aside>Atalhos dos registros</aside>",
    stageMaterialReportDialogV1: () => "<dialog>Relatório</dialog>",
    stageRecordMaterialRowsV1: () => [],
    capacitor: { isNativePlatform: () => false },
    NotificationCtor: null,
    FormDataCtor: class { constructor(form) { return form.entries; } },
    queueMicrotaskFn: (callback) => callback(),
  };
  const api = installAgendaDashboardDetailV1(ViewLayer, dependencies);
  return { ViewLayer, api, appStore, state: () => state, agenda, writes, notices, listeners, detail, listen, quickRecordForm, agendaForm, cancelForm };
};

test("components.js installs the agenda module with calendar, stage, and platform dependencies", async () => {
  const application = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(application, /import \{ installAgendaDashboardDetailV1 \} from "\.\/components\/planning\/agenda-dashboard-detail-v1\.mjs\?/);
  assert.match(application, /installAgendaDashboardDetailV1\(ViewLayer, \{/);
  for (const dependency of ["agendaCalendarReadV3", "agendaCalendarWriteV3", "stageRecordStagesV1", "stageMaterialReportDialogV1", "capacitor: globalThis.Capacitor", "NotificationCtor: globalThis.Notification"])
    assert.ok(application.includes(dependency), `Missing agenda injection: ${dependency}`);
});

test("agenda integration keeps real workspace events, dashboard preview and full detail form", () => {
  const { ViewLayer, api } = setup();
  assert.deepEqual(api.agendaWorkspaceEventsV1({}).events.map((event) => event.id), ["agenda-1"]);
  const dashboard = ViewLayer.prototype.control.call({
    render() {},
  });
  assert.match(dashboard, /data-dashboard-agenda/);
  assert.match(dashboard, /Conferir drenagem/);
  assert.match(dashboard, /Atalhos dos registros/);

  const detail = ViewLayer.prototype["agenda-detail"].call({});
  assert.match(detail, /data-agenda-detail-form/);
  assert.match(detail, /Conferir drenagem/);
  assert.match(detail, /data-agenda-cancel-form/);
  assert.match(detail, /Verificar caimento/);
});

test("agenda bind preserves navigation and marks the persisted agenda event complete", () => {
  const harness = setup(),
    dashboardDay = harness.listen("day"),
    dashboardOpen = harness.listen("open"),
    root = {
      dataset: { view: "control" },
      querySelectorAll(selector) {
        if (selector === "[data-dashboard-agenda-select-day]") return [Object.assign(dashboardDay, { dataset: { dashboardAgendaSelectDay: "2026-10-13" } })];
        if (selector === "[data-dashboard-agenda-open]") return [Object.assign(dashboardOpen, { dataset: { dashboardAgendaOpen: "agenda-1" } })];
        return [];
      },
      querySelector() { return null; },
      render() {},
    };

  harness.ViewLayer.prototype.bind.call(root);
  harness.listeners.get("day:click")();
  assert.equal(harness.state().dashboardAgendaSelectedDateV1, "2026-10-13");
  harness.listeners.get("open:click")();
  assert.equal(harness.state().view, "agenda-detail");
  assert.equal(harness.state().agendaFocusedEventId, "agenda-1");

  const detailRoot = {
    dataset: { view: "agenda-detail" },
    querySelector: (selector) => selector === "[data-agenda-detail]" ? harness.detail : null,
    querySelectorAll: () => [],
    render() {},
  };
  harness.ViewLayer.prototype.bind.call(detailRoot);
  harness.listeners.get("done:click")();
  assert.equal(harness.agenda.events[0].status, "Concluído");
  assert.ok(harness.writes.some((entry) => entry.agenda?.initialized));
  assert.ok(harness.notices.some(([message]) => message.includes("Concluiu")));
});

test("agenda detail saves edits, records activity and persists confirmed cancellation", () => {
  const harness = setup(),
    detailRoot = {
      dataset: { view: "agenda-detail" },
      querySelector: (selector) => selector === "[data-agenda-detail]" ? harness.detail : null,
      querySelectorAll: () => [],
      render() {},
    };
  harness.ViewLayer.prototype.bind.call(detailRoot);

  harness.listeners.get("quick-record:submit")({ preventDefault() {}, currentTarget: harness.quickRecordForm });
  assert.equal(harness.state().records[0].atividade, "Conferir drenagem");
  assert.equal(harness.state().records[0].activityEventId, "agenda-1");

  harness.listeners.get("agenda-form:submit")({ preventDefault() {}, currentTarget: harness.agendaForm });
  assert.equal(harness.agenda.events[0].title, "Conferir drenagem atualizada");
  assert.equal(harness.agenda.events[0].stageName, "Drenagem Pluvial");
  assert.deepEqual(harness.agenda.events[0].requirements, ["Acesso liberado", "EPIs conferidos"]);

  harness.listeners.get("cancel-form:submit")({ preventDefault() {}, currentTarget: harness.cancelForm });
  assert.equal(harness.agenda.events[0].status, "Anulado");
  assert.equal(harness.agenda.events[0].cancellationReason, "Interdição para inspeção");
  assert.equal(harness.agenda.events[0].cancellationConfirmed, true);
});
