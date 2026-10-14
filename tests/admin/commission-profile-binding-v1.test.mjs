import assert from "node:assert/strict";
import test from "node:test";
import { installCommissionProfileBindingV1 } from "../../components/commercial/commission-profile-binding-v1.mjs";

test("commission profile binding preserves the previous binder and profile navigation", () => {
  let baseBindCalls = 0;
  let clickHandler;
  const updates = [];
  const profileButton = {
    dataset: { commissionProfile: "broker-17" },
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    },
  };
  const ViewLayer = {
    prototype: {
      bind() {
        baseBindCalls += 1;
      },
    },
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "[data-commission-profile]" ? [profileButton] : [];
    },
    querySelector() {
      return null;
    },
  };
  Object.setPrototypeOf(root, ViewLayer.prototype);

  installCommissionProfileBindingV1(ViewLayer, {
    viewLayerBindWithCommissions: ViewLayer.prototype.bind,
    appStore: { set: (value) => updates.push(value) },
    commissionDeals: [],
    commissionProfiles: [],
    notify() {},
    documentRef: { createElement() { throw new Error("not used"); } },
    windowRef: { open() {}, print() {} },
  });

  root.bind();
  clickHandler();

  assert.equal(baseBindCalls, 1);
  assert.deepEqual(updates, [
    {
      selectedCommissionProfile: "broker-17",
      selectedCommissionContract: null,
      lastAction: "Abriu carteira de comissões",
    },
  ]);
});
