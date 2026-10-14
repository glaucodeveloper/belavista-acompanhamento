import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createMapAssistantContextActionsV1 } from "../../components/map/map-assistant-context-actions-v1.mjs";

test("map lot context lazily loads worker chat and forwards the selected lot", async () => {
  const host = {};
  let loads = 0;
  const actions = createMapAssistantContextActionsV1({
    host,
    commonAreaLabel: "Áreas comuns",
    loadWorkerContextChat: async () => {
      loads += 1;
      host.belavistaWorkerAssistant = {
        openLotStatusContext: (label) => `lote:${label}`,
      };
    },
  });

  assert.equal(await actions.prepareAssistantLotStatusPromptV1("Lote 18"), "lote:Lote 18");
  assert.equal(loads, 1);
  assert.equal(await actions.prepareAssistantLotStatusPromptV1("Lote 19"), "lote:Lote 19");
  assert.equal(loads, 1);
});

test("map area context preserves the common-area label and chat fallback", async () => {
  const labels = [];
  let fallbackLabel = "";
  const actions = createMapAssistantContextActionsV1({
    host: { belavistaWorkerAssistant: { openMapAreaContext: (label) => { labels.push(label); return false; } } },
    documentRef: { querySelector: () => ({ prepareMapAreaPrompt: (label) => { fallbackLabel = label; return true; } }) },
    commonAreaLabel: "Áreas comuns",
    loadWorkerContextChat: async () => {},
  });

  assert.equal(await actions.prepareAssistantMapAreaPromptV1("  Praça Central  "), true);
  assert.deepEqual(labels, ["Praça Central"]);
  assert.equal(fallbackLabel, "Praça Central");
  assert.equal(await actions.prepareAssistantMapAreaPromptV1(""), true);
  assert.equal(labels.at(-1), "Áreas comuns");
  assert.equal(fallbackLabel, "Áreas comuns");
});

test("components.js composes map-to-chat context actions from the map domain module", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  assert.match(source, /createMapAssistantContextActionsV1\(\{/);
  assert.doesNotMatch(source, /const prepareAssistant(?:LotStatus|MapArea)PromptV1 = async/);
});
