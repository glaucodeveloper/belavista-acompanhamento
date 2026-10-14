import assert from "node:assert/strict";
import test from "node:test";
import { createProgressPageV1 } from "../../components/planning/progress-page-v1.mjs";

test("progress page keeps its route, record binding, and event hooks", () => {
  const render = createProgressPageV1({
    appStore: {
      get: () => ({
        records: [
          {
            hora: "07:15",
            detalhes: "Medição registrada",
            atividade: "Terraplenagem",
            responsavel: "Equipe de campo",
            status: "Em andamento",
            evidenceUri: "/evidence/medicao.jpg",
          },
        ],
      }),
    },
    demoData: {
      activities: [
        { id: "earth", name: "Terraplenagem" },
        { id: "water", name: "Rede de água" },
      ],
      collaborators: [["Equipe de campo"]],
    },
    extensionStage: () => ({
      id: "earth",
      name: "Terraplenagem",
      progress: 34,
      owner: "Equipe de campo",
    }),
    esc: (value) => String(value ?? ""),
    ico: (name) => `[${name}]`,
    DateCtor: class extends Date {
      constructor() {
        super("2026-10-12T10:30:00.000Z");
      }
    },
  });

  const html = render();

  assert.match(html, /class="stage-extension-page progress-page"/);
  assert.match(html, /DIÁRIO DE OBRAS · Terraplenagem/);
  assert.match(html, /Medição registrada/);
  assert.match(html, /data-progress-new/);
  assert.match(html, /data-progress-period="today"/);
  assert.match(html, /data-progress-stage/);
  assert.match(html, /data-progress-form/);
  assert.match(html, /name="responsavel"/);
  assert.match(html, /data-progress-send/);
  assert.match(html, /width:34%/);
});
