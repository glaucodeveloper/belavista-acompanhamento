import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRaidPageV1 } from "../../components/planning/raid-page-v1.mjs";

const setup = () => {
  const state = {}, writes = [], notices = [], listeners = new Map(), prompts = [],
    card = {
      dataset: { raidCard: "RAID-R1" },
      classList: { add() {}, remove() {} },
      addEventListener(type, listener) { listeners.set(`card:${type}`, listener); },
    },
    zone = {
      dataset: { raidZone: "issue" },
      classList: { add() {}, remove() {} },
      addEventListener(type, listener) { listeners.set(`zone:${type}`, listener); },
    },
    target = {
      dataset: { raidTarget: "Drenagem" },
      classList: { add() {}, remove() {} },
      addEventListener(type, listener) { listeners.set(`target:${type}`, listener); },
    },
    add = {
      dataset: { raidAdd: "risk" },
      addEventListener(type, listener) { listeners.set(`add:${type}`, listener); },
    },
    appStore = {
      get: () => state,
      set: (patch) => { writes.push(patch); Object.assign(state, patch); },
    },
    page = createRaidPageV1({
      appStore,
      extensionStage: () => ({ name: "Drenagem Pluvial" }),
      esc: (value) => String(value ?? ""),
      ico: (name) => `[${name}]`,
      notify: (...args) => notices.push(args),
      prompt: (message) => { prompts.push(message); return prompts.length === 1 ? "Nova pendência" : "Condição constatada"; },
      Date: { now: () => 1234 },
    }),
    host = {
      querySelectorAll(selector) {
        return selector === "[data-raid-card]" ? [card]
          : selector === "[data-raid-zone]" ? [zone]
            : selector === "[data-raid-target]" ? [target]
              : selector === "[data-raid-add]" ? [add] : [];
      },
    };
  return { state, writes, notices, listeners, prompts, page, host, card };
};

test("RAID page preserves its four zones, inspector, navigation, and source items", () => {
  const { page } = setup(), html = page.render();
  for (const expected of [
    "Pendências e atenção operacional", "RAID · Drenagem Pluvial",
    "data-raid-zone=\"risk\"", "data-raid-zone=\"assumption\"",
    "data-raid-zone=\"issue\"", "data-raid-zone=\"dependency\"",
    "Chuva sobre pavimentação", "data-raid-target=\"Drenagem\"",
    "data-view=\"pert\"", "data-view=\"actions\"", "data-view=\"records\"",
  ]) assert.ok(html.includes(expected), `missing RAID page contract: ${expected}`);
});

test("RAID card selection and drag-drop retain appStore updates and notices", () => {
  const ctx = setup();
  ctx.page.bind(ctx.host, "raid");

  ctx.listeners.get("card:click")();
  assert.equal(ctx.state.selectedRaidItem, "RAID-R1");
  let prevented = false;
  ctx.listeners.get("card:dragstart")({ dataTransfer: { setData() {} } });
  ctx.listeners.get("zone:drop")({ preventDefault() { prevented = true; }, dataTransfer: { getData: () => "RAID-R1" } });
  assert.equal(prevented, true);
  assert.equal(ctx.state.raidItems.find((item) => item.id === "RAID-R1").kind, "issue");
  assert.equal(ctx.state.lastAction, "Moveu RAID-R1 para issue");
  assert.deepEqual(ctx.notices.at(-1), ["Item RAID movido para a nova zona.", "success"]);
});

test("RAID target linking and add flow retain source prompts and selected-item state", () => {
  const ctx = setup();
  ctx.page.bind(ctx.host, "raid");
  ctx.listeners.get("card:dragstart")({ dataTransfer: { setData() {} } });
  ctx.listeners.get("target:drop")({ preventDefault() {}, dataTransfer: { getData: () => "RAID-R1" } });
  assert.equal(ctx.state.raidItems.find((item) => item.id === "RAID-R1").linked, "Drenagem");
  assert.equal(ctx.state.lastAction, "Vinculou RAID-R1 a Drenagem");

  ctx.listeners.get("add:click")();
  const added = ctx.state.raidItems.at(-1);
  assert.deepEqual(ctx.prompts, ["Título da nova pendência:", "Descrição / condição observada:"]);
  assert.equal(added.id, "RAID-YA");
  assert.equal(added.kind, "risk");
  assert.equal(added.title, "Nova pendência");
  assert.equal(added.detail, "Condição constatada");
  assert.equal(added.linked, "Drenagem Pluvial");
  assert.equal(ctx.state.selectedRaidItem, added.id);
});

test("components.js delegates RAID rendering and interactions to the planning module", async () => {
  const [source, composition] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/operational-intelligence-composition-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /createOperationalIntelligenceCompositionV1\(/);
  assert.match(composition, /createRaidPageV1\(\{/);
  assert.match(composition, /ViewLayer\.prototype\.raid = raidPageV1\.render/);
  assert.match(source, /raidPageV1\.bind\(this, view\)/);
  assert.match(composition, /const operationalRaid = raidPageV1\.operationalRaid/);
  assert.doesNotMatch(source, /const RAID_DEFAULTS|Pendências e atenção operacional/);
});
