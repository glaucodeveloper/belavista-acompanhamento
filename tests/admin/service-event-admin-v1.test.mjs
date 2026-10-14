import test from "node:test";
import assert from "node:assert/strict";
import {
  createServiceEventAdmin,
  createServiceEventAdministrators,
} from "../../components/events/service-event-admin.mjs";

test("service event admin delegates one native listener into its own generator", () => {
  const nativeListeners = new Map(),
    handled = [],
    failures = [],
    root = {
      addEventListener(type, listener) {
        nativeListeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        if (nativeListeners.get(type) === listener) nativeListeners.delete(type);
      },
      contains: () => true,
    },
    service = createServiceEventAdmin({
      root,
      service: "materials",
      routes: [
        {
          eventType: "click",
          selector: "[data-material-save]",
          action: "save",
          handler: ({ target }) => handled.push(["save", target.id]),
        },
        {
          eventType: "click",
          selector: "[data-material-delete]",
          action: "delete",
          handler: () => {
            throw new Error("delete denied");
          },
        },
      ],
      onError: (error, context) => failures.push([error.message, context]),
    });

  assert.deepEqual([...nativeListeners.keys()], ["click"]);
  assert.equal(service.program.next().value.type, "waiting");

  const saveTarget = {
    id: "material-42",
    closest(selector) {
      return selector === "[data-material-save]" ? this : null;
    },
  };
  nativeListeners.get("click")({ target: saveTarget });
  assert.deepEqual(handled, [["save", "material-42"]]);

  const deleteTarget = {
    closest(selector) {
      return selector === "[data-material-delete]" ? this : null;
    },
  };
  nativeListeners.get("click")({ target: deleteTarget });
  assert.deepEqual(failures, [
    ["delete denied", { service: "materials", action: "delete" }],
  ]);

  service.dispose();
  assert.equal(nativeListeners.size, 0);
  assert.equal(service.dispatch({ action: "save", handler: () => "ignored" }), undefined);
});

test("service event admins can be disposed independently without detaching sibling services", () => {
  const nativeListeners = new Map(),
    handled = [],
    root = {
      addEventListener(type, listener, capture) {
        nativeListeners.set(`${type}:${Boolean(capture)}`, listener);
      },
      removeEventListener(type, listener, capture) {
        nativeListeners.delete(`${type}:${Boolean(capture)}`);
      },
      contains: () => true,
    },
    admins = createServiceEventAdministrators({
      root,
      services: [
        {
          service: "directory-search",
          routes: [{
            eventType: "input",
            selector: "[data-search]",
            action: "search",
            handler: () => handled.push("search"),
          }],
        },
        {
          service: "directory-selection",
          routes: [{
            eventType: "click",
            selector: "[data-select]",
            action: "select",
            handler: () => handled.push("select"),
          }],
        },
      ],
    }),
    search = admins.getService("directory-search");

  search.dispose();
  assert.equal(search.dispatch({ action: "late", handler: () => "ignored" }), undefined);
  assert.equal(nativeListeners.has("input:false"), false);
  assert.equal(nativeListeners.has("click:false"), true);
  const selectTarget = {
    closest(selector) {
      return selector === "[data-select]" ? this : null;
    },
  };
  nativeListeners.get("click:false")({ target: selectTarget });
  assert.deepEqual(handled, ["select"]);
  assert.equal(nativeListeners.size, 1);
  assert.equal(admins.getService("unknown"), undefined);
  admins.dispose();
  assert.equal(nativeListeners.size, 0);
});

test("disposing one service retains a shared native channel for active siblings", () => {
  const nativeListeners = new Map(),
    handled = [],
    root = {
      addEventListener(type, listener, capture) {
        nativeListeners.set(`${type}:${Boolean(capture)}`, listener);
      },
      removeEventListener(type, listener, capture) {
        nativeListeners.delete(`${type}:${Boolean(capture)}`);
      },
      contains: () => true,
    },
    admins = createServiceEventAdministrators({
      root,
      services: [
        {
          service: "stage-edit",
          routes: [{
            eventType: "click",
            selector: "[data-stage-edit]",
            action: "edit-stage",
            handler: () => handled.push("stage"),
          }],
        },
        {
          service: "activity-edit",
          routes: [{
            eventType: "click",
            selector: "[data-activity-edit]",
            action: "edit-activity",
            handler: () => handled.push("activity"),
          }],
        },
      ],
    }),
    stageService = admins.getService("stage-edit");

  stageService.dispose();
  assert.equal(nativeListeners.size, 1);
  nativeListeners.get("click:false")({
    target: {
      closest: (selector) =>
        selector === "[data-activity-edit]" ? { dataset: {} } : null,
    },
  });
  assert.deepEqual(handled, ["activity"]);
  admins.dispose();
  assert.equal(nativeListeners.size, 0);
});

test("service event admin resolves delegated actions across a Web Component shadow boundary", () => {
  const nativeListeners = new Map(),
    matchedTargets = [],
    root = {
      addEventListener(type, listener, capture) {
        nativeListeners.set(`${type}:${Boolean(capture)}`, listener);
      },
      removeEventListener(type, listener, capture) {
        nativeListeners.delete(`${type}:${Boolean(capture)}`);
      },
      contains: () => false,
    },
    admins = createServiceEventAdministrators({
      root,
      services: [{
        service: "shadow-composer",
        routes: [{
          eventType: "click",
          selector: "[data-compose]",
          action: "compose",
          handler: ({ target }) => matchedTargets.push(target),
        }],
      }],
    }),
    shadowButton = { matches: (selector) => selector === "[data-compose]" },
    innerIcon = { closest: () => null },
    shadowRoot = {},
    event = {
      target: innerIcon,
      composedPath: () => [innerIcon, shadowButton, shadowRoot, root, globalThis],
    };

  nativeListeners.get("click:false")(event);
  assert.deepEqual(matchedTargets, [shadowButton]);
  admins.dispose();
});

test("service event admins reject ambiguous duplicate service names", () => {
  const root = { addEventListener() {}, removeEventListener() {} };
  assert.throws(
    () => createServiceEventAdministrators({
      root,
      services: [{ service: "duplicate" }, { service: "duplicate" }],
    }),
    /Duplicate event service: duplicate/,
  );
});

test("service APIs are stable and disposing one scope cannot dispatch its routes", () => {
  const listeners = new Map(),
    handled = [],
    root = {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      contains: () => true,
    },
    admins = createServiceEventAdministrators({
      root,
      services: [
        {
          service: "materials-read",
          routes: [{
            eventType: "click",
            selector: "[data-material-read]",
            action: "read",
            handler: () => handled.push("read"),
          }],
        },
        {
          service: "materials-write",
          routes: [{
            eventType: "click",
            selector: "[data-material-write]",
            action: "write",
            handler: () => handled.push("write"),
          }],
        },
      ],
    }),
    readService = admins.getService("materials-read");

  assert.equal(admins.getService("materials-read"), readService);
  readService.dispose();
  listeners.get("click")({
    target: {
      closest: (selector) =>
        selector === "[data-material-read]" || selector === "[data-material-write]"
          ? { dataset: { action: selector } }
          : null,
    },
  });
  assert.deepEqual(handled, ["write"]);
  assert.equal(listeners.size, 1);
  admins.dispose();
  assert.equal(listeners.size, 0);
});

test("event listener registration failure rolls back already attached channels", () => {
  const listeners = new Map(),
    root = {
      addEventListener(type, listener) {
        if (type === "paste") throw new Error("listener denied");
        listeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      contains: () => true,
    };

  assert.throws(
    () => createServiceEventAdministrators({
      root,
      services: [{
        service: "clipboard",
        routes: [
          { eventType: "click", selector: "button", action: "click", handler() {} },
          { eventType: "paste", selector: null, action: "paste", handler() {} },
        ],
      }],
    }),
    /listener denied/,
  );
  assert.equal(listeners.size, 0);
});

test("overlapping selectors preserve first registered service ownership", () => {
  const listeners = new Map(),
    handled = [],
    root = {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
      contains: () => true,
    },
    admins = createServiceEventAdministrators({
      root,
      services: ["primary", "secondary"].map((service) => ({
        service,
        routes: [{
          eventType: "click",
          selector: "[data-action]",
          action: "run",
          handler: () => handled.push(service),
        }],
      })),
    });

  listeners.get("click")({
    target: { closest: () => ({ dataset: { action: "run" } }) },
  });
  assert.deepEqual(handled, ["primary"]);
  admins.dispose();
});
