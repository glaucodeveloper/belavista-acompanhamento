import test from "node:test";
import assert from "node:assert/strict";
import { AgendaAtlasTimelineV1 } from "../../components/planning/agenda-atlas-timeline-v1.mjs";

const events = [
  { id: "A-1", title: "Registrar concretagem", date: "2026-10-15", start: "10:00", status: "Em andamento", stageName: "Terraplenagem" },
  { id: "A-2", title: "Conferir material", date: "2026-10-14", start: "08:00", status: "Pendente", stageName: "Drenagem" },
  { id: "A-3", title: "Inspecionar rede", date: "2026-10-16", start: "09:00", status: "Concluído", stageName: "Rede de Água" },
];
const render = (presentation = "status") => AgendaAtlasTimelineV1({ props: {
  days: [], events, presentation, esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;"),
} }).next().value;

test("agenda organiza apenas os compromissos existentes em grupos com seus estados reais", () => {
  const html = render();
  assert.ok(html.includes('data-agenda-presentation="status" aria-pressed="true"'));
  assert.ok(html.indexOf("Pendente") < html.indexOf("Em andamento"));
  assert.ok(html.indexOf("Em andamento") < html.indexOf("Concluído"));
  for (const id of ["A-1", "A-2", "A-3"]) assert.equal((html.match(new RegExp(`data-agenda-mobile-edit="${id}"`, "g")) || []).length, 2);
  assert.ok(html.includes('data-agenda-presentation="timeline" aria-pressed="false"'));
});

test("agenda preserves the chronological view as an alternate layout", () => {
  const html = render("timeline");
  assert.ok(html.includes('data-agenda-presentation="timeline" aria-pressed="true"'));
  assert.ok(html.includes('class="agenda-atlas-status-groups" hidden'));
  assert.ok(html.includes('class="agenda-atlas-events" data-atlas-timeline-events'));
});
