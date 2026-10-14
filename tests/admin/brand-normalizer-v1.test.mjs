import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAliancaParkBrand } from "../../components/shared/brand-normalizer.mjs";

test("brand normalizer preserves its text and attribute scope", () => {
  const text = { nodeValue: "Belavista · Aliança Park", parentElement: { closest: () => null } },
    scriptText = { nodeValue: "Belavista", parentElement: { closest: () => ({}) } },
    attributes = new Map([
      ["title", "Belavista"],
      ["placeholder", "Empreendimento Belavista"],
      ["aria-label", "Belavista"],
    ]),
    element = {
      closest: () => null,
      getAttribute: (key) => attributes.get(key) || null,
      setAttribute: (key, value) => attributes.set(key, value),
    },
    nodes = [text, scriptText];
  let cursor = 0;

  const previousNodeFilter = globalThis.NodeFilter;
  globalThis.NodeFilter = { SHOW_TEXT: 4 };
  const root = {
    createTreeWalker: () => ({
      nextNode() {
        if (cursor >= nodes.length) return false;
        this.currentNode = nodes[cursor++];
        return true;
      },
    }),
    querySelectorAll: () => [element],
  };

  try {
    normalizeAliancaParkBrand(root);

    assert.equal(text.nodeValue, "Aliança Park · Aliança Park");
    assert.equal(scriptText.nodeValue, "Belavista");
    assert.equal(attributes.get("title"), "Aliança Park");
    assert.equal(attributes.get("placeholder"), "Empreendimento Aliança Park");
    assert.equal(attributes.get("aria-label"), "Aliança Park");
  } finally {
    if (previousNodeFilter === undefined) delete globalThis.NodeFilter;
    else globalThis.NodeFilter = previousNodeFilter;
  }
});
