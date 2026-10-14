import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';

const root=path.resolve(import.meta.dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('/leads declara modo somente satélite no componente do mapa',()=>{
  const source=read('public-lead-form.mjs');
  assert.match(source,/map-scene[^>]+data-public-static-only="true"/);
  assert.match(source,/data-public-static-capture="\/assets\/public\/dwg-satellite-treated-v5411\.png"/);
});

test('runtime público bloqueia qualquer caminho de inicialização 3D no modo estático',()=>{
  const runtime=read('public-fast-runtime-v533.mjs');
  assert.match(runtime,/const isStaticOnly=el=>/);
  assert.match(runtime,/data-public-static-only/);
  assert.match(runtime,/disabled-static-only/);
  assert.match(runtime,/__BELAVISTA_START_3D__=\(\)=>\{const map=.*isStaticOnly\(map\)/);
  const component=read('components.js');
  assert.match(component,/hasAttribute\("data-public-static-only"\)/);
  assert.match(component,/static-only-no-webgl/);
});

test('contexto público posiciona marcações dos lotes pelos bounds GPS do DWG',()=>{
  const context=read('public-leads-context-v521.mjs');
  assert.match(context,/function installStaticLotMarkers\(/);
  assert.match(context,/data-public-static-lot-markers/);
  assert.match(context,/staticLotPosition\(record,bounds/);
  assert.match(context,/DWG GPS bounds · treated satellite raster/);
  assert.match(context,/if\(staticOnly\)\{[\s\S]*?installStaticLotMarkers\(map,geo\)/);
});

test('/admin reutiliza o mesmo mapa estático com marcações de /leads',()=>{
  const app=read('app.js');
  assert.match(app,/data-admin-public-map="true"/);
  assert.match(app,/data-public-static-only="true"/);
});
