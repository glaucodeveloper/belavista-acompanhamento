import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("dashboard quick capture styles the actual form markup responsively in Atlas", async () => {
  const [component, styles] = await Promise.all([
    read("components/records/stage-record-center-v1.mjs"),
    read("atlas-carbon-integration-v1.css"),
  ]);
  const formMarkup = component.match(/return `(<section class="stage-dashboard-quick-capture"[\s\S]*?<\/section>)`;/)?.[1];

  assert.ok(formMarkup, "Dashboard quick-capture markup exists");
  assert.match(formMarkup, /<form data-dashboard-quick-record>/);
  assert.match(formMarkup, /name="stageKey"/);
  assert.match(formMarkup, /name="activity"/);
  assert.match(formMarkup, /name="date"/);
  assert.match(formMarkup, /name="responsible"/);
  assert.match(formMarkup, /name="detail"/);
  assert.match(styles, /\.stage-dashboard-quick-capture > form\[data-dashboard-quick-record\]\s*\{[^}]*display: grid[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(styles, /\.stage-dashboard-quick-capture \.stage-dashboard-quick-pair\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.stage-dashboard-quick-capture > form\[data-dashboard-quick-record\][\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});
