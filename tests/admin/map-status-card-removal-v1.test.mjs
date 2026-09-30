import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('cliques normais no mapa não abrem mais o card contextual de cronograma',()=>{
  assert.match(styles,/MAP_CONTEXT_STATUS_CARD_REMOVED_V1/);
  assert.match(styles,/\.admin-public-map-status-v5352\{display:none!important\}/);
  const invocations=components.match(/return this\.renderMapStatusPanel\(/g)||[];
  assert.equal(invocations.length,0);
  assert.match(components,/if\(this\.mapSelectionMode==='progress'\)return this\.toggleProgressAreaSelectionV1/);
  assert.match(components,/if\(picked\.userData\?\.partKind==='lots'\)return this\.toggleLotSelection\(picked\)/);
});

test('arraste normal no mapa não abre painel de consulta',()=>{
  assert.match(components,/if\(this\.isDashboardStatusContext\(\)\)return false;/);
  assert.match(components,/renderMapStatusPanel\(parts=\[\]\)/);
});
