import test from "node:test";
import assert from "node:assert/strict";
import { bindLeadsMapConversationV1 } from "../../components/commercial/leads-map-conversation-v1.mjs";

const node = () => ({
  listeners: new Map(),
  addEventListener(name, handler) { this.listeners.set(name, handler); },
  querySelector() { return null; },
});

const fixture = ({ dialog = { open: false, showModal() { this.open = true; } }, items = [] } = {}) => {
  const state = { selectedLead: 7, publicLeads: [{ name: "Cliente" }] };
  const writes = [], notifications = [], storage = new Map([["belavista.lead.thread.7", JSON.stringify(items)]]);
  const removed = node();
  removed.remove = () => { removed.wasRemoved = true; };
  const mapFrame = { querySelectorAll: () => [removed] };
  const page = { dataset: {}, querySelector: () => mapFrame };
  const thread = { innerHTML: "", scrollHeight: 30, scrollTop: 0 };
  const form = node();
  form.resetCount = 0;
  form.reset = () => { form.resetCount++; };
  const input = { focus() { this.focused = true; } };
  const button = node();
  const box = node();
  box.querySelector = (selector) => ({
    "[data-lead-thread]": thread,
    "[data-lead-conversation-form]": form,
    'input[name="message"]': input,
  })[selector] || null;
  const prompt = node();
  prompt.querySelector = () => button;
  const flow = node();
  flow.querySelector = () => dialog;
  const sidebar = {
    children: [],
    classList: { values: [], add(name) { this.values.push(name); } },
    querySelector: (selector) => selector === ".lead-conversation-widget" ? null : null,
    appendChild(child) { this.children.push(child); return child; },
  };
  const view = {
    querySelector(selector) { return selector === ".leads-reference-page" ? page : selector === ".leads-floating-sidebar" ? sidebar : null; },
  };
  const created = [];
  const documentRef = {
    createElement(tag) {
      const element = tag === "section" ? node() : node();
      if (tag === "section" && created.length === 0) element.querySelector = box.querySelector;
      else if (tag === "public-reservation-flow") element.querySelector = flow.querySelector;
      else if (tag === "section") element.querySelector = prompt.querySelector;
      created.push({ tag, element });
      return element;
    },
  };
  const appStore = {
    get: () => state,
    set(patch) { writes.push(patch); Object.assign(state, patch); },
  };
  class FormDataRef {
    constructor() {}
    get(key) { return key === "message" ? "  Olá, quero visitar  " : "whatsapp"; }
  }
  class DateRef {
    toLocaleString() { return "12/10/2026, 09:30:00"; }
  }
  bindLeadsMapConversationV1(view, {
    appStore,
    documentRef,
    esc: (value) => String(value).replaceAll("<", "&lt;"),
    FormDataCtor: FormDataRef,
    DateCtor: DateRef,
    localStorageRef: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); },
    },
    notify: (...args) => notifications.push(args),
  });
  return { appStore, button, created, dialog, form, input, mapFrame, notifications, page, removed, sidebar, state, storage, thread, view, writes };
};

test("lead map mounts the conversation/reservation widgets once and reads the selected thread", () => {
  const f = fixture({ items: [{ body: "Preciso visitar", channel: "site", direction: "inbound", at: "ontem" }] });
  assert.equal(f.page.dataset.leadWidgetsMounted, "true");
  assert.equal(f.removed.wasRemoved, true);
  assert.ok(f.sidebar.classList.values.includes("leads-sidebar-ready"));
  assert.equal(f.sidebar.children.length, 3);
  assert.match(f.thread.innerHTML, /Preciso visitar/);
  assert.equal(f.thread.scrollTop, f.thread.scrollHeight);
  bindLeadsMapConversationV1(f.view, {});
  assert.equal(f.sidebar.children.length, 3);
});

test("lead conversation submits the existing local thread and reservation prompt opens its dialog", () => {
  const f = fixture();
  let prevented = 0;
  f.form.listeners.get("submit")({ currentTarget: f.form, preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.deepEqual(JSON.parse(f.storage.get("belavista.lead.thread.7")), [{
    body: "Olá, quero visitar",
    channel: "whatsapp",
    direction: "outbound",
    at: "12/10/2026, 09:30:00",
  }]);
  assert.equal(f.form.resetCount, 1);
  assert.match(f.thread.innerHTML, /Olá, quero visitar/);
  assert.deepEqual(f.notifications.at(-1), ["Mensagem registrada no atendimento.", "success"]);
  assert.equal(f.writes.at(-1).lastAction, "Registrou mensagem no atendimento do lead");
  f.button.listeners.get("click")();
  assert.equal(f.dialog.open, true);
});
