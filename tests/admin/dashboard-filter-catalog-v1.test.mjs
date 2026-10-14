import test from "node:test";
import assert from "node:assert/strict";
import { createDashboardFilterCatalogV1 } from "../../components/map/dashboard-filter-catalog-v1.mjs";

const catalogFor = (overrides = {}) => createDashboardFilterCatalogV1({
  demoData: {
    metrics: { collaborators: 11, leads: 7 },
    activities: [{ id: "water", name: "Rede <água>", progress: 45 }],
  },
  dashboardModeKeyV1: (mode) => mode || "tracking",
  esc: (value = "") => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
  ico: (name) => `<i data-icon="${name}"></i>`,
  ...overrides,
});

test("dashboard filter catalog preserves mode keys, selection precedence and summaries", () => {
  const catalog = catalogFor();
  assert.deepEqual(catalog.dashboardFiltersForModeV1("tracking").map(([key]) => key), [
    "execution", "collaborators", "schedule", "leads", "materials", "risks", "progress",
  ]);
  assert.equal(catalog.dashboardFilterForModeV1("commercial-paid", "commercial")[1], "Quitados");
  assert.equal(catalog.mapFilterSelectionKeyV1({
    dashboardMode: "tracking",
    mapFilterWidget: "unknown",
    mapFilter: "execution",
    mapFilters: ["progress"],
  }), "execution");
  assert.deepEqual(catalog.mapFilterSummaryMetricsV1("execution", { records: [{ id: 1 }] })[2], [
    "Registros", "1", "No diário",
  ]);
  assert.deepEqual(catalog.mapFilterSummaryMetricsV1("collaborators", {})[0], [
    "Pessoas", "11", "cadastro operacional",
  ]);
});

test("progress summary renders current selected areas and safely escaped stage names", () => {
  const catalog = catalogFor();
  const empty = catalog.mapProgressSummaryMarkupV1({ mapProgressSelection: [] });
  assert.match(empty, /Nenhuma área poligonal selecionada/);
  assert.match(empty, /data-map-progress-start/);
  assert.doesNotMatch(empty, /data-map-progress-entry/);

  const selected = catalog.mapProgressSummaryMarkupV1({
    selectedStage: "water",
    mapProgressSelection: [{ label: "Quadra <A>" }],
  });
  assert.match(selected, /Quadra &lt;A&gt;/);
  assert.match(selected, /Rede &lt;água&gt;/);
  assert.match(selected, /data-map-progress-entry/);
  assert.match(selected, /data-map-progress-clear/);
  assert.match(selected, /selected/);
});
