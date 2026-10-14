import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createActionsPageV1 } from "../../components/planning/actions-page-v1.mjs";

const action = () => ({
  id: "action-1",
  label: "Liberar drenagem",
  track: "Frente de execução",
  phase: 1,
  impact: 70,
  readiness: 55,
  owner: "Equipe de campo",
  eta: "Hoje",
  blocker: "Aguardando material",
  relation: "Drenagem pluvial",
  referenceDescription: "Concluir a vala e validar caimento",
  materialRequirements: ["Tubo PEAD"],
});

const setup = () => {
  const state = { selectedAiAction: "action-1" }, writes = [], notices = [],
    listeners = new Map(), windowListeners = new Map(), points = [],
    button = (dataset = {}) => ({
      dataset,
      style: {},
      textContent: "Liberar drenagem",
      addEventListener(type, listener) { listeners.set(`${dataset.testId || "button"}:${type}`, listener); },
      setPointerCapture() {},
      releasePointerCapture() {},
    }),
    point = button({ aiAction: "action-1", testId: "point" });
  points.push(point);
  const advance = button({ aiAdvance: "action-1", testId: "advance" }),
    matrix = { getBoundingClientRect: () => ({ left: 0, bottom: 100, width: 100, height: 100 }) },
    window = {
      addEventListener(type, listener) { windowListeners.set(type, listener); },
      removeEventListener(type) { windowListeners.delete(type); },
    },
    appStore = {
      get: () => state,
      set: (patch) => { writes.push(patch); Object.assign(state, patch); },
    },
    dependencies = {
      appStore,
      extensionStage: () => ({ name: "Drenagem", week: "Semana 2" }),
      operationalActions: () => state.aiActions || [action()],
      OPERATIONAL_PHASES: ["Preparar", "Executar", "Validar", "Entregar", "Encerrar"],
      esc: (value) => String(value ?? ""),
      ico: (name) => `[${name}]`,
      notify: (...args) => notices.push(args),
      window,
      Date: class extends Date { toISOString() { return "2026-10-12T12:00:00.000Z"; } },
    },
    page = createActionsPageV1(dependencies),
    host = {
      querySelector: (selector) => ({
        "[data-action-matrix]": matrix,
        "[data-ai-advance]": advance,
      })[selector] || null,
      querySelectorAll: (selector) => ({
        "[data-ai-action]": points,
      })[selector] || [],
    };
  return { state, writes, notices, listeners, windowListeners, point, advance, window, page, host };
};

test("Actions page preserves the operational matrix without the responsibility section", () => {
  const { page } = setup();
  const html = page.render();

  for (const expected of [
    "Ações por evolução e prontidão", "Liberar drenagem", "action-matrix",
    "data-ai-action=\"action-1\"", "data-ai-advance=\"action-1\"",
  ]) assert.ok(html.includes(expected), `missing Actions page contract: ${expected}`);
  assert.doesNotMatch(html, /attitude-walk|CAMINHADA DE ADIANTAMENTO|data-ai-step-select/);
});

test("Actions page preserves selection, drag and advance interactions", () => {
  const ctx = setup();
  ctx.page.bind(ctx.host, "actions");

  ctx.listeners.get("point:click")({});
  assert.equal(ctx.state.selectedAiAction, "action-1");
  ctx.listeners.get("advance:click")({ currentTarget: ctx.advance });
  assert.equal(ctx.state.aiActions[0].phase, 2);
  assert.equal(ctx.state.aiActions[0].readiness, 63);

  ctx.listeners.get("point:pointerdown")({
    button: 0, pointerId: 5, preventDefault() {}, stopPropagation() {},
  });
  ctx.windowListeners.get("pointermove")({ clientX: 75, clientY: 25 });
  ctx.windowListeners.get("pointerup")();
  assert.equal(ctx.state.aiActions[0].readiness, 75);
  assert.equal(ctx.state.aiActions[0].impact, 75);
  assert.equal(ctx.state.aiActionPositionChanges["action-1"].at, "2026-10-12T12:00:00.000Z");

  assert.equal(ctx.notices.length, 2);
});

test("component index delegates Actions rendering and its event category to the planning module", async () => {
  const [source, planningComposition, eventComposition] = await Promise.all([
    readFile(new URL("../../components/index.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/stage-application-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/shared/application-event-composition-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installStageApplicationCompositionV1\(\{/);
  assert.match(source, /installApplicationEventCompositionV1\(\{/);
  assert.match(planningComposition, /createOperationalIntelligenceCompositionV1\(/);
  const composition = await readFile(new URL("../../components/planning/operational-intelligence-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(composition, /createActionsPageV1\(\{/);
  assert.match(composition, /ViewLayer\.prototype\.actions = actionsPageV1\.render/);
  assert.match(eventComposition, /installOperationalIntelligenceEventsV1\(ViewLayer/);
  const events = await readFile(new URL("../../components/planning/operational-intelligence-events-v1.mjs", import.meta.url), "utf8");
  assert.match(events, /actionsPageV1\.bind\(this, view\)/);
  assert.doesNotMatch(source, /lastAction: `Reposicionou ação \$\{id\} na matriz`/);
});
