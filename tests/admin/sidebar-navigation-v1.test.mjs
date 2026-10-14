import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  FOREMAN_EXTENSION_VIEWS,
  isForemanUser,
  navigationItemsForActor,
  normalizeOperationalRole,
  resolveStartupActorV1,
} from "../../admin-role-policy.mjs";
import { createSidebarNavigationV1 } from "../../components/shared/sidebar-navigation-v1.mjs";

const createNavigation = (state) => {
  const writes = [], listeners = new Map(), notices = [],
    appStore = {
      get: () => state,
      set: (patch) => { writes.push(patch); Object.assign(state, patch); },
    },
    navigation = createSidebarNavigationV1({
      appStore,
      normalizeOperationalRole,
      isForemanUser,
      dashboardModeKeyV1: (mode) => mode || "tracking",
      navigationItemsForActor,
      FOREMAN_EXTENSION_VIEWS,
      reportCatalog: [],
      ico: (name) => `[${name}]`,
      esc: (value) => String(value ?? ""),
      notify: (...args) => notices.push(args),
      document: { querySelector: () => null },
    }),
    root = {
      addEventListener: (type, handler) => listeners.set(type, handler),
      removeEventListener: (type, handler) => { if (listeners.get(type) === handler) listeners.delete(type); },
      contains: () => true,
    };
  return { appStore, navigation, root, listeners, writes, notices };
};

test("startup actor ignores an empty restored session and preserves the configured local actor", () => {
  const fallbackActor = { uid: "local-warley", name: "Warley", role: "owner" };
  assert.equal(resolveStartupActorV1({ restoredActor: {}, fallbackActor }), fallbackActor);
  assert.deepEqual(resolveStartupActorV1({ restoredActor: {}, fallbackActor: null }), {});
});

test("startup actor prefers authenticated identity, then a valid restored identity", () => {
  const authenticatedActor = { uid: "auth", role: "admin" },
    restoredActor = { uid: "restored", role: "owner" },
    fallbackActor = { uid: "local", role: "owner" };
  assert.equal(resolveStartupActorV1({ authenticatedActor, restoredActor, fallbackActor }), authenticatedActor);
  assert.equal(resolveStartupActorV1({ restoredActor, fallbackActor }), restoredActor);
});

test("navigation keeps Agenda and Ações IA routed under Etapas with correct active state", () => {
  const state = {
    view: "agenda",
    currentActor: { role: "owner" },
    dashboardMode: "tracking",
    stageSelected: true,
  };
  const { navigation } = createNavigation(state);
  let markup = navigation.render(state);
  assert.match(markup.markup, /class="[^"]*active" data-view="agenda"/);
  assert.match(markup.markup, /data-view="actions"/);
  assert.match(markup.markup, /aria-label="Extensões da etapa selecionada"/);

  state.view = "actions";
  markup = navigation.render(state);
  assert.match(markup.markup, /class="[^"]*active" data-view="actions"/);
  assert.match(markup.markup, /data-view="agenda"/);
});

test("navigation adopts Atlas ZIP workspace and operations groups without dropping live routes", () => {
  const state = { view: "control", currentActor: { role: "owner" }, dashboardMode: "tracking" },
    { navigation } = createNavigation(state),
    markup = navigation.render(state).markup;

  assert.match(markup, /aria-label="workspace"/);
  assert.match(markup, /aria-label="operações"/);
  assert.match(markup, /data-view="map"/);
  assert.match(markup, /data-view="stages"/);
  assert.match(markup, /data-view="materials"/);
  assert.match(markup, /data-view="brokers-board"/);
  assert.match(markup, /data-view="repasses"/);
  assert.match(markup, /data-view="settings"/);
});

test("navigation dispatches Agenda and Ações IA to their exact application views", () => {
  const state = { currentActor: { role: "owner" } },
    fixture = createNavigation(state);
  fixture.navigation.connect(fixture.root);
  const clickView = (view, label) => {
    const target = {
      dataset: { view },
      textContent: label,
      closest: (selector) => selector === "[data-view]" ? target : null,
    };
    fixture.listeners.get("click")({ target });
  };

  clickView("agenda", "Agenda");
  assert.equal(state.view, "agenda");
  assert.equal(state.lastAction, "Abriu Agenda");
  clickView("actions", "Ações IA");
  assert.equal(state.view, "actions");
  assert.equal(state.lastAction, "Abriu Ações IA");
  fixture.navigation.disconnect();
  assert.equal(fixture.listeners.size, 0);
});

test("foreman navigation exposes records and timeline only, and direct routes enforce the same boundary", async () => {
  const state = { view: "records", currentActor: { role: "admin", userType: "foreman" } },
    { navigation } = createNavigation(state),
    markup = navigation.render(state),
    app = await readFile(new URL("../../app.js", import.meta.url), "utf8"),
    routes = await readFile(new URL("../../components/shared/application-navigation-routes-v1.mjs", import.meta.url), "utf8"),
    policy = await readFile(new URL("../../admin-role-policy.mjs", import.meta.url), "utf8");

  assert.match(markup.markup, /data-view="records"/);
  assert.match(markup.markup, /data-view="stages"/);
  assert.doesNotMatch(markup.markup, /data-view="materials"|data-view="agenda"/);
  assert.doesNotMatch(markup.markup, /data-view="actions"/);
  assert.match(routes, /"agenda", "activities", "progress", "actions"/);
  assert.match(app, /actorCanOpenView\(actor,requestedView\)/);
  assert.match(app, /resolveStartupActorV1\(\{authenticatedActor:authActor,restoredActor:savedUi\.currentActor,fallbackActor:appStore\.get\(\)\.currentActor\}\)/);
  assert.match(policy, /FOREMAN_NAV_VIEWS = Object\.freeze\(\["records", "stages"\]\)/);
  assert.match(policy, /if \(isLimitedOperationalActor\(actor\)\) return LIMITED_OPERATIONAL_VIEWS\.includes/);
});

test("Agenda and Ações IA routes resolve to their page modules and event binders", async () => {
  const app = await readFile(new URL("../../app.js", import.meta.url), "utf8"),
    routes = await readFile(new URL("../../components/shared/application-navigation-routes-v1.mjs", import.meta.url), "utf8"),
    composition = await readFile(new URL("../../components/planning/stage-application-composition-v1.mjs", import.meta.url), "utf8"),
    pageComposition = await readFile(new URL("../../components/planning/operational-intelligence-composition-v1.mjs", import.meta.url), "utf8"),
    applicationEvents = await readFile(new URL("../../components/shared/application-event-composition-v1.mjs", import.meta.url), "utf8"),
    agendaComposition = await readFile(new URL("../../components/planning/stage-agenda-application-composition-v1.mjs", import.meta.url), "utf8"),
    intelligenceEvents = await readFile(new URL("../../components/planning/operational-intelligence-events-v1.mjs", import.meta.url), "utf8"),
    agenda = await readFile(new URL("../../components/planning/agenda-calendar-v8.mjs", import.meta.url), "utf8"),
    actions = await readFile(new URL("../../components/planning/actions-page-v1.mjs", import.meta.url), "utf8");

  assert.match(app, /resolveApplicationRouteV1/);
  assert.match(routes, /"agenda", "activities", "progress", "actions"/);
  assert.match(composition, /createOperationalIntelligenceCompositionV1\(/);
  assert.match(pageComposition, /ViewLayer\.prototype\.actions = actionsPageV1\.render/);
  assert.match(applicationEvents, /installOperationalIntelligenceEventsV1\(ViewLayer/);
  assert.match(intelligenceEvents, /actionsPageV1\.bind\(this, view\)/);
  assert.match(agenda, /ViewLayer\.prototype\.agenda = function \(\)/);
  assert.match(agendaComposition, /installAgendaCalendarPageV8/);
  assert.match(actions, /if \(view !== "actions"/);
});
