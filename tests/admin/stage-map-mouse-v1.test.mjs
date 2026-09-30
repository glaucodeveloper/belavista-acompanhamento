import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = new URL('../../', import.meta.url);
const css = readFileSync(new URL('stage-map-transition-v1.css', root), 'utf8');
const components = readFileSync(new URL('components.js', root), 'utf8');

test('mapa reduzido das etapas recebe gestos e mapa recolhido não captura o mouse', () => {
  assert.match(css, /has-stage-map>map-scene\[data-persistent-map="true"\][\s\S]*?pointer-events:auto!important/);
  assert.match(css, /has-stage-map:not\(\.stage-map-collapsed\)>map-scene\[data-persistent-map="true"\] \.three-overlay\{[\s\S]*?pointer-events:auto!important/);
  assert.match(css, /stage-map-collapsed>map-scene\[data-persistent-map="true"\]\{pointer-events:none!important\}/);
});

test('renderer administrativo aceita roda comum e Ctrl+roda no zoom', () => {
  const start = components.indexOf('      canvas.addEventListener(\n        "wheel",');
  const end = components.indexOf('      canvas.addEventListener("pointerdown",', start);
  assert.ok(start >= 0 && end > start);
  const wheel = components.slice(start, end);
  assert.match(wheel, /event\.preventDefault\(\)/);
  assert.match(wheel, /event\.ctrlKey \? 1\.06 : 1\.12/);
  assert.doesNotMatch(wheel, /if \(!event\.ctrlKey\) return/);
});
