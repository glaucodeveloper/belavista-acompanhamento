import test from "node:test";
import assert from "node:assert/strict";
import { installPersonnelPageRegistrationV1 } from "../../components/planning/personnel-page-registration-v1.mjs";

test("personnel registration installs both staff routes and the collaborators alias", () => {
  class ViewLayer { bind() { return "base"; } }
  const appStore = { get: () => ({ foremenContacts: [] }) };
  const stage = { key: "earth", name: "Terraplenagem", owner: "Equipe A" };

  installPersonnelPageRegistrationV1({
    ViewLayer,
    appStore,
    executionModel: { stages: [] },
    publishOperationalEvent: async () => {},
    extensionStage: () => stage,
    personnelModel: { members: [] },
    stageV9LiveFor: () => ({ progress: 0, status: "Em acompanhamento" }),
    esc: (value) => String(value ?? ""),
    ico: () => "",
    host: {
      confirm: () => false,
      FormData: class FormData {},
      File: class File {},
      FileReader: class FileReader {},
    },
    logger: { info() {} },
  });

  assert.equal(typeof ViewLayer.prototype.personnel, "function");
  assert.equal(typeof ViewLayer.prototype.foremen, "function");
  assert.match(ViewLayer.prototype.personnel(), /Encarregados de atividade/);
  assert.match(ViewLayer.prototype.foremen(), /Terraplenagem/);
  assert.equal(ViewLayer.prototype.collaborators.call({ personnel: () => "personnel-route" }), "personnel-route");
});
