import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const readMapScene=()=>read('components.js')+'\n'+read('components/map/public-terrain-environment-v1.mjs');

test('mosaico satélite permanece visível enquanto o relevo 3D é adiado',()=>{
  const components=readMapScene();
  assert.match(components,/if\s*\(!terrain\)\s*\{/);
  assert.match(components,/this\.dataset\.publicTerrainSurface\s*=\s*["']satellite tile mosaic · DWG GPS centre · direct surface["']/);
  assert.match(components,/surface\.visible\s*=\s*true/);
  assert.match(components,/surface\.visible\s*=\s*false/);
});

test('agendamento do entorno não depende de requestIdleCallback',()=>{
  const components=readMapScene();
  assert.match(components,/if\s*\(!this\.masterplanModel\)\s*\{/);
  assert.match(components,/scheduleTimeout\(\(\)\s*=>\s*this\.schedulePublicEnvironmentLoadingV1\(\),\s*350\)/);
  assert.match(components,/scheduleTimeout\(\(\)\s*=>\s*\{/);
});
