import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stageChromeSource = readFileSync(new URL("../../components/planning/stage-context-chrome-v1.mjs", import.meta.url), "utf8");
const source = readFileSync(new URL("../../components.js", import.meta.url), "utf8")
  + stageChromeSource
  + readFileSync(new URL("../../components/shared/activity-header-consolidation-v1.mjs", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("../../components/shared/sidebar-navigation-render-v1.mjs", import.meta.url), "utf8");
const recordsDrillIn = readFileSync(new URL("../../records-activity-drill-in-v5377.mjs", import.meta.url), "utf8");

test("todas as páginas de etapas compartilham timeline seguida do submenu", () => {
  const chrome = stageChromeSource.slice(stageChromeSource.indexOf("const stageContextChromeV1 ="), stageChromeSource.indexOf("globalThis.__ensureStageContextChromeV1")),
    stageViews = stageChromeSource.slice(stageChromeSource.indexOf("export const STAGE_CONTEXT_VIEWS_V1"), stageChromeSource.indexOf("export const createStagePersistentTimelineMarkupV1"));
  for (const view of ["stages", "actions", "agenda", "activities", "records", "progress", "foremen"])
    assert.match(stageViews, new RegExp(`"${view}"`));
  const sidebar = sidebarSource;
  const sidebarStageSubitems = sidebar.slice(sidebar.indexOf('if (id === "stages")'), sidebar.indexOf('if (id === "reports")'));
  assert.match(sidebar, /\.filter\(\(\[id\]\) => !\["records", "finance"\]\.includes\(id\)\)/);
  assert.match(sidebar, /export const renderSidebarNavigationV1/);
  assert.doesNotMatch(sidebarStageSubitems, /\["records"|\["progress"/);
  const tabs = stageChromeSource.slice(stageChromeSource.indexOf("export const createStageViewTabsMarkupV1"), stageChromeSource.indexOf("/** Bind the stage tabs"));
  assert.doesNotMatch(tabs, /\["records"|\["progress"/);
  const drillInTabs = recordsDrillIn.slice(recordsDrillIn.indexOf("const stageTabs ="), recordsDrillIn.indexOf("const stageShell ="));
  assert.doesNotMatch(drillInTabs, /\['records'|\['progress'/);
  assert.match(chrome, /layer\.prepend\(chrome\)/);
  assert.ok(chrome.indexOf("[data-stage-persistent-timeline]") < chrome.indexOf("nav.stage-view-tabs"));
  assert.match(chrome, /if \(other !== nav\) other\.remove\(\)/);
  assert.match(chrome, /stageContextV1\(state\)/);
  assert.match(chrome, /event\.stopImmediatePropagation\(\)/);
});

test("cabeçalho compartilhado é instalado como módulo transversal sem descartar ferramentas de cada página", () => {
  assert.match(source, /installActivityHeaderConsolidationV1\(ViewLayer/);
  assert.match(source, /\.stage-agenda-month-head-v3/);
  assert.match(source, /\.broker-directory-head/);
  assert.match(source, /sharedTitle\.textContent = pageTitle\.textContent\.trim\(\)/);
  assert.match(source, /meaningfulControl/);
  assert.match(source, /target\.append\(unit\)/);
  assert.match(source, /pageHead\.remove\(\)/);
});
