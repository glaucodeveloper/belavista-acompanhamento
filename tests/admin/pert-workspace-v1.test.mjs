import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCardCanvasLinkV1 } from "../../components/planning/card-canvas-link-v1.mjs";
import {
  createPertNodeServiceV1,
  createPertPageRendererV1,
} from "../../components/planning/pert-workspace-v1.mjs";

const store = (initial) => ({
  state: initial,
  get() { return this.state; },
  set(patch) { this.state = { ...this.state, ...patch }; },
});

test("PERT node service preserves dependency unlock rules and applied position overrides", () => {
  const appStore = store({
    pertOverrides: { first: { x: 33 } },
    pertCustomNodes: [{ id: "custom", label: "Extra", progress: 0 }],
    pertRelations: [{ from: "first", to: "custom" }],
  });
  const nodes = createPertNodeServiceV1({
    appStore,
    graph: {
      nodes: [
        { id: "first", label: "First", progress: 100, x: 2 },
        { id: "second", label: "Second", progress: 0 },
      ],
      edges: [["first", "second"]],
    },
  })();

  assert.deepEqual(nodes.map(({ id, state }) => [id, state]), [
    ["first", "done"], ["second", "available"], ["custom", "available"],
  ]);
  assert.equal(nodes[0].x, 33);
  assert.throws(() => createPertNodeServiceV1({ appStore, graph: {} }), /graph nodes and edges/);
});

test("PERT renderer preserves stage, graph, selection, and action markup", () => {
  const appStore = store({ selectedPertNode: "active" });
  const render = createPertPageRendererV1({
    graph: { edges: [["done", "active"]] },
    appStore,
    extensionStage: () => ({ name: "Drenagem" }),
    currentPertNodes: () => [
      { id: "done", label: "Escavar", state: "done", x: 10, y: 20, progress: 100, owner: "Equipe", material: "Retroescavadeira", contract: "OS-1" },
      { id: "active", label: "Instalar", state: "active", x: 40, y: 30, progress: 45, owner: "Carlos", material: "Tubos", contract: "OS-2" },
    ],
    esc: (value) => String(value ?? "").replaceAll("<", "&lt;"),
    ico: (name) => `[${name}]`,
  });
  const html = render();

  assert.match(html, /PERT · Drenagem/);
  assert.match(html, /data-pert-node="active"/);
  assert.match(html, /class="pert-node state-active selected"/);
  assert.match(html, /data-pert-complete="active"/);
  assert.match(html, /M 17 28 C 28\.5 28, 28\.5 38, 40 38/);
  assert.throws(() => createPertPageRendererV1({ graph: {}, appStore }), /requires extensionStage/);
});

test("card-canvas link gesture draws, dispatches the drop, and cleans up", () => {
  const windowListeners = new Map(),
    removed = [],
    makeElement = () => ({
      className: "",
      textContent: "",
      style: {},
      attrs: {},
      classList: { add(name) { this[name] = true; } },
      appendChild(child) { this.child = child; },
      setAttribute(name, value) { this.attrs[name] = value; },
      remove() { removed.push(this); },
    }),
    target = { id: "drop-target" },
    documentRef = {
      createElement: makeElement,
      createElementNS: makeElement,
      elementFromPoint: () => target,
    },
    windowRef = {
      addEventListener(type, listener) { windowListeners.set(type, listener); },
      removeEventListener(type) { windowListeners.delete(type); },
    },
    children = [],
    surface = {
      append(...items) { children.push(...items); },
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 200 }),
    },
    drops = [];
  const link = createCardCanvasLinkV1({ documentRef, windowRef });

  link({
    event: { clientX: 40, clientY: 50 },
    source: "a",
    surface,
    from: () => ({ x: 20, y: 35 }),
    onDrop: (...args) => drops.push(args),
  });
  windowListeners.get("pointermove")({ clientX: 100, clientY: 120 });
  assert.match(children[0].child.attrs.d, /C/);
  assert.equal(children[1].style.left, "90px");
  windowListeners.get("pointerup")({ clientX: 100, clientY: 120 });

  assert.equal(drops[0][1], target);
  assert.equal(windowListeners.size, 0);
  assert.equal(removed.length, 2);
  assert.throws(() => createCardCanvasLinkV1({}), /requires document/);
});

test("application composition delegates the full PERT renderer and editor to planning modules", async () => {
  const [source, intelligence, stagePages, page, gesture, runtime] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/operational-intelligence-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/stage-pages-application-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/pert-workspace-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/card-canvas-link-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/planning-runtime-context-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installStagePagesApplicationCompositionV1\(\{/);
  assert.match(intelligence, /ViewLayer\.prototype\.pert = createPertPageRendererV1/);
  assert.match(stagePages, /installPertInteractiveV1\(ViewLayer/);
  assert.match(source, /beginCardCanvasLinkV1,[\s\S]*?createPlanningRuntimeContextV1/);
  assert.match(runtime, /beginCardCanvasLinkV1 = createCardCanvasLinkV1/);
  assert.doesNotMatch(source, /pertRelationMarkupV1|pertRelationEdgesV1|const bindPertInteractiveV1/);
  assert.match(page, /data-pert-relation-edit/);
  assert.match(page, /data-pert-link-form/);
  assert.match(page, /Reposicionou nó PERT/);
  assert.match(page, /windowRef\.prompt/);
  assert.match(gesture, /pointercancel/);
});
