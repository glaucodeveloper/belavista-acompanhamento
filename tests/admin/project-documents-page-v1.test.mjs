import test from "node:test";
import assert from "node:assert/strict";
import { installProjectDocumentsPageV1 } from "../../components/lots/project-documents-page-v1.mjs";

test("project documents installer injects browser services and renders the original empty catalog", () => {
  class ViewLayer {}
  ViewLayer.prototype.bind = function () { return "base bind"; };
  const host = {
    indexedDB: null,
    document: {},
    window: {},
    FormData: class FormData {},
    requestAnimationFrame() {},
    confirm() { return false; },
    URL: class URL {},
    setTimeout() {},
    Option: class Option {},
    CSS: { escape: (value) => String(value) },
  };
  installProjectDocumentsPageV1(ViewLayer, {
    appStore: { get: () => ({ documentCatalog: [] }) },
    esc: (value) => String(value ?? ""),
    ico: () => "",
    notify() {},
    runtimeRouteV1: (value) => value,
    host,
  });

  const page = ViewLayer.prototype.documents.call({});
  const bindResult = ViewLayer.prototype.bind.call({ querySelector: () => null });
  assert.match(page, /data-project-documents-page/);
  assert.match(page, /Documentos do loteamento/);
  assert.match(page, /Nenhum documento encontrado/);
  assert.match(page, /data-document-cell-dialog/);
  assert.equal(bindResult, "base bind");
});
