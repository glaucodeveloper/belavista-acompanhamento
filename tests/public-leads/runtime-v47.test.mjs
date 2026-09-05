import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
const root=process.env.BELAVISTA_ROOT;
const read=rel=>readFile(join(root,rel),'utf8');

test('página pública não inicia GLB/WebGL antes da interação/scroll',async()=>{
  const c=await read('components.js');
  assert.match(c,/const allowThree=!publicPresentation/);
  assert.match(c,/startPublic3D\(\)/);
  assert.match(c,/publicThree='deferred'/);
});

test('mapa público ganha base Leaflet satélite imediata',async()=>{
  const c=await read('components.js');
  assert.match(c,/publicMapBase='leaflet-satellite-fallback'/);
  assert.match(c,/World_Imagery\/MapServer\/tile/);
});

test('HUD administrativo não é ligado no mapa público',async()=>{
  const c=await read('components.js');
  assert.match(c,/mapControls='public-disabled'/);
  assert.match(c,/if\(!publicPresentation\)this\.bindSceneControls\(\)/);
});

test('scroll inicia 3D sob demanda sem perder highlight',async()=>{
  const p=await read('public-lead-form.mjs');
  assert.match(p,/p>\.005&&map\?\.dataset\.publicThree==='deferred'/);
  assert.match(p,/map\?\.startPublic3D\?\.\(\)/);
  assert.doesNotMatch(p,/new MutationObserver\(disableAdministrativeMapControls\)/);
});

test('service worker público é network-first e invalida cache v1',async()=>{
  const sw=await read('lead-sw.js');
  const js=await read('public-leads.js');
  assert.match(sw,/alianca-park-leads-v47/);
  assert.match(sw,/networkFirst/);
  assert.match(sw,/request\.mode==='navigate'/);
  assert.match(js,/updateViaCache:'none'/);
  assert.match(js,/alianca-park-leads-/);
});

test('versões dos módulos públicos são cache-busted v47',async()=>{
  const js=await read('public-leads.js');
  const c=await read('components.js');
  const p=await read('public-lead-form.mjs');
  assert.match(js,/components\.js\?v=public-runtime-v47/);
  assert.match(c,/public-lead-form\.mjs\?v=public-runtime-v47/);
  assert.match(c,/firebase\.mjs\?v=public-runtime-v47/);
  assert.match(p,/firebase\.mjs\?v=public-runtime-v47/);
});
