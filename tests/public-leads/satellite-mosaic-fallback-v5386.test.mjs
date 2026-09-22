import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('mosaico satélite permanece visível enquanto o relevo 3D é adiado',()=>{
  const components=read('components.js');
  assert.match(components,/if\(!terrain\)\{/);
  assert.match(components,/surface\.visible=true/);
  assert.match(components,/publicTerrainSurface='satellite tile mosaic · DWG GPS centre · direct surface'/);
  assert.match(components,/this\.mapSurface\.visible=!this\.isPublicMapVisual\(\)\|\|!this\.publicTerrainRelief/);
});

test('agendamento do entorno não depende de requestIdleCallback',()=>{
  const components=read('components.js');
  assert.match(components,/if\(!this\.masterplanModel\)\{/);
  assert.match(components,/setTimeout\(\(\)=>this\.schedulePublicEnvironmentLoadingV1\(\),350\)/);
  assert.match(components,/setTimeout\(\(\)=>\{/);
});
