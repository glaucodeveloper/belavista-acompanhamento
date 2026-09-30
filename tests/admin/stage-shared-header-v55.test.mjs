import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../components.js", import.meta.url), "utf8");
const recordsDrillIn = readFileSync(new URL("../../records-activity-drill-in-v5377.mjs", import.meta.url), "utf8");

test("todas as páginas de etapas compartilham timeline seguida do submenu", () => {
  const chrome = source.slice(source.indexOf("const stageContextChromeV1 ="), source.indexOf("globalThis.__ensureStageContextChromeV1"));
  for (const view of ["stages", "actions", "agenda", "activities", "records", "progress", "foremen"])
    assert.match(source.slice(source.indexOf("const STAGE_CONTEXT_VIEWS_V1"), source.indexOf("const recordsStageEntryFinalBindV1")), new RegExp(`"${view}"`));
  const sidebar = source.slice(source.indexOf("const nav = items"), source.indexOf("const previousNav = this.querySelector"));
  const sidebarStageSubitems = sidebar.slice(sidebar.indexOf('if (id === "stages")'), sidebar.indexOf('if (id === "reports")'));
  assert.match(sidebar, /\.filter\(\(\[id\]\) => !\["records", "finance"\]\.includes\(id\)\)/);
  assert.doesNotMatch(sidebarStageSubitems, /\["records"|\["progress"/);
  const tabs = source.slice(source.indexOf("const stageViewTabs ="), source.indexOf("// BELAVISTA_OPERATIONAL_INTELLIGENCE_V1"));
  assert.doesNotMatch(tabs, /\["records"|\["progress"/);
  const drillInTabs = recordsDrillIn.slice(recordsDrillIn.indexOf("const stageTabs ="), recordsDrillIn.indexOf("const stageShell ="));
  assert.doesNotMatch(drillInTabs, /\['records'|\['progress'/);
  assert.match(chrome, /layer\.prepend\(chrome\)/);
  assert.ok(chrome.indexOf("[data-stage-persistent-timeline]") < chrome.indexOf("nav.stage-view-tabs"));
  assert.match(chrome, /if \(other !== nav\) other\.remove\(\)/);
  assert.match(chrome, /stageContextV1\(state\)/);
  assert.match(chrome, /event\.stopImmediatePropagation\(\)/);
});
