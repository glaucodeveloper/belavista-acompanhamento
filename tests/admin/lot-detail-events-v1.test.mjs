import test from "node:test";
import assert from "node:assert/strict";
import { installLotDetailEventsV1 } from "../../components/lots/lot-detail-events-v1.mjs";

test("lot detail preserves its print action and delegated submit fallback", () => {
  const original = {
      document: globalThis.document,
      window: globalThis.window,
      HTMLFormElement: globalThis.HTMLFormElement,
      fallback: globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__,
    },
    documentListeners = new Map(),
    buttonListeners = new Map(),
    bodyClasses = new Set(),
    windowListeners = new Map(),
    calls = [],
    printButton = {
      addEventListener(type, handler) { buttonListeners.set(type, handler); },
    },
    lotRoot = {
      dataset: { lotKey: "Q1-L1" },
      querySelector(selector) {
        return selector === "[data-lot-detail-print]" ? printButton : null;
      },
      querySelectorAll: () => [],
    };

  class HTMLFormElementStub {}
  globalThis.HTMLFormElement = HTMLFormElementStub;
  globalThis.document = {
    addEventListener: (type, handler) => documentListeners.set(type, handler),
    body: {
      classList: {
        add: (name) => bodyClasses.add(name),
        remove: (name) => bodyClasses.delete(name),
      },
    },
  };
  globalThis.window = {
    addEventListener: (type, handler, options) => windowListeners.set(type, { handler, options }),
    print: () => calls.push("print"),
  };
  delete globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__;

  class ViewLayer {
    bind() { calls.push("base-bind"); return "bound"; }
    querySelector(selector) {
      return selector === "[data-lot-detail-page]" ? lotRoot : null;
    }
  }

  try {
    installLotDetailEventsV1(ViewLayer, {
      REPASSE_PRICE_CATALOG: [{ label: "Q1-L1", lot: 1, quadra: "Q1" }],
      apiFetch: async () => { throw new Error("unexpected request"); },
      appStore: { get: () => ({}), set() {} },
      commissionProfiles: [],
      downloadBrandedLotExcelV1() {},
      formatBRL: String,
      lotExportRowV1: (lot) => lot,
      notify() {},
      operationalHeaders: () => ({}),
      prepareAssistantLotStatusPromptV1() {},
    });

    const layer = new ViewLayer();
    assert.equal(layer.bind(), "bound");
    assert.equal(documentListeners.has("submit"), true);
    buttonListeners.get("click")();
    assert.equal(bodyClasses.has("lot-detail-print-mode"), true);
    assert.equal(windowListeners.get("afterprint").options.once, true);
    assert.deepEqual(calls, ["base-bind", "print"]);

    windowListeners.get("afterprint").handler();
    assert.equal(bodyClasses.has("lot-detail-print-mode"), false);
  } finally {
    if (original.document === undefined) delete globalThis.document;
    else globalThis.document = original.document;
    if (original.window === undefined) delete globalThis.window;
    else globalThis.window = original.window;
    if (original.HTMLFormElement === undefined) delete globalThis.HTMLFormElement;
    else globalThis.HTMLFormElement = original.HTMLFormElement;
    if (original.fallback === undefined)
      delete globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__;
    else globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__ = original.fallback;
  }
});
