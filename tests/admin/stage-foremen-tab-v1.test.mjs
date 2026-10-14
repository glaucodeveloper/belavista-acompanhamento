import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageForemenTabV1 } from "../../components/planning/foremen-directory-v1.mjs";

const stage = { key: "earth", name: "Terraplenagem", owner: "Equipe A", production: { unit: "m³" }, nextAction: "Aferir compactação" };
const render = ({ state = {}, members = [], live = { progress: 28, status: "Em acompanhamento" } } = {}) => {
  class ViewLayer {}
  installStageForemenTabV1(ViewLayer, {
    appStore: { get: () => state },
    extensionStage: () => stage,
    personnelModel: { members },
    stageV9LiveFor: () => live,
    esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
  });
  return new ViewLayer().foremen();
};

test("stage foremen tab prefers the persisted stage links and renders the live page context", () => {
  const html = render({
    state: { foremenContacts: [{ id: "f1", name: "Ana Campo", role: "Encarregada", status: "Em campo", stages: ["earth"], skills: ["m³"], activityCount: 4 }] },
  });
  assert.match(html, /stage-foremen-page stage-extension-page/);
  assert.match(html, /Ana Campo/);
  assert.match(html, /Em campo/);
  assert.match(html, /28%/);
  assert.match(html, /Aferir compactação/);
  assert.match(html, /data-view="personnel"/);
});

test("stage foremen tab falls back to modeled team members and then the stage owner", () => {
  assert.match(render({ members: [{ id: "m1", name: "Equipe de campo", team: "earth", status: "Disponível" }] }), /Equipe de campo/);
  const fallback = render();
  assert.match(fallback, /Equipe A/);
  assert.match(fallback, /Aguardando vínculo/);
  assert.match(fallback, /m³/);
});

test("root delegates the final stage foremen renderer to planning", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const registration = await readFile(new URL("../../components/planning/personnel-page-registration-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installPersonnelPageRegistrationV1\(\{/);
  assert.match(registration, /installStageForemenTabV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /const stageForemenMembersV1 =/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.foremen = function \(\) \{\s*const state = appStore\.get\(\),\s*stage = extensionStage\(\)/);
});
