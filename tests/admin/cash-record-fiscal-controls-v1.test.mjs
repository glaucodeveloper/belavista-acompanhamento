import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installCashRecordFiscalControlsV1 } from "../../components/finance/cash-record-fiscal-controls-v1.mjs";

test("cash-record output preserves its base renderer and adds fiscal fields", () => {
  const calls = [];
  class ViewLayer {
    ["cash-record"](...args) { calls.push([this, args]); return '<label class="cash-record-attachment">Anexo</label>'; }
  }
  installCashRecordFiscalControlsV1(ViewLayer, { appStore: { get: () => ({}), set() {} } });
  const layer = new ViewLayer(), html = layer["cash-record"]("form-context");
  assert.equal(calls[0][0], layer);
  assert.deepEqual(calls[0][1], ["form-context"]);
  assert.match(html, /name="fiscalDocumentType"/);
  assert.match(html, /name="fiscalDocumentNumber"/);
  assert.match(html, /name="fiscalIssuer"/);
  assert.match(html, /name="fiscalIssueDate"/);
  assert.match(html, /name="fiscalStatus"/);
  assert.match(html, /<label class="cash-record-attachment">Anexo/);
});

test("cash shortcuts preserve owner authorization, stage draft, and original render result", () => {
  const writes = [], buttons = [], mountCalls = [], renderResult = { rendered: true },
    state = { currentActor: { role: "owner" }, cashRecordDraft: { kind: "saida", stage: "Rede de Água" } },
    header = {
      querySelector: () => null,
      append: (button) => buttons.push(button),
    },
    cashForm = {
      dataset: { recordComposerMounted: "1" },
      elements: { kind: { value: "" }, stage: { value: "" }, attachment: { id: "attachment" } },
    };
  class ViewLayer {
    render(...args) { this.args = args; return renderResult; }
    querySelector(selector) {
      if (selector === ".control-general-event > header") return header;
      if (selector === "[data-cash-record-form]") return cashForm;
      return null;
    }
  }
  installCashRecordFiscalControlsV1(ViewLayer, {
    appStore: { get: () => state, set: (patch) => { writes.push(patch); Object.assign(state, patch); } },
    document: { createElement: (tagName) => ({ tagName, dataset: {}, addEventListener(type, listener) { this.listener = listener; } }) },
    mountRecordDropinV1: (...args) => mountCalls.push(args),
  });
  const layer = new ViewLayer();
  assert.equal(layer.render("route-change"), renderResult);
  assert.deepEqual(layer.args, ["route-change"]);
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.quickCashEntry, "Geral");
  buttons[0].listener();
  assert.deepEqual(writes[0], {
    view: "cash-record", cashRecordReturnView: "control",
    cashRecordDraft: { kind: "entrada", stage: "Geral" },
    lastAction: "Abriu entrada de caixa com controle fiscal",
  });
  assert.equal(cashForm.elements.kind.value, "saida");
  assert.equal(cashForm.elements.stage.value, "Rede de Água");
  assert.deepEqual(mountCalls, [[cashForm, cashForm.elements.attachment, "cash"]]);
});

test("components.js delegates fiscal cash behavior to its finance module", async () => {
  const components = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    module = await readFile(new URL("../../components/finance/cash-record-fiscal-controls-v1.mjs", import.meta.url), "utf8");
  assert.match(components, /installCashRecordFiscalControlsV1\(ViewLayer/);
  assert.doesNotMatch(components, /const cashRecordBeforeFiscalV1\s*=/);
  assert.match(module, /cashRecordReturnView: "control"/);
  assert.match(module, /actor\.role === "owner"/);
});
