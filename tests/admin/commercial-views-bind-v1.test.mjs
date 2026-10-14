import assert from "node:assert/strict";
import test from "node:test";
import { installCommercialViewsBindV1 } from "../../components/commercial/commercial-views-bind-v1.mjs";

test("commercial view binding preserves the existing binder contract", () => {
  const previousResult = { bound: true };
  let previousCalls = 0;
  let negotiationCalls = 0;
  const ViewLayer = {
    prototype: {
      bind(...args) {
        previousCalls += 1;
        assert.deepEqual(args, ["route-context"]);
        return previousResult;
      },
    },
  };
  const documentRef = {
    activeElement: null,
    body: { classList: { add() {}, remove() {} } },
    querySelectorAll() {
      return [];
    },
  };
  const root = {
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  Object.setPrototypeOf(root, ViewLayer.prototype);

  installCommercialViewsBindV1(ViewLayer, {
    bindCommissionNegotiationEventsV1() {
      negotiationCalls += 1;
    },
    documentRef,
  });

  assert.equal(root.bind("route-context"), previousResult);
  assert.equal(previousCalls, 1);
  assert.equal(negotiationCalls, 1);
});
