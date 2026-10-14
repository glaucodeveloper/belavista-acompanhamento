import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installFloatingWidgetLayoutV1 } from "../../components/shared/floating-widget-layout-v1.mjs";

const classList = (initial = []) => {
  const values = new Set(initial);
  return {
    [Symbol.iterator]: () => values[Symbol.iterator](),
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
  };
};

const fixture = ({ view = "assistant", saved = null } = {}) => {
  const state = {
    view,
    widgetLayouts: { floating: saved || {} },
  };
  const store = {
    get: () => state,
    update(updater) { Object.assign(state, updater(state)); },
  };
  class ViewLayer {}
  installFloatingWidgetLayoutV1(ViewLayer, { appStore: store });

  const listeners = new Map();
  const styleValues = new Map();
  const handle = {
    dataset: {},
    classList: classList(),
    setPointerCapture(pointerId) { this.captured = pointerId; },
    releasePointerCapture(pointerId) { this.released = pointerId; },
    addEventListener(name, callback, options) {
      const entries = listeners.get(name) || [];
      entries.push({ callback, options });
      listeners.set(name, entries);
    },
    removeEventListener(name, callback) {
      listeners.set(name, (listeners.get(name) || []).filter((entry) => entry.callback !== callback));
    },
  };
  const card = {
    classList: classList(["float-card", "dashboard-ai-panel"]),
    dataset: {},
    style: { setProperty: (name, value, priority) => styleValues.set(name, { value, priority }) },
    offsetWidth: 100,
    offsetHeight: 80,
    querySelector: (selector) => selector === "h3" ? handle : null,
    getBoundingClientRect() {
      return {
        left: 100 + Number.parseFloat(styleValues.get("left")?.value || "20"),
        top: 50 + Number.parseFloat(styleValues.get("top")?.value || "40"),
      };
    },
  };
  const layer = Object.assign(new ViewLayer(), {
    querySelectorAll: (selector) => selector === ".float-card" ? [card] : [],
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 500, height: 400 }),
  });
  return { layer, card, handle, listeners, styleValues, state };
};

test("layout reaplica posições salvas e registra o arraste uma única vez", () => {
  const saved = { "assistant:dashboard-ai-panel": { left: 35, top: 85 } };
  const { layer, handle, listeners, styleValues } = fixture({ saved });

  layer.bindFloatingWidgets();
  layer.bindFloatingWidgets();

  assert.deepEqual(styleValues.get("left"), { value: "35px", priority: "important" });
  assert.deepEqual(styleValues.get("top"), { value: "85px", priority: "important" });
  assert.deepEqual(styleValues.get("right"), { value: "auto", priority: "important" });
  assert.deepEqual(styleValues.get("bottom"), { value: "auto", priority: "important" });
  assert.equal(handle.dataset.layoutBound, "true");
  assert.equal(handle.classList.contains("widget-drag-handle"), true);
  assert.equal(listeners.get("pointerdown").length, 1);
});

test("arraste limita coordenadas ao painel e persiste posição pelo card/view", () => {
  const { layer, card, handle, listeners, state } = fixture();
  layer.bindFloatingWidgets();
  let prevented = false;
  listeners.get("pointerdown")[0].callback({
    button: 0,
    target: { closest: () => null },
    pointerId: 7,
    clientX: 50,
    clientY: 60,
    preventDefault() { prevented = true; },
  });

  assert.equal(prevented, true);
  assert.equal(handle.captured, 7);
  assert.equal(card.classList.contains("widget-dragging"), true);
  listeners.get("pointermove")[0].callback({ clientX: 70, clientY: 80 });
  listeners.get("pointerup")[0].callback();

  assert.equal(handle.released, 7);
  assert.equal(card.classList.contains("widget-dragging"), false);
  assert.equal(listeners.get("pointermove").length, 0);
  assert.deepEqual(state.widgetLayouts.floating["assistant:dashboard-ai-panel"], {
    left: 40,
    top: 70,
  });
});

test("cards flutuantes não são ligadas em páginas fora de assistente/mapa", () => {
  const { layer, handle, listeners } = fixture({ view: "stages" });
  layer.bindFloatingWidgets();
  assert.equal(handle.dataset.layoutBound, undefined);
  assert.equal(listeners.size, 0);
});

test("components.js instala o módulo shared na ViewLayer antes dos consumidores", async () => {
  const composition = await readFile(new URL("../../components/index.mjs", import.meta.url), "utf8");
  const createAt = composition.indexOf("const { AppSidebar, AppTopbar, ViewLayer } = applicationElementsV1");
  const installAt = composition.indexOf("installFloatingWidgetLayoutV1(ViewLayer");
  const nextInstallerAt = composition.indexOf("installStageSurfaceRegistrationV1({", installAt);

  assert.match(composition, /import \{ installFloatingWidgetLayoutV1 \} from "\.\/shared\/floating-widget-layout-v1\.mjs\?/);
  assert.ok(createAt >= 0 && installAt > createAt && nextInstallerAt > installAt);
  assert.doesNotMatch(composition, /ViewLayer\.prototype\.bindFloatingWidgets\s*=/);
});
