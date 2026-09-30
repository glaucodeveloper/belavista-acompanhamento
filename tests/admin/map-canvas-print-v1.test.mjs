import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const components=read('components.js');
const styles=read('styles.css');
const html=read('index.html');

test('mapa administrativo abre interface PDF com o canvas em foco',()=>{
  assert.match(components,/data-scene-print-map/);
  assert.match(components,/openMapCanvasPrintV1/);
  assert.match(components,/print-map-pdf-interface/);
  assert.match(components,/data-map-pdf-interface/);
  assert.match(components,/data-map-pdf-print/);
  assert.match(components,/data-map-pdf-close/);
  assert.match(components,/mapPrintViewport/);
  assert.match(components,/mapPrintCamera/);
  assert.match(components,/openMapPrintMode\(\)[\s\S]*openMapCanvasPrintV1/);
  assert.match(components,/window\.print\(\)/);
});

test('interface PDF oculta a operação e preserva a superfície do mapa',()=>{
  assert.match(styles,/MAP_CANVAS_PRINT_V1/);
  assert.match(styles,/map-canvas-print-mode/);
  assert.match(styles,/MAP_PDF_INTERFACE_V1/);
  assert.match(styles,/map-pdf-interface-open/);
  assert.match(styles,/map-pdf-interface-toolbar/);
  assert.match(styles,/map-scene\[data-map-print-target\]/);
  assert.match(styles,/print-color-adjust:exact/);
  assert.match(styles,/MAP_PRINT_WIDGETS_V1/);
  assert.match(styles,/\.app-shell\.print-mode #belavista-map-widgets-v5/);
  assert.match(styles,/body\.map-pdf-interface-open #belavista-map-page-widgets/);
  assert.match(styles,/\.dashboard-map-navigation-global/);
  assert.match(html,/admin-original-bootstrap-v5351\.mjs\?v=instagram-api-live-v25&full-image-3d-environment-v1&admin-map-static-first-v20-scene-only-168/);
});
