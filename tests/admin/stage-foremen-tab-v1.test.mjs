import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("por encarregados é uma aba contextual da etapa", () => {
  assert.match(components, /\["foremen", "users-round", "Por encarregados"\]/);
  assert.match(components, /ViewLayer\.prototype\.foremen/);
  assert.match(components, /stageForemenMembersV1/);
  assert.match(components, /stage-foremen-page/);
  assert.match(components, /stage-foremen-list/);
  assert.match(components, /data-stage-home-page/);
  assert.match(components, /stageTabsHomeBound/);
  assert.match(app, /[\"']foremen[\"']/);
  assert.match(styles, /\.stage-foremen-page/);
});
