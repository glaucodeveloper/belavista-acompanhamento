import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('mapa operacional renderiza filtros e aplica o destaque no modelo 3D',()=>{
  assert.match(components,/BELAVISTA_OPERATIONAL_MAP_HIGHLIGHTS_V5370/);
  assert.match(components,/admin-public-map-interface-v5352/);
  assert.match(components,/map-filter-rail/);
  assert.match(components,/setStageOverlay\(filter\[3\],false\)/);
  assert.match(components,/data-highlight-key/);
  assert.match(styles,/operational-map-highlight-meta-v5370/);
});
