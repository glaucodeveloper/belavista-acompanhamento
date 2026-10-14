import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const components=(read('components/map/map-scene-composition-v1.mjs') + read('components.js'));
const app=read('app.js');

test('mapa administrativo usa projeção ortográfica sem alterar o mapa público',()=>{
  assert.match(components,/isAdminOrthographicMapV1\(\)\s*\{/);
  assert.match(components,/this\.hasAttribute\(["']data-admin-shared-public-map["']\)/);
  assert.match(components,/this\.isAdminOrthographicMapV1\(\)\s*\?\s*new THREE\.OrthographicCamera/);
  assert.match(components,/configureOrthographicCameraV1\(\s*w,\s*h,\s*targetX,\s*targetY/);
  assert.match(components,/this\.dataset\.cameraProjection\s*=\s*["']orthographic["']/);
  assert.match(components,/this\.dataset\.cameraProjectionMode\s*=\s*["']parallel["']/);
  assert.match(components,/this\.dataset\.sceneTiltFrame\s*=\s*["']orthographic orbit · constant ground inclination["']/);
  assert.match(components,/const ADMIN_STANDALONE_MODEL_ALIGNMENT_V1\s*=\s*\{/);
  assert.match(components,/rotationDeg:\s*\{\s*x:\s*-?\d+(?:\.\d+)?,\s*y:\s*-?\d+(?:\.\d+)?,\s*z:\s*-?\d+(?:\.\d+)?\s*\}/);
  assert.match(components,/translation:\s*\{\s*x:\s*-?\d+(?:\.\d+)?,\s*y:\s*-?\d+(?:\.\d+)?,\s*z:\s*-?\d+(?:\.\d+)?\s*\}/);
  assert.match(components,/alignmentEuler\s*=\s*new THREE\.Euler\(/);
  assert.doesNotMatch(components,/wrapper\.rotateX\(/);
  assert.match(components,/wrapper\.position\.x\s*\+=\s*Number\(alignmentTranslation\.x\)/);
  assert.match(components,/new THREE\.PerspectiveCamera\(34,\s*1,\s*0\.1,\s*10000\)/);
  assert.match(app,/data-admin-shared-public-map="v5352"/);
});

test('cards compactos recalculam o frustum quando a cena compartilhada é ortográfica',()=>{
  assert.match(components,/this\._compactCamera\.isOrthographicCamera/);
  assert.match(components,/this\._compactCamera\.left\s*=\s*\(-verticalSpan\s*\*\s*aspect\)\s*\/\s*2/);
  assert.match(components,/this\._compactCamera\.top\s*=\s*verticalSpan\s*\/\s*2/);
  assert.match(components,/this\._compactCamera\.zoom\s*=\s*1/);
});
