import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installAgendaCalendarPageV8 } from "../../components/planning/agenda-calendar-v8.mjs";

test("agenda page installer injects browser/application services and exposes shared calendar API", () => {
  class ViewLayer {}
  ViewLayer.prototype.bind = function () { return "previous bind"; };
  const host = {
    localStorage: null,
    document: {},
    window: {},
    FormData: class FormData {},
    Element: class Element {},
    CSS: { escape: (value) => String(value) },
    requestAnimationFrame: () => 0,
  };
  const services = installAgendaCalendarPageV8(ViewLayer, {
    STAGE_WORKBENCH: [],
    appStore: { get: () => ({}) },
    beginCardCanvasLinkV1() {},
    demoData: { activities: [] },
    esc: (value) => String(value ?? ""),
    executionModel: { stages: [] },
    extensionStage: () => null,
    host,
    ico: () => "",
    normalizeActivityRouteTextV1: (value) => String(value ?? "").toLowerCase(),
    notify() {},
    stagePersistentTimelineMarkupV1: () => "timeline",
    stageV9LiveFor: () => ({}),
    workbenchStageFromValueV1: () => null,
  });

  assert.equal(typeof ViewLayer.prototype.agenda, "function");
  assert.equal(ViewLayer.prototype.bind.call({ querySelector: () => null }), "previous bind");
  assert.equal(services.agendaCalendarIsoV3(new Date(2026, 9, 12)), "2026-10-12");
  assert.equal(services.agendaCalendarParseDateV3("2026-10-12").getDate(), 12);
  assert.equal(services.agendaCalendarTimeToHoursV3("09:30"), 9.5);
  assert.equal(services.agendaCalendarHoursToTimeV3(9.5), "09:30");
  assert.equal(services.agendaCalendarStatusToneV3("Em andamento"), "active");
  assert.equal(Object.isFrozen(services), true);
});

test("agenda event binding snapshots current app state before resolving week and selected event", async () => {
  const source = await readFile(new URL("../../components/planning/agenda-calendar-v8.mjs", import.meta.url), "utf8");
  assert.match(source, /const state = appStore\.get\(\);[\s\S]{0,180}const agendaCalendarRootV5/);
  assert.match(source, /agendaCalendarInitialWeekV8\(state, readData\(\)\)/);
  assert.match(source, /if \(state\.selectedAgendaEventV3\)/);
});
