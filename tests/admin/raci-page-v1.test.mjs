import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRaciPageV1 } from "../../components/planning/raci-page-v1.mjs";

const setup = () => {
  const state = {}, writes = [], notices = [], listeners = new Map(),
    cell = { dataset: { raciCell: "t3:carlos" }, addEventListener(type, listener) { listeners.set(`cell:${type}`, listener); } },
    cycle = { dataset: { raciCycle: "t3:carlos" }, addEventListener(type, listener) { listeners.set(`cycle:${type}`, listener); } },
    appStore = {
      get: () => state,
      set: (patch) => { writes.push(patch); Object.assign(state, patch); },
    },
    page = createRaciPageV1({
      appStore,
      extensionStage: () => ({ name: "Drenagem Pluvial" }),
      esc: (value) => String(value ?? ""),
      ico: (name) => `[${name}]`,
      notify: (...args) => notices.push(args),
      clone: (value) => structuredClone(value),
    }),
    host = {
      querySelectorAll: (selector) => selector === "[data-raci-cell]" ? [cell] : [],
      querySelector: (selector) => selector === "[data-raci-cycle]" ? cycle : null,
    };
  return { state, writes, notices, listeners, page, host };
};

test("RACI page keeps the source matrix, selected-cell inspector, and navigation controls", () => {
  const { page } = setup();
  const html = page.render();

  for (const expected of [
    "RACI interativa da etapa", "Drenagem Pluvial", "Carlos Mendes",
    "data-raci-cell=\"t3:carlos\"", "data-raci-cycle=\"t3:carlos\"",
    "data-view=\"actions\"", "data-view=\"agenda\"", "data-view=\"records\"",
  ]) assert.ok(html.includes(expected), `missing RACI page contract: ${expected}`);
});

test("RACI selection and role cycling retain appStore updates and notifications", () => {
  const ctx = setup();
  ctx.page.bind(ctx.host, "raci");

  ctx.listeners.get("cell:click")();
  assert.equal(ctx.state.selectedRaciCell, "t3:carlos");
  ctx.listeners.get("cell:dblclick")({ preventDefault() {} });
  assert.equal(ctx.state.raciAssignments.t3.carlos, "A");
  assert.equal(ctx.state.lastAction, "Alterou RACI t3/carlos para A");
  assert.deepEqual(ctx.notices, [["Papel RACI alterado para A.", "success"]]);

  ctx.listeners.get("cycle:click")({ currentTarget: ctx.host.querySelector("[data-raci-cycle]") });
  assert.equal(ctx.state.raciAssignments.t3.carlos, "C");
  assert.equal(ctx.writes.length, 3);
});

test("components.js delegates the RACI route and leaves route entry in its planning source", async () => {
  const [source, composition, routeEvents] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/operational-intelligence-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/activity-installation-session-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /createOperationalIntelligenceCompositionV1\(/);
  assert.match(composition, /createRaciPageV1\(\{/);
  assert.match(composition, /ViewLayer\.prototype\.raci = raciPageV1\.render/);
  assert.match(source, /raciPageV1\.bind\(this, view\)/);
  assert.doesNotMatch(source, /const RACI_ACTORS|const RACI_TASKS|Pessoas responsáveis · \$\{esc\(stage\.name\)\}/);
  assert.match(routeEvents, /data-installation-route/);
  assert.match(routeEvents, /next === "raci"/);
});
