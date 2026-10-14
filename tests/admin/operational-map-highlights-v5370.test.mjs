import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=(fs.readFileSync(path.resolve('components/map/map-scene-composition-v1.mjs'), 'utf8') + (fs.readFileSync(path.join(root, 'components/map/map-scene-composition-v1.mjs'), 'utf8') + fs.readFileSync(path.join(root, 'components.js'), 'utf8')));
const mapPage=fs.readFileSync(path.join(root,'components/map/operational-map-page-v1.mjs'),'utf8');
const filterRail=fs.readFileSync(path.join(root,'components/map/filter-rail.mjs'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('mapa operacional renderiza filtros e aplica o destaque no modelo 3D',()=>{
  assert.match(components,/BELAVISTA_OPERATIONAL_MAP_HIGHLIGHTS_V5370/);
  assert.match(components,/installOperationalMapPageV1\(ViewLayer/);
  assert.match(mapPage,/ViewLayer\.prototype\.map = renderOperationalMapPageV1/);
  assert.match(components,/installStageOverlayControllerV1/);
  assert.match(mapPage,/admin-public-map-interface-v5352/);
  assert.match(mapPage,/map-filter-rail/);
  assert.match(filterRail,/mapFilter: key/);
  assert.match(filterRail,/data-map-filter="\$\{key\}"/);
  assert.match(mapPage,/data-highlight-key/);
  assert.match(styles,/operational-map-highlight-meta-v5370/);
});
