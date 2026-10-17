import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("map lot context exposes explicit pin, close, assistant and record actions", () => {
  const source = read("components/map/satellite-lot-plan-overlay-v1.mjs");
  const css = read("styles.css");
  assert.match(source, /data-lot-widget-pin/);
  assert.match(source, /aria-pressed=.*pinnedLotWidgetId/);
  assert.match(source, /data-lot-widget-close/);
  assert.match(source, /data-lot-widget-assistant/);
  assert.match(source, /data-lot-widget-open/);
  assert.match(css, /\.satellite-lot-widget-controls/);
  assert.match(css, /\.satellite-lot-context-widget button:focus-visible/);
});

test("communications remain available through the sidebar event without a floating system launcher", () => {
  const source = read("admin-communications.mjs");
  const sidebar = read("components/shared/sidebar-route-controller-v1.mjs");
  const css = read("admin-communications.css");
  assert.match(source, /belavista:open-communications/);
  assert.doesNotMatch(source, /admin-message-launch|data-admin-message-open/);
  assert.match(sidebar, /belavista:open-communications/);
  assert.doesNotMatch(css, /\.admin-message-launch/);
});
