import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const components = readFileSync(new URL("../../components.js", import.meta.url), "utf8"),
  chrome = readFileSync(
    new URL("../../components/planning/stage-context-chrome-v1.mjs", import.meta.url),
    "utf8",
  ),
  agenda = readFileSync(
    new URL("../../components/planning/agenda-calendar-v8.mjs", import.meta.url),
    "utf8",
  ),
  navigation = readFileSync(new URL("../../components/shared/sidebar-navigation-v1.mjs", import.meta.url), "utf8"),
  navigationRender = readFileSync(new URL("../../components/shared/sidebar-navigation-render-v1.mjs", import.meta.url), "utf8"),
  mobileStyles = readFileSync(new URL("../../mobile-operational-v1.css", import.meta.url), "utf8");

test("mobile agenda navigation is available without duplicating the foreman entry", () => {
  assert.match(navigationRender, /mobile-agenda-nav-item/);
  assert.match(navigationRender, /mobileAgendaItem =\s*!foremanSurface/s);
  assert.match(navigation, /navigationItemsForActor\(actor,/);
  assert.match(mobileStyles, /\.mobile-agenda-nav-item\s*\{\s*display:\s*flex/s);
  assert.match(mobileStyles, /app-sidebar\.mobile-open/);
  assert.match(mobileStyles, /padding-bottom:\s*calc\(18px \+ env\(safe-area-inset-bottom\)\)/);
});

test("stage selection becomes a mobile select while retaining desktop timeline actions", () => {
  assert.match(chrome, /data-persistent-stage-select/);
  assert.match(chrome, /data-persistent-stage-edit="\$\{esc\(selectedStageKey\)\}"/);
  assert.match(chrome, /closest\?\.\("\[data-persistent-stage-select\]"\)/);
  assert.match(chrome, /selectedStageV9:\s*stage\.key/);
  assert.match(mobileStyles, /\.stage-persistent-timeline-track\s*\{\s*display:\s*none !important/s);
  assert.match(mobileStyles, /\.stage-persistent-mobile-picker\s*\{\s*display:\s*grid/s);
});

test("mobile agenda renders persisted week events as an editable vertical day list", () => {
  assert.match(agenda, /agenda-mobile-day-v8/);
  assert.match(agenda, /data-agenda-mobile-edit=/);
  assert.match(agenda, /querySelectorAll\("\[data-agenda-mobile-edit\]"\)/);
  assert.match(agenda, /if \(event\) showEditor\(event\)/);
  assert.match(agenda, /\.agenda-week-mobile-list\{display:none\}/);
  assert.match(agenda, /\.agenda-week-canvas-v8\{display:none\}/);
  assert.match(agenda, /\.agenda-week-mobile-list\{display:grid;gap:8px\}/);
  const agendaState = agenda.slice(
    agenda.indexOf("const agendaCalendarStateV3 ="),
    agenda.indexOf("const agendaCalendarInitialMonthV3 ="),
  );
  assert.match(agendaState, /return stored;/);
  assert.doesNotMatch(agendaState, /agendaCalendarDemoEventsV3\(stage\)/);
  assert.match(agenda, /apiFetch\("\/api\/agenda-events"/);
  assert.match(agenda, /readData = \(\) => \{[\s\S]*return stored;/);
});
