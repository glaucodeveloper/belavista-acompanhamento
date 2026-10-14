import test from "node:test";
import assert from "node:assert/strict";
import { installBrokersPageV1 } from "../../components/commercial/brokers-page.mjs";

test("brokers page preserves rendering and routes each responsibility through a focused service", () => {
  const profile = {
      id: "broker-1",
      name: "Ana Correia",
      initials: "AC",
      role: "Corretora",
      creci: "CRECI 123",
      avatar: "linear-gradient(90deg, #000, #fff)",
      phone: "5511999990000",
      lots: ["Q1-L2"],
    },
    state = {
      view: "brokers",
      reportPeriod: "annual",
      commissionEntries: [{ profile: "broker-1", value: 1000, commission: 100 }],
    },
    writes = [],
    root = new (class {
      constructor() {
        this.dataset = { view: "brokers" };
        this.listeners = new Map();
        this.rows = [{ dataset: { search: "ana correia creci 123 q1-l2" }, hidden: false }];
        this.renderCount = 0;
      }
      addEventListener(type, listener, capture) {
        this.listeners.set(`${type}:${Boolean(capture)}`, listener);
      }
      removeEventListener(type, listener, capture) {
        const key = `${type}:${Boolean(capture)}`;
        if (this.listeners.get(key) === listener) this.listeners.delete(key);
      }
      contains() {
        return true;
      }
      querySelectorAll(selector) {
        return selector === "[data-broker-row]" ? this.rows : [];
      }
      render() {
        this.renderCount += 1;
      }
    })(),
    ViewLayer = root.constructor,
    appStore = {
      get: () => state,
      set: (patch) => {
        writes.push(patch);
        Object.assign(state, patch);
      },
    };

  installBrokersPageV1(ViewLayer, {
    appStore,
    commissionProfiles: [profile],
    esc: (value) => String(value ?? ""),
    ico: () => "",
  });

  const markup = root.brokers();
  assert.match(markup, /<h1>Perfis de corretores<\/h1>/);
  assert.match(markup, /Ana Correia/);
  assert.match(markup, /CRECI 123/);
  assert.match(markup, /data-broker-open="broker-1"/);
  assert.doesNotMatch(markup, /Competência comercial|Comissão|Vendas/);

  root.bind();
  assert.deepEqual([...root.listeners.keys()].sort(), ["click:false", "input:false"]);
  assert.deepEqual(root._brokersPageEventAdministratorsV1.services, [
    "brokers-directory-search",
    "brokers-profile-navigation",
    "brokers-export",
  ]);
  const dispatch = (type, selector, target, extra = {}) =>
    root.listeners.get(`${type}:false`)({
      type,
      target: {
        dataset: {},
        textContent: "",
        closest(candidate) {
          return candidate === selector ? target : null;
        },
        ...extra,
        ...target,
      },
    });

  dispatch("input", "[data-broker-search]", {}, { value: "joão" });
  assert.equal(root.rows[0].hidden, true);
  dispatch("click", "[data-broker-open]", {
    dataset: { brokerOpen: "broker-1" },
    textContent: "Abrir perfil",
  });
  assert.deepEqual(writes.at(-1), {
    view: "broker-detail",
    selectedBrokerDirectoryId: "broker-1",
    lastAction: "Abriu a página dedicada do corretor",
  });

  root._brokersPageEventAdministratorsV1.dispose();
  assert.equal(root.listeners.size, 0);
});
