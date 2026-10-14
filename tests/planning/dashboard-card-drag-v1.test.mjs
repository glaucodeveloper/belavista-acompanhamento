import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installDashboardCardDragV1 } from "../../components/planning/dashboard-card-drag-v1.mjs";

const makeFixture = () => {
  const windowListeners = new Map();
  const notices = [];
  const cardListeners = new Map();
  const classes = new Set();
  const card = {
    dataset: {},
    style: {},
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
      contains: (value) => classes.has(value),
    },
    offsetWidth: 80,
    offsetHeight: 60,
    addEventListener(name, callback) { cardListeners.set(name, callback); },
    setPointerCapture(pointerId) { this.captured = pointerId; },
    releasePointerCapture(pointerId) { this.released = pointerId; },
    getBoundingClientRect: () => ({ left: 110, top: 90 }),
  };
  const home = {
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 300, height: 200 }),
    querySelectorAll: (selector) => selector === ":scope > .float-card" ? [card] : [],
  };
  const windowRef = {
    addEventListener(name, callback, options) {
      windowListeners.set(name, { callback, options });
    },
    removeEventListener(name, callback) {
      if (windowListeners.get(name)?.callback === callback) windowListeners.delete(name);
    },
  };
  class ViewLayer {}
  installDashboardCardDragV1(ViewLayer, {
    notify: (message) => notices.push(message),
    windowRef,
  });
  const view = Object.assign(new ViewLayer(), {
    querySelector: (selector) => selector === ".dashboard-home" ? home : null,
  });
  return { view, card, cardListeners, windowListeners, notices };
};

test("dashboard arrasta cards acima do mapa, limita posição e limpa gesto", () => {
  const { view, card, cardListeners, windowListeners, notices } = makeFixture();
  view.bindDashboardCardDrag();
  view.bindDashboardCardDrag();
  assert.equal(card.dataset.dashboardDragBound, "true");
  assert.equal(card.style.touchAction, "none");

  let prevented = false;
  cardListeners.get("pointerdown")({
    button: 0,
    target: { closest: () => null },
    pointerId: 5,
    clientX: 30,
    clientY: 40,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(card.captured, 5);
  assert.deepEqual([...windowListeners.keys()], ["pointermove", "pointerup", "pointercancel"]);

  windowListeners.get("pointermove").callback({ clientX: 32, clientY: 42 });
  assert.equal(card.style.left, undefined, "sub-threshold motion is ignored");
  windowListeners.get("pointermove").callback({ clientX: 80, clientY: 95 });
  assert.equal(card.style.left, "60px");
  assert.equal(card.style.top, "95px");
  assert.equal(card.style.right, "auto");
  assert.equal(card.style.bottom, "auto");
  assert.equal(card.style.transform, "none");
  assert.equal(card.classList.contains("dashboard-card-dragging"), true);

  windowListeners.get("pointerup").callback();
  assert.equal(card.released, 5);
  assert.equal(card.classList.contains("dashboard-card-dragging"), false);
  assert.equal(windowListeners.size, 0);
  assert.deepEqual(notices, ["Card do mapa reposicionado."]);
});

test("alvos interativos e cliques sem deslocamento não viram arraste", () => {
  const { view, card, cardListeners, windowListeners, notices } = makeFixture();
  view.bindDashboardCardDrag();
  let prevented = 0;
  cardListeners.get("pointerdown")({
    button: 0,
    target: { closest: (selector) => selector.includes("button") ? {} : null },
    pointerId: 8,
    clientX: 10,
    clientY: 20,
    preventDefault() { prevented++; },
  });
  assert.equal(prevented, 0);
  assert.equal(windowListeners.size, 0);

  cardListeners.get("pointerdown")({
    button: 0,
    target: { closest: () => null },
    pointerId: 9,
    clientX: 10,
    clientY: 20,
    preventDefault() { prevented++; },
  });
  windowListeners.get("pointerup").callback();
  assert.equal(prevented, 1);
  assert.deepEqual(notices, []);
});

test("components.js instala o controller dashboard antes de compor seu bind", async () => {
  const composition = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const installAt = composition.indexOf("installDashboardCardDragV1(ViewLayer");
  const bindWrapperAt = composition.indexOf("const viewLayerBind = ViewLayer.prototype.bind", installAt);

  assert.match(composition, /import \{ installDashboardCardDragV1 \} from "\.\/components\/planning\/dashboard-card-drag-v1\.mjs\?/);
  assert.ok(installAt >= 0 && bindWrapperAt > installAt);
  assert.doesNotMatch(composition, /ViewLayer\.prototype\.bindDashboardCardDrag\s*=/);
});
