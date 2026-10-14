import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const readMapScene=()=>[
  read('components.js'),
  read('components/map/admin-road-geometry-v1.mjs'),
  read('components/map/public-road-surface-policy-v1.mjs'),
].join('\n');

test('HTML volta ao boot normal e não usa recovery v5.3.6',()=>{
  const s=read('public-leads.html');
  assert.match(s,/public-leads\.js\?v=public-live-light-v5\.3\.7/);
  assert.match(s,/public-model-loading-v531\.mjs\?v=public-live-light-v5\.3\.7/);
  assert.doesNotMatch(s,/public-cache-recovery-v536|data-public-bootstrap-v536/);
});

test('loader v5.3.1 físico continua fail-soft',()=>{
  assert.match(read('public-model-loading-v531.mjs'),/HARD_RELEASE_MS\s*=\s*30000/);
});

test('public-leads usa components e lead-sw com versão nova',()=>{
  const s=read('public-leads.js');
  assert.match(s,/components\.js\?v=public-live-light-v5\.3\.7/);
  assert.match(s,/lead-sw\.js\?v=public-live-light-v5\.3\.7/);
});

test('public live-light mantém GLB e pula geometria pesada',()=>{
  const s=read('components.js');
  assert.match(s,/BELAVISTA_PUBLIC_LIVE_LIGHT_V537/);
  assert.match(s,/this\.modelParts\.streets=streetCandidates/);
  assert.match(s,/this\.modelRender='webgl-live-glb'|dataset\.modelRender='webgl-live-glb'/);
  assert.match(s,/streetIntersectionCount='0'/);
  assert.match(s,/lotStatusBadges='0 · deferred-public'/);
  assert.match(s,/overlayManifest='deferred-public'/);
});

test('raster WebGL de tiles é desativado só no mapa público',()=>{
  const s=readMapScene();
  assert.match(s,/map-scene\[data-public-map\],map-scene\[data-public-presentation\]/);
  assert.match(s,/mapTexture='public-static-base'/);
  assert.match(s,/mapSurface\.visible=false/);
  assert.match(s,/public-static-base \+ live-glb/);
  // Implementação completa permanece no arquivo para o admin/outros mapas.
  assert.match(s,/this\.segmentStreetMeshes\(THREE,streetCandidates\)/);
  assert.match(s,/this\.addCurbOutlines\(THREE,streetCandidates\)/);
  assert.match(s,/this\.addLotStatusBadges\(THREE,model\)/);
});

test('copy de Amargosa permanece',()=>{
  assert.match(read('public-leads.html'),/Amargosa, Bahia/i);
});
