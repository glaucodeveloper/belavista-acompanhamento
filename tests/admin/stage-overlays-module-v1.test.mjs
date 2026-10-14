import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  blendStageOverlayColorV1,
  normalizeStageOverlayKeysV1,
  stageOverlayColors,
  stageOverlayKey,
  stageOverlayLabelV1,
  stageOverlayLabels,
} from "../../components/map/stage-overlays.mjs";

test("stage overlay categorization and labels retain the existing map vocabulary", () => {
  assert.equal(stageOverlayKey("Rede de Água"), "rede-agua");
  assert.equal(stageOverlayKey("Meio-fio e sarjeta"), "pavimentacao");
  assert.equal(stageOverlayKey("Projeto executivo"), "urbanizacao");
  assert.deepEqual(normalizeStageOverlayKeysV1(["terraplanagem", "Drenagem", "terra"]), [
    "terraplanagem",
    "drenagem",
  ]);
  assert.equal(stageOverlayLabelV1("terra, drenagem"), "Terraplanagem + Drenagem");
  assert.equal(stageOverlayLabelV1(""), "Nenhum highlight");
});

test("stage overlay color blending keeps its average-channel and empty-selection behavior", () => {
  assert.equal(blendStageOverlayColorV1([]), 0x2fe6ae);
  assert.equal(blendStageOverlayColorV1(["terraplanagem"]), stageOverlayColors.terraplanagem);
  assert.equal(
    blendStageOverlayColorV1(["terraplanagem", "drenagem"]),
    0x98aa99,
  );
  assert.deepEqual(Object.keys(stageOverlayLabels), Object.keys(stageOverlayColors));
});

test("components shell imports the extracted map overlay module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /stage-overlays\.mjs\?v=stage-overlays-v1/);
  assert.match(source, /import \{[\s\S]*?stageOverlayKey,[\s\S]*?stageOverlayLabels,[\s\S]*?\} from "\.\/components\/map\/stage-overlays/);
});
