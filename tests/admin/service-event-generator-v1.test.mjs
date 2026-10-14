import test from "node:test";
import assert from "node:assert/strict";
import { createServiceEventGenerator } from "../../components/events/generators/service-event-generator.mjs";

test("each event generator stays focused on its service and resumes after dispatch", () => {
  const completed = [],
    service = createServiceEventGenerator({
      service: "stage-agenda",
      onError: (error, context) => completed.push(["error", error.message, context]),
    });

  assert.equal(service.program.next().value.type, "waiting");
  assert.equal(
    service.dispatch({ action: "save-activity", handler: () => "saved" }).result,
    "saved",
  );
  assert.equal(service.program.next().value.type, "waiting");
  assert.deepEqual(completed, []);
  service.dispose();
  assert.equal(service.dispatch({ action: "late", handler: () => "ignored" }), undefined);
});

test("event generator reports rejected asynchronous service work with its route context", async () => {
  const failures = [],
    service = createServiceEventGenerator({
      service: "materials",
      onError: (error, context) => failures.push([error.message, context]),
    });

  service.dispatch({
    action: "persist-material",
    handler: async () => {
      throw new Error("database unavailable");
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(failures, [
    ["database unavailable", { service: "materials", action: "persist-material" }],
  ]);
  service.dispose();
});
