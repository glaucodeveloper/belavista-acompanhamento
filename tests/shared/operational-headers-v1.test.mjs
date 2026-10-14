import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createOperationalHeadersV1 } from "../../components/shared/operational-headers-v1.mjs";

test("headers operacionais acompanham ator atual e preservam headers adicionais", () => {
  const state = {
    currentActor: { role: "foreman", uid: "user-42", name: "Ana Silva" },
  };
  const operationalHeaders = createOperationalHeadersV1({ appStore: { get: () => state } });

  assert.deepEqual(operationalHeaders({ "Content-Type": "application/json" }), {
    "X-Belavista-Role": "foreman",
    "X-Belavista-User": "user-42",
    "X-Belavista-Name": "Ana Silva",
    "Content-Type": "application/json",
  });
  state.currentActor = { role: "owner", uid: "user-7", name: "Bia" };
  assert.deepEqual(operationalHeaders({ "X-Belavista-Name": "Delegado" }), {
    "X-Belavista-Role": "owner",
    "X-Belavista-User": "user-7",
    "X-Belavista-Name": "Delegado",
  });
});

test("fallback local e headers extras mantêm a semântica original", () => {
  const operationalHeaders = createOperationalHeadersV1({
    appStore: { get: () => ({ currentActor: null }) },
  });

  assert.deepEqual(operationalHeaders(), {
    "X-Belavista-Role": "owner",
    "X-Belavista-User": "local-warley",
    "X-Belavista-Name": "Warley",
  });
  assert.deepEqual(operationalHeaders({ Accept: "application/json" }), {
    "X-Belavista-Role": "owner",
    "X-Belavista-User": "local-warley",
    "X-Belavista-Name": "Warley",
    Accept: "application/json",
  });
});

test("components.js injeta os headers compartilhados na composição da aplicação", async () => {
  const composition = await readFile(new URL("../../components/index.mjs", import.meta.url), "utf8");
  const financeComposition = await readFile(new URL("../../components/finance/finance-application-composition-v1.mjs", import.meta.url), "utf8");

  assert.match(financeComposition, /import \{ createOperationalHeadersV1 \} from "\.\.\/shared\/operational-headers-v1\.mjs\?/);
  assert.match(financeComposition, /const operationalHeaders = createOperationalHeadersV1\(\{ appStore \}\)/);
  assert.doesNotMatch(composition, /const operationalHeaders = \(extra = \{\}\) =>/);
});
