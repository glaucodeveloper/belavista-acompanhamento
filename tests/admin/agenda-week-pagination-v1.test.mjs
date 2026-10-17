import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("agenda pagination state participates in the view render key", async () => {
  const source = await readFile(new URL("../../components/shared/view-layer-v1.mjs", import.meta.url), "utf8");
  const agendaRenderKey = source.match(/state\.view === "agenda" \? `([^`]+)` : ""/)?.[1] || "";

  assert.match(agendaRenderKey, /state\.agendaCalendarWeekV8/);
});

test("agenda timeline presentation switches through its delegated page controls", async () => {
  const [calendar, timeline] = await Promise.all([
    readFile(new URL("../../components/planning/agenda-calendar-v8.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/agenda-atlas-timeline-v1.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(calendar, /if\(button\.matches\('\[data-agenda-presentation\]'\)\)/);
  assert.match(calendar, /agendaCalendarPresentationV1:presentation/);
  assert.match(timeline, /data-agenda-presentation="timeline"/);
  assert.match(timeline, /presentation === "timeline" \? " hidden" : ""/);
});
