import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('marker flutuante usa a mesma paleta comercial do lote',()=>{
  const source=read('public-leads-context-v521.mjs');
  assert.match(source,/reserved:0xf1c21b/);
  assert.match(source,/sold:0xfa4d56/);
  assert.match(source,/paddleMaterials\.set\(normalized/);
  assert.match(source,/new THREE\.MeshStandardMaterial\(\{color/);
  assert.match(source,/makeCommercialPointTexture\(THREE,PUBLIC_STATUS_COLORS\[status\]/);
  assert.match(source,/statusColor:publicStatusColorHex\(status\)/);
  assert.match(source,/publicCommercialMarkerColorCode/);
});

test('alteração do status propaga para palheta, haste e número',()=>{
  const markerSource=read('public-leads-context-v521.mjs');
  const componentSource=read('components.js');
  assert.match(markerSource,/public-commercial-marker-statuses/);
  assert.match(markerSource,/publicCommercialMarkerPart==='paddle'/);
  assert.match(markerSource,/publicCommercialMarkerPart==='pin'/);
  assert.match(markerSource,/publicCommercialMarkerPart==='label'/);
  assert.match(markerSource,/node\.material\.map\?\.dispose/);
  assert.match(componentSource,/new CustomEvent\('public-commercial-marker-statuses'/);
});
