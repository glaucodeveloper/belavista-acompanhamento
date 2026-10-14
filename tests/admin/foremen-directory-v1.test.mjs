import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installForemenDirectoryPageV1 } from "../../components/planning/foremen-directory-v1.mjs";

test("foremen directory page is installed with injected state, stage model, and browser APIs", async () => {
  class ViewLayer {}
  ViewLayer.prototype.bind = function () { return "base bind"; };
  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const registration = await readFile(new URL("../../components/planning/personnel-page-registration-v1.mjs", import.meta.url), "utf8");
  installForemenDirectoryPageV1(ViewLayer, {
    appStore: { get: () => ({ foremenContacts: [] }) },
    esc: (value) => String(value ?? ""),
    executionModel: { stages: [] },
    publishOperationalEvent: async () => {},
    host: {
      confirm: () => false,
      FormData: class FormData {},
      File: class File {},
      FileReader: class FileReader {},
    },
  });

  const page = ViewLayer.prototype.personnel.call({});
  assert.match(page, /data-foreman-form/);
  assert.match(page, /Encarregados de atividade/);
  assert.match(page, /Nenhum encarregado cadastrado/);
  assert.match(root, /installPersonnelPageRegistrationV1\(\{/);
  assert.match(registration, /installForemenDirectoryPageV1\(ViewLayer/);
  assert.match(registration, /ViewLayer\.prototype\.collaborators = function \(\) \{\s*return this\.personnel\(\);/);
});
