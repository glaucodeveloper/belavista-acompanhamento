import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("agenda status groups use readable labels without changing stored status values", async () => {
  const source = await readFile(new URL("../../components/planning/agenda-atlas-timeline-v1.mjs", import.meta.url), "utf8");

  assert.match(source, /pendente:\s*"Pendentes de execução"/);
  assert.match(source, /planejado:\s*"Planejados"/);
  assert.match(source, /"aguardando material":\s*"Aguardando materiais"/);
  assert.match(source, /bloqueado:\s*"Bloqueados"/);
  assert.match(source, /concluido:\s*"Concluídos"/);
  assert.match(source, /<h3>\$\{esc\(agendaStatusTitle\(status\)\)\}<\/h3>/);
  assert.match(source, /agendaStatusTitles\[normalizeAgendaStatus\(status\)\]\s*\|\|\s*String\(status/);
});
